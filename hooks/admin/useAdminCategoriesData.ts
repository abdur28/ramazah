import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { mapCategory } from '@/lib/products';
import { Category } from '@/types/types';
import { AdminCategoryDataStore, FetchOptions } from '@/types/admin';

const supabase = () => createClient();

const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

const generateSlug = (name: string): string =>
  name.toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Category fields -> categories columns. `path` is trigger-maintained. */
const toColumns = (data: Partial<Category>, parentId?: string) => {
  const patch: Record<string, any> = {};
  if (data.name !== undefined)        patch.name = data.name;
  if (data.slug !== undefined)        patch.slug = data.slug;
  if (data.description !== undefined) patch.description = data.description;
  if (data.subtitle !== undefined)    patch.subtitle = data.subtitle;
  if (parentId !== undefined)         patch.parent_id = parentId || null;
  if (data.bannerImage !== undefined) {
    patch.banner_public_id = data.bannerImage?.publicId ?? null;
    patch.banner_url = data.bannerImage?.secureUrl ?? null;
    patch.banner_alt = data.bannerImage?.altText ?? null;
  }
  return patch;
};

const useAdminCategoriesData = create<AdminCategoryDataStore>((set, get) => ({
  categories: [],

  loading: { users: false, orders: false, products: false, analytics: false,
             adminAction: false, collections: false, categories: false },
  error: { users: null, orders: null, products: null, analytics: null,
           adminAction: null, collections: null, categories: null },
  pagination: {
    users: { lastDoc: null, hasMore: false },
    orders: { lastDoc: null, hasMore: false },
    products: { lastDoc: null, hasMore: false },
    categories: { lastDoc: null, hasMore: false },
    collections: { lastDoc: null, hasMore: false },
  },

  resetCategories: () => set(state => ({
    categories: [],
    pagination: { ...state.pagination, categories: { lastDoc: null, hasMore: false } }
  })),

  /** Returns top-level categories with their children nested. */
  fetchCategories: async (_options: FetchOptions = {}) => {
    set(state => ({ loading: { ...state.loading, categories: true },
                    error: { ...state.error, categories: null } }));
    try {
      const { data, error } = await supabase()
        .from('categories').select('*').order('sort_order');
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const mapped = rows.map(mapCategory);
      const byId = new Map(rows.map((r: any, i: number) => [r.id, mapped[i]]));

      const categories = rows
        .filter((r: any) => !r.parent_id)
        .map((r: any) => ({
          ...byId.get(r.id)!,
          subCategories: rows.filter((c: any) => c.parent_id === r.id).map((c: any) => byId.get(c.id)!),
        }));

      set(state => ({
        categories,
        loading: { ...state.loading, categories: false },
        pagination: { ...state.pagination, categories: { lastDoc: null, hasMore: false } }
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      set(state => ({ loading: { ...state.loading, categories: false },
                      error: { ...state.error, categories: createErrorMessage(error) } }));
    }
  },

  getCategoryById: async (categoryId: string): Promise<Category | null> => {
    const { data, error } = await supabase()
      .from('categories').select('*').eq('id', categoryId).maybeSingle();
    if (error) {
      set(state => ({ error: { ...state.error, adminAction: error.message } }));
      return null;
    }
    return data ? mapCategory(data) : null;
  },

  createCategory: async (data, parentId?: string): Promise<string> => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const row = toColumns(
        { ...data, slug: data.slug || generateSlug(data.name) } as Partial<Category>,
        parentId
      );
      const { data: created, error } = await supabase()
        .from('categories').insert(row).select('id').single();
      if (error) throw new Error(error.message);

      set(state => ({ loading: { ...state.loading, adminAction: false } }));
      await get().fetchCategories();
      return created.id;
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  updateCategory: async (categoryId: string, data: Partial<Category>, parentId?: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await supabase()
        .from('categories').update(toColumns(data, parentId)).eq('id', categoryId);
      if (error) throw new Error(error.message);

      set(state => ({ loading: { ...state.loading, adminAction: false } }));
      await get().fetchCategories();
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  deleteCategory: async (categoryId: string, _parentId?: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await supabase().from('categories').delete().eq('id', categoryId);
      if (error) {
        // parent_id and products.category_id are ON DELETE RESTRICT.
        throw new Error(
          error.code === '23503'
            ? 'This category still has products or sub-categories. Move or remove them first.'
            : error.message
        );
      }
      set(state => ({ loading: { ...state.loading, adminAction: false } }));
      await get().fetchCategories();
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },
}));

export default useAdminCategoriesData;

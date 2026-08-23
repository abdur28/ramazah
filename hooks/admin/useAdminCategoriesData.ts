import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { mapCategory } from '@/lib/products';
import { Category } from '@/types/types';
import { AdminCategoryDataStore, FetchOptions } from '@/types/admin';
import { describeError } from '@/lib/admin/errors';

const supabase = () => createClient();

/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

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
  // Null rather than '' so the database's "use the real name" default applies.
  if (data.navLabel !== undefined)    patch.nav_label = data.navLabel?.trim() || null;
  if (data.showInNav !== undefined)   patch.show_in_nav = data.showInNav;
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
    users: { page: 1, total: 0 },
    orders: { page: 1, total: 0 },
    products: { page: 1, total: 0 },
    categories: { page: 1, total: 0 },
    collections: { page: 1, total: 0 },
  },

  resetCategories: () => set(state => ({
    categories: [],
    pagination: { ...state.pagination, categories: { page: 1, total: 0 } }
  })),

  /**
   * The whole tree, nested to whatever depth it actually has.
   *
   * This used to attach only rows whose `parent_id` matched a root, so a
   * grandchild existed in the database and was attached to nothing — it
   * appeared nowhere in the admin and could not be edited or deleted. Anything
   * iterating the returned array saw part of the catalogue.
   */
  fetchCategories: async (_options: FetchOptions = {}) => {
    set(state => ({ loading: { ...state.loading, categories: true },
                    error: { ...state.error, categories: null } }));
    try {
      const { data, error } = await supabase()
        .from('categories').select('*').order('depth').order('sort_order');
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const byId = new Map<string, Category>(
        rows.map((row: any) => [row.id, { ...mapCategory(row), subCategories: [] }])
      );

      const roots: Category[] = [];
      for (const row of rows as any[]) {
        const node = byId.get(row.id)!;
        const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
        if (parent) parent.subCategories!.push(node);
        else roots.push(node);
      }

      set(state => ({
        categories: roots,
        loading: { ...state.loading, categories: false },
        // The tree is fetched whole and always will be: it is nested, so a page
        // of it would cut children away from parents. `total` counts the rows,
        // not the roots.
        pagination: { ...state.pagination, categories: { page: 1, total: rows.length } }
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

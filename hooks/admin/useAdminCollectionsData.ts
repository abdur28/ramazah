import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { BannerImage, Collection } from '@/types/types';
import { AdminCollectionDataStore, FetchOptions } from '@/types/admin';
import { describeError } from '@/lib/admin/errors';

const supabase = () => createClient();

/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

const generateId = () => Math.random().toString(36).slice(2, 11);

const generateSlug = (name: string): string =>
  name.toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapCollection = (row: any): Collection => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? undefined,
  bannerImage: row.banner_public_id
    ? { id: row.id, publicId: row.banner_public_id, url: row.banner_url ?? '',
        secureUrl: row.banner_url ?? '', altText: row.banner_alt ?? '' }
    : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toColumns = (data: Partial<Collection>) => {
  const patch: Record<string, any> = {};
  if (data.name !== undefined)        patch.name = data.name;
  if (data.slug !== undefined)        patch.slug = data.slug;
  if (data.description !== undefined) patch.description = data.description;
  if (data.bannerImage !== undefined) {
    patch.banner_public_id = data.bannerImage?.publicId ?? null;
    patch.banner_url = data.bannerImage?.secureUrl ?? null;
    patch.banner_alt = data.bannerImage?.altText ?? null;
  }
  return patch;
};

const useAdminCollectionsData = create<AdminCollectionDataStore>((set, get) => ({
  collections: [],

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

  resetCollections: () => set(state => ({
    collections: [],
    pagination: { ...state.pagination, collections: { lastDoc: null, hasMore: false } }
  })),

  fetchCollections: async (options: FetchOptions = {}) => {
    set(state => ({ loading: { ...state.loading, collections: true },
                    error: { ...state.error, collections: null } }));
    try {
      const { limit: limitCount = 50, startAfter: startOffset,
              orderByField = 'created_at', orderDirection = 'desc' } = options;
      const offset = (startOffset as number) ?? 0;
      const column = orderByField === 'createdAt' ? 'created_at' : orderByField;

      const { data, error } = await supabase()
        .from('collections').select('*')
        .order(column, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limitCount - 1);
      if (error) throw new Error(error.message);

      const collections = (data ?? []).map(mapCollection);

      set(state => ({
        collections: offset > 0 ? [...state.collections, ...collections] : collections,
        loading: { ...state.loading, collections: false },
        pagination: {
          ...state.pagination,
          collections: { lastDoc: offset + collections.length, hasMore: collections.length === limitCount }
        }
      }));
    } catch (error) {
      console.error('Error fetching collections:', error);
      set(state => ({ loading: { ...state.loading, collections: false },
                      error: { ...state.error, collections: createErrorMessage(error) } }));
    }
  },

  getCollectionById: async (collectionId: string): Promise<Collection | null> => {
    const { data, error } = await supabase()
      .from('collections').select('*').eq('id', collectionId).maybeSingle();
    if (error) {
      set(state => ({ error: { ...state.error, adminAction: error.message } }));
      return null;
    }
    return data ? mapCollection(data) : null;
  },

  createCollection: async (data): Promise<string> => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const row = toColumns({ ...data, slug: data.slug || generateSlug(data.name) } as Partial<Collection>);
      const { data: created, error } = await supabase()
        .from('collections').insert(row).select('id').single();
      if (error) throw new Error(error.message);

      set(state => ({ loading: { ...state.loading, adminAction: false } }));
      await get().fetchCollections();
      return created.id;
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  updateCollection: async (collectionId: string, data: Partial<Collection>) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await supabase()
        .from('collections').update(toColumns(data)).eq('id', collectionId);
      if (error) throw new Error(error.message);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        collections: state.collections.map(c => c.id === collectionId ? { ...c, ...data } : c)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  deleteCollection: async (collectionId: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      // products.collection_id is ON DELETE SET NULL, so this always succeeds.
      const { error } = await supabase().from('collections').delete().eq('id', collectionId);
      if (error) throw new Error(error.message);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        collections: state.collections.filter(c => c.id !== collectionId)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  uploadBannerImage: async (file: File): Promise<BannerImage> => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      
      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload banner image');
      }
      
      const result = await response.json();
      const img = result.images[0];
      
      return {
        id: generateId(),
        publicId: img.publicId,
        url: img.url,
        secureUrl: img.secureUrl,
        altText: '',
      };
    } catch (error) {
      console.error('Error uploading banner image:', error);
      throw error;
    }
  },
  
  /**
   * Delete banner image from Cloudinary
   */
  deleteBannerImage: async (publicId: string): Promise<void> => {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete banner image');
      }
    } catch (error) {
      console.error('Error deleting banner image:', error);
      throw error;
    }
  }
}));

export default useAdminCollectionsData;

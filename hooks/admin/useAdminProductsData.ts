import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { mapProduct, PRODUCT_SELECT } from '@/lib/products';
import { Product, ProductImage, ProductVariant } from '@/types/types';
import { AdminProductDataStore, FetchOptions } from '@/types/admin';

const supabase = () => createClient();

const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

const generateId = () => Math.random().toString(36).slice(2, 11);

const generateSlug = (name: string): string =>
  name.toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Product fields -> products columns. Relations are written separately. */
const toColumns = (data: Partial<Product>) => {
  const patch: Record<string, any> = {};
  if (data.name !== undefined)             patch.name = data.name;
  if (data.slug !== undefined)             patch.slug = data.slug;
  if (data.description !== undefined)      patch.description = data.description;
  if (data.shortDescription !== undefined) patch.short_description = data.shortDescription;
  if (data.sku !== undefined)              patch.sku = data.sku;
  if (data.itemType !== undefined)         patch.item_type = data.itemType;
  if (data.tags !== undefined)             patch.tags = data.tags;
  if (data.materials !== undefined)        patch.materials = data.materials;
  if (data.details !== undefined)          patch.details = data.details;
  if (data.isNew !== undefined)            patch.is_new = data.isNew;
  if (data.isFeatured !== undefined)       patch.is_featured = data.isFeatured;
  if (data.isBestseller !== undefined)     patch.is_bestseller = data.isBestseller;
  if (data.isLimitedEdition !== undefined) patch.is_limited_edition = data.isLimitedEdition;
  if (data.isPerishable !== undefined)     patch.is_perishable = data.isPerishable;
  if (data.careInstructions !== undefined) patch.care_instructions = data.careInstructions;
  if (data.metaTitle !== undefined)        patch.meta_title = data.metaTitle;
  if (data.metaDescription !== undefined)  patch.meta_description = data.metaDescription;
  if (data.metaKeywords !== undefined)     patch.meta_keywords = data.metaKeywords;
  if (data.lowStockAlert !== undefined)    patch.low_stock_alert = data.lowStockAlert;
  if (data.publishedAt !== undefined)      patch.published_at = data.publishedAt;
  return patch;
};

/**
 * Write a product's variants, options and prices.
 *
 * The admin form still describes variants with `size` and `color`; those are
 * translated into the generic option model ("Size", "Colour"). A variant may also
 * carry `options` directly, which is how arbitrary axes (Weight, Grind, Shade)
 * arrive once the form is rebuilt.
 */
async function writeVariants(productId: string, variants: ProductVariant[] = []) {
  const db = supabase();

  // Replace wholesale — simpler and safe while a product has no order history.
  await db.from('product_variants').delete().eq('product_id', productId);
  await db.from('product_options').delete().eq('product_id', productId);

  // 1. collect the option axes used across variants
  const axes = new Map<string, Set<string>>();
  const axesOf = (v: ProductVariant): Record<string, string> => {
    if (v.options && Object.keys(v.options).length > 0) return v.options;
    const o: Record<string, string> = {};
    if (v.size) o['Size'] = v.size;
    if (v.color?.name) o['Colour'] = v.color.name;
    return o;
  };

  for (const v of variants) {
    for (const [name, value] of Object.entries(axesOf(v))) {
      if (!axes.has(name)) axes.set(name, new Set());
      axes.get(name)!.add(value);
    }
  }

  // 2. create options and their values
  const valueIds = new Map<string, string>();   // `${option}:${value}` -> id
  let position = 0;
  for (const [name, values] of axes) {
    const { data: option, error } = await db.from('product_options')
      .insert({ product_id: productId, name, position: position++ })
      .select('id').single();
    if (error) throw new Error(error.message);

    let vPos = 0;
    for (const value of values) {
      const hex = variants.find(v => v.color?.name === value)?.color?.hex ?? null;
      const { data: ov, error: ovErr } = await db.from('product_option_values')
        .insert({ option_id: option.id, value, hex, position: vPos++ })
        .select('id').single();
      if (ovErr) throw new Error(ovErr.message);
      valueIds.set(`${name}:${value}`, ov.id);
    }
  }

  // 3. create variants, link their option values, write prices
  let vIndex = 0;
  for (const v of variants) {
    const { data: variant, error } = await db.from('product_variants')
      .insert({
        product_id: productId,
        sku: v.sku,
        stock_count: v.stockCount ?? 0,
        weight: v.weight ?? null,
        expiry_date: v.expiryDate ?? null,
        position: vIndex++,
      })
      .select('id').single();
    if (error) throw new Error(error.message);

    const links = Object.entries(axesOf(v))
      .map(([name, value]) => valueIds.get(`${name}:${value}`))
      .filter(Boolean)
      .map(option_value_id => ({ variant_id: variant.id, option_value_id }));
    if (links.length > 0) {
      const { error: lErr } = await db.from('variant_option_values').insert(links);
      if (lErr) throw new Error(lErr.message);
    }

    const prices = (v.prices ?? []).map(p => ({
      variant_id: variant.id,
      currency: p.currency.toUpperCase(),
      amount: p.price,
      compare_at_amount: p.compareAtPrice || null,
    }));
    if (prices.length > 0) {
      const { error: pErr } = await db.from('product_prices').insert(prices);
      if (pErr) throw new Error(pErr.message);
    }
  }
}

async function writeImages(productId: string, images: ProductImage[] = []) {
  const db = supabase();
  await db.from('product_images').delete().eq('product_id', productId);
  if (images.length === 0) return;

  const rows = images.map((img, i) => ({
    product_id: productId,
    public_id: img.publicId,
    url: img.url,
    secure_url: img.secureUrl,
    alt_text: img.altText ?? '',
    position: img.order ?? i,
    is_primary: img.isPrimary ?? i === 0,
  }));
  const { error } = await db.from('product_images').insert(rows);
  if (error) throw new Error(error.message);
}

/** Resolve a category by display path or slug, since the form sends a path. */
async function resolveCategoryId(categoryPath?: string): Promise<string | null> {
  if (!categoryPath) return null;
  const db = supabase();
  const { data } = await db.from('categories').select('id')
    .or(`path.eq.${categoryPath},slug.eq.${categoryPath}`).maybeSingle();
  return data?.id ?? null;
}

const useAdminProductsData = create<AdminProductDataStore>((set, get) => ({
  products: [],

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

  resetProducts: () => set(state => ({
    products: [],
    pagination: { ...state.pagination, products: { lastDoc: null, hasMore: false } }
  })),

  /** Admins see drafts and archived products too, via RLS. */
  fetchProducts: async (options: FetchOptions = {}) => {
    set(state => ({ loading: { ...state.loading, products: true },
                    error: { ...state.error, products: null } }));
    try {
      const { limit: limitCount = 20, startAfter: startOffset, filters = [],
              orderByField = 'created_at', orderDirection = 'desc' } = options;
      const offset = (startOffset as number) ?? 0;
      const column = orderByField === 'createdAt' ? 'created_at' : orderByField;

      let q = supabase().from('products').select(PRODUCT_SELECT);
      for (const f of filters) q = q.eq(f.field, f.value);

      const { data, error } = await q
        .order(column, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limitCount - 1);
      if (error) throw new Error(error.message);

      const products = (data ?? []).map(mapProduct);

      set(state => ({
        products: offset > 0 ? [...state.products, ...products] : products,
        loading: { ...state.loading, products: false },
        pagination: {
          ...state.pagination,
          products: { lastDoc: offset + products.length, hasMore: products.length === limitCount }
        }
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      set(state => ({ loading: { ...state.loading, products: false },
                      error: { ...state.error, products: createErrorMessage(error) } }));
    }
  },

  getProductById: async (productId: string): Promise<Product | null> => {
    const { data, error } = await supabase()
      .from('products').select(PRODUCT_SELECT).eq('id', productId).maybeSingle();
    if (error) {
      set(state => ({ error: { ...state.error, adminAction: error.message } }));
      return null;
    }
    return data ? mapProduct(data) : null;
  },

  createProduct: async (data): Promise<string> => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const row = toColumns({ ...data, slug: data.slug || generateSlug(data.name) } as Partial<Product>);
      row.category_id = await resolveCategoryId(data.categoryPath);
      row.status = data.publishedAt ? 'active' : 'draft';

      const { data: created, error } = await supabase()
        .from('products').insert(row).select('id').single();
      if (error) throw new Error(error.message);

      await writeImages(created.id, data.images);
      await writeVariants(created.id, data.variants);

      set(state => ({ loading: { ...state.loading, adminAction: false } }));
      return created.id;
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  updateProduct: async (productId: string, data: Partial<Product>) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const patch = toColumns(data);
      if (data.categoryPath !== undefined) {
        patch.category_id = await resolveCategoryId(data.categoryPath);
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase().from('products').update(patch).eq('id', productId);
        if (error) throw new Error(error.message);
      }

      if (data.images)   await writeImages(productId, data.images);
      if (data.variants) await writeVariants(productId, data.variants);

      set(state => ({
        loading: { ...state.loading, adminAction: false },
        products: state.products.map(p => p.id === productId ? { ...p, ...data } : p)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  /** Archives rather than deletes, so order history keeps its references. */
  deleteProduct: async (productId: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await supabase()
        .from('products').update({ status: 'archived' }).eq('id', productId);
      if (error) throw new Error(error.message);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        products: state.products.filter(p => p.id !== productId)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  uploadProductImages: async (files: File[]): Promise<ProductImage[]> => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Call API route to upload images
      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      const result = await response.json();
      
      // Transform Cloudinary results to ProductImage format
      return result.images.map((img: any, index: number) => ({
        id: generateId(),
        publicId: img.publicId,
        url: img.url,
        secureUrl: img.secureUrl,
        altText: '',
        order: index,
        isPrimary: index === 0,
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  },
  
  /**
   * Delete product image from Cloudinary
   */
  deleteProductImage: async (publicId: string): Promise<void> => {
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}));

export default useAdminProductsData;
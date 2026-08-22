import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { mapProduct, PRODUCT_SELECT } from '@/lib/products';
import { Product, ProductImage, ProductOptionDef, ProductVariant } from '@/types/types';
import { AdminProductDataStore, FetchOptions } from '@/types/admin';
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
  // `status` is what gates the storefront, and nothing used to write it: the
  // form had no publish control, `createProduct` derived it from a `publishedAt`
  // the form never set, and `updateProduct` never touched it at all. Every
  // product created through the admin was a draft that could not be published.
  if (data.status !== undefined)           patch.status = data.status;
  return patch;
};

/**
 * Write a product's variants, options and prices.
 *
 * Variants carry `options` — `{ Weight: '250g', Grind: 'Ground' }` — which is the
 * model the database has always used. `size` and `color` are still accepted for
 * rows that predate the rebuilt form.
 *
 * `definitions` carries the axes as the form declared them, which is the only
 * place a swatch colour can come from now that Colour is an ordinary axis rather
 * than a special field. Without it a colour value would lose its hex.
 *
 * `resolveImageId` translates a form-level image id into the row id the image
 * actually ended up with. It has to exist because `writeImages` deletes and
 * re-inserts every photograph on save, so `product_images.id` changes each time
 * — a variant's image links cannot be stored against an id the next save will
 * throw away. Cloudinary's `public_id` is the stable identity, so the caller
 * builds the mapping from that.
 */
async function writeVariants(
  productId: string,
  variants: ProductVariant[] = [],
  definitions: ProductOptionDef[] = [],
  resolveImageId: (formImageId: string) => string | null = () => null
) {
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
      const hex =
        definitions.find(d => d.name === name)?.values.find(v => v.value === value)?.hex ??
        variants.find(v => v.color?.name === value)?.color?.hex ??
        null;
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

    // Which photographs belong to this variant. An empty list means "all of
    // them", which is the right default: most products look the same whatever
    // size you buy, and writing a row per image for those would be noise.
    const imageLinks = (v.imageIds ?? [])
      .map(resolveImageId)
      .filter((id): id is string => Boolean(id))
      .map(image_id => ({ variant_id: variant.id, image_id }));

    if (imageLinks.length > 0) {
      const { error: iErr } = await db.from('variant_images').insert(imageLinks);
      if (iErr) throw new Error(iErr.message);
    }
  }
}

/**
 * form image id -> the id that image now has in the database.
 *
 * Read back after `writeImages`, keyed on `public_id`, because that is the only
 * thing about a photograph that survives the delete-and-reinsert.
 */
async function buildImageResolver(
  productId: string,
  formImages: ProductImage[] = []
): Promise<(formImageId: string) => string | null> {
  const { data } = await supabase()
    .from('product_images').select('id, public_id').eq('product_id', productId);

  const idByPublicId = new Map((data ?? []).map((row: any) => [row.public_id, row.id]));
  const publicIdByFormId = new Map(formImages.map(image => [image.id, image.publicId]));

  return (formImageId: string) => {
    const publicId = publicIdByFormId.get(formImageId);
    if (publicId && idByPublicId.has(publicId)) return idByPublicId.get(publicId)!;
    // Already a live row id — an edit that never touched the photographs.
    const live = (data ?? []).some((row: any) => row.id === formImageId);
    return live ? formImageId : null;
  };
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
/**
 * Collection membership -> `product_collections`.
 *
 * The form has always had a collection picker and the value went nowhere:
 * `toColumns` had no mapping and neither create nor update resolved it, so
 * choosing a collection did nothing at all. It then went to a single
 * `collection_id`, which meant a product could sit in a buying run or an
 * occasion but never both. It is a join table now.
 *
 * Written as delete-then-insert rather than a diff: the set is a handful of
 * rows, the table is nothing but the pair, and a diff would be more code for no
 * fewer round trips.
 */
async function writeCollections(productId: string, slugs?: string[]): Promise<void> {
  if (!slugs) return;
  const db = supabase();

  const { error: clearError } = await db
    .from('product_collections').delete().eq('product_id', productId);
  if (clearError) throw new Error(clearError.message);

  if (slugs.length === 0) return;

  const { data: rows, error: lookupError } = await db
    .from('collections').select('id, slug').in('slug', slugs);
  if (lookupError) throw new Error(lookupError.message);

  const links = (rows ?? []).map((row: any) => ({
    product_id: productId,
    collection_id: row.id,
  }));
  if (links.length === 0) return;

  const { error } = await db.from('product_collections').insert(links);
  if (error) throw new Error(error.message);
}

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
      row.status = data.status ?? 'draft';
      // The date a product went live is what "New in" sorts by, so it is stamped
      // when it is published rather than when the row was first written.
      row.published_at = row.status === 'active' ? new Date().toISOString() : null;

      const { data: created, error } = await supabase()
        .from('products').insert(row).select('id').single();
      if (error) throw new Error(error.message);

      await writeCollections(created.id, data.collections?.map((c) => c.slug));
      await writeImages(created.id, data.images);
      const resolveImage = await buildImageResolver(created.id, data.images);
      await writeVariants(created.id, data.variants, data.options, resolveImage);

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
      // Publishing for the first time stamps the date; unpublishing keeps it, so
      // a product taken down and put back does not jump to the top of "New in".
      if (data.status === 'active' && data.publishedAt === undefined) {
        const { data: current } = await supabase()
          .from('products').select('published_at').eq('id', productId).maybeSingle();
        if (!current?.published_at) patch.published_at = new Date().toISOString();
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase().from('products').update(patch).eq('id', productId);
        if (error) throw new Error(error.message);
      }

      if (data.collections !== undefined) {
        await writeCollections(productId, data.collections.map((c) => c.slug));
      }
      if (data.images) await writeImages(productId, data.images);
      if (data.variants) {
        const resolveImage = await buildImageResolver(productId, data.images);
        await writeVariants(productId, data.variants, data.options, resolveImage);
      }

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
import { createClient } from '@/lib/supabase/client';
import type {
  CartItem, Category, Collection, Product, ProductFilters,
  ProductPrice, ProductVariant, PaginationParams,
} from '@/types/types';

const supabase = () => createClient();

/** Nested selection covering everything the product UI needs. */
export const PRODUCT_SELECT = `
  *,
  categories ( path, slug, name ),
  collections ( slug, name ),
  product_images ( id, public_id, url, secure_url, alt_text, position, is_primary ),
  product_variants (
    id, sku, stock_count, in_stock, weight, expiry_date, position,
    product_prices ( currency, amount, compare_at_amount ),
    variant_option_values (
      product_option_values (
        value, hex, position,
        product_options ( name, position )
      )
    )
  )
`;

function mapPrices(rows: any[] = []): ProductPrice[] {
  return rows.map((r) => {
    const price = Number(r.amount);
    const compareAtPrice = r.compare_at_amount ? Number(r.compare_at_amount) : 0;
    return {
      currency: String(r.currency).toLowerCase() as ProductPrice['currency'],
      price,
      compareAtPrice,
      discountPercent: compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : 0,
    };
  });
}

function mapVariant(row: any): ProductVariant {
  const pairs = (row.variant_option_values ?? [])
    .map((v: any) => v.product_option_values)
    .filter(Boolean)
    .sort((a: any, b: any) =>
      (a.product_options?.position ?? 0) - (b.product_options?.position ?? 0) ||
      (a.position ?? 0) - (b.position ?? 0));

  const options: Record<string, string> = {};
  for (const p of pairs) options[p.product_options?.name ?? ''] = p.value;

  const sizeEntry = pairs.find((p: any) => /^size$/i.test(p.product_options?.name ?? ''));
  const colorEntry = pairs.find((p: any) => /^colou?r$/i.test(p.product_options?.name ?? ''));

  return {
    id: row.id,
    sku: row.sku,
    label: pairs.map((p: any) => p.value).join(' / ') || undefined,
    options,
    prices: mapPrices(row.product_prices),
    stockCount: row.stock_count ?? 0,
    inStock: !!row.in_stock,
    weight: row.weight ? Number(row.weight) : undefined,
    expiryDate: row.expiry_date ?? undefined,
    size: sizeEntry?.value,
    color: colorEntry ? { name: colorEntry.value, hex: colorEntry.hex ?? '#000000' } : undefined,
  };
}

export function mapProduct(row: any): Product {
  const variants: ProductVariant[] = (row.product_variants ?? [])
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map(mapVariant);

  const images = (row.product_images ?? [])
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (a.position ?? 0) - (b.position ?? 0))
    .map((i: any) => ({
      id: i.id, publicId: i.public_id, url: i.url, secureUrl: i.secure_url,
      altText: i.alt_text ?? '', order: i.position ?? 0, isPrimary: !!i.is_primary,
    }));

  // Product-level price = cheapest variant, per currency.
  const byCurrency = new Map<string, ProductPrice>();
  for (const v of variants) {
    for (const p of v.prices ?? []) {
      const existing = byCurrency.get(p.currency);
      if (!existing || p.price < existing.price) byCurrency.set(p.currency, p);
    }
  }

  // Distinct option definitions, for the variant picker.
  const optionMap = new Map<string, Map<string, string | undefined>>();
  for (const v of variants) {
    for (const [name, value] of Object.entries(v.options ?? {})) {
      if (!name) continue;
      if (!optionMap.has(name)) optionMap.set(name, new Map());
      const hex = v.color?.name === value ? v.color.hex : undefined;
      optionMap.get(name)!.set(value, hex);
    }
  }

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  const colors = variants
    .map((v) => v.color)
    .filter(Boolean)
    .filter((c, i, arr) => arr.findIndex((x) => x!.name === c!.name) === i) as Product['colors'];

  const totalStock = variants.reduce((sum, v) => sum + v.stockCount, 0);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    shortDescription: row.short_description ?? undefined,
    prices: [...byCurrency.values()],
    itemType: row.item_type ?? undefined,
    categoryPath: row.categories?.path ?? row.category_path ?? '',
    collectionSlug: row.collections?.slug ?? row.collection_slug ?? undefined,
    images,
    variants,
    options: [...optionMap.entries()].map(([name, values]) => ({
      name,
      values: [...values.entries()].map(([value, hex]) => ({ value, hex })),
    })),
    sku: row.sku,
    inStock: totalStock > 0,
    totalStock,
    lowStockAlert: row.low_stock_alert ?? undefined,
    tags: row.tags ?? [],
    colors,
    sizes,
    materials: row.materials ?? [],
    details: row.details ?? {},
    isNew: row.is_new,
    isFeatured: row.is_featured,
    isBestseller: row.is_bestseller,
    isLimitedEdition: row.is_limited_edition,
    isPerishable: row.is_perishable,
    ratingAvg: row.rating_avg ? Number(row.rating_avg) : 0,
    ratingCount: row.rating_count ?? 0,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    metaKeywords: row.meta_keywords ?? [],
    careInstructions: row.care_instructions ?? undefined,
    viewCount: row.view_count ?? 0,
    salesCount: row.sales_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    path: row.path,
    description: row.description ?? undefined,
    subtitle: row.subtitle ?? undefined,
    bannerImage: row.banner_public_id
      ? { id: row.id, publicId: row.banner_public_id, url: row.banner_url ?? '',
          secureUrl: row.banner_url ?? '', altText: row.banner_alt ?? '' }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ CATEGORIES ============

export async function getAllCategories() {
  const { data, error } = await supabase()
    .from('categories').select('*').order('sort_order');
  if (error) return { categories: [], error: error.message };

  const all = (data ?? []).map(mapCategory);
  const byParent = new Map<string | null, Category[]>();
  for (const row of data ?? []) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(all.find((c) => c.id === row.id)!);
    byParent.set(row.parent_id, list);
  }
  const categories = (byParent.get(null) ?? []).map((c) => ({
    ...c,
    subCategories: byParent.get(c.id) ?? [],
  }));

  return { categories, error: null };
}

/**
 * Accepts either a stored display path ('Food & Pantry > Coffee & Tea') or a URL
 * slug path ('food-pantry/coffee-tea'). Slug paths resolve by their last segment,
 * since slugs are unique — reconstructing names from slugs is lossy ('coffee-tea'
 * cannot yield 'Coffee & Tea').
 */
export async function getCategoryByPath(path: string) {
  const client = supabase();
  const isSlugPath = path.includes('/') || !path.includes('>');

  const query = isSlugPath
    ? client.from('categories').select('*').eq('slug', path.split('/').filter(Boolean).pop() ?? path)
    : client.from('categories').select('*').eq('path', path);

  const { data, error } = await query.maybeSingle();
  if (error) return { category: null, error: error.message };
  return data ? { category: mapCategory(data), error: null }
              : { category: null, error: 'Category not found' };
}

/** Legacy helpers, kept for callers that still pass slug paths around. */
export const pathToDisplayPath = (path: string): string =>
  path.split('/').map((segment) =>
    segment.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ).join(' > ');

export const displayPathToPath = (displayPath: string): string =>
  displayPath.split('>').map((s) => s.trim().toLowerCase().replace(/\s+/g, '-')).join('/');

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase()
    .from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) return { category: null, error: error.message };
  return data ? { category: mapCategory(data), error: null }
              : { category: null, error: 'Category not found' };
}

export async function getCategoryHierarchy(categoryPath: string) {
  const { data, error } = await supabase().from('categories').select('*');
  if (error) return { parent: null, current: null, children: [], error: error.message };

  const rows = data ?? [];
  const currentRow = rows.find((c) => c.path === categoryPath);
  if (!currentRow) {
    return { parent: null, current: null, children: [], error: 'Category not found' };
  }
  const parentRow = rows.find((c) => c.id === currentRow.parent_id);
  const children = rows.filter((c) => c.parent_id === currentRow.id).map(mapCategory);

  return {
    parent: parentRow ? mapCategory(parentRow) : null,
    current: mapCategory(currentRow),
    children,
    error: null,
  };
}

export async function getCollectionBySlug(slug: string) {
  const { data, error } = await supabase()
    .from('collections').select('*').eq('slug', slug).maybeSingle();
  if (error) return { collection: null, error: error.message };
  if (!data) return { collection: null, error: 'Collection not found' };

  const collection: Collection = {
    id: data.id, name: data.name, slug: data.slug,
    description: data.description ?? undefined,
    bannerImage: data.banner_public_id
      ? { id: data.id, publicId: data.banner_public_id, url: data.banner_url ?? '',
          secureUrl: data.banner_url ?? '', altText: data.banner_alt ?? '' }
      : undefined,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
  return { collection, error: null };
}

// ============ PRODUCTS ============

/** Hydrate full product rows for a set of ids, preserving the given order. */
async function hydrate(ids: string[]) {
  if (ids.length === 0) return { products: [] as Product[], error: null };
  const { data, error } = await supabase()
    .from('products').select(PRODUCT_SELECT).in('id', ids);
  if (error) return { products: [], error: error.message };

  const mapped = (data ?? []).map(mapProduct);
  const order = new Map(ids.map((id, i) => [id, i]));
  mapped.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { products: mapped, error: null };
}

/**
 * Filtering, sorting and pagination all happen in SQL against product_listing,
 * which carries the variant-derived stock and price aggregates.
 */
export async function getProducts(
  filters?: ProductFilters,
  pagination?: PaginationParams
) {
  try {
    let matchedIds: string[] | null = null;

    if (filters?.search?.trim()) {
      const { data, error } = await supabase()
        .rpc('search_product_ids', { p_query: filters.search.trim() });
      if (error) return { products: [], error: error.message, lastDoc: null };
      matchedIds = (data ?? []).map((r: any) => r.id);
      if (matchedIds!.length === 0) return { products: [], error: null, lastDoc: null };
    }

    let q = supabase().from('product_listing').select('id').eq('status', 'active');

    if (matchedIds) q = q.in('id', matchedIds);
    if (filters?.categoryPath) q = q.eq('category_path', filters.categoryPath);
    if (filters?.itemType)     q = q.eq('item_type', filters.itemType);
    if (filters?.collection)   q = q.eq('collection_slug', filters.collection);
    if (filters?.inStock !== undefined) q = q.eq('in_stock', filters.inStock);
    if (filters?.isNew)        q = q.eq('is_new', true);
    if (filters?.isFeatured)   q = q.eq('is_featured', true);
    if (filters?.isBestseller) q = q.eq('is_bestseller', true);
    if (filters?.tags?.length) q = q.overlaps('tags', filters.tags);
    if (filters?.minPrice !== undefined) q = q.gte('min_price', filters.minPrice);
    if (filters?.maxPrice !== undefined) q = q.lte('min_price', filters.maxPrice);

    const orderBy = pagination?.orderBy ?? 'created_at';
    q = q.order(orderBy, { ascending: pagination?.orderDirection === 'asc' });
    if (pagination?.limit) q = q.limit(pagination.limit);

    const { data, error } = await q;
    if (error) return { products: [], error: error.message, lastDoc: null };

    const ids = (data ?? []).map((r: any) => r.id);
    const { products, error: hErr } = await hydrate(ids);
    return { products, error: hErr, lastDoc: ids[ids.length - 1] ?? null };
  } catch (error: any) {
    return { products: [], error: error.message, lastDoc: null };
  }
}

export async function getProductsByCategoryPath(categoryPath: string) {
  // Resolve slug paths to the stored display path before filtering.
  let path = categoryPath;
  if (categoryPath.includes('/') || !categoryPath.includes('>')) {
    const { category } = await getCategoryByPath(categoryPath);
    if (!category) return { products: [], error: 'Category not found' };
    path = category.path;
  }
  const { products, error } = await getProducts({ categoryPath: path });
  return { products, error };
}

export async function getProductsByCategorySlug(slug: string) {
  const { category, error } = await getCategoryBySlug(slug);
  if (!category) return { products: [], error: error ?? 'Category not found' };
  return getProductsByCategoryPath(category.path);
}

export async function getProductsByCollectionSlug(slug: string) {
  const { products, error } = await getProducts({ collection: slug });
  return { products, error };
}

export async function getProduct(productId: string) {
  const { data, error } = await supabase()
    .from('products').select(PRODUCT_SELECT).eq('id', productId).maybeSingle();
  if (error) return { product: null, error: error.message };
  return data ? { product: mapProduct(data), error: null }
              : { product: null, error: 'Product not found' };
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase()
    .from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle();
  if (error) return { product: null, error: error.message };
  return data ? { product: mapProduct(data), error: null }
              : { product: null, error: 'Product not found' };
}

export async function getProductsByIds(productIds: string[]) {
  return hydrate(productIds);
}

export async function getFeaturedProducts(limitCount: number = 6) {
  return getProducts({ isFeatured: true }, { limit: limitCount });
}

export async function getNewArrivals(limitCount: number = 8) {
  return getProducts({ isNew: true }, { limit: limitCount });
}

export async function getBestsellers(limitCount: number = 8) {
  return getProducts({ isBestseller: true }, { limit: limitCount, orderBy: 'sales_count' });
}

// ============ CART ============

const CART_SELECT = `
  id, quantity, variant_id,
  product_variants (
    id, sku, stock_count, in_stock,
    product_prices ( currency, amount, compare_at_amount ),
    variant_option_values ( product_option_values ( value, hex, position, product_options ( name, position ) ) ),
    products ( id, name, slug, product_images ( secure_url, is_primary, position ) )
  )
`;

function mapCartRow(row: any): CartItem {
  const v = row.product_variants;
  const product = v?.products;
  const variant = mapVariant(v ?? {});
  const image = (product?.product_images ?? [])
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (a.position ?? 0) - (b.position ?? 0))[0];

  return {
    id: row.id,
    productId: product?.id ?? '',
    variantId: row.variant_id,
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    prices: variant.prices ?? [],
    quantity: row.quantity,
    image: image?.secure_url ?? '',
    variantLabel: variant.label,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    inStock: variant.inStock,
    maxQuantity: variant.stockCount,
  };
}

export async function getCart(userId: string) {
  const { data, error } = await supabase()
    .from('cart_items').select(CART_SELECT).eq('user_id', userId);
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []).map(mapCartRow), error: null };
}

export async function addToCart(userId: string, item: Omit<CartItem, 'id'>) {
  const variantId = item.variantId;
  if (!variantId) return { cartItemId: null, error: 'Missing variant' };

  const { data: existing } = await supabase()
    .from('cart_items').select('id, quantity')
    .eq('user_id', userId).eq('variant_id', variantId).maybeSingle();

  if (existing) {
    const quantity = Math.min(existing.quantity + item.quantity, item.maxQuantity || 99);
    const { error } = await supabase()
      .from('cart_items').update({ quantity }).eq('id', existing.id);
    return { cartItemId: existing.id, error: error?.message ?? null };
  }

  const { data, error } = await supabase()
    .from('cart_items')
    .insert({ user_id: userId, variant_id: variantId, quantity: item.quantity })
    .select('id').single();

  return { cartItemId: data?.id ?? null, error: error?.message ?? null };
}

export async function updateCartItemQuantity(
  userId: string, cartItemId: string, quantity: number
) {
  const { error } = await supabase()
    .from('cart_items').update({ quantity }).eq('id', cartItemId).eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function removeFromCart(userId: string, cartItemId: string) {
  const { error } = await supabase()
    .from('cart_items').delete().eq('id', cartItemId).eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function clearCart(userId: string) {
  const { error } = await supabase().from('cart_items').delete().eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function syncCart(userId: string, localCartItems: CartItem[]) {
  for (const item of localCartItems) {
    if (!item.variantId) continue;
    await addToCart(userId, item);
  }
  return getCart(userId);
}

// ============ WISHLIST ============

export async function addToWishlist(userId: string, productId: string) {
  const { error } = await supabase()
    .from('wishlist_items')
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
  return { error: error?.message ?? null };
}

export async function removeFromWishlist(userId: string, productId: string) {
  const { error } = await supabase()
    .from('wishlist_items').delete().eq('user_id', userId).eq('product_id', productId);
  return { error: error?.message ?? null };
}

export async function getWishlist(userId: string) {
  const { data, error } = await supabase()
    .from('wishlist_items').select('product_id').eq('user_id', userId);
  if (error) return { products: [], error: error.message };
  return hydrate((data ?? []).map((r: any) => r.product_id));
}

import { createClient } from '@/lib/supabase/client';
import { isSlugPath } from '@/lib/categories';
import type {
  CartItem, Category, Collection, Product, ProductFilters,
  ProductPrice, ProductVariant, PaginationParams,
} from '@/types/types';

const supabase = () => createClient();

/** Nested selection covering everything the product UI needs. */
export const PRODUCT_SELECT = `
  *,
  categories ( path, slug, name ),
  product_collections ( collections ( slug, name, sort_order ) ),
  product_images ( id, public_id, url, secure_url, alt_text, position, is_primary ),
  product_variants (
    id, sku, stock_count, in_stock, weight, expiry_date, position,
    variant_images ( image_id ),
    product_prices ( currency, amount, compare_at_amount ),
    variant_option_values (
      product_option_values (
        value, hex, position,
        product_options ( name, position )
      )
    )
  )
`;

/**
 * Which collections a product is in.
 *
 * Two shapes reach here: the nested rows from `PRODUCT_SELECT`, and the flat
 * `collection_slugs` / `collection_names` arrays from `product_listing`. A
 * product used to have at most one collection, so this was a single field —
 * see the 20260824000020 migration.
 */
function mapCollectionRefs(row: any): { slug: string; name: string }[] {
  const nested = row.product_collections;
  if (Array.isArray(nested)) {
    return nested
      .map((link: any) => link.collections)
      .filter(Boolean)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
                                 || String(a.name).localeCompare(String(b.name)))
      .map((c: any) => ({ slug: c.slug, name: c.name }));
  }

  const slugs: string[] = row.collection_slugs ?? [];
  const names: string[] = row.collection_names ?? [];
  return slugs.map((slug, i) => ({ slug, name: names[i] ?? slug }));
}

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
    imageIds: (row.variant_images ?? []).map((link: any) => link.image_id),
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
    collections: mapCollectionRefs(row),
    images,
    variants,
    options: [...optionMap.entries()].map(([name, values]) => ({
      name,
      values: [...values.entries()].map(([value, hex]) => ({ value, hex })),
    })),
    sku: row.sku,
    status: row.status ?? undefined,
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
    depth: row.depth ?? undefined,
    navLabel: row.nav_label ?? undefined,
    showInNav: row.show_in_nav ?? true,
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

  // Nested to whatever depth the tree has. This used to attach one level of
  // children to each root, so a category three deep belonged to nothing — it
  // had no pre-rendered page and appeared in no menu built from this call.
  const byId = new Map<string, Category>(
    (data ?? []).map((row: any) => [row.id, { ...mapCategory(row), subCategories: [] }])
  );

  const categories: Category[] = [];
  for (const row of (data ?? []) as any[]) {
    const node = byId.get(row.id)!;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    if (parent) parent.subCategories!.push(node);
    else categories.push(node);
  }

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
  // See `isSlugPath` — the previous inline test treated every top-level stored
  // path as a slug, so those categories never resolved.
  const query = isSlugPath(path)
    ? client.from('categories').select('*').eq('slug', path.split('/').filter(Boolean).pop() ?? path)
    : client.from('categories').select('*').eq('path', path);

  const { data, error } = await query.maybeSingle();
  if (error) return { category: null, error: error.message };
  return data ? { category: mapCategory(data), error: null }
              : { category: null, error: 'Category not found' };
}

// `pathToDisplayPath` / `displayPathToPath` lived here and converted between a
// slash-separated slug path and a display path. Nothing calls them any more, and
// they were the source of the separator confusion this file just shed: a name
// containing a hyphen ("Ready-to-eat") came back as "Ready To Eat" and no longer
// matched any row. Removed rather than left as a trap. `lib/categories.ts` holds
// the real path helpers now.

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase()
    .from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) return { category: null, error: error.message };
  return data ? { category: mapCategory(data), error: null }
              : { category: null, error: 'Category not found' };
}

export async function getCategoryHierarchy(categoryPath: string): Promise<{
  parent: Category | null;
  ancestors: Category[];
  current: Category | null;
  children: Category[];
  error: string | null;
}> {
  const { data, error } = await supabase().from('categories').select('*');
  if (error) {
    return { parent: null, ancestors: [], current: null, children: [], error: error.message };
  }

  const rows = data ?? [];
  const currentRow = rows.find((c) => c.path === categoryPath);
  if (!currentRow) {
    return { parent: null, current: null, ancestors: [], children: [], error: 'Category not found' };
  }

  // The full chain from the root down to (but excluding) this category. Callers
  // used to get only the immediate parent, which is all a two-level tree needs
  // and produces a broken breadcrumb at any greater depth.
  const ancestors: Category[] = [];
  let cursor = rows.find((c) => c.id === currentRow.parent_id);
  let guard = 0;

  while (cursor && guard < 20) {
    ancestors.unshift(mapCategory(cursor));
    cursor = rows.find((c) => c.id === cursor!.parent_id);
    guard += 1;
  }

  const parentRow = rows.find((c) => c.id === currentRow.parent_id);
  const children = rows.filter((c) => c.parent_id === currentRow.id).map(mapCategory);

  return {
    parent: parentRow ? mapCategory(parentRow) : null,
    ancestors,
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
    if (filters?.categoryPath) {
      // Prefix, not equality. Paths nest as "Food & Pantry > Coffee & Tea", so
      // an exact match made a parent category show only what was filed directly
      // on it — /categories/food-pantry listed one product while four sat in its
      // children. `includeDescendants: false` restores the old behaviour where a
      // caller genuinely wants just that shelf.
      if (filters.includeDescendants === false) {
        q = q.eq('category_path', filters.categoryPath);
      } else {
        q = q.or(
          `category_path.eq.${filters.categoryPath},` +
            `category_path.like.${filters.categoryPath} > %`
        );
      }
    }
    if (filters?.itemType)     q = q.eq('item_type', filters.itemType);
    // An array column now, so containment rather than equality.
    if (filters?.collection)   q = q.contains('collection_slugs', [filters.collection]);
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
  if (isSlugPath(categoryPath)) {
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


// ------------------------------------------------------- category filtering

export interface CategoryFacet {
  name: string;
  values: { value: string; hex?: string; count: number }[];
}

export interface CategoryFilters {
  /** Axis name -> the values ticked under it. */
  options?: Record<string, string[]>;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

/** One shelf page. Twenty is the page size the storefront asks for. */
export const CATEGORY_PAGE_SIZE = 20;

/**
 * The filter axes for a shelf and everything beneath it, with counts.
 *
 * Read from the database rather than from whatever products happen to be on the
 * page, so the counts describe the shelf. The rail used to derive these in the
 * browser, which meant the whole category had to be shipped before anything
 * could be narrowed.
 */
export async function getCategoryFacets(categoryPath: string) {
  let path = categoryPath;
  if (isSlugPath(categoryPath)) {
    const { category } = await getCategoryByPath(categoryPath);
    if (!category) return { facets: [] as CategoryFacet[], error: 'Category not found' };
    path = category.path;
  }

  const { data, error } = await supabase()
    .rpc('product_facets', { p_path: path, p_search: null });
  if (error) return { facets: [] as CategoryFacet[], error: error.message };

  const byAxis = new Map<string, CategoryFacet>();
  for (const row of (data ?? []) as any[]) {
    if (!byAxis.has(row.axis)) byAxis.set(row.axis, { name: row.axis, values: [] });
    byAxis.get(row.axis)!.values.push({
      value: row.value,
      hex: row.hex ?? undefined,
      count: Number(row.product_count),
    });
  }

  // An axis with one value cannot narrow anything.
  const facets = [...byAxis.values()].filter((facet) => facet.values.length > 1);
  return { facets, error: null };
}

/**
 * One page of a shelf, narrowed and sorted in the database.
 *
 * `total` is the size of the whole filtered set, not of this page — it rides
 * back on every row from the same query, so a "showing 20 of 137" can never
 * disagree with what the page actually contains.
 *
 * `hydrate` restores the order the database chose, so sorting survives the
 * second query that fetches the full products.
 */
export async function getFilteredCategoryProducts(
  categoryPath: string,
  filters: CategoryFilters = {},
  options: { sort?: string; page?: number; pageSize?: number; currency?: string } = {}
) {
  const { sort = 'featured', page = 1, pageSize = CATEGORY_PAGE_SIZE, currency = 'NGN' } = options;

  let path = categoryPath;
  if (isSlugPath(categoryPath)) {
    const { category } = await getCategoryByPath(categoryPath);
    if (!category) return { products: [] as Product[], total: 0, error: 'Category not found' };
    path = category.path;
  }

  const { data, error } = await supabase().rpc('filter_products', {
    p_path: path,
    p_search: null,
    p_options: filters.options ?? {},
    p_tags: filters.tags?.length ? filters.tags : null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_currency: currency.toUpperCase(),
    p_in_stock: filters.inStockOnly ?? null,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: Math.max(page - 1, 0) * pageSize,
  });

  if (error) return { products: [] as Product[], total: 0, error: error.message };

  const rows = (data ?? []) as { id: string; total_count: number }[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  if (rows.length === 0) return { products: [], total, error: null };

  const { products, error: hydrateError } = await hydrate(rows.map((row) => row.id));
  return { products, total, error: hydrateError };
}


/**
 * Search results, on the same rails as a shelf.
 *
 * Search used to live entirely in the navbar dialog: six ranked matches and the
 * line "refine to narrow", with nowhere to go. It shares the category functions
 * now, so a results page gets the same axes, counts, sorting and paging — the
 * only difference is which scope the query is given.
 */
export async function getSearchFacets(query: string) {
  const { data, error } = await supabase()
    .rpc('product_facets', { p_path: null, p_search: query });
  if (error) return { facets: [] as CategoryFacet[], error: error.message };

  const byAxis = new Map<string, CategoryFacet>();
  for (const row of (data ?? []) as any[]) {
    if (!byAxis.has(row.axis)) byAxis.set(row.axis, { name: row.axis, values: [] });
    byAxis.get(row.axis)!.values.push({
      value: row.value,
      hex: row.hex ?? undefined,
      count: Number(row.product_count),
    });
  }

  return { facets: [...byAxis.values()].filter((f) => f.values.length > 1), error: null };
}

export async function searchProducts(
  query: string,
  filters: CategoryFilters = {},
  options: { sort?: string; page?: number; pageSize?: number; currency?: string } = {}
) {
  const { sort = 'relevance', page = 1, pageSize = CATEGORY_PAGE_SIZE, currency = 'NGN' } = options;

  if (!query.trim()) return { products: [] as Product[], total: 0, error: null };

  const { data, error } = await supabase().rpc('filter_products', {
    p_path: null,
    p_search: query,
    p_options: filters.options ?? {},
    p_tags: filters.tags?.length ? filters.tags : null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_currency: currency.toUpperCase(),
    p_in_stock: filters.inStockOnly ?? null,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: Math.max(page - 1, 0) * pageSize,
  });

  if (error) return { products: [] as Product[], total: 0, error: error.message };

  const rows = (data ?? []) as { id: string; total_count: number }[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  if (rows.length === 0) return { products: [], total, error: null };

  const { products, error: hydrateError } = await hydrate(rows.map((row) => row.id));
  return { products, total, error: hydrateError };
}


// ----------------------------------------------------------- collections

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  bannerUrl?: string;
  bannerAlt?: string;
  isFeatured: boolean;
  productCount: number;
}

/**
 * Every collection with what is in it.
 *
 * The count matters on the index: a collection with nothing in it renders an
 * empty page, and until now there was no way to see that without opening it.
 */
export async function getCollectionSummaries() {
  const { data, error } = await supabase().rpc('collection_summaries');
  if (error) return { collections: [] as CollectionSummary[], error: error.message };

  const collections: CollectionSummary[] = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    bannerAlt: row.banner_alt ?? undefined,
    isFeatured: Boolean(row.is_featured),
    productCount: Number(row.product_count),
  }));

  return { collections, error: null };
}

/**
 * The collection on the home page, chosen in the admin.
 *
 * At most one row can carry `is_featured` — the database enforces it, and
 * `set_home_collection()` is what moves it. An empty one is skipped rather than
 * rendering a band that leads to an empty page.
 */
export async function getHomeCollection() {
  const { collections, error } = await getCollectionSummaries();
  const collection = collections.find((c) => c.isFeatured && c.productCount > 0) ?? null;
  return { collection, error };
}

export async function getCollectionFacets(slug: string) {
  const { data, error } = await supabase()
    .rpc('product_facets', { p_path: null, p_search: null, p_collection: slug });
  if (error) return { facets: [] as CategoryFacet[], error: error.message };

  const byAxis = new Map<string, CategoryFacet>();
  for (const row of (data ?? []) as any[]) {
    if (!byAxis.has(row.axis)) byAxis.set(row.axis, { name: row.axis, values: [] });
    byAxis.get(row.axis)!.values.push({
      value: row.value,
      hex: row.hex ?? undefined,
      count: Number(row.product_count),
    });
  }

  return { facets: [...byAxis.values()].filter((f) => f.values.length > 1), error: null };
}

/** One page of a collection — the same rails as a shelf or a search. */
export async function getCollectionProducts(
  slug: string,
  filters: CategoryFilters = {},
  options: { sort?: string; page?: number; pageSize?: number; currency?: string } = {}
) {
  const { sort = 'featured', page = 1, pageSize = CATEGORY_PAGE_SIZE, currency = 'NGN' } = options;

  const { data, error } = await supabase().rpc('filter_products', {
    p_path: null,
    p_search: null,
    p_collection: slug,
    p_options: filters.options ?? {},
    p_tags: filters.tags?.length ? filters.tags : null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_currency: currency.toUpperCase(),
    p_in_stock: filters.inStockOnly ?? null,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: Math.max(page - 1, 0) * pageSize,
  });

  if (error) return { products: [] as Product[], total: 0, error: error.message };

  const rows = (data ?? []) as { id: string; total_count: number }[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  if (rows.length === 0) return { products: [], total, error: null };

  const { products, error: hydrateError } = await hydrate(rows.map((row) => row.id));
  return { products, total, error: hydrateError };
}

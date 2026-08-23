import { createClient } from '@/lib/supabase/client';

/**
 * How many products sit in each category and collection.
 *
 * Neither list showed this, and it is the one number that decides whether the
 * entry should exist: a category with nothing in it is a dead link in the shop's
 * navigation, and a collection with nothing in it renders an empty page. There
 * was no way to spot either from the admin.
 *
 * Counts include drafts, so a category that looks empty on the shop but holds
 * unpublished work does not read as abandoned.
 */
export async function getCategoryProductCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await createClient()
    .from('products')
    .select('category_id')
    .not('category_id', 'is', null);

  if (error) return counts;

  (data ?? []).forEach((row: any) => {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  });

  return counts;
}

/**
 * How many products sit in each collection.
 *
 * This used to pull every product's `collection_id` and tally them in
 * JavaScript. That column is gone — membership is a join table now — and one
 * product can appear under several collections, so counting client-side would
 * mean fetching the whole join table to group it. The database groups it.
 */
export async function getCollectionProductCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await createClient().rpc('admin_collection_counts');
  if (error) return counts;

  (data ?? []).forEach((row: any) => {
    counts.set(row.collection_id, Number(row.product_count));
  });

  return counts;
}

// ------------------------------------------------ picking a line for an order

export interface VariantOption {
  variantId: string;
  productName: string;
  variantLabel?: string;
  sku: string;
  price: number;
  stock: number;
}

/**
 * Sellable variants, for building an order by hand.
 *
 * Drafts are included on purpose: staff regularly sell something over WhatsApp
 * before it is published, and refusing to put it on an order would push them
 * back to typing an invoice by hand — which is the thing this replaces.
 *
 * Stock comes along so whoever is typing can see they are about to sell the last
 * two. Nothing blocks on it: on a WhatsApp sale the goods have often already
 * changed hands, and the shortfall surfaces when the order is marked paid.
 */
export async function searchOrderableVariants(query: string): Promise<{
  variants: VariantOption[];
  error: string | null;
}> {
  const term = query.trim();

  const supabase = createClient();

  let request = supabase
    .from('product_variants')
    .select(`
      id, sku, stock_count,
      products!inner ( name ),
      product_prices ( currency, amount ),
      variant_option_values ( product_option_values ( value, position, product_options ( position ) ) )
    `)
    .limit(20);

  if (term) {
    // Matching the product name *and* the SKU in one `.or` is not expressible:
    // PostgREST cannot parse a referenced table's column inside a logic tree
    // ("failed to parse logic tree"). So the names resolve to ids first, and the
    // variant query filters on two of its own columns — which is what an `.or`
    // can actually do.
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .ilike('name', `%${term}%`)
      .limit(50);

    const ids = (products ?? []).map((row: any) => row.id);
    request = ids.length
      ? request.or(`sku.ilike.%${term}%,product_id.in.(${ids.join(',')})`)
      : request.ilike('sku', `%${term}%`);
  }

  const { data, error } = await request;
  if (error) return { variants: [], error: error.message };

  const variants: VariantOption[] = (data ?? []).map((row: any) => {
    const naira = (row.product_prices ?? []).find(
      (price: any) => String(price.currency).toLowerCase() === 'ngn'
    );

    const label = (row.variant_option_values ?? [])
      .map((link: any) => link.product_option_values)
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          (a.product_options?.position ?? 0) - (b.product_options?.position ?? 0) ||
          (a.position ?? 0) - (b.position ?? 0)
      )
      .map((value: any) => value.value)
      .join(' / ');

    return {
      variantId: row.id,
      productName: row.products?.name ?? 'Unnamed',
      variantLabel: label || undefined,
      sku: row.sku,
      price: naira ? Number(naira.amount) : 0,
      stock: Number(row.stock_count ?? 0),
    };
  });

  return { variants, error: null };
}

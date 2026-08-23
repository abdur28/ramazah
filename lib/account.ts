import { createClient } from '@/lib/supabase/client';
import type { CartItem } from '@/types/types';

/**
 * Account-area reads and writes: order tracking, reordering and the address
 * book. Everything here runs as the signed-in customer, so RLS decides what
 * comes back — none of these functions check ownership themselves.
 */

// ------------------------------------------------------------------ tracking

export interface OrderEvent {
  status: string;
  note: string | null;
  at: string;
}

/**
 * An order's history, oldest first.
 *
 * `order_status_history` is written by a trigger on every status change and was
 * being displayed nowhere. With delivery running two to three weeks, this is
 * the answer to the question customers ask most.
 */
export async function getOrderTimeline(orderId: string) {
  const { data, error } = await createClient()
    .from('order_status_history')
    .select('to_status, note, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) return { events: [], error: error.message };

  const events: OrderEvent[] = (data ?? []).map((row: any) => ({
    status: row.to_status,
    note: row.note,
    at: row.created_at,
  }));

  return { events, error: null };
}

// ------------------------------------------------------------------ reorder

export interface ReorderLine {
  item: Omit<CartItem, 'id'>;
  /** Set when the line could not be repeated, with the reason. */
  problem?: string;
}

/**
 * Rebuild a past order as cart items, priced from today's catalog.
 *
 * Deliberately not reusing the order's own prices: an order is a record of what
 * something cost then, and re-adding it at that price would sell stock below
 * its current value. Anything archived or out of stock comes back with a
 * `problem` so the caller can say which lines were dropped.
 */
export async function buildReorder(orderId: string): Promise<{ lines: ReorderLine[]; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      name, quantity, image_url, variant_id,
      product_variants (
        id, sku, stock_count, in_stock,
        product_prices ( currency, amount, compare_at_amount ),
        variant_option_values ( product_option_values ( value, product_options ( name ) ) ),
        products ( id, name, slug, status )
      )
    `)
    .eq('order_id', orderId);

  if (error) return { lines: [], error: error.message };

  const lines: ReorderLine[] = (data ?? []).map((row: any) => {
    const variant = row.product_variants;
    const product = variant?.products;

    const label = (variant?.variant_option_values ?? [])
      .map((value: any) => value.product_option_values?.value)
      .filter(Boolean)
      .join(' / ');

    const prices = (variant?.product_prices ?? []).map((price: any) => ({
      currency: String(price.currency).toLowerCase(),
      price: Number(price.amount),
      compareAtPrice: price.compare_at_amount ? Number(price.compare_at_amount) : 0,
      discountPercent: 0,
    }));

    const item = {
      productId: product?.id ?? '',
      variantId: variant?.id,
      name: product?.name ?? row.name,
      slug: product?.slug ?? '',
      prices,
      quantity: Math.min(row.quantity, variant?.stock_count ?? row.quantity),
      image: row.image_url ?? '',
      variantLabel: label || undefined,
      sku: variant?.sku ?? '',
      inStock: Boolean(variant?.in_stock),
      maxQuantity: variant?.stock_count ?? 0,
    } as Omit<CartItem, 'id'>;

    let problem: string | undefined;
    if (!variant || !product || product.status !== 'active') problem = 'No longer stocked';
    else if (!variant.in_stock || (variant.stock_count ?? 0) < 1) problem = 'Out of stock';

    return { item, problem };
  });

  return { lines, error: null };
}

// ------------------------------------------------------------- address book

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

const mapAddress = (row: any): Address => ({
  id: row.id,
  fullName: row.full_name ?? '',
  phone: row.phone ?? '',
  street: row.street ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  postalCode: row.postal_code,
  country: row.country ?? 'Nigeria',
  isDefault: Boolean(row.is_default),
});

export async function getAddresses(userId: string) {
  const { data, error } = await createClient()
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return { addresses: [], error: error.message };
  return { addresses: (data ?? []).map(mapAddress), error: null };
}

export async function saveAddress(
  userId: string,
  address: Omit<Address, 'id'> & { id?: string }
) {
  const supabase = createClient();

  const row = {
    user_id: userId,
    full_name: address.fullName,
    phone: address.phone,
    street: address.street,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode || null,
    country: address.country || 'Nigeria',
    is_default: address.isDefault,
  };

  // One default at a time, or checkout has to guess.
  if (address.isDefault) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }

  const { error } = address.id
    ? await supabase.from('addresses').update(row).eq('id', address.id)
    : await supabase.from('addresses').insert(row);

  return { error: error?.message ?? null };
}

export async function deleteAddress(addressId: string) {
  const { error } = await createClient().from('addresses').delete().eq('id', addressId);
  return { error: error?.message ?? null };
}

// -------------------------------------------------------------- own reviews

export interface MyReview {
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  createdAt: string;
}

/** Reviews this customer wrote, at any status — theirs to see by RLS. */
export async function getMyReviews(userId: string) {
  const { data, error } = await createClient()
    .from('reviews')
    .select('id, rating, title, body, status, created_at, products ( name, slug )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { reviews: [], error: error.message };

  const reviews: MyReview[] = (data ?? []).map((row: any) => ({
    id: row.id,
    productName: row.products?.name ?? 'Product',
    productSlug: row.products?.slug ?? '',
    rating: row.rating,
    title: row.title,
    body: row.body ?? '',
    status: row.status,
    createdAt: row.created_at,
  }));

  return { reviews, error: null };
}

// ---------------------------------------------------------------- requests

export interface ProductRequest {
  id: string;
  item: string;
  details: string;
  referenceUrl: string | null;
  quantity: number;
  budget: number | null;
  status: 'asked' | 'quoted' | 'accepted' | 'buying' | 'fulfilled' | 'declined' | 'withdrawn';
  quotedAmount: number | null;
  staffNote: string | null;
  createdAt: string;
}

const mapRequest = (row: any): ProductRequest => ({
  id: row.id,
  item: row.item,
  details: row.details ?? '',
  referenceUrl: row.reference_url,
  quantity: row.quantity,
  // `? :` on a numeric turns a stored 0 into "no budget". Zero is an answer.
  budget: row.budget != null ? Number(row.budget) : null,
  status: row.status,
  quotedAmount: row.quoted_amount != null ? Number(row.quoted_amount) : null,
  staffNote: row.staff_note,
  createdAt: row.created_at,
});

/**
 * Sourcing requests belonging to this customer.
 *
 * Callers must show `error`. The dashboard used to drop it and render the empty
 * array, so a dropped connection told a customer they had never asked for
 * anything.
 */
export async function getMyRequests(userId: string) {
  const { data, error } = await createClient()
    .from('product_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { requests: [], error: error.message };
  return { requests: (data ?? []).map(mapRequest), error: null };
}

/**
 * Only a real web address gets stored.
 *
 * The admin renders this as a "Their reference" link, which reads as something
 * the shop can trust. It accepted any string — `javascript:` included. React
 * blocks that one at render and browsers block top-level `data:` navigation, so
 * it was not script execution, but an arbitrary scheme or host behind a
 * trustworthy-looking link is not something to hand staff.
 */
function safeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    // A bare host is what people actually paste.
    try {
      const url = new URL(`https://${trimmed}`);
      return url.hostname.includes('.') ? url.toString() : null;
    } catch {
      return null;
    }
  }
}

export async function submitRequest(
  userId: string,
  input: { item: string; details: string; referenceUrl: string; quantity: number; budget: string }
) {
  if (input.item.trim().length < 2) {
    return { error: 'Tell us what you are looking for.' };
  }

  if (input.referenceUrl.trim() && !safeUrl(input.referenceUrl)) {
    return { error: 'That link does not look like a web address. Leave it blank if you have none.' };
  }

  const { error } = await createClient().from('product_requests').insert({
    user_id: userId,
    item: input.item.trim(),
    details: input.details.trim(),
    reference_url: safeUrl(input.referenceUrl),
    quantity: Math.max(1, Number(input.quantity) || 1),
    budget: input.budget ? Number(input.budget) : null,
  });

  if (error) {
    console.error('Request submit failed:', error.message);
    return { error: 'Could not send that request. Please try again.' };
  }

  return { error: null };
}

/**
 * The customer answers their own quote.
 *
 * `status` is not grantable to customers, so this goes through a SECURITY
 * DEFINER function that checks ownership. Accepting is only possible from
 * `quoted`; withdrawing stops once the shop has started buying.
 */
export async function answerRequest(requestId: string, accept: boolean) {
  const { error } = await createClient().rpc('answer_request', {
    p_request: requestId,
    p_accept: accept,
  });
  return { error: error?.message ?? null };
}

/** Admin queue. Admin-only by RLS, not by this function. */
export async function getRequestsForStaff(status?: ProductRequest['status']) {
  let query = createClient()
    .from('product_requests')
    .select('*, profiles ( display_name, email )')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { requests: [], error: error.message };

  const requests = (data ?? []).map((row: any) => ({
    ...mapRequest(row),
    customerName: row.profiles?.display_name ?? 'Customer',
    customerEmail: row.profiles?.email ?? '',
  }));

  return { requests, error: null };
}

/**
 * Move a request along. Goes through the SECURITY DEFINER function because
 * `status`, `quoted_amount` and `staff_note` are not grantable to customers.
 */
export async function setRequestStatus(
  requestId: string,
  status: ProductRequest['status'],
  quote?: number | null,
  note?: string | null
) {
  const { error } = await createClient().rpc('set_request_status', {
    p_request: requestId,
    p_status: status,
    p_quote: quote ?? null,
    p_note: note ?? null,
  });

  return { error: error?.message ?? null };
}

import { createClient } from '@/lib/supabase/client';

/**
 * What each customer is actually worth.
 *
 * The customers table had an "Orders" column reading `user.orders?.length || 0`
 * — but `orders` is never populated on a profile; relations moved into their own
 * tables during the Supabase migration and the mapper does not fetch them. So
 * the column printed `0` for every customer on the list, including the ones with
 * a dozen orders behind them, and there was no way to tell a first-time buyer
 * from the best customer in the shop.
 *
 * It was then fixed by fetching every order in the shop and aggregating them
 * here, which is right up to a thousand orders and quietly wrong after that —
 * PostgREST caps an unbounded select at 1000 rows, so lifetime spend would have
 * stopped counting without saying so. It now aggregates in the database, for
 * the customers actually on screen. See migration 20260830000037.
 */
export interface CustomerStats {
  orderCount: number;
  spend: number;
  currency: string;
  lastOrderAt: string | null;
}

export async function getCustomerStats(userIds: string[]): Promise<{
  stats: Map<string, CustomerStats>;
  error: string | null;
}> {
  const stats = new Map<string, CustomerStats>();
  // Orders raised by staff for someone with no account carry a null `user_id`,
  // and `= any(null)` matches nothing, so they are filtered out before the call
  // rather than sent as a null the function has to defend against.
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return { stats, error: null };

  const { data, error } = await createClient().rpc('customer_stats', { p_ids: ids });
  if (error) return { stats, error: error.message };

  for (const row of (data ?? []) as any[]) {
    stats.set(row.user_id, {
      orderCount: row.order_count ?? 0,
      spend: Number(row.spend ?? 0),
      currency: String(row.currency ?? 'NGN').toLowerCase(),
      lastOrderAt: row.last_order_at ?? null,
    });
  }

  return { stats, error: null };
}

// --------------------------------------------------------------- one customer

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  itemCount: number;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  rating: number;
  title?: string;
  body: string;
  status: string;
  createdAt: string;
}

export interface CustomerRequest {
  id: string;
  item: string;
  quantity: number;
  budget?: number;
  status: string;
  quotedAmount?: number;
  createdAt: string;
}

export interface CustomerDetail {
  orders: CustomerOrder[];
  addresses: CustomerAddress[];
  reviews: CustomerReview[];
  requests: CustomerRequest[];
  /** Whether this email is on the newsletter, and still active on it. */
  newsletter: boolean;
  /**
   * How many there are altogether, which is not always how many are listed.
   * The panels show the most recent `DETAIL_LIMIT`; these counts are the real
   * ones, so a heading never claims a customer has fewer orders than they do.
   */
  counts: { orders: number; reviews: number; requests: number };
}

/**
 * A customer's record.
 *
 * The details dialog had an Orders tab whose entire content was a hardcoded
 * "No Orders Yet" panel — it never queried anything — plus three statistics
 * that read `user.orders?.length || 0`, `user.wishlistItems?.length || 0` and a
 * literal "Active" badge. So a customer with eleven orders and a suspended
 * account displayed as a brand-new active one with nothing to their name.
 *
 * Sourcing requests come back too. They are the service this business leads
 * with — "tell us what you need and we'll do the rest" — and the dialog this
 * replaced showed no sign of them, so the customers screen could not tell a
 * buyer from someone who has asked for six things and bought none of them.
 *
 * Reviews are the rows now rather than a count, because a count answers nothing:
 * what staff need is what this person actually said, and whether any of it is
 * still sitting unapproved.
 *
 * Each panel is capped at the most recent hundred, with the true totals
 * alongside. An uncapped select is capped anyway — PostgREST stops at 1000 and
 * says nothing — so the choice is between a limit you set and a limit you
 * inherit, and only one of them can be reported honestly on screen.
 *
 * Wishlists are deliberately absent. `wishlist_items` is owner-only in RLS with
 * no admin clause, unlike orders and addresses, and that is the right line to
 * hold: staff need to see what someone bought, not what they are considering.
 */
/** How many rows each panel on the customer page lists. */
export const DETAIL_LIMIT = 100;

export async function getCustomerDetail(
  userId: string,
  email?: string
): Promise<{
  detail: CustomerDetail;
  error: string | null;
}> {
  const supabase = createClient();
  const empty: CustomerDetail = {
    orders: [], addresses: [], reviews: [], requests: [], newsletter: false,
    counts: { orders: 0, reviews: 0, requests: 0 },
  };

  const [orders, addresses, reviews, requests, newsletter] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, total, currency, status, payment_status, created_at, order_items(id)',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(DETAIL_LIMIT),
    supabase
      .from('addresses')
      .select('id, full_name, phone, street, city, state, postal_code, country, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .limit(DETAIL_LIMIT),
    supabase
      .from('reviews')
      .select(
        'id, rating, title, body, status, created_at, products ( id, name, slug )',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(DETAIL_LIMIT),
    supabase
      .from('product_requests')
      .select('id, item, quantity, budget, status, quoted_amount, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(DETAIL_LIMIT),
    // Keyed by email, not by user id — anyone can subscribe from the footer
    // without an account, so the table has no user_id to join on.
    email
      ? supabase
          .from('newsletter_subscribers')
          .select('is_active')
          .eq('email', email)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  const error = orders.error?.message ?? addresses.error?.message ?? null;
  if (error) return { detail: empty, error };

  return {
    detail: {
      counts: {
        orders: orders.count ?? (orders.data ?? []).length,
        reviews: reviews.count ?? (reviews.data ?? []).length,
        requests: requests.count ?? (requests.data ?? []).length,
      },
      orders: (orders.data ?? []).map((row: any) => ({
        id: row.id,
        orderNumber: row.order_number,
        total: Number(row.total ?? 0),
        currency: String(row.currency ?? 'NGN').toLowerCase(),
        status: row.status,
        paymentStatus: row.payment_status,
        itemCount: row.order_items?.length ?? 0,
        createdAt: row.created_at,
      })),
      addresses: (addresses.data ?? []).map((row: any) => ({
        id: row.id,
        fullName: row.full_name ?? '',
        phone: row.phone ?? '',
        street: row.street ?? '',
        city: row.city ?? '',
        state: row.state ?? '',
        postalCode: row.postal_code ?? '',
        country: row.country ?? '',
        isDefault: Boolean(row.is_default),
      })),
      reviews: (reviews.data ?? []).map((row: any) => ({
        id: row.id,
        productId: row.products?.id ?? '',
        productName: row.products?.name ?? 'A deleted product',
        productSlug: row.products?.slug ?? '',
        rating: Number(row.rating ?? 0),
        title: row.title ?? undefined,
        body: row.body ?? '',
        status: row.status,
        createdAt: row.created_at,
      })),
      requests: (requests.data ?? []).map((row: any) => ({
        id: row.id,
        item: row.item,
        quantity: Number(row.quantity ?? 1),
        budget: row.budget === null ? undefined : Number(row.budget),
        status: row.status,
        quotedAmount: row.quoted_amount === null ? undefined : Number(row.quoted_amount),
        createdAt: row.created_at,
      })),
      newsletter: Boolean((newsletter as any)?.data?.is_active),
    },
    error: null,
  };
}

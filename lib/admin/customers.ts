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
 * One query over the orders, aggregated here. Cancelled and refunded orders
 * count toward the order tally but not toward what the customer has spent.
 */
export interface CustomerStats {
  orderCount: number;
  spend: number;
  currency: string;
  lastOrderAt: string | null;
}

export async function getCustomerStats(): Promise<{
  stats: Map<string, CustomerStats>;
  error: string | null;
}> {
  const { data, error } = await createClient()
    .from('orders')
    .select('user_id, total, currency, status, payment_status, created_at')
    .order('created_at', { ascending: false });

  const stats = new Map<string, CustomerStats>();
  if (error) return { stats, error: error.message };

  (data ?? []).forEach((row: any) => {
    const existing = stats.get(row.user_id) ?? {
      orderCount: 0,
      spend: 0,
      currency: String(row.currency ?? 'NGN').toLowerCase(),
      // Rows arrive newest first, so the first one seen is the latest.
      lastOrderAt: row.created_at,
    };

    existing.orderCount += 1;
    if (row.payment_status === 'paid' && row.status !== 'refunded') {
      existing.spend += Number(row.total ?? 0);
    }

    stats.set(row.user_id, existing);
  });

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
 * Wishlists are deliberately absent. `wishlist_items` is owner-only in RLS with
 * no admin clause, unlike orders and addresses, and that is the right line to
 * hold: staff need to see what someone bought, not what they are considering.
 */
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
  };

  const [orders, addresses, reviews, requests, newsletter] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, currency, status, payment_status, created_at, order_items(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('addresses')
      .select('id, full_name, phone, street, city, state, postal_code, country, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, title, body, status, created_at, products ( id, name, slug )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('product_requests')
      .select('id, item, quantity, budget, status, quoted_amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
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

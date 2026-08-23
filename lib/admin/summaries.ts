import { createClient } from '@/lib/supabase/client';

/**
 * The numbers above the lists.
 *
 * Each of these is one RPC that counts the whole table, and they exist because
 * the lists below them are now paged. A stat card fed by
 * `rows.filter(...).length` is only ever right when `rows` is everything, which
 * stopped being true the moment the first page had a second one — and it fails
 * silently, which is the part that matters. See migration 20260830000035.
 *
 * Every one of these is `security invoker` in the database, so RLS decides the
 * rows: a customer calling `order_summary` would summarise their own orders,
 * not the shop's.
 */

const rpc = async <T>(name: string, fallback: T): Promise<{ data: T; error: string | null }> => {
  const { data, error } = await createClient().rpc(name);
  if (error) return { data: fallback, error: error.message };
  // Every one of these returns a single row, which PostgREST hands back as a
  // one-element array. An empty table still returns a row of zeroes because the
  // aggregates are unfiltered — but a `[]` here would otherwise become
  // `undefined` and take every card on the screen down with it.
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as T) ?? fallback, error: null };
};

export interface OrderSummary {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  awaitingFulfilment: number;
  unpaidCount: number;
  unpaidTotal: number;
  settledTotal: number;
  currency: string;
}

const EMPTY_ORDERS: OrderSummary = {
  total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
  refunded: 0, awaitingFulfilment: 0, unpaidCount: 0, unpaidTotal: 0,
  settledTotal: 0, currency: 'NGN',
};

export async function getOrderSummary() {
  const { data, error } = await rpc<any>('order_summary', null);
  if (error || !data) return { summary: EMPTY_ORDERS, error };

  return {
    summary: {
      total: data.total ?? 0,
      pending: data.pending ?? 0,
      processing: data.processing ?? 0,
      shipped: data.shipped ?? 0,
      delivered: data.delivered ?? 0,
      cancelled: data.cancelled ?? 0,
      refunded: data.refunded ?? 0,
      awaitingFulfilment: data.awaiting_fulfilment ?? 0,
      unpaidCount: data.unpaid_count ?? 0,
      unpaidTotal: Number(data.unpaid_total ?? 0),
      settledTotal: Number(data.settled_total ?? 0),
      currency: String(data.currency ?? 'NGN').toLowerCase(),
    } as OrderSummary,
    error: null,
  };
}

export interface PaymentSummary {
  success: number; pending: number; failed: number; refunded: number;
  successTotal: number; pendingTotal: number;
  failedTotal: number; refundedTotal: number;
  /** Days the longest-outstanding invoice has been waiting; null when none is. */
  oldestWait: number | null;
  currency: string;
}

const EMPTY_PAYMENTS: PaymentSummary = {
  success: 0, pending: 0, failed: 0, refunded: 0, successTotal: 0,
  pendingTotal: 0, failedTotal: 0, refundedTotal: 0, oldestWait: null,
  currency: 'ngn',
};

export async function getPaymentSummary() {
  const { data, error } = await rpc<any>('payment_summary', null);
  if (error || !data) return { summary: EMPTY_PAYMENTS, error };

  const oldest = data.oldest_unpaid ? new Date(data.oldest_unpaid) : null;

  return {
    summary: {
      success: data.success_count ?? 0,
      pending: data.pending_count ?? 0,
      failed: data.failed_count ?? 0,
      refunded: data.refunded_count ?? 0,
      successTotal: Number(data.success_total ?? 0),
      pendingTotal: Number(data.pending_total ?? 0),
      failedTotal: Number(data.failed_total ?? 0),
      refundedTotal: Number(data.refunded_total ?? 0),
      oldestWait: oldest
        ? Math.floor((Date.now() - oldest.getTime()) / 86_400_000)
        : null,
      currency: String(data.currency ?? 'NGN').toLowerCase(),
    } as PaymentSummary,
    error: null,
  };
}

export interface ProductSummary {
  total: number; live: number; draft: number; archived: number;
  low: number; out: number;
}

const EMPTY_PRODUCTS: ProductSummary = {
  total: 0, live: 0, draft: 0, archived: 0, low: 0, out: 0,
};

export async function getProductSummary() {
  const { data, error } = await rpc<any>('product_summary', null);
  if (error || !data) return { summary: EMPTY_PRODUCTS, error };

  return {
    summary: {
      total: data.total ?? 0,
      live: data.live ?? 0,
      draft: data.draft ?? 0,
      archived: data.archived ?? 0,
      low: data.low ?? 0,
      out: data.out_of_stock ?? 0,
    } as ProductSummary,
    error: null,
  };
}

export interface CustomerSummary { total: number; admins: number; suspended: number }

export async function getCustomerSummary() {
  const { data, error } = await rpc<any>('customer_summary', null);
  const summary: CustomerSummary = {
    total: data?.total ?? 0,
    admins: data?.admins ?? 0,
    suspended: data?.suspended ?? 0,
  };
  return { summary, error };
}

/**
 * Per-status tallies, as a lookup with an `all` entry added.
 *
 * Statuses with no rows are simply absent from the result, so reading one gives
 * `undefined` — the screens default it to zero. That is deliberate: adding an
 * eighth request status should not need this file changed.
 */
async function statusCounts(fn: string) {
  const { data, error } = await createClient().rpc(fn);
  if (error) return { counts: {} as Record<string, number>, error: error.message };

  const counts: Record<string, number> = { all: 0 };
  for (const row of (data ?? []) as { status: string; tally: number }[]) {
    counts[row.status] = row.tally;
    counts.all += row.tally;
  }
  return { counts, error: null };
}

export const getReviewCounts = () => statusCounts('review_counts');
export const getRequestCounts = () => statusCounts('request_counts');

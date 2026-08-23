import { createClient } from '@/lib/supabase/client';
import { fetchPage, rangeFor } from '@/lib/paging';

/**
 * Reviews.
 *
 * The database does the enforcing, not this file: only someone whose order for
 * the product reached `shipped` or `delivered` may insert a review, reviews
 * arrive as `pending` and are invisible until an admin approves them, and the
 * `status` column is not grantable to customers — so nobody can approve their
 * own. See the RLS policies in `20260819000003_rls.sql`.
 */

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewEligibility {
  /** The order line that entitles this person to review, if any. */
  orderItemId: string | null;
  canReview: boolean;
  /** Their own review, at any status — so we can show a pending one back. */
  existingReview: { id: string; rating: number; status: string } | null;
}

/** Approved reviews for a product, newest first, a page at a time. */
export async function getProductReviews(productId: string, page = 1) {
  const { data, error, count, page: landed } = await fetchPage(page, (p) => {
    const [first, last] = rangeFor(p);
    return createClient()
      .from('review_public')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(first, last);
  });

  if (error) return { reviews: [], total: 0, page: 1, error: error.message };

  const reviews: PublicReview[] = (data ?? []).map((row: any) => ({
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body ?? '',
    authorName: row.author_name,
    isVerifiedPurchase: row.is_verified_purchase,
    helpfulCount: row.helpful_count ?? 0,
    createdAt: row.created_at,
  }));

  return { reviews, total: count ?? reviews.length, page: landed, error: null };
}

/**
 * The star breakdown, counted in the database.
 *
 * Drawn from the loaded reviews before, which was every review only because the
 * query had no limit. Now that the list is paged, the bars would otherwise
 * describe the fifty on screen — see migration 20260830000038.
 */
export async function getReviewDistribution(productId: string) {
  const { data, error } = await createClient()
    .rpc('review_distribution', { p_product: productId });

  const tally: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (error) return { distribution: tally, total: 0, error: error.message };

  let total = 0;
  for (const row of (data ?? []) as { rating: number; tally: number }[]) {
    tally[row.rating] = row.tally;
    total += row.tally;
  }

  return { distribution: tally, total, error: null };
}

/**
 * Whether this person may review this product, and what they have already said.
 *
 * Mirrors the insert policy rather than replacing it: the query below decides
 * what the form shows, the policy decides what the database accepts.
 */
export async function getReviewEligibility(
  productId: string,
  userId: string
): Promise<ReviewEligibility> {
  const supabase = createClient();

  const [{ data: orderLines }, { data: existing }] = await Promise.all([
    supabase
      .from('order_items')
      .select('id, orders!inner(user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', userId)
      .in('orders.status', ['shipped', 'delivered'])
      .limit(1),
    supabase
      .from('reviews')
      .select('id, rating, status')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const orderItemId = orderLines?.[0]?.id ?? null;

  return {
    orderItemId,
    canReview: Boolean(orderItemId) && !existing,
    existingReview: existing ?? null,
  };
}

export async function submitReview(input: {
  productId: string;
  userId: string;
  orderItemId: string | null;
  rating: number;
  title: string;
  body: string;
}) {
  if (input.rating < 1 || input.rating > 5) {
    return { error: 'Choose a rating between 1 and 5 stars.' };
  }

  const { error } = await createClient().from('reviews').insert({
    product_id: input.productId,
    user_id: input.userId,
    order_item_id: input.orderItemId,
    rating: input.rating,
    title: input.title.trim() || null,
    body: input.body.trim(),
  });

  if (error) {
    // 42501 is the policy refusing the insert: no qualifying order.
    if (error.code === '42501') {
      return { error: 'Reviews are open to customers who have received this item.' };
    }
    // 23505 is the one-review-per-person unique index.
    if (error.code === '23505') {
      return { error: 'You have already reviewed this product.' };
    }
    console.error('Review submit failed:', error.message);
    return { error: 'Could not save your review. Please try again.' };
  }

  return { error: null };
}

// ---------------------------------------------------------------- moderation

export interface PendingReview {
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  createdAt: string;
}

/** Everything awaiting a decision. Admin-only by RLS, not by this function. */
/**
 * One page of the moderation queue.
 *
 * Was unbounded. The waiting tab stays small if anyone is doing their job, but
 * the published tab only ever grows, and an unbounded select is silently capped
 * at 1000 rows by PostgREST — so a shop with a thousand approved reviews would
 * have had a Published tab that stopped at a thousand and never said why.
 */
export async function getReviewsForModeration(status = 'pending', page = 1) {
  const { data, error, count, page: landed } = await fetchPage(page, (p) => {
    const [first, last] = rangeFor(p);
    return createClient()
      .from('reviews')
      .select(
        'id, rating, title, body, status, created_at, products ( name, slug )',
        { count: 'exact' }
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(first, last);
  });

  if (error) return { reviews: [], total: 0, page: 1, error: error.message };

  const reviews: PendingReview[] = (data ?? []).map((row: any) => ({
    id: row.id,
    productName: row.products?.name ?? 'Unknown product',
    productSlug: row.products?.slug ?? '',
    rating: row.rating,
    title: row.title,
    body: row.body ?? '',
    status: row.status,
    createdAt: row.created_at,
  }));

  return { reviews, total: count ?? reviews.length, page: landed, error: null };
}

/**
 * Approve or reject. Goes through the SECURITY DEFINER function because
 * `status` is deliberately not grantable — the column privileges are what stop
 * a customer approving their own review.
 */
export async function setReviewStatus(reviewId: string, status: 'approved' | 'rejected') {
  const { error } = await createClient().rpc('set_review_status', {
    p_review: reviewId,
    p_status: status,
  });

  return { error: error?.message ?? null };
}

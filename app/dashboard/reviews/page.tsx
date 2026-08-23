'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Star, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyReviews, type MyReview } from '@/lib/account';
import Pager from '@/components/ui/Pager';

/**
 * Reviews this customer has written.
 *
 * Reviews are moderated, so without this page someone writes one, sees nothing
 * appear on the product, and concludes it was lost. Here the status is stated
 * plainly — including when it was not published.
 */
const statusCopy: Record<string, { label: string; className: string; note: string }> = {
  approved: {
    label: 'Published',
    className: 'bg-success/10 text-success',
    note: 'Visible on the product page.',
  },
  pending: {
    label: 'Being checked',
    className: 'bg-warning/10 text-warning',
    note: 'We read every review before it goes up. This usually takes a day.',
  },
  rejected: {
    label: 'Not published',
    className: 'bg-destructive/10 text-destructive',
    note: 'Get in touch if you think that is a mistake.',
  },
};

export default function MyReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { reviews: fetched, total: written, page: landed } = await getMyReviews(user.id, page);
    setReviews(fetched);
    setTotal(written);
    if (landed !== page) setPage(landed);
    setIsLoading(false);
  }, [user?.id, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">Your account</p>
        <h1 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          Your reviews
        </h1>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="rounded-sm border border-dashed border-rule py-16 text-center">
          <p className="font-body text-sm text-foreground">You have not written a review yet</p>
          <p className="mx-auto mt-1 max-w-[42ch] font-body text-sm text-ink-muted">
            Once an order arrives you can review what was in it — the form is on the product page.
          </p>
          <Link
            href="/dashboard/orders"
            className="mt-6 inline-block rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
          >
            See your orders
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const status = statusCopy[review.status] ?? statusCopy.pending;

            return (
              <li key={review.id} className="rounded-sm border border-rule bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex" aria-label={`${review.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-3.5 w-3.5 ${index < review.rating ? 'text-terra' : 'text-rule'}`}
                          fill="currentColor"
                        />
                      ))}
                    </span>
                    {review.title && (
                      <span className="font-body text-sm font-medium text-foreground">{review.title}</span>
                    )}
                  </div>

                  <span className={`rounded-full px-2.5 py-0.5 font-body text-[10px] uppercase tracking-[0.14em] ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <p className="mt-3 max-w-[68ch] font-body text-sm leading-relaxed text-ink-muted">
                  {review.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-ink-muted">
                  <Link
                    href={`/product/${review.productSlug}`}
                    className="inline-flex items-center gap-1 text-sage-deep transition-colors hover:text-foreground"
                  >
                    {review.productName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span>
                    {new Date(review.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  <span>{status.note}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reviews.length > 0 && (
        <div className="mt-8">
          <Pager page={page} total={total} busy={isLoading} onChange={setPage} noun="reviews" />
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Stars from "@/components/product/Stars";
import { useAuth } from "@/contexts/AuthContext";
import Pager from "@/components/ui/Pager";
import {
  getProductReviews,
  getReviewDistribution,
  getReviewEligibility,
  submitReview,
  type PublicReview,
  type ReviewEligibility,
} from "@/lib/reviews";

/**
 * Reviews for one product: the summary, the reviews themselves, and the form —
 * which only appears for someone who actually received the item, because that
 * is what the insert policy allows.
 *
 * Nothing renders while a product has no approved reviews and the reader is not
 * eligible to write one. A young catalog would otherwise show "No reviews yet"
 * on every page, which reads worse than saying nothing: an empty review block
 * is an emptiness signal exactly where the page is trying to earn trust.
 *
 * A review lands as `pending` and is invisible until an admin approves it in
 * /admin/reviews, so the author is told that rather than left wondering why
 * their review never appeared.
 */
interface ProductReviewsProps {
  productId: string;
  productName: string;
  ratingAvg: number;
  ratingCount: number;
}

export default function ProductReviews({
  productId,
  productName,
  ratingAvg,
  ratingCount,
}: ProductReviewsProps) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [distribution, setDistribution] = useState<Record<number, number>>({});
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isWriting, setIsWriting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [
      { reviews: fetched, total: written, page: landed },
      { distribution: bars },
      eligibilityResult,
    ] = await Promise.all([
      getProductReviews(productId, page),
      getReviewDistribution(productId),
      user ? getReviewEligibility(productId, user.id) : Promise.resolve(null),
    ]);

    setReviews(fetched);
    setTotal(written);
    if (landed !== page) setPage(landed);
    setDistribution(bars);
    setEligibility(eligibilityResult);
    setIsLoading(false);
  }, [productId, page, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!user || isSaving) return;

    setIsSaving(true);
    const { error } = await submitReview({
      productId,
      userId: user.id,
      orderItemId: eligibility?.orderItemId ?? null,
      rating,
      title,
      body,
    });
    setIsSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Thank you — your review is with us for checking.");
    setIsWriting(false);
    setRating(0);
    setTitle("");
    setBody("");
    load();
  };

  // Say nothing rather than say "no reviews yet".
  const hasNothingToShow =
    !isLoading && reviews.length === 0 && !eligibility?.canReview && !eligibility?.existingReview;
  if (isLoading || hasNothingToShow) return null;

  // Counted in the database. Reading it off the loaded reviews would have made
  // the bars describe this page rather than the product.
  const bars = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution[star] ?? 0,
  }));

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-rule bg-background">
      {/* Padding matches ProductInfo, so the column reads as one piece. */}
      <div className="px-6 py-12 lg:px-12 lg:py-14">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          What customers say
        </p>
        <h2 className="mt-3 font-heading text-3xl font-light leading-tight text-foreground">
          Reviews
        </h2>

        <div className="mt-8 space-y-10">
          {/* Summary */}
          <div>
            {ratingCount > 0 ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-4xl font-light tabular-nums text-foreground">
                    {ratingAvg.toFixed(1)}
                  </span>
                  <div>
                    <Stars rating={ratingAvg} size="md" />
                    <p className="mt-1 font-body text-sm text-ink-muted">
                      {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 max-w-sm space-y-1.5">
                  {bars.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 font-body text-xs tabular-nums text-ink-muted">
                        {star}
                      </span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-rule">
                        <div
                          className="h-full bg-terra"
                          style={{
                            width: `${total ? (count / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-5 text-right font-body text-xs tabular-nums text-ink-muted">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="max-w-[34ch] font-body text-sm text-ink-muted">
                No reviews for {productName} yet. Yours would be the first.
              </p>
            )}

            {/* Only a real customer can write one, so only they are asked. */}
            <div className="mt-8">
              {eligibility?.existingReview ? (
                <p className="rounded-sm border border-rule bg-wash px-4 py-3 font-body text-sm text-ink-muted">
                  {eligibility.existingReview.status === "approved"
                    ? "Your review is published below. Thank you."
                    : eligibility.existingReview.status === "pending"
                    ? "Your review is with us for checking and will appear once approved."
                    : "Your review was not published. Contact us if you think that is wrong."}
                </p>
              ) : eligibility?.canReview ? (
                <button
                  onClick={() => setIsWriting((open) => !open)}
                  className="rounded-sm bg-sage-deep px-7 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground"
                >
                  {isWriting ? "Close" : "Write a review"}
                </button>
              ) : user ? (
                <p className="max-w-[34ch] font-body text-sm text-ink-muted">
                  Reviews are open to customers once their order has arrived.
                </p>
              ) : (
                <p className="max-w-[34ch] font-body text-sm text-ink-muted">
                  <Link
                    href="/auth/login"
                    className="font-medium text-sage-deep underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to review something you have bought.
                </p>
              )}
            </div>
          </div>

          {/* The form, then the reviews */}
          <div>
            {isWriting && eligibility?.canReview && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 rounded-sm border border-rule bg-wash p-6"
              >
                <label className="block font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  Your rating
                </label>
                <div
                  className="mt-3 flex gap-1"
                  onMouseLeave={() => setHoverRating(0)}
                  role="radiogroup"
                  aria-label="Rating out of five"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star)}
                      className="p-0.5"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          star <= (hoverRating || rating) ? "text-terra" : "text-rule"
                        }`}
                        fill="currentColor"
                      />
                    </button>
                  ))}
                </div>

                <label
                  htmlFor="review-title"
                  className="mt-6 block font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted"
                >
                  Headline <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="review-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Ground exactly right"
                  className="mt-2 w-full rounded-sm border border-rule bg-card px-4 py-3 font-body text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-sage-deep"
                />

                <label
                  htmlFor="review-body"
                  className="mt-5 block font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted"
                >
                  Your review
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={4}
                  maxLength={1200}
                  placeholder="How was it? Anything a future buyer should know?"
                  className="mt-2 w-full rounded-sm border border-rule bg-card px-4 py-3 font-body text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-sage-deep"
                />

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || rating === 0 || body.trim().length < 4}
                    className="rounded-sm bg-sage-deep px-7 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Sending" : "Submit review"}
                  </button>
                  <p className="font-body text-xs text-ink-muted">
                    Reviews are checked before they appear.
                  </p>
                </div>
              </motion.div>
            )}

            {reviews.length > 0 ? (
              <ul className="divide-y divide-rule border-t border-rule">
                {reviews.map((review) => (
                  <li key={review.id} className="py-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars rating={review.rating} />
                      <span className="sr-only">{review.rating} out of 5</span>
                      {review.title && (
                        <span className="font-body text-sm font-medium text-foreground">
                          {review.title}
                        </span>
                      )}
                    </div>

                    {review.body && (
                      <p className="mt-2 max-w-[68ch] font-body text-sm leading-relaxed text-ink-muted">
                        {review.body}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-muted">
                      <span>{review.authorName}</span>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-sage-deep">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verified purchase
                        </span>
                      )}
                      <span>
                        {new Date(review.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {total > reviews.length && (
              <div className="mt-8">
                <Pager
                  page={page}
                  total={total}
                  busy={isLoading}
                  onChange={setPage}
                  noun="reviews"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

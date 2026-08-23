"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, MessageSquare, RefreshCcw, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { REVIEW_STATUS } from "@/components/admin/ui/StatusPill";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/admin/format";
import {
  getReviewsForModeration,
  setReviewStatus,
  type PendingReview,
} from "@/lib/reviews";
import Pager from "@/components/ui/Pager";
import { nudgeMailer } from "@/lib/admin/nudge";
import { getReviewCounts } from "@/lib/admin/summaries";

/**
 * Review moderation.
 *
 * Reviews arrive as `pending` and are invisible to shoppers until they are
 * approved here — without this screen the storefront's review form would be a
 * queue nobody could drain, and a customer's review would simply never appear.
 *
 * Approving goes through `set_review_status()`, a SECURITY DEFINER function
 * that checks `is_admin()`. The `status` column is deliberately not grantable
 * to `authenticated`, which is what stops a customer approving their own.
 *
 * Fifty a page, with the tab counts read from the database. The Published tab
 * is the one that needed it: it only ever grows, and it was fetched whole.
 *
 * The design pass added the thing the queue was missing: how long each review
 * has been waiting. A moderation backlog is measured in days, not in rows.
 */
const TABS = [
  { label: "Waiting", status: "pending" as const },
  { label: "Published", status: "approved" as const },
  { label: "Rejected", status: "rejected" as const },
];

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    // The counts used to come from the rows: a tab could only say how many
    // reviews were waiting once you were already looking at them.
    const [{ reviews: fetched, total: matched, page: landed, error }, { counts: tallies }] =
      await Promise.all([getReviewsForModeration(status, page), getReviewCounts()]);

    if (error) toast.error(error);
    setReviews(fetched);
    setTotal(matched);
    if (landed !== page) setPage(landed);
    setCounts(tallies);
    setIsLoading(false);
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const applyStatus = (next: typeof status) => {
    setStatus(next);
    setPage(1);
  };

  const decide = async (review: PendingReview, next: "approved" | "rejected") => {
    setBusyId(review.id);
    const { error } = await setReviewStatus(review.id, next);
    setBusyId(null);

    if (error) {
      toast.error(error);
      return;
    }

    // Only approving queues anything — rejecting is silent to the customer, so
    // there would be nothing for the nudge to send.
    if (next === "approved") nudgeMailer();
    toast.success(
      next === "approved"
        ? `Published — it is on ${review.productName} now.`
        : "Rejected. The customer is not told."
    );
    // The row leaves this tab, so the tallies move with it rather than waiting
    // for a refresh that may never come.
    setReviews((current) => current.filter((item) => item.id !== review.id));
    setTotal((current) => Math.max(0, current - 1));
    setCounts((current) => ({
      ...current,
      [status]: Math.max(0, (current[status] ?? 1) - 1),
      [next]: (current[next] ?? 0) + 1,
    }));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Waiting on you"
        title="Reviews"
        description="Nothing a customer writes reaches the shop until you approve it here."
        actions={
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => applyStatus(tab.status)}
            aria-pressed={status === tab.status}
            className={cn(
              "inline-flex items-center rounded-sm border px-3 py-1.5 font-body text-sm transition-colors",
              status === tab.status
                ? "border-sage-deep bg-sage-deep text-background"
                : "border-rule bg-card text-ink-muted hover:border-sage hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-2 font-body text-xs tabular-nums",
                status === tab.status ? "text-background" : "text-ink-muted"
              )}
            >
              {counts[tab.status] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={
            status === "pending"
              ? "Nothing waiting"
              : status === "approved"
                ? "No published reviews yet"
                : "Nothing rejected"
          }
          description={
            status === "pending"
              ? "Reviews land here as customers write them. Only people who have received the item can leave one."
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-sm border border-rule bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars rating={review.rating} />
                    {review.title && (
                      <span className="font-body text-sm font-medium text-foreground">
                        {review.title}
                      </span>
                    )}
                    <StatusPill status={review.status} map={REVIEW_STATUS} />
                  </div>

                  <p className="mt-3 max-w-[70ch] font-body text-sm leading-relaxed text-ink-muted">
                    {review.body}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-ink-muted">
                    <Link
                      href={`/product/${review.productSlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sage-deep hover:underline"
                    >
                      {review.productName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span title={formatDate(review.createdAt)}>
                      Written {formatRelative(review.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => decide(review, "approved")}
                      disabled={busyId === review.id}
                    >
                      {busyId === review.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Publish
                    </Button>
                  )}
                  {status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(review, "rejected")}
                      disabled={busyId === review.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviews.length > 0 && (
        <Pager page={page} total={total} busy={isLoading} onChange={setPage} noun="reviews" />
      )}
    </div>
  );
}

/**
 * Terracotta rather than sage: a rating is the one thing on this screen that is
 * an opinion, and the brand green is a surface colour. Filled count is also
 * given in text for anyone who cannot separate the two.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn("h-4 w-4", index < rating ? "text-terra" : "text-rule")}
            fill="currentColor"
          />
        ))}
      </span>
      <span className="font-body text-xs tabular-nums text-ink-muted">{rating}/5</span>
    </span>
  );
}

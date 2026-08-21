"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, RefreshCcw, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getReviewsForModeration,
  setReviewStatus,
  type PendingReview,
} from "@/lib/reviews";

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
 */
const TABS: { label: string; status: "pending" | "approved" | "rejected" }[] = [
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Rejected", status: "rejected" },
];

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { reviews: fetched, error } = await getReviewsForModeration(status);
    if (error) toast.error(error);
    setReviews(fetched);
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, next: "approved" | "rejected") => {
    setBusyId(id);
    const { error } = await setReviewStatus(id, next);
    setBusyId(null);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(next === "approved" ? "Review published." : "Review rejected.");
    setReviews((current) => current.filter((review) => review.id !== id));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <MessageSquare className="h-5 w-5" />
            Reviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews stay hidden from the storefront until they are approved here.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.status}
            variant={status === tab.status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(tab.status)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-md border border-dashed py-20 text-center text-sm text-muted-foreground">
          Nothing {status}.
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex" aria-label={`${review.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${
                            index < review.rating ? "text-terra" : "text-muted-foreground/30"
                          }`}
                          fill="currentColor"
                        />
                      ))}
                    </span>
                    {review.title && <span className="font-medium">{review.title}</span>}
                    <Badge variant="secondary">{review.status}</Badge>
                  </div>

                  <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
                    {review.body}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <Link
                      href={`/product/${review.productSlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {review.productName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => decide(review.id, "approved")}
                      disabled={busyId === review.id}
                    >
                      Approve
                    </Button>
                  )}
                  {status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(review.id, "rejected")}
                      disabled={busyId === review.id}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

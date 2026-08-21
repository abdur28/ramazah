"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface QueueCounts {
  /** Reviews waiting for a decision — invisible to shoppers until approved. */
  reviewsPending: number;
  /** Sourcing requests nobody has quoted yet. */
  requestsOpen: number;
  /**
   * Orders still needing work — not yet started, or being packed. `shipped` is
   * excluded: it is with the courier and off your desk.
   */
  ordersPending: number;
  /** Variants down to their last few units. */
  lowStock: number;
  /** Perishables whose expiry date is inside eight weeks. */
  expiringSoon: number;
}

const EMPTY: QueueCounts = {
  reviewsPending: 0,
  requestsOpen: 0,
  ordersPending: 0,
  lowStock: 0,
  expiringSoon: 0,
};

/**
 * The counts the sidebar badges show.
 *
 * Both of the admin's queues — review moderation and sourcing requests — are
 * invisible from anywhere else in the app. A customer's review sits unpublished
 * and a customer's request sits unanswered with nothing anywhere saying so, and
 * the only way to find out was to open the page and look. These counts put the
 * backlog on every screen.
 *
 * Counted with `head: true`, so these are `count(*)` queries and no rows cross
 * the wire.
 */
export default function useAdminQueues(pollMs = 60_000) {
  const [counts, setCounts] = useState<QueueCounts>(EMPTY);

  const load = useCallback(async () => {
    const supabase = createClient();

    // `create_order()` refuses a variant whose expiry has passed, so stock that
    // ages out is not just waste — it silently stops being sellable. Eight weeks
    // is enough notice to discount it.
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 56);

    const [reviews, requests, orders, stock, expiring] = await Promise.all([
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("product_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "asked"),
      // Counting only `pending` left the badge and the dashboard tile reading 0
      // while an order sat in `processing` waiting to be shipped — and disagreeing
      // with the orders page, which has always called both of these awaiting
      // fulfilment.
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing"]),
      supabase
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .gt("stock_count", 0)
        .lte("stock_count", 5),
      supabase
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .gt("stock_count", 0)
        .not("expiry_date", "is", null)
        .lte("expiry_date", horizon.toISOString().slice(0, 10)),
    ]);

    setCounts({
      reviewsPending: reviews.count ?? 0,
      requestsOpen: requests.count ?? 0,
      ordersPending: orders.count ?? 0,
      lowStock: stock.count ?? 0,
      expiringSoon: expiring.count ?? 0,
    });
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  return { counts, refresh: load };
}

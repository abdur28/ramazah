"use client";

import { Coins } from "lucide-react";
import SectionCard from "@/components/admin/ui/SectionCard";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/ui/StatusPill";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import type { OrderHistoryEntry } from "@/lib/orders";

/**
 * Everything that has happened to this order, and who did it.
 *
 * `order_status_history` has been written by a trigger since the first
 * migration. The customer-facing `OrderTimeline` reads it as a four-step ladder;
 * this is the raw record instead — including moves backwards, repeats and
 * cancellations, which a ladder cannot show and which are exactly what someone
 * looks for when an order has gone wrong.
 *
 * A row with no actor is the shop's own automation: `changed_by` takes
 * `auth.uid()`, which is null when the order was written by a background job or
 * seeded.
 *
 * Fulfilment and payment share the list rather than sitting in two panels. They
 * are one story — an order is packed *because* the transfer landed — and split
 * across two lists the reader has to interleave the timestamps themselves.
 */
export default function OrderHistory({ history }: { history: OrderHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <SectionCard title="History">
        <p className="font-body text-sm text-ink-muted">
          Nothing recorded yet. Every status change from here on is kept.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="History" flush>
      <ol className="divide-y divide-rule">
        {[...history].reverse().map((entry) => {
          const payment = entry.kind === "payment";
          const map = payment ? PAYMENT_STATUS : ORDER_STATUS;
          const definition = map[entry.toStatus];
          const Icon = payment ? Coins : definition?.icon;

          return (
            <li key={entry.id} className="flex gap-3 px-5 py-3.5">
              <span
                aria-hidden
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  payment ? "bg-sage/25 text-sage-deep" : "bg-wash/70 text-ink-muted"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-foreground">
                  {entry.fromStatus ? (
                    <>
                      {map[entry.fromStatus]?.label ?? entry.fromStatus}
                      <span className="px-1.5 text-ink-faint" aria-label="became">
                        &rarr;
                      </span>
                      {definition?.label ?? entry.toStatus}
                    </>
                  ) : payment ? (
                    <>Payment recorded as {definition?.label ?? entry.toStatus}</>
                  ) : (
                    <>Order placed as {definition?.label ?? entry.toStatus}</>
                  )}
                  {payment && (
                    <span className="ml-2 font-body text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      payment
                    </span>
                  )}
                </p>

                {entry.note && (
                  <p className="mt-1 max-w-[70ch] font-body text-sm text-ink-muted">
                    {entry.note}
                  </p>
                )}

                <p className="mt-1 font-body text-xs text-ink-faint">
                  <span className="tabular-nums">{formatDateTime(entry.at)}</span>
                  <span className="px-1.5">·</span>
                  {formatRelative(entry.at)}
                  <span className="px-1.5">·</span>
                  {entry.actorName ?? entry.actorEmail ?? "the shop"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

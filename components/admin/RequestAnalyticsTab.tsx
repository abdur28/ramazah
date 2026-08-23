"use client";

import { Check, Clock, ReceiptText, Search } from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import BarList from "@/components/admin/charts/BarList";
import EmptyState from "@/components/admin/ui/EmptyState";
import { REQUEST_STATUS } from "@/components/admin/ui/StatusPill";
import { formatMoney, formatNumber } from "@/lib/admin/format";
import type { RequestAnalytics } from "@/types/admin";

/**
 * The sourcing service, measured.
 *
 * "Tell us what you need and we'll do the rest" is what this business leads
 * with, and nothing anywhere counted it — the analytics screen had four tabs and
 * none of them knew requests existed.
 *
 * The number that matters is not how many were asked. It is how many turned into
 * something: a quote nobody answers is work done for nothing, and a request
 * nobody quotes is a customer being ignored. Both queues get a card, and both
 * say how long the oldest one has waited, because a pipeline is only healthy if
 * things leave it.
 *
 * The acceptance rate counts only quotes that got an answer either way. Counting
 * the ones still waiting as refusals would make the rate fall simply because a
 * quote went out this morning.
 */
export default function RequestAnalyticsTab({ data }: { data: RequestAnalytics }) {
  if (data.total === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No requests yet"
        description="When a customer asks you to source something, it lands in Requests and shows up here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Asked in total"
          value={formatNumber(data.total)}
          icon={Search}
        />
        <StatCard
          label="Waiting on you"
          value={formatNumber(data.awaitingQuote)}
          hint={data.awaitingQuote > 0 ? "not yet quoted" : "nothing unanswered"}
          tone={data.awaitingQuote > 0 ? "attention" : "default"}
          icon={Clock}
        />
        <StatCard
          label="Waiting on them"
          value={formatNumber(data.awaitingAnswer)}
          hint={
            data.quotedValue > 0
              ? `${formatMoney(data.quotedValue, "ngn")} quoted`
              : "no open quotes"
          }
          icon={ReceiptText}
        />
        <StatCard
          label="Quotes accepted"
          value={`${data.acceptanceRate.toFixed(0)}%`}
          hint={
            data.acceptedValue > 0
              ? `${formatMoney(data.acceptedValue, "ngn")} agreed`
              : "of the ones answered"
          }
          icon={Check}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Where they sit">
          <BarList
            data={data.byStatus.map((row) => ({
              name: REQUEST_STATUS[row.status]?.label ?? row.status,
              value: row.count,
              display: formatNumber(row.count),
            }))}
            emptyMessage="Nothing to show yet."
          />
        </SectionCard>

        <SectionCard title="How long the queue has been waiting">
          {data.oldestOpenDays === null ? (
            <p className="font-body text-sm text-ink-muted">
              Nothing is open. Every request has been fulfilled, declined or withdrawn.
            </p>
          ) : (
            <>
              <p className="font-body text-3xl font-medium tabular-nums leading-none text-foreground">
                {data.oldestOpenDays}
                <span className="ml-1.5 font-body text-base font-normal text-ink-muted">
                  {data.oldestOpenDays === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="mt-3 max-w-[52ch] font-body text-sm leading-relaxed text-ink-muted">
                The oldest request still open — asked, quoted or accepted but not yet bought.
                Deliveries run in weeks here, so the clock a customer feels starts at the
                question, not at the parcel.
              </p>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

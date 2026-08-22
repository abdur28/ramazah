"use client";

import { AlertTriangle, Check, Coins, Hourglass } from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import DonutChart from "@/components/admin/charts/DonutChart";
import { formatMoney, formatMoneyByCurrency, formatNumber } from "@/lib/admin/format";
import type { TransactionAnalytics } from "@/types/admin";

/**
 * Payments, in aggregate.
 *
 * Every figure on this tab used to come from `generateMockTransactions()` — a
 * hundred random rows in USD and RUB, regenerated on each mount. It reads the
 * orders now; see `lib/admin/payments.ts`.
 *
 * "Revenue" here means settled money. The old version summed all transactions
 * regardless of status, so pending and failed payments counted as income.
 */
export default function TransactionsAnalyticsTab({ data }: { data: TransactionAnalytics }) {
  const primary = data.revenues[0];
  const settleRate =
    data.totalTransactions > 0 ? (data.successfulTransactions / data.totalTransactions) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Settled"
          value={formatMoneyByCurrency(
            data.revenues.map((r) => ({ currency: r.currency, amount: r.totalRevenue })),
            true
          )}
          hint={`${formatNumber(data.successfulTransactions)} payments received`}
          icon={Coins}
        />
        <StatCard
          label="Settle rate"
          value={`${settleRate.toFixed(0)}%`}
          hint={`of ${formatNumber(data.totalTransactions)} orders raised`}
          icon={Check}
        />
        <StatCard
          label="Awaiting payment"
          value={formatNumber(data.pendingTransactions)}
          hint="not yet paid for"
          tone={data.pendingTransactions > 0 ? "attention" : "default"}
          icon={Hourglass}
        />
        <StatCard
          label="Failed or refunded"
          value={formatNumber(data.failedTransactions + data.refundedTransactions)}
          hint={`${data.failedTransactions} failed · ${data.refundedTransactions} refunded`}
          tone={data.failedTransactions > 0 ? "attention" : "default"}
          icon={AlertTriangle}
        />
      </div>

      {/* This used to sit beside a "How customers pay" breakdown. Every order
          settles by transfer against the invoice, so that chart had one bar. */}
      <SectionCard title="Payment outcomes">
        <DonutChart
          data={[
            { name: "Settled", value: data.successfulTransactions },
            { name: "Awaiting", value: data.pendingTransactions },
            { name: "Failed", value: data.failedTransactions },
            { name: "Refunded", value: data.refundedTransactions },
          ]}
          total={data.totalTransactions}
          totalLabel="Payments"
        />
      </SectionCard>

      <SectionCard title="Recent activity">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Today", count: data.transactionsToday, key: "revenueToday" as const },
            { label: "This week", count: data.transactionsThisWeek, key: "revenueThisWeek" as const },
            { label: "This month", count: data.transactionsThisMonth, key: "revenueThisMonth" as const },
          ].map((period) => (
            <div key={period.label} className="rounded-sm border border-rule p-4">
              <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                {period.label}
              </dt>
              <dd className="mt-2 font-body text-2xl font-medium tabular-nums leading-none text-foreground">
                {formatNumber(period.count)}
                <span className="ml-1.5 text-sm font-normal text-ink-muted">
                  {period.count === 1 ? "payment" : "payments"}
                </span>
              </dd>
              <dd className="mt-2 font-body text-sm tabular-nums text-ink-muted">
                {formatMoneyByCurrency(
                  data.revenues.map((r) => ({ currency: r.currency, amount: r[period.key] }))
                )}{" "}
                settled
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {primary && (
        <SectionCard title="Average payment">
          <p className="font-body text-2xl font-medium tabular-nums text-foreground">
            {formatMoney(primary.averageOrderValue, primary.currency)}
          </p>
          <p className="mt-1 font-body text-sm text-ink-muted">
            What a settled order is worth on average.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

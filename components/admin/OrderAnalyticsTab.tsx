"use client";

import { Coins, MessageCircle, Package, ShoppingBag, Store, TrendingUp } from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import BarList from "@/components/admin/charts/BarList";
import DonutChart from "@/components/admin/charts/DonutChart";
import StatusPill, { ORDER_STATUS } from "@/components/admin/ui/StatusPill";
import { formatMoney, formatMoneyByCurrency, formatNumber } from "@/lib/admin/format";
import type { OrderAnalytics } from "@/types/admin";

/**
 * Orders, in aggregate.
 *
 * The previous version printed total revenue in four separate panels and
 * revenue-by-currency in three, at roughly 600 lines. Every one of them
 * formatted money through a symbol table with no Naira entry, so the shop's own
 * currency rendered as `NGN410005.00`. This says each thing once.
 */
/** Reads the way the shopkeeper would say it, not the way it is stored. */
const CHANNEL: Record<string, string> = {
  web: "The website",
  whatsapp: "WhatsApp",
  phone: "Phone call",
  in_store: "In the shop",
};

export default function OrderAnalyticsTab({ data }: { data: OrderAnalytics }) {
  const primary = data.revenues[0];
  const currency = primary?.currency ?? "ngn";

  const periods = [
    { label: "Today", orders: data.ordersToday, key: "revenueToday" as const },
    { label: "This week", orders: data.ordersThisWeek, key: "revenueThisWeek" as const },
    { label: "This month", orders: data.ordersThisMonth, key: "revenueThisMonth" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={formatNumber(data.totalOrders)}
          trend={data.orderGrowthRate}
          hint="vs last month"
          icon={ShoppingBag}
        />
        <StatCard
          label="Revenue"
          value={formatMoneyByCurrency(
            data.revenues.map((r) => ({ currency: r.currency, amount: r.totalRevenue })),
            true
          )}
          trend={data.revenueGrowthRate}
          hint="vs last month"
          icon={Coins}
        />
        <StatCard
          label="Average order"
          value={formatMoney(primary?.averageOrderValue ?? 0, currency)}
          hint="what a typical basket is worth"
          icon={TrendingUp}
        />
        <StatCard
          label="Delivered"
          value={formatNumber(data.deliveredOrders)}
          hint={
            data.totalOrders > 0
              ? `${((data.deliveredOrders / data.totalOrders) * 100).toFixed(0)}% of all orders`
              : undefined
          }
          icon={Package}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Where orders sit">
          <DonutChart
            data={data.ordersByStatus
              .filter((row) => row.count > 0)
              .map((row) => ({
                name: ORDER_STATUS[row.status]?.label ?? row.status,
                value: row.count,
              }))}
            total={data.totalOrders}
            totalLabel="Orders"
          />
        </SectionCard>

        <SectionCard title="Value held at each stage" flush>
          <ul className="divide-y divide-rule">
            {data.ordersByStatus
              .filter((row) => row.count > 0)
              .map((row) => (
                <li
                  key={row.status}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <StatusPill status={row.status} map={ORDER_STATUS} />
                  <span className="font-body text-xs tabular-nums text-ink-muted">
                    {formatNumber(row.count)} {row.count === 1 ? "order" : "orders"}
                  </span>
                  <span className="ml-auto font-body text-sm font-medium tabular-nums text-foreground">
                    {formatMoneyByCurrency(row.revenues)}
                  </span>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>

      {/*
        Whether the numbers above describe the business or only the part of it
        with a checkout. Website orders were the only kind that could exist until
        staff could raise one, and most of this shop's selling is WhatsApp.
      */}
      {data.ordersByChannel.length > 1 && (
        <SectionCard
          title="Where orders come from"
          description="Revenue counts settled money only, as it does everywhere on this screen."
        >
          <BarList
            data={data.ordersByChannel.map((row) => ({
              name: CHANNEL[row.channel] ?? row.channel,
              value: row.count,
              display: `${formatNumber(row.count)}`,
              meta:
                row.revenues.length > 0
                  ? formatMoneyByCurrency(row.revenues, true)
                  : "nothing settled yet",
            }))}
            emptyMessage="No orders yet."
          />
        </SectionCard>
      )}

      <SectionCard title="Recent activity">
        <dl className="grid gap-4 sm:grid-cols-3">
          {periods.map((period) => (
            <div key={period.label} className="rounded-sm border border-rule p-4">
              <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                {period.label}
              </dt>
              <dd className="mt-2 font-body text-2xl font-medium tabular-nums leading-none text-foreground">
                {formatNumber(period.orders)}
                <span className="ml-1.5 text-sm font-normal text-ink-muted">
                  {period.orders === 1 ? "order" : "orders"}
                </span>
              </dd>
              <dd className="mt-2 font-body text-sm tabular-nums text-ink-muted">
                {formatMoneyByCurrency(
                  data.revenues.map((r) => ({ currency: r.currency, amount: r[period.key] }))
                )}
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {data.revenues.length > 1 && (
        <SectionCard title="By currency" flush>
          <ul className="divide-y divide-rule">
            {data.revenues.map((revenue) => (
              <li
                key={revenue.currency}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <span className="font-body text-sm text-foreground">
                  {revenue.currency.toUpperCase()}
                </span>
                <span className="font-body text-xs text-ink-muted">
                  average {formatMoney(revenue.averageOrderValue, revenue.currency)}
                </span>
                <span className="ml-auto font-body text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(revenue.totalRevenue, revenue.currency)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

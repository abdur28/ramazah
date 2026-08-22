"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Coins,
  Loader2,
  MessageSquare,
  Package,
  PackageX,
  RefreshCcw,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { ORDER_STATUS } from "@/components/admin/ui/StatusPill";
import DonutChart from "@/components/admin/charts/DonutChart";
import BarList from "@/components/admin/charts/BarList";
import TrendChart, { type TrendPoint } from "@/components/admin/charts/TrendChart";
import useAdmin from "@/hooks/admin/useAdmin";
import useAdminQueues from "@/hooks/admin/useAdminQueues";
import { getPayments } from "@/lib/admin/payments";
import {
  formatDate,
  formatMoney,
  formatMoneyByCurrency,
  formatMoneyCompact,
  formatNumber,
} from "@/lib/admin/format";
import type { Order } from "@/types/types";
import type { Transaction } from "@/types/admin";
import { describeError } from "@/lib/admin/errors";

/**
 * The dashboard.
 *
 * Reordered around a question the old one did not answer: *what needs me
 * today?* It opened on four totals — customers, products, orders, revenue —
 * which are the numbers you check once a week, while the two queues that
 * silently accumulate (unapproved reviews, unquoted sourcing requests) appeared
 * nowhere at all. Work first, totals second, trend third.
 *
 * Every figure on this page now comes from the database. Revenue is settled
 * money only, in Naira, with a symbol.
 */
export default function AdminDashboardPage() {
  const { analytics, orders, loading, error, fetchAnalytics, fetchOrders } = useAdmin();
  const { counts, refresh: refreshQueues } = useAdminQueues();
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [, , { payments: fetched, error: paymentsError }] = await Promise.all([
        fetchAnalytics(),
        fetchOrders({ limit: 10, orderByField: "createdAt", orderDirection: "desc" }),
        getPayments(),
      ]);
      if (paymentsError) throw new Error(paymentsError);
      setPayments(fetched);
      refreshQueues();
    } catch (err) {
      console.error("Error loading dashboard:", err);
      toast.error(describeError(err, "Could not load the dashboard. Try refreshing."));
    } finally {
      setRefreshing(false);
    }
  }, [fetchAnalytics, fetchOrders, refreshQueues]);

  useEffect(() => {
    load();
  }, [load]);

  /** Settled revenue by month, oldest first — the real series, not two points. */
  const revenueTrend = useMemo<TrendPoint[]>(() => buildMonthlySeries(payments), [payments]);

  const recentOrders = orders?.slice(0, 6) ?? [];

  if (loading.analytics && !analytics) {
    return <DashboardSkeleton />;
  }

  if (error.analytics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your shop at a glance." />
        <EmptyState
          icon={AlertTriangle}
          title="Could not load the dashboard"
          description={error.analytics}
          action={
            <Button onClick={load} disabled={refreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!analytics) return null;

  const revenues = analytics.orders.revenues ?? [];
  const settled = payments.filter((payment) => payment.status === "success");
  const settledTotal = settled.reduce((sum, payment) => sum + payment.amount, 0);
  const awaitingPayment = payments.filter((payment) => payment.status === "pending");
  const awaitingTotal = awaitingPayment.reduce((sum, payment) => sum + payment.amount, 0);

  // `analytics.orders.revenueGrowthRate` is computed across every order whatever
  // its payment state, so pinning it under a figure labelled "Revenue settled"
  // would have the badge measuring one thing and the number another.
  const settledGrowth = growthOf(settled);

  const queue = [
    {
      label: "Orders to fulfil",
      count: counts.ordersPending,
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      label: "Requests to quote",
      count: counts.requestsOpen,
      href: "/admin/requests",
      icon: Search,
    },
    {
      label: "Reviews to approve",
      count: counts.reviewsPending,
      href: "/admin/reviews",
      icon: MessageSquare,
    },
    {
      label: "Low stock",
      count: counts.lowStock,
      href: "/admin/products",
      icon: PackageX,
    },
    {
      label: "Expiring soon",
      count: counts.expiringSoon,
      href: "/admin/products",
      icon: CalendarClock,
    },
  ];

  const needsAttention = queue.filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ramazah"
        title="Dashboard"
        description="Everything moving through the shop, and everything waiting on you."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Package className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------- waiting on you */}
      <SectionCard
        title="Waiting on you"
        description={
          needsAttention.length === 0
            ? "Nothing is queued. Reviews and sourcing requests appear here as they arrive."
            : undefined
        }
      >
        {needsAttention.length === 0 ? (
          <p className="font-body text-sm text-ink-muted">
            All clear — the queues are empty.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {needsAttention.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-sm border border-terra/30 bg-terra/[0.04] px-4 py-3 transition-colors hover:border-terra/60"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-terra" />
                    <span className="font-body text-2xl font-medium tabular-nums leading-none text-foreground">
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-body text-sm text-ink-muted">
                      {item.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* ------------------------------------------------------------ totals */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue settled"
          value={formatMoneyCompact(settledTotal, revenues[0]?.currency ?? "ngn")}
          hint={`across ${formatNumber(settled.length)} paid orders`}
          trend={settledGrowth}
          icon={Coins}
          href="/admin/transactions"
        />
        <StatCard
          label="Awaiting payment"
          value={formatMoneyCompact(awaitingTotal, revenues[0]?.currency ?? "ngn")}
          hint={`${formatNumber(awaitingPayment.length)} orders not yet paid`}
          icon={AlertTriangle}
          href="/admin/transactions"
          tone={awaitingPayment.length > 0 ? "attention" : "default"}
        />
        <StatCard
          label="Orders"
          value={formatNumber(analytics.orders.totalOrders)}
          hint={`${analytics.orders.ordersThisMonth} this month`}
          trend={analytics.orders.orderGrowthRate}
          icon={ShoppingBag}
          href="/admin/orders"
        />
        <StatCard
          label="Customers"
          value={formatNumber(analytics.customers.totalCustomers)}
          hint={`${analytics.customers.newCustomersThisMonth} new this month`}
          trend={analytics.customers.customerGrowthRate}
          icon={Users}
          href="/admin/customers"
        />
      </div>

      {/* ------------------------------------------------- trend and orders */}
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <SectionCard
          title="Settled revenue by month"
          description={
            revenues.length > 1
              ? `Totals across ${revenues.length} currencies: ${formatMoneyByCurrency(
                  revenues.map((r) => ({ currency: r.currency, amount: r.totalRevenue })),
                  true
                )}`
              : undefined
          }
        >
          <TrendChart
            data={revenueTrend}
            valueFormatter={(value) => formatMoney(value, revenues[0]?.currency ?? "ngn")}
          />
        </SectionCard>

        <SectionCard
          title="Latest orders"
          action={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 font-body text-xs text-sage-deep hover:underline"
            >
              All orders
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
          flush
        >
          {recentOrders.length === 0 ? (
            <p className="px-5 py-10 text-center font-body text-sm text-ink-muted">
              No orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {recentOrders.map((order: Order) => (
                <li key={order.id}>
                  {/* Carries the order number through as a search term, so the
                      row lands on that order rather than on an unfiltered list. */}
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-wash"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-sm text-foreground">
                        {order.customerName}
                      </span>
                      <span className="block truncate font-body text-xs tabular-nums text-ink-muted">
                        {order.orderNumber} · {formatDate(order.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-body text-sm font-medium tabular-nums text-foreground">
                        {formatMoney(order.total, order.currency)}
                      </span>
                    </span>
                    <StatusPill status={order.status} map={ORDER_STATUS} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* --------------------------------------------- products and stock */}
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Best sellers"
          action={
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 font-body text-xs text-sage-deep hover:underline"
            >
              Catalogue
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <BarList
            data={analytics.products.topSellingProducts.slice(0, 6).map((product) => ({
              name: product.name,
              value: product.salesCount,
              display: `${formatNumber(product.salesCount)} sold`,
              meta: `${formatNumber(product.viewCount)} views`,
              href: `/admin/products/${product.id}`,
            }))}
            emptyMessage="No sales recorded yet."
          />
        </SectionCard>

        <SectionCard title="Stock health">
          <DonutChart
            data={[
              { name: "In stock", value: analytics.products.inStockProducts },
              { name: "Low stock", value: analytics.products.lowStockProducts },
              { name: "Out of stock", value: analytics.products.outOfStockProducts },
            ]}
            total={analytics.products.totalProducts}
            totalLabel="Products"
          />
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * Settled payments bucketed by calendar month, over the last twelve.
 *
 * A month in the middle of the series with no revenue plots as zero: that is a
 * quiet month, and closing the line over it would hide a real dip. But months
 * *before the first payment ever taken* are trimmed, because they are not quiet
 * months — the shop did not exist. Padding them to zero drew ten months of flat
 * line and made the first real month look like a spike out of a dead business.
 */
function buildMonthlySeries(payments: Transaction[]): TrendPoint[] {
  const settled = payments.filter((payment) => payment.status === "success");
  if (settled.length === 0) return [];

  const buckets = new Map<string, number>();
  const now = new Date();

  for (let index = 11; index >= 0; index -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.set(keyOf(month), 0);
  }

  settled.forEach((payment) => {
    const key = keyOf(payment.date);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + payment.amount);
    }
  });

  const series = Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: new Date(year, month).toLocaleDateString("en-NG", { month: "short" }),
      value,
    };
  });

  const firstWithRevenue = series.findIndex((point) => point.value > 0);
  return firstWithRevenue <= 0 ? series : series.slice(firstWithRevenue);
}

const keyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

/**
 * This month against last, in percent. Returns null rather than 0 when there is
 * no previous month to compare against — a first month of trading is not flat
 * growth, and a `+0.0%` badge under it would be a claim nobody can make yet.
 */
function growthOf(payments: Transaction[]): number | null {
  const now = new Date();
  const thisMonth = keyOf(now);
  const lastMonth = keyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  let current = 0;
  let previous = 0;

  payments.forEach((payment) => {
    const key = keyOf(payment.date);
    if (key === thisMonth) current += payment.amount;
    else if (key === lastMonth) previous += payment.amount;
  });

  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="border-b border-rule pb-6">
        <div className="h-3 w-16 animate-pulse rounded-sm bg-wash" />
        <div className="mt-3 h-9 w-52 animate-pulse rounded-sm bg-wash" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-sm border border-rule bg-card p-5">
            <div className="h-3 w-20 animate-pulse rounded-sm bg-wash" />
            <div className="mt-4 h-7 w-24 animate-pulse rounded-sm bg-wash" />
            <div className="mt-3 h-3 w-28 animate-pulse rounded-sm bg-wash" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-16 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your shop…
      </div>
    </div>
  );
}

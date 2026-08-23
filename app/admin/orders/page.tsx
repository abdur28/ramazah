"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Search,
  ChevronRight,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/ui/StatusPill";
import Pager from "@/components/ui/Pager";
import useAdmin from "@/hooks/admin/useAdmin";
import useDebounced from "@/hooks/useDebounced";
import { getOrderSummary, type OrderSummary } from "@/lib/admin/summaries";
import { formatDateTime, formatMoney, formatNumber, formatRelative } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/types";

/**
 * Orders.
 *
 * Rebuilt around fulfilment rather than around a table. The status filter is a
 * row of counted chips instead of a dropdown, because "how many are waiting to
 * be packed" is the question this screen exists to answer and it should not
 * take a click to see it.
 *
 * Money is formatted, not concatenated: totals read `NGN 410005.00` before,
 * because the page printed `currency.toUpperCase()` next to `toFixed(2)`.
 *
 * Orders raised by staff for someone with no account sit here alongside the
 * website's own — same list, same numbering, same invoice. They carry a channel
 * chip so it is obvious which is which.
 *
 * Fifty a page, filtered and searched in the database. The chips and the four
 * cards above them are counted there too — they used to be tallies over the
 * hundred orders the screen happened to have loaded, which meant the hundred
 * and first order was not merely off the end of the list but missing from the
 * count of how many orders there were.
 *
 * The whole row opens the order — at `/admin/orders/[id]`, a page rather than a
 * dialog. A dialog could not carry the audit history, the staff notes or the
 * invoice, and could not be linked to whoever is packing the parcel.
 */
const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

/** How an order reached the shop, for the chip on staff-raised rows. */
const CHANNEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Phone",
  in_store: "In shop",
};

export default function AdminOrdersPage() {
  const { fetchOrders, orders, loading, error, pagination } = useAdmin();
  const searchParams = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  // The dashboard's latest-order rows link here with the order number attached,
  // so following one lands on that order rather than on an unfiltered list.
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  // Bumped by Refresh. The rows reload on their own whenever a filter or the
  // page changes; the summary has no reason to, so it needs a signal.
  const [reloadKey, setReloadKey] = useState(0);

  // Typing now costs a request, so the query settles before it is sent.
  const search = useDebounced(searchQuery);

  const load = useCallback(async () => {
    const filters = [];
    if (statusFilter !== "all") filters.push({ field: "status", value: statusFilter });
    if (paymentFilter !== "all") filters.push({ field: "paymentStatus", value: paymentFilter });

    try {
      await fetchOrders({ page, search, filters, orderByField: "createdAt", orderDirection: "desc" });
    } catch {
      toast.error("Could not load orders. Check your connection and try again.");
    }
  }, [fetchOrders, page, search, statusFilter, paymentFilter, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The summary counts every order in the shop, so it does not change when you
   * turn a page or narrow a filter — and it is a full scan, which is exactly
   * the query you do not want to repeat on every click of the pager.
   */
  useEffect(() => {
    getOrderSummary().then(({ summary: totals, error: summaryError }) => {
      if (summaryError) {
        toast.error("Could not work out the order totals.");
        return;
      }
      setSummary(totals);
    });
  }, [reloadKey]);

  /**
   * The store is the authority on which page is actually showing. Asking for a
   * page that no longer exists falls back to the first one, and the local state
   * has to follow or the next refresh asks for the missing page all over again.
   */
  useEffect(() => {
    if (pagination.orders.page !== page) setPage(pagination.orders.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.orders.page]);

  const refresh = async () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
    await load();
    setRefreshing(false);
  };

  /**
   * Every filter change goes back to page one, in the same click that changes
   * it. An effect watching the filters would fire a fetch for the old page
   * first and the new one immediately after — two requests, and a flash of the
   * wrong rows between them.
   */
  const applyStatus = (value: OrderStatus | "all") => {
    setStatusFilter(value);
    setPage(1);
  };
  const applyPayment = (value: string) => {
    setPaymentFilter(value);
    setPage(1);
  };
  const applySearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const counts: Record<string, number> = {
    all: summary?.total ?? 0,
    pending: summary?.pending ?? 0,
    processing: summary?.processing ?? 0,
    shipped: summary?.shipped ?? 0,
    delivered: summary?.delivered ?? 0,
    cancelled: summary?.cancelled ?? 0,
    refunded: summary?.refunded ?? 0,
  };

  const hasFilters = statusFilter !== "all" || paymentFilter !== "all" || Boolean(searchQuery);

  const clearFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Selling"
        title="Orders"
        description="Every order placed, and where each one has got to."
        actions={
          <>
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {/* Most of this shop's selling happens on WhatsApp. Until this
                existed, none of it was in the database. */}
            <Button asChild>
              <Link href="/admin/orders/new">
                <Plus className="mr-2 h-4 w-4" />
                New order
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={formatNumber(summary?.total ?? 0)} icon={ShoppingBag} />
        <StatCard
          label="Awaiting fulfilment"
          value={formatNumber(summary?.awaitingFulfilment ?? 0)}
          hint="pending or being packed"
          tone={(summary?.awaitingFulfilment ?? 0) > 0 ? "attention" : "default"}
          icon={Truck}
        />
        <StatCard
          label="Unpaid"
          value={formatMoney(summary?.unpaidTotal ?? 0, summary?.currency)}
          hint={`${formatNumber(summary?.unpaidCount ?? 0)} orders`}
          tone={(summary?.unpaidCount ?? 0) > 0 ? "attention" : "default"}
        />
        <StatCard
          label="Settled"
          value={formatMoney(summary?.settledTotal ?? 0, summary?.currency)}
          hint="money received"
        />
      </div>

      {/* Counted chips: the filter and the breakdown in one control. */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.value] ?? 0;
          const active = statusFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => applyStatus(tab.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-body text-sm transition-colors",
                active
                  ? "border-sage-deep bg-sage-deep text-background"
                  : "border-rule bg-card text-ink-muted hover:border-sage hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "font-body text-xs tabular-nums",
                  active ? "text-background" : "text-ink-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Search by order number, name, email or phone…"
            value={searchQuery}
            onChange={(event) => applySearch(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={paymentFilter} onValueChange={applyPayment}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Any payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any payment</SelectItem>
            <SelectItem value="pending">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            title="Clear filters"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error.orders ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load orders"
          description={error.orders}
          action={
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : loading.orders && orders.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={hasFilters ? "No orders match those filters" : "No orders yet"}
          description={
            hasFilters
              ? "Try a different status, or clear the filters to see everything."
              : "Orders placed on the shop land here the moment they are created."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-rule bg-card">
          <div className="hidden border-b border-rule bg-wash/60 px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] lg:gap-4">
            <span>Customer</span>
            <span>Placed</span>
            <span className="text-right">Total</span>
            <span>Status</span>
            <span>Payment</span>
          </div>

          <ul className="divide-y divide-rule">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="group grid w-full grid-cols-1 gap-3 px-4 py-3 text-left transition-colors hover:bg-wash/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sage-deep lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-4"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-body text-sm text-foreground">
                        {order.customerName}
                      </span>
                      {order.channel && order.channel !== "web" && (
                        <span
                          className="inline-flex shrink-0 items-center rounded-sm bg-sage/25 px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-sage-deep"
                          title="Raised by staff, not placed on the website"
                        >
                          {CHANNEL[order.channel] ?? order.channel}
                        </span>
                      )}
                      {order.deliveryType === "inStore" && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-wash/60 px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-ink-muted"
                          title="Collected in store"
                        >
                          <Store className="h-3 w-3" />
                          Pickup
                        </span>
                      )}
                    </span>
                    <span className="block truncate font-body text-xs tabular-nums text-ink-muted">
                      {order.orderNumber} · {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </span>
                  </span>

                  <span className="font-body text-sm text-ink-muted">
                    <span className="block tabular-nums">{formatDateTime(order.createdAt)}</span>
                    <span className="block text-xs text-ink-muted">
                      {formatRelative(order.createdAt)}
                    </span>
                  </span>

                  <span className="font-body text-sm font-medium tabular-nums text-foreground lg:text-right">
                    {formatMoney(order.total, order.currency)}
                  </span>

                  <span>
                    <StatusPill status={order.status} map={ORDER_STATUS} />
                  </span>

                  <span className="flex items-center justify-between gap-2">
                    <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 lg:block" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {orders.length > 0 && (
        <Pager
          page={pagination.orders.page}
          total={pagination.orders.total}
          busy={loading.orders}
          onChange={setPage}
          noun="orders"
        />
      )}
    </div>
  );
}

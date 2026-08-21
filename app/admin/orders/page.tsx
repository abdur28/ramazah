"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Search,
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
import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";
import useAdmin from "@/hooks/admin/useAdmin";
import { formatDateTime, formatMoney, formatNumber, formatRelative } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/types";

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
 * The whole row opens the order. Reaching the only action on the screen used to
 * mean opening a dropdown and choosing its single item.
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

export default function AdminOrdersPage() {
  const { fetchOrders, orders, loading, error, resetOrders } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setRefreshing(true);
    resetOrders();
    try {
      await fetchOrders({ limit: 100, orderByField: "createdAt", orderDirection: "desc" });
    } catch {
      toast.error("Could not load orders.");
    } finally {
      setRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    orders.forEach((order) => {
      result[order.status] = (result[order.status] ?? 0) + 1;
    });
    return result;
  }, [orders]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) return false;

      if (query) {
        const haystack =
          `${order.orderNumber} ${order.customerName} ${order.customerEmail} ${order.customerPhone ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const awaitingFulfilment = orders.filter(
    (order) => order.status === "pending" || order.status === "processing"
  ).length;
  const unpaid = orders.filter((order) => order.paymentStatus === "pending");
  const unpaidTotal = unpaid.reduce((sum, order) => sum + order.total, 0);
  const settledTotal = orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.total, 0);

  const hasFilters = statusFilter !== "all" || paymentFilter !== "all" || Boolean(searchQuery);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Selling"
        title="Orders"
        description="Every order placed, and where each one has got to."
        actions={
          <Button variant="outline" onClick={loadOrders} disabled={refreshing}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={formatNumber(orders.length)} icon={ShoppingBag} />
        <StatCard
          label="Awaiting fulfilment"
          value={formatNumber(awaitingFulfilment)}
          hint="pending or being packed"
          tone={awaitingFulfilment > 0 ? "attention" : "default"}
          icon={Truck}
        />
        <StatCard
          label="Unpaid"
          value={formatMoney(unpaidTotal, orders[0]?.currency)}
          hint={`${formatNumber(unpaid.length)} orders`}
          tone={unpaid.length > 0 ? "attention" : "default"}
        />
        <StatCard
          label="Settled"
          value={formatMoney(settledTotal, orders[0]?.currency)}
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
              onClick={() => setStatusFilter(tab.value)}
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
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
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
            onClick={() => {
              setStatusFilter("all");
              setPaymentFilter("all");
              setSearchQuery("");
            }}
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
            <Button variant="outline" onClick={loadOrders}>
              Try again
            </Button>
          }
        />
      ) : loading.orders && orders.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders…
        </div>
      ) : filtered.length === 0 ? (
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
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setPaymentFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-rule bg-card">
          <div className="hidden border-b border-rule bg-wash/60 px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-4">
            <span>Customer</span>
            <span>Placed</span>
            <span className="text-right">Total</span>
            <span>Status</span>
            <span>Payment</span>
          </div>

          <ul className="divide-y divide-rule">
            {filtered.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => openOrder(order)}
                  className="grid w-full grid-cols-1 gap-3 px-4 py-3 text-left transition-colors hover:bg-wash/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sage-deep lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-4"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-body text-sm text-foreground">
                        {order.customerName}
                      </span>
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

                  <span>
                    <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <OrderDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} order={selectedOrder} />
    </div>
  );
}

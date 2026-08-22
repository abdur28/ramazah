"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  ExternalLink,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCcw,
  Store,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/ui/StatusPill";
import OrderFulfilment from "@/components/admin/order/OrderFulfilment";
import OrderPayment from "@/components/admin/order/OrderPayment";
import OrderHistory from "@/components/admin/order/OrderHistory";
import OrderNotes from "@/components/admin/order/OrderNotes";
import useAdmin from "@/hooks/admin/useAdmin";
import {
  getOrderHistory, getOrderNotes,
  type OrderHistoryEntry, type OrderNote,
} from "@/lib/orders";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/admin/format";
import type { Order } from "@/types/types";

/**
 * One order, in full.
 *
 * This was a dialog. Three things it could not carry, all of which matter more
 * than the space it saved: the audit history, a thread of staff notes, and a
 * link to the invoice. A dialog is also nowhere — it cannot be sent to whoever
 * is packing the parcel, and it loses everything on a refresh.
 *
 * The dialog also read `order.shippingAddress` from a list mapper that never set
 * it, so every delivery order in the admin claimed "No address recorded" while
 * the address sat in the row. That mapper is gone; both paths use `mapOrder`.
 */
export default function AdminOrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { getOrderById } = useAdmin();

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [found, historyResult, notesResult] = await Promise.all([
        getOrderById(orderId),
        getOrderHistory(orderId),
        getOrderNotes(orderId),
      ]);

      if (!found) {
        setError("This order does not exist, or it has been deleted.");
        return;
      }

      setOrder(found);
      setHistory(historyResult.history);
      setNotes(notesResult.notes);
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Could not load this order.");
    } finally {
      setLoading(false);
    }
  }, [orderId, getOrderById]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not open this order"
        description={error ?? undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Link>
          </Button>
        }
      />
    );
  }

  const collection = order.deliveryType === "inStore";
  // The business runs on WhatsApp, so the phone number is a chat link first and
  // a dial link second. Digits only, with the Nigerian country code assumed for
  // a local 0-prefixed number, which is how they are stored.
  const whatsapp = order.customerPhone
    ? order.customerPhone.replace(/\D/g, "").replace(/^0/, "234")
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All orders
        </Link>

        <PageHeader
          eyebrow="Selling"
          title={order.orderNumber}
          description={`Placed ${formatDateTime(order.createdAt)} · ${formatRelative(order.createdAt)} · ${formatMoney(order.total, order.currency)}`}
          actions={
            <>
              <Button variant="outline" onClick={load}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {/* The slip goes in the box, the invoice goes to the customer —
                  two documents, so two buttons rather than one menu. */}
              <Button variant="outline" asChild>
                <Link href={`/admin/orders/${order.id}/packing-slip`}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Packing slip
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/admin/orders/${order.id}/invoice`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Invoice
                </Link>
              </Button>
            </>
          }
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} map={ORDER_STATUS} />
          <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
          {collection && (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-wash/60 px-2 py-1 font-body text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              <Store className="h-3 w-3" />
              Collected in store
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------------------ main */}
        <div className="space-y-6">
          <SectionCard
            title={`${order.items.length} ${order.items.length === 1 ? "item" : "items"}`}
            flush
          >
            <ul className="divide-y divide-rule">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-wash">
                    {/* An empty src resolves against the current URL and makes
                        the browser re-download the admin page as an image. */}
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-ink-faint" />
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    {item.productId ? (
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="block truncate font-body text-sm text-foreground transition-colors hover:text-sage-deep"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="block truncate font-body text-sm text-foreground">
                        {item.name}
                      </span>
                    )}
                    <span className="block truncate font-body text-xs tabular-nums text-ink-muted">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}
                      {item.sku}
                    </span>
                  </span>

                  <span className="shrink-0 text-right font-body text-sm">
                    <span className="block tabular-nums text-ink-muted">
                      {item.quantity} × {formatMoney(item.price, order.currency)}
                    </span>
                    <span className="block font-medium tabular-nums text-foreground">
                      {formatMoney(item.lineTotal ?? item.price * item.quantity, order.currency)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-rule px-5 py-4 font-body text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
              {(order.discount ?? 0) > 0 && (
                <Row
                  label="Discount"
                  value={`−${formatMoney(order.discount ?? 0, order.currency)}`}
                  tone="positive"
                />
              )}
              {(order.tax ?? 0) > 0 && (
                <Row label="VAT" value={formatMoney(order.tax ?? 0, order.currency)} />
              )}
              <Row
                label="Shipping"
                value={
                  (order.shippingCost ?? 0) > 0
                    ? formatMoney(order.shippingCost ?? 0, order.currency)
                    : collection ? "—" : "Free"
                }
              />
              <div className="flex items-baseline justify-between border-t border-rule pt-2">
                <dt className="font-body text-sm font-medium text-foreground">Total</dt>
                <dd className="font-body text-base font-medium tabular-nums text-foreground">
                  {formatMoney(order.total, order.currency)}
                </dd>
              </div>
              {/* Payment method used to print here. Every order settles by
                  transfer against the invoice, so the line said the same thing
                  on every order it appeared on — and said nothing at all on the
                  ones where nobody had filled it in. */}
              <p className="flex items-center gap-1.5 pt-1 font-body text-xs text-ink-muted">
                <CreditCard className="h-3.5 w-3.5" />
                {order.paymentStatus === "paid"
                  ? "Settled by transfer against the invoice."
                  : "Awaiting transfer against the invoice."}
              </p>
            </dl>
          </SectionCard>

          {order.customerNotes && (
            <SectionCard title="What the customer asked for">
              <p className="max-w-[70ch] whitespace-pre-wrap font-body text-sm text-ink-muted">
                {order.customerNotes}
              </p>
            </SectionCard>
          )}

          <OrderNotes orderId={order.id} notes={notes} onChanged={load} />
          <OrderHistory history={history} />
        </div>

        {/* --------------------------------------------------------- sidebar */}
        <div className="space-y-6">
          {/* Payment first: for a shop that packs only once the transfer lands,
              "has the money arrived" is the question this page opens on. */}
          <OrderPayment order={order} onChanged={load} />
          <OrderFulfilment order={order} onChanged={load} />

          <SectionCard title="Customer">
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-body text-sm text-foreground">
                <User className="h-4 w-4 shrink-0 text-ink-faint" />
                {order.customerName}
              </p>

              <ContactLink
                icon={Mail}
                href={`mailto:${order.customerEmail}?subject=${encodeURIComponent(`Your Ramazah order ${order.orderNumber}`)}`}
              >
                {order.customerEmail}
              </ContactLink>

              {order.customerPhone && (
                <>
                  <ContactLink icon={Phone} href={`tel:${order.customerPhone}`}>
                    {order.customerPhone}
                  </ContactLink>
                  {whatsapp && (
                    <ContactLink
                      icon={MessageCircle}
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, about your Ramazah order ${order.orderNumber}:`)}`}
                      external
                    >
                      Message on WhatsApp
                    </ContactLink>
                  )}
                </>
              )}

              {order.userId && (
                <ContactLink
                  icon={ExternalLink}
                  href={`/admin/customers?q=${encodeURIComponent(order.customerEmail)}`}
                >
                  Their other orders
                </ContactLink>
              )}
            </div>
          </SectionCard>

          <SectionCard title={collection ? "Collection" : "Delivery"}>
            {collection ? (
              <p className="font-body text-sm text-ink-muted">
                Collected in store. No address was taken.
              </p>
            ) : order.shippingAddress ? (
              <>
                <address className="flex gap-2 font-body text-sm not-italic text-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                  <span>
                    {order.shippingAddress.fullName}
                    <br />
                    {order.shippingAddress.street}
                    <br />
                    {order.shippingAddress.city}
                    {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                    {order.shippingAddress.zipCode && ` ${order.shippingAddress.zipCode}`}
                    <br />
                    {order.shippingAddress.country}
                  </span>
                </address>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const address = order.shippingAddress!;
                    navigator.clipboard.writeText(
                      [
                        address.fullName, address.phone, address.street,
                        [address.city, address.state, address.zipCode].filter(Boolean).join(", "),
                        address.country,
                      ].filter(Boolean).join("\n")
                    );
                    toast.success("Address copied.");
                  }}
                >
                  Copy for the courier
                </Button>
              </>
            ) : (
              <p className="font-body text-sm text-ink-muted">No address recorded.</p>
            )}

            {(order.trackingNumber || order.carrier) && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-sm bg-wash/60 px-2.5 py-1.5 font-body text-xs text-ink-muted">
                <Truck className="h-3.5 w-3.5" />
                {order.carrier || "Courier"} ·{" "}
                <span className="tabular-nums">
                  {order.trackingNumber || "no tracking number"}
                </span>
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "positive" }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tabular-nums ${tone === "positive" ? "text-sage-deep" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function ContactLink({
  icon: Icon,
  href,
  external,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-2 font-body text-sm text-sage-deep transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </a>
  );
}

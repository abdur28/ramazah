"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Save,
  Store,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusPill, { ORDER_STATUS, PAYMENT_STATUS } from "@/components/admin/ui/StatusPill";
import useAdmin from "@/hooks/admin/useAdmin";
import useScrollLock from "@/hooks/useScrollLock";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import type { Order, OrderStatus, PaymentStatus } from "@/types/types";

/**
 * One order, and the controls that move it.
 *
 * Three fixes beyond the restyle.
 *
 * The page no longer scrolls behind it. Lenis drives the window directly and
 * ignores both `overflow: hidden` and Radix's own scroll lock, so every overlay
 * in this app has to call `useScrollLock`; the admin dialogs never did, and the
 * page slid away underneath while the dialog's own content stayed put.
 *
 * Money is formatted rather than concatenated — `NGN 410005.00` became ₦410,005.
 *
 * And a line whose product has lost its image no longer renders `<Image src="">`,
 * which the browser resolves against the current URL and re-downloads the whole
 * admin page as if it were a JPEG.
 */
export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}) {
  const { updateOrderStatus, updatePaymentStatus, updateOrder } = useAdmin();

  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (open && order) {
      setOrderStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setTrackingNumber(order.trackingNumber || "");
      setCarrier(order.carrier || "");
    }
  }, [open, order]);

  if (!order) return null;

  const hasChanges =
    orderStatus !== order.status ||
    paymentStatus !== order.paymentStatus ||
    trackingNumber !== (order.trackingNumber || "") ||
    carrier !== (order.carrier || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const work: Promise<unknown>[] = [];

      if (orderStatus !== order.status) work.push(updateOrderStatus(order.id, orderStatus));
      if (paymentStatus !== order.paymentStatus)
        work.push(updatePaymentStatus(order.id, paymentStatus));
      if (trackingNumber !== (order.trackingNumber || "") || carrier !== (order.carrier || ""))
        work.push(updateOrder(order.id, { trackingNumber, carrier }));

      await Promise.all(work);
      toast.success(`${order.orderNumber} updated.`);
    } catch (err: any) {
      toast.error(err?.message || "Could not update the order.");
    } finally {
      setIsSaving(false);
    }
  };

  const timeline = [
    { label: "Placed", value: order.createdAt },
    { label: "Paid", value: order.paidAt },
    { label: "Shipped", value: order.shippedAt },
    { label: "Delivered", value: order.deliveredAt },
    { label: "Collected", value: order.pickedUpAt },
  ].filter((entry) => Boolean(entry.value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-rule px-6 py-5 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-3 font-body text-base font-medium">
            <span className="tabular-nums">{order.orderNumber}</span>
            <StatusPill status={order.status} map={ORDER_STATUS} />
            <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-ink-muted">
            Placed {formatDateTime(order.createdAt)} · {formatMoney(order.total, order.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 px-6 py-6">
          {/* ------------------------------------------------------ controls */}
          <section className="rounded-sm border border-rule bg-wash/50 p-4">
            <h3 className="mb-4 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Move this order
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Order status</Label>
                <Select
                  value={orderStatus}
                  onValueChange={(value) => setOrderStatus(value as OrderStatus)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ORDER_STATUS).map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {ORDER_STATUS[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Payment</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAYMENT_STATUS).map((status) => (
                      <SelectItem key={status} value={status}>
                        {PAYMENT_STATUS[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Tracking number</Label>
                <Input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="From the courier"
                  className="bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Courier</Label>
                <Input
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="GIG, DHL, Kwik…"
                  className="bg-card"
                />
              </div>
            </div>

            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} className="mt-4 w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            )}
          </section>

          {/* ------------------------------------------------------ customer */}
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <Heading icon={User}>Customer</Heading>
              <dl className="space-y-2 font-body text-sm">
                <Field label="Name">{order.customerName}</Field>
                <Field label="Email">
                  <a href={`mailto:${order.customerEmail}`} className="text-sage-deep hover:underline">
                    {order.customerEmail}
                  </a>
                </Field>
                <Field label="Phone">
                  <a href={`tel:${order.customerPhone}`} className="text-sage-deep hover:underline">
                    {order.customerPhone}
                  </a>
                </Field>
              </dl>
            </div>

            <div>
              <Heading icon={order.deliveryType === "inStore" ? Store : MapPin}>
                {order.deliveryType === "inStore" ? "Collection" : "Delivery"}
              </Heading>

              {order.deliveryType === "inStore" ? (
                <p className="font-body text-sm text-ink-muted">
                  Collected in store. No address was taken.
                </p>
              ) : order.shippingAddress ? (
                <address className="font-body text-sm not-italic text-foreground">
                  {order.shippingAddress.fullName}
                  <br />
                  {order.shippingAddress.street}
                  <br />
                  {order.shippingAddress.city}
                  {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                  {order.shippingAddress.zipCode && ` ${order.shippingAddress.zipCode}`}
                  <br />
                  {order.shippingAddress.country}
                </address>
              ) : (
                <p className="font-body text-sm text-ink-muted">No address recorded.</p>
              )}

              {(order.trackingNumber || order.carrier) && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-sm bg-wash/60 px-2.5 py-1.5 font-body text-xs text-ink-muted">
                  <Truck className="h-3.5 w-3.5" />
                  {order.carrier || "Courier"} · {order.trackingNumber || "no tracking number"}
                </p>
              )}
            </div>
          </section>

          {/* --------------------------------------------------------- items */}
          <section>
            <Heading icon={Package}>
              {order.items.length} {order.items.length === 1 ? "item" : "items"}
            </Heading>

            <ul className="divide-y divide-rule rounded-sm border border-rule">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-wash">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-ink-faint" />
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm text-foreground">
                      {item.name}
                    </span>
                    <span className="block truncate font-body text-xs text-ink-muted">
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
          </section>

          {/* ------------------------------------------------------- summary */}
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <Heading icon={CreditCard}>Totals</Heading>
              <dl className="space-y-2 font-body text-sm">
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
                {(order.shippingCost ?? 0) > 0 && (
                  <Row
                    label="Shipping"
                    value={formatMoney(order.shippingCost ?? 0, order.currency)}
                  />
                )}
                <div className="flex items-baseline justify-between border-t border-rule pt-2">
                  <dt className="font-body text-sm font-medium text-foreground">Total</dt>
                  <dd className="font-body text-base font-medium tabular-nums text-foreground">
                    {formatMoney(order.total, order.currency)}
                  </dd>
                </div>
                {order.paymentMethod && (
                  <p className="pt-1 font-body text-xs text-ink-muted">
                    Paid by {order.paymentMethod}
                  </p>
                )}
              </dl>
            </div>

            <div>
              <Heading>Timeline</Heading>
              <ol className="space-y-2 font-body text-sm">
                {timeline.map((entry) => (
                  <li key={entry.label} className="flex items-baseline justify-between gap-4">
                    <span className="text-ink-muted">{entry.label}</span>
                    <span className="tabular-nums text-foreground">
                      {formatDateTime(entry.value)}
                    </span>
                  </li>
                ))}
              </ol>

              {order.customerNotes && (
                <div className="mt-5">
                  <Heading>Customer note</Heading>
                  <p className="max-w-[60ch] font-body text-sm text-ink-muted">
                    {order.customerNotes}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Heading({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-foreground">{children}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd
        className={`tabular-nums ${tone === "positive" ? "text-sage-deep" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

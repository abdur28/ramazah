"use client";

import { useState } from "react";
import { AlertTriangle, Check, Coins, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/admin/ui/SectionCard";
import StatusPill, { PAYMENT_STATUS } from "@/components/admin/ui/StatusPill";
import useScrollLock from "@/hooks/useScrollLock";
import { updatePaymentStatus } from "@/lib/orders";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import type { Order, PaymentStatus } from "@/types/types";

/**
 * Recording a payment, on its own and out of the way of everything else.
 *
 * It used to be a select in the same row as the courier and the tracking
 * number, which made "the money arrived" exactly as easy to click as a typo
 * correction — and marking it unpaid again just as easy. That is the wrong
 * weight for the one action on this screen that moves stock off the shelf.
 *
 * So each direction is its own button with its own consequence spelled out
 * before it happens. Undoing a settled payment asks why, and the database
 * refuses without one; refunding is offered separately because it is a different
 * event, not a stronger version of the same one.
 *
 * Once an order has shipped, undoing the payment is not offered at all. At that
 * point the goods are gone: either the money went back, which is a refund, or
 * the customer owes for something they already have, which changing a status
 * does not fix.
 */
type Intent = "paid" | "undo" | "refund" | "failed";

const INTENT: Record<Intent, {
  status: PaymentStatus;
  title: string;
  body: string;
  confirm: string;
  needsReason: boolean;
  destructive?: boolean;
}> = {
  paid: {
    status: "paid",
    title: "Record the payment as received?",
    body: "This takes the ordered items off the shelf and lets the order be packed. Only do it once the transfer has actually landed.",
    confirm: "Yes, the money arrived",
    needsReason: false,
  },
  undo: {
    status: "pending",
    title: "Undo this payment?",
    body: "The order goes back to awaiting payment and its items return to stock. This is recorded against the order with your name on it.",
    confirm: "Undo the payment",
    needsReason: true,
    destructive: true,
  },
  failed: {
    status: "failed",
    title: "Mark the payment as failed?",
    body: "For a transfer that bounced or was never completed. The items return to stock.",
    confirm: "Mark as failed",
    needsReason: true,
    destructive: true,
  },
  refund: {
    status: "refunded",
    title: "Record a refund?",
    body: "For money actually sent back to the customer. The items return to stock and the order stops counting as a sale.",
    confirm: "Record the refund",
    needsReason: true,
    destructive: true,
  },
};

export default function OrderPayment({
  order,
  onChanged,
}: {
  order: Order;
  onChanged: () => void;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useScrollLock(intent !== null);

  const settled = order.paymentStatus === "paid";
  // Matches the guard in set_order_payment(): once the goods are out, a payment
  // cannot be un-recorded, only refunded.
  const gone =
    order.status === "shipped" || order.status === "delivered" ||
    Boolean(order.shippedAt || order.deliveredAt || order.pickedUpAt);

  const config = intent ? INTENT[intent] : null;
  const blocked = Boolean(config?.needsReason && !reason.trim());

  const run = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await updatePaymentStatus(order.id, config.status, reason);
      if (error) throw new Error(error);
      toast.success(`${order.orderNumber} — payment updated.`);
      setIntent(null);
      setReason("");
      onChanged();
    } catch (err) {
      toast.error(describeError(err, "Could not update the payment."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Payment">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-body text-2xl font-medium tabular-nums text-foreground">
              {formatMoney(order.total, order.currency)}
            </span>
            <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
          </div>

          <p className="font-body text-sm text-ink-muted">
            {settled
              ? `Settled by transfer${order.paidAt ? ` on ${formatDateTime(order.paidAt)}` : ""}.`
              : "Awaiting a bank transfer against the invoice. Nothing is held in stock until it lands."}
          </p>

          {!settled && (
            <Button className="w-full" onClick={() => setIntent("paid")}>
              <Coins className="mr-2 h-4 w-4" />
              Record payment received
            </Button>
          )}

          {/* The reversals, deliberately quieter than the action above and
              deliberately separate from each other. */}
          <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
            {settled && !gone && (
              <SecondaryAction icon={Undo2} onClick={() => setIntent("undo")}>
                Undo — it did not arrive
              </SecondaryAction>
            )}
            {settled && (
              <SecondaryAction icon={RotateCcw} onClick={() => setIntent("refund")}>
                Refund
              </SecondaryAction>
            )}
            {!settled && order.paymentStatus !== "failed" && (
              <SecondaryAction icon={AlertTriangle} onClick={() => setIntent("failed")}>
                Transfer failed
              </SecondaryAction>
            )}
          </div>

          {settled && gone && (
            <p className="font-body text-xs leading-relaxed text-ink-faint">
              This order has gone out, so its payment can no longer be undone — only refunded.
            </p>
          )}
        </div>
      </SectionCard>

      <AlertDialog
        open={intent !== null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setIntent(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">{config?.title}</AlertDialogTitle>
            <AlertDialogDescription>{config?.body}</AlertDialogDescription>
          </AlertDialogHeader>

          {config?.needsReason && (
            <div className="space-y-1.5">
              <label
                htmlFor="payment-reason"
                className="font-body text-xs text-ink-muted"
              >
                Why? Required — it is kept on the order.
              </label>
              <Textarea
                id="payment-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Transfer was matched to the wrong order…"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Radix closes on click; the request has to finish first, and a
                // missing reason must not dismiss the dialog at all.
                event.preventDefault();
                run();
              }}
              disabled={saving || blocked}
              className={config?.destructive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                <><Check className="mr-2 h-4 w-4" />{config?.confirm}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SecondaryAction({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-body text-xs text-ink-muted transition-colors hover:bg-wash/60 hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

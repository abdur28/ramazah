"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ORDER_STATUS } from "@/components/admin/ui/StatusPill";
import SectionCard from "@/components/admin/ui/SectionCard";
import useAdmin from "@/hooks/admin/useAdmin";
import { describeError } from "@/lib/admin/errors";
import type { Order, OrderStatus } from "@/types/types";

/**
 * The controls that move one order.
 *
 * The note is the addition. `order_status_history.note` has existed since the
 * first migration and nothing ever wrote it, so the audit trail could say an
 * order went from processing to cancelled but never why — and "why" is the only
 * part anyone needs three weeks later.
 *
 * The next step in the ladder gets a button of its own above the dropdown. Almost
 * every change an order sees is the obvious one, and making that a two-control
 * operation is how a screen ends up slower than a chat thread.
 *
 * Payment is **not** here. It sat in this grid as a third select, which made
 * "the money arrived" — the one action that moves stock — exactly as easy to
 * click as fixing a typo in the courier name. It has its own card, its own
 * confirmations, and a database that refuses to undo a settled payment without a
 * stated reason. See `OrderPayment`.
 */
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending:    { to: "processing", label: "Start packing" },
  processing: { to: "shipped",    label: "Mark as shipped" },
  shipped:    { to: "delivered",  label: "Mark as delivered" },
};

export default function OrderFulfilment({
  order,
  onChanged,
}: {
  order: Order;
  onChanged: () => void;
}) {
  const { updateOrderStatus, updateOrder } = useAdmin();

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [quick, setQuick] = useState<OrderStatus | null>(null);

  useEffect(() => {
    setStatus(order.status);
    setTracking(order.trackingNumber ?? "");
    setCarrier(order.carrier ?? "");
    setNote("");
  }, [order]);

  const shipping = tracking !== (order.trackingNumber ?? "") || carrier !== (order.carrier ?? "");
  const dirty = status !== order.status || shipping || note.trim().length > 0;

  const collection = order.deliveryType === "inStore";
  const next = NEXT_STEP[order.status];
  const nextLabel = next && collection && next.to === "delivered" ? "Mark as collected" : next?.label;

  const apply = async (
    nextStatus: OrderStatus,
    withNote: string,
    setBusy: (busy: boolean) => void
  ) => {
    setBusy(true);
    try {
      // Sequential, not Promise.all: each writes to the same row, and a failure
      // in the middle should stop rather than race the others.
      if (nextStatus !== order.status || withNote.trim()) {
        await updateOrderStatus(order.id, nextStatus, withNote);
      }
      if (shipping) {
        await updateOrder(order.id, { trackingNumber: tracking, carrier });
      }
      setNote("");
      toast.success(`${order.orderNumber} updated.`);
      onChanged();
    } catch (err) {
      toast.error(describeError(err, "Could not update the order."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Move this order">
      <div className="space-y-4">
        {next && (
          <Button
            className="w-full"
            disabled={quick !== null || saving}
            onClick={() => {
              setQuick(next.to);
              apply(next.to, note, () => setQuick(null));
            }}
          >
            {quick ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Truck className="mr-2 h-4 w-4" />
            )}
            {nextLabel}
          </Button>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-body text-xs text-ink-muted">Order status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_STATUS).map(([value, definition]) => (
                  <SelectItem key={value} value={value}>{definition.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hidden for a collection: there is no courier and no parcel to
              track, and an empty pair of fields reads as missing data. */}
          {!collection && (
            <>
              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Courier</Label>
                <Input
                  value={carrier}
                  onChange={(event) => setCarrier(event.target.value)}
                  placeholder="GIG, DHL, Kwik…"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Tracking number</Label>
                <Input
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                  placeholder="From the courier"
                  className="tabular-nums"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="font-body text-xs text-ink-muted">
            Why, for the record <span className="text-ink-faint">— optional</span>
          </Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Held for a second consignment; customer asked to delay…"
          />
          <p className="font-body text-xs text-ink-faint">
            Kept on the order&rsquo;s history against this change. Staff only.
          </p>
        </div>

        {dirty && (
          <Button
            variant={next ? "outline" : "default"}
            onClick={() => apply(status, note, setSaving)}
            disabled={saving || quick !== null}
            className="w-full"
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save changes</>
            )}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Truck, Package, FileText, Home } from "lucide-react";
import { getOrderTimeline, type OrderEvent } from "@/lib/account";
import type { Order } from "@/types/types";

/**
 * Where an order has got to.
 *
 * `order_status_history` is written by a trigger on every status change and
 * nothing displayed it. With delivery running two to three weeks, "where is my
 * order" is the question this shop answers most, and it was only answerable in
 * a chat.
 *
 * The ladder is drawn whole rather than only the steps that have happened, so
 * the reader can see what is still to come and roughly where they are.
 */
const LADDER = [
  { status: 'pending',    label: 'Order placed',  icon: FileText, note: 'We have your order and are preparing your invoice.' },
  { status: 'processing', label: 'Being packed',  icon: Package,  note: 'Paid and packed for the next consignment.' },
  { status: 'shipped',    label: 'On its way',    icon: Truck,    note: 'In transit — two to three weeks for standard delivery.' },
  { status: 'delivered',  label: 'Delivered',     icon: Home,     note: 'Handed over at your address.' },
];

const formatWhen = (value: string) =>
  new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

export default function OrderTimeline({ order }: { order: Order }) {
  const [events, setEvents] = useState<OrderEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    getOrderTimeline(order.id).then(({ events: fetched }) => {
      if (!cancelled) setEvents(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  // Cancelled and refunded orders are not points on the ladder; they end it.
  if (order.status === 'cancelled' || order.status === 'refunded') {
    const ended = events.find((event) => event.status === order.status);
    return (
      <div className="rounded-sm border border-rule bg-wash px-4 py-3">
        <p className="font-body text-sm capitalize text-foreground">{order.status}</p>
        <p className="mt-0.5 font-body text-xs text-ink-muted">
          {ended ? formatWhen(ended.at) : 'No longer in progress.'}
          {ended?.note ? ` · ${ended.note}` : ''}
        </p>
      </div>
    );
  }

  const reachedIndex = LADDER.findIndex((step) => step.status === order.status);
  const eventFor = (status: string) => events.find((event) => event.status === status);

  return (
    <ol className="relative space-y-0">
      {LADDER.map((step, index) => {
        const Icon = step.icon;
        const event = eventFor(step.status);
        const isDone = index <= reachedIndex;
        const isCurrent = index === reachedIndex;
        const isLast = index === LADDER.length - 1;

        return (
          <li key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isDone
                    ? 'border-sage-deep bg-sage-deep text-background'
                    : 'border-rule bg-card text-ink-faint'
                }`}
              >
                {isDone && !isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : isDone ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Circle className="h-2 w-2" fill="currentColor" />
                )}
              </span>
              {!isLast && (
                <span
                  className={`w-px flex-1 ${index < reachedIndex ? 'bg-sage-deep' : 'bg-rule'}`}
                />
              )}
            </div>

            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p
                className={`font-body text-sm ${
                  isDone ? 'text-foreground' : 'text-ink-muted'
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 max-w-[46ch] font-body text-xs text-ink-muted">
                {event ? formatWhen(event.at) : step.note}
              </p>
              {event?.note && (
                <p className="mt-1 max-w-[46ch] font-body text-xs text-ink-muted">{event.note}</p>
              )}
            </div>
          </li>
        );
      })}

      {order.trackingNumber && (
        <li className="ml-12 rounded-sm border border-rule bg-wash px-4 py-3">
          <p className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Tracking
          </p>
          <p className="mt-1 font-body text-sm tabular-nums text-foreground">
            {order.trackingNumber}
            {order.carrier ? ` · ${order.carrier}` : ''}
          </p>
        </li>
      )}
    </ol>
  );
}

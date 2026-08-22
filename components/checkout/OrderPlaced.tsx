"use client";

import Link from "next/link";
import { Check, FileText, MessageCircle, Package } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import PaymentInstructions from "@/components/checkout/PaymentInstructions";
import { DELIVERY_LEAD_TIME, SUPPORT_WHATSAPP } from "@/constants";

/**
 * The confirmation, and the payment instructions — one page, because they are
 * one thing.
 *
 * Ramazah takes no card payment. The order is placed but nothing has been paid,
 * and the shop only starts packing when the transfer lands. So this cannot be
 * the usual "thank you, your order is on its way": it has to say plainly that
 * the order is *not* yet being prepared, what to pay, where, and what reference
 * to quote. Getting that wrong costs a sale silently — the customer assumes they
 * are done and waits.
 *
 * The account number and the reference each get a copy button. Both get typed
 * into a banking app by hand, and a mistyped reference is an untraceable
 * payment.
 */
export default function OrderPlaced({ orderAsString }: { orderAsString: string }) {
  const order = JSON.parse(orderAsString);
  const { formatPrice } = useCurrency();
  const items = order.order_items ?? [];
  const units = items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
  const collection = order.delivery_type === "in_store";

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-20">
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-deep text-background">
            <Check className="h-4 w-4" />
          </span>
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-ink-muted">
            Order received
          </p>
        </div>

        {/* Cormorant is a 300-weight serif and illegible small — this is the one
            place on the page it is large enough to earn its keep. */}
        <h1 className="mt-5 font-heading text-4xl font-light text-foreground md:text-5xl">
          Thank you, {String(order.customer_name).split(" ")[0]}.
        </h1>

        <p className="mt-4 max-w-[60ch] font-body text-base leading-relaxed text-ink-muted">
          Order <span className="tabular-nums text-foreground">{order.order_number}</span> is with
          us — {items.length} {items.length === 1 ? "line" : "lines"}, {units}{" "}
          {units === 1 ? "item" : "items"}, {formatPrice(Number(order.total))}.
        </p>

        {/* The whole reason this page exists. Stated before anything else, and
            not softened: nothing is being packed yet. Shared with the account
            area so there is one copy of the account number. */}
        <PaymentInstructions
          orderNumber={order.order_number}
          total={Number(order.total)}
          paymentStatus={order.payment_status}
          className="mt-10"
        />

        {/* What happens next, in the order it happens. Numbered because it is a
            real sequence, and each step is gated on the one before. */}
        <section className="mt-10">
          <h2 className="font-body text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            What happens next
          </h2>
          <ol className="mt-4 space-y-4">
            <Step n={1} title="We confirm your transfer">
              Usually the same working day. Your order shows as paid the moment we do.
            </Step>
            <Step n={2} title="We pack it">
              {collection
                ? "We will message you when it is ready to collect from the store."
                : `Onto the next consignment. Delivery runs ${DELIVERY_LEAD_TIME} from dispatch.`}
            </Step>
            <Step n={3} title="You can follow it">
              Every stage shows on your order page, with the courier and tracking number once it
              ships.
            </Step>
          </ol>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            View invoice
          </Link>

          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 rounded-sm border border-rule px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep"
          >
            <Package className="h-3.5 w-3.5" />
            My orders
          </Link>

          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hello, about my order ${order.order_number}:`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm px-4 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-sage-deep"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Ask us
          </a>
        </div>

        <p className="mt-8 max-w-[60ch] font-body text-xs leading-relaxed text-ink-faint">
          A copy of this is on your order page, so you can come back to the account details at any
          time.
        </p>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rule font-body text-xs tabular-nums text-ink-muted">
        {n}
      </span>
      <span className="min-w-0">
        <span className="block font-body text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block max-w-[58ch] font-body text-sm text-ink-muted">
          {children}
        </span>
      </span>
    </li>
  );
}

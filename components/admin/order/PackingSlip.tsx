"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * The slip that goes in the box.
 *
 * Deliberately not the invoice. The invoice is the payment instrument and
 * carries the shop's amber-and-green identity; this is a working document —
 * photocopied, written on, read at arm's length across a packing table — so it
 * is monochrome, hairline-ruled, and sized for legibility rather than for brand.
 *
 * **No prices, anywhere.** Two reasons, and both matter. The person packing does
 * not need them and reading past them costs time. And a large share of this
 * shop's orders are gifts sent straight to the recipient, where a printed price
 * in the box is the one thing nobody wants.
 *
 * It reuses `.invoice-sheet`, which is the hook the print rules in globals.css
 * hang off — A4 sizing, repeated table headings, no line split across a page
 * break. `.packing-slip` only overrides the page colour, since those rules paint
 * the canvas the invoice's green.
 */
export default function PackingSlip({ orderAsString }: { orderAsString: string }) {
  const order = JSON.parse(orderAsString);
  const items = order.order_items ?? [];

  const placed = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const collection = order.delivery_type === "in_store";
  const units = items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);

  const addressLines = [
    order.ship_street,
    [order.ship_city, order.ship_state].filter(Boolean).join(", "),
    [order.ship_country, order.ship_postal_code].filter(Boolean).join(" "),
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[210mm]">
      {/* Controls — never printed. */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the order
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
      </div>

      <article className="invoice-sheet packing-slip flex min-h-[297mm] flex-col bg-white px-12 py-12 text-black shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-black pb-5">
          <div>
            {/* Typographic, not the masked-PNG lockup: those are white artwork
                filled by CSS, and a mask that fails to print leaves a blank. */}
            <p className="font-heading text-[40px] font-light leading-none">Ramazah</p>
            <p className="mt-2 font-body text-[11px] uppercase tracking-[0.28em]">
              Packing slip
            </p>
          </div>

          <dl className="text-right font-body text-sm leading-relaxed">
            <div>
              <dt className="inline text-neutral-500">Order </dt>
              <dd className="inline font-semibold tabular-nums">{order.order_number}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Placed </dt>
              <dd className="inline tabular-nums">{placed}</dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Items </dt>
              <dd className="inline tabular-nums">
                {items.length} {items.length === 1 ? "line" : "lines"} · {units}{" "}
                {units === 1 ? "unit" : "units"}
              </dd>
            </div>
          </dl>
        </header>

        {/* Ship to — the largest thing on the page after the wordmark. It gets
            read across a table, and on a courier's own label it gets copied. */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="border border-black p-5">
            <h2 className="font-body text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              {collection ? "Collected by" : "Ship to"}
            </h2>
            <address className="mt-2 font-body text-[17px] not-italic leading-snug">
              <span className="font-semibold">
                {order.ship_full_name || order.customer_name}
              </span>
              {!collection && addressLines.length > 0 && (
                <>
                  <br />
                  {addressLines.map((line: string) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </>
              )}
              {collection && (
                <>
                  <br />
                  <span className="text-[15px]">Collection in store — do not dispatch.</span>
                </>
              )}
            </address>
            <p className="mt-2 font-body text-[15px] tabular-nums">
              {order.ship_phone || order.customer_phone}
            </p>
          </div>

          <div className="font-body text-sm leading-relaxed">
            <h2 className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Dispatch
            </h2>
            <dl className="mt-2 space-y-1">
              <Line label="Courier" value={order.carrier || "—"} />
              <Line label="Tracking" value={order.tracking_number || "—"} mono />
              <Line
                label="Method"
                value={collection ? "In-store collection" : "Standard delivery"}
              />
            </dl>

            {/* A packed-by line, because a slip that nobody signs cannot be
                traced back when a parcel goes out short. */}
            <div className="mt-5 space-y-4">
              <Rule label="Packed by" />
              <Rule label="Checked by" />
            </div>
          </div>
        </section>

        {/* Items */}
        <div className="invoice-items mt-9">
          <table className="w-full border-collapse text-left font-body">
            <thead>
              <tr className="border-y-2 border-black text-[10px] uppercase tracking-[0.18em]">
                <th className="w-9 py-2.5 pr-2 font-semibold" scope="col">
                  <span className="sr-only">Picked</span>
                </th>
                <th className="py-2.5 pr-4 font-semibold" scope="col">Item</th>
                <th className="w-40 py-2.5 pr-4 font-semibold" scope="col">SKU</th>
                <th className="w-20 py-2.5 text-right font-semibold" scope="col">Qty</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-neutral-300">
                  <td className="py-3.5 pr-2">
                    {/* Printed, not interactive: it is ticked with a pen. */}
                    <span
                      aria-hidden
                      className="block h-4 w-4 border border-black"
                    />
                  </td>
                  <td className="py-3.5 pr-4 text-[15px] leading-snug">
                    {item.name}
                    {item.variant_label && (
                      <span className="block text-[13px] text-neutral-600">
                        {item.variant_label}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-[13px] tabular-nums text-neutral-600">
                    {item.sku}
                  </td>
                  <td className="py-3.5 text-right text-[19px] font-semibold tabular-nums">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b-2 border-black">
                <td />
                <td className="py-3 font-body text-[11px] uppercase tracking-[0.18em]" colSpan={2}>
                  Total units
                </td>
                <td className="py-3 text-right text-[19px] font-semibold tabular-nums">
                  {units}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order.customer_notes && (
          <section className="invoice-totals mt-8 border border-black p-5">
            <h2 className="font-body text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              What the customer asked for
            </h2>
            <p className="mt-2 max-w-[70ch] whitespace-pre-wrap font-body text-[15px] leading-snug">
              {order.customer_notes}
            </p>
          </section>
        )}

        <footer className="mt-auto pt-10 font-body text-[11px] leading-relaxed text-neutral-600">
          <p className="font-semibold text-black">Ramazah Group · Alexandria, Egypt</p>
          <p className="mt-1">
            {/* The slip has no prices on it, so it says where to find them
                rather than leaving someone hunting. */}
            Prices and payment are on invoice {order.order_number}, sent separately.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-neutral-500">{label}</dt>
      <dd className={mono ? "tabular-nums" : undefined}>{value}</dd>
    </div>
  );
}

/** A ruled line to sign on. */
function Rule({ label }: { label: string }) {
  return (
    <p className="flex items-end gap-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
      {label}
      <span aria-hidden className="mb-1 flex-1 border-b border-neutral-400" />
    </p>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Printer } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * The invoice, rebuilt from the printed Ramazah template.
 *
 * It keeps that document's own identity rather than the storefront's: an amber
 * header band with the lockup and the cart, a borderless item table, and totals
 * in green at the foot. An invoice is read alongside the ones already sent by
 * hand, so matching those matters more than matching the website.
 *
 * No PDF library: `window.print()` against the print rules in globals.css hands
 * the customer a PDF through their own browser, on any platform.
 *
 * Figures come from the order row, never from today's catalog — an invoice has
 * to keep saying what was agreed, whatever the shop charges now.
 */

/** Taken from the printed template. Change here to change the document. */
const AMBER = "#D07F15";
/** The body is a pale green wash, not white — one shade off the site's `wash`. */
const PAGE = "#EAF1E2";
/** Item rows sit a shade lighter than the page, so they read as bands on it. */
const ROW = "#F5F9F1";
const GREEN = "#3F6E2E";

/**
 * Part-hide the phone number, as the printed invoices do: `+234816.....37`.
 *
 * An invoice gets forwarded, printed and photographed, so the number on it is
 * the most exposed thing on the page. Enough is kept for the customer to
 * recognise it as theirs; the middle is not there to be read off.
 *
 * The full number stays in the database and on the order screens, where staff
 * need to call.
 */
function maskPhone(value?: string | null) {
  if (!value) return "";

  const digits = value.replace(/\s+/g, "");
  // International numbers keep the country code and network prefix; local ones
  // keep only the prefix, or half the number would still be showing.
  const headLength = digits.startsWith("+") ? 7 : 4;

  if (digits.length <= headLength + 3) return digits;

  const head = digits.slice(0, headLength);
  const tail = digits.slice(-2);
  const hidden = Math.max(3, digits.length - head.length - tail.length);

  return `${head}${".".repeat(hidden)}${tail}`;
}

export default function InvoiceView({
  orderAsString,
  // Where "back" goes. The admin prints the same document from
  // `/admin/orders/[id]/invoice`, and should return to the order it opened from
  // rather than to the customer's own order list.
  backHref = "/dashboard/orders",
  backLabel = "Back to orders",
}: {
  orderAsString: string;
  backHref?: string;
  backLabel?: string;
}) {
  const order = JSON.parse(orderAsString);
  const { formatPrice } = useCurrency();
  const { business } = useSettings();

  const issued = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const items = order.order_items ?? [];
  const isPaid = order.payment_status === "paid";

  const discount = Number(order.discount_amount ?? 0);
  const tax = Number(order.tax_amount ?? 0);
  const shipping = Number(order.shipping_cost ?? 0);

  return (
    <div className="mx-auto w-full max-w-[210mm]">
      {/* Controls — never printed. */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
        >
          <Printer className="h-3.5 w-3.5" />
          Print or save as PDF
        </button>
      </div>

      {/* `invoice-sheet` is what the print rules in globals.css size to A4 and
          paginate. On screen it holds the same proportions, so a long order
          shows where it will break before anyone prints it. */}
      <article
        className="invoice-sheet flex min-h-[297mm] flex-col overflow-hidden rounded-sm border border-rule shadow-sm print:rounded-none print:border-0 print:shadow-none"
        style={{ backgroundColor: PAGE }}
      >
        {/* Header band */}
        <header
          className="flex items-start justify-between gap-6 px-10 py-9"
          style={{ backgroundColor: AMBER }}
        >
          <div>
            <h1 className="font-body text-[40px] font-bold leading-[1.05] tracking-tight text-white md:text-5xl">
              RAMAZAH
              <br />
              Store
            </h1>
            <p className="mt-3 font-body text-base font-light text-white/90">
              Your Shopping Made Easy
            </p>
          </div>

          {/* The cart, with its own shadow — the original sits it on a soft
              ellipse rather than letting it float. */}
          <div className="relative shrink-0">
            <Image
              src="/cart-icon.png"
              alt=""
              width={150}
              height={150}
              className="relative z-10 h-[110px] w-[110px] object-contain md:h-[150px] md:w-[150px]"
              priority
            />
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-1 h-3 rounded-[50%] blur-[6px] md:h-4"
              style={{ backgroundColor: "rgba(90, 52, 0, 0.45)" }}
            />
          </div>
        </header>

        <div className="flex flex-1 flex-col px-10 pb-10 pt-9">
          {/* Billed to · invoice number */}
          <div className="flex flex-wrap justify-between gap-6">
            <div className="font-body text-sm text-neutral-800">
              <p className="font-semibold text-neutral-900">Billed to:</p>
              <p className="mt-1">{order.ship_full_name || order.customer_name}</p>
              <p>{maskPhone(order.ship_phone || order.customer_phone)}</p>
              {order.ship_city && (
                <p>
                  {[order.ship_street, order.ship_city, order.ship_state, order.ship_country]
                    .filter(Boolean)
                    .join(", ")}
                  .
                </p>
              )}
            </div>

            <div className="text-right font-body text-sm text-neutral-800">
              {/* The order number is the invoice number: it is unique, it is
                  already on the customer's confirmation, and it is what they
                  quote when they pay. */}
              <p>Invoice No. {order.order_number}</p>
              <p className="mt-1">{issued}</p>
            </div>
          </div>

          {/* Items */}
          <div data-lenis-prevent className="invoice-items mt-10 overflow-x-auto">
            {/* `border-separate` rather than `collapse`: a collapsed table
                discards border-radius on its cells, and the heading row is a
                rounded white bar sitting on the page's green. */}
            <table className="w-full min-w-[30rem] border-separate border-spacing-y-1.5 text-left font-body">
              <thead>
                <tr className="text-sm text-neutral-900">
                  <th className="rounded-l-[6px] bg-white py-3.5 pl-5 pr-4 font-semibold">Item</th>
                  <th className="bg-white px-4 py-3.5 text-center font-semibold">Quantity</th>
                  <th className="bg-white px-4 py-3.5 text-center font-semibold">Unit Price</th>
                  <th className="rounded-r-[6px] bg-white py-3.5 pl-4 pr-5 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="align-top text-sm text-neutral-700">
                {items.map((item: any) => (
                  <tr key={item.id} style={{ backgroundColor: ROW }}>
                    <td className="rounded-l-[6px] py-3.5 pl-5 pr-4">
                      {item.name}
                      {item.variant_label && (
                        <span className="text-neutral-500"> ({item.variant_label})</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      {formatPrice(Number(item.unit_price))}
                    </td>
                    <td className="rounded-r-[6px] py-3.5 pl-4 pr-5 text-right tabular-nums">
                      {formatPrice(Number(item.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals — right aligned, green, exactly as the printed one. Kept
              whole: a total split across two pages is unreadable. */}
          <div className="invoice-totals mt-auto flex justify-end pt-16">
            <dl className="w-full max-w-xs space-y-3 font-body text-base">
              <div className="flex justify-between" style={{ color: GREEN }}>
                <dt>Sub-Total</dt>
                <dd className="tabular-nums">{formatPrice(Number(order.subtotal))}</dd>
              </div>

              {discount > 0 && (
                <div className="flex justify-between" style={{ color: GREEN }}>
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatPrice(discount)}</dd>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between" style={{ color: GREEN }}>
                  <dt>
                    VAT ({(Number(order.tax_rate) * 100).toFixed(1).replace(/\.0$/, "")}%)
                  </dt>
                  <dd className="tabular-nums">{formatPrice(tax)}</dd>
                </div>
              )}

              <div className="flex justify-between" style={{ color: GREEN }}>
                <dt>Shipping</dt>
                <dd className="tabular-nums">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>

              <div
                className="flex justify-between pt-2 text-lg font-bold"
                style={{ color: GREEN }}
              >
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(Number(order.total))}</dd>
              </div>
            </dl>
          </div>

          {/* Footer */}
          <footer className="mt-16 flex flex-wrap items-end justify-between gap-6 font-body text-sm">
            {/* The registered company, not the shop's trading name. An invoice
                is a tax document and names the party issuing it — a customer
                querying a payment months later needs to find a real entity. */}
            <div className="text-neutral-800">
              <p className="font-semibold text-neutral-900">{business.legalName}</p>
              <p>
                {[business.addressLine, business.city, business.country]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
              {business.rcNumber && <p>RC {business.rcNumber}</p>}
              {business.tin && <p>TIN {business.tin}</p>}
            </div>

            {/* Not on the printed template, but this invoice is the payment
                instrument — there is no card checkout — so it has to say what
                to do next. */}
            <div className="max-w-[38ch] text-right text-neutral-600">
              <p className="font-semibold" style={{ color: isPaid ? GREEN : undefined }}>
                {isPaid ? "Paid in full — thank you." : "Payment due on receipt"}
              </p>
              {!isPaid && (
                <p className="mt-1 text-xs">
                  Payable by bank transfer, quoting {order.order_number} as your reference.
                </p>
              )}
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

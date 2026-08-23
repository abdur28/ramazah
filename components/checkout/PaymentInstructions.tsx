"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * How to pay for an order that has not been paid.
 *
 * One component, used on the confirmation the moment an order is placed and
 * again on the order itself in the account area. Two copies would be two account
 * numbers to keep in step, and the account number is the one string on this site
 * where a stale value costs real money.
 *
 * The account number and the reference each get a copy button: both are typed
 * into a banking app by hand, and a mistyped reference is a payment nobody can
 * match to an order.
 *
 * Renders nothing once the order is settled — a paid order showing "transfer to
 * this account" invites a second payment.
 */
export default function PaymentInstructions({
  orderNumber,
  total,
  paymentStatus,
  className = "",
}: {
  orderNumber: string;
  total: number;
  paymentStatus: string;
  className?: string;
}) {
  const { formatPrice } = useCurrency();
  const { payment } = useSettings();
  const [copied, setCopied] = useState<string | null>(null);

  if (paymentStatus === "paid" || paymentStatus === "refunded") return null;

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success(`${label} copied.`);
    setTimeout(() => setCopied((current) => (current === label ? null : current)), 2000);
  };

  return (
    <section
      className={`rounded-sm border border-sage-deep/40 bg-wash/50 p-5 md:p-6 ${className}`}
    >
      <h2 className="font-heading text-2xl font-light text-foreground md:text-[28px]">
        Settle it by transfer
      </h2>
      <p className="mt-2 max-w-[62ch] font-body text-sm leading-relaxed text-ink-muted">
        We do not take card payment. This order is held, not yet being packed — it moves as soon
        as your transfer reaches us.
      </p>

      <dl className="mt-5 space-y-3">
        <Detail label="Bank" value={payment.bankName} />
        <Detail label="Account name" value={payment.accountName} />
        <Detail
          label="Account number"
          value={payment.accountNumber}
          mono
          onCopy={() => copy("Account number", payment.accountNumber)}
          copied={copied === "Account number"}
        />
        {payment.swift && <Detail label="SWIFT" value={payment.swift} mono />}
        <Detail
          label="Reference"
          value={orderNumber}
          mono
          hint="Quote this, or we cannot match your payment to this order."
          onCopy={() => copy("Reference", orderNumber)}
          copied={copied === "Reference"}
        />
        <Detail label="Amount" value={formatPrice(total)} mono />
      </dl>
    </section>
  );
}

function Detail({
  label,
  value,
  mono,
  hint,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule pb-2.5 last:border-0 last:pb-0">
      <dt className="w-32 shrink-0 font-body text-xs uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`font-body text-base text-foreground ${mono ? "tabular-nums tracking-wide" : ""}`}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash hover:text-sage-deep"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </dd>
      {hint && <p className="w-full font-body text-xs text-ink-faint sm:pl-36">{hint}</p>}
    </div>
  );
}

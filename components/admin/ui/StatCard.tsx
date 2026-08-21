"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/admin/format";

/**
 * One measurement.
 *
 * A stat is scanned, not read, so the value carries the weight and everything
 * else recedes: label in small caps above, one line of context below. Numbers
 * are tabular so a row of cards lines up on the digit rather than jittering.
 *
 * `href` makes the whole card a link when the number leads somewhere — the
 * previous version put an onClick on a div, which meant a keyboard could not
 * reach it and a middle-click could not open it in a tab.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Percent change against the previous period. Omit when there is nothing to compare. */
  trend?: number | null;
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "attention" ? "text-terra" : "text-sage"
            )}
          />
        )}
      </div>

      <p className="mt-3 font-body text-[28px] font-medium leading-none tabular-nums text-foreground">
        {value}
      </p>

      {(hint || typeof trend === "number") && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {typeof trend === "number" && <Trend value={trend} />}
          {hint && <span className="font-body text-xs text-ink-muted">{hint}</span>}
        </div>
      )}
    </>
  );

  const shell = cn(
    "block rounded-sm border bg-card p-5 transition-colors",
    tone === "attention" ? "border-terra/40" : "border-rule",
    href && "hover:border-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-deep"
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}

/**
 * Direction is carried by the arrow as well as the colour, so the badge still
 * says which way things went to someone who cannot separate sage from terra.
 */
function Trend({ value }: { value: number }) {
  const isUp = value >= 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-body text-xs font-medium tabular-nums",
        isUp ? "text-sage-deep" : "text-destructive"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatPercent(value)}
    </span>
  );
}

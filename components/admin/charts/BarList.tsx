"use client";

import Link from "next/link";
import { colorFor } from "./palette";
import { cn } from "@/lib/utils";

export interface BarRow {
  name: string;
  value: number;
  /** Rendered in place of the raw number — for money, or `12 sold`. */
  display?: string;
  href?: string;
  meta?: string;
}

/**
 * A ranked list where the bar is the background of the row, not a separate
 * column. Keeps the label readable at any width and lets long product names
 * truncate without the bar losing its scale.
 *
 * Every row responds to the pointer, not only the ones that lead somewhere: the
 * bar deepens and the row lifts onto a wash, which is what makes a long list
 * trackable across its width. Rows with an `href` say so with a shifting chevron
 * rather than by being the only ones that react — a hover state that means "this
 * is clickable" and a hover state that means "this is the row you are on" are
 * different jobs, and the previous version only had the first.
 */
export default function BarList({
  data,
  emptyMessage = "Nothing to show yet.",
  monochrome = true,
}: {
  data: BarRow[];
  emptyMessage?: string;
  monochrome?: boolean;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center font-body text-sm text-ink-muted">{emptyMessage}</p>;
  }

  const max = Math.max(...data.map((row) => row.value), 1);

  return (
    <ol className="space-y-0.5">
      {data.map((row, index) => {
        const width = Math.max((row.value / max) * 100, 2);
        const color = monochrome ? "#5C6647" : colorFor(row.name, index);

        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-sm opacity-[0.14] motion-safe:transition-[width,opacity] motion-safe:duration-300 group-hover:opacity-25"
              style={{ width: `${width}%`, backgroundColor: color }}
            />
            <span className="relative flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate font-body text-sm text-foreground">{row.name}</span>
              {row.meta && (
                <span className="shrink-0 font-body text-xs text-ink-muted">{row.meta}</span>
              )}
            </span>
            <span className="relative shrink-0 font-body text-sm font-medium tabular-nums text-foreground">
              {row.display ?? row.value.toLocaleString("en-NG")}
            </span>
            {row.href && (
              <span
                aria-hidden
                className="relative shrink-0 font-body text-sm text-sage-deep opacity-0 motion-safe:transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                ›
              </span>
            )}
          </>
        );

        const shell = cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-sm px-3 py-2.5",
          "motion-safe:transition-colors hover:bg-wash/50",
          row.href &&
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sage-deep"
        );

        return (
          <li key={`${row.name}-${index}`}>
            {row.href ? (
              <Link href={row.href} className={shell} title={row.name}>
                {inner}
              </Link>
            ) : (
              <div className={shell} title={row.name}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

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
    <ol className="space-y-1.5">
      {data.map((row, index) => {
        const width = Math.max((row.value / max) * 100, 2);
        const color = monochrome ? "#5C6647" : colorFor(row.name, index);

        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-sm opacity-[0.14] transition-[width] duration-500"
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
          </>
        );

        const shell = cn(
          "relative flex items-center gap-3 overflow-hidden rounded-sm px-3 py-2.5",
          row.href && "transition-colors hover:bg-wash"
        );

        return (
          <li key={`${row.name}-${index}`}>
            {row.href ? (
              <Link href={row.href} className={shell}>
                {inner}
              </Link>
            ) : (
              <div className={shell}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

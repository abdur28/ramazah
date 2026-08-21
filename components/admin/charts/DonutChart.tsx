"use client";

import { useId } from "react";
import { colorFor } from "./palette";
import { formatNumber } from "@/lib/admin/format";

export interface Slice {
  name: string;
  value: number;
}

/**
 * A donut, drawn as one SVG circle per slice using `stroke-dasharray`.
 *
 * The centre carries the total, which is the number a donut is usually being
 * read for anyway, and the legend carries name, value and share — so the chart
 * is fully readable without matching any colour to any label.
 */
export default function DonutChart({
  data,
  total: totalOverride,
  totalLabel = "Total",
  valueSuffix,
}: {
  data: Slice[];
  total?: number;
  totalLabel?: string;
  valueSuffix?: string;
}) {
  const gradientId = useId();
  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const displayTotal = totalOverride ?? total;

  // r chosen so the circumference is a round 100 units: dasharray is then a
  // percentage directly, which keeps the arithmetic below honest.
  const radius = 100 / (2 * Math.PI);
  let offset = 25; // rotate the start to 12 o'clock

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox="0 0 40 40" className="h-40 w-40 -rotate-90" role="presentation">
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="transparent"
            stroke="var(--rule)"
            strokeWidth="4"
          />
          {total > 0 &&
            slices.map((slice, index) => {
              const share = (slice.value / total) * 100;
              const circle = (
                <circle
                  key={`${gradientId}-${slice.name}`}
                  cx="20"
                  cy="20"
                  r={radius}
                  fill="transparent"
                  stroke={colorFor(slice.name, index)}
                  strokeWidth="4"
                  strokeDasharray={`${share} ${100 - share}`}
                  strokeDashoffset={offset}
                />
              );
              offset -= share;
              return circle;
            })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-body text-2xl font-medium tabular-nums text-foreground">
            {formatNumber(displayTotal)}
          </span>
          <span className="font-body text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            {totalLabel}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {data.map((slice, index) => (
          <li key={slice.name} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[1px]"
              style={{ backgroundColor: colorFor(slice.name, index) }}
            />
            <span className="min-w-0 flex-1 truncate font-body text-sm text-ink-muted">
              {slice.name}
            </span>
            <span className="shrink-0 font-body text-sm font-medium tabular-nums text-foreground">
              {formatNumber(slice.value)}
              {valueSuffix}
            </span>
            <span className="w-12 shrink-0 text-right font-body text-xs tabular-nums text-ink-muted">
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { colorFor } from "./palette";
import { formatNumber } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export interface Slice {
  name: string;
  value: number;
}

/**
 * A donut, drawn as one SVG circle per slice using `stroke-dasharray`.
 *
 * The centre carries the total, which is the number a donut is usually being
 * read for, and the legend carries name, value and share — so the chart is
 * fully readable standing still, without matching any colour to any label.
 *
 * Hover then does the thing a legend cannot: it ties the two halves together.
 * Pointing at an arc dims the rest and swaps the centre to that slice's value;
 * pointing at a legend row does the same, which is what makes the pairing
 * learnable when two sage tints sit next to each other. The legend rows are
 * buttons, so the same highlighting is reachable by keyboard.
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
  const [active, setActive] = useState<string | null>(null);

  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const displayTotal = totalOverride ?? total;

  const activeSlice = active ? data.find((slice) => slice.name === active) ?? null : null;

  // r chosen so the circumference is a round 100 units: dasharray is then a
  // percentage directly, which keeps the arithmetic below honest.
  const radius = 100 / (2 * Math.PI);
  let offset = 25; // rotate the start to 12 o'clock

  return (
    <div
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8"
      onPointerLeave={() => setActive(null)}
    >
      <div className="relative shrink-0">
        <svg viewBox="0 0 40 40" className="h-40 w-40 -rotate-90" aria-hidden>
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
              const isActive = active === slice.name;
              const isDimmed = active !== null && !isActive;

              const circle = (
                <circle
                  key={`${gradientId}-${slice.name}`}
                  cx="20"
                  cy="20"
                  r={radius}
                  fill="transparent"
                  stroke={colorFor(slice.name, index)}
                  // The active arc thickens outward rather than changing hue,
                  // so the colour still matches its legend swatch exactly.
                  strokeWidth={isActive ? 5.5 : 4}
                  strokeOpacity={isDimmed ? 0.28 : 1}
                  strokeDasharray={`${share} ${100 - share}`}
                  strokeDashoffset={offset}
                  className="motion-safe:transition-all motion-safe:duration-150"
                  style={{ cursor: "pointer" }}
                  onPointerEnter={() => setActive(slice.name)}
                />
              );
              offset -= share;
              return circle;
            })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="font-body text-2xl font-medium tabular-nums text-foreground">
            {formatNumber(activeSlice ? activeSlice.value : displayTotal)}
            {activeSlice ? valueSuffix : ""}
          </span>
          <span className="mt-0.5 line-clamp-2 font-body text-[10px] uppercase leading-tight tracking-[0.14em] text-ink-muted">
            {activeSlice ? activeSlice.name : totalLabel}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-0.5">
        {data.map((slice, index) => {
          const isActive = active === slice.name;

          return (
            <li key={slice.name}>
              <button
                type="button"
                onPointerEnter={() => setActive(slice.name)}
                onFocus={() => setActive(slice.name)}
                onBlur={() => setActive(null)}
                aria-pressed={isActive}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left motion-safe:transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sage-deep",
                  isActive ? "bg-wash/60" : "hover:bg-wash/60"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-[1px] motion-safe:transition-transform",
                    isActive && "scale-125"
                  )}
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
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

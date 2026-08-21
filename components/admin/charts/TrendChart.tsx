"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * An area chart over a real series.
 *
 * The dashboard's "Customer Growth" chart plotted exactly two points — last
 * month and now — which is a line between two numbers rather than a trend, and
 * it filled a full 320px panel to say it. This takes whatever series it is
 * given and refuses to draw at all below two points, where the caller should be
 * showing a number instead.
 *
 * **Hovering matters more here than on the other two charts.** A donut carries
 * every value in its legend, so it reads fine standing still; a twelve-month
 * line without hover shows the first label and the last value and gives you no
 * way at all to read March. The pointer picks the nearest month, and the same
 * selection is reachable with arrow keys — the caption doubles as the readout,
 * so the figure is never *only* a hover away from being legible.
 */
export default function TrendChart({
  data,
  valueFormatter = (value: number) => value.toLocaleString("en-NG"),
  height = 200,
  color = "#5C6647",
}: {
  data: TrendPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
  color?: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <p className="py-10 text-center font-body text-sm text-ink-muted">
        Not enough history yet — this fills in as orders come through.
      </p>
    );
  }

  const width = 600;
  const padding = { top: 12, right: 4, bottom: 4, left: 4 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((point) => point.value), 1);
  const step = innerWidth / (data.length - 1);

  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + index * step,
    y: padding.top + innerHeight - (point.value / max) * innerHeight,
  }));

  const line = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = `${padding.left},${padding.top + innerHeight} ${line} ${padding.left + innerWidth},${padding.top + innerHeight}`;

  const lastIndex = points.length - 1;
  // With nothing hovered the endpoint is what the chart is being read for, so
  // that is what the caption shows.
  const shown = points[active ?? lastIndex];

  /**
   * The SVG is stretched to the container width, so a pointer's x maps to the
   * series by fraction rather than by SVG units. Nearest point wins, which is
   * what makes the whole plot area a target instead of twelve small dots.
   */
  const pick = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = (clientX - rect.left) / rect.width;
    const index = Math.round(fraction * lastIndex);
    setActive(Math.min(Math.max(index, 0), lastIndex));
  };

  const move = (index: number) => setActive(Math.min(Math.max(index, 0), lastIndex));

  return (
    <figure className="m-0">
      <div
        role="application"
        tabIndex={0}
        aria-label={`Trend from ${data[0].label} to ${data[lastIndex].label}. Use the arrow keys to step through it.`}
        className="relative cursor-crosshair rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2"
        onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
        onPointerDown={(event) => pick(event.clientX, event.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move((active ?? lastIndex) + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            move((active ?? lastIndex) - 1);
          } else if (event.key === "Home") {
            event.preventDefault();
            move(0);
          } else if (event.key === "End") {
            event.preventDefault();
            move(lastIndex);
          } else if (event.key === "Escape") {
            setActive(null);
          }
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.20" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Three faint gridlines, enough to read height against, few enough to ignore. */}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={padding.left}
              x2={padding.left + innerWidth}
              y1={padding.top + innerHeight * fraction}
              y2={padding.top + innerHeight * fraction}
              stroke="var(--rule)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <polygon points={area} fill={`url(#${gradientId})`} />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Crosshair on the picked month. */}
          {active !== null && (
            <line
              x1={points[active].x}
              x2={points[active].x}
              y1={padding.top}
              y2={padding.top + innerHeight}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.45"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* The endpoint stays marked even while another month is picked, so
              the "where we are now" reference never disappears under the cursor. */}
          <circle
            cx={points[lastIndex].x}
            cy={points[lastIndex].y}
            r="3.5"
            fill={color}
            vectorEffect="non-scaling-stroke"
          />

          {active !== null && active !== lastIndex && (
            <circle
              cx={points[active].x}
              cy={points[active].y}
              r="4"
              fill="var(--card)"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* The tooltip is HTML rather than SVG text: it inherits the type scale,
            wraps, and is not distorted by preserveAspectRatio="none". */}
        {active !== null && (
          <div
            className={cn(
              "pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-sm border border-rule bg-card px-2.5 py-1.5 shadow-sm",
              // Clamped at the ends so the panel never overhangs the card.
              active === 0
                ? "translate-x-0"
                : active === lastIndex
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            )}
            style={{
              left: `${(points[active].x / width) * 100}%`,
              top: `${(points[active].y / height) * 100}%`,
              marginTop: "-10px",
            }}
          >
            <p className="font-body text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {points[active].label}
            </p>
            <p className="font-body text-sm font-medium tabular-nums text-foreground">
              {valueFormatter(points[active].value)}
            </p>
          </div>
        )}
      </div>

      <figcaption className="mt-3 flex items-baseline justify-between gap-3 font-body text-xs text-ink-muted">
        <span>{data[0].label}</span>
        <span
          aria-live="polite"
          className="text-center font-medium tabular-nums text-foreground"
        >
          {shown.label} · {valueFormatter(shown.value)}
        </span>
        <span>{data[lastIndex].label}</span>
      </figcaption>
    </figure>
  );
}

"use client";

import { useId } from "react";

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
 * given and refuses to draw at all below three points, where the caller should
 * be showing a number instead.
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
  const last = points[points.length - 1];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trend from ${data[0].label} to ${data[data.length - 1].label}`}
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
        {/* The endpoint is emphasised: on a trend it is the number being looked for. */}
        <circle cx={last.x} cy={last.y} r="3.5" fill={color} vectorEffect="non-scaling-stroke" />
      </svg>

      <figcaption className="mt-3 flex items-baseline justify-between font-body text-xs text-ink-muted">
        <span>{data[0].label}</span>
        <span className="font-medium tabular-nums text-foreground">
          {valueFormatter(last.value)}
        </span>
        <span>{data[data.length - 1].label}</span>
      </figcaption>
    </figure>
  );
}

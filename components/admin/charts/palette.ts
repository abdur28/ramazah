/**
 * Chart colours, drawn from the design system rather than a chart library's.
 *
 * The admin's charts came from Tremor and used its named palette — blue,
 * emerald, fuchsia, violet, amber. Five hues that appear nowhere else in
 * Ramazah, on a page otherwise built from sage and terracotta. They were the
 * loudest thing in the admin and none of them meant anything.
 *
 * The order matters: adjacent entries are separable by lightness as well as
 * hue, so a donut still reads when two segments touch. Every chart pairs its
 * colours with a labelled legend carrying the value, so nothing depends on
 * telling sage from sage-light.
 */
export const SERIES = [
  "#5C6647", // sage-deep
  "#B4633E", // terra
  "#A3AB8C", // sage-light
  "#6B7060", // ink-muted
  "#8A9276", // sage
  "#3E4436", // ink, lightened
] as const;

/** Colours for the states that already have a meaning elsewhere in the admin. */
export const STATE_COLOR: Record<string, string> = {
  pending: "#B4633E",     // terra — needs attention
  processing: "#8A9276",
  shipped: "#A3AB8C",
  delivered: "#5C6647",   // sage-deep — the good end
  cancelled: "#9B3B2E",   // danger
  refunded: "#6B7060",

  paid: "#5C6647",
  unpaid: "#B4633E",
  failed: "#9B3B2E",

  "in stock": "#5C6647",
  "low stock": "#B4633E",
  "out of stock": "#9B3B2E",
};

export function colorFor(name: string, index: number): string {
  return STATE_COLOR[name.toLowerCase()] ?? SERIES[index % SERIES.length];
}

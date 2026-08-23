/**
 * Paging, in one place.
 *
 * Fifty rows a page across the admin. The number is not sacred, but having a
 * single one is: a screen that pages at 50 while its neighbour pages at 20 and
 * a third loads everything is three different mental models for the same
 * gesture.
 *
 * The pieces here are deliberately dumb — a range, a count, a window of page
 * numbers, a safe search pattern. What makes paging correct is not this file
 * but the rule it depends on: **the totals on screen must be counted in the
 * database, not over the loaded page**. See migration 20260830000035.
 */

export const PAGE_SIZE = 50;

/** Pages are 1-based on screen; ranges are 0-based in PostgREST. */
export function rangeFor(page: number, size: number = PAGE_SIZE): [number, number] {
  const first = Math.max(0, (Math.max(1, page) - 1) * size);
  return [first, first + size - 1];
}

export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** `1 … 4 5 6 … 20` — first, last, and the neighbours of where you are. */
export function windowed(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const near = new Set([1, totalPages, page, page - 1, page + 1]);
  // Keep the control a steady width near the ends, where the window would
  // otherwise have nothing on one side of it.
  if (page <= 3) [2, 3, 4].forEach((n) => near.add(n));
  if (page >= totalPages - 2)
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => near.add(n));

  const shown = [...near].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  shown.forEach((n, index) => {
    if (index > 0 && n - shown[index - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/**
 * A search term made safe to sit inside a PostgREST `or=(...)` filter.
 *
 * This matters more than it looks. Search moved from the browser to the
 * database when the lists were paged, and `or()` takes its arguments as one
 * comma-separated string: a customer named `Musa, Idris` or an order note with
 * a bracket in it would otherwise be spliced into the filter as extra
 * conditions, and the request comes back as a 400 or, worse, as the wrong rows.
 *
 * Commas and parentheses are the separators, so they go. `%` and `_` are
 * wildcards in LIKE, so searching for `50%` would match far more than it should
 * — they are escaped rather than dropped, because they are legitimate
 * characters to look for. A `\` has to be doubled first or it would escape the
 * escapes.
 */
export function searchPattern(term: string): string {
  const cleaned = term
    .trim()
    .replace(/[\\]/g, "\\\\")
    .replace(/[%_]/g, (ch) => `\\${ch}`)
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `%${cleaned}%`;
}

/**
 * PostgREST's code for "you asked for rows past the end of the result".
 *
 * Worth knowing about, because a page that no longer exists is not a
 * hypothetical. Stand on page six, then approve the last few reviews on it, or
 * refresh after somebody else cleared a queue: the offset is now past the end
 * and the request comes back **416 Requested range not satisfiable** — an error
 * toast and an empty screen, on a list that plainly still has rows in it.
 */
export const RANGE_PAST_END = 'PGRST103';

/**
 * Run a paged query, and if that page has ceased to exist, run it again at the
 * first one.
 *
 * The returned `page` is the page actually fetched, which is what the pager
 * must be told — reporting the page that was asked for would leave the control
 * highlighting a page whose rows are not the ones on screen.
 */
export async function fetchPage<R extends { error: { code?: string } | null }>(
  page: number,
  // PromiseLike rather than Promise: a PostgREST builder is a thenable, and
  // awaiting it is what sends the request.
  run: (page: number) => PromiseLike<R>
): Promise<R & { page: number }> {
  const result = await run(page);

  if (page > 1 && result.error?.code === RANGE_PAST_END) {
    return { ...(await run(1)), page: 1 };
  }

  return { ...result, page };
}

/** `col.ilike.%term%,col2.ilike.%term%` for PostgREST's `or()`. */
export function ilikeAny(columns: string[], term: string): string {
  const pattern = searchPattern(term);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}

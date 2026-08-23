"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, pageCount, windowed } from "@/lib/paging";
import { formatNumber } from "@/lib/admin/format";

/**
 * The pager.
 *
 * Buttons, not links — the opposite of the storefront's
 * `CategoryPagination`, and for the opposite reason. A shelf's page belongs in
 * the URL so it can be shared and crawled. These lists' filters are local state
 * already, and putting only the page number in the address bar would give you a
 * link that restores where you were in a list but not which list.
 *
 * Shared by the admin and the customer's own account pages, which is why it
 * lives here rather than under `admin/`.
 *
 * It says what you are looking at as well as offering the next page:
 * "51–100 of 1,284". Without the total, paging is a walk in the dark — you find
 * out how long the list is by reaching the end of it.
 */
export default function Pager({
  page,
  total,
  size = PAGE_SIZE,
  busy = false,
  onChange,
  noun = "rows",
}: {
  page: number;
  total: number;
  size?: number;
  busy?: boolean;
  onChange: (page: number) => void;
  /** Plural, for the count line: "of 1,284 orders". */
  noun?: string;
}) {
  const pages = pageCount(total, size);
  const first = total === 0 ? 0 : (page - 1) * size + 1;
  const last = Math.min(page * size, total);

  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-sm border px-3 font-body text-sm tabular-nums transition-colors disabled:pointer-events-none";

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="font-body text-xs tabular-nums text-ink-muted" aria-live="polite">
        {busy && <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin align-[-1px]" />}
        {total === 0
          ? `No ${noun}`
          : `${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)} ${noun}`}
      </p>

      {/* One page is not a pager. The count line above stays, because knowing
          there are eleven orders is useful even when they all fit. */}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page === 1 || busy}
            aria-label="Previous page"
            className={cn(
              base,
              page === 1
                ? "border-rule text-ink-faint"
                : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {windowed(page, pages).map((entry, index) =>
            entry === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1 font-body text-sm text-ink-muted"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onChange(entry)}
                disabled={busy}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  base,
                  entry === page
                    ? "border-sage-deep bg-sage-deep text-background"
                    : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
                )}
              >
                {entry}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page === pages || busy}
            aria-label="Next page"
            className={cn(
              base,
              page === pages
                ? "border-rule text-ink-faint"
                : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

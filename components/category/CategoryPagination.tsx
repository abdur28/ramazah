"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { windowed } from "@/lib/paging"

/**
 * Pages, as links.
 *
 * Links rather than buttons because the page is in the URL: it is shareable,
 * the back button walks the pages, and a crawler can reach every product on a
 * long shelf. A grid paged by client state has none of that.
 *
 * The window keeps first and last always visible with an ellipsis between, so
 * the control is a fixed width whether the shelf has three pages or ninety.
 */
export default function CategoryPagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null

  const pages = windowed(page, totalPages)

  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-sm border px-3 font-body text-sm tabular-nums transition-colors"

  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(page - 1)}
        aria-label="Previous page"
        aria-disabled={page === 1}
        // A disabled link is still focusable and still navigates, so the first
        // page points at itself rather than pretending to be inert.
        className={cn(
          base,
          page === 1
            ? "pointer-events-none border-rule text-ink-faint"
            : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 font-body text-sm text-ink-faint"
          >
            &hellip;
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              base,
              entry === page
                ? "border-sage-deep bg-sage-deep text-background"
                : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
            )}
          >
            {entry}
          </Link>
        )
      )}

      <Link
        href={hrefFor(page + 1)}
        aria-label="Next page"
        aria-disabled={page === totalPages}
        className={cn(
          base,
          page === totalPages
            ? "pointer-events-none border-rule text-ink-faint"
            : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  )
}

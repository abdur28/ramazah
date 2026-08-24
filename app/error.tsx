"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCcw } from "lucide-react";

/**
 * When a page throws.
 *
 * Without this file Next shows its own error screen — in development a stack
 * trace, in production a bare "Application error: a client-side exception has
 * occurred". Neither tells a customer what to do, and the production one does
 * not even say which shop it belongs to.
 *
 * Two things it must do that a message alone cannot. **`reset()`** re-renders
 * the segment, which fixes the common case: a dropped connection on a page that
 * would work perfectly on a second attempt. And it shows the **digest** — the
 * id Next assigns to the server-side error — because that is the only string
 * that connects what the customer saw to what the logs recorded.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server logs its own; this is the browser half.
    console.error("[page]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 pb-24 pt-32 md:pt-40">
      <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        Something broke
      </p>

      <h1 className="mt-4 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
        That did not load.
      </h1>

      <p className="mt-4 max-w-[52ch] font-body text-sm leading-relaxed text-ink-muted">
        Our end, not yours. Trying again usually works — most of these are a
        connection that dropped halfway.
      </p>

      <div className="mt-10 flex flex-col gap-3 border-t border-rule pt-8 sm:flex-row sm:items-center sm:gap-x-8">
        <button
          type="button"
          onClick={reset}
          className="group inline-flex items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          Back to the shop
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      <p className="mt-10 max-w-[52ch] font-body text-xs leading-relaxed text-ink-muted">
        If it keeps happening, tell us and we will look. Nothing you were doing
        was lost — an order is only placed once you have seen it confirmed.
      </p>

      {/* The one string that ties this screen to a line in the logs. */}
      {error.digest && (
        <p className="mt-3 font-body text-xs text-ink-muted">
          Reference <code className="rounded-sm bg-wash px-1.5 py-0.5 tabular-nums">{error.digest}</code>
        </p>
      )}
    </main>
  );
}

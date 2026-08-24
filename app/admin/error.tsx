"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/admin/ui/EmptyState";

/**
 * When an admin screen throws.
 *
 * Scoped here rather than left to `app/error.tsx` so the sidebar survives: an
 * admin who hits an error still needs to get to the other screens, and the
 * root boundary would replace the whole admin shell with a storefront page.
 *
 * It shows more than the customer-facing one does, on purpose. The person
 * reading this is the person who can act on it — the message and the digest are
 * useful to them, where on the shop they would be noise.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="py-10">
      <EmptyState
        icon={AlertTriangle}
        title="This screen did not load"
        description={
          error.message ||
          "Something failed on the way here. Trying again usually clears it."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={reset}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Back to the dashboard</Link>
            </Button>
          </div>
        }
      />

      {error.digest && (
        <p className="mt-6 text-center font-body text-xs text-ink-muted">
          Reference{" "}
          <code className="rounded-sm bg-wash px-1.5 py-0.5 tabular-nums">{error.digest}</code>
          {" — quote this if you report it."}
        </p>
      )}
    </div>
  );
}

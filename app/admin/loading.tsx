import { Loader2 } from "lucide-react";

/**
 * The admin's own wait.
 *
 * Separate from the storefront's so the sidebar stays put while a screen loads
 * — the admin is navigated far more than it is arrived at, and a shell that
 * disappears on every click feels broken.
 */
export default function AdminLoading() {
  return (
    <div
      className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Loading…
    </div>
  );
}

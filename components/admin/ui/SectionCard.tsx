import { cn } from "@/lib/utils";

/**
 * A titled panel. The admin's one container.
 *
 * `flush` drops the body padding for panels whose content is a table — a table
 * inside a padded card gets a double gutter and its hairlines stop meeting the
 * card edge, which is what made the old order and collection lists look
 * misaligned.
 */
export default function SectionCard({
  title,
  description,
  action,
  children,
  flush = false,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("rounded-sm border border-rule bg-card", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 font-body text-sm text-ink-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

import { cn } from "@/lib/utils";

/**
 * The top of every admin screen.
 *
 * Every page used to write its own header, and they had drifted: some had an
 * uppercase Cormorant at 24px (below the 28px floor the design system sets for
 * a light serif), some a bold Jost, one none at all. One component means the
 * whole area reads as one product.
 *
 * The eyebrow is the section name and the title is the page — so a screen deep
 * in the admin still says where it sits without a breadcrumb component.
 */
export default function PageHeader({
  eyebrow = "Admin",
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          {eyebrow}
        </p>
        {/* Cormorant at 32/36px — the display face is legal here, not at 24. */}
        <h1 className="mt-1.5 font-heading text-[32px] font-light leading-none tracking-[0.02em] text-foreground md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[65ch] font-body text-sm text-ink-muted">{description}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

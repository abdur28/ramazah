import { cn } from "@/lib/utils";

/**
 * Nothing here — and why.
 *
 * An empty queue and a filtered-to-nothing list are different situations and
 * used to render identically ("No products found"), so the shopkeeper could not
 * tell an empty catalogue from an active filter. Callers pass the reason.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-dashed border-rule bg-card px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-wash">
          <Icon className="h-5 w-5 text-sage" />
        </span>
      )}
      <p className="font-body text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[46ch] font-body text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import {
  AlertTriangle,
  Archive,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Package,
  PackageX,
  ReceiptText,
  RotateCcw,
  Search,
  Shield,
  ShoppingBag,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The admin's whole status vocabulary, in one table.
 *
 * Every screen used to build its own badge — six copies of an order-status map,
 * two of a payment map, ad-hoc `<Badge>`s elsewhere — and they disagreed. The
 * dashboard rendered `shipped` and `delivered` in the same default variant, so
 * the two states a shopkeeper most needs to tell apart looked identical.
 *
 * Two rules hold here. Each state pairs an icon with its word, because the
 * design system forbids colour carrying meaning alone (terracotta and danger sit
 * close on hue). And nothing uses sage as a background behind a light label:
 * sage measures 3.09:1, so a filled pill is sage-deep and a tinted one takes
 * ink.
 */
type Tone = "neutral" | "progress" | "done" | "attention" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-wash/60 text-ink-muted ring-rule",
  progress: "bg-wash text-sage-deep ring-sage/40",
  done: "bg-sage-deep text-background ring-transparent",
  attention: "bg-terra/10 text-terra-ink ring-terra/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/30",
};

type Definition = { label: string; icon: LucideIcon; tone: Tone };

export const ORDER_STATUS: Record<string, Definition> = {
  pending:    { label: "Pending",    icon: Clock,        tone: "attention" },
  processing: { label: "Processing", icon: Package,      tone: "progress" },
  shipped:    { label: "Shipped",    icon: Truck,        tone: "progress" },
  delivered:  { label: "Delivered",  icon: CheckCircle2, tone: "done" },
  cancelled:  { label: "Cancelled",  icon: X,            tone: "danger" },
  refunded:   { label: "Refunded",   icon: RotateCcw,    tone: "neutral" },
};

export const PAYMENT_STATUS: Record<string, Definition> = {
  pending:  { label: "Unpaid",   icon: Hourglass,   tone: "attention" },
  paid:     { label: "Paid",     icon: Check,       tone: "done" },
  failed:   { label: "Failed",   icon: AlertTriangle, tone: "danger" },
  refunded: { label: "Refunded", icon: RotateCcw,   tone: "neutral" },
};

export const REVIEW_STATUS: Record<string, Definition> = {
  pending:  { label: "Awaiting review", icon: Clock, tone: "attention" },
  approved: { label: "Published",       icon: Check, tone: "done" },
  rejected: { label: "Rejected",        icon: X,     tone: "danger" },
};

export const REQUEST_STATUS: Record<string, Definition> = {
  asked:     { label: "With us",   icon: Search,      tone: "attention" },
  quoted:    { label: "Quoted",    icon: ReceiptText, tone: "progress" },
  buying:    { label: "Buying",    icon: ShoppingBag, tone: "progress" },
  fulfilled: { label: "Fulfilled", icon: Check,       tone: "done" },
  declined:  { label: "Declined",  icon: X,           tone: "danger" },
};

export const PRODUCT_STATUS: Record<string, Definition> = {
  draft:    { label: "Draft",    icon: FileText, tone: "neutral" },
  active:   { label: "Live",     icon: Check,    tone: "done" },
  archived: { label: "Archived", icon: Archive,  tone: "neutral" },
};

export const STOCK_STATUS: Record<string, Definition> = {
  in:   { label: "In stock",    icon: Check,          tone: "progress" },
  low:  { label: "Low stock",   icon: AlertTriangle,  tone: "attention" },
  out:  { label: "Out of stock", icon: PackageX,      tone: "danger" },
};

export const ACCOUNT_STATUS: Record<string, Definition> = {
  active:   { label: "Active",    icon: Check, tone: "progress" },
  inactive: { label: "Suspended", icon: Ban,   tone: "danger" },
};

export const ROLE: Record<string, Definition> = {
  admin: { label: "Admin",    icon: Shield, tone: "done" },
  user:  { label: "Customer", icon: User,   tone: "neutral" },
};

export default function StatusPill({
  status,
  map,
  className,
}: {
  status: string | null | undefined;
  map: Record<string, Definition>;
  className?: string;
}) {
  const key = String(status ?? "").toLowerCase();
  const definition: Definition = map[key] ?? {
    label: status ? String(status) : "Unknown",
    icon: Clock,
    tone: "neutral",
  };
  const Icon = definition.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-body text-[11px] font-medium uppercase tracking-[0.08em] ring-1 ring-inset",
        TONES[definition.tone],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {definition.label}
    </span>
  );
}

/** The stock bucket a product falls in, used by the catalogue and the dashboard. */
export function stockBucket(inStock: boolean, total: number, threshold = 10): "in" | "low" | "out" {
  if (!inStock || total <= 0) return "out";
  return total < threshold ? "low" : "in";
}

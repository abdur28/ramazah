"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AuthUser } from "@/lib/auth/server";
import { motion } from "framer-motion";
import {
  BarChart3,
  Coins,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Package,
  Search,
  ShoppingCart,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import useAdminQueues, { type QueueCounts } from "@/hooks/admin/useAdminQueues";

/**
 * The admin shell.
 *
 * Three things changed from the version inherited with the storefront.
 *
 * It no longer lies about where it can go: `Pages` and `Settings` pointed at
 * `/admin/pages` and `/admin/settings`, neither of which exists, so two of the
 * thirteen links in the sidebar were 404s.
 *
 * Thirteen flat links became five named groups. A flat list gives no clue that
 * Categories and Collections are two halves of the same job, and puts Analytics
 * — opened weekly — next to Orders, opened hourly.
 *
 * And the active item is legible. It was `bg-sage-deep` with `text-foreground`:
 * ink on deep sage, 2.28:1. That is the exact pairing the design system exists
 * to prevent, and it was already fixed on the customer side; the admin kept the
 * old copy. Active items are cream on sage-deep at 5.78:1.
 */
type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Which backlog, if any, badges this item. */
  badge?: keyof QueueCounts;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Catalogue",
    items: [
      { name: "Products", href: "/admin/products", icon: Package, badge: "lowStock" },
      { name: "Categories", href: "/admin/categories", icon: FolderTree },
      { name: "Collections", href: "/admin/collections", icon: Images },
    ],
  },
  {
    label: "Selling",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart, badge: "ordersPending" },
      { name: "Payments", href: "/admin/transactions", icon: Coins },
      { name: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "Waiting on you",
    items: [
      { name: "Requests", href: "/admin/requests", icon: Search, badge: "requestsOpen" },
      { name: "Reviews", href: "/admin/reviews", icon: MessageSquare, badge: "reviewsPending" },
    ],
  },
  {
    label: "Reach",
    items: [
      { name: "Mailer", href: "/admin/mailer", icon: Mail },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const AdminLayout = ({ authUser }: { authUser: AuthUser }) => {
  const pathname = usePathname();
  const { signOut, user, profile, isAdmin } = useAuth();
  const { counts } = useAdminQueues();

  if (!user || !profile) return null;

  if (user?.id !== authUser.uid) {
    redirect("/auth/login?redirect=/admin");
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const displayName = profile?.displayName || user.email?.split("@")[0] || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  // `/admin` would otherwise match every child route with a prefix test.
  const isCurrent = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Phone and tablet: one scrolling row of chips, mirroring the account area. */}
      <div className="fixed inset-x-0 top-16 z-40 border-b border-rule bg-card md:top-20 lg:hidden print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
          {ALL_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.href);
            const badge = item.badge ? counts[item.badge] : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 font-body text-[13px] transition-colors",
                  active
                    ? "bg-sage-deep text-background"
                    : "text-ink-muted hover:bg-wash/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
                {badge > 0 && <Badge count={badge} active={active} />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="fixed bottom-0 left-0 top-20 hidden w-72 flex-col border-r border-rule bg-card lg:flex print:hidden">
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border-b border-rule pb-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wash font-body text-sm text-sage-deep">
                {profile?.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt=""
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-body text-sm text-foreground">{displayName}</span>
                  <span className="shrink-0 rounded-sm bg-sage-deep px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.12em] text-background">
                    Admin
                  </span>
                </span>
                <span className="block truncate font-body text-xs text-ink-muted">
                  {profile?.email}
                </span>
              </span>
            </div>
          </motion.div>

          <nav className="space-y-6">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.label}>
                <h2 className="mb-2 px-3 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                  {group.label}
                </h2>

                <div className="space-y-0.5">
                  {group.items.map((item, index) => {
                    const Icon = item.icon;
                    const active = isCurrent(item.href);
                    const badge = item.badge ? counts[item.badge] : 0;

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * 3 + index) * 0.03 }}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-sm px-3 py-2.5 font-body text-sm transition-colors",
                            active
                              ? "bg-sage-deep text-background"
                              : "text-ink-muted hover:bg-wash/60 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {badge > 0 && <Badge count={badge} active={active} />}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="space-y-0.5 border-t border-rule p-3">
          {/* The way back to the shop. Every admin needs to check what a change did. */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-sm px-3 py-2.5 font-body text-sm text-ink-muted transition-colors hover:bg-wash/60 hover:text-foreground"
          >
            <Store className="h-4 w-4" />
            View store
          </Link>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 font-body text-sm text-ink-muted transition-colors hover:bg-wash hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

/**
 * A backlog count. Terracotta is the urgency colour and this is the one place in
 * the shell that earns it.
 *
 * On the active row the badge inverts to cream-on-sage-deep rather than tinting
 * the sage: a translucent light fill over sage-deep lands around 3.7:1 against
 * its own cream label, which is the same trap the active nav item itself used to
 * fall into.
 */
function Badge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "min-w-[1.25rem] shrink-0 rounded-sm px-1 py-0.5 text-center font-body text-[10px] font-medium tabular-nums",
        active ? "bg-background text-sage-deep" : "bg-terra/12 text-terra-ink"
      )}
      title={`${count} waiting`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default AdminLayout;

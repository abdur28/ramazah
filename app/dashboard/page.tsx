'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Heart, ArrowRight, Truck, CheckCircle2, Clock, ShoppingBag, Wallet, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Order } from '@/types/types';
import { format } from 'date-fns';

/**
 * Account overview.
 *
 * Statuses pair an icon with the word, never colour alone, and every figure on
 * the page goes through `formatPrice` — order totals used to render as
 * "NGN 12500.00", which is neither the site's format nor a readable one.
 */
const statusStyles: Record<string, { className: string; icon: typeof Package }> = {
  delivered:  { className: 'bg-success/10 text-success',        icon: CheckCircle2 },
  shipped:    { className: 'bg-sage-deep/10 text-sage-deep',    icon: Truck },
  processing: { className: 'bg-warning/10 text-warning',        icon: Package },
  pending:    { className: 'bg-warning/10 text-warning',        icon: Clock },
  cancelled:  { className: 'bg-destructive/10 text-destructive', icon: XCircle },
  refunded:   { className: 'bg-wash text-ink-muted',            icon: Package },
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'd MMM yyyy');
  } catch {
    return '';
  }
};

const isThisMonth = (timestamp: any) => {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const {
    orders,
    fetchUserOrders,
    isLoadingOrders,
    wishlist,
    loadWishlist,
  } = useDashboard();

  useEffect(() => {
    if (user?.id) {
      fetchUserOrders(user.id);
      loadWishlist(user.id);
    }
  }, [user]);

  const recentOrders = orders.slice(0, 3);
  const ordersThisMonth = orders.filter((order) => isThisMonth(order.createdAt)).length;
  const activeOrders = orders.filter((order) =>
    ['pending', 'processing', 'shipped'].includes(order.status)
  ).length;

  // Was calculated and then never shown. It is the figure people open an
  // account page to see.
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

  const stats = [
    {
      name: 'Orders',
      value: orders.length.toString(),
      note: ordersThisMonth > 0 ? `${ordersThisMonth} this month` : 'None this month',
      icon: Package,
      href: '/dashboard/orders',
    },
    {
      name: 'On its way',
      value: activeOrders.toString(),
      note: activeOrders > 0 ? 'Being prepared or shipped' : 'Nothing in transit',
      icon: Truck,
      href: '/dashboard/orders',
    },
    {
      name: 'Total spent',
      value: formatPrice(totalSpent),
      note: 'Across all orders',
      icon: Wallet,
      href: '/dashboard/orders',
    },
    {
      name: 'Saved',
      value: wishlist.length.toString(),
      note: wishlist.length > 0 ? 'Waiting in your wishlist' : 'Nothing saved yet',
      icon: Heart,
      href: '/dashboard/wishlist',
    },
  ];

  const firstName = profile?.displayName?.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          Your account
        </p>
        <h1 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          {firstName ? `Hello, ${firstName}` : 'Hello'}
        </h1>
      </motion.div>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
            >
              <Link
                href={stat.href}
                className="group flex h-full flex-col justify-between rounded-sm border border-rule bg-card p-5 transition-colors hover:border-sage-deep"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {stat.name}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-sage-deep" />
                </div>
                <div className="mt-6">
                  <p className="font-body text-2xl font-medium tabular-nums text-foreground md:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-body text-xs text-ink-muted">{stat.note}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent orders */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="mb-10 rounded-sm border border-rule bg-card"
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <h2 className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Recent orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="group inline-flex items-center gap-1.5 font-body text-sm text-sage-deep transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isLoadingOrders ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-sm bg-wash" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded-sm bg-wash" />
                  <div className="h-3 w-1/4 rounded-sm bg-wash" />
                </div>
              </div>
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wash">
              <ShoppingBag className="h-5 w-5 text-sage" />
            </div>
            <p className="mt-4 font-body text-sm text-foreground">No orders yet</p>
            <p className="mt-1 font-body text-sm text-ink-muted">
              When you order, it will appear here with its status.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
            >
              Start shopping
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {recentOrders.map((order: Order) => {
              const status = statusStyles[order.status] ?? statusStyles.pending;
              const StatusIcon = status.icon;
              const primaryItem = order.items[0];

              return (
                <li key={order.id}>
                  <Link
                    href="/dashboard/orders"
                    className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-wash"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-wash">
                      {primaryItem?.imageUrl ? (
                        <Image
                          src={primaryItem.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <Package className="absolute inset-0 m-auto h-5 w-5 text-ink-faint" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-body text-sm text-foreground">
                          {order.orderNumber}
                        </span>
                        <span className="font-body text-sm font-medium tabular-nums text-foreground">
                          {formatPrice(order.total)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-muted">
                        <span>{formatDate(order.createdAt)}</span>
                        <span>
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 capitalize ${status.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-sage-deep" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>

      {/* Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <h2 className="mb-4 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          Quick actions
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Was /clothings on both of these — a route from the previous brand. */}
          <Link
            href="/"
            className="group rounded-sm bg-sage-deep p-5 text-background transition-colors hover:bg-foreground"
          >
            <h3 className="font-body text-sm font-medium">Keep shopping</h3>
            <p className="mt-1 font-body text-sm text-background/70">
              Everything on the shelf
            </p>
            <ArrowRight className="mt-6 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/dashboard/wishlist"
            className="group rounded-sm border border-rule bg-card p-5 transition-colors hover:border-sage-deep"
          >
            <h3 className="font-body text-sm font-medium text-foreground">Your wishlist</h3>
            <p className="mt-1 font-body text-sm text-ink-muted">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
            </p>
            <Heart className="mt-6 h-4 w-4 text-ink-faint transition-colors group-hover:text-sage-deep" />
          </Link>

          <Link
            href="/contact"
            className="group rounded-sm border border-rule bg-card p-5 transition-colors hover:border-sage-deep"
          >
            <h3 className="font-body text-sm font-medium text-foreground">Ask for an item</h3>
            <p className="mt-1 font-body text-sm text-ink-muted">
              Not on the shelf? We source it
            </p>
            <ShoppingBag className="mt-6 h-4 w-4 text-ink-faint transition-colors group-hover:text-sage-deep" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

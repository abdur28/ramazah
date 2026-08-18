'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Heart, CreditCard, TrendingUp, ArrowRight, Truck, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import CrossedLink from '@/components/ui/crossed-link';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Order } from '@/types/types';
import { format } from 'date-fns';

const statusColors = {
  delivered: 'bg-green-500/10 text-green-700',
  shipped: 'bg-blue-500/10 text-blue-700',
  processing: 'bg-yellow-500/10 text-yellow-700',
  pending: 'bg-orange-500/10 text-orange-700',
  cancelled: 'bg-red-500/10 text-red-700',
  refunded: 'bg-gray-500/10 text-gray-700',
};

const statusIcons = {
  delivered: CheckCircle2,
  shipped: Truck,
  processing: Package,
  pending: Clock,
  cancelled: Package,
  refunded: Package,
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return '';
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { 
    orders, 
    fetchUserOrders, 
    isLoadingOrders,
    wishlist,
    loadWishlist,
    isLoadingWishlist
  } = useDashboard();

  useEffect(() => {
    if (user?.uid) {
      fetchUserOrders(user.uid);
      loadWishlist(user.uid);
    }
  }, [user]);

  // Calculate stats
  const totalOrders = orders.length;
  const recentOrders = orders.slice(0, 3);
  const ordersThisMonth = orders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }).length;

  const activeOrders = orders.filter(o => 
    o.status === 'pending' || o.status === 'processing' || o.status === 'shipped'
  ).length;

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const spentThisMonth = orders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const now = new Date();
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }).reduce((sum, order) => sum + order.total, 0);

  const wishlistCount = wishlist.length;
  const wishlistInStock = wishlist.filter(id => {
    // Would need to check actual product stock - simplified for now
    return true;
  }).length;

  const stats = [
    {
      name: 'Total Orders',
      value: totalOrders.toString(),
      icon: Package,
      change: ordersThisMonth > 0 ? `+${ordersThisMonth} this month` : 'No orders this month',
      changeType: ordersThisMonth > 0 ? 'positive' : 'neutral',
      href: '/dashboard/orders',
    },
    {
      name: 'Wishlist Items',
      value: wishlistCount.toString(),
      icon: Heart,
      change: `${wishlistInStock} in stock`,
      changeType: 'neutral',
      href: '/dashboard/wishlist',
    },
    {
      name: 'Active Orders',
      value: activeOrders.toString(),
      icon: Truck,
      change: activeOrders > 0 ? 'In progress' : 'All delivered',
      changeType: activeOrders > 0 ? 'positive' : 'neutral',
      href: '/dashboard/orders',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="font-heading text-4xl md:text-5xl tracking-wider mb-2">
          DASHBOARD
        </h1>
        <p className="font-body text-sm text-foreground/60">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}! Here's your account overview.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={stat.href}
                className="block p-6 bg-white border border-foreground/10 rounded-lg hover:border-[#F8E231] transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <p className="font-body text-sm text-foreground/60">
                    {stat.name}
                  </p>
                  <div className="p-2 bg-foreground/5 rounded-md group-hover:bg-[#F8E231] transition-colors">
                    <Icon className="h-5 w-5 text-foreground/60 group-hover:text-black transition-colors" />
                  </div>
                  
                </div>
                <div>
                  <p className="font-body text-3xl mb-1">
                    {stat.value}
                  </p>
                  <span className="text-xs font-body text-foreground/40">
                    {stat.change}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white border border-foreground/10 rounded-lg p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl tracking-wider">
            RECENT ORDERS
          </h2>
          <CrossedLink href="/dashboard/orders" lineColor="gold">
            <span className="font-body text-sm text-foreground/60">
              View All
            </span>
          </CrossedLink>
        </div>

        {isLoadingOrders ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-foreground/60">Loading orders...</p>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-foreground/20" />
            <p className="font-body text-sm text-foreground/60 mb-4">
              You haven't placed any orders yet
            </p>
            <Link
              href="/clothings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-[#F8E231] hover:text-black transition-colors rounded-md font-body text-sm"
            >
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order: Order, index: number) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons];
              const primaryItem = order.items[0];
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <Link
                    href={`/dashboard/orders`}
                    className="flex items-center gap-4 p-4 border border-foreground/10 rounded-lg hover:border-[#F8E231] transition-colors group"
                  >
                    {/* Image */}
                    <div className="relative w-16 h-16 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                      {primaryItem?.imageUrl ? (
                        <Image
                          src={primaryItem.imageUrl}
                          alt={primaryItem.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-body font-semibold text-sm">
                          Order #{order.orderNumber}
                        </h3>
                        <span className="font-body font-semibold text-sm">
                          {order.currency.toUpperCase()} {order.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-foreground/60 flex-wrap">
                        <span>{formatDate(order.createdAt)}</span>
                        <span>•</span>
                        <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                        <span className={`px-2 py-0.5 rounded-full capitalize flex items-center gap-1 ${statusColors[order.status as keyof typeof statusColors]}`}>
                          <StatusIcon className="h-3 w-3" />
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-5 w-5 text-foreground/40 flex-shrink-0 group-hover:text-[#F8E231] transition-colors" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <h2 className="font-heading text-2xl tracking-wider mb-4">
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/clothings"
            className="p-6 bg-black text-white rounded-lg hover:bg-[#F8E231] hover:text-black transition-colors group"
          >
            <h3 className="font-body font-semibold mb-2">Continue Shopping</h3>
            <p className="font-body text-sm opacity-80">
              Browse our latest collection
            </p>
            <ArrowRight className="h-5 w-5 mt-4" />
          </Link>

          <Link
            href="/dashboard/wishlist"
            className="p-6 border border-foreground/10 rounded-lg hover:border-[#F8E231] transition-colors group"
          >
            <h3 className="font-body font-semibold mb-2">View Wishlist</h3>
            <p className="font-body text-sm text-foreground/60">
              {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} waiting for you
            </p>
            <Heart className="h-5 w-5 mt-4 text-foreground/60 group-hover:text-[#F8E231]" />
          </Link>

          <Link
            href="/dashboard/orders"
            className="p-6 border border-foreground/10 rounded-lg hover:border-[#F8E231] transition-colors group"
          >
            <h3 className="font-body font-semibold mb-2">Track Orders</h3>
            <p className="font-body text-sm text-foreground/60">
              {activeOrders} {activeOrders === 1 ? 'order' : 'orders'} in transit
            </p>
            <Package className="h-5 w-5 mt-4 text-foreground/60 group-hover:text-[#F8E231]" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
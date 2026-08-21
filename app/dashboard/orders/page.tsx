"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { Package, Loader2, ShoppingBag, Eye, Truck, CheckCircle2, Clock, XCircle, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import OrderTimeline from "@/components/dashboard/OrderTimeline";
import ReorderButton from "@/components/dashboard/ReorderButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Order, OrderStatus } from "@/types/types";
import { format } from "date-fns";
import UserOrderDetailsDialog from "@/components/dashboard/UserOrderDetailsDialog";
import { useCurrency } from '@/contexts/CurrencyContext';

const getOrderStatusConfig = (status: OrderStatus) => {
  const configs: Record<OrderStatus, { 
    icon: React.ReactNode; 
    label: string;
    gradient: string;
  }> = {
    pending: { 
      icon: <Clock className="h-4 w-4" />, 
      label: "Pending",
      gradient: "from-warning/10 to-warning/10 border-warning/20"
    },
    processing: { 
      icon: <Package className="h-4 w-4" />, 
      label: "Processing",
      gradient: "from-primary/10 to-cyan-500/10 border-primary/20"
    },
    shipped: { 
      icon: <Truck className="h-4 w-4" />, 
      label: "Shipped",
      gradient: "from-purple-500/10 to-pink-500/10 border-purple-500/20"
    },
    delivered: { 
      icon: <CheckCircle2 className="h-4 w-4" />, 
      label: "Delivered",
      gradient: "from-success/10 to-emerald-500/10 border-success/20"
    },
    cancelled: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Cancelled",
      gradient: "from-destructive/10 to-rose-500/10 border-destructive/20"
    },
    refunded: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Refunded",
      gradient: "from-ink-muted/10 to-ink-muted/10 border-rule/20"
    }
  };
  
  return configs[status];
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

export default function DashboardOrdersPage() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { fetchUserOrders, orders, isLoadingOrders, ordersError } = useDashboard();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserOrders(user.id);
    }
  }, [user]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (isLoadingOrders) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="border border-destructive bg-destructive/10 rounded-xl p-8">
          <div className="text-center text-destructive">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-body font-semibold mb-2">Failed to Load Orders</h3>
            <p className="text-sm">{ordersError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="min-h-[500px] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-6 relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="mb-3 font-body text-base text-foreground">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              Start shopping to see your order history here
            </p>
            <Button asChild size="lg">
              <a href="/shop">
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="mb-8">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          Your account
        </p>
        <h1 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          Orders
        </h1>
      </div>

      {/* Orders Grid */}
      <div className="space-y-6">
        {orders.map((order) => {
          const statusConfig = getOrderStatusConfig(order.status);
          
          return (
            <div 
              key={order.id} 
              className="group relative bg-card border rounded-sm overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Status Banner */}
              <div className={`bg-gradient-to-r ${statusConfig.gradient} border-b px-6 py-4`}>
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center">
                      {statusConfig.icon}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">#{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="backdrop-blur-sm bg-background/80">
                      {statusConfig.label}
                    </Badge>
                    <div className="text-right border-l pl-4">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold md:text-lg text-base">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Content */}
              <div className="p-6">
                {/* Items Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                  {order.items.slice(0, 8).map((item) => (
                    <div key={item.id} className="group/item relative">
                      <div className="relative mb-2 aspect-square overflow-hidden rounded-sm bg-wash">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 12vw"
                            className="object-cover transition-transform duration-300 group-hover/item:scale-105"
                          />
                        ) : (
                          <Package className="absolute inset-0 m-auto h-5 w-5 text-ink-faint" />
                        )}
                        <div className="absolute top-2 right-2 bg-foreground/70 backdrop-blur text-background text-xs px-2 py-1 rounded-full">
                          ×{item.quantity}
                        </div>
                      </div>
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  ))}
                  
                  {order.items.length > 8 && (
                    <div className="flex aspect-square items-center justify-center rounded-sm bg-wash">
                      <div className="text-center">
                        <p className="font-body text-2xl">+{order.items.length - 8}</p>
                        <p className="text-xs text-muted-foreground">more</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Where the order has got to, read from the status history
                    the trigger keeps. Open orders show it inline, because that
                    is the question being asked. */}
                {order.status !== 'delivered' && (
                  <div className="mb-6 rounded-sm border border-rule bg-card p-5">
                    <OrderTimeline order={order} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-3">
                  {order.status === 'delivered' && <ReorderButton orderId={order.id} />}

                  <Link
                    href={`/dashboard/orders/${order.id}/invoice`}
                    className="inline-flex items-center gap-2 rounded-sm border border-rule px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Invoice
                  </Link>

                  <button
                    onClick={() => handleViewOrder(order)}
                    className="inline-flex items-center gap-2 rounded-sm bg-sage-deep px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Full order
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <UserOrderDetailsDialog 
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        order={selectedOrder}
      />
    </div>
  );
}
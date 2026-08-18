"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { Package, Loader2, ShoppingBag, Eye, Truck, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Order, OrderStatus } from "@/types/types";
import { format } from "date-fns";
import UserOrderDetailsDialog from "@/components/dashboard/UserOrderDetailsDialog";

const getOrderStatusConfig = (status: OrderStatus) => {
  const configs: Record<OrderStatus, { 
    icon: React.ReactNode; 
    label: string;
    gradient: string;
  }> = {
    pending: { 
      icon: <Clock className="h-4 w-4" />, 
      label: "Pending",
      gradient: "from-yellow-500/10 to-orange-500/10 border-yellow-500/20"
    },
    processing: { 
      icon: <Package className="h-4 w-4" />, 
      label: "Processing",
      gradient: "from-blue-500/10 to-cyan-500/10 border-blue-500/20"
    },
    shipped: { 
      icon: <Truck className="h-4 w-4" />, 
      label: "Shipped",
      gradient: "from-purple-500/10 to-pink-500/10 border-purple-500/20"
    },
    delivered: { 
      icon: <CheckCircle2 className="h-4 w-4" />, 
      label: "Delivered",
      gradient: "from-green-500/10 to-emerald-500/10 border-green-500/20"
    },
    cancelled: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Cancelled",
      gradient: "from-red-500/10 to-rose-500/10 border-red-500/20"
    },
    refunded: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Refunded",
      gradient: "from-gray-500/10 to-slate-500/10 border-gray-500/20"
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
  const { fetchUserOrders, orders, isLoadingOrders, ordersError } = useDashboard();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchUserOrders(user.uid);
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
        <div className="border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-xl p-8">
          <div className="text-center text-red-600">
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
            <h3 className="text-2xl font-bold font-heading uppercase mb-3">No Orders Yet</h3>
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
        <h1 className="text-5xl font-heading uppercase mb-2 ">My Orders</h1>
      </div>

      {/* Orders Grid */}
      <div className="space-y-6 ">
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
                        {order.currency.toUpperCase()} {order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Content */}
              <div className="p-6">
                {/* Items Grid */}
                <div className="grid grid-cols-2  md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                  {order.items.slice(0, 8).map((item) => (
                    <div key={item.id} className="group/item relative">
                      <div className="aspect-square relative rounded-xl overflow-hidden bg-muted mb-2">
                        <Image 
                          src={item.imageUrl} 
                          alt={item.name} 
                          fill 
                          className="object-cover group-hover/item:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-white text-xs px-2 py-1 rounded-full">
                          ×{item.quantity}
                        </div>
                      </div>
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.currency.toUpperCase()} {item.price.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  {order.items.length > 4 && (
                    <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold">+{order.items.length - 4}</p>
                        <p className="text-xs text-muted-foreground">more</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  {order.trackingNumber && order.status === 'shipped' && (
                    <Button variant="outline" size="lg">
                      <Truck className="h-4 w-4 mr-2" />
                      Track Package
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => handleViewOrder(order)}
                    size="lg"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Order
                  </Button>
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
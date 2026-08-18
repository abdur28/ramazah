"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, User, MapPin, CreditCard, Truck, CheckCircle2, Clock, XCircle, Calendar, Phone, Mail } from "lucide-react";
import Image from "next/image";
import { Order, OrderStatus } from "@/types/types";
import { format } from "date-fns";

interface UserOrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const getOrderStatusConfig = (status: OrderStatus) => {
  const configs: Record<OrderStatus, { 
    icon: React.ReactNode; 
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    description: string;
  }> = {
    pending: { 
      icon: <Clock className="h-4 w-4" />, 
      label: "Pending",
      variant: "secondary",
      description: "Your order is being reviewed"
    },
    processing: { 
      icon: <Package className="h-4 w-4" />, 
      label: "Processing",
      variant: "default",
      description: "We're preparing your order"
    },
    shipped: { 
      icon: <Truck className="h-4 w-4" />, 
      label: "Shipped",
      variant: "default",
      description: "Your order is on the way"
    },
    delivered: { 
      icon: <CheckCircle2 className="h-4 w-4" />, 
      label: "Delivered",
      variant: "default",
      description: "Your order has been delivered"
    },
    cancelled: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Cancelled",
      variant: "destructive",
      description: "This order was cancelled"
    },
    refunded: { 
      icon: <XCircle className="h-4 w-4" />, 
      label: "Refunded",
      variant: "outline",
      description: "This order has been refunded"
    }
  };
  
  return configs[status];
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'PPpp');
  } catch {
    return 'Invalid date';
  }
};

export default function UserOrderDetailsDialog({ 
  open, 
  onOpenChange, 
  order 
}: UserOrderDetailsDialogProps) {
  if (!order) return null;

  const statusConfig = getOrderStatusConfig(order.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-body flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Order placed on {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Status */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </Badge>
              <span className="text-sm text-muted-foreground">
                {order.deliveryType === 'delivery' ? 'Delivery' : 'In-Store Pickup'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            
            {/* Tracking Info */}
            {order.trackingNumber && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4" />
                  <span className="font-medium text-sm">Tracking Number</span>
                </div>
                <p className="text-sm font-mono">{order.trackingNumber}</p>
                {order.carrier && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Carrier: {order.carrier}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Customer & Delivery Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <p>{order.customerEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p>{order.customerPhone}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.deliveryType === 'delivery' && order.shippingAddress && (
              <div>
                <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h3>
                <div className="text-sm space-y-1">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="font-semibold font-body flex items-center gap-2 mb-4">
              <Package className="h-4 w-4" />
              Order Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                  <div className="relative w-20 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.size && (
                        <Badge variant="outline" className="text-xs">
                          Size: {item.size}
                        </Badge>
                      )}
                      {item.color && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-full border" 
                            style={{ backgroundColor: item.color.hex }}
                          />
                          {item.color.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Qty: {item.quantity}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">
                      {order.currency.toUpperCase()} {item.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      × {item.quantity}
                    </p>
                    <p className="font-semibold mt-1">
                      {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div>
            <h3 className="font-semibold font-body flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4" />
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{order.currency.toUpperCase()} {order.subtotal.toFixed(2)}</span>
              </div>
              
              {order.tax !== undefined && order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{order.currency.toUpperCase()} {order.tax.toFixed(2)}</span>
                </div>
              )}
              
              {order.shippingCost !== undefined && order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.currency.toUpperCase()} {order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              
              {order.discount !== undefined && order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{order.discount.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>{order.currency.toUpperCase()} {order.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment Status</span>
                <span className="capitalize">{order.paymentStatus}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="font-semibold font-body flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              Order Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground rounded-full p-1 mt-0.5">
                  <Package className="h-3 w-3" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Order Placed</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              
              {order.paidAt && (
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full p-1 mt-0.5">
                    <CreditCard className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Payment Confirmed</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.paidAt)}</p>
                  </div>
                </div>
              )}
              
              {order.shippedAt && (
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full p-1 mt-0.5">
                    <Truck className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Order Shipped</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.shippedAt)}</p>
                  </div>
                </div>
              )}
              
              {order.deliveredAt && (
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Order Delivered</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.deliveredAt)}</p>
                  </div>
                </div>
              )}
              
              {order.pickedUpAt && (
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full p-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Order Picked Up</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.pickedUpAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {order.customerNotes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold font-body mb-2">Order Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  {order.customerNotes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, User, MapPin, CreditCard, Truck, Save } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Order, OrderStatus, PaymentStatus } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";
import { format } from "date-fns";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'PPpp');
  } catch {
    return 'Invalid date';
  }
};

export default function OrderDetailsDialog({ 
  open, 
  onOpenChange, 
  order 
}: OrderDetailsDialogProps) {
  const { updateOrderStatus, updatePaymentStatus, updateOrder, loading } = useAdmin();
  
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && order) {
      setOrderStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setTrackingNumber(order.trackingNumber || '');
      setCarrier(order.carrier || '');
      setHasChanges(false);
    }
  }, [open, order]);

  useEffect(() => {
    if (order) {
      const changed = 
        orderStatus !== order.status ||
        paymentStatus !== order.paymentStatus ||
        trackingNumber !== (order.trackingNumber || '') ||
        carrier !== (order.carrier || '');
      setHasChanges(changed);
    }
  }, [orderStatus, paymentStatus, trackingNumber, carrier, order]);

  const handleSave = async () => {
    if (!order) return;
    
    setIsSaving(true);
    try {
      const promises = [];
      
      if (orderStatus !== order.status) {
        promises.push(updateOrderStatus(order.id, orderStatus));
      }
      
      if (paymentStatus !== order.paymentStatus) {
        promises.push(updatePaymentStatus(order.id, paymentStatus));
      }
      
      if (trackingNumber !== (order.trackingNumber || '') || carrier !== (order.carrier || '')) {
        promises.push(updateOrder(order.id, { trackingNumber, carrier }));
      }
      
      await Promise.all(promises);
      
      toast.success("Order updated successfully");
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setIsSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-body flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            View and manage order information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Updates */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select value={orderStatus} onValueChange={(value) => setOrderStatus(value as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>

            <div className="space-y-2">
              <Label>Carrier</Label>
              <Input 
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g., UPS, FedEx, DHL"
              />
            </div>

            {hasChanges && (
              <div className="col-span-2">
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Delivery Type</p>
                <Badge variant="outline" className="capitalize">{order.deliveryType}</Badge>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && order.deliveryType === 'delivery' && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </h3>
                <div className="text-sm space-y-1">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              Order Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                  <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    {item.size && <p className="text-sm">Size: {item.size}</p>}
                    {item.color && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>Color:</span>
                        <div 
                          className="w-4 h-4 rounded-full border" 
                          style={{ backgroundColor: item.color.hex }}
                        />
                        <span>{item.color.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {order.currency.toUpperCase()} {item.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
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
            <h3 className="font-semibold font-body flex items-center gap-2 mb-3">
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
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{order.currency.toUpperCase()} {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div>
            <h3 className="font-semibold font-body mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{formatDate(order.paidAt)}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipped</span>
                  <span>{formatDate(order.shippedAt)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered</span>
                  <span>{formatDate(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>

          {order.customerNotes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Customer Notes</h3>
                <p className="text-sm text-muted-foreground">{order.customerNotes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { RefreshCcw, Search, MoreHorizontal, Eye, Loader2, ShoppingBag, Package, Truck, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order, OrderStatus, PaymentStatus } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";
import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";
import { format } from "date-fns";

const getOrderStatusBadge = (status: OrderStatus) => {
  const variants: Record<OrderStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
    processing: { variant: "default", icon: <Package className="h-3 w-3 mr-1" /> },
    shipped: { variant: "default", icon: <Truck className="h-3 w-3 mr-1" /> },
    delivered: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    refunded: { variant: "outline", icon: <XCircle className="h-3 w-3 mr-1" /> }
  };
  
  const config = variants[status];
  return (
    <Badge variant={config.variant} className="flex items-center w-fit">
      {config.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  );
};

const getPaymentStatusBadge = (status: PaymentStatus) => {
  const variants: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    paid: "default",
    failed: "destructive",
    refunded: "outline"
  };
  
  return <Badge variant={variants[status]} className="capitalize">{status}</Badge>;
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
};

export default function AdminOrdersPage() {
  const { fetchOrders, orders, loading, error, resetOrders } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!orders) return;
    let filtered = [...orders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.orderNumber.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.customerEmail.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    
    if (paymentFilter !== "all") {
      filtered = filtered.filter(o => o.paymentStatus === paymentFilter);
    }
    
    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  const loadOrders = async () => {
    setRefreshing(true);
    resetOrders();
    try {
      await fetchOrders({ limit: 100, orderByField: 'createdAt', orderDirection: 'desc' });
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  if (loading.orders && !refreshing && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p>Loading Orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading uppercase">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <Button onClick={loadOrders} variant="outline" disabled={refreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
            <span className="text-sm font-medium ">Total</span>
            <Package className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium ">Pending</span>
              <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium ">Processing</span>
              <TrendingUp className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{stats.processing}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">            
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium ">Shipped</span>
              <Truck className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipped}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium ">Delivered</span>
              <CheckCircle2 className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium ">Cancelled</span>
              <XCircle className="h-5 w-5 mr-2 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold ">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            All Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by order number, customer name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.items.length} items</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.currency.toUpperCase()} {order.total.toFixed(2)}
                      </TableCell>
                      <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailsDialog 
        open={detailsDialogOpen} 
        onOpenChange={setDetailsDialogOpen} 
        order={selectedOrder}
      />
    </div>
  );
}
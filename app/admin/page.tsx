"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  Activity
} from "lucide-react";
import { AreaChart, DonutChart } from "@tremor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";
import { Order } from "@/types/types";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { analytics, orders, loading, error, fetchAnalytics, fetchOrders } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (orders && orders.length > 0) {
      // Get 5 most recent orders
      setRecentOrders(orders.slice(0, 5));
    }
  }, [orders]);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAnalytics(),
        fetchOrders({ limit: 10, orderByField: 'createdAt', orderDirection: 'desc' })
      ]);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      usd: '$',
      EUR: '€',
      GBP: '£',
      RUB: '₽',
      rub: '₽'
    };
    return symbols[currency] || currency;
  };

  const formatRevenues = (revenues: Array<{ currency: string; amount: number }>) => {
    if (!revenues || revenues.length === 0) return 'No revenue';
    
    return revenues.map(r => 
      `${getCurrencySymbol(r.currency)}${r.amount.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`
    ).join(' | ');
  };

  const getTotalRevenue = () => {
    if (!analytics) return 'No data';
    const revenues = analytics.orders.revenues;
    if (!revenues || revenues.length === 0) return 'No revenue';
    
    return revenues.map(r => 
      `${getCurrencySymbol(r.currency)}${r.totalRevenue.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`
    ).join(' | ');
  };

  const getMonthlyRevenue = () => {
    if (!analytics) return 'No data';
    const revenues = analytics.orders.revenues;
    if (!revenues || revenues.length === 0) return 'No revenue';
    
    return revenues.map(r => 
      `${getCurrencySymbol(r.currency)}${r.revenueThisMonth.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`
    ).join(' | ');
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const GrowthBadge = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"}
        className={`flex items-center gap-1 ${isPositive ? 'bg-green-600' : ''}`}
      >
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {formatPercent(value)}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      processing: { variant: "default", icon: <Package className="h-3 w-3 mr-1" /> },
      shipped: { variant: "default", icon: <Truck className="h-3 w-3 mr-1" /> },
      delivered: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
      refunded: { variant: "outline", icon: <XCircle className="h-3 w-3 mr-1" /> }
    };
    
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  // Loading state
  if (loading.analytics && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2"></div>
            <div className="h-4 w-72 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 bg-muted animate-pulse rounded mb-1"></div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error.analytics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome to ramazah admin panel
            </p>
          </div>
          <Button onClick={loadDashboardData} disabled={refreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>

        <div className="rounded-lg border border-destructive p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium text-destructive">Error loading dashboard</p>
          <p className="text-sm text-muted-foreground mt-2">{error.analytics}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome to ramazah admin panel
          </p>
        </div>
        <Button 
          onClick={loadDashboardData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/customers')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.customers.totalCustomers.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {analytics.customers.newCustomersThisMonth} new this month
              </p>
              <GrowthBadge value={analytics.customers.customerGrowthRate} />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.products.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.products.inStockProducts} in stock, {analytics.products.lowStockProducts} low stock
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orders.totalOrders.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {analytics.orders.ordersThisMonth} this month
              </p>
              <GrowthBadge value={analytics.orders.orderGrowthRate} />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/analytics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{getTotalRevenue()}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {getMonthlyRevenue()} this month
              </p>
              <GrowthBadge value={analytics.orders.revenueGrowthRate} />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>Total customer acquisition over time</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-80 text-xs"
              data={[
                { 
                  period: 'Last Month', 
                  customers: analytics.customers.totalCustomers - analytics.customers.newCustomersThisMonth 
                },
                { 
                  period: 'Current', 
                  customers: analytics.customers.totalCustomers 
                }
              ]}
              index="period"
              categories={["customers"]}
              colors={["blue"]}
              valueFormatter={(number) => `${number.toLocaleString()}`}
              showLegend={false}
              showYAxis={true}
              showGradient={true}
              showAnimation={true}
            />
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/admin/orders')}
              >
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push('/admin/orders')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">{getCurrencySymbol(order.currency)}{order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      {getOrderStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
                {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/admin/products')}
              >
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {analytics.products.topSellingProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No product data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.products.topSellingProducts.slice(0, 5).map((product, index) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push('/admin/products')}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.viewCount} views</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-sm font-semibold">{product.salesCount} sold</p>
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

                {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
            <CardDescription>Products by availability</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-80 text-xs"
              data={[
                { name: "In Stock", value: analytics.products.inStockProducts },
                { name: "Out of Stock", value: analytics.products.outOfStockProducts },
                { name: "Low Stock", value: analytics.products.lowStockProducts }
              ]}
              category="value"
              index="name"
              colors={['emerald', 'fuchsia', 'amber']}
              valueFormatter={(value) => `${value.toLocaleString()} products`}
              showAnimation={true}
              showTooltip={true}
            />
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your store efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => router.push('/admin/products/new')}
            >
              <Package className="h-6 w-6" />
              <span className="text-sm">Add Product</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => router.push('/admin/orders')}
            >
              <ShoppingBag className="h-6 w-6" />
              <span className="text-sm">View Orders</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => router.push('/admin/customers')}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Manage Customers</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => router.push('/admin/analytics')}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">View Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
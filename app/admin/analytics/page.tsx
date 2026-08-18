"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCcw,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import useAdmin from "@/hooks/admin/useAdmin";
import CustomerAnalyticsTab from "@/components/admin/CustomerAnalyticsTab";
import ProductAnalyticsTab from "@/components/admin/ProductAnalyticsTab";
import OrderAnalyticsTab from "@/components/admin/OrderAnalyticsTab";
import TransactionsAnalyticsTab from "@/components/admin/TransactionsAnalyticsTab";
import { toast } from "sonner";

export default function AdminAnalyticsPage() {
  const { analytics, loading, error, fetchAnalytics } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setRefreshing(true);
    try {
      await fetchAnalytics();
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast.error("Failed to load analytics");
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
          <p className="text-lg font-medium">Loading Analytics</p>
        </div>
      </div>
    );
  }

  if (error.analytics) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your ramazah business
            </p>
          </div>
          <Button onClick={loadAnalytics} disabled={refreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>

        <div className="rounded-lg border border-destructive p-8 text-center">
          <p className="text-lg font-medium text-destructive">Error loading analytics</p>
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
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your ramazah business
          </p>
        </div>
        <Button 
          onClick={loadAnalytics} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Customers</span>
            <span className="sm:hidden">Cust.</span>
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Products</span>
            <span className="sm:hidden">Prod.</span>
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Orders</span>
            <span className="sm:hidden">Ord.</span>
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Transactions</span>
            <span className="sm:hidden">Trans.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomerAnalyticsTab data={analytics.customers} timePeriod={timePeriod} />
        </TabsContent>

        <TabsContent value="products">
          <ProductAnalyticsTab data={analytics.products} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderAnalyticsTab data={analytics.orders} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsAnalyticsTab data={analytics.transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
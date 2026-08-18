"use client";

import React from "react";
import { DonutChart } from "@tremor/react";
import { ShoppingBag, DollarSign, TrendingUp, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderAnalytics } from "@/types/admin";

interface OrderAnalyticsTabProps {
  data: OrderAnalytics;
}

export default function OrderAnalyticsTab({ data }: OrderAnalyticsTabProps) {
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

  const formatGrowthRate = (rate: number) => {
    const formatted = Math.abs(rate).toFixed(1);
    return rate >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalOrders.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={data.orderGrowthRate >= 0 ? "default" : "destructive"} className={data.orderGrowthRate >= 0 ? "bg-green-600" : ""}>
                {formatGrowthRate(data.orderGrowthRate)}
              </Badge>
              <p className="text-xs text-muted-foreground">vs last period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.totalRevenue })))}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={data.revenueGrowthRate >= 0 ? "default" : "destructive"} className={data.revenueGrowthRate >= 0 ? "bg-green-600" : ""}>
                {formatGrowthRate(data.revenueGrowthRate)}
              </Badge>
              <p className="text-xs text-muted-foreground">vs last period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {data.revenues.map(r => 
                `${getCurrencySymbol(r.currency)}${r.averageOrderValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}`
              ).join(' | ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.ordersThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.revenueThisMonth })))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-80 text-xs"
              data={data.ordersByStatus}
              category="count"
              index="status"
              colors={['blue', 'amber', 'lime', 'emerald', 'violet', 'gray']}
              valueFormatter={(value) => `${value.toLocaleString()} orders`}
              showAnimation={true}
              showTooltip={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Status</CardTitle>
            <CardDescription>Multi-currency revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.ordersByStatus.map((status) => (
                <div key={status.status} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="capitalize">
                      {status.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {status.count} orders
                    </span>
                  </div>
                  {status.revenues && status.revenues.length > 0 && (
                    <div className="text-sm font-medium">
                      {formatRevenues(status.revenues)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
          <CardDescription>Orders and revenue over time periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Orders</span>
                  <span className="text-2xl font-bold">{data.ordersToday.toLocaleString()}</span>
                </div>
                <div className="text-sm font-semibold">
                  {formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.revenueToday })))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border space-y-2">
              <p className="text-sm font-medium text-muted-foreground">This Week</p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Orders</span>
                  <span className="text-2xl font-bold">{data.ordersThisWeek.toLocaleString()}</span>
                </div>
                <div className="text-sm font-semibold">
                  {formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.revenueThisWeek })))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border space-y-2">
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Orders</span>
                  <span className="text-2xl font-bold">{data.ordersThisMonth.toLocaleString()}</span>
                </div>
                <div className="text-sm font-semibold">
                  {formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.revenueThisMonth })))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown by Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Currency</CardTitle>
          <CardDescription>Breakdown of revenue by currency type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.revenues.map((revenue) => (
              <div key={revenue.currency} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{revenue.currency.toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      Avg: {getCurrencySymbol(revenue.currency)}{revenue.averageOrderValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {getCurrencySymbol(revenue.currency)}{revenue.totalRevenue.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getCurrencySymbol(revenue.currency)}{revenue.revenueThisMonth.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} this month
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
              <p className="text-2xl font-bold">{data.pendingOrders.toLocaleString()}</p>
              <Badge variant="secondary" className="mt-2">
                {((data.pendingOrders / data.totalOrders) * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Processing</p>
              <p className="text-2xl font-bold">{data.processingOrders.toLocaleString()}</p>
              <Badge variant="default" className="mt-2 bg-blue-600">
                {((data.processingOrders / data.totalOrders) * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Delivered</p>
              <p className="text-2xl font-bold">{data.deliveredOrders.toLocaleString()}</p>
              <Badge variant="default" className="mt-2 bg-green-600">
                {((data.deliveredOrders / data.totalOrders) * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Cancelled</p>
              <p className="text-2xl font-bold">{data.cancelledOrders.toLocaleString()}</p>
              <Badge variant="destructive" className="mt-2">
                {((data.cancelledOrders / data.totalOrders) * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
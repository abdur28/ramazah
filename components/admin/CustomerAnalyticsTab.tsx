"use client";

import React from "react";
import { AreaChart, DonutChart } from "@tremor/react";
import { Users, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerAnalytics } from "@/types/admin";

interface CustomerAnalyticsTabProps {
  data: CustomerAnalytics;
  timePeriod: 'week' | 'month' | 'year';
}

export default function CustomerAnalyticsTab({ data, timePeriod }: CustomerAnalyticsTabProps) {
  // Format growth data for chart
  const growthData = [
    { period: timePeriod === 'week' ? 'Last Week' : timePeriod === 'month' ? 'Last Month' : 'Last Year', customers: data.totalCustomers - data.newCustomersThisMonth },
    { period: 'Current', customers: data.totalCustomers }
  ];

  // User type distribution
  const userTypeData = [
    { name: "Active Customers", value: data.activeCustomers },
    { name: "Inactive Customers", value: data.totalCustomers - data.activeCustomers }
  ];

  const formatGrowthRate = (rate: number) => {
    const formatted = Math.abs(rate).toFixed(1);
    return rate >= 0 ? `+${formatted}%` : `-${formatted}%`;
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
    if (!revenues || revenues.length === 0) return '$0.00';
    
    return revenues.map(r => 
      `${getCurrencySymbol(r.currency)}${r.amount.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`
    ).join(' | ');
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCustomers.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={data.customerGrowthRate >= 0 ? "default" : "destructive"} className={data.customerGrowthRate >= 0 ? "bg-green-600" : ""}>
                {formatGrowthRate(data.customerGrowthRate)}
              </Badge>
              <p className="text-xs text-muted-foreground">vs last period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((data.activeCustomers / data.totalCustomers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.newCustomersThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.newCustomersThisWeek} this week, {data.newCustomersToday} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>Total customer acquisition over time</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-80 text-xs"
              data={growthData}
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

        <Card>
          <CardHeader>
            <CardTitle>Customer Status</CardTitle>
            <CardDescription>Active vs inactive distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-80 text-xs"
              data={userTypeData}
              category="value"
              index="name"
              colors={['emerald', 'gray']}
              valueFormatter={(value) => `${value.toLocaleString()}`}
              showAnimation={true}
              showTooltip={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Spending</CardTitle>
          <CardDescription>Customers with highest total spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topCustomers.slice(0, 10).map((customer, index) => (
              <div key={customer.uid} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatRevenues(customer.revenues)}</p>
                  <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Customer Acquisition */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Acquisition Breakdown</CardTitle>
          <CardDescription>New customers by time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Today</p>
              <p className="text-2xl font-bold">{data.newCustomersToday}</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">This Week</p>
              <p className="text-2xl font-bold">{data.newCustomersThisWeek}</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold">{data.newCustomersThisMonth}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
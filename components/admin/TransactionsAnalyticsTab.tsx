"use client";

import React from "react";
import { DonutChart, BarChart } from "@tremor/react";
import { DollarSign, CreditCard, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransactionAnalytics } from "@/types/admin";

interface TransactionsAnalyticsTabProps {
  data: TransactionAnalytics;
}

export default function TransactionsAnalyticsTab({ data }: TransactionsAnalyticsTabProps) {
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

  // Transaction status distribution
  const statusData = [
    { name: "Successful", value: data.successfulTransactions },
    { name: "Pending", value: data.pendingTransactions },
    { name: "Failed", value: data.failedTransactions },
    { name: "Refunded", value: data.refundedTransactions }
  ];

  // Transaction activity timeline
  const activityData = [
    { period: 'Today', count: data.transactionsToday },
    { period: 'This Week', count: data.transactionsThisWeek },
    { period: 'This Month', count: data.transactionsThisMonth }
  ];

  const successRate = ((data.successfulTransactions / data.totalTransactions) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {successRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatRevenues(data.revenues.map(r => ({ currency: r.currency, amount: r.totalRevenue })))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All successful transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.successfulTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {data.revenues.map(r => 
                `${getCurrencySymbol(r.currency)}${r.averageTransactionValue?.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}`
              ).join(' | ')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Status</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-80 text-xs"
              data={statusData}
              category="value"
              index="name"
              colors={['emerald', 'amber', 'violet', 'blue']}
              valueFormatter={(value) => `${value.toLocaleString()}`}
              showAnimation={true}
              showTooltip={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Transaction count by method</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-80 text-xs"
              data={data.paymentMethodDistribution}
              index="method"
              categories={["count"]}
              colors={["blue"]}
              valueFormatter={(value) => `${value.toLocaleString()}`}
              showLegend={false}
              showAnimation={true}
              layout="vertical"
            />
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Revenue</CardTitle>
          <CardDescription>Multi-currency revenue breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.paymentMethodDistribution.map((method) => (
              <div key={method.method} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{method.method}</p>
                    <p className="text-sm text-muted-foreground">
                      {method.count.toLocaleString()} transactions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatRevenues(method.revenues)}</p>
                  <p className="text-sm text-muted-foreground">
                    {((method.count / data.totalTransactions) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown by Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Currency</CardTitle>
          <CardDescription>Transaction revenue breakdown by currency type</CardDescription>
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
                      Avg: {getCurrencySymbol(revenue.currency)}{revenue.averageTransactionValue?.toLocaleString(undefined, { 
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

      {/* Transaction Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Activity</CardTitle>
          <CardDescription>Transaction volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activityData.map((item) => (
              <div key={item.period} className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">{item.period}</p>
                <p className="text-3xl font-bold">{item.count.toLocaleString()}</p>
                <Badge variant="secondary" className="mt-2">
                  {((item.count / data.totalTransactions) * 100).toFixed(1)}% of total
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>Detailed transaction status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Successful</p>
                <Badge variant="default" className="bg-green-600">
                  {((data.successfulTransactions / data.totalTransactions) * 100).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-green-600">{data.successfulTransactions.toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Pending</p>
                <Badge variant="default" className="bg-yellow-600">
                  {((data.pendingTransactions / data.totalTransactions) * 100).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{data.pendingTransactions.toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Failed</p>
                <Badge variant="destructive">
                  {((data.failedTransactions / data.totalTransactions) * 100).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-red-600">{data.failedTransactions.toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Refunded</p>
                <Badge variant="outline">
                  {((data.refundedTransactions / data.totalTransactions) * 100).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-blue-600">{data.refundedTransactions.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key transaction metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-green-600">{successRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.successfulTransactions.toLocaleString()} / {data.totalTransactions.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Failure Rate</p>
              <p className="text-3xl font-bold text-red-600">
                {((data.failedTransactions / data.totalTransactions) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.failedTransactions.toLocaleString()} failed
              </p>
            </div>

            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Refund Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {((data.refundedTransactions / data.totalTransactions) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.refundedTransactions.toLocaleString()} refunded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
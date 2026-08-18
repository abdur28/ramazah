"use client";

import React from "react";
import { DonutChart, BarChart, BarList } from "@tremor/react";
import { Package, TrendingUp, AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductAnalytics } from "@/types/admin";

interface ProductAnalyticsTabProps {
  data: ProductAnalytics;
}

export default function ProductAnalyticsTab({ data }: ProductAnalyticsTabProps) {
  // Stock status distribution
  const stockStatusData = [
    { name: "In Stock", value: data.inStockProducts },
    { name: "Out of Stock", value: data.outOfStockProducts },
    { name: "Low Stock", value: data.lowStockProducts }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.inStockProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((data.inStockProducts / data.totalProducts) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.lowStockProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalSales.toLocaleString()} sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
            <CardDescription>Products by availability</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-80 text-xs"
              data={stockStatusData}
              category="value"
              index="name"
              colors={['emerald', 'fuchsia', 'amber']}
              valueFormatter={(value) => `${value.toLocaleString()} products`}
              showAnimation={true}
              showTooltip={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Products by category</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-80 text-xs"
              data={data.categoryDistribution.slice(0, 8)}
              index="category"
              categories={["count"]}
              colors={["blue"]}
              valueFormatter={(value) => `${value.toLocaleString()}`}
              showLegend={false}
              showYAxis={false}
              showAnimation={true}
              layout="vertical"
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Products with most sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topSellingProducts.slice(0, 8).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.viewCount} views</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{product.salesCount} sold</p>
                    {/* <p className="text-sm text-muted-foreground">${product.revenue.toLocaleString()}</p> */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Products</CardTitle>
            <CardDescription>Products with highest views</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              data={data.topViewedProducts.slice(0, 8).map(p => ({
                name: p.name,
                value: p.viewCount
              }))}
              
              className="h-80 text-xs"
              valueFormatter={(number: number) => `${number.toLocaleString()} views`}
              color="blue"
            />
          </CardContent>
        </Card>
      </div>

      {/* Product Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Summary</CardTitle>
          <CardDescription>Overview of product metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Average Views per Product</span>
                <span className="font-bold">{Math.round(data.totalViews / data.totalProducts).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Average Sales per Product</span>
                <span className="font-bold">{(data.totalSales / data.totalProducts).toFixed(1)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">View to Sales Ratio</span>
                <span className="font-bold">{data.totalViews > 0 ? ((data.totalSales / data.totalViews) * 100).toFixed(2) : 0}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Categories</span>
                <span className="font-bold">{data.categoryDistribution.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Stock Coverage</span>
                <Badge variant="default" className="bg-green-600">
                  {((data.inStockProducts / data.totalProducts) * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Needs Attention</span>
                <Badge variant="destructive">
                  {(data.outOfStockProducts + data.lowStockProducts).toLocaleString()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
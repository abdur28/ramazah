"use client";

import { AlertTriangle, Eye, Package, ShoppingBag } from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import DonutChart from "@/components/admin/charts/DonutChart";
import BarList from "@/components/admin/charts/BarList";
import { formatNumber } from "@/lib/admin/format";
import type { ProductAnalytics } from "@/types/admin";

/**
 * The catalogue, in aggregate.
 *
 * The conversion figure is the one addition: views and sales were both shown,
 * side by side, and the ratio between them — how many people who looked at a
 * product bought it — was left for the reader to divide in their head.
 */
export default function ProductAnalyticsTab({ data }: { data: ProductAnalytics }) {
  const conversion = data.totalViews > 0 ? (data.totalSales / data.totalViews) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={formatNumber(data.totalProducts)} icon={Package} />
        <StatCard
          label="Units sold"
          value={formatNumber(data.totalSales)}
          hint="all time"
          icon={ShoppingBag}
        />
        <StatCard
          label="Product views"
          value={formatNumber(data.totalViews)}
          hint={`${conversion.toFixed(1)}% of views become a sale`}
          icon={Eye}
        />
        <StatCard
          label="Needs restocking"
          value={formatNumber(data.lowStockProducts + data.outOfStockProducts)}
          hint={`${data.lowStockProducts} low · ${data.outOfStockProducts} out`}
          tone={data.lowStockProducts + data.outOfStockProducts > 0 ? "attention" : "default"}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Stock health">
          <DonutChart
            data={[
              { name: "In stock", value: data.inStockProducts },
              { name: "Low stock", value: data.lowStockProducts },
              { name: "Out of stock", value: data.outOfStockProducts },
            ]}
            total={data.totalProducts}
            totalLabel="Products"
          />
        </SectionCard>

        <SectionCard title="Products per category">
          <BarList
            data={data.categoryDistribution.slice(0, 10).map((row) => ({
              name: row.category || "Uncategorised",
              value: row.count,
            }))}
            emptyMessage="Nothing is categorised yet."
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Best sellers">
          <BarList
            data={data.topSellingProducts.slice(0, 8).map((product) => ({
              name: product.name,
              value: product.salesCount,
              display: `${formatNumber(product.salesCount)} sold`,
              meta: `${formatNumber(product.viewCount)} views`,
              href: `/admin/products/${product.id}`,
            }))}
            emptyMessage="No sales recorded yet."
          />
        </SectionCard>

        <SectionCard
          title="Most looked at"
          description="High views with few sales usually means the price or the photography."
        >
          <BarList
            data={data.topViewedProducts.slice(0, 8).map((product) => ({
              name: product.name,
              value: product.viewCount,
              display: `${formatNumber(product.viewCount)} views`,
              meta: `${formatNumber(product.salesCount)} sold`,
              href: `/admin/products/${product.id}`,
            }))}
            emptyMessage="No views recorded yet."
          />
        </SectionCard>
      </div>
    </div>
  );
}

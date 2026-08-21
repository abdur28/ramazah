"use client";

import { Activity, TrendingUp, Users } from "lucide-react";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import DonutChart from "@/components/admin/charts/DonutChart";
import BarList from "@/components/admin/charts/BarList";
import { formatMoneyByCurrency, formatNumber } from "@/lib/admin/format";
import type { CustomerAnalytics } from "@/types/admin";

/**
 * Customers, in aggregate.
 *
 * The "Customer Growth" area chart is gone. It plotted two points — the total
 * minus this month's arrivals, then the total — which is not a trend, it is a
 * single subtraction drawn at 320 pixels tall. The acquisition figures beneath
 * said the same thing in three honest numbers, so those stayed and the chart
 * did not.
 */
export default function CustomerAnalyticsTab({ data }: { data: CustomerAnalytics }) {
  const activeShare =
    data.totalCustomers > 0 ? (data.activeCustomers / data.totalCustomers) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Customers"
          value={formatNumber(data.totalCustomers)}
          trend={data.customerGrowthRate}
          hint="vs last month"
          icon={Users}
        />
        <StatCard
          label="Have ordered"
          value={formatNumber(data.activeCustomers)}
          hint={`${activeShare.toFixed(0)}% of everyone signed up`}
          icon={Activity}
        />
        <StatCard
          label="New this month"
          value={formatNumber(data.newCustomersThisMonth)}
          hint={`${data.newCustomersThisWeek} this week · ${data.newCustomersToday} today`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Who has bought something">
          <DonutChart
            data={[
              { name: "Have ordered", value: data.activeCustomers },
              { name: "Signed up only", value: data.totalCustomers - data.activeCustomers },
            ]}
            total={data.totalCustomers}
            totalLabel="Accounts"
          />
        </SectionCard>

        <SectionCard
          title="Best customers"
          description="By what they have actually paid."
        >
          <BarList
            data={data.topCustomers.slice(0, 8).map((customer) => ({
              name: customer.name || customer.email,
              value: customer.revenues.reduce((sum, revenue) => sum + revenue.amount, 0),
              display: formatMoneyByCurrency(customer.revenues, true),
              meta: `${customer.totalOrders} ${customer.totalOrders === 1 ? "order" : "orders"}`,
            }))}
            emptyMessage="Nobody has ordered yet."
          />
        </SectionCard>
      </div>

      {data.customersByLocation.length > 0 && (
        <SectionCard title="Where they are">
          <BarList
            data={data.customersByLocation.slice(0, 10).map((row) => ({
              name: row.location,
              value: row.count,
              display: `${formatNumber(row.count)}`,
            }))}
          />
        </SectionCard>
      )}
    </div>
  );
}

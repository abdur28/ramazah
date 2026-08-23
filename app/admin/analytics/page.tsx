"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Coins, Loader2, Package, RefreshCcw, Search, ShoppingBag, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import CustomerAnalyticsTab from "@/components/admin/CustomerAnalyticsTab";
import ProductAnalyticsTab from "@/components/admin/ProductAnalyticsTab";
import OrderAnalyticsTab from "@/components/admin/OrderAnalyticsTab";
import TransactionsAnalyticsTab from "@/components/admin/TransactionsAnalyticsTab";
import RequestAnalyticsTab from "@/components/admin/RequestAnalyticsTab";
import useAdmin from "@/hooks/admin/useAdmin";
import { formatDateTime } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";

/**
 * Analytics.
 *
 * The four summary cards that sat above the tabs are gone: they repeated the
 * dashboard exactly, and each tab opens with the same figures in more detail
 * one row lower. The page is the four views and nothing else.
 *
 * The Transactions tab was fed entirely by mock data until now — see
 * `hooks/admin/useAdminAnalyticsData.ts`.
 */
export default function AdminAnalyticsPage() {
  const { analytics, loading, error, fetchAnalytics } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAnalytics();
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast.error(describeError(err, "Could not load analytics."));
    } finally {
      setRefreshing(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reach"
        title="Analytics"
        description={
          analytics
            ? `Everything measured, as of ${formatDateTime(analytics.lastUpdated)}.`
            : "Everything measured across customers, catalogue, orders and payments."
        }
        actions={
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error.analytics ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load analytics"
          description={error.analytics}
          action={
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          }
        />
      ) : loading.analytics && !analytics ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Working out the numbers…
        </div>
      ) : !analytics ? (
        <EmptyState icon={BarChart3} title="Nothing to measure yet" />
      ) : (
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList data-lenis-prevent className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Coins className="mr-2 h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="mr-2 h-4 w-4" />
              Customers
            </TabsTrigger>
            {/* The service the business leads with, and the analytics screen had
                no idea it existed. */}
            <TabsTrigger value="requests">
              <Search className="mr-2 h-4 w-4" />
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrderAnalyticsTab data={analytics.orders} />
          </TabsContent>
          <TabsContent value="payments">
            <TransactionsAnalyticsTab data={analytics.transactions} />
          </TabsContent>
          <TabsContent value="products">
            <ProductAnalyticsTab data={analytics.products} />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerAnalyticsTab data={analytics.customers} />
          </TabsContent>
          <TabsContent value="requests">
            <RequestAnalyticsTab data={analytics.requests} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import {
  AdminAnalyticsDataStore,
  AdminAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  OrderAnalytics,
  RequestAnalytics,
  TransactionAnalytics,
  CurrencyRevenue
} from '@/types/admin';
import { UserProfile, Order, Product } from '@/types/types';
import { EXPORT_LIMIT, getPayments } from '@/lib/admin/payments';
import { describeError } from '@/lib/admin/errors';

/**
 * Utility function to create error messages
 */
/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

/**
 * Utility function to convert Firestore timestamp to Date
 */
const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

/**
 * Admin hook for analytics data
 */
const supabase = () => createClient();

/**
 * The aggregations below read camelCase fields. These loaders map Supabase rows
 * into that shape so the calculation logic stays untouched.
 */
async function loadUsers() {
  const { data, error } = await supabase()
    .from('profiles').select('id, email, display_name, role, status, created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    uid: r.id, email: r.email, displayName: r.display_name,
    role: r.role, status: r.status, createdAt: r.created_at, address: undefined,
  }));
}

async function loadOrders() {
  const { data, error } = await supabase()
    .from('orders')
    .select('id, order_number, user_id, total, subtotal, status, payment_status, currency, created_at, payment_method, customer_name, customer_email');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, orderNumber: r.order_number, userId: r.user_id,
    total: Number(r.total), subtotal: Number(r.subtotal),
    status: r.status, paymentStatus: r.payment_status,
    currency: String(r.currency).toLowerCase(),
    paymentMethod: r.payment_method,
    customerName: r.customer_name, customerEmail: r.customer_email,
    createdAt: r.created_at,
  }));
}

async function loadProducts() {
  // product_listing carries the variant-derived stock and price aggregates.
  const { data, error } = await supabase()
    .from('product_listing')
    .select('id, name, category_path, total_stock, in_stock, min_price, price_currency, sales_count, view_count, low_stock_alert, created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, categoryPath: r.category_path ?? '',
    totalStock: r.total_stock ?? 0, inStock: !!r.in_stock,
    prices: r.min_price != null
      ? [{ currency: String(r.price_currency ?? 'NGN').toLowerCase(), price: Number(r.min_price) }]
      : [],
    salesCount: r.sales_count ?? 0, viewCount: r.view_count ?? 0,
    lowStockAlert: r.low_stock_alert ?? 5, createdAt: r.created_at,
  }));
}

const useAdminAnalyticsData = create<AdminAnalyticsDataStore>((set, get) => ({
  // State
  analytics: null,
  // Empty until `fetchTransactionAnalytics` reads the orders. This used to be
  // seeded with `generateMockTransactions()`, so the store held a hundred
  // fabricated payments before a single query had run.
  transactions: [],
  
  // Loading & Error states
  loading: {
    users: false,
    orders: false,
    products: false,
    categories: false,
    collections: false,
    analytics: false,
    adminAction: false
  },
  error: {
    users: null,
    orders: null,
    products: null,
    categories: null,
    collections: null,
    analytics: null,
    adminAction: null
  },
  
  // Reset method
  resetAnalytics: () => set({ 
    analytics: null,
    error: {
      users: null,
      orders: null,
      products: null,
      categories: null,
      collections: null,
      analytics: null,
      adminAction: null
    }
  }),
  
  /**
   * Fetch customer analytics
   */
  fetchCustomerAnalytics: async (): Promise<CustomerAnalytics> => {
    try {
      const users: any[] = await loadUsers();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Count new customers
      const newToday = users.filter(u => {
        const createdAt = toDate(u.createdAt);
        return createdAt >= today;
      }).length;
      
      const newThisWeek = users.filter(u => {
        const createdAt = toDate(u.createdAt);
        return createdAt >= weekAgo;
      }).length;
      
      const newThisMonth = users.filter(u => {
        const createdAt = toDate(u.createdAt);
        return createdAt >= monthAgo;
      }).length;
      
      const newLastMonth = users.filter(u => {
        const createdAt = toDate(u.createdAt);
        return createdAt >= twoMonthsAgo && createdAt < monthAgo;
      }).length;
      
      // Calculate growth rate
      const growthRate = newLastMonth > 0 
        ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 
        : 0;
      
      // Get orders for customer analytics
      const orders: any[] = await loadOrders();
      
      // Top customers, counting the people who have no account.
      //
      // `user_id` is nullable now — staff raise orders for customers who bought
      // over WhatsApp — and keying on it alone put every one of those into a
      // single bucket labelled "Unknown", which then also counted as one active
      // customer. They are keyed by email or name instead, and marked so nobody
      // reads them as an account.
      const customerOrderMap = new Map<string, {
        totalOrders: number; revenues: Map<string, number>;
        name: string; email: string; hasAccount: boolean;
      }>();

      orders.forEach(order => {
        const key = order.userId
          ?? (order.customerEmail ? `email:${order.customerEmail.toLowerCase()}` : null)
          ?? `name:${(order.customerName ?? '').toLowerCase()}`;

        if (!customerOrderMap.has(key)) {
          customerOrderMap.set(key, {
            totalOrders: 0,
            revenues: new Map(),
            name: order.customerName ?? 'Unnamed',
            email: order.customerEmail ?? '',
            hasAccount: Boolean(order.userId),
          });
        }
        const customer = customerOrderMap.get(key)!;
        customer.totalOrders += 1;

        const currency = order.currency || 'ngn';
        const currentRevenue = customer.revenues.get(currency) || 0;
        customer.revenues.set(currency, currentRevenue + (order.total || 0));
      });
      
      const topCustomers = Array.from(customerOrderMap.entries())
        .map(([key, stats]) => {
          const user = stats.hasAccount ? users.find(u => u.uid === key) : undefined;

          // Sorted on Naira, which is what this shop sells in. The previous rank
          // divided any RUB figure by 90 — a hoodskool leftover for a currency
          // this shop has never taken.
          const rank = stats.revenues.get('ngn')
            ?? Array.from(stats.revenues.values()).reduce((sum, amount) => sum + amount, 0);

          return {
            uid: stats.hasAccount ? key : '',
            name: user?.displayName || user?.email || stats.name,
            email: user?.email || stats.email,
            hasAccount: stats.hasAccount,
            totalOrders: stats.totalOrders,
            rank,
            revenues: Array.from(stats.revenues.entries()).map(([currency, amount]) => ({
              currency,
              amount
            }))
          };
        })
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 10)
        .map(({ rank, ...rest }) => rest);
      
      // Get customer locations from address field
      const locationMap = new Map<string, number>();
      users.forEach(user => {
        const location = user.address?.city || user.address?.country || 'Unknown';
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
      });
      
      const customersByLocation = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        totalCustomers: users.length,
        newCustomersToday: newToday,
        newCustomersThisWeek: newThisWeek,
        newCustomersThisMonth: newThisMonth,
        // Accounts that have ordered. Deliberately not the size of the map
        // above, which now also holds people with no account at all.
        activeCustomers: new Set(
          orders.filter(order => order.userId).map(order => order.userId)
        ).size,
        offSiteCustomers: Array.from(customerOrderMap.values())
          .filter(customer => !customer.hasAccount).length,
        customerGrowthRate: growthRate,
        topCustomers,
        customersByLocation
      };
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  },
  
  /**
   * Fetch product analytics
   */
  fetchProductAnalytics: async (): Promise<ProductAnalytics> => {
    try {
      const products: any[] = await loadProducts();
      
      const inStock = products.filter(p => p.inStock).length;
      const outOfStock = products.filter(p => !p.inStock).length;
      const lowStock = products.filter(p => p.inStock && p.totalStock < (p.lowStockAlert || 10)).length;
      
      const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      const totalSales = products.reduce((sum, p) => sum + (p.salesCount || 0), 0);
      
      // Top selling products
      const topSelling = products
        .map(p => ({
          id: p.id,
          name: p.name,
          salesCount: p.salesCount || 0,
          revenue: (p.salesCount || 0) * (p.prices?.[0]?.price || 0),
          viewCount: p.viewCount || 0
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 10);
      
      // Top viewed products
      const topViewed = products
        .map(p => ({
          id: p.id,
          name: p.name,
          viewCount: p.viewCount || 0,
          salesCount: p.salesCount || 0
        }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 10);
      
      // Category distribution
      const categoryMap = new Map<string, number>();
      products.forEach(p => {
        const category = p.categoryPath || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      
      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      
      return {
        totalProducts: products.length,
        inStockProducts: inStock,
        outOfStockProducts: outOfStock,
        lowStockProducts: lowStock,
        totalViews,
        totalSales,
        topSellingProducts: topSelling,
        topViewedProducts: topViewed,
        categoryDistribution
      };
    } catch (error) {
      console.error('Error fetching product analytics:', error);
      throw error;
    }
  },
  
  /**
   * Fetch order analytics
   */
  /**
   * The sourcing service, measured.
   *
   * Nothing counted it before, which is odd for the thing the business leads
   * with. The useful number is not how many were asked — it is how many turned
   * into something. A quote nobody ever answers is work done for nothing, and a
   * request nobody quotes is a customer being ignored.
   */
  fetchRequestAnalytics: async (): Promise<RequestAnalytics> => {
    const { data, error } = await supabase()
      .from('product_requests')
      .select('status, quoted_amount, created_at');
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const count = (status: string) => rows.filter((r: any) => r.status === status).length;
    const sum = (statuses: string[]) =>
      rows
        .filter((r: any) => statuses.includes(r.status) && r.quoted_amount != null)
        .reduce((total: number, r: any) => total + Number(r.quoted_amount), 0);

    const byStatus = ['asked', 'quoted', 'accepted', 'buying', 'fulfilled', 'declined', 'withdrawn']
      .map(status => ({ status, count: count(status) }))
      .filter(row => row.count > 0);

    // Of the quotes that got an answer either way, how many were yes. Quotes
    // still waiting are excluded — counting them as refusals would make the rate
    // fall simply because a quote went out this morning.
    const answeredYes = count('accepted') + count('buying') + count('fulfilled');
    const answeredNo = count('withdrawn');
    const answered = answeredYes + answeredNo;

    // Anything still on somebody's desk, and how long it has sat there.
    const open = rows.filter((r: any) => ['asked', 'quoted', 'accepted'].includes(r.status));
    const oldestOpenDays = open.length
      ? Math.max(...open.map((r: any) =>
          Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000)))
      : null;

    return {
      total: rows.length,
      byStatus,
      awaitingAnswer: count('quoted'),
      awaitingQuote: count('asked'),
      acceptanceRate: answered > 0 ? (answeredYes / answered) * 100 : 0,
      quotedValue: sum(['quoted']),
      acceptedValue: sum(['accepted', 'buying', 'fulfilled']),
      oldestOpenDays,
    };
  },

  fetchOrderAnalytics: async (): Promise<OrderAnalytics> => {
    try {
      const orders: any[] = await loadOrders();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Count by status
      const pending = orders.filter(o => o.status === 'pending').length;
      const processing = orders.filter(o => o.status === 'processing').length;
      const shipped = orders.filter(o => o.status === 'shipped').length;
      const delivered = orders.filter(o => o.status === 'delivered').length;
      const cancelled = orders.filter(o => o.status === 'cancelled').length;
      
      // Calculate revenue by currency
      const calculateRevenueByCurrency = (orderList: Order[]) => {
        const revenueMap = new Map<string, number>();
        orderList.forEach(order => {
          const currency = order.currency || 'usd';
          const current = revenueMap.get(currency) || 0;
          revenueMap.set(currency, current + (order.total || 0));
        });
        return Array.from(revenueMap.entries()).map(([currency, amount]) => ({
          currency,
          amount
        }));
      };
      
      // Calculate revenues for different time periods
      const ordersToday = orders.filter(o => {
        const createdAt = toDate(o.createdAt);
        return createdAt >= today;
      });
      
      const ordersThisWeek = orders.filter(o => {
        const createdAt = toDate(o.createdAt);
        return createdAt >= weekAgo;
      });
      
      const ordersThisMonth = orders.filter(o => {
        const createdAt = toDate(o.createdAt);
        return createdAt >= monthAgo;
      });
      
      const ordersLastMonth = orders.filter(o => {
        const createdAt = toDate(o.createdAt);
        return createdAt >= twoMonthsAgo && createdAt < monthAgo;
      });
      
      // Group revenues by currency
      const revenues: CurrencyRevenue[] = [];
      const currencySet = new Set<string>();
      orders.forEach(order => currencySet.add(order.currency || 'usd'));
      
      currencySet.forEach(currency => {
        const currencyOrders = orders.filter(o => (o.currency || 'usd') === currency);
        const totalRevenue = currencyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        const revenueToday = ordersToday
          .filter(o => (o.currency || 'usd') === currency)
          .reduce((sum, o) => sum + (o.total || 0), 0);
        
        const revenueThisWeek = ordersThisWeek
          .filter(o => (o.currency || 'usd') === currency)
          .reduce((sum, o) => sum + (o.total || 0), 0);
        
        const revenueThisMonth = ordersThisMonth
          .filter(o => (o.currency || 'usd') === currency)
          .reduce((sum, o) => sum + (o.total || 0), 0);
        
        const averageOrderValue = currencyOrders.length > 0 
          ? totalRevenue / currencyOrders.length 
          : 0;
        
        revenues.push({
          currency,
          totalRevenue,
          revenueToday,
          revenueThisWeek,
          revenueThisMonth,
          averageOrderValue
        });
      });
      
      // Calculate growth rates (using USD for comparison, or first currency if USD not available)
      const primaryRevenue = revenues.find(r => r.currency === 'usd') || revenues[0];
      const lastMonthPrimaryRevenue = ordersLastMonth
        .filter(o => (o.currency || 'usd') === (primaryRevenue?.currency || 'usd'))
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      const orderGrowthRate = ordersLastMonth.length > 0 
        ? ((ordersThisMonth.length - ordersLastMonth.length) / ordersLastMonth.length) * 100 
        : 0;
      
      const revenueGrowthRate = lastMonthPrimaryRevenue > 0 && primaryRevenue
        ? ((primaryRevenue.revenueThisMonth - lastMonthPrimaryRevenue) / lastMonthPrimaryRevenue) * 100 
        : 0;
      
      // Where the orders came from.
      //
      // Website orders were the only kind that could exist until staff could
      // raise one, and the shop's actual selling happens on WhatsApp — so this
      // is the split that says whether the numbers above describe the business
      // or only the part of it with a checkout.
      const channelMap = new Map<string, { count: number; settled: number; revenues: Map<string, number> }>();
      orders.forEach(order => {
        const channel = order.channel || 'web';
        if (!channelMap.has(channel)) {
          channelMap.set(channel, { count: 0, settled: 0, revenues: new Map() });
        }
        const stats = channelMap.get(channel)!;
        stats.count += 1;

        // Revenue means settled money here, as it does everywhere else on this
        // screen — an unpaid order is not income.
        if (order.paymentStatus === 'paid' && order.status !== 'refunded') {
          stats.settled += 1;
          const currency = order.currency || 'ngn';
          stats.revenues.set(currency, (stats.revenues.get(currency) || 0) + (order.total || 0));
        }
      });

      const ordersByChannel = Array.from(channelMap.entries())
        .map(([channel, stats]) => ({
          channel,
          count: stats.count,
          settled: stats.settled,
          revenues: Array.from(stats.revenues.entries()).map(([currency, amount]) => ({
            currency, amount,
          })),
        }))
        .sort((a, b) => b.count - a.count);

      // Orders by status with revenue
      const ordersByStatus = [
        { 
          status: 'pending' as const, 
          count: pending, 
          revenues: calculateRevenueByCurrency(orders.filter(o => o.status === 'pending'))
        },
        { 
          status: 'processing' as const, 
          count: processing, 
          revenues: calculateRevenueByCurrency(orders.filter(o => o.status === 'processing'))
        },
        { 
          status: 'shipped' as const, 
          count: shipped, 
          revenues: calculateRevenueByCurrency(orders.filter(o => o.status === 'shipped'))
        },
        { 
          status: 'delivered' as const, 
          count: delivered, 
          revenues: calculateRevenueByCurrency(orders.filter(o => o.status === 'delivered'))
        },
        { 
          status: 'cancelled' as const, 
          count: cancelled, 
          revenues: []
        },
        { 
          status: 'refunded' as const, 
          count: 0, 
          revenues: []
        }
      ];
      
      return {
        totalOrders: orders.length,
        pendingOrders: pending,
        processingOrders: processing,
        shippedOrders: shipped,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
        ordersToday: ordersToday.length,
        ordersThisWeek: ordersThisWeek.length,
        ordersThisMonth: ordersThisMonth.length,
        orderGrowthRate,
        revenueGrowthRate,
        revenues,
        ordersByStatus,
        ordersByChannel
      };
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      throw error;
    }
  },
  
  /**
   * Payment analytics, derived from the orders.
   *
   * Reads the real ledger through `getPayments()` and stores the rows, so the
   * Payments screen and this tab agree by construction rather than by two
   * copies of the same generator.
   */
  fetchTransactionAnalytics: async (): Promise<TransactionAnalytics> => {
    try {
      // Analytics wants the ledger, not a page of it. The ceiling is explicit
      // and generous: this used to inherit a limit of 500, which silently
      // stopped being the whole ledger at the five-hundred-and-first order.
      // Past ten thousand these charts should be aggregated in SQL rather than
      // summed here, and this is where that will become obvious.
      const { payments, error } = await getPayments({ size: EXPORT_LIMIT });
      if (error) throw new Error(error);

      set({ transactions: payments });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const successful = payments.filter(t => t.status === 'success');
      const pending = payments.filter(t => t.status === 'pending');
      const failed = payments.filter(t => t.status === 'failed');
      const refunded = payments.filter(t => t.status === 'refunded');

      // Revenue means money that actually arrived. The old version summed every
      // transaction regardless of status, so failed and pending payments were
      // counted as income.
      const revenues: CurrencyRevenue[] = [];
      const currencies = Array.from(new Set(payments.map(t => t.currency)));

      currencies.forEach(currency => {
        const settled = successful.filter(t => t.currency === currency);
        const all = payments.filter(t => t.currency === currency);

        const totalRevenue = settled.reduce((sum, t) => sum + t.amount, 0);

        revenues.push({
          currency,
          totalRevenue,
          revenueToday: settled.filter(t => t.date >= today).reduce((sum, t) => sum + t.amount, 0),
          revenueThisWeek: settled.filter(t => t.date >= weekAgo).reduce((sum, t) => sum + t.amount, 0),
          revenueThisMonth: settled.filter(t => t.date >= monthAgo).reduce((sum, t) => sum + t.amount, 0),
          averageOrderValue: settled.length > 0 ? totalRevenue / settled.length : 0,
          averageTransactionValue: all.length > 0 ? totalRevenue / all.length : 0,
        });
      });

      // Payment method used to be grouped here. Every order settles by transfer
      // against the invoice, so the breakdown had one bar — and cash on
      // delivery, the only other value it could take, is not something the shop
      // reconciles from a screen.

      return {
        totalTransactions: payments.length,
        successfulTransactions: successful.length,
        pendingTransactions: pending.length,
        failedTransactions: failed.length,
        refundedTransactions: refunded.length,
        revenues,
        transactionsToday: payments.filter(t => t.date >= today).length,
        transactionsThisWeek: payments.filter(t => t.date >= weekAgo).length,
        transactionsThisMonth: payments.filter(t => t.date >= monthAgo).length,
      };
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      throw error;
    }
  },

  /**
   * Fetch all analytics
   */
  fetchAnalytics: async () => {
    set(state => ({ 
      loading: { ...state.loading, analytics: true },
      error: { ...state.error, analytics: null } 
    }));
    
    try {
      const [customers, products, orders, requests, transactions] = await Promise.all([
        get().fetchCustomerAnalytics(),
        get().fetchProductAnalytics(),
        get().fetchOrderAnalytics(),
        get().fetchRequestAnalytics(),
        get().fetchTransactionAnalytics()
      ]);
      
      const analytics: AdminAnalytics = {
        customers,
        products,
        orders,
        requests,
        transactions,
        lastUpdated: new Date().toISOString()
      };
      
      set(state => ({
        analytics,
        loading: { ...state.loading, analytics: false }
      }));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      set(state => ({
        loading: { ...state.loading, analytics: false },
        error: { ...state.error, analytics: createErrorMessage(error) }
      }));
    }
  }
}));

export default useAdminAnalyticsData;
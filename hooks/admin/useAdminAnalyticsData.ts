import { create } from "zustand";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  AdminAnalyticsDataStore,
  AdminAnalytics,
  CustomerAnalytics,
  ProductAnalytics,
  OrderAnalytics,
  TransactionAnalytics,
  Transaction,
  TransactionStatus,
  PaymentMethodType,
  CurrencyRevenue
} from '@/types/admin';
import { UserProfile, Order, Product } from '@/types/types';

/**
 * Utility function to create error messages
 */
const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

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
 * Generate mock transaction data with multiple currencies
 */
const generateMockTransactions = (): Transaction[] => {
  const statuses: TransactionStatus[] = ['success', 'pending', 'failed', 'refunded'];
  const paymentMethods: PaymentMethodType[] = ['Credit Card', 'PayPal', 'Stripe', 'Bank Transfer', 'Cash on Delivery'];
  const customers = [
    'John Doe', 'Jane Smith', 'Michael Brown', 'Sarah Johnson', 'David Lee',
    'Emma Wilson', 'James Taylor', 'Olivia Martinez', 'William Anderson', 'Sophia Garcia'
  ];
  const currencies = ['USD', 'RUB'];
  
  return Array.from({ length: 100 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const amount = currency === 'RUB' 
      ? (Math.random() * 45000 + 1800).toFixed(2) // RUB amounts (roughly 90x USD)
      : (Math.random() * 500 + 20).toFixed(2);    // USD amounts
    const date = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    
    return {
      id: `TXN-${String(10000 + i).padStart(5, '0')}`,
      orderNumber: `ORD-${String(5000 + i).padStart(5, '0')}`,
      customer: customers[Math.floor(Math.random() * customers.length)],
      email: `customer${i}@example.com`,
      amount: parseFloat(amount),
      currency: currency,
      status,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      date: date,
      description: status === 'success' ? 'Payment processed successfully' :
                   status === 'pending' ? 'Payment is being processed' :
                   status === 'failed' ? 'Payment declined by bank' :
                   'Payment refunded to customer',
    };
  });
};

/**
 * Admin hook for analytics data
 */
const useAdminAnalyticsData = create<AdminAnalyticsDataStore>((set, get) => ({
  // State
  analytics: null,
  transactions: generateMockTransactions(),
  
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
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ 
        uid: doc.id, 
        ...doc.data() 
      } as UserProfile));
      
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
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));
      
      // Calculate top customers with multi-currency revenue
      const customerOrderMap = new Map<string, { totalOrders: number; revenues: Map<string, number> }>();
      orders.forEach(order => {
        const customerId = order.userId;
        if (!customerOrderMap.has(customerId)) {
          customerOrderMap.set(customerId, {
            totalOrders: 0,
            revenues: new Map()
          });
        }
        const customer = customerOrderMap.get(customerId)!;
        customer.totalOrders += 1;
        
        const currency = order.currency || 'usd';
        const currentRevenue = customer.revenues.get(currency) || 0;
        customer.revenues.set(currency, currentRevenue + (order.total || 0));
      });
      
      const topCustomers = Array.from(customerOrderMap.entries())
        .map(([userId, stats]) => {
          const user = users.find(u => u.uid === userId);
          // Calculate total spent in USD for sorting (using a simple conversion for demo)
          const totalSpentUSD = Array.from(stats.revenues.entries()).reduce((sum, [curr, amount]) => {
            return sum + (curr === 'rub' ? amount / 90 : amount); // Simple conversion for sorting
          }, 0);
          
          return {
            uid: userId,
            name: user?.displayName || user?.email || 'Unknown',
            email: user?.email || '',
            totalOrders: stats.totalOrders,
            totalSpentUSD, // For sorting only
            revenues: Array.from(stats.revenues.entries()).map(([currency, amount]) => ({
              currency,
              amount
            }))
          };
        })
        .sort((a, b) => b.totalSpentUSD - a.totalSpentUSD)
        .slice(0, 10)
        .map(({ totalSpentUSD, ...rest }) => rest); // Remove sorting helper
      
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
        activeCustomers: customerOrderMap.size,
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
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const products = productsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Product));
      
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
  fetchOrderAnalytics: async (): Promise<OrderAnalytics> => {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));
      
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
        ordersByStatus
      };
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      throw error;
    }
  },
  
  /**
   * Fetch transaction analytics (using mock data)
   */
  fetchTransactionAnalytics: async (): Promise<TransactionAnalytics> => {
    try {
      const transactions = get().transactions;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const successful = transactions.filter(t => t.status === 'success');
      const pending = transactions.filter(t => t.status === 'pending');
      const failed = transactions.filter(t => t.status === 'failed');
      const refunded = transactions.filter(t => t.status === 'refunded');
      
      // Calculate revenues by currency
      const revenues: CurrencyRevenue[] = [];
      const currencySet = new Set<string>();
      transactions.forEach(t => currencySet.add(t.currency));
      
      currencySet.forEach(currency => {
        const currencyTransactions = transactions.filter(t => t.currency === currency);
        const currencySuccessful = successful.filter(t => t.currency === currency);
        
        const totalRevenue = currencyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const successfulRevenue = currencySuccessful.reduce((sum, t) => sum + t.amount, 0);
        
        const revenueToday = currencyTransactions
          .filter(t => t.date >= today)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const revenueThisWeek = currencyTransactions
          .filter(t => t.date >= weekAgo)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const revenueThisMonth = currencyTransactions
          .filter(t => t.date >= monthAgo)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const averageTransactionValue = currencyTransactions.length > 0 
          ? totalRevenue / currencyTransactions.length 
          : 0;
        
        revenues.push({
          currency,
          totalRevenue,
          revenueToday,
          revenueThisWeek,
          revenueThisMonth,
          averageOrderValue: 0,
          averageTransactionValue
        });
      });
      
      const transactionsToday = transactions.filter(t => t.date >= today).length;
      const transactionsThisWeek = transactions.filter(t => t.date >= weekAgo).length;
      const transactionsThisMonth = transactions.filter(t => t.date >= monthAgo).length;
      
      // Payment method distribution with multi-currency
      const methodMap = new Map<PaymentMethodType, { count: number; revenues: Map<string, number> }>();
      transactions.forEach(t => {
        if (!methodMap.has(t.paymentMethod)) {
          methodMap.set(t.paymentMethod, { count: 0, revenues: new Map() });
        }
        const stats = methodMap.get(t.paymentMethod)!;
        stats.count += 1;
        
        if (t.status === 'success') {
          const current = stats.revenues.get(t.currency) || 0;
          stats.revenues.set(t.currency, current + t.amount);
        }
      });
      
      const paymentMethodDistribution = Array.from(methodMap.entries())
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          revenues: Array.from(stats.revenues.entries()).map(([currency, amount]) => ({
            currency,
            amount
          }))
        }))
        .sort((a, b) => b.count - a.count);
      
      return {
        totalTransactions: transactions.length,
        successfulTransactions: successful.length,
        pendingTransactions: pending.length,
        failedTransactions: failed.length,
        refundedTransactions: refunded.length,
        revenues,
        transactionsToday,
        transactionsThisWeek,
        transactionsThisMonth,
        paymentMethodDistribution
      };
    } catch (error) {
      console.error('Error fetching transaction analytics:', error);
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
      const [customers, products, orders, transactions] = await Promise.all([
        get().fetchCustomerAnalytics(),
        get().fetchProductAnalytics(),
        get().fetchOrderAnalytics(),
        get().fetchTransactionAnalytics()
      ]);
      
      const analytics: AdminAnalytics = {
        customers,
        products,
        orders,
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
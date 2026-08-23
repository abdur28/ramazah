import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { getOrderById as fetchOrder, mapOrder, updateOrderStatus as setOrderStatus,
         updatePaymentStatus as setPaymentStatus } from '@/lib/orders';
import { Order, OrderStatus, PaymentStatus } from '@/types/types';
import { describeError } from '@/lib/admin/errors';
import type { FetchOptions } from '@/types/admin';
import { PAGE_SIZE, fetchPage, ilikeAny, rangeFor } from '@/lib/paging';

interface AdminOrderDataStore {
  orders: Order[];
  loading: {
    users: boolean; orders: boolean; products: boolean; categories: boolean;
    collections: boolean; analytics: boolean; adminAction: boolean;
  };
  error: {
    users: string | null; orders: string | null; products: string | null;
    categories: string | null; collections: string | null;
    analytics: string | null; adminAction: string | null;
  };
  pagination: {
    users: { page: number; total: number };
    orders: { page: number; total: number };
    products: { page: number; total: number };
    categories: { page: number; total: number };
    collections: { page: number; total: number };
  };

  fetchOrders: (options?: FetchOptions) => Promise<void>;
  getOrderById: (orderId: string) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: PaymentStatus, reason?: string) => Promise<void>;
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<void>;
  resetOrders: () => void;
}


const supabase = () => createClient();

/**
 * Store-level errors, worded for a person.Previously this returned
 * `error.message` verbatim, so a dropped connection reached the screen as
 * "TypeError: Failed to fetch". See `lib/admin/errors.ts`.
 */
const createErrorMessage = (error: any): string =>
  describeError(error, 'Something went wrong. Try again.');

/** Order field names -> orders column names. */
const COLUMN: Record<string, string> = {
  createdAt: 'created_at', updatedAt: 'updated_at', orderNumber: 'order_number',
  paymentStatus: 'payment_status', customerName: 'customer_name',
  customerEmail: 'customer_email', total: 'total', status: 'status',
  userId: 'user_id', trackingNumber: 'tracking_number', carrier: 'carrier',
  paymentMethod: 'payment_method',
};
const col = (field: string) => COLUMN[field] ?? field;

const useAdminOrdersData = create<AdminOrderDataStore>((set, get) => ({
  orders: [],

  loading: { users: false, orders: false, products: false, categories: false,
             collections: false, analytics: false, adminAction: false },
  error: { users: null, orders: null, products: null, categories: null,
           collections: null, analytics: null, adminAction: null },
  pagination: {
    users: { page: 1, total: 0 },
    orders: { page: 1, total: 0 },
    products: { page: 1, total: 0 },
    categories: { page: 1, total: 0 },
    collections: { page: 1, total: 0 },
  },

  resetOrders: () => set({
    orders: [],
    pagination: { ...get().pagination, orders: { page: 1, total: 0 } }
  }),

  /**
   * One page of orders.
   *
   * RLS gives admins every order; ordinary users would see only their own.
   *
   * Status, payment state and the search box are all applied here rather than
   * in the screen. They used to be a `useMemo` over whatever had been loaded,
   * which was fine while the fetch asked for 100 and the shop had thirteen
   * orders — and quietly wrong the moment it had a hundred and one, because
   * searching for an order number the query had never fetched found nothing and
   * said so.
   *
   * `count: 'exact'` rides along with the same request, so the total the pager
   * shows is the number of orders matching these filters, not the number on
   * this page.
   */
  fetchOrders: async (options: FetchOptions = {}) => {
    set(state => ({
      loading: { ...state.loading, orders: true },
      error: { ...state.error, orders: null }
    }));

    try {
      const {
        page = 1,
        size = PAGE_SIZE,
        filters = [],
        search = '',
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;

      const { data, error, count, page: landed } = await fetchPage(page, async (p) => {
        const [first, last] = rangeFor(p, size);

        let q = supabase().from('orders').select(`
          *, order_items ( id, product_id, variant_id, name, sku, variant_label,
                           options, image_url, unit_price, quantity, line_total )
        `, { count: 'exact' });
        for (const f of filters) q = q.eq(col(f.field), f.value);

        const term = search.trim();
        if (term) {
          q = q.or(ilikeAny(
            ['order_number', 'customer_name', 'customer_email', 'customer_phone'],
            term
          ));
        }

        return q
          .order(col(orderByField), { ascending: orderDirection === 'asc' })
          .range(first, last);
      });

      if (error) throw new Error(error.message);

      const orders = (data ?? []).map(mapOrder);

      set(state => ({
        orders,
        loading: { ...state.loading, orders: false },
        pagination: {
          ...state.pagination,
          orders: { page: landed, total: count ?? orders.length }
        }
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      set(state => ({
        loading: { ...state.loading, orders: false },
        error: { ...state.error, orders: createErrorMessage(error) }
      }));
    }
  },

  getOrderById: async (orderId: string): Promise<Order | null> => {
    const { order, error } = await fetchOrder(orderId);
    if (error) {
      set(state => ({ error: { ...state.error, adminAction: error } }));
      return null;
    }
    return order ?? null;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, note?: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await setOrderStatus(orderId, status, note);
      if (error) throw new Error(error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  updatePaymentStatus: async (orderId: string, paymentStatus: PaymentStatus, reason?: string) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await setPaymentStatus(orderId, paymentStatus, reason);
      if (error) throw new Error(error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus } : o)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },

  updateOrder: async (orderId: string, data: Partial<Order>) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const patch: Record<string, any> = {};
      if (data.trackingNumber !== undefined) patch.tracking_number = data.trackingNumber;
      if (data.carrier !== undefined)        patch.carrier = data.carrier;
      if (data.customerNotes !== undefined)  patch.customer_notes = data.customerNotes;
      if (data.paymentMethod !== undefined)  patch.payment_method = data.paymentMethod;
      if (data.status !== undefined)         patch.status = data.status;
      if (data.paymentStatus !== undefined)  patch.payment_status = data.paymentStatus;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase().from('orders').update(patch).eq('id', orderId);
        if (error) throw new Error(error.message);
      }

      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(o => o.id === orderId ? { ...o, ...data } : o)
      }));
    } catch (error) {
      set(state => ({ loading: { ...state.loading, adminAction: false },
                      error: { ...state.error, adminAction: createErrorMessage(error) } }));
      throw error;
    }
  },
}));

export default useAdminOrdersData;

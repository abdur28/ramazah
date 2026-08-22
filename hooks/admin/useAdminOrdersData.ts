import { create } from "zustand";
import { createClient } from '@/lib/supabase/client';
import { getOrderById as fetchOrder, updateOrderStatus as setOrderStatus,
         updatePaymentStatus as setPaymentStatus } from '@/lib/orders';
import { Order, OrderStatus, PaymentStatus } from '@/types/types';
import { describeError } from '@/lib/admin/errors';

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
    users: { lastDoc: any; hasMore: boolean };
    orders: { lastDoc: any; hasMore: boolean };
    products: { lastDoc: any; hasMore: boolean };
    categories: { lastDoc: any; hasMore: boolean };
    collections: { lastDoc: any; hasMore: boolean };
  };

  fetchOrders: (options?: FetchOptions) => Promise<void>;
  getOrderById: (orderId: string) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => Promise<void>;
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<void>;
  resetOrders: () => void;
}

interface FetchOptions {
  limit?: number;
  startAfter?: any;
  filters?: FilterOption[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

interface FilterOption { field: string; operator: any; value: any; }

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
    users: { lastDoc: null, hasMore: false },
    orders: { lastDoc: null, hasMore: false },
    products: { lastDoc: null, hasMore: false },
    categories: { lastDoc: null, hasMore: false },
    collections: { lastDoc: null, hasMore: false },
  },

  resetOrders: () => set({
    orders: [],
    pagination: { ...get().pagination, orders: { lastDoc: null, hasMore: false } }
  }),

  /** RLS gives admins every order; ordinary users would see only their own. */
  fetchOrders: async (options: FetchOptions = {}) => {
    set(state => ({
      loading: { ...state.loading, orders: true },
      error: { ...state.error, orders: null }
    }));

    try {
      const {
        limit: limitCount = 20,
        startAfter: startOffset,
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;

      const offset = (startOffset as number) ?? 0;

      let q = supabase().from('orders').select(`
        *, order_items ( id, product_id, variant_id, name, sku, variant_label,
                         options, image_url, unit_price, quantity, line_total )
      `);
      for (const f of filters) q = q.eq(col(f.field), f.value);

      const { data, error } = await q
        .order(col(orderByField), { ascending: orderDirection === 'asc' })
        .range(offset, offset + limitCount - 1);

      if (error) throw new Error(error.message);

      // Reuse the mapping in lib/orders via a single-row fetch shape.
      const orders = (data ?? []).map((row: any) => mapRow(row));

      set(state => ({
        orders: offset > 0 ? [...state.orders, ...orders] : orders,
        loading: { ...state.loading, orders: false },
        pagination: {
          ...state.pagination,
          orders: { lastDoc: offset + orders.length, hasMore: orders.length === limitCount }
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

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await setOrderStatus(orderId, status);
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

  updatePaymentStatus: async (orderId: string, paymentStatus: PaymentStatus) => {
    set(state => ({ loading: { ...state.loading, adminAction: true },
                    error: { ...state.error, adminAction: null } }));
    try {
      const { error } = await setPaymentStatus(orderId, paymentStatus);
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

/** Local copy of the orders mapper, kept in sync with lib/orders.ts. */
function mapRow(row: any): Order {
  const currency = String(row.currency).toLowerCase() as Order['currency'];
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    deliveryType: row.delivery_type === 'in_store' ? 'inStore' : 'delivery',
    items: (row.order_items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.product_id ?? '',
      variantId: i.variant_id ?? undefined,
      name: i.name,
      sku: i.sku,
      price: Number(i.unit_price),
      lineTotal: Number(i.line_total),
      currency,
      quantity: i.quantity,
      variantLabel: i.variant_label ?? undefined,
      options: i.options ?? {},
      imageUrl: i.image_url ?? '',
    })),
    currency,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax_amount ?? 0),
    shippingCost: Number(row.shipping_cost ?? 0),
    discount: Number(row.discount_amount ?? 0),
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    paymentMethod: row.payment_method ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    carrier: row.carrier ?? undefined,
    customerNotes: row.customer_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    pickedUpAt: row.picked_up_at ?? undefined,
  };
}

export default useAdminOrdersData;

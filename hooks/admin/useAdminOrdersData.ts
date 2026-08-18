import { create } from "zustand";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, OrderStatus, PaymentStatus } from '@/types/types';

interface AdminOrderDataStore {
  orders: Order[];
  loading: {
    users: boolean;
    orders: boolean;
    products: boolean;
    categories: boolean;
    collections: boolean;
    analytics: boolean;
    adminAction: boolean;
  };
  error: {
    users: string | null;
    orders: string | null;
    products: string | null;
    categories: string | null;
    collections: string | null;
    analytics: string | null;
    adminAction: string | null;
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

interface FilterOption {
  field: string;
  operator: any;
  value: any;
}

const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return new Date(timestamp).toISOString();
};

const createErrorMessage = (error: any): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

const useAdminOrdersData = create<AdminOrderDataStore>((set, get) => ({
  orders: [],
  
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
  pagination: {
    users: { lastDoc: null, hasMore: false },
    orders: { lastDoc: null, hasMore: false },
    products: { lastDoc: null, hasMore: false },
    categories: { lastDoc: null, hasMore: false },
    collections: { lastDoc: null, hasMore: false },
  },
  
  resetOrders: () => set({ 
    orders: [], 
    pagination: { 
      ...get().pagination, 
      orders: { lastDoc: null, hasMore: false } 
    } 
  }),
  
  fetchOrders: async (options: FetchOptions = {}) => {
    set(state => ({ 
      loading: { ...state.loading, orders: true },
      error: { ...state.error, orders: null } 
    }));
    
    try {
      const {
        limit: limitCount = 20,
        startAfter: startAfterDoc,
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
      } = options;
      
      let baseQuery = query(collection(db, 'orders'));
      
      if (filters.length > 0) {
        filters.forEach(filter => {
          baseQuery = query(baseQuery, where(filter.field, filter.operator, filter.value));
        });
      }
      
      let orderedQuery = query(baseQuery, orderBy(orderByField, orderDirection));
      
      let paginatedQuery;
      if (startAfterDoc || get().pagination.orders.lastDoc) {
        const lastDoc = startAfterDoc || get().pagination.orders.lastDoc;
        paginatedQuery = query(orderedQuery, startAfter(lastDoc), limit(limitCount));
      } else {
        paginatedQuery = query(orderedQuery, limit(limitCount));
      }
      
      const snapshot = await getDocs(paginatedQuery);
      
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt,
        paidAt: doc.data().paidAt || undefined,
        shippedAt: doc.data().shippedAt || undefined,
        deliveredAt: doc.data().deliveredAt || undefined,
        pickedUpAt: doc.data().pickedUpAt || undefined,
      } as Order));
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      set(state => ({
        orders: options.startAfter ? [...state.orders, ...orders] : orders,
        loading: { ...state.loading, orders: false },
        pagination: {
          ...state.pagination,
          orders: {
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === limitCount
          }
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
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      
      if (!orderDoc.exists()) return null;
      
      return {
        id: orderDoc.id,
        ...orderDoc.data(),
        createdAt: orderDoc.data().createdAt,
        updatedAt: orderDoc.data().updatedAt,
        paidAt: orderDoc.data().paidAt || undefined,
        shippedAt: orderDoc.data().shippedAt || undefined,
        deliveredAt: orderDoc.data().deliveredAt || undefined,
        pickedUpAt: orderDoc.data().pickedUpAt || undefined,
      } as Order;
    } catch (error) {
      console.error('Error getting order by ID:', error);
      set(state => ({
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      return null;
    }
  },
  
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };
      
      if (status === 'shipped') {
        updateData.shippedAt = serverTimestamp();
      } else if (status === 'delivered') {
        updateData.deliveredAt = serverTimestamp();
      }
      
      await updateDoc(orderRef, updateData);
      
      // Get the full order details for email
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const { createdAt, ...orderData } = { id: orderSnap.id, ...orderSnap.data() } as Order;
        const newCreatedAt = createdAt.toDate().toISOString();
        const newOrderData = { ...orderData, createdAt: newCreatedAt };
        
        // Send appropriate email based on status
        try {
          if (status === 'shipped') {
            // Send shipped email to customer
            await fetch('/api/send-order-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'shipped',
                order: newOrderData
              })
            });
          } else if (status === 'delivered') {
            // Send delivered email to customer
            await fetch('/api/send-order-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'delivered',
                order: newOrderData
              })
            });
          }
          
          // Send admin notification for any status change
          await fetch('/api/send-order-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admin',
              order: newOrderData,
              statusChange: status
            })
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't throw error - order update succeeded
        }
      }
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(order => 
          order.id === orderId 
            ? { ...order, status, updatedAt: Timestamp.now() } 
            : order
        )
      }));
    } catch (error) {
      console.error('Error updating order status:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  updatePaymentStatus: async (orderId: string, status: PaymentStatus) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = {
        paymentStatus: status,
        updatedAt: serverTimestamp(),
      };
      
      if (status === 'paid') {
        updateData.paidAt = serverTimestamp();
      }
      
      await updateDoc(orderRef, updateData);
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(order => 
          order.id === orderId 
            ? { ...order, paymentStatus: status, updatedAt: Timestamp.now() } 
            : order
        )
      }));
    } catch (error) {
      console.error('Error updating payment status:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  },
  
  updateOrder: async (orderId: string, data: Partial<Order>) => {
    set(state => ({ 
      loading: { ...state.loading, adminAction: true },
      error: { ...state.error, adminAction: null } 
    }));
    
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        orders: state.orders.map(order => 
          order.id === orderId 
            ? { ...order, ...data, updatedAt: Timestamp.now() } 
            : order
        )
      }));
    } catch (error) {
      console.error('Error updating order:', error);
      set(state => ({
        loading: { ...state.loading, adminAction: false },
        error: { ...state.error, adminAction: createErrorMessage(error) }
      }));
      throw error;
    }
  }
}));

export default useAdminOrdersData;
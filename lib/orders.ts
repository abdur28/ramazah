// lib/orders.ts
import { db } from './firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  arrayUnion,
  serverTimestamp, 
  getDoc,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import type { Order, OrderItem, DeliveryType, CurrencyCode, CreateOrderData } from '@/types/types';

/**
 * Create a new order
 */
export async function createOrder(orderData: CreateOrderData): Promise<{ 
  orderId?: string; 
  error?: string 
}> {
  try {
    // Generate order number
    const orderNumber = `HS${Date.now().toString().slice(-8)}`;

    // Prepare order document
    const order: Omit<Order, 'id'> = {
      orderNumber,
      userId: orderData.userId,
      deliveryType: orderData.deliveryType,
      items: orderData.items,
      currency: orderData.currency,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      shippingCost: orderData.shippingCost,
      total: orderData.total,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: orderData.shippingAddress ? {
        fullName: orderData.customerName,
        phone: orderData.customerPhone,
        street: orderData.shippingAddress.street,
        city: orderData.shippingAddress.city,
        state: orderData.shippingAddress.state,
        zipCode: orderData.shippingAddress.zipCode,
        country: orderData.shippingAddress.country,
        isDefault: false,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      } : {} as any,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    // Create order in Firestore
    const ordersRef = collection(db, 'orders');
    const orderDoc = await addDoc(ordersRef, order);

    // Add order ID to user's orders array
    const userRef = doc(db, 'users', orderData.userId);
    await updateDoc(userRef, {
      orders: arrayUnion(orderDoc.id),
      updatedAt: serverTimestamp(),
    });

    return { orderId: orderDoc.id };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { error: error.message || 'Failed to create order' };
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string): Promise<{
  order?: Order;
  error?: string;
}> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { error: 'Order not found' };
    }

    return {
      order: {
        id: orderSnap.id,
        ...orderSnap.data(),
      } as Order,
    };
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return { error: error.message || 'Failed to fetch order' };
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(userId: string): Promise<{
  orders?: Order[];
  error?: string;
}> {
  try {
    
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      } as Order);
    });

    return { orders };
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    return { error: error.message || 'Failed to fetch orders' };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<{ success?: boolean; error?: string }> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'shipped' && { shippedAt: serverTimestamp() }),
      ...(status === 'delivered' && { deliveredAt: serverTimestamp() }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return { error: error.message || 'Failed to update order status' };
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: Order['paymentStatus']
): Promise<{ success?: boolean; error?: string }> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      paymentStatus,
      updatedAt: serverTimestamp(),
      ...(paymentStatus === 'paid' && { paidAt: serverTimestamp() }),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return { error: error.message || 'Failed to update payment status' };
  }
}
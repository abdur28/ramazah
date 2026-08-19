// lib/orders.ts
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderItem, CreateOrderData, CurrencyCode } from '@/types/types';

const supabase = () => createClient();

const ORDER_SELECT = `
  *,
  order_items ( id, product_id, variant_id, name, sku, variant_label, options,
                image_url, unit_price, quantity, line_total )
`;

/** TS uses 'inStore'; the database enum uses 'in_store'. */
const toDbDelivery = (t: string) => (t === 'inStore' ? 'in_store' : 'delivery');
const fromDbDelivery = (t: string) => (t === 'in_store' ? 'inStore' : 'delivery');

function mapOrderItem(row: any, currency: CurrencyCode): OrderItem {
  const options = (row.options ?? {}) as Record<string, string>;
  const sizeKey = Object.keys(options).find((k) => /^size$/i.test(k));
  const colorKey = Object.keys(options).find((k) => /^colou?r$/i.test(k));

  return {
    id: row.id,
    productId: row.product_id ?? '',
    variantId: row.variant_id ?? undefined,
    name: row.name,
    sku: row.sku,
    price: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    currency,
    quantity: row.quantity,
    variantLabel: row.variant_label ?? undefined,
    options,
    size: sizeKey ? options[sizeKey] : undefined,
    color: colorKey ? { name: options[colorKey], hex: '#000000' } : undefined,
    imageUrl: row.image_url ?? '',
  };
}

function mapOrder(row: any): Order {
  const currency = String(row.currency).toLowerCase() as CurrencyCode;

  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    deliveryType: fromDbDelivery(row.delivery_type) as Order['deliveryType'],
    items: (row.order_items ?? []).map((i: any) => mapOrderItem(i, currency)),
    currency,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax_amount ?? 0),
    shippingCost: Number(row.shipping_cost ?? 0),
    discount: Number(row.discount_amount ?? 0),
    total: Number(row.total),
    status: row.status,
    paymentStatus: row.payment_status,
    shippingAddress: row.ship_street
      ? {
          fullName: row.ship_full_name ?? row.customer_name,
          phone: row.ship_phone ?? row.customer_phone,
          street: row.ship_street,
          city: row.ship_city ?? '',
          state: row.ship_state ?? '',
          zipCode: row.ship_postal_code ?? '',
          country: row.ship_country ?? 'Nigeria',
          isDefault: false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    paymentMethod: row.payment_method ?? undefined,
    paymentIntentId: row.payment_intent_id ?? undefined,
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

/**
 * Create an order through the atomic create_order() RPC.
 *
 * The database validates stock, reads prices itself (never trusting the client),
 * refuses expired perishables, applies discounts, decrements stock, writes the
 * inventory ledger and clears the cart — all in one transaction.
 */
export async function createOrder(orderData: CreateOrderData): Promise<{
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const items = orderData.items
      .filter((i) => i.variantId)
      .map((i) => ({ variant_id: i.variantId, quantity: i.quantity }));

    if (items.length !== orderData.items.length) {
      return { error: 'Every cart item must reference a product variant' };
    }

    const { data, error } = await supabase().rpc('create_order', {
      p_items: items,
      p_delivery_type: toDbDelivery(orderData.deliveryType),
      p_customer_name: orderData.customerName,
      p_customer_email: orderData.customerEmail,
      p_customer_phone: orderData.customerPhone,
      p_currency: orderData.currency.toUpperCase(),
      p_shipping_address: orderData.shippingAddress
        ? {
            full_name: orderData.customerName,
            phone: orderData.customerPhone,
            street: orderData.shippingAddress.street,
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postal_code: orderData.shippingAddress.zipCode,
            country: orderData.shippingAddress.country,
          }
        : null,
      p_discount_code: orderData.discountCode ?? null,
      p_shipping_cost: orderData.shippingCost,
      p_tax_amount: orderData.tax,
      p_tax_rate: null,
      p_customer_notes: null,
      p_idempotency_key:
        orderData.idempotencyKey ??
        (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    });

    if (error) return { error: error.message };

    const row = Array.isArray(data) ? data[0] : data;
    return { orderId: row?.id, orderNumber: row?.order_number };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { error: error.message || 'Failed to create order' };
  }
}

export async function getOrderById(orderId: string): Promise<{
  order?: Order;
  error?: string;
}> {
  const { data, error } = await supabase()
    .from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Order not found' };
  return { order: mapOrder(data) };
}

/** RLS already limits this to the caller's own orders (admins see all). */
export async function getUserOrders(userId: string): Promise<{
  orders?: Order[];
  error?: string;
}> {
  const { data, error } = await supabase()
    .from('orders').select(ORDER_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { orders: (data ?? []).map(mapOrder) };
}

/** Admin-only under RLS. The status-history trigger records the transition. */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<{ success?: boolean; error?: string }> {
  const patch: Record<string, any> = { status };
  if (status === 'shipped') patch.shipped_at = new Date().toISOString();
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();

  const { error } = await supabase().from('orders').update(patch).eq('id', orderId);
  return error ? { error: error.message } : { success: true };
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: Order['paymentStatus']
): Promise<{ success?: boolean; error?: string }> {
  const patch: Record<string, any> = { payment_status: paymentStatus };
  if (paymentStatus === 'paid') patch.paid_at = new Date().toISOString();

  const { error } = await supabase().from('orders').update(patch).eq('id', orderId);
  return error ? { error: error.message } : { success: true };
}

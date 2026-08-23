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

export function mapOrder(row: any): Order {
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
    channel: row.channel ?? 'web',
    placedBy: row.placed_by ?? undefined,
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

// ------------------------------------------------------ orders raised by staff

export interface ManualOrderLine {
  /** A catalogue variant, or null for a one-off with its own description. */
  variantId?: string | null;
  name?: string;
  sku?: string;
  quantity: number;
  /** Overrides the catalogue price when set; required for a one-off. */
  unitPrice?: number | null;
}

export interface ManualOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** Link to an existing account when the customer has one. */
  userId?: string | null;
  channel: 'whatsapp' | 'in_store' | 'phone';
  deliveryType: 'delivery' | 'inStore';
  shippingAddress?: {
    street: string; city: string; state: string; zipCode: string; country: string;
  } | null;
  lines: ManualOrderLine[];
  shippingCost?: number;
  discount?: number;
  tax?: number;
  notes?: string;
  idempotencyKey?: string;
}

/**
 * Raise an order for someone who is not on the site.
 *
 * Most of this shop's selling happens on WhatsApp, and none of it existed in the
 * database — so the invoice went out as a photograph of something typed by hand,
 * stock described only website sales, and the payments screen reported a
 * minority of the business as if it were all of it.
 *
 * Deliberately an order rather than a document generator: the invoice, the
 * packing slip, the status ladder, the payment guard and the audit history then
 * all work on it unchanged, and there is one numbering scheme rather than two.
 */
export async function createManualOrder(input: ManualOrderInput): Promise<{
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  const { data, error } = await supabase().rpc('create_manual_order', {
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone.trim(),
    p_lines: input.lines.map((line) => ({
      variant_id: line.variantId ?? null,
      name: line.name ?? null,
      sku: line.sku ?? null,
      quantity: line.quantity,
      unit_price: line.unitPrice ?? null,
    })),
    p_customer_email: input.customerEmail?.trim() || null,
    p_user: input.userId ?? null,
    p_channel: input.channel,
    p_delivery_type: toDbDelivery(input.deliveryType),
    p_shipping_address:
      input.deliveryType === 'delivery' && input.shippingAddress
        ? {
            full_name: input.customerName.trim(),
            phone: input.customerPhone.trim(),
            street: input.shippingAddress.street,
            city: input.shippingAddress.city,
            state: input.shippingAddress.state,
            postal_code: input.shippingAddress.zipCode,
            country: input.shippingAddress.country,
          }
        : null,
    p_currency: 'NGN',
    p_shipping_cost: input.shippingCost ?? 0,
    p_discount: input.discount ?? 0,
    p_tax_amount: input.tax ?? 0,
    p_notes: input.notes?.trim() || null,
    p_idempotency_key:
      input.idempotencyKey ??
      (globalThis.crypto?.randomUUID?.() ?? `manual-${Date.now()}-${Math.random()}`),
  });

  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  return { orderId: row?.id, orderNumber: row?.order_number };
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

/**
 * Move an order, optionally recording why.
 *
 * An RPC rather than an UPDATE from here, for two reasons. The audit trigger on
 * `orders.status` inserts into `order_status_history`, which `authenticated`
 * could not write — so **every status change an admin attempted failed** with
 * "permission denied for table order_status_history" and the order stayed put.
 * And the timestamps were stamped client-side, which had no branch for
 * `picked_up_at` at all, so an in-store collection recorded no collection time.
 *
 * Both now live in `set_order_status()`. See migration 20260824000021.
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  note?: string
): Promise<{ success?: boolean; error?: string }> {
  const { error } = await supabase().rpc('set_order_status', {
    p_order: orderId,
    p_status: status,
    p_note: note?.trim() ? note.trim() : null,
  });
  return error ? { error: error.message } : { success: true };
}

/**
 * Record a payment change.
 *
 * `reason` is required by the database when undoing a settled payment, and the
 * call is refused outright once the order has shipped — see migration
 * 20260824000023. Both are deliberate: this is the one action on the admin that
 * moves stock, and it used to be a dropdown.
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: Order['paymentStatus'],
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  const { error } = await supabase().rpc('set_order_payment', {
    p_order: orderId,
    p_status: paymentStatus,
    p_reason: reason?.trim() ? reason.trim() : null,
  });
  return error ? { error: error.message } : { success: true };
}

// ------------------------------------------------------------------- history

export interface OrderHistoryEntry {
  id: string;
  /** 'status' for a fulfilment move, 'payment' for a money one. */
  kind: 'status' | 'payment';
  fromStatus?: string;
  toStatus: string;
  note?: string;
  at: string;
  /** Null for anything the shop's own automation did. */
  actorName?: string;
  actorEmail?: string;
}

/**
 * Every recorded move on an order, with who made it.
 *
 * Fulfilment and payment are two tables and one story, so `order_history()`
 * returns both under a `kind` and in one chronological order. Returning them
 * separately would leave the screen interleaving timestamps by hand.
 *
 * `changed_by` has been written since the first migration and nothing ever
 * showed it, because resolving a name meant a query against `profiles` per row.
 */
export async function getOrderHistory(orderId: string): Promise<{
  history: OrderHistoryEntry[];
  error?: string;
}> {
  const { data, error } = await supabase().rpc('order_history', { p_order: orderId });
  if (error) return { history: [], error: error.message };

  return {
    history: (data ?? []).map((row: any) => ({
      id: row.id,
      kind: row.kind,
      fromStatus: row.from_status ?? undefined,
      toStatus: row.to_status,
      note: row.note ?? undefined,
      at: row.created_at,
      actorName: row.actor_name ?? undefined,
      actorEmail: row.actor_email ?? undefined,
    })),
  };
}

// --------------------------------------------------------------- staff notes

export interface OrderNote {
  id: string;
  body: string;
  at: string;
  authorName?: string;
}

/** Admin-only: `order_notes` has a single `is_admin()` policy. */
export async function getOrderNotes(orderId: string): Promise<{
  notes: OrderNote[];
  error?: string;
}> {
  const { data, error } = await supabase()
    .from('order_notes')
    .select('id, body, created_at, profiles:author_id ( display_name, email )')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) return { notes: [], error: error.message };

  return {
    notes: (data ?? []).map((row: any) => ({
      id: row.id,
      body: row.body,
      at: row.created_at,
      authorName: row.profiles?.display_name ?? row.profiles?.email ?? undefined,
    })),
  };
}

export async function addOrderNote(orderId: string, body: string): Promise<{
  note?: OrderNote;
  error?: string;
}> {
  const { data: session } = await supabase().auth.getUser();

  const { data, error } = await supabase()
    .from('order_notes')
    .insert({ order_id: orderId, body: body.trim(), author_id: session.user?.id ?? null })
    .select('id, body, created_at, profiles:author_id ( display_name, email )')
    .single();

  if (error) return { error: error.message };

  return {
    note: {
      id: data.id,
      body: data.body,
      at: data.created_at,
      authorName: (data as any).profiles?.display_name ?? (data as any).profiles?.email ?? undefined,
    },
  };
}

export async function deleteOrderNote(noteId: string): Promise<{ error?: string }> {
  const { error } = await supabase().from('order_notes').delete().eq('id', noteId);
  return error ? { error: error.message } : {};
}

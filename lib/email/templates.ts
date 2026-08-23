import type { SupabaseClient } from '@supabase/supabase-js';
import { BANK_DETAILS, COMPANY, DELIVERY_LEAD_TIME, SUPPORT_WHATSAPP } from '@/constants';

/**
 * What each email is, and where its content comes from.
 *
 * One registry rather than a function per template. Adding an email should be a
 * template file and an entry here — the worker, the renderer, the preview and
 * the admin listing all read from this, so nothing else has to learn about it.
 *
 * `category` is what decides whether an unsubscribe footer appears. It is not a
 * cosmetic choice: transactional mail carries no unsubscribe because there is
 * nothing to unsubscribe from, and marketing that omits one is both a compliance
 * problem and the fastest route into a spam folder.
 */
export type EmailCategory = 'transactional' | 'courtesy' | 'marketing' | 'staff';

export interface RenderContext {
  db: SupabaseClient;
  row: {
    id: string;
    template: string;
    to_email: string;
    to_name: string | null;
    subject_type: string | null;
    subject_id: string | null;
    payload: Record<string, any>;
  };
}

export interface EmailDefinition {
  category: EmailCategory;
  /** The line beside the subject in an inbox list. */
  eyebrow: string;
  subject: (data: any) => string;
  preheader: (data: any) => string;
  /** Everything the template needs. Fetched fresh at send time. */
  build: (context: RenderContext) => Promise<Record<string, any> | null>;
  /**
   * The plain-text alternative, from the same data.
   *
   * A generated one — tags stripped from the HTML — reads like debris, and
   * sending no text part at all is a spam signal on its own. Written from the
   * data instead, so the two cannot drift.
   */
  text: (data: any) => string;
}

// ─────────────────────────────────────────────────────────── shared helpers

const site = () =>
  (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const money = (amount: number | string | null | undefined) => {
  const value = Number(amount ?? 0);
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
};

const firstNameOf = (name?: string | null) =>
  (name ?? '').trim().split(/\s+/)[0] || 'there';

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

/** Order plus its lines, in the shape every order template expects. */
async function loadOrder(context: RenderContext) {
  const { data } = await context.db
    .from('orders')
    .select(`
      id, order_number, created_at, total, subtotal, shipping_cost, discount_amount,
      currency, status, payment_status, paid_at, delivery_type, channel,
      customer_name, customer_email, customer_phone, customer_notes,
      carrier, tracking_number,
      ship_full_name, ship_street, ship_city, ship_state, ship_postal_code, ship_country,
      order_items ( id, name, sku, variant_label, quantity, unit_price, line_total )
    `)
    .eq('id', context.row.subject_id)
    .maybeSingle();

  if (!data) return null;

  const items = (data.order_items ?? []).map((item: any) => ({
    name: item.name,
    variantLabel: item.variant_label ?? undefined,
    quantity: item.quantity,
    lineTotal: money(item.line_total),
  }));
  const units = (data.order_items ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.quantity), 0
  );

  const addressLines = [
    data.ship_full_name,
    data.ship_street,
    [data.ship_city, data.ship_state].filter(Boolean).join(', '),
    [data.ship_country, data.ship_postal_code].filter(Boolean).join(' '),
  ].filter(Boolean);

  return {
    ...data,
    firstName: firstNameOf(data.customer_name),
    orderNumber: data.order_number,
    orderUrl: `${site()}/dashboard/orders`,
    invoiceUrl: `${site()}/dashboard/orders/${data.id}/invoice`,
    adminUrl: `${site()}/admin/orders/${data.id}`,
    items,
    lineCount: plural(items.length, 'line'),
    unitCount: plural(units, 'item'),
    total: money(data.total),
    shipping: Number(data.shipping_cost) > 0 ? money(data.shipping_cost) : null,
    discount: Number(data.discount_amount) > 0 ? money(data.discount_amount) : null,
    isCollection: data.delivery_type === 'in_store',
    carrier: data.carrier ?? null,
    trackingNumber: data.tracking_number ?? null,
    address: addressLines.length > 1 ? addressLines.join('<br />') : null,
    addressText: addressLines.join('\n'),
    paidOn: data.paid_at
      ? new Date(data.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })
      : 'today',
    leadTime: DELIVERY_LEAD_TIME,
    bank: {
      name: BANK_DETAILS.bankName,
      accountName: BANK_DETAILS.accountName,
      accountNumber: BANK_DETAILS.accountNumber,
      swift: BANK_DETAILS.swift || null,
    },
  };
}

async function loadRequest(context: RenderContext) {
  const { data } = await context.db
    .from('product_requests')
    .select('id, item, details, quantity, budget, status, quoted_amount, staff_note, reference_url, user_id')
    .eq('id', context.row.subject_id)
    .maybeSingle();

  if (!data) return null;

  const { data: profile } = await context.db
    .from('profiles').select('display_name').eq('id', data.user_id).maybeSingle();

  return {
    ...data,
    firstName: firstNameOf(profile?.display_name ?? context.row.to_name),
    customerName: profile?.display_name ?? 'A customer',
    quantityLabel: data.quantity > 1 ? `${data.quantity} of them` : null,
    budget: data.budget != null ? money(data.budget) : null,
    quotedAmount: data.quoted_amount != null ? money(data.quoted_amount) : null,
    staffNote: data.staff_note ?? null,
    referenceUrl: data.reference_url ?? null,
    requestsUrl: `${site()}/dashboard/requests`,
    adminUrl: `${site()}/admin/requests`,
  };
}

// ─────────────────────────────────────────────────────────── the registry

export const EMAILS: Record<string, EmailDefinition> = {

  // ── the money ──────────────────────────────────────────────────────────
  order_received: {
    category: 'transactional',
    eyebrow: 'Order received',
    subject: (d) => `${d.orderNumber} — your order, and how to pay`,
    preheader: (d) => `Transfer ${d.total}, quoting ${d.orderNumber} as the reference.`,
    build: loadOrder,
    text: (d) => `Thank you, ${d.firstName}.

Order ${d.orderNumber} is with us — ${d.lineCount}, ${d.unitCount}, ${d.total}.
Nothing is being packed yet; it moves as soon as your transfer reaches us.

${d.items.map((i: any) => `  ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity}  ${i.lineTotal}`).join('\n')}
  Total  ${d.total}

SETTLE IT BY TRANSFER
We do not take card payment.

  Bank            ${d.bank.name}
  Account name    ${d.bank.accountName}
  Account number  ${d.bank.accountNumber}
  Reference       ${d.orderNumber}
  Amount          ${d.total}

Quote the reference, or we cannot match your payment to this order.

Your invoice: ${d.invoiceUrl}

${COMPANY.legalName}, ${COMPANY.address}`,
  },

  payment_reminder: {
    category: 'transactional',
    eyebrow: 'Still awaiting payment',
    subject: (d) =>
      d.isSecond ? `Still holding ${d.orderNumber}` : `A reminder about ${d.orderNumber}`,
    preheader: (d) => `${d.total} outstanding. Reference ${d.orderNumber}.`,
    build: async (context) => {
      const order = await loadOrder(context);
      if (!order) return null;
      // Chasing an order that has since been paid or cancelled would be worse
      // than not chasing at all. The trigger cancels these rows, but a race is
      // cheap to rule out here too.
      if (order.payment_status !== 'pending') return null;
      if (['cancelled', 'refunded'].includes(order.status)) return null;
      return { ...order, isSecond: context.row.payload?.attempt === 2 };
    },
    text: (d) => `${d.isSecond ? `We have kept ${d.orderNumber} aside for you, but we have not seen a transfer yet.` : `We have not seen your transfer for ${d.orderNumber} yet.`}

  Bank            ${d.bank.name}
  Account name    ${d.bank.accountName}
  Account number  ${d.bank.accountNumber}
  Reference       ${d.orderNumber}
  Amount          ${d.total}

Your invoice: ${d.invoiceUrl}

If you have changed your mind that is completely fine — just tell us.`,
  },

  payment_received: {
    category: 'transactional',
    eyebrow: 'Payment received',
    subject: (d) => `We have your payment for ${d.orderNumber}`,
    preheader: (d) => `${d.total} received. We are packing it now.`,
    build: loadOrder,
    text: (d) => `Your payment reached us.

${d.total} received against ${d.orderNumber}, ${d.paidOn}. Thank you.

${d.isCollection ? 'We are packing it now and will message you when it is ready to collect.' : `We are packing it for the next consignment. Delivery runs ${d.leadTime} once it leaves us.`}

Follow your order: ${d.orderUrl}`,
  },

  refund_issued: {
    category: 'transactional',
    eyebrow: 'Refund issued',
    subject: (d) => `Your refund for ${d.orderNumber}`,
    preheader: (d) => `${d.total} sent back to the account it came from.`,
    build: loadOrder,
    text: (d) => `Your refund is on its way.

${d.total} for ${d.orderNumber} has been sent back to the account it came from.
Bank transfers usually land within a few working days.

${d.orderUrl}`,
  },

  // ── fulfilment ─────────────────────────────────────────────────────────
  order_packed: {
    category: 'courtesy',
    eyebrow: 'Being packed',
    subject: (d) => `${d.orderNumber} is being packed`,
    preheader: () => 'On the bench and going onto the next consignment.',
    build: loadOrder,
    text: (d) => `It is being packed.

${d.orderNumber} is on the bench and going onto the next consignment.
${d.isCollection ? 'We will tell you the moment it is ready to collect.' : 'You will get a tracking number the day it ships.'}

${d.orderUrl}`,
  },

  order_shipped: {
    category: 'transactional',
    eyebrow: 'On its way',
    subject: (d) => `${d.orderNumber} is on its way`,
    preheader: (d) =>
      d.trackingNumber ? `Tracking ${d.trackingNumber}` : `Delivery runs ${d.leadTime}.`,
    build: loadOrder,
    text: (d) => `On its way.

${d.orderNumber} left us${d.carrier ? ` with ${d.carrier}` : ''}. Standard delivery runs ${d.leadTime} from here.
${d.trackingNumber ? `\nTracking: ${d.trackingNumber}\n` : ''}
${d.addressText ? `Going to:\n${d.addressText}\n` : ''}
Follow your order: ${d.orderUrl}`,
  },

  order_delivered: {
    category: 'courtesy',
    eyebrow: 'Delivered',
    subject: (d) => `${d.orderNumber} has been delivered`,
    preheader: () => 'We hope it is what you wanted.',
    build: loadOrder,
    text: (d) => `Delivered.

${d.orderNumber} was handed over. We hope it is what you wanted — if anything is
wrong, reply to this email and we will sort it.

${d.orderUrl}`,
  },

  order_collected: {
    category: 'courtesy',
    eyebrow: 'Collected',
    subject: (d) => `Thank you for collecting ${d.orderNumber}`,
    preheader: () => 'Picked up from the shop.',
    build: loadOrder,
    text: (d) => `Collected. Thank you.

${d.orderNumber} was picked up from the shop. If anything is wrong, reply to this
email and we will sort it.

${d.orderUrl}`,
  },

  order_cancelled: {
    category: 'transactional',
    eyebrow: 'Cancelled',
    subject: (d) => `${d.orderNumber} has been cancelled`,
    preheader: () => 'Nothing further will be charged or sent.',
    build: async (context) => {
      const order = await loadOrder(context);
      if (!order) return null;
      // The note the admin left on the transition, which is the only account of
      // why this happened.
      const { data } = await context.db
        .from('order_status_history')
        .select('note').eq('order_id', order.id).eq('to_status', 'cancelled')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      return { ...order, reason: data?.note ?? null };
    },
    text: (d) => `${d.orderNumber} has been cancelled.

Nothing further will be charged or sent.${d.reason ? `\n\n${d.reason}` : ''}

${site()}`,
  },

  // ── sourcing ───────────────────────────────────────────────────────────
  request_received: {
    category: 'transactional',
    eyebrow: 'Request received',
    subject: (d) => `We are looking for ${d.item}`,
    preheader: () => 'We will come back with a price before buying anything.',
    build: loadRequest,
    text: (d) => `We are looking for it.

You asked us to find ${d.item}${d.quantityLabel ? `, ${d.quantityLabel}` : ''}.
Somebody will look on the next trip and come back with a price before we buy anything.

That usually takes a few days rather than a few minutes.

${d.requestsUrl}`,
  },

  quote_ready: {
    category: 'transactional',
    eyebrow: 'Your quote',
    subject: (d) => `We found ${d.item} — ${d.quotedAmount}`,
    preheader: (d) => `${d.quotedAmount}. Accept and it goes on the next run.`,
    build: loadRequest,
    text: (d) => `We found it.

${d.item}${d.quantityLabel ? `, ${d.quantityLabel}` : ''}

Our price: ${d.quotedAmount}${d.budget ? `\nYou said around ${d.budget}` : ''}
${d.staffNote ? `\n${d.staffNote}\n` : ''}
Say yes and it goes on the next buying run. Say no and that is the end of it —
no cost either way, and we have not bought anything yet.

Accept or decline: ${d.requestsUrl}`,
  },

  quote_reminder: {
    category: 'transactional',
    eyebrow: 'Your quote',
    subject: (d) => `Still want ${d.item}?`,
    preheader: (d) => `${d.quotedAmount}, still open.`,
    build: async (context) => {
      const request = await loadRequest(context);
      if (!request) return null;
      if (request.status !== 'quoted') return null;   // already answered
      return request;
    },
    text: (d) => `Still want it?

We quoted ${d.quotedAmount} for ${d.item} and have not heard back. No rush, and no
obligation — but the next buying run is the cheapest time to add it.

${d.requestsUrl}`,
  },

  request_declined: {
    category: 'transactional',
    eyebrow: 'Not this time',
    subject: (d) => `We could not find ${d.item}`,
    preheader: () => 'Sorry — we would rather tell you than leave you waiting.',
    build: loadRequest,
    text: (d) => `We could not find this one.

We looked for ${d.item} and came back empty. Sorry.
${d.staffNote ? `\n${d.staffNote}\n` : ''}
If you can tell us more — a brand, a photograph, where you saw it — we will try
again on the next trip.

${d.requestsUrl}`,
  },

  request_buying: {
    category: 'courtesy',
    eyebrow: 'Buying it',
    subject: (d) => `We are buying ${d.item}`,
    preheader: () => 'On the list for this run.',
    build: loadRequest,
    text: (d) => `We are buying it.

${d.item} is on the list for this run. Once it is in our hands we will raise it as
an order and send you the invoice.

${d.requestsUrl}`,
  },

  // ── account ────────────────────────────────────────────────────────────
  welcome: {
    category: 'transactional',
    eyebrow: 'Welcome',
    subject: () => 'Welcome to Ramazah Store',
    preheader: () => 'Chosen in the souk rather than from a catalogue.',
    build: async (context) => ({
      firstName: firstNameOf(context.row.to_name),
      leadTime: DELIVERY_LEAD_TIME,
      websiteUrl: site(),
    }),
    text: (d) => `Welcome, ${d.firstName}.

Ramazah Store brings things back from Egypt — veils, coffee, spices, brassware, whatever
the run turns up. Everything on the site was chosen in the souk rather than from a
catalogue.

CANNOT FIND IT? ASK US.
The part most people miss: tell us what you are after and we will look for it on
the next trip, then come back with a price before buying anything.

Two things worth knowing: we take payment by bank transfer against an invoice,
not by card, and delivery runs ${d.leadTime}.

${d.websiteUrl}`,
  },

  account_suspended: {
    category: 'transactional',
    eyebrow: 'Your account',
    subject: () => 'Your Ramazah Store account is on hold',
    preheader: () => 'You can still see your orders.',
    build: async () => ({}),
    text: () => `Your account is on hold.

You can still sign in and see everything you have ordered, but you cannot place a
new order until we lift it. Nothing you have already paid for is affected.

If this looks like a mistake, reply to this email and we will look at it.`,
  },

  account_reinstated: {
    category: 'transactional',
    eyebrow: 'Your account',
    subject: () => 'Your Ramazah Store account is active again',
    preheader: () => 'You can order again straight away.',
    build: async () => ({ websiteUrl: site() }),
    text: (d) => `You are back.

The hold on your account has been lifted. You can order again straight away.

${d.websiteUrl}`,
  },

  credentials_changed: {
    category: 'transactional',
    eyebrow: 'Security',
    subject: (d) => `Your ${d.whatChanged} was changed`,
    preheader: () => 'If this was not you, act now.',
    build: async (context) => ({
      whatChanged: context.row.payload?.whatChanged ?? 'password',
      changedOn: new Date().toLocaleString('en-NG', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      }),
      settingsUrl: `${site()}/dashboard/settings`,
    }),
    text: (d) => `Your ${d.whatChanged} was changed.

This happened on ${d.changedOn}. If it was you, there is nothing to do.

If it was not you, change your password now and reply to this email.

${d.settingsUrl}`,
  },

  // ── reviews ────────────────────────────────────────────────────────────
  review_invite: {
    category: 'courtesy',
    eyebrow: 'A favour',
    subject: (d) => `How was ${d.orderNumber}?`,
    preheader: () => 'A line or two helps the next person decide.',
    build: async (context) => {
      const order = await loadOrder(context);
      if (!order) return null;
      // Asking somebody to review an order that was cancelled after delivery
      // would be worse than silence.
      if (order.status !== 'delivered') return null;
      return { ...order, reviewUrl: `${site()}/dashboard/reviews` };
    },
    text: (d) => `How was it?

You have had ${d.orderNumber} for about a week now. If you have a minute, a line or
two helps the next person decide.

${d.items.map((i: any) => `  ${i.name} x${i.quantity}`).join('\n')}

Write a review: ${d.reviewUrl}

If something was wrong with it, reply to this instead — we would rather fix it
than read about it.`,
  },

  review_published: {
    category: 'courtesy',
    eyebrow: 'Your review',
    subject: () => 'Your review is live',
    preheader: () => 'Thank you — it genuinely helps.',
    build: async (context) => {
      const { data } = await context.db
        .from('reviews')
        .select('id, products ( name, slug )')
        .eq('id', context.row.subject_id).maybeSingle();
      if (!data) return null;
      const product: any = data.products;
      return {
        productName: product?.name ?? 'the product',
        productUrl: product?.slug ? `${site()}/product/${product.slug}` : site(),
      };
    },
    text: (d) => `Your review is up.

What you wrote about ${d.productName} is now on its page. Thank you — it genuinely
helps.

${d.productUrl}`,
  },

  // ── marketing ──────────────────────────────────────────────────────────
  newsletter: {
    category: 'marketing',
    eyebrow: 'From Ramazah Store',
    subject: (d) => d.subjectLine || 'From Ramazah Store',
    preheader: (d) => d.preheader || '',
    build: async (context) => ({ ...context.row.payload, websiteUrl: site() }),
    text: (d) => `${d.headline}\n\n${(d.bodyText ?? '').trim()}\n\n${d.ctaUrl ?? d.websiteUrl}`,
  },

  new_arrivals: {
    category: 'marketing',
    eyebrow: 'Just in',
    subject: (d) => d.subjectLine || 'Just back from the run',
    preheader: (d) => d.intro || 'A few things came back with us.',
    build: async (context) => ({ ...context.row.payload, websiteUrl: site() }),
    text: (d) => `${d.headline ?? 'Just back from the run.'}

${d.intro ?? 'A few things came back with us this time. They are on the site now.'}

${(d.products ?? []).map((p: any) => `  ${p.name}  ${p.price}\n  ${p.url}`).join('\n\n')}

${d.websiteUrl}`,
  },

  promotion: {
    category: 'marketing',
    eyebrow: 'An offer',
    subject: (d) => d.subjectLine || d.headline || 'An offer from Ramazah Store',
    preheader: (d) => d.preheader || '',
    build: async (context) => ({ ...context.row.payload, websiteUrl: site() }),
    text: (d) => `${d.headline}

${(d.bodyText ?? '').trim()}
${d.discountCode ? `\nUse the code: ${d.discountCode}${d.expiryDate ? ` (until ${d.expiryDate})` : ''}\n` : ''}
${d.ctaUrl ?? d.websiteUrl}`,
  },

  back_in_stock: {
    category: 'marketing',
    eyebrow: 'Back in stock',
    subject: (d) => `${d.productName} is back`,
    preheader: () => 'It came back on the last run.',
    build: async (context) => ({ ...context.row.payload, websiteUrl: site() }),
    text: (d) => `${d.productName} is back.

You put this on your wishlist and it went out of stock. It came back on the last run.

  ${d.productName}  ${d.price}${d.stockCount ? `\n  ${d.stockCount} left` : ''}

${d.productUrl}`,
  },

  collection_launch: {
    category: 'marketing',
    eyebrow: 'A new edit',
    subject: (d) => `${d.collectionName} is up`,
    preheader: (d) => d.description || 'Chosen together.',
    build: async (context) => ({ ...context.row.payload, websiteUrl: site() }),
    text: (d) => `${d.collectionName}

${d.description ?? ''}

${d.productCount} in it, chosen together.

${d.collectionUrl}`,
  },

  abandoned_cart: {
    category: 'marketing',
    eyebrow: 'Your basket',
    subject: () => 'You left something in your basket',
    preheader: () => 'Still here, but we have not held the stock.',
    build: async (context) => {
      const { data } = await context.db
        .from('cart_items')
        .select('quantity, product_variants ( sku, products ( name, slug ) )')
        .eq('user_id', context.row.subject_id);
      if (!data?.length) return null;      // they finished, or emptied it
      return {
        items: data.map((row: any) => ({
          name: row.product_variants?.products?.name ?? 'An item',
          quantity: row.quantity,
          variantLabel: null,
          price: '',
        })),
        cartUrl: `${site()}/cart`,
        websiteUrl: site(),
      };
    },
    text: (d) => `You left something.

Your basket is still here. We have not held the stock — things go when they go —
but nothing has been lost either.

${d.items.map((i: any) => `  ${i.name} x${i.quantity}`).join('\n')}

${d.cartUrl}`,
  },

  // ── to the shop ────────────────────────────────────────────────────────
  admin_new_order: {
    category: 'staff',
    eyebrow: 'New order',
    subject: (d) => `${d.orderNumber} — ${d.total} — ${d.customer_name}`,
    preheader: (d) => `${d.channelLabel}, ${d.deliveryLabel}.`,
    build: async (context) => {
      const order = await loadOrder(context);
      if (!order) return null;
      const CHANNEL: Record<string, string> = {
        web: 'From the website', whatsapp: 'Raised from WhatsApp',
        phone: 'Taken by phone', in_store: 'Taken in the shop',
      };
      return {
        ...order,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        channelLabel: CHANNEL[order.channel] ?? order.channel,
        deliveryLabel: order.isCollection ? 'collection' : 'delivery',
      };
    },
    text: (d) => `${d.orderNumber} — ${d.total}

${d.customerName}${d.customerPhone ? ` · ${d.customerPhone}` : ''}
${d.channelLabel} · ${d.deliveryLabel}

${d.items.map((i: any) => `  ${i.name} x${i.quantity}  ${i.lineTotal}`).join('\n')}
  Total  ${d.total}
${d.addressText ? `\nDeliver to:\n${d.addressText}\n` : ''}
${d.adminUrl}`,
  },

  admin_new_request: {
    category: 'staff',
    eyebrow: 'New request',
    subject: (d) => `Sourcing request: ${d.item}`,
    preheader: (d) => `${d.customerName}${d.budget ? `, budget ${d.budget}` : ''}`,
    build: loadRequest,
    text: (d) => `${d.item}

${d.customerName}${d.quantityLabel ? ` · ${d.quantityLabel}` : ''}${d.budget ? ` · budget ${d.budget}` : ''}
${d.details ? `\n${d.details}\n` : ''}${d.referenceUrl ? `\nTheir reference: ${d.referenceUrl}\n` : ''}
Quote it: ${d.adminUrl}`,
  },

  admin_digest: {
    category: 'staff',
    eyebrow: 'Morning digest',
    subject: (d) => `Ramazah Store — ${d.headlineSummary}`,
    preheader: (d) => d.headlineSummary,
    build: async (context) => {
      const db = context.db;
      const [orders, requests, stock] = await Promise.all([
        db.from('orders').select('id, created_at, total, status, payment_status'),
        db.from('product_requests').select('id, status, created_at'),
        db.from('product_listing').select('id, total_stock, low_stock_alert'),
      ]);

      const all = orders.data ?? [];
      const unpaid = all.filter((o: any) => o.payment_status === 'pending'
        && !['cancelled', 'refunded'].includes(o.status));
      const oldestWait = unpaid.length
        ? Math.max(...unpaid.map((o: any) =>
            Math.floor((Date.now() - new Date(o.created_at).getTime()) / 86_400_000)))
        : 0;
      const toPack = all.filter((o: any) =>
        o.payment_status === 'paid' && ['pending', 'processing'].includes(o.status));
      const reqs = requests.data ?? [];
      const unquoted = reqs.filter((r: any) => r.status === 'asked').length;
      const unanswered = reqs.filter((r: any) => r.status === 'quoted').length;
      const accepted = reqs.filter((r: any) => r.status === 'accepted').length;
      const low = (stock.data ?? []).filter((p: any) =>
        Number(p.total_stock ?? 0) <= Number(p.low_stock_alert ?? 0)).length;

      const rows = [
        { label: 'Orders waiting on payment', value: unpaid.length, urgent: oldestWait >= 7,
          note: unpaid.length ? `oldest ${oldestWait} ${oldestWait === 1 ? 'day' : 'days'}` : null },
        { label: 'Paid and waiting to be packed', value: toPack.length, urgent: toPack.length > 0, note: null },
        { label: 'Requests to quote', value: unquoted, urgent: unquoted > 0, note: null },
        { label: 'Quotes awaiting an answer', value: unanswered, urgent: false, note: null },
        { label: 'Accepted, ready to buy', value: accepted, urgent: accepted > 0, note: null },
        { label: 'Products low on stock', value: low, urgent: low > 0, note: null },
      ];

      // Nothing to say is worth saying by not sending.
      if (rows.every((r) => r.value === 0)) return null;

      return {
        rows,
        headlineSummary: `${unpaid.length} unpaid · ${toPack.length} to pack · ${unquoted} to quote`,
        today: new Date().toLocaleDateString('en-NG', {
          weekday: 'long', day: 'numeric', month: 'long',
        }),
        adminUrl: `${site()}/admin`,
      };
    },
    text: (d) => `This morning — ${d.today}

${d.rows.map((r: any) => `  ${String(r.value).padStart(3)}  ${r.label}${r.note ? ` (${r.note})` : ''}`).join('\n')}

${d.adminUrl}`,
  },
};

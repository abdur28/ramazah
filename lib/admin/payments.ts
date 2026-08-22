import { createClient } from '@/lib/supabase/client';
import type { Transaction, TransactionStatus } from '@/types/admin';

/**
 * Payments, read from the orders they belong to.
 *
 * `/admin/transactions` and the Transactions tab of `/admin/analytics` were
 * both fed by `generateMockTransactions()` — a hundred rows of `Math.random()`
 * billed to John Doe and Jane Smith in USD and RUB through PayPal and Stripe.
 * Nothing on either screen came from the database. A shopkeeper reading "Total
 * Revenue $28,431" was reading a random number, and the figure moved every time
 * the page reloaded because the generator ran again on mount.
 *
 * `customer_phone` and the order's own status come along for the ride: an
 * unpaid order in a transfer shop is a phone call waiting to happen, and how
 * long it has been waiting is the only number on this screen anyone acts on.
 *
 * There is no separate payments table and there should not be one until a PSP
 * is wired up: an order *is* the payment record here. `orders` already carries
 * `payment_status`, `paid_at` and the amount, which is every column the screen
 * was inventing.
 *
 * Payment *method* is deliberately not read. Every order settles by bank
 * transfer against the invoice, so the field only ever held one value worth
 * having — and cash on delivery, the other thing it could say, is not something
 * this shop can reconcile from a screen. A column with one real value is a
 * column that makes every breakdown built on it a lie.
 */

/** The order's payment_status enum, in the vocabulary the payments screen uses. */
const STATUS_FROM_PAYMENT: Record<string, TransactionStatus> = {
  paid: 'success',
  pending: 'pending',
  failed: 'failed',
  refunded: 'refunded',
};

export async function getPayments(limit = 500): Promise<{
  payments: Transaction[];
  error: string | null;
}> {
  const { data, error } = await createClient()
    .from('orders')
    .select(
      'id, order_number, customer_name, customer_email, customer_phone, total, ' +
        'currency, payment_status, status, created_at, paid_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { payments: [], error: error.message };

  const payments: Transaction[] = (data ?? []).map((row: any) => {
    const status = STATUS_FROM_PAYMENT[row.payment_status] ?? 'pending';

    return {
      id: row.order_number,
      orderId: row.id,
      orderNumber: row.order_number,
      customer: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone ?? undefined,
      orderStatus: row.status,
      placedAt: new Date(row.created_at),
      amount: Number(row.total ?? 0),
      currency: String(row.currency ?? 'NGN').toLowerCase(),
      status,
      // A settled payment is dated by when it settled; an unsettled one by when
      // the order was raised, which is the date it has been waiting since.
      date: new Date(row.paid_at ?? row.created_at),
      description: describe(status),
    };
  });

  return { payments, error: null };
}

function describe(status: TransactionStatus): string {
  switch (status) {
    case 'success':
      return 'Settled by transfer against the invoice.';
    case 'pending':
      return 'Awaiting payment. The order will not ship until this clears.';
    case 'failed':
      return 'Payment did not go through.';
    case 'refunded':
      return 'Refunded to the customer.';
  }
}

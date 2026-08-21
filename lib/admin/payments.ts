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
 * There is no separate payments table and there should not be one until a PSP
 * is wired up: an order *is* the payment record here. `orders` already carries
 * `payment_status`, `payment_method`, `payment_intent_id`, `paid_at` and the
 * amount, which is every column the screen was inventing.
 */

/** The order's payment_status enum, in the vocabulary the payments screen uses. */
const STATUS_FROM_PAYMENT: Record<string, TransactionStatus> = {
  paid: 'success',
  pending: 'pending',
  failed: 'failed',
  refunded: 'refunded',
};

/**
 * Orders taken over WhatsApp and settled by transfer arrive with no
 * `payment_method` recorded. Saying so is better than guessing a card.
 */
export const UNRECORDED_METHOD = 'Not recorded';

export async function getPayments(limit = 500): Promise<{
  payments: Transaction[];
  error: string | null;
}> {
  const { data, error } = await createClient()
    .from('orders')
    .select(
      'id, order_number, customer_name, customer_email, total, currency, ' +
        'payment_status, payment_method, payment_intent_id, created_at, paid_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { payments: [], error: error.message };

  const payments: Transaction[] = (data ?? []).map((row: any) => {
    const status = STATUS_FROM_PAYMENT[row.payment_status] ?? 'pending';

    return {
      id: row.payment_intent_id || row.order_number,
      orderId: row.id,
      orderNumber: row.order_number,
      customer: row.customer_name,
      email: row.customer_email,
      amount: Number(row.total ?? 0),
      currency: String(row.currency ?? 'NGN').toLowerCase(),
      status,
      paymentMethod: row.payment_method || UNRECORDED_METHOD,
      // A settled payment is dated by when it settled; an unsettled one by when
      // the order was raised, which is the date it has been waiting since.
      date: new Date(row.paid_at ?? row.created_at),
      description: describe(status, row.payment_method),
    };
  });

  return { payments, error: null };
}

function describe(status: TransactionStatus, method: string | null): string {
  switch (status) {
    case 'success':
      return method ? `Settled by ${method.toLowerCase()}.` : 'Settled.';
    case 'pending':
      return 'Awaiting payment. The order will not ship until this clears.';
    case 'failed':
      return 'Payment did not go through.';
    case 'refunded':
      return 'Refunded to the customer.';
  }
}

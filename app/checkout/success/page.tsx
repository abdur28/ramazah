import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import OrderPlaced from "@/components/checkout/OrderPlaced";

/**
 * Where an order lands after it is placed.
 *
 * This route did not exist. `CheckoutPage` has always finished with
 * `router.push('/checkout/success?orderId=…')`, and `app/checkout/` held one
 * file — so a customer placed a real order (stock checked, cart cleared, ledger
 * written) and was shown a **404**. It reads as though the order failed, which
 * means they either walk away or order a second time.
 *
 * It is also the only place the shop can say how to pay. There is no card
 * checkout: the order raises an invoice and the customer transfers against it.
 * Until now nothing on the site told them that, or to which account.
 *
 * Read through the request's own session, so RLS hands back the order only to
 * the person who placed it — a guessed id shows somebody else nothing.
 */
export default async function CheckoutSuccessPage({ searchParams }: any) {
  await requireAuth('/dashboard/orders');

  const { orderId } = await searchParams;
  if (!orderId) redirect('/dashboard/orders');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, created_at, total, currency, delivery_type,
      customer_name, customer_email, payment_status,
      ship_city, ship_state, ship_country,
      order_items ( id, name, variant_label, quantity )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) notFound();

  return <OrderPlaced orderAsString={JSON.stringify(data)} />;
}

export const metadata = {
  title: "Order placed | Ramazah Store",
  description: "Your order is with us. Here is how to settle it.",
};

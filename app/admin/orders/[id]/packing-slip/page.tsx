import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import PackingSlip from "@/components/admin/order/PackingSlip";

/**
 * The packing slip for one order.
 *
 * Admin-only and deliberately so — unlike the invoice, which has a customer
 * route as well. A packing slip is a fulfilment document: it records what should
 * be in the box and who checked it, and there is nothing on it a customer needs
 * before the parcel arrives.
 *
 * The select is narrower than the invoice's `*`: no totals, no discount, no tax,
 * no payment columns. The page cannot print a price it never fetched.
 */
export default async function PackingSlipPage({ params }: any) {
  await requireAdmin('/admin/orders');

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, created_at, delivery_type, customer_name, customer_phone,
      customer_notes, carrier, tracking_number,
      ship_full_name, ship_phone, ship_street, ship_city, ship_state,
      ship_postal_code, ship_country,
      order_items ( id, name, sku, variant_label, quantity )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  return <PackingSlip orderAsString={JSON.stringify(data)} />;
}

export async function generateMetadata({ params }: any) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders').select('order_number').eq('id', id).maybeSingle();

  return { title: `Packing slip ${data?.order_number ?? id.slice(0, 8)} | Ramazah Store admin` };
}

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import InvoiceView from "@/components/dashboard/InvoiceView";

/**
 * The invoice for one order, from the shop's side.
 *
 * The same document the customer sees at `/dashboard/orders/[id]/invoice` —
 * deliberately the same component, because an invoice the shop prints and one
 * the customer prints must not differ. Ramazah takes no card payment, so this
 * *is* the payment instrument; two versions of it is two versions of what is
 * owed.
 *
 * What differs is who can reach it. The customer route is gated by RLS on their
 * own order; this one by `requireAdmin`, so staff can print an invoice for any
 * order without the customer having to fetch it themselves — which is how it
 * actually gets sent, over WhatsApp, today.
 *
 * The back link points at the order rather than the customer's order list, since
 * that is where whoever opened this came from.
 */
export default async function AdminInvoicePage({ params }: any) {
  await requireAdmin('/admin/orders');

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items ( id, name, sku, variant_label, quantity, unit_price, line_total )')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  return (
    <InvoiceView
      orderAsString={JSON.stringify(data)}
      backHref={`/admin/orders/${id}`}
      backLabel="Back to the order"
    />
  );
}

export async function generateMetadata({ params }: any) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders').select('order_number').eq('id', id).maybeSingle();

  return { title: `Invoice ${data?.order_number ?? id.slice(0, 8)} | Ramazah admin` };
}

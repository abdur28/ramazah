import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import InvoiceView from "@/components/dashboard/InvoiceView";

/**
 * The invoice for one order.
 *
 * Ramazah takes no card payment — the invoice *is* the payment instrument, and
 * until now a customer had no way to see or print one. Everything on it comes
 * from the order row, which snapshots names, prices and the tax rate at the
 * time of sale, so a reprint years later still shows what was actually agreed.
 *
 * Read through the request's own Supabase session, so RLS returns the order
 * only to the person who placed it. The `requireAuth` above is the redirect,
 * not the guard.
 */
export default async function InvoicePage({ params }: any) {
  await requireAuth('/dashboard/orders');

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items ( id, name, sku, variant_label, quantity, unit_price, line_total )')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  return <InvoiceView orderAsString={JSON.stringify(data)} />;
}

export async function generateMetadata({ params }: any) {
  const { id } = await params;
  return { title: `Invoice ${id.slice(0, 8)} | Ramazah Store` };
}

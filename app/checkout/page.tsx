import { getProfileForServer, requireAuth } from "@/lib/auth/server";
import CheckoutPage from "@/components/checkout/CheckoutPage";

/**
 * Checkout.
 *
 * This threw a runtime error for every customer. It called `getUserProfile` from
 * `lib/supabase/auth.ts`, which carries `'use client'` — Next refuses that across
 * the boundary, so the page never rendered at all. It has been broken since the
 * Supabase migration; nobody had placed an order through the UI until now.
 *
 * The profile is read through the request's own cookies instead, which is what a
 * server component actually has.
 *
 * The serialisation that used to sit here is gone with it: it called
 * `createdAt?.toDate?.()`, a Firestore Timestamp method. Supabase returns ISO
 * strings, so that branch had never once run.
 */
export default async function Checkout() {
  const authUser = await requireAuth('/checkout');
  const userProfile = await getProfileForServer(authUser.uid);

  return <CheckoutPage userProfile={userProfile} />;
}

export const metadata = {
  title: "Checkout | Ramazah Store",
  description: "Complete your purchase securely",
};

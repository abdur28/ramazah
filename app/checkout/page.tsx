// app/checkout/page.tsx
import { requireAuth } from "@/lib/auth/server";
import { getUserProfile } from "@/lib/supabase/auth";
import CheckoutPage from "@/components/checkout/CheckoutPage";
import type { UserProfile } from "@/types/types";

export default async function Checkout() {
  // Require authentication - redirects to login if not authenticated
  const authUser = await requireAuth('/checkout');
  
  // Get full user profile with address
  const userProfile = await getUserProfile(authUser.uid);

  // Serialize profile for client component (remove Firestore Timestamps)
  const serializedProfile: UserProfile | null = userProfile ? {
    ...userProfile,
    createdAt: userProfile.createdAt?.toDate?.() ? userProfile.createdAt.toDate().toISOString() : null,
    updatedAt: userProfile.updatedAt?.toDate?.() ? userProfile.updatedAt.toDate().toISOString() : null,
  } : null;

  return <CheckoutPage userProfile={serializedProfile} />;
}

export const metadata = {
  title: "Checkout | Ramazah",
  description: "Complete your purchase securely",
};
// lib/auth/server.ts
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types/types';
import { UserRole } from '@/types/types';

export interface AuthUser {
  uid: string;
  email: string | undefined;
  role: UserRole;
  displayName?: string;
  photoURL?: string;
}

/**
 * Current user in a Server Component, or null.
 * These guards are UX and convenience — RLS is the actual security boundary,
 * because a mobile client never executes them.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, photo_url, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    uid: profile.id,
    email: profile.email ?? user.email,
    role: (profile.role as UserRole) || 'user',
    displayName: profile.display_name ?? undefined,
    photoURL: profile.photo_url ?? undefined,
  };
}

export async function requireAuth(redirectUrl?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
  }
  return user;
}

export async function requireAdmin(redirectUrl?: string): Promise<AuthUser> {
  const user = await requireAuth(redirectUrl);
  if (user.role !== 'admin') notFound();
  return user;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentUser())?.role === 'admin';
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

/**
 * The signed-in customer's profile, read on the server.
 *
 * `getUserProfile` in `lib/supabase/auth.ts` does the same job, but that module
 * is `'use client'` — and `app/checkout/page.tsx`, a server component, called it
 * anyway. Next refuses that across the boundary, so **checkout has thrown a
 * runtime error for every customer since the Supabase migration**; nobody had
 * placed an order through the UI until now.
 *
 * The client version reads the session through the browser client. This one goes
 * through the request's own cookies, which is what a server component has.
 */
export async function getProfileForServer(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*, addresses(full_name, phone, street, city, state, postal_code, country, is_default)')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Server profile read failed:', error.message);
    return null;
  }

  // The default one if there is one, otherwise the first — somebody with a
  // single unflagged address should still have it filled in at checkout.
  const addresses = data.addresses ?? [];
  const address = addresses.find((row: any) => row.is_default) ?? addresses[0];

  return {
    uid: data.id,
    email: data.email,
    displayName: data.display_name ?? undefined,
    photoURL: data.photo_url ?? undefined,
    phone: data.phone ?? undefined,
    role: data.role,
    status: data.status,
    emailOptIn: data.email_opt_in,
    preferences: data.preferences ?? undefined,
    // Reaching auth.users for `email_confirmed_at` would be a second round trip
    // for a field checkout does not read.
    emailVerified: true,
    address: address
      ? {
          fullName: address.full_name ?? '',
          phone: address.phone ?? '',
          street: address.street ?? '',
          city: address.city ?? '',
          state: address.state ?? '',
          zipCode: address.postal_code ?? '',
          country: address.country ?? '',
        }
      : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as UserProfile;
}

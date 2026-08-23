'use client';

import type { User } from '@supabase/supabase-js';
import { createClient } from './client';
import type { UserPreferences, UserProfile, UserRole } from '@/types/types';

export type { User };

const defaultPreferences: UserPreferences = {
  currency: 'ngn',
  emailNotifications: {
    orderUpdates: true,
    promotions: true,
    newArrivals: true,
    wishlistAlerts: true,
    newsletter: true,
  },
};

/**
 * Sign up with email and password. The DB trigger creates the profile row and
 * seeds default preferences.
 *
 * With email confirmation enabled, Supabase returns a user but NO session — the
 * caller must not query the database until the address is confirmed, or every
 * request runs as `anon` and is denied. `needsEmailConfirmation` says which case
 * you are in.
 *
 * No `emailRedirectTo`: confirmation is a six-digit code typed on
 * `/auth/verify`, not a link to come back from.
 */
export async function signUp(email: string, password: string, displayName?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { full_name: displayName } : undefined,
    },
  });

  if (error) return { user: null, session: null, needsEmailConfirmation: false, error: error.message };

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation: !data.session,
    error: null,
  };
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { user: null, error: error.message } : { user: data.user, error: null };
}

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createClient();
  const callback = new URL('/auth/callback', window.location.origin);
  if (redirectTo) callback.searchParams.set('redirect', redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  // On success the browser navigates away; nothing to return.
  return error ? { user: null, error: error.message } : { user: null, error: null };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

/**
 * Send a reset code.
 *
 * No `redirectTo`. The reset used to be a link that landed back on
 * `/auth/reset-password` — the same form that had just sent it — so the flow
 * had no end: nobody could actually change a password. It is a code now, and
 * `verifyRecoveryCode` below is the other half.
 */
export async function resetPassword(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message ?? null };
}

/**
 * Confirm a signup with the six-digit code from the email.
 *
 * A code rather than a link because the email is so often opened on a different
 * device from the one that signed up — a laptop signup read on a phone, which a
 * link cannot bridge — and because scanners in front of some inboxes follow
 * links, consuming a single-use one before the person ever sees it.
 */
export async function verifySignupCode(email: string, token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'signup',
  });
  return error ? { user: null, error: error.message } : { user: data.user, error: null };
}

/**
 * Confirm a password reset. Succeeding leaves a live session, which is what
 * makes the `updateUserPassword` that follows it legal.
 */
export async function verifyRecoveryCode(email: string, token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'recovery',
  });
  return error ? { user: null, error: error.message } : { user: data.user, error: null };
}

/** A new code for the same address, when the first did not arrive. */
export async function resendSignupCode(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error?.message ?? null };
}

export async function updateUserEmail(newEmail: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return { error: error?.message ?? null };
}

export async function updateUserPassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

/**
 * Deleting an auth user requires privileged access, so it goes through a
 * route handler that verifies the session server-side.
 */
export async function deleteUser() {
  const res = await fetch('/api/auth/delete-account', { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? 'Failed to delete account' };
  }
  await createClient().auth.signOut();
  return { error: null };
}

export async function updateUserProfile(updates: {
  displayName?: string;
  photoURL?: string;
  phone?: string;
  emailOptIn?: boolean;
  address?: Record<string, any>;
  preferences?: UserPreferences;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No user logged in' };

  const patch: Record<string, any> = {};
  if (updates.displayName !== undefined) patch.display_name = updates.displayName;
  if (updates.photoURL !== undefined)    patch.photo_url    = updates.photoURL;
  if (updates.phone !== undefined)       patch.phone        = updates.phone;
  if (updates.emailOptIn !== undefined)  patch.email_opt_in = updates.emailOptIn;
  if (updates.preferences !== undefined) patch.preferences  = updates.preferences;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) return { error: error.message };
  }

  // Addresses live in their own table; keep one default per user.
  if (updates.address) {
    const a = updates.address;
    const row = {
      user_id: user.id,
      full_name: a.fullName ?? a.full_name ?? '',
      phone: a.phone ?? '',
      street: a.street ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      postal_code: a.zipCode ?? a.postal_code ?? null,
      country: a.country ?? 'Nigeria',
      is_default: true,
    };
    const { data: existing } = await supabase
      .from('addresses').select('id').eq('user_id', user.id).eq('is_default', true).maybeSingle();

    const { error } = existing
      ? await supabase.from('addresses').update(row).eq('id', existing.id)
      : await supabase.from('addresses').insert(row);
    if (error) return { error: error.message };
  }

  return { error: null };
}

/** Profile row plus the user's default address, shaped like the old Firestore doc. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const supabase = createClient();

  // Without a session every request runs as `anon`, which has no access to
  // profiles. Bail out quietly rather than surfacing a permission error.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*, addresses(full_name, phone, street, city, state, postal_code, country, is_default)')
    .eq('id', uid)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Get user profile error:', error.message);
    return null;
  }

  const user = session.user;
  const address = (data.addresses ?? []).find((a: any) => a.is_default);

  return {
    uid: data.id,
    email: data.email,
    displayName: data.display_name ?? undefined,
    photoURL: data.photo_url ?? undefined,
    phone: data.phone ?? undefined,
    role: data.role as UserRole,
    status: data.status,
    emailOptIn: data.email_opt_in,
    preferences: (data.preferences ?? defaultPreferences) as UserPreferences,
    emailVerified: !!user?.email_confirmed_at,
    address: address
      ? {
          fullName: address.full_name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.postal_code ?? '',
          country: address.country,
        }
      : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Mirrors Firebase's onAuthStateChanged contract. */
export function onAuthChange(callback: (user: User | null) => void) {
  const supabase = createClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function getCurrentUser() {
  const { data: { user } } = await createClient().auth.getUser();
  return user;
}

export async function isAuthenticated() {
  return (await getCurrentUser()) !== null;
}

// lib/auth/server.ts
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin check for route handlers.
 *
 * Route handlers are public HTTP endpoints. Being reachable only from an admin
 * screen means nothing — anyone can `curl` them — and four of this app's five
 * routes had no check at all, so uploading, deleting and mailing were open to
 * the internet. RLS does not help here either: these routes act through
 * Cloudinary and SMTP, not through Postgres, so there is no policy between the
 * request and the effect.
 *
 * Returns the user when they are an admin, or the response to send back.
 * Callers do:
 *
 *   const gate = await requireAdminApi();
 *   if (gate instanceof NextResponse) return gate;
 */
export async function requireAdminApi(): Promise<
  { id: string; email: string | undefined } | NextResponse
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // A suspended admin is still an admin by role; the account is not usable.
  if (profile?.status === 'inactive') {
    return NextResponse.json({ error: 'This account is suspended' }, { status: 403 });
  }

  return { id: user.id, email: user.email };
}

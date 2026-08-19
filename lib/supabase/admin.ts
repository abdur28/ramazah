import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Supabase client — BYPASSES Row Level Security.
 *
 * Server-only: admin scripts, trusted route handlers, seeding.
 * Never import this from a Client Component or the mobile app.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. ' +
        'The secret key is server-only — set it in .env.local.'
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

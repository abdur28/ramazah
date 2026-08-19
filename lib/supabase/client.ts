import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components and browser code.
 * Uses the publishable key — safe to expose, because RLS constrains it.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

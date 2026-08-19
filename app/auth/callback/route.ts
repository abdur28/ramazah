import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / email-confirmation landing point. Exchanges the code for a session,
 * then sends the user where they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requested = searchParams.get('redirect') ?? '/';

  // Only allow internal paths — never redirect to an attacker-supplied host.
  const target = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${target}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { after } from 'next/server';
import { drainOutbox } from '@/lib/email/worker';

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
    if (!error) {
      // The welcome email is queued by a trigger the moment the profile row is
      // written. This is the first server request that happens afterwards, so it
      // is where the nudge belongs — `after()` runs it once the redirect has
      // been sent, so nobody waits on SMTP to finish signing up.
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const address = user.email;
        after(async () => {
          try {
            await drainOutbox(10, { onlyEmail: address });
          } catch (err) {
            console.error('[mail] welcome nudge failed:', err);
          }
        });
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { drainOutbox } from '@/lib/email/worker';

/**
 * "Send my own queued mail now."
 *
 * A signed-in customer cannot call `/api/email/worker` — that is admin or cron
 * only, and rightly: draining the whole queue on demand would let anyone on the
 * internet mail every customer at once, or empty the queue at a moment of their
 * choosing.
 *
 * This is the scoped version. It reads the caller's own address from their
 * session and drains only rows addressed to it, so the worst anybody can do is
 * receive their own email a few minutes sooner. It also skips the scheduler,
 * because a customer hurrying their acknowledgement is not the shop's cron.
 *
 * Fire-and-forget from the browser: the row is durable before this is called, so
 * a failure costs a few minutes and the schedule sends it anyway.
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const result = await drainOutbox(10, { onlyEmail: user.email });
  return NextResponse.json({ sent: result.sent, failed: result.failed });
}

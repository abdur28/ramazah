import { NextResponse } from 'next/server';
import { drainOutbox } from '@/lib/email/worker';
import { requireAdminApi } from '@/lib/auth/api';

/**
 * Sends whatever is due.
 *
 * Two ways in, and both are guarded. A cron service presents `CRON_SECRET` as a
 * bearer token; a signed-in admin can press the button on the mailer screen. The
 * route runs on the service key internally, so leaving it open would let anyone
 * on the internet drain the queue — or, with a crafted schedule, mail every
 * customer at once.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorise(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');

  if (secret && header === `Bearer ${secret}`) return true;

  const gate = await requireAdminApi();
  return !(gate instanceof NextResponse);
}

export async function POST(request: Request) {
  if (!(await authorise(request))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }

  // `?dry=1` renders everything due and sends nothing — how the admin checks
  // the queue would go out cleanly before pressing anything irreversible.
  const dryRun = new URL(request.url).searchParams.get('dry') === '1';
  const result = await drainOutbox(25, { dryRun });
  return NextResponse.json({ ...result, dryRun });
}

// Cron services generally issue GET. Same guard, same work.
export async function GET(request: Request) {
  return POST(request);
}

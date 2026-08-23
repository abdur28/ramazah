import { createClient } from '@supabase/supabase-js';
import { renderEmail } from './render';
import { deliver, mailerConfigured, senderFor } from './send';
import { getSettings } from '@/lib/settings';
import { EMAILS } from './templates';

/**
 * Drains the outbox.
 *
 * Runs on the service key because it reads other people's orders to build their
 * emails, and writes send results back. It is never reachable from a browser —
 * see the route that calls it.
 *
 * Failures are recorded and retried rather than thrown away. Five attempts with
 * a widening gap, then the row stops and stays visible in the admin: something
 * that has failed five times is a problem for a person, not for a retry loop.
 */
const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 20, 60, 240];

export interface DrainResult {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * `dryRun` renders everything due and sends nothing.
 *
 * Not a testing affordance bolted on: it is how the admin previews a template
 * against a real recent order, and how you can tell whether the queue would go
 * out cleanly before SMTP credentials exist at all. Rendering is where the
 * mistakes are — a missing field, a template that throws on an order with no
 * address — and this exercises all of it.
 */
export async function drainOutbox(
  limit = 25,
  options: { dryRun?: boolean; onlyEmail?: string } = {}
): Promise<DrainResult> {
  const db = admin();
  const result: DrainResult = { claimed: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  if (!options.dryRun && !mailerConfigured()) {
    result.errors.push('Email is not configured — set EMAIL_USER and EMAIL_PASSWORD.');
    return result;
  }

  // Once per drain rather than once per email: it is six rows, and a batch of
  // fifty would otherwise be fifty round trips for the same answer.
  //
  // `db` rather than the default client: the sender identity lives in the
  // admin-only `email` group, and the worker has no session.
  const settings = await getSettings(db);

  // Anything scheduled rather than triggered — the abandoned basket, the daily
  // digest — is enqueued first, so one pass does both jobs. Skipped for a
  // single-address nudge: that caller is hurrying their own mail, not running
  // the shop's schedule.
  //
  // The error is surfaced rather than ignored. It was ignored, and a missing
  // grant meant this call failed every time while the run reported success: the
  // digest and the abandoned-basket email would never have gone out and nothing
  // would have said so.
  if (!options.onlyEmail) {
    const { error: scheduleError } = await db.rpc('enqueue_scheduled_emails');
    if (scheduleError) {
      result.errors.push(`Scheduling: ${scheduleError.message}`);
    }
  }

  // `onlyEmail` is what lets a signed-in customer hurry along their own mail
  // without being able to drain anybody else's — see `/api/email/nudge`.
  let query = db
    .from('email_outbox')
    .select('*')
    .eq('status', 'queued')
    .lte('send_after', new Date().toISOString())
    // Priority before age. One table and one transport carry both the invoice
    // and the newsletter, and every sending plan has a daily allowance — so
    // without this, a campaign queued at nine drains ahead of an order
    // confirmation queued at five past, and the invoice is what does not go
    // when the allowance runs out. See migration 20260831000040.
    .order('priority', { ascending: true })
    .order('send_after', { ascending: true })
    .limit(limit);

  if (options.onlyEmail) query = query.eq('to_email', options.onlyEmail);

  const { data: rows, error } = await query;

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  result.claimed = rows?.length ?? 0;

  for (const row of rows ?? []) {
    try {
      // Marketing only. `may_email` knows which is which, and returns true for
      // anything transactional — you cannot opt out of your own invoice.
      const { data: allowed } = await db.rpc('may_email', {
        p_email: row.to_email,
        p_template: row.template,
      });

      if (allowed === false) {
        if (!options.dryRun) {
          await db.from('email_outbox')
            .update({ status: 'cancelled', last_error: 'Recipient has not opted in' })
            .eq('id', row.id);
        }
        result.skipped += 1;
        continue;
      }

      const category = EMAILS[row.template]?.category ?? 'transactional';

      /**
       * Only marketing gets an unsubscribe, in the body *and in the headers*.
       *
       * The renderer already withheld the link from transactional mail —
       * "offering it there invites somebody to switch off their own invoices" —
       * and then this passed the URL to `deliver()` regardless, which set
       * `List-Unsubscribe` on every email a customer could be identified from.
       * Every profile carries a token, so every invoice carried the header.
       *
       * That is a bulk-mail signal on the one message that most needs to look
       * like correspondence rather than a mailing. It also cost two queries per
       * email to build a URL that was then thrown away.
       */
      const unsubscribeUrl =
        category === 'marketing' ? await unsubscribeUrlFor(db, row.to_email) : null;

      const rendered = await renderEmail({ db, row }, { unsubscribeUrl });

      // The template decided this should no longer go: a reminder for an order
      // that has since been paid, a review invitation for one that was
      // cancelled. Not a failure.
      if (!rendered) {
        if (!options.dryRun) {
          await db.from('email_outbox')
            .update({ status: 'cancelled', last_error: 'No longer applicable' })
            .eq('id', row.id);
        }
        result.skipped += 1;
        continue;
      }

      if (options.dryRun) {
        // Rendered fine, nothing sent, nothing marked. The row stays queued so a
        // real run still delivers it.
        result.sent += 1;
        continue;
      }

      await deliver({
        to: row.to_email,
        toName: row.to_name,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        unsubscribeUrl,
        // Marketing goes out under its own address so a newsletter's spam
        // complaints cannot follow the invoices.
        sender: senderFor(row.template, settings),
      });

      await db.from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq('id', row.id);
      result.sent += 1;

    } catch (err: any) {
      if (options.dryRun) {
        result.failed += 1;
        result.errors.push(`${row.template}: ${String(err?.message ?? err).slice(0, 300)}`);
        continue;
      }

      const attempts = row.attempts + 1;
      const message = String(err?.message ?? err).slice(0, 500);
      const giveUp = attempts >= MAX_ATTEMPTS;

      await db.from('email_outbox').update({
        status: giveUp ? 'failed' : 'queued',
        attempts,
        last_error: message,
        send_after: giveUp
          ? row.send_after
          : new Date(Date.now() + BACKOFF_MINUTES[attempts - 1] * 60_000).toISOString(),
      }).eq('id', row.id);

      result.failed += 1;
      result.errors.push(`${row.template}: ${message}`);
    }
  }

  return result;
}

/**
 * The unsubscribe link for an address, if it has one.
 *
 * Looked up rather than passed in, because the token is the credential and
 * putting it in the outbox payload would mean it sat in a table that a
 * screenshot could leak.
 */
async function unsubscribeUrlFor(db: any, email: string): Promise<string | null> {
  const site = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const { data: profile } = await db
    .from('profiles').select('unsubscribe_token').eq('email', email).maybeSingle();
  if (profile?.unsubscribe_token) return `${site}/unsubscribe?t=${profile.unsubscribe_token}`;

  const { data: subscriber } = await db
    .from('newsletter_subscribers').select('unsubscribe_token').eq('email', email).maybeSingle();
  if (subscriber?.unsubscribe_token) return `${site}/unsubscribe?t=${subscriber.unsubscribe_token}`;

  return null;
}

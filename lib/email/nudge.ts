import { after } from 'next/server';
import { drainOutbox } from './worker';

/**
 * Send what is due, now, without making anyone wait for it.
 *
 * The outbox stays the source of truth — this is an accelerator, not a second
 * path. The row is already written and durable before this runs, so if the send
 * fails, or the process dies, or SMTP is down, the row is still queued and the
 * scheduled run picks it up. That is the difference between "instant instead of
 * queued" (fragile) and "queued, then nudged" (not).
 *
 * `after()` runs the work once the response has been streamed, so the customer
 * sees their confirmation immediately and the invoice goes out a moment later
 * rather than the page waiting on SMTP.
 *
 * Errors are swallowed on purpose. A customer whose order succeeded must not see
 * a failure because a mail server was slow — and the failure is already recorded
 * on the row, visible in the Mailer, and retried by the schedule.
 */
export function sendQueuedEmailsSoon(): void {
  after(async () => {
    try {
      const result = await drainOutbox(25);
      if (result.errors.length) {
        console.error('[mail] nudge finished with errors:', result.errors.join(' | '));
      }
    } catch (error) {
      // Never rethrown — the customer's order succeeded and mail is not their
      // problem — but logged, because a silently swallowed failure is one nobody
      // can diagnose. The row stays queued either way.
      console.error('[mail] nudge failed:', error);
    }
  });
}

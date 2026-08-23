import { createClient } from '@/lib/supabase/client';
import { fetchPage, rangeFor } from '@/lib/paging';

/**
 * The outbox, for the admin.
 *
 * The mailer used to report a send in a dialog that died on refresh, so "did
 * that go out?" had no answer half an hour later. This is that answer.
 */
export interface OutboxEntry {
  id: string;
  template: string;
  toEmail: string;
  toName?: string;
  status: 'queued' | 'sent' | 'failed' | 'cancelled';
  sendAfter: string;
  sentAt?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface OutboxCounts {
  queued: number;
  sent: number;
  failed: number;
  cancelled: number;
  /** Queued and already due — what a run right now would pick up. */
  due: number;
}

const map = (row: any): OutboxEntry => ({
  id: row.id,
  template: row.template,
  toEmail: row.to_email,
  toName: row.to_name ?? undefined,
  status: row.status,
  sendAfter: row.send_after,
  sentAt: row.sent_at ?? undefined,
  attempts: row.attempts,
  lastError: row.last_error ?? undefined,
  createdAt: row.created_at,
});

/**
 * One page of the outbox.
 *
 * Was capped at 200 with no way past it, which was safe but meant the two
 * hundred and first email did not exist as far as this screen was concerned.
 * The counts above the list have always come from the database; now the list
 * can reach everything they count.
 */
export async function getOutbox(status?: string, page = 1): Promise<{
  entries: OutboxEntry[];
  total: number;
  page: number;
  error: string | null;
}> {
  const { data, error, count, page: landed } = await fetchPage(page, async (p) => {
    const [first, last] = rangeFor(p);

    let query = createClient()
      .from('email_outbox')
      .select(
        'id, template, to_email, to_name, status, send_after, sent_at, attempts, last_error, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(first, last);

    if (status && status !== 'all') query = query.eq('status', status);
    return query;
  });

  if (error) return { entries: [], total: 0, page: 1, error: error.message };

  const entries = (data ?? []).map(map);
  return { entries, total: count ?? entries.length, page: landed, error: null };
}

/**
 * Counted in the database.
 *
 * This used to select every row and tally them in the browser, which looked like
 * a performance problem and was a correctness one: **PostgREST caps an unbounded
 * select at 1000 rows**, so past a thousand the counts silently stopped moving.
 * Measured at 2,505 rows in the table and 1,000 reported — and it would have read
 * 1,000 forever, on the screen whose whole job is answering "did we send it".
 */
export async function getOutboxCounts(): Promise<OutboxCounts> {
  const empty: OutboxCounts = { queued: 0, sent: 0, failed: 0, cancelled: 0, due: 0 };

  const { data, error } = await createClient().rpc('outbox_counts');
  if (error || !data?.length) return empty;

  const row = data[0] as any;
  return {
    queued: row.queued ?? 0,
    sent: row.sent ?? 0,
    failed: row.failed ?? 0,
    cancelled: row.cancelled ?? 0,
    due: row.due ?? 0,
  };
}

/** Put a failed row back in the queue, due now. */
export async function retryEmail(id: string): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .from('email_outbox')
    .update({ status: 'queued', attempts: 0, send_after: new Date().toISOString(), last_error: null })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function cancelEmail(id: string): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .from('email_outbox')
    .update({ status: 'cancelled', last_error: 'Cancelled by staff' })
    .eq('id', id);
  return { error: error?.message ?? null };
}

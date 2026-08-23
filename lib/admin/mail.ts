import { createClient } from '@/lib/supabase/client';

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

export async function getOutbox(status?: string, limit = 200): Promise<{
  entries: OutboxEntry[];
  error: string | null;
}> {
  let query = createClient()
    .from('email_outbox')
    .select('id, template, to_email, to_name, status, send_after, sent_at, attempts, last_error, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { entries: [], error: error.message };
  return { entries: (data ?? []).map(map), error: null };
}

export async function getOutboxCounts(): Promise<OutboxCounts> {
  const { data } = await createClient()
    .from('email_outbox').select('status, send_after');

  const counts: OutboxCounts = { queued: 0, sent: 0, failed: 0, cancelled: 0, due: 0 };
  const now = Date.now();

  (data ?? []).forEach((row: any) => {
    counts[row.status as keyof OutboxCounts] += 1;
    if (row.status === 'queued' && new Date(row.send_after).getTime() <= now) counts.due += 1;
  });

  return counts;
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

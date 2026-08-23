import { createClient } from '@/lib/supabase/client';
import { PAGE_SIZE, rangeFor } from '@/lib/paging';

/**
 * Campaigns, from the admin's side.
 *
 * A campaign is a set of outbox rows rather than a burst of `fetch` calls, so
 * everything the transactional side already has — a record, retries, dedupe,
 * survival past a closed tab — comes with it.
 */
export type Segment = 'all' | 'customers' | 'recent' | 'lapsed' | 'never' | 'subscribers';

export const SEGMENTS: { value: Segment; label: string; note: string }[] = [
  { value: 'all',         label: 'Everyone who opted in', note: 'Accounts and footer subscribers.' },
  { value: 'customers',   label: 'Anyone who has ordered', note: 'At least one order, ever.' },
  { value: 'recent',      label: 'Bought in the last 90 days', note: 'The people most likely to buy again.' },
  { value: 'lapsed',      label: 'Not seen in 6 months', note: 'Ordered once, then went quiet.' },
  { value: 'never',       label: 'Signed up, never ordered', note: 'An account and no first order.' },
  { value: 'subscribers', label: 'Footer subscribers only', note: 'On the list with no account.' },
];

export interface CampaignResult {
  id: string;
  template: string;
  subject: string;
  segment: string;
  recipients: number;
  createdAt: string;
  sent: number;
  failed: number;
  queued: number;
  cancelled: number;
  sender?: string;
}

/**
 * How many people a segment actually reaches, opt-out already applied.
 *
 * Still fetches the rows rather than counting server-side, because the audience
 * is bounded by the number of accounts and subscribers — thousands, not the
 * hundreds of thousands the outbox can reach. Worth revisiting if the list ever
 * gets big enough to notice.
 */
export async function countAudience(segment: Segment): Promise<number> {
  const { data, error } = await createClient()
    .rpc('campaign_audience', { p_segment: segment });
  if (error) return 0;
  return (data ?? []).length;
}

export async function sendCampaign(input: {
  template: string;
  subject: string;
  segment: Segment;
  payload: Record<string, any>;
}): Promise<{ recipients?: number; error?: string }> {
  const { data, error } = await createClient().rpc('send_campaign', {
    p_template: input.template,
    p_subject: input.subject,
    p_segment: input.segment,
    p_payload: input.payload,
  });

  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { recipients: row?.recipients ?? 0 };
}

export async function getCampaigns(page = 1): Promise<{
  campaigns: CampaignResult[];
  total: number;
  error: string | null;
}> {
  const [first] = rangeFor(page);

  const { data, error } = await createClient()
    .rpc('campaign_results', { p_limit: PAGE_SIZE, p_offset: first });
  if (error) return { campaigns: [], total: 0, error: error.message };

  const rows = (data ?? []) as any[];

  return {
    total: rows.length > 0 ? Number(rows[0].total) : 0,
    campaigns: rows.map((row: any) => ({
      id: row.id,
      template: row.template,
      subject: row.subject,
      segment: row.segment,
      recipients: row.recipients,
      createdAt: row.created_at,
      sent: row.sent,
      failed: row.failed,
      queued: row.queued,
      cancelled: row.cancelled,
      sender: row.sender ?? undefined,
    })),
    error: null,
  };
}

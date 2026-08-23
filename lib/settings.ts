import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { mergeAll, type Settings } from './settings-defaults';

export * from './settings-defaults';

/**
 * The whole configuration, server-side.
 *
 * One query for every group rather than one per group: the root layout reads
 * this on every request and six round trips would be six times the latency for
 * a table with six rows in it.
 *
 * An unreachable database costs the shop its editability, not its pages — the
 * defaults are the constants these replaced.
 *
 * **Pass a client when there is no session.** The `email` group is admin-only
 * under RLS — it holds the sender identity and the reminder cadence, which no
 * page needs — so a caller with no signed-in user reads every other group and
 * silently gets code defaults for that one. That is exactly what happened to
 * the worker: it sent as `EMAIL_FROM` with no Reply-To for a day while the
 * configured addresses sat in a row it could not see. The failure is quiet,
 * which is what makes it worth a parameter.
 */
export async function getSettings(client?: SupabaseClient): Promise<Settings> {
  try {
    const supabase = client ?? (await createClient());
    const { data } = await supabase.from('site_settings').select('key, value');

    const rows = Object.fromEntries((data ?? []).map((row: any) => [row.key, row.value]));
    return mergeAll(rows);
  } catch {
    return mergeAll({});
  }
}

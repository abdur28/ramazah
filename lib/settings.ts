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
 */
export async function getSettings(): Promise<Settings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('site_settings').select('key, value');

    const rows = Object.fromEntries((data ?? []).map((row: any) => [row.key, row.value]));
    return mergeAll(rows);
  } catch {
    return mergeAll({});
  }
}

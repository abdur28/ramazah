import { createClient } from '@/lib/supabase/client';
import {
  SETTINGS_DEFAULTS, mergeAll, type Settings, type SettingsKey,
} from '@/lib/settings-defaults';

/**
 * Reading and writing settings from the admin.
 *
 * Always opens on something: the stored rows where they exist, and the code
 * defaults where they do not. An empty form would be a trap — save it once and
 * the bank account on every invoice goes blank.
 */
export interface SettingsState {
  settings: Settings;
  /** Which groups have actually been saved, so the screen can say what is stored. */
  stored: Set<SettingsKey>;
  updatedAt?: string;
  editor?: string;
}

export async function getAdminSettings(): Promise<SettingsState> {
  const { data } = await createClient()
    .from('site_settings')
    .select('key, value, updated_at, profiles:updated_by ( display_name )')
    .order('updated_at', { ascending: false });

  const rows = Object.fromEntries((data ?? []).map((row: any) => [row.key, row.value]));
  const latest = (data ?? [])[0] as any;

  return {
    settings: mergeAll(rows),
    stored: new Set((data ?? []).map((row: any) => row.key)),
    updatedAt: latest?.updated_at,
    editor: latest?.profiles?.display_name ?? undefined,
  };
}

export async function saveSettingsGroup<K extends SettingsKey>(
  key: K,
  value: Settings[K]
): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

/**
 * Back to the code defaults.
 *
 * Deletes the row rather than writing today's defaults into it — the point of
 * the fallback is that an unset group tracks the code, and freezing a copy would
 * quietly break that.
 */
export async function resetSettingsGroup(key: SettingsKey): Promise<{ error: string | null }> {
  const { error } = await createClient().from('site_settings').delete().eq('key', key);
  return { error: error?.message ?? null };
}

export { SETTINGS_DEFAULTS };

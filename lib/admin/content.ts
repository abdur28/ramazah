import { createClient } from '@/lib/supabase/client';
import { DEFAULTS, type ContentKey } from '@/lib/content-defaults';

/**
 * Reading and writing page content from the admin.
 *
 * The editor always opens on *something*: a stored row if there is one, and the
 * code defaults if there is not. So the first time somebody opens the returns
 * page they see the words currently on the site and can edit them, rather than
 * an empty form that would wipe the page on save.
 */
export interface ContentRow {
  key: ContentKey;
  value: any;
  updatedAt?: string;
  editor?: string;
  /** False when nothing has been saved and the defaults are being shown. */
  stored: boolean;
}

export const PAGES: { key: ContentKey; label: string; note: string; href: string }[] = [
  { key: 'home',     label: 'Home page',   note: 'The opening words and the two category bands.', href: '/' },
  { key: 'faq',      label: 'FAQ',         note: 'What people ask before they order.',            href: '/faq' },
  { key: 'shipping', label: 'Shipping',    note: 'How long it takes and what it costs.',          href: '/shipping' },
  { key: 'returns',  label: 'Returns',     note: 'What to do when something arrives wrong.',      href: '/returns' },
  { key: 'terms',    label: 'Terms',       note: 'The agreement behind an order.',                href: '/terms' },
  { key: 'privacy',  label: 'Privacy',     note: 'What the site holds and why.',                  href: '/privacy' },
  { key: 'cookies',  label: 'Cookies',     note: 'What is kept on the visitor’s device.',         href: '/cookies' },
];

export async function getPageContent(key: ContentKey): Promise<ContentRow> {
  const { data } = await createClient()
    .from('site_content')
    .select('value, updated_at, profiles:updated_by ( display_name )')
    .eq('key', key)
    .maybeSingle();

  if (!data?.value) {
    return { key, value: DEFAULTS[key], stored: false };
  }

  return {
    key,
    // Merged over the default, exactly as the storefront does — so a row written
    // before a field existed still opens with that field present.
    value: { ...DEFAULTS[key], ...(data.value as object) },
    updatedAt: data.updated_at,
    editor: (data as any).profiles?.display_name ?? undefined,
    stored: true,
  };
}

export async function savePageContent(key: ContentKey, value: any): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .from('site_content')
    .upsert({ key, value }, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

/**
 * Throw away the edits and go back to what is in the code.
 *
 * Deleting rather than rewriting the defaults into the row: the point of the
 * fallback is that an unedited page tracks the code, and a "reset" that froze
 * today's defaults into the database would quietly break that.
 */
export async function resetPageContent(key: ContentKey): Promise<{ error: string | null }> {
  const { error } = await createClient().from('site_content').delete().eq('key', key);
  return { error: error?.message ?? null };
}

/** Which pages have been edited, for the index. */
export async function getEditedKeys(): Promise<Set<string>> {
  const { data } = await createClient().from('site_content').select('key');
  return new Set((data ?? []).map((row: any) => row.key));
}

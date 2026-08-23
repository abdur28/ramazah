import { createClient } from '@/lib/supabase/server';
import { DEFAULTS, type ContentKey } from './content-defaults';

/**
 * Reading page content, server-side.
 *
 * The types and the defaults live in `content-defaults.ts` because the admin
 * editor imports them from the browser, and this file cannot be imported there —
 * it pulls in the server Supabase client.
 */
export * from './content-defaults';

// ─────────────────────────────────────────────────────── reading

/**
 * One page's content, merged over its default.
 *
 * Shallow-merged on purpose: a stored row that predates a new field still gets
 * the new field from the default rather than rendering a blank where the code
 * expects a string.
 */
export async function getContent<T = any>(key: ContentKey): Promise<T> {
  const fallback = DEFAULTS[key];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_content').select('value').eq('key', key).maybeSingle();

    if (!data?.value) return fallback as T;
    return { ...fallback, ...(data.value as object) } as T;
  } catch {
    // A database that is unreachable should cost the shop its editability, not
    // its pages.
    return fallback as T;
  }
}

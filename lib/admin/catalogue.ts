import { createClient } from '@/lib/supabase/client';

/**
 * How many products sit in each category and collection.
 *
 * Neither list showed this, and it is the one number that decides whether the
 * entry should exist: a category with nothing in it is a dead link in the shop's
 * navigation, and a collection with nothing in it renders an empty page. There
 * was no way to spot either from the admin.
 *
 * Counts include drafts, so a category that looks empty on the shop but holds
 * unpublished work does not read as abandoned.
 */
export async function getCategoryProductCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await createClient()
    .from('products')
    .select('category_id')
    .not('category_id', 'is', null);

  if (error) return counts;

  (data ?? []).forEach((row: any) => {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  });

  return counts;
}

export async function getCollectionProductCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await createClient()
    .from('products')
    .select('collection_id')
    .not('collection_id', 'is', null);

  if (error) return counts;

  (data ?? []).forEach((row: any) => {
    counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
  });

  return counts;
}

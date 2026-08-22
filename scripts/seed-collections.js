#!/usr/bin/env node
/**
 * Two collections, so the shape is visible.
 *
 * The table has always been empty, which is why the concept never proved itself
 * either way. These are the two kinds this shop actually has:
 *
 *   The Cairo Run — a buying trip. Cuts across every category, which is exactly
 *   what no category can express and what a tag has no page for.
 *   Ramadan Table  — an occasion. Recurs, so it is worth a permanent URL.
 *
 *   node scripts/seed-collections.js
 *   node scripts/seed-collections.js --clean
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&q=70`;

const COLLECTIONS = [
  {
    slug: 'the-cairo-run',
    name: 'The Cairo Run',
    description:
      'Everything from the last trip, in one place. Chosen in the souk rather than from a catalogue — which is why a run never fits neatly into one shelf.',
    banner: '1539768942893-daf53e448371',
    bannerAlt: 'A market street in Cairo',
    featured: true,
    sortOrder: 1,
    // Deliberately across categories: that is the point of a run.
    products: ['egyptian-ground-coffee', 'chiffon-veil', 'brass-serving-tray', 'medjool-dates'],
  },
  {
    slug: 'the-ramadan-table',
    name: 'The Ramadan Table',
    description:
      'Dates, coffee, and the things they are served on. Put together for iftar, and worth keeping a link to — it comes round every year.',
    banner: '1519817650390-64a93db51149',
    bannerAlt: 'Dates and coffee laid out for iftar',
    // Only one collection can hold the home page now, and the run has it.
    featured: false,
    sortOrder: 2,
    products: ['medjool-dates', 'egyptian-ground-coffee', 'brass-lantern'],
  },
];

const SLUGS = COLLECTIONS.map((c) => c.slug);

async function clean() {
  const { data } = await db.from('collections').select('id').in('slug', SLUGS);
  const ids = (data ?? []).map((row) => row.id);

  if (ids.length > 0) {
    // product_collections cascades on delete, so the memberships go with the
    // collections and the products themselves are untouched.
    await db.from('collections').delete().in('id', ids);
  }
  console.log(`Removed ${ids.length} demo collection(s).`);
}

async function main() {
  if (process.argv.includes('--clean')) return clean();
  await clean();

  for (const entry of COLLECTIONS) {
    const { data: collection, error } = await db
      .from('collections')
      .insert({
        name: entry.name,
        slug: entry.slug,
        description: entry.description,
        banner_public_id: `demo/${entry.slug}`,
        banner_url: unsplash(entry.banner),
        banner_alt: entry.bannerAlt,
        sort_order: entry.sortOrder,
      })
      .select('id')
      .single();
    if (error) throw new Error(`${entry.name}: ${error.message}`);

    // Membership is a join table, so the overlap between the buying run and the
    // Ramadan table is kept rather than resolved to whichever seeded last.
    const { data: products, error: lookupError } = await db
      .from('products').select('id').in('slug', entry.products);
    if (lookupError) throw new Error(`${entry.name}: ${lookupError.message}`);

    const { error: linkError } = await db
      .from('product_collections')
      .insert((products ?? []).map((p) => ({
        product_id: p.id,
        collection_id: collection.id,
      })));
    if (linkError) throw new Error(`${entry.name}: ${linkError.message}`);

    console.log(`  ${entry.name} — ${entry.products.length} products`);
  }

  // Only one collection can be on the home page, so the flag is set after every
  // insert rather than on them. Two plain updates rather than
  // set_home_collection(): that function guards on is_admin(), which reads
  // auth.uid(), and this script runs on the service key with no signed-in user.
  // RLS does not apply here, but the unique index still does — hence clearing
  // first.
  const home = COLLECTIONS.find((c) => c.featured);
  if (home) {
    await db.from('collections').update({ is_featured: false }).eq('is_featured', true);
    const { error } = await db
      .from('collections').update({ is_featured: true }).eq('slug', home.slug);
    if (error) throw new Error(`home page: ${error.message}`);
  }

  const { data: summary } = await db.rpc('collection_summaries');
  console.log('\nNow live:');
  (summary ?? []).forEach((row) =>
    console.log(`  /collections/${row.slug}  ${row.product_count} products${row.is_featured ? '  <- home page' : ''}`)
  );
  console.log('\nProducts overlap between the two: a buying run and an occasion');
  console.log('both claim the dates and the coffee, and both now keep them.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

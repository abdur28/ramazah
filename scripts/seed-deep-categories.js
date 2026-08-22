#!/usr/bin/env node
/**
 * A genuinely deep category branch, with products at several levels.
 *
 * The catalogue is two levels everywhere, so nothing in it exercises the six
 * levels the tree now supports — and the interesting behaviour only shows up
 * with products scattered down a branch rather than all at the bottom:
 *
 *   Food & Pantry                                     (1)  existing
 *     └ Spices & Condiments                           (2)  existing
 *         └ Whole Spices                              (3)  + 1 product
 *             └ Seeds                                 (4)  + 1 product
 *                 └ Cumin                             (5)  + 1 product
 *                     └ Alexandria                    (6)  + 1 product
 *
 * With that in place a category page can be checked for the thing that was
 * broken until now: a parent rolls up everything beneath it, so Whole Spices
 * shows four products, Seeds three, Cumin two and Alexandria one.
 *
 *   node scripts/seed-deep-categories.js
 *   node scripts/seed-deep-categories.js --clean
 *
 * Placeholders from Unsplash, like `constants/demo.ts`. Swap for Cloudinary
 * when the real photographs exist.
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
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=70`;

/** The branch, hung under the existing Spices & Condiments. */
const BRANCH = [
  { name: 'Whole Spices', slug: 'whole-spices',
    subtitle: 'Unground, so they keep their oils' },
  { name: 'Seeds', slug: 'spice-seeds',
    subtitle: 'Coriander, cumin, nigella, fennel' },
  { name: 'Cumin', slug: 'cumin',
    subtitle: 'The backbone of Egyptian cooking' },
  { name: 'Alexandria', slug: 'alexandria-cumin',
    subtitle: 'Single-estate, from the delta' },
];

/** One product per level, so the roll-up is visible as you climb. */
const PRODUCTS = [
  {
    slug: 'whole-cardamom-pods', name: 'Whole Cardamom Pods', categorySlug: 'whole-spices',
    short: 'Green pods, cracked into coffee or rice.',
    description: 'Whole green cardamom, picked for size and colour. Crack a pod into the pot and the whole kitchen knows.',
    sku: 'RMZ-SPC-CARD', image: '1596040033229-a9821ebd058d',
    details: { Origin: 'Egypt', Form: 'Whole pods' },
    variants: [
      { options: { Weight: '100g' }, sku: 'CARD-100G', price: 6500, stock: 24 },
      { options: { Weight: '250g' }, sku: 'CARD-250G', price: 14000, stock: 12 },
    ],
  },
  {
    slug: 'coriander-seed', name: 'Coriander Seed', categorySlug: 'spice-seeds',
    short: 'Toasted whole, ground fresh.',
    description: 'Round, pale coriander seed with a citrus note. Toast it in a dry pan before grinding and it stops tasting like dust.',
    sku: 'RMZ-SPC-CORI', image: '1509358271058-acd22cc93898',
    details: { Origin: 'Egypt', Form: 'Whole seed' },
    variants: [
      { options: { Weight: '200g' }, sku: 'CORI-200G', price: 4800, stock: 30 },
    ],
  },
  {
    slug: 'cumin-seed-whole', name: 'Cumin Seed, Whole', categorySlug: 'cumin',
    short: 'The one every Egyptian kitchen runs out of.',
    description: 'Whole cumin seed, warm and slightly bitter. Keeps its oils far longer than the ground kind.',
    sku: 'RMZ-SPC-CUMW', image: '1615485290382-441e4d049cb5',
    details: { Origin: 'Egypt', Form: 'Whole seed', Harvest: '2026' },
    variants: [
      { options: { Weight: '200g' }, sku: 'CUMW-200G', price: 5200, stock: 40 },
      { options: { Weight: '500g' }, sku: 'CUMW-500G', price: 11500, stock: 18 },
    ],
  },
  {
    slug: 'alexandria-cumin-single-estate', name: 'Alexandria Cumin, Single Estate',
    categorySlug: 'alexandria-cumin',
    short: 'One farm, one harvest, in the delta.',
    description: 'Cumin from a single estate outside Alexandria. Darker and sweeter than the blended kind, and worth the difference in a dish where cumin is the point.',
    sku: 'RMZ-SPC-CUMA', image: '1532336414038-cf19250c5757',
    details: { Origin: 'Alexandria, Egypt', Form: 'Whole seed', Estate: 'Single' },
    variants: [
      { options: { Weight: '150g' }, sku: 'CUMA-150G', price: 9800, stock: 9 },
    ],
  },
];

const SLUGS = BRANCH.map((c) => c.slug);
const PRODUCT_SLUGS = PRODUCTS.map((p) => p.slug);

async function clean() {
  await db.from('products').delete().in('slug', PRODUCT_SLUGS);
  // Deepest first: parent_id is ON DELETE RESTRICT.
  for (const slug of [...SLUGS].reverse()) {
    await db.from('categories').delete().eq('slug', slug);
  }
  console.log('Removed the deep branch and its products.');
}

async function main() {
  if (process.argv.includes('--clean')) return clean();

  await clean();

  const { data: root } = await db
    .from('categories').select('id, path').eq('slug', 'spices-condiments').maybeSingle();
  if (!root) {
    console.error('No spices-condiments category. Run `npm run seed` first.');
    process.exit(1);
  }

  // The path and depth are set by the trigger, not here.
  let parentId = root.id;
  const idBySlug = new Map();

  for (const level of BRANCH) {
    const { data, error } = await db
      .from('categories')
      .insert({ parent_id: parentId, name: level.name, slug: level.slug, subtitle: level.subtitle })
      .select('id, path, depth')
      .single();
    if (error) throw new Error(`${level.name}: ${error.message}`);

    idBySlug.set(level.slug, data.id);
    parentId = data.id;
    console.log(`  level ${data.depth}  ${data.path}`);
  }

  console.log();

  for (const product of PRODUCTS) {
    const categoryId = idBySlug.get(product.categorySlug);

    const { data: row, error } = await db
      .from('products')
      .insert({
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        short_description: product.short,
        category_id: categoryId,
        item_type: 'spice',
        details: product.details,
        tags: ['spice', 'egypt'],
        is_perishable: true,
        status: 'active',
        published_at: new Date().toISOString(),
        low_stock_alert: 5,
      })
      .select('id')
      .single();
    if (error) throw new Error(`${product.name}: ${error.message}`);

    await db.from('product_images').insert({
      product_id: row.id,
      public_id: `demo/${product.slug}`,
      url: unsplash(product.image),
      secure_url: unsplash(product.image),
      alt_text: product.name,
      position: 0,
      is_primary: true,
    });

    // One axis — Weight — so the variant picker has something to show.
    const { data: option } = await db
      .from('product_options')
      .insert({ product_id: row.id, name: 'Weight', position: 0 })
      .select('id')
      .single();

    let position = 0;
    for (const variant of product.variants) {
      const value = variant.options.Weight;

      const { data: optionValue } = await db
        .from('product_option_values')
        .insert({ option_id: option.id, value, position })
        .select('id')
        .single();

      const { data: created, error: variantError } = await db
        .from('product_variants')
        .insert({
          product_id: row.id,
          sku: variant.sku,
          stock_count: variant.stock,
          // Whole spices keep for a long time; far enough out to stay sellable.
          expiry_date: '2028-03-31',
          position: position++,
        })
        .select('id')
        .single();
      if (variantError) throw new Error(`${variant.sku}: ${variantError.message}`);

      await db.from('variant_option_values')
        .insert({ variant_id: created.id, option_value_id: optionValue.id });
      await db.from('product_prices')
        .insert({ variant_id: created.id, currency: 'NGN', amount: variant.price });
    }

    const { data: category } = await db
      .from('categories').select('depth').eq('id', categoryId).single();
    console.log(`  ${product.name}  →  level ${category.depth}`);
  }

  console.log('\nWhat each page should now list (a parent rolls up everything beneath it):');
  console.log('  /categories/food-pantry                                          8');
  console.log('  /categories/food-pantry/spices-condiments                        5');
  console.log('  /categories/food-pantry/spices-condiments/whole-spices           4');
  console.log('  …/whole-spices/spice-seeds                                       3');
  console.log('  …/spice-seeds/cumin                                              2');
  console.log('  …/cumin/alexandria-cumin                                         1');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

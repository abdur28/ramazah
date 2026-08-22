#!/usr/bin/env node
/**
 * Give the Chiffon Veil a photograph per colour.
 *
 * `variant_images` has existed since the first migration and held nothing, so
 * there was no product in the catalogue that could demonstrate it — every
 * product has exactly one photograph, and the veil showed the same picture
 * whether you picked Black or Sand.
 *
 * This adds a second and third image to that product and links one to each
 * colour variant, which is the case the feature exists for. Placeholders from
 * Unsplash, in the same spirit as `constants/demo.ts`: swap the URLs for
 * Cloudinary ones when the real photographs exist.
 *
 *   node scripts/seed-variant-images.js
 *   node scripts/seed-variant-images.js --clean   # unlink and remove the extras
 */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

// Same env loading as the other seeds — this repo has no dotenv dependency.
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

/** One photograph per colour, plus a shared detail shot to prove the fallback. */
const SHOTS = [
  { colour: 'Black', publicId: 'demo/veil-black', id: '1610030469983-98e550d6193c', alt: 'Black chiffon veil, folded' },
  { colour: 'Sand',  publicId: 'demo/veil-sand',  id: '1601762603339-fd61e28b698a', alt: 'Sand chiffon veil, folded' },
];

async function main() {
  const clean = process.argv.includes('--clean');

  const { data: product, error } = await db
    .from('products')
    .select('id, name, product_images ( id, public_id ), product_variants ( id, sku )')
    .eq('slug', 'chiffon-veil')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!product) {
    console.error('No chiffon-veil product. Run the main seed first.');
    process.exit(1);
  }

  if (clean) {
    const extras = product.product_images
      .filter((image) => SHOTS.some((shot) => shot.publicId === image.public_id))
      .map((image) => image.id);

    if (extras.length > 0) {
      // variant_images cascades on the image delete.
      await db.from('product_images').delete().in('id', extras);
    }
    console.log(`Removed ${extras.length} demo variant photograph(s).`);
    return;
  }

  // Which variant is which colour.
  const { data: rows } = await db
    .from('variant_option_values')
    .select('variant_id, product_option_values ( value )')
    .in('variant_id', product.product_variants.map((v) => v.id));

  const variantByColour = new Map();
  (rows ?? []).forEach((row) => {
    const value = row.product_option_values?.value;
    if (value) variantByColour.set(value, row.variant_id);
  });

  let position = product.product_images.length;
  let linked = 0;

  for (const shot of SHOTS) {
    const variantId = variantByColour.get(shot.colour);
    if (!variantId) {
      console.warn(`No ${shot.colour} variant — skipped.`);
      continue;
    }

    // Idempotent: re-running replaces rather than duplicating.
    const existing = product.product_images.find((i) => i.public_id === shot.publicId);
    if (existing) await db.from('product_images').delete().eq('id', existing.id);

    const { data: image, error: imageError } = await db
      .from('product_images')
      .insert({
        product_id: product.id,
        public_id: shot.publicId,
        url: unsplash(shot.id),
        secure_url: unsplash(shot.id),
        alt_text: shot.alt,
        position: position++,
        is_primary: false,
      })
      .select('id')
      .single();
    if (imageError) throw new Error(imageError.message);

    const { error: linkError } = await db
      .from('variant_images')
      .insert({ variant_id: variantId, image_id: image.id });
    if (linkError) throw new Error(linkError.message);

    linked += 1;
    console.log(`${shot.colour} → its own photograph.`);
  }

  // The original shot belongs to both, otherwise picking a colour would hide it.
  const cover = product.product_images.find((i) => !SHOTS.some((s) => s.publicId === i.public_id));
  if (cover) {
    for (const variantId of variantByColour.values()) {
      await db.from('variant_images')
        .upsert({ variant_id: variantId, image_id: cover.id }, { onConflict: 'variant_id,image_id' });
    }
    console.log('Original shot kept on both colours.');
  }

  console.log(`\n${linked} colour(s) now photograph separately. Open /product/chiffon-veil and switch colour.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

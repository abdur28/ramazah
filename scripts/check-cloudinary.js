#!/usr/bin/env node
/**
 * Is Cloudinary configured, and do the credentials actually work?
 *
 *   npm run check-cloudinary
 *
 * Uploads a tiny generated image, reads it back, then deletes it — so a pass
 * means the whole round trip works, not just that three strings are present.
 * Nothing is left behind in the account.
 */
const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('No .env.local. Copy .env.example to .env.local first.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const NAME = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const KEY = env.CLOUDINARY_API_KEY;
const SECRET = env.CLOUDINARY_API_SECRET;

const missing = [
  ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', NAME],
  ['CLOUDINARY_API_KEY', KEY],
  ['CLOUDINARY_API_SECRET', SECRET],
].filter(([, value]) => !value);

if (missing.length > 0) {
  console.error('Not configured yet. Empty in .env.local:\n');
  missing.forEach(([name]) => console.error(`  ${name}`));
  console.error('\nFind all three on the Cloudinary dashboard under "API Keys".');
  process.exit(1);
}

console.log(`Cloud name: ${NAME}`);
console.log(`API key:    ${KEY.slice(0, 4)}…${KEY.slice(-3)}`);
console.log(`API secret: set (${SECRET.length} chars)\n`);

const { v2: cloudinary } = require('cloudinary');
cloudinary.config({ cloud_name: NAME, api_key: KEY, api_secret: SECRET, secure: true });

// A 1x1 PNG, so nothing has to exist on disk.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  let publicId;

  try {
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'ramazah/_healthcheck' }, (error, result) =>
          error ? reject(error) : resolve(result)
        )
        .end(PIXEL);
    });

    publicId = uploaded.public_id;
    console.log(`✓ upload works        ${publicId}`);

    // The URL the storefront would serve. next.config.ts already allows
    // res.cloudinary.com, so this is the shape <Image> will receive.
    const response = await fetch(uploaded.secure_url);
    console.log(
      response.ok
        ? `✓ the URL is public   ${response.status} ${response.headers.get('content-type')}`
        : `✗ the URL is NOT public — ${response.status}`
    );

    await cloudinary.uploader.destroy(publicId);
    console.log('✓ delete works        cleaned up');
    publicId = undefined;

    const usage = await cloudinary.api.usage();
    console.log(
      `\nPlan: ${usage.plan}. Storage ${(usage.storage.usage / 1024 / 1024).toFixed(1)}MB, ` +
        `${usage.resources} asset(s).`
    );
    console.log('\nCloudinary is ready — uploads from /admin/products will work.');
  } catch (error) {
    console.error(`\n✗ ${error?.message ?? error}`);
    if (/api_key|Invalid|401|Unknown API key/i.test(error?.message ?? '')) {
      console.error('  That reads like a wrong key or secret. Re-copy both from the dashboard.');
    }
    if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    process.exit(1);
  }
}

main();

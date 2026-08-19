// scripts/seed.js — applies supabase/seed.sql using DATABASE_URL from .env.local
const { spawnSync } = require('child_process');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/seed.sql'], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);

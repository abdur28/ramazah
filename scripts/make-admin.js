// scripts/make-admin.js
// Promote a user to admin. Run AFTER they have signed up through the app:
//   npm run make-admin -- you@example.com
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run make-admin -- you@example.com');
  process.exit(1);
}

(async () => {
  const admin = createClient(url, secret, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from('profiles')
    .update({ role: 'admin' })
    .ilike('email', email)
    .select('id, email, role');

  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error(`No account found for ${email}. Sign up through the app first.`);
    process.exit(1);
  }

  console.log(`✓ ${data[0].email} (${data[0].id}) is now an admin.`);
  console.log('  Sign out and back in to refresh the session.');
})();

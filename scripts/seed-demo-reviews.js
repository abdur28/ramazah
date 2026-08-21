/**
 * scripts/seed-demo-reviews.js — demo customers, delivered orders and reviews.
 *
 * Kept out of supabase/seed.sql on purpose: reviews hang off real auth users,
 * and auth users can only be created through the Auth API, not SQL. Everything
 * it writes is tagged so it can be removed again.
 *
 *   node scripts/seed-demo-reviews.js          seed
 *   node scripts/seed-demo-reviews.js --clean  remove every demo customer,
 *                                              order and review
 *
 * Uses the service key, so it writes past RLS. That is fine for seeding — the
 * policies themselves are exercised by the storefront and were verified
 * separately — but it does mean this script can do things a customer cannot.
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

/**
 * An ISO timestamp `n` days back, so seeded orders carry a plausible history
 * rather than all landing at the same instant. The dashboard's revenue trend
 * buckets by month and needs real dates to draw anything.
 */
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Every demo address ends in this, which is how --clean finds them. */
const DEMO_DOMAIN = '@demo.ramazah.test';

/**
 * One known password for every demo customer, so you can sign in as one and see
 * a populated account — orders, wishlist, review status. These accounts exist
 * only to make the UI reviewable; `--clean` removes them.
 */
const DEMO_PASSWORD = 'Ramazah-Demo-1!';

const customers = [
  { name: 'Aisha Bello', email: `aisha${DEMO_DOMAIN}`, phone: '08031000001' },
  { name: 'Hauwa Sani', email: `hauwa${DEMO_DOMAIN}`, phone: '08031000002' },
  { name: 'Ibrahim Musa', email: `ibrahim${DEMO_DOMAIN}`, phone: '08031000003' },
  { name: 'Zainab Yusuf', email: `zainab${DEMO_DOMAIN}`, phone: '08031000004' },
];

// Ratings are spread on purpose: a wall of fives reads as fake, and the
// distribution bars need something to draw.
const reviews = [
  { customer: 0, slug: 'egyptian-ground-coffee', rating: 5, status: 'approved',
    title: 'Ground exactly right',
    body: 'Asked for it ground and it arrived ground the way I would have done it myself. The cardamom is not shy. Second order already.' },
  { customer: 1, slug: 'egyptian-ground-coffee', rating: 4, status: 'approved',
    title: 'Very good, packaging could be tighter',
    body: 'Coffee is excellent and it kept its smell all the way. The bag arrived slightly open at one corner — nothing spilled, but worth a second seal.' },
  { customer: 2, slug: 'egyptian-ground-coffee', rating: 5, status: 'approved',
    title: null,
    body: 'Bought the 1kg whole bean for the office. Everyone has asked where it came from.' },
  { customer: 3, slug: 'chiffon-veil', rating: 5, status: 'approved',
    title: 'Sits well in the heat',
    body: 'Light enough for Lagos and it does not slip. The sand colour is exactly what is in the photograph, which I did not expect.' },
  { customer: 1, slug: 'chiffon-veil', rating: 4, status: 'approved',
    title: 'Good quality',
    body: 'Fabric feels far better than what I have bought locally at this price. Took three weeks, which was said upfront.' },
  { customer: 0, slug: 'medjool-dates', rating: 5, status: 'approved',
    title: 'Soft, fresh, not sugary',
    body: 'Properly soft dates with a long date on the pack. Finished the 500g in a week and went back for the kilo.' },
  { customer: 2, slug: 'ground-cumin', rating: 3, status: 'approved',
    title: 'Fresh, but I expected more for the price',
    body: 'The smell is much stronger than supermarket cumin, no complaint there. 100g goes quickly though — I would like a larger tin.' },
  { customer: 3, slug: 'brass-serving-tray', rating: 5, status: 'approved',
    title: 'Better in person',
    body: 'The engraving is deeper than it looks online and there were no dents. Wrapped very carefully.' },
  // One left waiting, so the moderation queue has something in it.
  { customer: 1, slug: 'black-seed-oil', rating: 4, status: 'pending',
    title: 'Good oil, strong smell',
    body: 'Does what it should. Be ready for the smell if you have not used black seed before.' },
];

async function clean() {
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const demoUsers = (users?.users ?? []).filter((user) => user.email?.endsWith(DEMO_DOMAIN));

  for (const user of demoUsers) {
    await supabase.from('reviews').delete().eq('user_id', user.id);
    await supabase.from('orders').delete().eq('user_id', user.id);
    await supabase.auth.admin.deleteUser(user.id);
  }

  console.log(`Removed ${demoUsers.length} demo customer(s) with their orders and reviews.`);
}

/**
 * A delivered order with no review attached, so the review flow can actually be
 * walked: sign in as this customer, open the product, and the form is there.
 * Every other demo order already has its review, which makes the form correctly
 * refuse to appear.
 */
const unreviewedPurchase = { customer: 0, slug: 'brass-lantern' };

/**
 * A deliberately long order, so the invoice's A4 pagination can be seen doing
 * its job: fourteen lines overflow one sheet, and one of them carries a
 * multi-line name like the real Ramazah invoices do.
 */
const longOrder = {
  customer: 0,
  orderNumber: 'RMZ-D1100',
  status: 'processing',
  lines: [
    { slug: 'egyptian-ground-coffee', name: 'Egyptian Ground Coffee (250g, ground · medium roast with cardamom)', qty: 3, price: 12500 },
    { slug: 'egyptian-ground-coffee', name: 'Egyptian Ground Coffee (1kg, whole bean)', qty: 1, price: 42000 },
    { slug: 'medjool-dates', name: 'Medjool Dates (500g)', qty: 4, price: 9500 },
    { slug: 'medjool-dates', name: 'Medjool Dates (1kg)', qty: 2, price: 17000 },
    { slug: 'ground-cumin', name: 'Ground Cumin (100g)', qty: 6, price: 3200 },
    { slug: 'black-seed-oil', name: 'Black Seed Oil (60ml, cold-pressed Nigella sativa, amber bottled)', qty: 2, price: 6500 },
    { slug: 'black-seed-oil', name: 'Black Seed Oil (120ml)', qty: 1, price: 11000 },
    { slug: 'chiffon-veil', name: 'Chiffon Veil (Black)', qty: 3, price: 8000 },
    { slug: 'chiffon-veil', name: 'Chiffon Veil (Sand)', qty: 2, price: 8000 },
    { slug: 'brass-serving-tray', name: 'Brass Serving Tray (hand-finished, large)', qty: 1, price: 27500 },
    { slug: 'brass-lantern', name: 'Brass Lantern (pierced, for a tealight)', qty: 2, price: 34000 },
    { slug: 'exercise-books-pack', name: 'Exercise Books, pack of 10 (A5 ruled)', qty: 5, price: 4800 },
    { slug: 'exercise-books-pack', name: 'Exercise Books, pack of 10 (A5 ruled · second term)', qty: 3, price: 4800 },
    { slug: 'ground-cumin', name: 'Ground Cumin (100g · restock)', qty: 4, price: 3200 },
  ],
};

async function seed() {
  await clean();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, product_variants ( id, sku ), product_images ( secure_url, is_primary )')
    .eq('status', 'active');

  const bySlug = new Map((products ?? []).map((product) => [product.slug, product]));

  // Create the customers.
  const ids = [];
  for (const customer of customers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: customer.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: customer.name },
    });
    if (error) throw new Error(`create ${customer.email}: ${error.message}`);
    ids.push(data.user.id);
  }
  console.log(`Created ${ids.length} demo customers — sign in as any of them:`);
  for (const customer of customers) console.log(`    ${customer.email}  /  ${DEMO_PASSWORD}`);

  // One delivered order per review, so every review is a verified purchase.
  let orderCount = 0;
  const orderItemFor = new Map();

  for (const [index, review] of reviews.entries()) {
    const product = bySlug.get(review.slug);
    if (!product) throw new Error(`No product ${review.slug}`);

    const variant = product.product_variants[0];
    const customer = customers[review.customer];
    const userId = ids[review.customer];
    const unitPrice = 10000;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: `RMZ-D${String(1000 + index)}`,
        status: 'delivered',
        // A delivered order that was never paid for is not a state this shop
        // can be in, and leaving it that way made every revenue figure in the
        // admin read zero once those figures started counting settled money
        // only. Delivered means paid, shipped and received.
        payment_status: 'paid',
        payment_method: 'Bank transfer',
        paid_at: daysAgo(30 - index),
        shipped_at: daysAgo(27 - index),
        delivered_at: daysAgo(24 - index),
        delivery_type: 'delivery',
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        subtotal: unitPrice,
        total: unitPrice,
      })
      .select('id')
      .single();
    if (orderError) throw new Error(`order: ${orderError.message}`);
    orderCount += 1;

    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        sku: variant.sku,
        // Order lines snapshot the image, so history survives a product change.
        image_url:
          (product.product_images ?? []).find((image) => image.is_primary)?.secure_url ??
          product.product_images?.[0]?.secure_url ??
          null,
        unit_price: unitPrice,
        quantity: 1,
        line_total: unitPrice,
      })
      .select('id')
      .single();
    if (itemError) throw new Error(`order item: ${itemError.message}`);

    orderItemFor.set(index, { itemId: item.id, productId: product.id, userId });
  }
  console.log(`Created ${orderCount} delivered orders.`);

  // The reviews themselves, dated over the past few weeks.
  for (const [index, review] of reviews.entries()) {
    const { itemId, productId, userId } = orderItemFor.get(index);
    const daysAgo = (reviews.length - index) * 3;

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      user_id: userId,
      order_item_id: itemId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
    if (error) throw new Error(`review: ${error.message}`);
  }

  // The eligible-but-unreviewed order.
  {
    const product = bySlug.get(unreviewedPurchase.slug);
    const variant = product.product_variants[0];
    const customer = customers[unreviewedPurchase.customer];
    const userId = ids[unreviewedPurchase.customer];

    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: 'RMZ-D1099',
        status: 'delivered',
        payment_status: 'paid',
        payment_method: 'Cash on delivery',
        paid_at: daysAgo(9),
        shipped_at: daysAgo(9),
        delivered_at: daysAgo(6),
        delivery_type: 'delivery',
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        subtotal: 34000,
        total: 34000,
      })
      .select('id')
      .single();

    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      variant_id: variant.id,
      name: product.name,
      sku: variant.sku,
      image_url:
        (product.product_images ?? []).find((image) => image.is_primary)?.secure_url ?? null,
      unit_price: 34000,
      quantity: 1,
      line_total: 34000,
    });

    console.log(`Left ${customer.name} a delivered ${product.name} with no review — the form will offer itself.`);
  }

  // The long order.
  {
    const customer = customers[longOrder.customer];
    const userId = ids[longOrder.customer];

    const subtotal = longOrder.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const taxRate = 0.075;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const shipping = subtotal >= 100000 ? 0 : 2500;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: longOrder.orderNumber,
        status: longOrder.status,
        // Being packed: the money is in, the goods have not left.
        payment_status: 'paid',
        payment_method: 'Bank transfer',
        paid_at: daysAgo(2),
        delivery_type: 'delivery',
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        ship_full_name: customer.name,
        ship_phone: customer.phone,
        ship_street: '14 Ahmadu Bello Way',
        ship_city: 'Kaduna',
        ship_state: 'Kaduna',
        ship_country: 'Nigeria',
        subtotal,
        tax_rate: taxRate,
        tax_amount: tax,
        shipping_cost: shipping,
        total: subtotal + tax + shipping,
      })
      .select('id')
      .single();
    if (error) throw new Error(`long order: ${error.message}`);

    for (const line of longOrder.lines) {
      const product = bySlug.get(line.slug);
      const variant = product.product_variants[0];

      const { error: lineError } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        variant_id: variant.id,
        name: line.name,
        sku: variant.sku,
        image_url:
          (product.product_images ?? []).find((image) => image.is_primary)?.secure_url ?? null,
        unit_price: line.price,
        quantity: line.qty,
        line_total: line.qty * line.price,
      });
      if (lineError) throw new Error(`long order line: ${lineError.message}`);
    }

    console.log(
      `Long order ${longOrder.orderNumber} for ${customer.name}: ${longOrder.lines.length} lines, ` +
        `subtotal ₦${subtotal.toLocaleString('en-NG')} — use it to test the invoice page break.`
    );
  }

  const approved = reviews.filter((review) => review.status === 'approved').length;
  console.log(`Wrote ${reviews.length} reviews — ${approved} approved, ${reviews.length - approved} pending.`);

  const { data: rated } = await supabase
    .from('products')
    .select('name, rating_avg, rating_count')
    .gt('rating_count', 0)
    .order('rating_count', { ascending: false });

  console.log('\nRatings now on the storefront:');
  for (const product of rated ?? []) {
    console.log(`  ${String(product.rating_avg).padStart(4)} ★  ${String(product.rating_count).padStart(2)} review(s)  ${product.name}`);
  }
}

const run = process.argv.includes('--clean') ? clean : seed;
run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

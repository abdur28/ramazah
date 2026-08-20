# Plan

Ramazah is a Nigeria-based general import store sourcing from Egypt — veils and
scarves, coffee and tea, beauty and personal care, dry foods, spices, kitchenware,
home decor, school supplies. It started as a copy of the
[hoodskool](https://github.com/abdur28/hoodskool) streetwear codebase, which shapes
what still needs replacing.

**Trading in NGN. No payment processing — orders and invoices only.**

---

## Done

**Backend migration — complete.** Firestore and Firebase Auth replaced by Supabase
(Postgres 17 + Auth + RLS). Next.js upgraded 15.5.4 → 16.3.1. Firebase fully removed.
See [PROGRESS.md](PROGRESS.md) for the log and
[database-design.md](database-design.md) for the schema and decisions.

**Storefront chrome — complete.** Navigation, search, cart and the menu sheet. One
navigation source in `constants/navigation.ts` replaces four hardcoded copies, and
`hoodhub.ru` is gone. Search actually searches (it used to 404), the cart quick-add bug
that blocked every generic-option product is fixed, and prices are formatted for
Naira.

---

## Next

### 1. Storefront content
The chrome is done; the **words and the pictures** are still hoodskool's:

- Copy across `components/home/` is streetwear: "STREET CULTURE REDEFINED",
  "JOIN THE HOOD", HOODIES / T-SHIRTS / JEANS, and links to `/clothings` and
  `/hoodhub` that resolve to nothing.
- The footer carries the same dead links, plus **Visa, Mastercard, PayPal and Apple
  Pay** — none of which exist, since there is no payment processing.
- The five email templates still greet customers as "the Hood".
- `public/` photography is still hoodskool's — the hero banners are studio shots of a
  model in a HOOD hoodie. They are referenced by `Hero.tsx` and the home sections, so
  they go when the content pass replaces those sections, not before.

### 2. Admin product form
The data layer writes the generic option model, but the form still only understands
`size` and `color`. Until it is rebuilt you cannot create a
"Weight: 250g / Grind: Ground" product through the UI — only via SQL. Also needs
expiry-date entry for perishables. This is a UI rebuild, not a port.

### 3. Product pages and filters
Size filters and size guides do not fit coffee and spices. Filtering should move to
the generic options plus tags, using `product_listing` and `search_product_ids()`.

`ProductCard`'s quick-add dialog is part of this: it only speaks Size and Colour, so a
product on the generic option model routes to the product page instead of choosing in
place. Deliberate, but it is the same rebuild.

**A search results page** would also belong here. Search currently lives entirely in
the dialog, which shows the top six matches and asks you to refine.

### 4. Google sign-in
Currently an unconfigured button that returns a raw `400`. Either enable the provider
(Google Cloud OAuth client → Supabase → URL Configuration) or hide it.

### 5. Deployment
Vercel. Needs the Supabase env vars, a production Site URL and redirect allowlist, and
real values for `FREE_SHIPPING_THRESHOLD` / `STANDARD_SHIPPING` (currently placeholder
Naira amounts).

---

## Later

- **VAT and invoicing** — to be built properly, not hardcoded. `TAX_RATE` is currently
  a constant (0.075); `orders.tax_rate` already records the rate applied per order so
  historical orders stay correct.
- **Payments** — a Nigerian PSP when the time comes. `orders` already carries
  `payment_status`, `payment_method` and `payment_intent_id`.
- **Expo mobile app** — the architecture already supports it: RLS plus RPCs mean the
  mobile client reuses the same API with no bespoke backend.
- **Tremor replacement** — `@tremor/react` is React 18-only and forces
  `legacy-peer-deps=true`. Used in 5 admin analytics files.
- **Navigation from the database** — `constants/navigation.ts` is curated, so a
  category added in admin needs a line there. Worth revisiting when the catalog stops
  changing shape; the labels and order would still need somewhere to live.
- **Rounding display** — Naira prices drop kobo, so a cart's displayed parts can sum
  ₦1 off its displayed total. Harmless until invoices exist; not once they do.

## Deliberately not doing

Batch/lot tracking · multi-warehouse · a tax engine · audit trails on every table ·
coupon stacking rules · a monorepo. All revisitable; none justified at current scale.

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

---

## Next

### 1. Storefront content and navigation
The highest-visibility problem. Colours, type and the brand lockup are done; the
**words** are still hoodskool's:

- Navigation is **hardcoded in four files** (`Hero.tsx`, `DesktopNavigation.tsx`,
  `MobileSearch.tsx`, `Footer.tsx`) with the old categories — and
  `DesktopNavigation.tsx` links to **`hoodhub.ru`**, a live external site belonging to
  the previous brand. Point these at `getAllCategories()`.
- Copy across `components/home/` is streetwear: "STREET CULTURE REDEFINED",
  "JOIN THE HOOD", HOODIES / T-SHIRTS / JEANS.
- The footer advertises **Visa, Mastercard, PayPal and Apple Pay** — none of which
  exist, since there is no payment processing.
- `public/` photography is still hoodskool's — the hero banners, `DSC*.jpg` and the
  catalog shots. They are still referenced by components, so they go when the content
  pass replaces those sections, not before.

### 2. Admin product form
The data layer writes the generic option model, but the form still only understands
`size` and `color`. Until it is rebuilt you cannot create a
"Weight: 250g / Grind: Ground" product through the UI — only via SQL. Also needs
expiry-date entry for perishables. This is a UI rebuild, not a port.

### 3. Product pages and filters
Size filters and size guides do not fit coffee and spices. Filtering should move to
the generic options plus tags, using `product_listing` and `search_product_ids()`.

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

## Deliberately not doing

Batch/lot tracking · multi-warehouse · a tax engine · audit trails on every table ·
coupon stacking rules · a monorepo. All revisitable; none justified at current scale.

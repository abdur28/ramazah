# Ramazah — Database Design

Postgres 17 on Supabase. Supersedes the Firestore model inherited from hoodskool.

## Context

Nigeria-based **general import business**, sourcing from Egypt — veils and scarves,
coffee and tea, beauty, personal care, dry foods, spices, kitchenware, home decor and
school supplies. Not an apparel store. Trades in **NGN** today; the
schema is multi-currency capable (USD/EGP are rows, not migrations). Orders and
invoices only — **no payment processing** in this phase. Solo maintainer, launching
scale. A future Expo (React Native) app is a first-class client.

## Assumptions

1. No production data existed — this is a greenfield schema, not a data migration.
2. Deployed on Vercel; runtime traffic goes through PostgREST, not a pooled ORM connection.
3. `DATABASE_URL` (direct connection) is for migrations only.
4. Roles are `user` / `admin`; no staff tier.
5. Cloudinary remains the image store; only public_id/URLs live in Postgres.
6. VAT and invoicing are deferred and will not be hardcoded; `orders.tax_rate`
   records the rate applied so future work has correct history.

## Decisions

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| 1 | Relational DB now | Stay on Firestore | No data or users yet — cheapest moment. Price/colour/size/search filters already ran in memory, breaking pagination |
| 2 | Supabase (Postgres) | Appwrite, Neon + separate auth, Medusa | Real Postgres = the "structured" goal; ACID for stock; RLS; portable. Appwrite's self-host edge was moot given managed preference; Medusa would discard the existing admin dashboard |
| 3 | Scope = DB + Auth; keep Cloudinary | DB only; full platform move | Consolidates two providers; Cloudinary's pipeline beats both alternatives |
| 4 | Logic in DB (RLS + RPC), thin Next.js API | Logic in route handlers | The Expo app reuses it directly; no bespoke mobile API to maintain |
| 5 | Variants own stock and price | Duplicate on product | Product-level copies drift; `in_stock` is a generated column and cannot |
| 5a | Generic `product_options` / `product_option_values` / `variant_option_values` | Fixed `size` + `color_id` columns | A general importer needs *Weight: 250g*, *Grind: Ground*, *Shade: 03* and *Colour* in one model. Colour swatches survive via an optional `hex` on option values |
| 5b | `is_perishable` + `expiry_date` on variants | Full batch/lot tracking | Coffee, tea, spices and dry food expire; `create_order()` refuses expired stock. Batch tracking rejected as too heavy for small scale |
| 6 | Prices as rows keyed by currency | `jsonb` array | Adding USD/EGP = inserts, not a migration |
| 7 | `numeric(12,2)` for money | float / integer minor units | Exact; no payment provider requires minor units yet |
| 8 | Categories via `parent_id` + maintained `path` | Path string only | Real hierarchy, and existing URL routing still works |
| 9 | `order_items` snapshot name/sku/price/image | Join to live product | An order must show what was bought at that price, forever |
| 10 | `orders.user_id NOT NULL` | Nullable for guests | Registration required before ordering |
| 11 | Order numbers from a sequence (`RMZ-01000`) | `HS`+timestamp | Timestamps collide; `HS` was hoodskool |
| 12 | Reviews require a purchase (FK to `order_item`) | Open reviews + moderation | Spam becomes structurally impossible, not a moderation chore |
| 13 | Trigger-maintained `rating_avg` / `helpful_count` | Aggregate per query | Keeps listings and sort-by-rating cheap |
| 14 | Postgres FTS (`tsvector` + GIN) | Meilisearch / Algolia | Removes the in-memory search defect with no extra service |
| 15 | Product `status`, never hard delete | Delete rows | Protects order history from dangling references |
| 16 | Append-only `inventory_movements` | Bare `stock_count` | Every change traceable with reason and actor |
| 17 | `timestamptz` + `updated_at` triggers | Manual timestamps | Triggers cannot be forgotten; Egypt sourcing makes TZ real |
| 18 | Idempotency key on orders | None | Double-submit returns the original order |
| 19 | Deferred: multi-warehouse, tax engine, audit trails | Build now | Out of scope this phase |
| 20 | No NAFDAC field | Store registration numbers | Explicitly out of scope — small-scale operation |
| 21 | Six top-level categories, Food & Pantry with three children | Nine flat categories | Beauty and Personal Care merged — the boundary (soap? shampoo? lotion?) cannot be stated in one sentence, and two vague categories beat one clear one only in theory. Food grouped because half the catalog is food. Renamed for shopper language: "Cooking (Dry Food)" → Dry Foods, "School Supplies" → School & Stationery (sells year-round) |
| 22 | Tags, not deeper nesting, for fine slicing | Sub-sub-categories | `products.tags[]` is already GIN-indexed; a launching catalog cannot fill third-level pages without them looking broken |
| 23 | No batch/lot tracking | `product_batches` with FEFO allocation | Small importer selling through one lot before the next lands. `inventory_movements.note` records expiry and supplier on restock, giving most of the traceability for no extra schema. Revisit when overlapping lots become normal |

## Structure

**Identity** — `profiles` (extends `auth.users`, populated by trigger), `addresses`

**Catalog** — `categories`, `collections`, `products`, `product_images`,
`product_variants`, `product_options`, `product_option_values`,
`variant_option_values`, `variant_images`, `product_prices`

Every product has at least one variant; products without options get a single default
variant, so price and stock always live in exactly one place.

**Commerce** — `cart_items`, `wishlist_items`, `orders`, `order_items`,
`order_status_history`, `discount_codes`, `discount_redemptions`

**Reviews** — `reviews`, `review_images`, `review_votes`, `review_replies`

**Inventory** — `inventory_movements` (append-only)

**Categories** — Veils & Scarves · Food & Pantry (Coffee & Tea, Spices & Condiments,
Dry Foods) · Beauty & Personal Care · Kitchen & Dining · Home & Decor · School &
Stationery

## Security

RLS is the security boundary for **both** web and mobile — layout guards like
`requireAdmin()` are UX only, since a mobile client never executes them.

- `public.is_admin()` is `SECURITY DEFINER` to avoid recursion in `profiles` policies.
- Catalog is world-readable only where `status = 'active'`; admins see drafts.
- `cart_items`, `wishlist_items`, `addresses`, `orders` are owner-scoped.
- `inventory_movements` and `discount_codes` are admin-only and never publicly exposed.
- Reviews are public only when `approved`; inserts require a matching delivered/shipped order.
- **No INSERT policy on `orders`** — orders can only be created through `create_order()`.
- Table privileges are granted explicitly, since "automatically expose new tables" is off.

## `create_order()`

One `SECURITY DEFINER` transaction: locks variants `FOR UPDATE` → validates stock →
reads prices **from the database, never the client** → refuses expired perishables →
validates the discount code
(window, minimum, global and per-user limits) → inserts order and items → decrements
stock → writes ledger rows → records redemption → clears the purchased items from the
cart. All or nothing.

Interim: `p_shipping_cost` and `p_tax_amount` are passed in, because no tax/shipping
configuration exists yet. Revisit when the VAT system is built.

## Verified

Applied to `ramazah-store` and exercised end-to-end in rolled-back transactions:
profile auto-creation, category path triggers, generated `in_stock`, order placement
with a percentage discount, stock decrement, ledger writes, status history, atomic cart
clearing, redemption recording, idempotent replay, oversell rejection, and rating
aggregation. Re-verified after the catalog rework with a two-axis coffee product
(`250g / Ground`), a colour-swatch veil, a mixed two-line order, and refusal of expired
perishable stock.

**24 tables, 8 enums, 41 policies, 23 triggers, RLS on every table.**
Category tree seeded (6 top-level + 3 children); seed re-run verified idempotent.

Note: `drop schema public cascade` also removes Supabase's `ensure_rls` event trigger,
so `20260819000000_rls_auto_enable.sql` recreates it.

## Auth (ported)

Firebase Auth is gone. Supabase Auth issues JWTs, stored in cookies on web via
`@supabase/ssr` and in secure storage on a future Expo client — one auth system, two
storage mechanisms.

- `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) refreshes the session on
  every request via `lib/supabase/proxy.ts`, and redirects unauthenticated visitors
  away from `/dashboard`, `/admin`, `/checkout`. This is UX; RLS is the security.
- `lib/supabase/auth.ts` is a drop-in replacement for the old Firebase surface
  (signUp, signIn, signInWithGoogle, resetPassword, updateUserProfile, ...).
- `app/auth/callback/route.ts` exchanges OAuth / email-confirmation codes, rejecting
  non-relative redirect targets.
- Account deletion runs through `app/api/auth/delete-account/route.ts`, which verifies
  the session server-side before using the privileged client. Customers with order
  history cannot be deleted (`orders.user_id` is ON DELETE RESTRICT).

### Column privileges (security-critical)

RLS restricts which *rows* a user may write, not which *columns*. Two real
vulnerabilities were found by testing and fixed in
`20260819000005_column_privileges.sql`:

- A user could `update profiles set role='admin'` on their own row.
- A user could insert a review with `status='approved'`, bypassing moderation.

`authenticated` now holds column-scoped grants, and privileged writes go through
`set_user_role()`, `set_user_status()` and `set_review_status()` — SECURITY DEFINER
functions that check `is_admin()`.

`service_role` also needed explicit table grants; without them every privileged
server-side operation failed with "permission denied".

## Catalog data layer (ported)

`lib/products.ts` now runs entirely on Supabase. `product_listing`
(`20260819000006`) exposes variant-derived aggregates — `total_stock`, `in_stock`,
`min_price`, `max_price`, `category_path` — so filtering, sorting and pagination
happen in SQL. The in-memory filtering that motivated this migration is gone.
Search goes through `search_product_ids()` (ranked `tsvector`), not a `LIKE` scan.

Products are read in two steps: filter against the view for correct pagination, then
hydrate the matching ids with nested relations. `Product` gained `options`, and
`ProductVariant` gained `label` / `options` / `expiryDate`; `sizes` and `colors` remain
as derived legacy fields so the streetwear UI keeps compiling until it is redesigned.

`getCategoryByPath()` accepts either a stored display path or a URL slug path,
resolving slug paths by their last segment. The old `pathToDisplayPath()` could not
round-trip — `coffee-tea` can never yield `Coffee & Tea`.

`supabase/seed.sql` holds a small sample catalog exercising multi-axis options
(coffee: Weight × Grind), colour swatches (veil), perishables with expiry, and an
option-less product with a single default variant.

## Orders (ported)

`lib/orders.ts` runs on Supabase. `createOrder()` calls the `create_order()` RPC
rather than inserting rows, so stock validation, DB-side pricing, expiry refusal,
discounts, the inventory ledger and cart clearing all happen in one transaction.
There is deliberately no INSERT policy on `orders` — the RPC is the only way in.

`OrderItem` gained `variantLabel` and `options`, snapshotting the variant at purchase
time ("Egyptian Ground Coffee — 250g / Ground"). `deliveryType` maps between the TS
`inStore` and the DB `in_store`.

Category URLs are built from slugs, not the stored display path —
`generateStaticParams` emits `/categories/food-pantry/coffee-tea`, since
"Food & Pantry > Coffee & Tea" is a display string and not URL-safe.

## Admin dashboard (ported) — Firebase fully removed

All seven `hooks/admin/*` stores run on Supabase. Their zustand shapes are unchanged,
so the admin components were untouched; only the query internals moved. Firestore
cursor pagination became `range()` offsets (`pagination.*.lastDoc` now holds a number).

- **Users** — `profiles`. Role and status changes go through `set_user_role()` and
  `set_user_status()`, because those columns are not grantable to `authenticated`.
  Account deletion goes through `/api/admin/users/[id]`, which verifies the caller is
  an admin before using the privileged client.
- **Products** — writes the option model. The admin form still describes variants with
  `size`/`color`, which `writeVariants()` translates into options named "Size" and
  "Colour"; a variant may also carry `options` directly, which is how arbitrary axes
  (Weight, Grind, Shade) will arrive once the form is rebuilt. `deleteProduct` sets
  `status = 'archived'` instead of deleting, so order history keeps its references.
- **Categories** — `path` is trigger-maintained, so it is never written directly.
  Deletes surface a clear message on `23503`, since `parent_id` and
  `products.category_id` are ON DELETE RESTRICT.
- **Analytics** — reads `product_listing` for stock and price aggregates; the
  calculation logic is untouched, fed by loaders that map rows to camelCase.
- **Mailer** — recipient filtering uses a jsonb path
  (`preferences->emailNotifications->>promotions`). The campaigns feature was always a
  stub and remains one; there is no campaigns table.

`lib/firebase/` is deleted, `firebase` and `firebase-admin` are uninstalled, the
Firebase env vars are gone from `.env.example`, and `lib/seed-products.js` is replaced
by `supabase/seed.sql` (`npm run seed`). `lib/firebase/config.ts` is a temporary shim whose initialisation is
guarded so importing it cannot take down pages that never query Firestore — delete it
when the port completes. Reseeding (`lib/seed-products.js`) is also outstanding.

`TAX_RATE` is now 0.075 (Nigerian VAT) but remains hardcoded pending the VAT/invoice
system. `FREE_SHIPPING_THRESHOLD` and `STANDARD_SHIPPING` are **placeholder Naira
values** (₦100,000 / ₦2,500) — they were 100 and 10 on a USD scale, which would have
made every order ship free.

The storefront UI is also still hoodskool's streetwear design — size filters, size
guides, `ArtShowcase`, skull cursor. A coffee-and-spices catalog needs different product
pages and filters, which is larger than the original "rebrand only" plan assumed.

The storefront UI is also still hoodskool's streetwear design — size filters, size
guides, `ArtShowcase`, skull cursor. A coffee-and-spices catalog needs different product
pages and filters, which is larger than the original "rebrand only" plan assumed.

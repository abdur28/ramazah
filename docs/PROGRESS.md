# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-19 — Firebase removed entirely

All seven `hooks/admin/*` stores ported to Supabase. Their zustand shapes are unchanged,
so admin components were untouched; only query internals moved. Firestore cursor
pagination became `range()` offsets (`pagination.*.lastDoc` now holds a number).

- **Users** — role/status go through `set_user_role()` / `set_user_status()`, since
  those columns are not grantable to `authenticated`. Deletion via
  `/api/admin/users/[id]`, which verifies admin server-side.
- **Products** — `writeVariants()` translates the form's `size`/`color` into the
  option model, and accepts `options` directly. `deleteProduct` archives.
- **Categories** — `path` is trigger-maintained; FK violations get a readable message.
- **Analytics** — reads `product_listing`; calculation logic untouched.
- **Mailer** — jsonb path filtering. Campaigns remain a stub (no table).

Deleted `lib/firebase/`, uninstalled `firebase` + `firebase-admin`, stripped Firebase
env vars, replaced `lib/seed-products.js` with `supabase/seed.sql`.

**Verified:** 10/10 admin checks as a real admin user. Typecheck clean, production build
passes, all smoke-tested routes 200 with zero errors.

## 2026-08-19 — Orders ported

`lib/orders.ts` on Supabase. `createOrder()` calls the atomic `create_order()` RPC
rather than inserting rows. `OrderItem` gained `variantLabel` / `options`.

**Verified:** 12/12 — order `RMZ-01001`, subtotal priced from the DB, stock decremented,
ledger written, cart cleared atomically, RLS isolation between customers, non-admin
blocked from status changes, idempotent replay.

**Fixed:** `generateStaticParams` was emitting `/categories/Veils & Scarves` — the
display path as a URL — and omitting every child category. Now slug-based, 9 routes.

## 2026-08-19 — Catalog ported

`lib/products.ts` on Supabase. Added `product_listing` (variant-derived `total_stock`,
`in_stock`, `min_price`) so filtering, sorting and pagination happen in SQL — the
in-memory filtering that motivated the migration is gone. Search via ranked `tsvector`.

**Fixed:** `pathToDisplayPath()` reconstructed category names from slugs, which cannot
round-trip (`coffee-tea` never yields `Coffee & Tea`). Categories now resolve by slug.

**Verified:** 10/10 anonymous read-path checks, including SQL price filtering and
full-text search.

## 2026-08-19 — Auth ported · Next.js 16

Next.js 15.5.4 → 16.3.1; `middleware.ts` → `proxy.ts` via the official codemod.
Firebase Auth replaced by Supabase Auth (JWTs, so the same model works for Expo).

**Two security holes found by testing and fixed:**
- A user could `update profiles set role='admin'` on their own row. RLS restricts rows,
  not columns.
- A user could insert a review with `status='approved'`, bypassing moderation.

Both closed with column-level grants plus admin-only `SECURITY DEFINER` RPCs.
`service_role` also needed explicit table grants — without them every privileged
server-side operation failed.

**Also fixed:** signup called `refetch()` before a session existed (email confirmation
returns no session), so profile and wishlist queries ran as `anon` and were denied.
Default preferences moved into the signup trigger.

## 2026-08-19 — Schema

24 tables, 8 enums, 41 policies, 23 triggers, RLS on every table. Catalog reworked from
apparel (`size` + `color`) to a generic option model after the business turned out to be
general import, not clothing. Perishables carry `is_perishable` + `expiry_date`, and
`create_order()` refuses expired stock. Category tree seeded: 6 top-level, 3 children.

## 2026-08-18 — Supabase setup

Project provisioned. Client helpers, env wiring, connectivity verified.

**Fixed:** `npm run seed` never loaded env vars; no path existed to become an admin on a
fresh database (`scripts/make-admin.js`); `.npmrc` records the `legacy-peer-deps`
requirement that `@tremor/react` forces — without it a clean install, including on
Vercel, fails.

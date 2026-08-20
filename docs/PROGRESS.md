# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-20 — Brand lockup, icons, mobile menu

**Brand mark.** `components/brand/BrandMark.tsx` renders the supplied artwork —
`ramazah-store-icon.png` and `ramazah-store-name.png` — recoloured with CSS masks.
Both files are white on transparent, so the alpha channel becomes a stencil and
`background-color` fills it: the artwork stays pixel-exact while still taking any brand
colour. Two variants, `default` (sage-deep icon, ink wordmark) and `inverse` (both
cream) for the hero and footer. Wired into both navbars and the footer.

Two dead ends worth recording:

- The supplied `ramazah-store-icon.svg` cannot be recoloured. It is a traced bitmap —
  95 filled paths, `stroke="none"` on every one, 28 near-white anti-aliasing fills, and
  a first path covering the whole canvas, so it is neither strokeable nor transparent.
- Redrawing the mark as line art was rejected — twice. The lesson: **use the client's
  artwork, do not approximate it.**

The wordmark is an image rather than live text because its face is a very thin
geometric sans (closest to Avenir Ultra-Light) with no webfont equivalent; Futura and
Jost were both compared side by side and neither matches. A visually hidden
"Ramazah Store" plus an `aria-label` keeps the name available to search and screen
readers.

**Icons.** lucide ships at `stroke-width: 2`, heavy beside a hairline logo. One rule in
`@layer base` — `.lucide { stroke-width: 1.5 }` — lightens all 36, with deliberate
`[stroke-width:3]` overrides still winning.

**Mobile menu** now opens from the right in both navbars, with `shadow-2xl` for edge
separation. Its heading was `font-heading text-lg` — Cormorant 300 at 18px, exactly what
the type rule forbids — and is now Jost, uppercase and letterspaced. Borders moved to
the `rule` token; the backdrop softened to 40% with a slight blur.

**Cleanup.** Removed 5 unused UI components (`alert`, `progress`, `scroll-area`,
`sheet`, `sonner` — the last never used, since `layout.tsx` imports `Toaster` straight
from the package), 7 unreferenced assets including the Next.js starter SVGs, a dead
`logoUrl` in `lib/email.ts`, and 2 now-orphaned Radix packages.

`ramazah-store-icon.svg` and `ramazah-store-logo.svg` were left in place: unreferenced,
but untracked in git and therefore unrecoverable if deleted.

## 2026-08-19 — Design system foundation

Direction chosen: **follow the logo** (see [design-system.md](design-system.md) for the
palette, type scale and decision log).

- Palette and type tokens replace the zero-chroma shadcn greyscale in `globals.css`.
  The shadcn token *names* are kept and re-pointed at the Ramazah palette, so all 86
  components keep working; brand tokens (`--sage`, `--terra`, `--ink-muted`, …) are
  added alongside.
- Fonts: **Cormorant Garamond** (display, never below 28px) + **Jost** (interface),
  self-hosted via `next/font`. Bebas Neue, Inter and `Slugger-Monogram.otf` removed.
- Resolved the font conflict where `--font-heading` pointed at Bebas while
  `.font-heading` pointed at Slugger.
- Removed the global **skull cursor**, the full-page **skull watermark** rendered on
  every page at 2.5% opacity, and `public/skull*.svg`.
- Dark mode removed — the `.dark` block, `next-themes`, and the `useTheme()` call in
  `sonner.tsx` that had no provider mounted.
- Page metadata was still "Ramazah - Urban Streetwear"; now describes the actual shop.
- Radius 0.625rem → 0.25rem.

**Verified:** all palette tokens present in served CSS, zero `oklch` greyscale, zero
skull references, production ships only Cormorant and Jost. Typecheck clean, build
passes, home 200.

### Migration (same day)

All **549** hardcoded colour utilities across **65 files** replaced with tokens, mapped
by meaning rather than by find-and-replace: `black` → `foreground`, `white` → `card` for
surfaces and `background` for text, greys → `wash` / `rule` / `ink-muted`, and the
semantic families → `destructive` / `success` / `warning`. Opacity modifiers and variant
prefixes preserved. The 41 dead `dark:` variants were removed.

**Emails rebranded too.** All five templates ran on black bars with hoodskool's acid
yellow `#f8e231`; they now use the sage palette. The Cloudinary skull watermark and the
hoodskool logo image are gone — replaced by a letterspaced text wordmark, so no asset
hosting is needed and nothing can 404 in a customer's inbox.

**A contrast check caught three real defects** introduced by the recolour, including
white text on a cream ground in `promotions.html` (1.05:1) — caused by a heuristic that
flipped button labels in any rule *containing* sage, including where sage was only a
border. Repaired by keying on the actual background. All email colour pairs now pass AA.

**The yellow that hid.** A further **136 occurrences** of hoodskool's acid yellow lived
in *arbitrary* Tailwind values — `bg-[#F8E231]`, `border-[#F8E231]`, `ring-[#F8E231]` —
across 31 files. A colour-family search cannot see those; they were only found by
sweeping for `-[#hex]` patterns. Two tokens were added to replace them accessibly:
`--sage-light` (#A3AB8C, 5.78:1 on ink) for accent text on dark surfaces, and
`--terra-deep` (#AB5E3A, 4.54:1) for badge backgrounds with light labels.

**Total: 685 hardcoded colour values replaced.**

**Verified:** typecheck clean, production build passes, routes 200 with zero errors,
zero raw colour utilities, zero arbitrary hex, zero `dark:` variants, and no trace of
`F8E231` in the served CSS.

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

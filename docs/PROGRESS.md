# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-20 — Navigation, search, cart

The storefront chrome, redesigned end to end. Colour and type were already done; this
was structure, wording and the links themselves.

**Navigation had four hardcoded copies** — `Hero.tsx`, `DesktopNavigation.tsx`,
`MobileMenu.tsx`, `MobileSearch.tsx` — which is how `hoodhub.ru`, the previous brand's
live site, survived the rebrand in two of them. All four now read
`constants/navigation.ts`, and the hero's copy is deleted outright: the landing page was
using six drop-in links *as* the site's navigation.

It is a curated constant rather than `getAllCategories()`, which is what
[PLAN.md](PLAN.md) called for. The bar needs shorter labels than the table carries
("Beauty", not "Beauty & Personal Care") and a fixed order; the full names still show on
the category pages and in the sheets. Cost: a category added in admin needs a line here.
Every href was diffed against the built routes — all 9 category pages plus `/contact`
resolve.

**Seven labels plus the lockup and the icons do not fit at `md`**, so the
desktop/mobile switch moved `md` → `lg`. 768–1023px now gets the menu button.

**The home navbar shows its links the whole way down.** Navigation and the menu button
used to appear only once the hero had scrolled past, so the landing screen offered no
way into the shop at all. It stays transparent over the hero — a cream scrim was tried
and rejected — with the dark lockup rather than `inverse`, because the hero photography
is light. If the eventual Ramazah hero art is dark, that flips back in two lines.

**Search was rebuilt as a dialog** (`SearchDialog.tsx`, replacing `MobileSearch.tsx`,
which the desktop navbar also opened). Top-anchored, full screen on mobile, and it
**searches as you type** — 250ms debounce into `search_product_ids()`, so ranking stays
in Postgres — with product rows, keyboard navigation, and a stale-response guard. It
previously submitted to `/search?q=`, a route that has never existed, so **every search
404'd**. Enter now opens the highlighted result and nothing links to `/search`.

Checking the trending chips against the real catalog caught the same class of problem:
half of them ("Hibiscus tea", "Dates", "Incense") matched nothing, and a chip that finds
nothing reads as a broken search. The list is now four terms verified to hit.

**Cart interior rebuilt.** Progress bar to free shipping, per-row pending state instead
of a full-panel blur on every quantity tick, checkout moved to `bg-sage-deep` per rule 1,
and out-of-stock lines disable checkout with the reason — `create_order()` would have
rejected the order anyway, opaquely. Its empty state pointed at `/clothings`, a
hoodskool route; "Continue shopping" is now a dismissal, since the sheet sits over the
page you were already on.

**A live bug, found by the client testing the page.** Quick-add from a product card
raised `Missing variant`. `cart_items` keys on `variant_id`, but `addToCartDirect()`
never set one, and the card only opened its variant dialog for products with legacy
`sizes`/`colors` — so **every product on the generic option model failed to add while
signed in**. Signed out it appeared to work and wrote a variant-less line that would
have failed at sync. Fixed by resolving the variant: one variant quick-adds, Size/Colour
opens the dialog, generic options route to the product page, where the real axes render.

`addItem` returned `void` and swallowed the failure into `console.error`, which is why
this looked like a dead button rather than an error; it now returns `{ error }` and both
call sites raise a toast. `CartItem` gained `variantLabel`, mapped in `mapCartRow`, so a
cart line finally reads "1kg / Whole bean".

**Prices were unformatted** — `₦100000.00`, ungrouped and quoting a subunit nobody
prices in. `formatPrice` now groups and drops kobo on Naira, with the locale pinned so
the server and browser render the same string. Note: VAT creates fractions, so displayed
parts can sum ₦1 off the displayed total.

**Menu sheet redesigned** into labelled sections (Home · Shop · Account · Contact), on
the floating panel the cart and search dialog use. Account is auth-aware — identity plus
Orders, Wishlist, Sign out, and Admin when `isAdmin`; signed out it asks for the account
instead of listing four pages that all bounce to the login form. Dead links removed
along the way: `/orders` and `/faq` never existed.

**Verified:** typecheck and production build clean; every nav href resolves to a built
route; search tested against the live database as an anonymous user; add-to-cart tested
end to end as a real signed-in user (temporary account, created and deleted) — insert
under RLS, correct label, price and stock read back.

Still hoodskool, and next: `components/home/` (HOODIES/T-SHIRTS/JEANS, "STREET CULTURE
REDEFINED", "Join Hoodhub"), the footer (`/clothings`, "JOIN THE HOOD", and a
Visa/Mastercard/PayPal row for payments that are not processed), the five email
templates, and everything in `public/`.

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

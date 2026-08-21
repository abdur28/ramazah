# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-21 — Home page, product page, reviews, account area

The storefront redesigned section by section against the client's own direction,
plus three features the database already supported and nothing exposed.

**Home page rebuilt.** Editorial bands for the two lead categories, a weighted
twelve-column table for all six, a product rail, one story band and a newsletter
close. Structural notes worth keeping:

- The category table **pins while the rail scrolls over it**. A sticky block has to
  fit one screen or it can never show its own bottom, so the section is `100svh`
  with its rows as fractions of what is left — `svh` rather than `vh` because mobile
  browsers measure `vh` against the largest viewport, which is taller than the screen
  for most of a scroll.
- The rail needed `relative z-10` to ride over it: a sticky element is *positioned*,
  so it paints above ordinary siblings whatever the DOM order says.
- The navbar's transparent → solid switch watched the hero, and **the hero is
  sticky** — it never stops intersecting, so the bar only changed at the footer. It
  now watches a marker at the hero's end, testing `boundingClientRect.top` rather
  than `isIntersecting`, since a marker below the fold is also "not intersecting".

**Photography.** All eight hoodskool images deleted, including the three the login,
signup and reset pages each carried their own copy of. Replaced by
`constants/demo.ts` — Unsplash placeholders chosen by eye against the palette, one
module to swap for Cloudinary later. `supabase/seed.sql` pointed every product at
`/DSC09599.jpg`, so **every product image on the site was a 404**; the seed now
assigns one per product and the live rows were repointed.

**Footer** rebuilt: it linked nine routes that were never built. Those pages now
exist — FAQ, Shipping, Returns, Privacy, Terms, Cookies — written from facts where
facts exist, and saying plainly that the policy is being finalised where only the
client can write it. Legal text is not invented. The subscribe form called
`console.log` and then said "Subscribed!"; it now writes to `newsletter_subscribers`,
where anonymous visitors may insert and nothing else — reading the list back is
blocked, so the form cannot double as an address dump.

**Product page.** `VariantSelector` rendered exactly two controls, Size and Colour,
which is the shape of an apparel shop — so coffee (Weight × Grind), oil (Size) and
dates (Weight) **had no axes on screen at all**. It now renders one row per option
from `product.options`, which `mapProduct()` has always derived, with cross-axis
availability: picking 250g correctly greys out a grind that only exists in 1kg.

Every page also told customers **"Free shipping on orders over $100 · 30-day returns
and exchanges"**, and the details accordion carried eight more bullets of invented
policy in dollars. Replaced with the real terms, linking to the pages above.
Breadcrumbs linked every category to `/clothings`; they now resolve the real
hierarchy server-side. Related products added, and the details panel finally shows
the selected variant's expiry date, weight, option label and its own SKU.

**Reviews — built end to end.** The schema was already complete and secured; nothing
in the UI read it. Added the display, the form (verified purchasers only, which the
insert policy enforces), `/dashboard/reviews` so an author can see their moderation
status, and `/admin/reviews`, without which the queue could never be drained.

One migration was needed: `profiles` is readable only by its owner, so a review could
not show its author. `review_public` exposes the display name and the verified flag
**for approved rows only** — no email, no phone, no role, no user_id.

**Account area redesigned**, and six things added:

| | |
|---|---|
| Order tracking | `order_status_history` is trigger-written and was displayed nowhere |
| Reorder | Re-priced from today's catalog, never from the order |
| Invoices | Printable A4, matching the client's own printed template |
| Address book | `addresses` always allowed several; Settings edited one |
| Your reviews | Moderation status, so a review never just disappears |
| Requests | `product_requests` — the sourcing service, off WhatsApp at last |

The Settings address form was removed rather than left beside the book: the two
disagreed about the model, and saving in Settings would silently overwrite whichever
address happened to be default.

**The invoice** is the payment instrument — there is no card checkout — and now
matches the printed original: amber band, cart with its shadow, rounded white heading
bar on a pale green page, totals in green. Printing notes, all of which cost a
round trip to learn:

- Browsers **drop background colours** when printing unless `print-color-adjust:
  exact`; the band and totals are the document's identity, not decoration.
- `width: 210mm` asserts A4's *nominal* width. Printers reserve an unprintable edge,
  so the sheet overflowed and left a white gap; `100%` fills the real page box. The
  same mistake vertically (`min-height: 297mm`) produces a **blank second page**.
- A page *margin* prints white whatever the canvas is painted, because it sits
  outside the page box. Space above the repeated column headings is made inside the
  sheet with a transparent border and `background-clip: padding-box`.
- The chrome was hidden by naming elements, and the names were wrong — the providers
  render fragments, so the navbar is `body > nav`. Now: hide everything that is
  neither the sheet, inside it, nor an ancestor of it.

Phone numbers are part-masked on the invoice (`+234816.....37`), since an invoice is
forwarded, printed and photographed. The full number stays in the database.

**Bugs found and fixed along the way:**

- **The auth redirect never worked.** Both `/auth/login` and `/auth/signup` read
  `redirect` from `params` instead of `searchParams`; those routes have no dynamic
  segments, so it was always empty and everyone landed on `/dashboard`. Every "sign
  in and come back" path was broken. Fixed, with `safeRedirect` — honouring the
  parameter unguarded is an open redirect, and the person following it has just
  typed their password.
- **Overlays did not lock the page.** Lenis drives scrolling from its own wheel
  listener and calls `scrollTo` on the window, so `overflow: hidden` — and Radix's
  own lock — had no effect. One `useScrollLock` hook now stops both; applied to six
  overlays.
- `<Image src="">` on order lines without a picture, which makes the browser
  re-download the whole page.
- The product details accordion opened nothing: its initial state said
  `"description"`, the item is `"Description"`.
- Quantity survived a variant change, so 20 of a 35-stock weight stayed at 20 against
  a variant with 8 — rejected at checkout with no explanation.
- The account rail's active item was ink on deep sage: **2.28:1**.
- `useScroll` targets measured against a static `body`, so every parallax offset was
  computed from the wrong origin.

**Seed.** Eight products, one per category, so every tile leads somewhere with stock
behind it — verified by running the whole file into an emptied `products` table
inside a transaction and rolling back. `scripts/seed-demo-reviews.js` adds four demo
customers with a known password, delivered orders, nine reviews (one left pending, one
purchase left unreviewed so the form can be exercised) and a fourteen-line order for
testing the invoice page break. `--clean` removes all of it.

**Verified:** typecheck and production build clean throughout; reviews, requests,
addresses, tracking and reorder each tested against the live database as a real
signed-in customer and a real admin, including the negative cases — a customer cannot
approve their own review, quote their own request, or read another's.

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

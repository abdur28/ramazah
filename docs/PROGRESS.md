# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-22 — Product form rebuilt; admin charts made interactive

### The form could not produce a sellable product

Taken as plan item 4 — the axes — but the axes were the smaller half.

- **Nothing created through the admin could ever go live.** `createProduct` set
  `status` from a `publishedAt` the form never wrote, so every product saved
  landed as `draft`, filtered out of `product_listing` and invisible to every
  shopper. `updateProduct` never touched `status` at all, so it could not be
  published afterwards either. There is a publication control now, and
  `published_at` is stamped on first publish and kept on re-publish so a product
  taken down and put back does not jump to the top of "New in".
- **Price was collected, required, and thrown away.** There is no product-level
  price column — `product_prices` is keyed by `variant_id` — and only
  `variant.prices` was ever written. The "Default Pricing" panel was a fiction,
  and a product saved without variants had no price and could not be bought.
- **Stock the same.** `products` has no stock column either; `totalStock` and
  `inStock` were collected and discarded. Stock is `product_variants.stock_count`.
- **Collection the same.** The picker had no mapping in `toColumns` and neither
  create nor update resolved the slug, so choosing a collection did nothing.
- **`sizeGuide` the same** — no column, no mapping. Dropped.
- **Only Size and Colour.** `product_options` has always stored arbitrary named
  axes; the form offered a fixed size list and a colour picker. A coffee sold in
  Weight × Grind could not be created through the UI, which is why all eight
  catalogue products arrived by SQL.
- **No expiry field.** `product_variants.expiry_date` exists and `create_order()`
  enforces it — for a shop importing coffee, dates and spices, the difference
  between stock that sells and stock that silently cannot.

Now: `OptionsEditor` for the axes (Colour is an ordinary axis that happens to
offer swatches, backed by `product_option_values.hex`), and `VariantManager`
generating the combinations with SKU, price, stock, best-before and weight per
row. Validation is continuous and lists everything outstanding, rather than one
toast per save attempt.

**Verified end to end against the live database** as a real signed-in admin: a
two-axis perishable product creates as active, gets four variants from Weight ×
Grind, carries a price and a best-before on each, appears in `product_listing`
for an anonymous shopper at ₦9,000–₦12,000, is accepted by `create_order()`, and
vanishes from the storefront again when switched to draft. Eight checks, all
passing.

### Second pass on the form

- **The best-before field was hidden.** It only appeared once `isPerishable` was
  switched on, and that switch was in the sidebar, three cards away from the
  variant rows it affects. Perishability now sits directly above the variants,
  where its only visible consequence is — and a product filed under Food or
  Beauty with it switched off says so, since half this catalogue is food and a
  coffee with no dates entered would otherwise look finished.
- **`products.details` was `{}` on every product in the shop.** The product page
  has always rendered it as a specification table under Details; nothing could
  write it, so that table was empty catalogue-wide. There is a key/value editor
  now. jsonb does not preserve insertion order — Postgres returns keys by length,
  then bytewise, which put "Roast" above "Origin" for no visible reason — so the
  product page sorts them and the form says it does.
- **`item_type` and `meta_keywords`** were both read by the app (`lib/products`
  filters on the first, the product page's metadata uses the second) and neither
  had a control.
- **Bulk apply.** One row's price, stock or date can be pushed to the rest, which
  is the difference between a variant editor and a chore at twelve rows.
- **Unsaved-changes guard.** Filling this in is twenty minutes of photographs,
  axes and per-variant dates; a stray back gesture lost all of it.

Every editable column on `products` is now reachable from the form — audited
column by column against `information_schema`.

### Every button in ImageUpload submitted the form

None of them set `type`, so they defaulted to `type="submit"` inside the product
form: removing an image, reordering one or setting a cover submitted the whole
product. Two more there — removing any image forced `isPrimary` back onto the
first, silently discarding a chosen cover; and the render called `images.sort()`,
which sorts in place and so mutated the parent's state. The two popover triggers
now set `type="button"` explicitly rather than relying on Radix to pass it down,
since that assumption is what produced the bug.

### Charts

Static SVG with no hover. The legends carried every value, which is why a donut
read fine standing still — but a twelve-month line showed the first label and the
last value and gave no way at all to read March.

TrendChart takes the pointer across the whole plot area and picks the nearest
month, with arrow keys, Home, End and Escape doing the same and the caption
doubling as the readout. DonutChart ties its halves together: an arc dims the
rest and swaps the centre, and a legend row does the same. BarList responds on
every row, with a chevron marking the ones that lead somewhere.

### Dashboard, on review

- The revenue trend padded ten empty months before the first payment ever taken,
  drawing a flat line out of a business that did not exist yet. Leading empty
  months are trimmed; interior ones still plot as zero.
- The growth badge under "Revenue settled" used a rate computed across every
  order whatever its payment state — measuring one thing under a number that
  meant another. It returns null rather than 0% with no month to compare against.
- "Orders to fulfil" counted only `pending`, reading 0 while an order sat in
  `processing` — disagreeing with the orders page.
- Latest-order rows now carry the order number through as `?q=`.

---

## 2026-08-22 — Admin area

The last part of the app that had never had a design pass, brought onto the Ramazah
system. Along the way the pass turned up a set of screens that were showing numbers
nobody had checked.

### Fabricated data, removed

**`/admin/transactions` was entirely fake.** `generateMockTransactions()` produced a
hundred rows of `Math.random()` on every mount — John Doe and Jane Smith paying in USD
and RUB through PayPal and Stripe — under a heading reading **Total Revenue**. Nothing
on the screen touched the database, and the figure changed on every reload. The
**Transactions tab of `/admin/analytics` was fed from the same generator**, seeded into
the analytics store before a single query ran.

Both now read the orders, which are the payment record on this installation — the
schema already carries `payment_status`, `payment_method`, `payment_intent_id` and
`paid_at`. New `lib/admin/payments.ts`. The page is renamed **Payments**, and revenue
means *settled* money: the old totals summed every row regardless of status, so failed
and unpaid orders counted as income.

### Money had no currency

Every money figure in the admin ran through a symbol table inherited from hoodskool —
`{ USD, EUR, GBP, RUB }` — with **no entry for Naira**. The shop's own currency fell
through to the fallback and rendered `NGN410005.00`: unsymbolled, ungrouped, quoting a
subunit nobody prices in. `lib/admin/format.ts` now matches the storefront's rules,
and ₦410,005 reads the same to the shopkeeper as to the customer.

### Things the screens claimed but did not do

- **Suspend did the opposite.** `handleToggleStatus` computed `const newStatus =
  'active'` under a `// Simplified for now` comment, so confirming "Suspend Customer"
  set the account **active** — with a success toast either way. Nothing could reinstate
  an account, and `profiles.status` was never displayed, so a suspended customer looked
  identical to an active one.
- **The Orders column was `0` for everyone.** It read `user.orders?.length`, a field the
  profile mapper never populates — relations moved into their own tables during the
  Supabase migration. Customers with a dozen orders showed as new. Real counts and
  lifetime spend now come from `lib/admin/customers.ts`.
- **The customer details dialog was mostly theatre.** Its Orders tab was a hardcoded
  "No Orders Yet" panel that never queried anything; Account Status was a literal
  `Active` badge; and the entire edit mode was unreachable, because the button that set
  `isEditing` had been commented out, leaving four branches of dead form code behind it.
- **Two sidebar links 404'd.** `Pages` and `Settings` pointed at routes that do not
  exist.
- **Export and Download Receipt did nothing.** Export now writes a real CSV, quoted
  properly so a customer named O'Brien does not shift every column after them.

### Things the screens never showed

- **Publication state.** `products.status` gates the storefront, and the catalogue
  showed no trace of it — a product could be saved, look exactly like its published
  neighbours, and be invisible to every shopper. Added to `Product`, the mapper, the
  table and a filter.
- **Expiry.** Half this catalogue is food and `create_order()` refuses an expired
  variant, so stock silently stops being sellable while still reading "In stock".
- **The queues.** Unapproved reviews and unquoted sourcing requests accumulate where
  nothing else in the app mentions them. They are now badged in the sidebar and lead
  the dashboard.
- **Empty categories and collections.** A category with no products is a dead link in
  the shop's menu; nothing said which ones were empty.

### Footer signups were unreachable

`newsletter_subscribers` had been collecting every address typed into the storefront
footer — visitors with no account, which is most of them — and the mailer only ever read
`profiles`. The form said "subscribed", the row was written, and the list could not be
reached from the one screen that sends mail. Those addresses are now newsletter
recipients, tagged **Footer**, de-duplicated against account holders.

### Design

A shared kit — `PageHeader`, `StatCard`, `SectionCard`, `EmptyState`, `StatusPill` —
replaces eleven pages of drifting one-offs. `StatusPill` holds the admin's whole status
vocabulary in one table; there had been six copies of an order-status map that disagreed
with each other, and the dashboard rendered `shipped` and `delivered` identically.

**Tremor is gone.** Its charts used a palette that appears nowhere else in Ramazah —
blue, emerald, fuchsia, violet, amber — and were the loudest thing in the admin.
Replaced by `components/admin/charts/` built from the design tokens. This also removes
the `legacy-peer-deps=true` override: `@tremor/react` is React 18-only, and the project
now installs clean on React 19.

The "Customer Growth" area chart is gone too. It plotted two points — the total minus
this month's arrivals, then the total — which is a subtraction drawn 320 pixels tall.
The dashboard's revenue trend is a real twelve-month series with empty months filled in.

### Contrast

`scripts/check-admin-contrast.mjs` reads every class string in the admin, composites
tinted backgrounds over the page ground, and fails any element setting both a background
and a text colour below 4.5:1. It caught nine, including the same ink-on-sage pairing
(2.28:1) already fixed on the customer side that the admin still carried, and four uses
of `--ink-faint` — 2.4:1, marked decorative-only — as running text.

One new token: **`--terra-ink` `#9C5433`**. `--terra-text` is legal on the page ground
but reaches only 4.03:1 once the surface beneath it is `terra/10`, which is exactly
where badges and warnings put it.

### Database

`20260822000011_admin_self_guard.sql` — `set_user_role` and `set_user_status` checked
`is_admin()` and nothing else, so an admin could demote or suspend their own account.
With one administrator on this installation either action locks the admin area away
behind a service-role key and a terminal. Both refused now, along with demoting the last
remaining admin. Verified: self-demote and self-suspend raise `42501`, suspending a
customer still works.

### Seed

Nine demo orders sat at `delivered` with `payment_status = 'pending'`, no `paid_at` and
no `delivered_at` — a state this shop cannot be in, and invisible while the admin summed
revenue regardless of status. Fixed in `scripts/seed-demo-reviews.js`, which now dates
its orders across two months so the trend chart has something real to draw.

**Verified against the live database:** ten RLS boundary checks as an anonymous visitor
and as a signed-in customer — orders, the newsletter list, other people's profiles and
reviews, and the three privileged RPCs all correctly refused. All twelve admin routes
still 307 for an anonymous request; the storefront is untouched.

### Still open

- `/admin/products/new` and `/admin/products/[id]` had a colour and radius pass only.
  The product form is plan item 4 — a rebuild, not a restyle: it still only understands
  `size` and `color`, so a "Weight: 250g / Grind: Ground" product cannot be created
  through the UI, and there is no expiry-date field.
- **Collections have no storefront route.** `app/` has `/categories/[...slug]` and
  `/product/[slug]` and nothing for collections, so a collection is data with no page.
  The admin screen now says so rather than leaving it to be discovered after curating
  one.
- `npm audit` reports two pre-existing high-severity advisories (`nodemailer`, `sharp`),
  both needing major-version bumps. Untouched here.

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

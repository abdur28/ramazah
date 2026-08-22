# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-22 — Demo data now in the catalogue

Three seeds exist and all of them are placeholders to remove before launch:

| Script | What it adds |
|---|---|
| `npm run seed-demo-reviews` | Four `@demo.ramazah.test` customers, their orders and reviews |
| `npm run seed-variant-images` | A photograph per colour on the Chiffon Veil |
| `npm run seed-deep-categories` | A six-level branch under Spices & Condiments with four spice products |

Each takes `--clean`. The images are Unsplash URLs, not Cloudinary — swapping
them is the same job as replacing `constants/demo.ts`.

---

## 2026-08-22 — Overlays could not be scrolled

Every dialog, sheet and rail in the app stopped scrolling once its content
overflowed — the admin and account navigation included.

Lenis drives the page from its own wheel listener on `window` and calls
`preventDefault`, so an element nested inside it never receives the event. It
has an opt-out — `data-lenis-prevent`, which it checks by walking
`event.composedPath()` and bailing if *any* ancestor carries it (verified in
`node_modules/@studio-freight/lenis/dist/lenis.mjs`, not just the docs).

It was being remembered case by case and mostly forgotten: exactly two elements
in the whole app had it. Because the check walks ancestors, the fix belongs on
the primitives — `DialogContent`, `AlertDialogContent`, `PopoverContent`,
`SelectContent`, `DropdownMenuContent` and the shared table wrapper — which
covers every consumer at once, including everything reached through a `Command`
inside a popover.

Tagged individually on top of that: the admin and account rails and their phone
chip rows, the cart sheet, the search dialog, the mobile menu's two sliding
panels, the desktop menu panel, the category filter drawer, the checkout summary,
the invoice table, the analytics tab strip, the product gallery thumbnails and
the mailer's recipient list.

Twenty-one files carry it now, and an audit of every `overflow-*-auto` in the
app comes back clean — the remainder all sit inside a tagged primitive.

---

## 2026-08-22 — Menus that go all the way down

The mega-menu was the wrong shape. Columns can hold three levels and then stop,
so a fourth had nowhere to go, and it turned a tidy list into a wall.

**Desktop: one panel, expanded on click.** Four attempts, and the arithmetic of
the first three is worth keeping.

A mega-menu of columns held three levels and then stopped. Chaining a flyout off
every row reached any depth but marched panels across the screen until it read
as a stack of dialogs. Sliding a two-column panel fixed the look and broke the
behaviour outright — the preview column drilled on `mouseenter`, which put the
next column under the cursor, which drilled again, so one sweep of the mouse ran
to the bottom of the tree.

The common fault was hover. Hover is fine for *opening* one panel; it is a poor
way to walk a hierarchy, because every level is another region the pointer can
cross by accident and the cost of a wrong guess is the menu rearranging itself
under the hand.

Nothing inside the panel responds to hover now. A row with children carries a
chevron that expands it in place and the panel grows downward like an outline;
the name beside it still links straight to the category page, so *go there* and
*look inside* are separate targets rather than the same gesture with different
timing. One panel, 300px, scrolls past 70vh, nests to any depth, cannot run
away.

**Mobile drills.** `activeCategory` was a single level, so tapping a shelf that
had shelves of its own was the end of the road — the children were rendered
inline and a grandchild had nowhere to go. It is a stack now: a child with
children is a button that pushes another panel rather than a link that leaves
the sheet, and Back walks out one level at a time. The panel is keyed by depth so
each drill replays the slide.

**`MENU_DEPTH` raised from 3 to 6**, the ceiling the database enforces — so the
menu now carries the whole tree. It was three because the columns could not
express more; neither the cascade nor the drill grows as the tree does, so there
is no longer a reason to stop short and leave shelves unreachable. Nothing is
marked "more inside" any more, because nothing is out of reach.

**Verified:** hovering down Food & Pantry › Spices & Condiments › Whole Spices ›
Seeds › Cumin › Alexandria reaches all six, and the deepest item links to its
full slug trail.

---

## 2026-08-22 — Menu: real names, three levels

### The abbreviations were mine, and wrong

`20260823000013` seeded `nav_label` with "Food" for Food & Pantry, "Veils" for
Veils & Scarves, "Home" for Home & Decor — and its comment claimed to be
reproducing the curated menu. It was not: that menu carried all three in full.
The short forms were invented to make a bar fit, which is not a decision the
software gets to make about a shop's own category names.

`nav_label` stays, because a shopkeeper may want a shorter menu label, but it is
null by default and **editable from the category form** along with
`show_in_nav`. Fitting the bar is the bar's problem.

Also reset: `show_in_nav = false` for everything below depth 2. That was a depth
rule wearing a visibility column's clothes, and it contradicted the menu, which
now carries three levels. Depth is `MENU_DEPTH`'s business; `show_in_nav` is for
leaving a particular shelf out.

### The bar measures itself

An off-screen copy of the full list is measured against the room actually
available, and whatever does not fit moves into "More".
`MAX_DESKTOP_NAV_ITEMS` is a ceiling on top of that rather than a substitute for
measuring — six long names and six short ones need very different space, and at
1280px "Beauty & Personal Care" and "School & Stationery" together take the room
three shorter shelves would. Re-measured on resize and after `document.fonts`
settles, since web fonts land after first paint and change every label's width.

### The dropdown carries three levels

`NavItem.subCategories` was a single flat `NavGroup[]` — one level below the top,
and no more. It is a real `children: NavItem[]` tree now.

A category whose children have children renders as **columns**: each child a
heading that is itself a link, its own children listed beneath. Where the
children are leaves it stays a single narrow list, because a four-column grid
holding four links is mostly empty panel. Anything below the menu's three levels
is marked with a chevron — "more inside" — rather than presented as a leaf, and
reached from the category page.

The mobile sheet nests the same way, with no cap: it scrolls, so unlike the bar
there is no reason to flatten it.

### Product breadcrumbs

Stopped at the immediate parent, so a product six levels down showed two crumbs
and skipped four. Built from the full ancestor chain now.

**Verified:** the menu tree renders Food & Pantry › Spices & Condiments › Whole
Spices with a "more inside" marker below it; every href is a full slug trail;
setting a custom label uses it and clearing it falls back to the real name;
hiding a category removes it from the menu while leaving it browsable.

---

## 2026-08-22 — Menu built from the catalogue

### Product breadcrumbs

Stopped at the immediate parent, so a product filed six levels down showed two
crumbs and skipped four. Built from the full ancestor chain now, each link from
the slug trail rather than guessed.

### The navbar reads the catalogue

`constants/navigation.ts` was hand-written, so a category added in the admin was
invisible until someone edited code — which is what "Tea" ran into.

The reason it was hand-written was sound and is kept: a menu is not a mirror of
a table. It needs shorter labels than the catalogue uses (six names the length
of "Beauty & Personal Care" will not sit on one line), an order, and the ability
to leave shelves out. Those three decisions moved onto the row —
`nav_label`, `sort_order`, `show_in_nav` — in
`20260823000013_category_navigation.sql`, seeded with exactly the labels and
order the curated list had, so nothing changed visually on the switch.

`getStoreNavigation()` resolves it once in the root layout;
`NavigationProvider` hands it to the five components that show a menu. The
constants stay as the fallback: a navbar that empties itself during a database
blip looks broken in a way a stale one does not.

**Desktop caps at six** top-level shelves. The bar cannot grow, and past six the
labels collide with the lockup and the icons; the rest go under **More** rather
than wrapping onto a second line or being dropped. The mobile sheet has no cap —
it scrolls. Verified by adding two categories: More appeared with eight and
vanished again at six.

Two things this shook out. `MAX_DESKTOP_NAV_ITEMS` first lived beside
`getStoreNavigation`, which imports `next/headers` — importing it from the
client bar dragged a server-only API into the browser bundle and failed the
build. And building the menu purely from categories quietly dropped **Contact**,
which is a page rather than a shelf; `staticNavItems` carries those, outside the
cap.

### Deep branch, seeded

`scripts/seed-deep-categories.js` (`npm run seed-deep-categories`, `--clean`)
puts a real six-level branch under Spices & Condiments with a product at four
different levels — Whole Spices, Seeds, Cumin, Alexandria — because the roll-up
is only visible with products scattered down a branch rather than all at the
bottom. Every level returns 200 and lists 4, 3, 2, 1 as you descend.

---

## 2026-08-22 — Categories nest to six levels

Asked for six levels. The database already allowed any depth; the app hardcoded
two in five places and silently dropped anything deeper — a grandchild existed
in `categories` and was attached to nothing, so it appeared in no admin screen,
no menu and no pre-rendered page.

Depth-agnostic now, with a hard ceiling of six enforced in the database and
guidance toward three in the admin.

### The database was missing its guards

`20260823000012_category_depth.sql`. Testing the request turned up a bug that
had nothing to do with depth:

**Renaming a category left every descendant with a stale path.**
`categories_cascade_path` was declared `after update OF path`, and Postgres fires
a column-scoped trigger only when that column appears in the statement's SET
list — not merely when the value changes. The admin renames with
`set name = …`, so the BEFORE trigger recomputed the row's own path and the
cascade never ran. Broken at two levels already; worse at six.

Also added: cycle prevention (`parent_id` could point at the row's own
descendant, making the path recursion non-terminating), a `depth` column
maintained by the same trigger, the six-level ceiling in
`public.category_max_depth()`, a bar on `>` in names since it is the path
separator, and a `text_pattern_ops` index for the prefix query behind every
category page.

### Five two-level assumptions in the app

- `fetchCategories` attached only children of a root — grandchildren belonged to
  nothing.
- `getAllCategories` did the same, so `generateStaticParams` never saw them.
- `generateStaticParams` walked exactly two levels regardless.
- `getCategoryHierarchy` returned the immediate parent, not the ancestor chain,
  so a breadcrumb could only ever be two deep.
- The admin tree only offered "add subcategory" at the top level.

### Verified end to end

A six-level branch created through the real trigger — Food & Pantry › Spices &
Condiments › Whole Spices › Seeds › Cumin › Alexandria — returns 200 at every
level with a full, correct breadcrumb at the deepest. A seventh is refused by
the database. Cycles, self-parenting, empty names and `>` in a name are all
refused. Renaming a root now rewrites four levels beneath it. Test branch
removed; the catalogue is back to its ten real categories.

---

## 2026-08-22 — Subcategories

Reported as "if I add a subcategory I don't see it or manage it". It was four
separate bugs sharing one cause, plus one older one they were hiding.

### The database separates paths with `' > '`; three places split on `'/'`

`maintain_category_path` builds `Food & Pantry > Coffee & Tea`. `CategoryTree`,
`CategoryPathSelector` and `CategoryDialog` all split on `'/'`, which always
returns a single segment — so every category came out at depth zero.

- **The admin tree never rendered a child at all.** `fetchCategories` returns
  only top-level rows with children nested under `subCategories`, and the tree
  ignored that field, trying to rebuild the hierarchy from the path string. It
  walks `subCategories` now, which comes straight from `parent_id`.
- **The category picker could not file a product under a subcategory**, for the
  same reason — it only ever saw the roots. It also badged everything "Level 1"
  and indented nothing.
- **The dialog's path preview was wrong twice over**: `${parent.path}/${slug}`
  showed `Food & Pantry/tea` where the trigger writes `Food & Pantry > Tea`, and
  the URL line showed the stored path when the storefront routes on slugs.
- **Editing a subcategory silently offered to move it to the top level**, because
  the parent was resolved by slicing the path on `'/'` and never found.
- Counts on `/admin/categories` only ever counted roots — six, where the shop has
  ten.

`lib/categories.ts` now holds the separator and the tree helpers, so it is
written down once.

### Every top-level category page on the shop was empty

Older, and the more serious one. `getCategoryByPath` decided "is this a slug
path?" with `path.includes('/') || !path.includes('>')` — true of *every*
top-level stored path, so `Food & Pantry` was looked up as a slug, no row has
that slug, and the lookup failed. Six of ten category pages listed nothing.

Replaced with a real test: slugs are lower-case, digits and hyphens, optionally
slash-separated; stored paths carry capitals, spaces or `&`.

### A parent category showed neither its children nor their products

`getProducts` matched `category_path` exactly, so Food & Pantry listed the one
item filed directly on it while four sat beneath. It is a prefix match now
(`includeDescendants: false` restores the old behaviour where a caller wants
just that shelf), and the category page lists its child shelves as links — so a
subcategory added in the admin is reachable by browsing, which it previously was
not from anywhere except a hand-edited navbar.

Breadcrumbs on a category page were built by splitting the stored path on `'/'`
too, producing a single crumb labelled `Food & Pantry > Coffee & Tea` linking to
`/categories/Food & Pantry > Coffee & Tea`, which 404'd. They come from the real
parent/child rows now.

`pathToDisplayPath` / `displayPathToPath` are gone — no callers left, and a
category name containing a hyphen ("Ready-to-eat") round-tripped as "Ready To
Eat" and matched nothing.

**Verified against the live database:** every URL resolves and lists what it
should — Food & Pantry rolls up its four, each leaf shows its own, the newly
added empty subcategory is reachable and honestly empty, and both the slug and
stored-path forms work.

### Still curated: the navbar

`constants/navigation.ts` is a hand-written list, so a category added in the
admin does not appear in the menu until someone adds a line. That remains a
deliberate choice (see PLAN) — but it is now the *only* place a new subcategory
is invisible, rather than one of five.

---

## 2026-08-22 — Variant photographs

`variant_images` has existed since the first migration, with an RLS policy
letting anyone read it, and **nothing had ever written or read a row**. A veil in
three colours showed the same photograph whichever colour you picked.

The reason it stayed unused is structural rather than an oversight: on the
product page the gallery and the variant picker are *siblings* — the picker lives
inside `ProductInfo`, the gallery sits beside it — so the selection had nowhere
to travel. The gallery could not have known which variant to show even if the
table had been populated. `SelectedVariantProvider` is that missing channel.

**Admin.** Each variant row in the form now has a strip of the product's
photographs to toggle on and off. Nothing chosen means all of them, which is the
right default: a coffee in 250g and 1kg is the same object photographed once, and
writing a row per image for those products would be noise.

**The awkward part** was that `writeImages` deletes and re-inserts every
photograph on save, so `product_images.id` changes each time — a variant's links
cannot be stored against an id the next save throws away. Cloudinary's
`public_id` is the stable identity, so `buildImageResolver` reads the rows back
after the rewrite and translates form-level image ids into whatever id the
photograph ended up with.

**Storefront.** The gallery filters to the selected variant's photographs and
falls back to the whole set when a variant has none — or when its links point at
photographs since deleted, where an empty gallery would be worse than a wrong
one. Switching variant keeps you on the same photograph if it is still on offer
and moves you to the first if it is not, rather than leaving a stale index
pointing at the wrong image.

**Seed.** Nothing in the catalogue could demonstrate this — every product had
exactly one photograph. `scripts/seed-variant-images.js` (`npm run
seed-variant-images`, `--clean` to undo) gives the Chiffon Veil a shot per
colour, keeping the original on both.

**Verified against the live database:** an anonymous shopper resolves two
distinct photograph sets for the two colours and is unaffected on a product with
no links; and a simulated admin save proves the links survive the
delete-and-reinsert intact.

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

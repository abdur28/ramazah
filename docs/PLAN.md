# Plan

Ramazah is a **personalised shopping and shipping service** from Egypt to Nigeria. It
sells a stocked catalog — veils and scarves, coffee and tea, beauty and personal care,
dry foods, spices, kitchenware, home decor, school supplies — *and* sources items to
order: "just tell us what you need, and we'll do the rest."

It started as a copy of the
[hoodskool](https://github.com/abdur28/hoodskool) streetwear codebase, which shapes what
still needs replacing.

**Trading in NGN. No payment processing — orders and invoices only.**

## How the business describes itself

The WhatsApp listing, verbatim from the client (2026-08-20), is the source of truth for
tone and scope:

> Assalamu Alaikum everyone and Welcome!
>
> We're excited to introduce our Personalized Shopping & Shipping Service from Egypt to
> Nigeria!
>
> Tired of searching for unique, affordable, and quality items you can't find locally?
> We've got you covered! Whether it's fashion, beauty products, electronics, home decor,
> or anything in between — we help you shop directly from Egypt, and deliver straight to
> your doorstep in Nigeria.
>
> We take the stress out of international shopping by handling everything from sourcing
> to shipping, with options for standard delivery (2–3 weeks) or express shipping at an
> extra cost if you're in a hurry.
>
> Let's make shopping fun, easy, and global — just tell us what you need, and we'll do
> the rest!

**Four things in there the site does not yet model.** They are broken out under Next.

- **Sourcing to order is the headline service**, and the storefront has no way to ask for
  something that is not already in the catalog. Every screen assumes a fixed catalog.
- **Delivery takes 2–3 weeks**, with express at extra cost. The site quotes neither, and
  a 2–3 week lead time is the single biggest expectation to set before someone orders.
- **Electronics and fashion** are named as categories and neither exists in the tree.
- **The audience is addressed as Muslim** ("Assalamu Alaikum"), warmly and informally.
  Ramadan is a real trading season for this shop, not a marketing theme.

---

## Done

**Backend migration — complete.** Firestore and Firebase Auth replaced by Supabase
(Postgres 17 + Auth + RLS). Next.js upgraded 15.5.4 → 16.3.1. Firebase fully removed.
See [PROGRESS.md](PROGRESS.md) for the log and
[database-design.md](database-design.md) for the schema and decisions.

**Account area — complete.** Redesigned, plus order tracking from
`order_status_history`, reorder, printable invoices, an address book, the customer's
own reviews, and sourcing requests (`product_requests`) with a staff queue.

**Reviews — complete.** Verified-purchaser only, moderated through `/admin/reviews`,
with `review_public` exposing an author name and nothing else from the profile.

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

### 2. Turning a request into an order
Requests themselves are built — `/dashboard/requests` for the customer,
`/admin/requests` for staff, moving asked → quoted → buying → fulfilled. What is
missing is the last step: accepting a quote still means someone creating the order by
hand. A "convert to order" action on a quoted request would close the loop, and is
what finally takes the sourcing service off WhatsApp.

### 3. Shipping: two speeds, and a lead time
`STANDARD_SHIPPING` and `FREE_SHIPPING_THRESHOLD` are single placeholder Naira amounts.
The real model has **standard (2–3 weeks)** and **express at extra cost**, which means
checkout needs a shipping-method choice, `orders` needs to record which was taken, and
every product page and the cart need to state the lead time. A customer who expects
next-day delivery and waits three weeks is a refund request.

### 4. ~~Admin product form~~ — done 2026-08-22
Rebuilt. Arbitrary axes (`OptionsEditor`), variants generated from them with price,
stock, best-before and weight per row (`VariantManager`), and a publication control.

It turned out to be more than the missing axes: the form collected a product-level
price, *required* it and discarded it — `products` has no price column, and only
`variant.prices` was ever written — so a product saved without variants had no price at
all. Stock and collection went the same way, and `createProduct` derived `status` from a
`publishedAt` the form never set while `updateProduct` never wrote `status`, so nothing
created through the admin could ever be published. See PROGRESS for the full list.

Verified end to end against the live database as a real admin: a two-axis perishable
product creates, prices, stocks, appears in `product_listing` for an anonymous shopper,
is accepted by `create_order()`, and disappears again when switched to draft.

~~**Still not exposed: `variant_images`.**~~ Done 2026-08-22 — picker in the admin,
gallery follows the selection on the product page. See PROGRESS.

### 5. Product pages and filters
**This is now the most visible storefront gap.** The category filter sidebar offers
Size, Colour, Tags and Materials — and the catalogue's actual axes are Weight, Grind
and Flavour, so on every food page it computes empty arrays and renders a panel with
nothing in it. Filtering should read the generic option axes off the products, the way
`VariantSelector` and the rebuilt product form already do, using `product_listing` and
`search_product_ids()`.

Two smaller things belong with it: the Browse chips on a category page carry no product
counts, so an empty shelf looks the same as a full one until you click; and a category
with no products falls through to "Try adjusting your filters" when no filter is set —
it should say the shelf is empty and point up a level.

`ProductCard`'s quick-add dialog is part of this: it only speaks Size and Colour, so a
product on the generic option model routes to the product page instead of choosing in
place. Deliberate, but it is the same rebuild.

**A search results page** would also belong here. Search currently lives entirely in
the dialog, which shows the top six matches and asks you to refine.

**Collections have no storefront route at all.** `app/` has `/categories/[...slug]` and
`/product/[slug]` and nothing for collections, so `/admin/collections` manages data that
no shopper can reach — banner image, description and all. Either build
`/collections/[slug]` or drop the concept; leaving it half-present is the worst of the
three. The admin screen says so on its face in the meantime.

### 6. Notifications and admin — deferred by the client (2026-08-21)
Working, but nobody is told anything by email:

- **Wishlist back-in-stock alerts.** `preferences.emailNotifications.wishlistAlerts`
  exists and `emails/wishlist_alert.html` exists; nothing watches stock and nothing
  sends. The toggle is currently a promise the system does not keep.
- **Review and request notifications.** A review lands as `pending` and a sourcing
  request lands as `asked`; both are invisible until someone opens
  `/admin/reviews` or `/admin/requests`. No email says one is waiting, and the
  customer is not told when their review is published or their request quoted.
- ~~**Admin polish.**~~ Done 2026-08-22. The pass also removed two screens' worth of
  fabricated data — `/admin/transactions` and the analytics Transactions tab were both
  fed by `generateMockTransactions()` — and fixed an inverted suspend action. See
  PROGRESS.
- **Still no notification when a queue fills.** The sidebar badges and the dashboard now
  show the backlog, which closes the *discoverability* half of this. The email half is
  untouched: nothing tells you a review is waiting unless you open the admin.

### 7. Google sign-in
Currently an unconfigured button that returns a raw `400`. Either enable the provider
(Google Cloud OAuth client → Supabase → URL Configuration) or hide it.

### 8. Deployment
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
- **Rounding display** — Naira prices drop kobo, so a cart's displayed parts can sum
  ₦1 off its displayed total. Harmless until invoices exist; not once they do.
- **Electronics and fashion categories** — both are advertised on WhatsApp and neither
  is in the category tree. Adding them is one seed migration plus a line in
  `constants/navigation.ts`, but electronics carries warranty and returns questions the
  rest of the catalog does not.

## Deliberately not doing

Batch/lot tracking · multi-warehouse · a tax engine · audit trails on every table ·
coupon stacking rules · a monorepo. All revisitable; none justified at current scale.

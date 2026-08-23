# Structure

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · Supabase (Postgres 17) ·
Cloudinary · nodemailer. 114 components, 41 migrations.

## Architecture

The database is the security boundary, not the app. RLS policies and `SECURITY DEFINER`
functions enforce access; the server guards in `lib/auth/server.ts` and the redirects in
`proxy.ts` are UX. This matters because a future Expo client never executes either.

```
Browser / Expo  ──►  Supabase (PostgREST + Auth)  ──►  Postgres + RLS
      │
      └──────────►  Next.js route handlers  ──►  Cloudinary · SMTP · privileged ops
```

Next.js route handlers exist only for work needing server-side secrets. Everything else
talks to Supabase directly under RLS, so the mobile app gets the same API for free.

## Directories

```
app/
├── admin/            Admin (products, categories, collections, customers,
│                     orders (+ [id]/invoice, packing-slip, new), payments,
│                     requests, reviews, mailer, pages, settings, analytics)
├── api/
│   ├── admin/users/  Privileged account deletion (verifies admin server-side)
│   ├── auth/         Account deletion · email-hook (Supabase's Send Email Hook,
│   │                 signature-verified; see docs/auth-email.md)
│   ├── upload-images/, delete-image/   Cloudinary
│   └── email/worker, email/nudge, email/preview
│                     drains the outbox · sends one person's queued mail now ·
│                     renders a template
├── auth/             login · signup · verify (six-digit code) · reset-password ·
│                     callback (OAuth)
├── categories/       [...slug] catch-all, slug-addressed
├── dashboard/        overview · orders (+ [id]/invoice) · wishlist · requests ·
│                     reviews · addresses · preferences · settings
├── faq/, shipping/, returns/, privacy/, terms/, cookies/
│                     Support and Legal, linked from the footer
├── checkout/ (+ success), product/, contact/, unsubscribe/

components/          ui/ (shadcn + Pager), admin/, home/, layout/, navbar/,
                     footer/, cart/, checkout/, product/, category/, brand/
constants/
├── navigation.ts    The one navigation source — bar, menu sheet, search dialog
├── demo.ts          Placeholder imagery; swap for Cloudinary URLs in one file
└── index.ts         Currency (Naira only) and the code-level defaults that
                     Admin → Settings overrides
contexts/            AuthContext · CartInitializer · Currency · Navigation ·
                     Settings (shop-wide values; the email group is stripped
                     before it crosses to the browser)
hooks/
├── admin/           7 zustand stores, one per admin domain, plus useAdminQueues
├── useCart.ts       Cart + checkout
├── useDashboard.ts  Customer dashboard
├── useDebounced.ts  Lets a search box settle before it hits the database
└── useScrollLock.ts
lib/
├── supabase/        client · server · admin · proxy · auth
├── auth/server.ts   getCurrentUser · requireAuth · requireAdmin
├── products.ts      Catalog reads, cart, wishlist
├── orders.ts        Orders (create_order RPC)
├── account.ts       Order tracking, reorder, addresses, own reviews, requests
├── reviews.ts       Public reviews, eligibility, submission, moderation
├── newsletter.ts    Subscribe (insert-only under RLS)
├── auth/redirect.ts safeRedirect — same-site paths only
├── email/           templates registry · render · send · worker
├── content.ts       Page copy, server-side reads
├── content-defaults.ts  The same copy as literals — every read falls back here,
│                     and the admin editor imports it from the browser
├── settings.ts, settings-defaults.ts   Shop-wide settings, same split and for
│                     the same reason as content
├── paging.ts        Fifty a page, the page-number window, the search-term
│                     escaping, and the fallback for a page that no longer exists
├── nudge.ts         Asks the server to send this person's queued mail now
├── categories.ts, navigation.ts, collections via products.ts
├── admin/           format · errors · payments · customers · catalogue ·
│                     campaigns · mail · content · settings · summaries · nudge
├── cloudinary.ts, chartUtils.ts
emails/              34 templates + 5 partials (layout · button · order lines ·
                     payment block · otp code). Tables and inline styles — Gmail
                     strips <style> and Outlook renders through Word. Five of
                     them are auth codes, the only templates whose data does not
                     come from this database.

supabase/
├── migrations/      41 migrations (see below)
└── seed.sql         Sample catalog
scripts/             make-admin.js · seed.js · seed-demo-reviews.js
                     (demo customers, orders and reviews; --clean removes them)
                     check-admin-contrast.mjs · check-auth-contrast.mjs
types/               types.d.ts · admin.ts
proxy.ts             Session refresh + route protection (Next 16 name)
vercel.json          Deliberately carries no cron block — pg_cron owns the
                     schedule. See docs/email-worker.md
```

## Migrations

| File | Purpose |
|---|---|
| `...000000_rls_auto_enable` | Recreates Supabase's auto-RLS event trigger |
| `...000001_init_schema` | 24 tables, 8 enums, indexes |
| `...000002_functions` | Triggers + the atomic `create_order()` RPC |
| `...000003_rls` | RLS policies and role grants |
| `...000004_seed_categories` | Category tree |
| `...000005_column_privileges` | Column-level grants + admin RPCs |
| `...000006_product_listing` | Listing view + full-text search |
| `...000007_default_preferences` | Seeds preferences at signup |
| `...000008_newsletter_subscribers` | Email captures; anon may insert, never read |
| `...000009_review_public` | Approved reviews plus author name, and nothing else |
| `...000010_product_requests` | Sourcing requests; quote and status are staff-only |
| `...000011_admin_self_guard` | An admin cannot demote or suspend themselves |
| `...000012–14_category_*` | Six levels deep, cycle-proof, with nav labels |
| `...000015–18_filtering_search` | Server-side facets, paging, prefix search |
| `...000019_collection_scope` | Collections become a third scope on `filter_products` |
| `...000020_product_collections` | A product belongs to many collections |
| `...000021_order_management` | The audit trigger could not write — no status ever moved |
| `...000022_stock_follows_payment` | Stock is held exactly when an order is paid |
| `...000023_payment_is_deliberate` | Undoing a payment needs a reason, and a record |
| `...000024_request_answers` | The customer can accept or withdraw a quote |
| `...000025_manual_orders` | Orders for people with no account |
| `...000026–28_email_*` | Outbox, triggers, preferences, unsubscribe |
| `...000029_campaigns` | Campaigns queue through the same outbox |
| `...000030_site_content` | Editable page copy, with the code as the fallback |
| `...000031_staff_notifications` | Every admin is told, not one hardcoded address |
| `...000032_site_settings` | Shop-wide settings; SMTP stays in the environment |
| `...000033_email_schedule` | `pg_cron` + `pg_net` call the worker hourly |
| `...000034_outbox_scale` | The Mailer's counts, and ninety-day retention |
| `...000035_list_summaries` | Every list screen's totals, counted in the database |
| `...000036_product_stock_status` | Stock buckets as a view, so the filter can be a query |
| `...000037_customer_stats` | Spend per customer, for the customers on screen |
| `...000038_review_distribution` | The star breakdown, over every approved review |
| `...000039_campaign_paging` | `campaign_results()` takes a page |
| `...000040_send_budget` | Queue priority, and a campaign spread across days |

## Key conventions

- **Money** is `numeric(12,2)`; **time** is `timestamptz`, set by triggers.
- **Variants own** stock, price and options. Product-level stock/price are derived
  (`product_listing`), never stored twice.
- **Every product has at least one variant** — option-less products get a default one.
- **Orders are created only through `create_order()`.** There is no INSERT policy on
  `orders`, so a client cannot set its own prices.
- **Products are archived, never deleted**, so order history keeps its references.
- **Category URLs use slugs**; `categories.path` is a display string and is
  trigger-maintained.
- **Lists are paged at fifty and counted in the database.** A total on screen never
  comes from `rows.length` — an unbounded PostgREST select is silently capped at
  1000 rows, so a tally over the loaded rows is a number that stops moving without
  saying so. See `lib/paging.ts` and the `*_summary` functions.
- **Anything a customer can type into a filter is escaped** before it reaches
  PostgREST's `or=(...)`, which is one comma-separated string: `searchPattern()`
  in `lib/paging.ts`.
- **Transactional mail outranks marketing in the queue.** One table and one
  transport carry both, so `email_outbox.priority` decides what drains first and a
  campaign is spread across days on a budget rather than sent in one burst. An
  invoice must never wait behind an advertisement, and a day's sending allowance
  is finite.
- **Two sending addresses.** `contact@` for transactional, `news@` for marketing
  replying to `contact@` — spam complaints attach to the sending identity, so the
  split that matters is marketing against everything else. Only `contact@` needs
  an inbox behind it.
- **Settings and page copy fall back to code.** `lib/settings-defaults.ts` and
  `lib/content-defaults.ts` hold literals, so an empty database renders a complete
  shop and the admin editors can import the defaults from the browser.

See [database-design.md](database-design.md) for the schema and decision log.

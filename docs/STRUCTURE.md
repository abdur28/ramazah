# Structure

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · Supabase (Postgres 17) ·
Cloudinary · nodemailer. 110 components, 31 migrations.

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
│                     requests, reviews, mailer, pages, analytics)
├── api/
│   ├── admin/users/  Privileged account deletion (verifies admin server-side)
│   ├── auth/         Account deletion for the signed-in user
│   ├── upload-images/, delete-image/   Cloudinary
│   └── email/worker, email/preview     drains the outbox · renders a template
├── auth/             login · signup · reset-password · callback (OAuth/confirm)
├── categories/       [...slug] catch-all, slug-addressed
├── dashboard/        overview · orders (+ [id]/invoice) · wishlist · requests ·
│                     reviews · addresses · preferences · settings
├── faq/, shipping/, returns/, privacy/, terms/, cookies/
│                     Support and Legal, linked from the footer
├── checkout/ (+ success), product/, contact/, unsubscribe/

components/          ui/ (shadcn), admin/, home/, layout/, navbar/, footer/,
                     cart/, checkout/, product/, category/, brand/
constants/
├── navigation.ts    The one navigation source — bar, menu sheet, search dialog
├── demo.ts          Placeholder imagery; swap for Cloudinary URLs in one file
└── index.ts         Currencies, VAT rate, shipping thresholds
contexts/            AuthContext · CartInitializer · Currency
hooks/
├── admin/           7 zustand stores, one per admin domain
├── useCart.ts       Cart + checkout
└── useDashboard.ts  Customer dashboard
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
├── categories.ts, navigation.ts, collections via products.ts
├── admin/           format · errors · payments · customers · catalogue ·
│                     campaigns · mail · content
├── cloudinary.ts, chartUtils.ts
emails/              29 templates + partials/ (layout · button · order lines ·
                     payment block). Tables and inline styles — Gmail strips
                     <style> and Outlook renders through Word.

supabase/
├── migrations/      31 migrations (see below)
└── seed.sql         Sample catalog
scripts/             make-admin.js · seed.js · seed-demo-reviews.js
                     (demo customers, orders and reviews; --clean removes them)
types/               types.d.ts · admin.ts
proxy.ts             Session refresh + route protection (Next 16 name)
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

See [database-design.md](database-design.md) for the schema and decision log.

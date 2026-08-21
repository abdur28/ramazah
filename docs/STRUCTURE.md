# Structure

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · Supabase (Postgres 17) ·
Cloudinary · nodemailer. 86 components, 8 migrations.

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
├── admin/            Admin dashboard (products, categories, collections,
│                     customers, orders, transactions, analytics, mailer)
├── api/
│   ├── admin/users/  Privileged account deletion (verifies admin server-side)
│   ├── auth/         Account deletion for the signed-in user
│   ├── upload-images/, delete-image/   Cloudinary
│   └── send-email/, send-order-email/  nodemailer
├── auth/             login · signup · reset-password · callback (OAuth/confirm)
├── categories/       [...slug] catch-all, slug-addressed
├── dashboard/        overview · orders (+ [id]/invoice) · wishlist · requests ·
│                     reviews · addresses · preferences · settings
├── faq/, shipping/, returns/, privacy/, terms/, cookies/
│                     Support and Legal, linked from the footer
├── checkout/, product/, contact/

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
├── cloudinary.ts, email.ts, chartUtils.ts
supabase/
├── migrations/      8 migrations (see below)
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

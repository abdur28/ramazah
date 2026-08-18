# Ramazah

> E-commerce platform built on Next.js 15 (App Router) — product catalog, cart, checkout, wishlists, reviews, inventory tracking, transactional email, and an admin dashboard.

Started from the [hoodskool](https://github.com/abdur28/hoodskool) codebase and rebranded. See [Rebrand TODOs](#rebrand-todos) for what still points at the old brand.

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in your own credentials
npm run dev
```

### Environment variables

Create `.env.local` with **your own** Firebase / Cloudinary / SMTP credentials — do not reuse hoodskool's, or this app will read and write that project's live data.

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (SMTP)
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
EMAIL_DEBUG=false
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run seed` | Seed products into Firestore (`lib/seed-products.js`) |

## Features

- **Product catalog** — category browsing via a `[...slug]` catch-all, product detail pages, search, size/variant selection
- **Cart & checkout** — persisted cart (zustand, `ramazah-cart` in localStorage), multi-step checkout
- **Accounts** — customer signup/login/password reset, order history; admin role gated by [middleware.ts](middleware.ts)
- **Admin dashboard** — products, categories, customers, orders, transactions, analytics
- **Wishlist & reviews** — saved items and product ratings
- **Inventory tracking** — per-variant stock, availability surfaced to customers
- **Transactional email** — Handlebars templates in [emails/](emails/), sent via nodemailer from [lib/email.ts](lib/email.ts)
- **Media** — Cloudinary uploads with sharp compression, under the `ramazah/` folder

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI | shadcn/ui + Radix, framer-motion, Lenis |
| State | zustand + React Context |
| Backend | Firebase (Auth + Firestore) / firebase-admin |
| Media | Cloudinary + sharp |
| Email | nodemailer + Handlebars |
| Deployment | Vercel |

## Structure

```
app/
├── admin/           # Admin dashboard (products, categories, customers, orders, analytics)
├── api/             # Route handlers
├── auth/            # Login, signup, password reset
├── categories/      # Category browsing ([...slug] catch-all)
├── checkout/        # Checkout flow
├── product/         # Product detail pages ([slug])
components/          # Shared UI components
constants/           # Store configuration
contexts/            # React context providers (cart, currency)
emails/              # Handlebars email templates
hooks/               # Custom React hooks (useCart, ...)
lib/                 # Firebase, Cloudinary, email, seed script
public/              # Static assets
types/               # TypeScript types
middleware.ts        # Route protection
```

## Rebrand TODOs

- [ ] Replace the placeholder assets in `public/` — logo, banners, and catalog images are still hoodskool artwork under Ramazah filenames
- [ ] Upload a Ramazah logo to Cloudinary and swap the hardcoded URL in the five templates under `emails/` (marked with a `TODO` comment)
- [ ] Update social links (Instagram / X / TikTok / Facebook) in [components/footer/Footer.tsx](components/footer/Footer.tsx) and the email templates — they currently point at `/ramazah` handles that may not exist
- [ ] Update the contact address in [components/contact/ContactInfo.tsx](components/contact/ContactInfo.tsx) (`contact@ramazah.com`)
- [ ] Replace the README screenshots (`ramazah.png`, `ramazah1.png`) — still hoodskool captures
- [ ] Add `public/placeholder-product.jpg` (referenced in code, never present)
- [ ] Review copy across `components/home/` and `components/footer/` — brand voice is still hoodskool's

---

**Built by [Abdurrahman Idris](https://abdurrahmanidris.com)**

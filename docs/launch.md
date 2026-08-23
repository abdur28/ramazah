# Going live

Everything that needs a real value before the shop takes a real order. Grouped by
where it lives, because that is what makes it easy to miss one.

**Deployed at https://ramazah.vercel.app** since 2026-08-23. The Vercel
environment is set, the Vault holds `app_base_url` and `cron_secret`, and the
hourly job has been proved end to end — pg_cron reaching the deployment and the
worker sending. What is left is the dashboard column below, and real values in
Settings.

## In Supabase Vault

The hourly job reads both on every run, so rotating either needs no
rescheduling. Until they exist it raises a warning and does nothing.

```sql
select vault.create_secret('https://ramazah.vercel.app', 'app_base_url');
select vault.create_secret('<the same CRON_SECRET>', 'cron_secret');
```

Both are set. To check the chain rather than wait an hour for it:

```sql
select public.drain_email_queue();
select status_code, left(coalesce(error_msg, content), 90), created
  from net._http_response order by id desc limit 3;
```

## In the hosting environment

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the client |
| `SUPABASE_SECRET_KEY` | the worker reads and writes the outbox with it |
| `NEXT_PUBLIC_BASE_URL` | every link in every email is built from it |
| `CRON_SECRET` | the worker refuses anything else |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | without these the worker refuses the whole run rather than half-sending |
| `AUTH_EMAIL_HOOK_SECRET` | Supabase signs the auth-email hook with it; a wrong value rejects everything, which is fail-safe but silent |
| `CLOUDINARY_*` | image upload |

## In the Supabase dashboard

- **Authentication → Emails → SMTP Settings.** Free tier, and it is what stops
  auth mail going out under Supabase's sender.
- **Authentication → Sign In / Providers → Email → Confirm email.** Currently
  **off**, so no address has ever been verified. On a shop paid by invoice, an
  unverified address is an order that cannot be settled.
- **Authentication → URL Configuration.** Site URL `https://ramazah.vercel.app`,
  and the same in Redirect URLs — without it the OAuth callback and any
  auth redirect bounce.
- **Authentication → Hooks → Send Email Hook** → `https://ramazah.vercel.app/api/auth/email-hook`,
  and the generated secret into `AUTH_EMAIL_HOOK_SECRET` on Vercel, replacing
  the placeholder currently there.
- **Authentication → Emails → Email OTP Expiration.** Must match `OTP_MINUTES`
  in the hook route, because the email states the number.
- **Google sign-in** is still an unconfigured button that returns a raw 400.
  Enable the provider or hide it.

See [auth-email.md](auth-email.md).

## In Admin → Settings

Six tabs. The ones that are wrong rather than merely empty are flagged on the
screen in terracotta.

- **Business** — `rcNumber` is empty and a Nigerian invoice is expected to carry
  it. The registered address still says Alexandria, which is where you buy, not
  where the company is registered.
- **Payment** — bank name and account number are blank. **Nobody can pay you
  until these are set**, and the account name must match the bank letter for
  letter, because a customer compares it against what their banking app shows.
- **Contact** — email, phone, WhatsApp, socials. Anything left blank is hidden
  rather than shown empty.
- **Money & shipping** — VAT, shipping, free-shipping threshold and the delivery
  lead time were all placeholders.
- **Email** — sender name and address, and the reminder cadence.

## In Admin → Pages

Home, FAQ, shipping, returns, terms, privacy, cookies. Each shows the words
written in the code until it is edited, so nothing is broken if you skip one —
but the terms and privacy pages both carry a "still being finalised" note that
should come off once they are not.

## Still outstanding

- **A real sending domain** with SPF, DKIM and DMARC. Sending from a Gmail
  address lands in spam at any volume, and here the invoice *is* how the shop
  gets paid — this matters more than it would elsewhere.
- **Photography.** The home page and the category tiles still fall back to
  Unsplash placeholders wherever an image has not been uploaded.
- **The terms and privacy copy**, reviewed by somebody who knows Nigerian
  consumer law. The placeholders are honest about being placeholders, which is a
  defensible position for now and not one to launch on forever.

## The first hour after deploying

```sql
-- did the schedule fire, and did it reach the deployment?
select status_code, error_msg, created from net._http_response order by id desc limit 5;

-- and did anything actually send?
select template, status, sent_at from email_outbox order by created_at desc limit 10;
```

Place one real order and watch the invoice arrive. That single test exercises the
trigger, the outbox, the nudge, the renderer, SMTP and the settings all at once.

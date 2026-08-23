# Auth email

The five messages standing between a customer and their account — confirm your
address, reset your password, sign in, confirm a new address, confirm it is you.

They are the only mail in the shop we do not compose. Supabase Auth mints the
code, sets its expiry and is the thing that later verifies it; a code we
invented would be a code nothing could check. What it does *not* have to own is
the email, and by default it does: a different typeface, a different sender, and
somebody else's branding on the one message a customer has to act on.

The **Send Email Hook** takes that part back. Supabase hands us the code instead
of posting it, and [`app/api/auth/email-hook/route.ts`](../app/api/auth/email-hook/route.ts)
renders one of the templates in `emails/` and sends it through the same
transport as everything else.

## Why a code and not a link

The email is very often opened on a different device from the one that signed
up — a laptop signup read on a phone — and a link cannot bridge that. Scanners
in front of some inboxes also follow links, consuming a single-use one before
the person ever sees it. A code is typed into the page that is already open.

## Setting it up

**1. Custom SMTP** — Authentication → Emails → SMTP Settings. Available on the
free tier; this is what removes Supabase's own sender. Use the same values as
`EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD`.

Strictly this is belt and braces once the hook is live — the hook sends, so
Supabase's own transport is not used for these five. Set it anyway: if the hook
is ever disabled, this is what the mail falls back to.

**2. Turn confirmation on** — Authentication → Sign In / Providers → Email →
**Confirm email**. It is currently **off** (`mailer_autoconfirm: true`), which
means nobody has ever verified an address and anyone can sign up as anyone. On a
shop whose invoice is how it gets paid, an address nobody owns is an order that
can never be settled.

**3. Set the OTP length and expiry** — Authentication → Emails. Six digits, and
an expiry that matches `OTP_MINUTES` in the hook route (60). The email states
the number, so the two have to agree.

**4. Enable the hook** — Authentication → Hooks → Send Email Hook. Point it at:

```
https://your-site.com/api/auth/email-hook
```

Copy the generated secret — it looks like `v1,whsec_…` — into
`AUTH_EMAIL_HOOK_SECRET`. **`.env.local` currently holds a placeholder**, which
is fail-safe rather than dangerous: a wrong secret rejects everything, so no mail
goes out unsigned.

## The signature

Standard Webhooks, verified in the route rather than through a dependency —
twenty lines in the auth path, where the whole point is that the code can be
read. Three headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`),
HMAC-SHA256 over `id.timestamp.body`, compared in constant time.

Two things worth knowing if you touch it:

- **The body must be the raw text.** Re-serialising the parsed JSON changes key
  order and whitespace, and the signature stops matching.
- **The timestamp is checked** within five minutes. Without that, a signed
  request captured once could be replayed for ever.

## What is deliberately not here

**These do not go through the outbox.** Everything else is queued and drained,
because a delayed invoice is still an invoice. A confirmation code that arrives
after the queue runs is a customer staring at a form. The hook is synchronous by
contract too — Supabase reports our failure to whoever triggered it — so queuing
would mean reporting success for something that has not happened.

**The code is never logged.** It is the one payload in the shop that is a
credential.

**An unknown `email_action_type` is accepted, not failed.** Failing the hook
blocks the auth operation itself, so an action we have no template for would
stop someone signing in over an email nobody needed.

## Checking it

```bash
# templates, against the real files
node -e "…"    # see PROGRESS, 2026-08-23

# contrast on the auth pages
node scripts/check-auth-contrast.mjs
```

In the admin, **Mailer → Notifications** previews all five against a fixed
sample code of `123456` — deliberately not a plausible code, so seeing it in a
preview never makes anyone wonder whether a real one leaked.

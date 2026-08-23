# Progress

Reverse-chronological log of substantive changes. See [PLAN.md](PLAN.md) for what is
next and [database-design.md](database-design.md) for schema decisions.

---

## 2026-08-23 — The words came out of the code

Every sentence on the home page and the six support and legal pages was a string
literal in a `.tsx` file. Correcting "two to three weeks" meant a developer, a
commit and a deploy — for a shop whose delivery time, shipping cost and returns
wording will all move before launch.

`site_content` is one key-value table, and `/admin/pages` edits it. Seven pages:
the home page, FAQ, shipping, returns, terms, privacy and cookies.

**Layout is deliberately not editable.** The pages keep their components, their
section order and their design in code. A page builder would let somebody produce
a page that no longer looks like this shop, which is a bigger loss than the
flexibility is a gain — so only the words and the pictures come from the
database.

**Every read falls back to the code.** `lib/content-defaults.ts` holds the
literals the site rendered before this existed, and `getContent` merges a stored
row over them per-field. So an empty table renders exactly the old site, a
missing key renders the old section, and a row written before a field existed
still gets that field. A page that has never been edited says so in the admin
rather than opening an empty form — which would be a trap, since saving it once
would blank the live page.

"Back to the original" deletes the row rather than writing today's defaults into
it. The point of the fallback is that an unedited page tracks the code, and
freezing a copy would quietly break that the next time the code changed.

The home editor covers five sections: the opening, the two category bands, the
six tiles in the category table, the editorial story block, and the newsletter
invitation — words and photographs in each.

Two things stay out of reach, and the screen says so rather than leaving somebody
hunting. The product rail and the collection band are drawn from the catalogue
and from Collections, so editing their contents here would put two places in
charge of the same words. And **how the six tiles are cut across the grid** —
which is wide, which is tall — stays in code: that composition is what holds the
top half of the page together while the tiles between it change width, and an
editor that could re-cut it could break the page. The names, blurbs and
photographs inside it are editable; the shape is not.

Every photograph falls back to its `constants/demo.ts` placeholder when unset, so
a half-filled row renders a page rather than an empty frame — and a tile whose
slug is not in the layout map still renders, at a default width, rather than
throwing.

`Pages` is back in the admin sidebar. It was removed earlier for pointing at a
route that did not exist; `Settings` is still absent for the same reason.

One thing the build caught: the admin editor is a client component and imports
the defaults to open an unedited page, which dragged `@/lib/supabase/server` into
the browser bundle. The types and defaults moved to `content-defaults.ts`, which
has no server imports.

**Verified**: 16 checks — an untouched table rendering the original words, an
edit reaching the live page and the old words going, the editor recorded, the
hero and a band editable, dropping to one band rendering one, the placeholder
photograph surviving an empty image, a partial row still getting its default
sections, a stranger refused while anyone can still read, and deleting the row
restoring the original.

---

## 2026-08-23 — Email, all three tiers

The shop could not send an email. `sendOrderConfirmationEmail`,
`sendOrderShippedEmail` and `sendOrderDeliveredEmail` had existed in
`lib/email.ts` since the first week and **nothing called any of them** — the only
caller of any mail path in the codebase was the admin mailer. The FAQ's promise,
"you will receive an invoice", had never been true.

**The spine is an outbox, not a call from the browser.** The tempting shortcut is
to hit a mail route after checkout; it is also the wrong one, because the
customer closes the tab, the request never lands, and the order that just took
their money sends nothing — with no record either way, so nobody can answer "I
never got my invoice". Triggers write `email_outbox` rows and a worker drains
them. `dedupe_key` is unique, which is what stops a payment being corrected and
set again from sending three confirmations; reminders are ordinary rows dated
forward rather than a second mechanism; five attempts with a widening gap, then
the row stops and stays visible, because five failures is a problem for a person
rather than for a retry loop.

**29 templates from one layout.** The five that existed were 400–570 lines each
of near-identical hand-written HTML — 2,425 in total — which is why changing the
footer meant changing it five times. One layout, four partials and 29 content
blocks come to 580 lines for six times as many emails. Style B from the two
demos: the shop's cream and sage rather than the invoice's amber, because only
three of the twenty-nine are money documents and amber-and-green on a review
invitation is a shop that only ever writes to you about invoices. The printed
invoice keeps its own identity; it is a different object. Every template has a
hand-written plain-text twin built from the same data — a generated one reads
like debris, and sending none at all is a spam signal.

**Transactional and marketing are now different things.** The old
`orderUpdates` switch let a customer turn off "your order shipped". It now
governs the courtesies — packed, delivered, review invitations — and never the
invoice, the payment confirmation or the dispatch notice. `may_email()` is the
one place that decides, so no template has to remember which it is.

**The unsubscribe page exists.** Four of the five originals linked to
`{{websiteUrl}}/unsubscribe` and it was a 404 — both a compliance problem and the
fastest route into a spam folder, since mailbox providers watch precisely this.
It takes an unguessable token rather than a session, because it gets followed
from a forwarded email on a phone that has never signed in, and it acts on load:
a one-click unsubscribe is what `List-Unsubscribe-Post` promises the mail client,
and making somebody hunt for a second button is how they press "spam" instead.
Order email keeps working afterwards, and the page says so — otherwise the next
message is "why have my invoices stopped".

**nodemailer 7.0.9 → 9.0.5**, closing six high-severity advisories including SMTP
command injection. `npm audit` is clean.

**Campaigns were rewritten too, not restyled.** Reviewing that half turned up
worse than the discount-code field that prompted it. It sent by firing one
`fetch` per recipient straight at SMTP from the browser — no record once the
dialog closed, no retries, no dedupe so pressing Send twice sent twice, a hundred
parallel connections at any real volume, and it stopped halfway if the tab was
closed. It was also **broken**: the templates it named were four of the five
replaced earlier the same day, so a promotion would have rendered the fallback
div rather than an email.

A campaign is now a set of outbox rows with a `campaign_id`, so the record, the
retries and the dedupe all come with it. `send_campaign()` expands a segment and
queues; the worker sends. Pressing Send twice produces two campaigns rather than
two emails to the same person, because the dedupe key carries the campaign id.

Segments replaced the checkbox list — picking people out of a list stops working
somewhere around fifty names, and "everyone who bought in the last ninety days"
is what somebody actually wants to say. The count shown is computed in the
database with opt-out already applied, so the number on the button is the number
that will really be written to.

**The discount-code field is gone.** `discount_codes` is empty and there is no
way to create one in this admin, so a code typed there would be refused by
`create_order` at checkout — the customer would be the one to find out. The
screen says so rather than silently dropping the field.

Three composers of 574 near-identical lines became one, and the mailer page
itself went from 363 lines to 57 because both halves own their own state. The old
send path — `lib/email.ts`, `/api/send-email`, `/api/send-order-email`, the three
composers and `useAdminMailer` — is deleted rather than left as dead code
pointing at a route that no longer exists.

**The mailer became two halves.** Campaigns is what it always was. Notifications
is new and larger: every transactional template grouped by what it is for, a
preview rendered against the most recent *real* order or request rather than
placeholder data, a test send to one address, and the queue itself with retry
and cancel. The dry run renders everything due and sends nothing, which is how
you find out the queue would go out cleanly before doing something
irreversible — and it is what made all of this testable before SMTP credentials
exist.

Two of my own mistakes on the way. `unsubscribe()` declared `returns table
(email text, ...)`, which made every reference to `newsletter_subscribers.email`
inside it ambiguous — and Postgres resolves that at call time, so it failed only
when somebody actually clicked the link. And the outbox status pills used
`--ink-faint` at 2.4:1 and then `--ink-muted` on full `--wash` at 4.48:1; they
use the admin's own `StatusPill`, whose tones are already measured.

**The shop is called Ramazah Store, not Ramazah.** Caught after the first real
send went out. The email header, the From line — which is what an inbox shows in
the sender column, and so the most visible name in the whole system — and seven
subject lines all said "Ramazah". Corrected across 29 templates and swept through
the rest of the app: page titles, meta descriptions, the collections eyebrow, the
packing slip lockup, the unsubscribe page, and the WhatsApp and mailto messages
the admin sends a customer.

**And "Ramazah Group" was not a real company.** It was carried over from the
printed invoice template and had spread to the invoice, the packing slip, every
email footer, the terms — and, worst, to the **name on the bank account customers
are told to transfer to**. A customer comparing that against what their banking
app shows when they type the account number sees a mismatch, and with a manual
payment model that hesitation is the sale.

The registered company is **RAMAZAH GLOBAL EMPORIUM LIMITED**. It now lives in
`COMPANY` in constants alongside the trading name, and the split is by what is
being named rather than by taste:

- **Ramazah Store** where a *brand* is named — the email header, page titles, the
  brand lockup, the copyright line.
- **RAMAZAH GLOBAL EMPORIUM LIMITED** where a *party* is named — the invoice
  (a tax document), the packing slip, every email footer, the bank account, and
  one new section of the terms saying plainly that Ramazah Store is a trading
  name of that company and the contract is with it. A customer needs to know
  which entity they have recourse against, and a trading name does not answer
  that.

Still placeholder: `rcNumber`, which a Nigerian invoice is expected to carry, and
`address` — the invoice says Alexandria, which is the buying end rather than
where the company is registered.

**Still needed before a single real send**: `EMAIL_USER`, `EMAIL_PASSWORD` and
`EMAIL_FROM` are empty, and a real sending domain with SPF, DKIM and DMARC
matters more here than in most shops, because the invoice *is* how the shop gets
paid. A real run refuses cleanly rather than half-sending while they are missing.

**Verified**: 23 checks on the triggers and preferences — a corrected payment
sending one confirmation rather than three, paying cancelling both reminders,
delivery picking the delivered wording over collected, an invoice ignoring
preferences while marketing respects them, unsubscribe working with no login and
a made-up token refused — 29 template renders, 8 through the real pipeline over
HTTP against live records, and 10 end to end on a full order journey.

---

## 2026-08-23 — Analytics catches up with how the shop actually sells

Three changes, one of them a regression I had just introduced.

**A regression.** Making `orders.user_id` nullable meant every staff-raised order
keyed on `null` in the customer aggregate, so all of them collapsed into a single
row labelled "Unknown" in Best Customers — and counted as *one* active customer
between them. Buyers are keyed by account, then email, then name, and carry a
`hasAccount` flag so a WhatsApp buyer appears as themselves rather than being
folded into an account they do not have. `activeCustomers` counts accounts that
have ordered, which is what the percentage beside it claims; the people with no
account get their own figure instead of quietly distorting it.

**Where orders come from.** Until staff could raise one, a website order was the
only kind that could exist, so there was nothing to split by. Now the Orders tab
carries a channel breakdown — the panel that says whether the totals above
describe the business or only the part of it with a checkout. Revenue there means
settled money, as it does everywhere else on the screen.

**Requests, measured at all.** The analytics screen had four tabs and none of them
knew requests existed — for the service the business leads with. The new tab
splits the two queues that matter, because they are owned by different people:
*waiting on you* is unquoted, *waiting on them* is quoted and unanswered, with the
value of each. The acceptance rate counts only quotes that got an answer either
way — counting the ones still open as refusals would make the rate fall simply
because a quote went out this morning. And it says how long the oldest open
request has waited, since deliveries here run in weeks and the clock a customer
feels starts at the question, not at the parcel.

Also removed: `loadOrders` still selected `payment_method`, dead since the method
breakdown went; and the Best Customers rank divided any RUB figure by 90, a
hoodskool leftover for a currency this shop has never taken. It ranks on Naira.

**Verified**: 6 checks on the aggregates against live data — channel revenue
matching its settled orders exactly, web counted separately, no null key in the
buyer map, every off-site buyer a separate named row, none labelled "Unknown",
and active customers still counting accounts rather than everyone who bought —
plus 5 on the requests aggregate.

Two of the first run's assertions failed and both were wrong in the test, not the
code: they assumed only one WhatsApp order existed, and `RMZ-01011` — a real
order raised through the new screen while this was being written — was correctly
in the data, paid, with its three catalogue lines having moved stock exactly as
designed.

---

## 2026-08-23 — Orders for people who are not on the site

Most of this shop's selling happens on WhatsApp: a message, an agreed price, a
transfer. None of it existed in the database — so the invoice went out as a
photograph of something typed by hand, stock described only website sales, and
the payments screen reported a minority of the business as if it were all of it.

Built as a **real order**, not a document generator. A generator would have meant
a second invoice implementation — two versions of what is owed — a second
numbering scheme competing with `order_number`, which is also the payment
reference, and goods leaving the shelf with nothing recording it. As an order,
the order page, the invoice, the packing slip, the status ladder, the payment
guard and the audit history all work on it unchanged, with no new document code.

The schema was most of the way there already: `order_items.product_id` and
`variant_id` have always been nullable, so a line for something that was never in
the catalogue is representable, and the customer's name, phone and email have
always lived on the order rather than being read from a profile. Two things were
in the way — `user_id` and `customer_email` were both NOT NULL. Plenty of
customers here have a phone number and no email at all, and requiring one only
produces invented addresses.

`orders` gained `placed_by` and `channel` (`web` / `whatsapp` / `phone` /
`in_store`), and staff-raised orders carry a chip in the list so it is obvious
which is which.

`create_manual_order()` is deliberately not `create_order`. That one is the
customer's path and reads prices from the catalogue, refusing to trust the
client — exactly right when the client is a browser. Staff need the opposite in
two places: a line for something never in the catalogue, and the price that was
actually agreed rather than the one on the shelf today. Catalogue lines still
default to the database price, so the common case cannot be fat-fingered.

No stock check on creation, on purpose. On a WhatsApp sale the goods have often
already changed hands, and refusing to record it would leave the shop with a sale
it cannot represent. Stock still moves when the order is marked paid, and a
shortfall surfaces then — which is the right moment for someone to go and count
the shelf.

**A bug this would have hit immediately.** `sync_order_stock` looped over every
line and updated `product_variants` by id, and `inventory_movements.variant_id`
is NOT NULL — so the first manual order with a one-off line would have failed to
be marked paid at all. Both loops now skip lines with nothing to move, and the
test covers a mixed order in both directions.

**Verified**: 20 checks on the RPC — an ownerless order raised and invisible to
customers, the same number sequence as the website, a catalogue line priced from
the database and a free line standing alone, idempotency returning the first
order rather than a second invoice, and every guard — plus 13 more end to end on
the hardest shape (in-store collection, no address, no email): the invoice query,
the packing slip query still fetching no price column, the history, settling it,
and only the catalogue line moving stock.

One process note, and a correction to my own housekeeping: a reconciliation of
every variant against `seed.sql` found two drifts. Three movements dated today
against RMZ-D1004 — a seeded order that never legitimately moved stock — left
`RMZ-VEIL-01-BLK` one unit high. Both removed. `RMZ-COF-01-1KG-W` is two units
below its seed value with no movement explaining it and no date to attribute it
to, so it has been left alone and flagged rather than silently "corrected".

---

## 2026-08-23 — Requests reviewed, and seven things fixed

A review of the sourcing feature, both sides. The structure held up — RLS,
column grants, a SECURITY DEFINER RPC for the staff-owned fields — but seven
defects came out of it, each confirmed against the database rather than read off
the code.

**A customer could rewrite a request after it was quoted.** The update policy
allowed it at any status and the grant covers `item` and `quantity`, so
"Hibiscus tea, 1kg" quoted at ₦24,000 could become "A gold bar ×50" still quoted
at ₦24,000. Editing now stops the moment there is a price against it — refining
what you asked for is normal *before* anyone has looked, and part of the deal
after.

**The customer had no way to answer.** The dashboard said "Reply to accept and
we will buy it on the next run" and there was nothing to reply with: no button,
no link. They could not withdraw one either. That is the whole point of the
feature — getting this conversation out of WhatsApp — and the customer's half was
still in WhatsApp. `request_status` gained `accepted` and `withdrawn`, and
`answer_request()` lets the owner say yes or no. No haggling: a quote is answered
yes or no. Withdrawing stops once the shop has spent money.

**Budget and quote were mislabelled in another currency.** `formatPrice` swaps
the symbol and does no conversion — there are no rates in this app — so a Naira
budget rendered as "$24,000" for anyone who had switched the site to USD, while
the admin showed the same figure in Naira. Requests are quoted in Naira and now
say so on both screens.

**A failed load told the customer they had no requests.** The error was dropped
and the empty array rendered, so a dropped connection read as "No requests yet"
and they would reasonably send it again.

**Staff could never clear a note or a quote.** `coalesce(p_quote, quoted_amount)`
reads null as "leave it alone", so emptying the note box reported success and
changed nothing while the customer went on reading it. The admin form seeds both
fields from what is stored, which makes direct assignment the honest rule: what
is on screen is what is saved, including when you have emptied it. The
amount-required check for a quote moved into the database at the same time.

**A zero quote read as no quote.** `row.budget ? Number(row.budget) : null` turns
a stored `0` into an absence.

**`reference_url` accepted any scheme.** React blocks `javascript:` at render and
browsers block top-level `data:` navigation, so it was not script execution — but
an arbitrary scheme or host behind a link the admin reads as "their reference" is
not something to hand staff. Only http and https are stored now, and a bare host
gets `https://` rather than being rejected, because that is what people paste.

Also: the status tabs carry counts, as the orders list does — a queue you have to
click into to find out is empty is not a queue.

**Verified**: 12 checks — an open request still editable and a quoted one frozen,
notes cleared by emptying them, a quote refused without an amount, zero surviving
the mapper, accept refused before there is a quote and allowed after, withdraw
allowed while open and refused once buying, nobody able to answer somebody
else's request, and a customer still unable to set a status directly.

---

## 2026-08-23 — Customers got a page

The customer dialog had two tabs, and most of what matters about a customer here
fitted in neither.

**Sourcing requests were absent entirely.** "Tell us what you need and we'll do
the rest" is the service this business leads with, and the admin's customer
record showed no sign of it — so the screen could not tell a buyer from someone
who has asked for six things and bought none of them. They are on the page now,
with what was quoted and where each one has got to.

**Reviews were a count.** A number answers nothing: what staff need is what this
person actually said, and whether any of it is still sitting unapproved. The rows
are there, with the product, the rating and the moderation state.

**The orders were dead text.** Eleven order numbers you could read and not open.
Each one links to its order.

**Role and suspension lived in a row dropdown**, three clicks from any context
that would tell you whether using them was right. They sit under the order
history now, which is what you want to look at before suspending someone. The
list's dropdown and its two confirmation dialogs went with them — about 150 lines
— and rows became links, which is also how the orders list works.

The guards stay in the database, not the screen: an admin cannot demote
themselves, suspend themselves, or demote the last remaining admin. The page
greys the first two so the refusal is visible before the click, but `set_user_role`
and `set_user_status` are the boundary — a check in React only protects the button.

Wishlists are still deliberately absent, and the page now says so rather than
leaving a reader wondering. `wishlist_items` is owner-only in RLS with no admin
clause, unlike orders and addresses, and that is the right line: staff should see
what someone bought, not what they are considering.

`getCustomerDetail` takes an email as well as an id, because the newsletter table
is keyed by email — anyone can subscribe from the footer without an account, so
there is no user id to join on.

**Verified**: 13 checks as a signed-in admin — every query the page runs, the
lifetime-spend rule counting only settled and unrefunded orders, both self-guards
still refusing, suspend and reinstate working on somebody else, and wishlists
staying out of reach even for an admin.

---

## 2026-08-22 — Payments stay manual, and stock follows the money

The shop takes no card payment and should not: an order raises an invoice and
the customer settles it by bank transfer, which is how the business already
works on WhatsApp. What was missing was everything that makes that model
actually function.

**Stock moved at the wrong moment.** `create_order` decremented at the instant
an order was written, so every unpaid order — including the ones never paid —
held goods off the shelf indefinitely, and the shop's stock figures described a
warehouse it did not have. With transfer settlement that window is days.

Moving the decrement is the easy half. The hard half is that payment status gets
set more than once: paid, corrected to unpaid, paid again. Hooking the
transition would take stock three times. So nothing hooks transitions. There is
one rule —

> stock is held exactly when an order is paid and not cancelled or refunded

— and `sync_order_stock()` compares that against `orders.stock_committed`,
acting only on a difference. Called after any status or payment change it is
idempotent by construction, and it handles paths a transition hook would miss:
cancelling a paid order returns the goods, un-cancelling one that is still paid
takes them again. Marking paid when stock is short raises, and the exception
rolls the payment back with it — an order cannot be settled for goods the shop
does not have.

Why *paid* and not *shipped*: `stock_count` does double duty here, gating both
"in stock" on the storefront and `create_order`'s own check, so it has to mean
available-to-sell. Dropping on shipped would leave a window between payment and
dispatch in which the site sells the same item again — and with transfers, that
means two people have paid for one thing.

**The confirmation page did not exist.** `CheckoutPage` has always finished with
`router.push('/checkout/success?orderId=…')` and `app/checkout/` held one file,
so a customer placed a real order — stock checked, cart cleared — and was shown
a **404**. It reads as though the order failed. `/checkout/success` now confirms
the order and, more importantly, says how to pay: account details, the order
number as the reference, both with copy buttons because both get typed into a
banking app by hand. The button no longer says "Proceeed to payment"; it says
"Place order", with a line above it explaining there is no card step.

`PaymentInstructions` is shared between that page and the customer's own order
screen, which previously printed "Payment Status: pending" and nothing else — so
anyone who closed the confirmation had no way back to the account details except
to ask on WhatsApp. One component, because the account number is the one string
on this site where a stale copy costs real money. It renders nothing once an
order is settled, so a paid order never invites a second payment.

**Payment method is gone from the admin.** Every order settles by transfer
against the invoice, so the field held one value worth having — and cash on
delivery, the only other thing it could say, is not something the shop
reconciles from a screen. A column with one real value makes every breakdown
built on it a lie, so the "How customers pay" donut, the method filter, the
method column and the CSV field all went with it.

`BANK_DETAILS`, `DELIVERY_LEAD_TIME` and `SUPPORT_WHATSAPP` are placeholders in
`constants/index.ts` and are the first thing the planned admin settings screen
should take over.

**Payment is no longer a dropdown.** Idempotency stops the arithmetic breaking
when someone marks an order paid, unpaid and paid again — but it does not stop
them *doing* it, and it says nothing about who or why. Payment status sat in the
same control row as the courier, so recording money — the one action that now
moves stock — was as easy to click as fixing a typo.

`order_payment_history` records every change with an actor. Undoing a settled
payment requires a stated reason, refused by the database, not just the form.
And once an order has shipped or been collected, undoing it is refused outright:
the goods are gone, so either the money went back — a refund, a real and
different event — or the customer owes for something they already have, which
changing a status does not fix.

On the screen, payment has its own card above fulfilment, with the amount, the
state, and one primary action. Each reversal is a separate quieter button that
opens a confirmation naming its consequence, and the reason box is required
before the confirm will fire. `order_history()` now merges fulfilment and
payment into one chronological timeline under a `kind` — they are one story, and
two panels leave the reader interleaving timestamps by hand.

The payments screen was also carrying a bug of my own making: removing the
Method column left five headings over four cells, so Amount printed under
"Method". The slot now holds **Waiting** — how long an unpaid order has been
unpaid, in days, going terracotta past a week. That is the only figure anyone
acts on in a shop paid by transfer, and "Failed", which is almost always zero
here, gave up its stat card to the longest outstanding wait. Rows link to the
order they belong to rather than to the unfiltered list.

**Verified**: 20 checks on the payment guard — undoing with no reason refused
and the order left settled, whitespace not counting as a reason, the reversal
recorded with actor and direction, re-setting the same status recording nothing,
a shipped order refusing to be marked unpaid while still accepting a refund, and
a customer able to read their own payment record but neither write one nor call
the RPC — plus 8 on the payments screen's data. And 15 checks on the stock rule — placing an order takes nothing, paid
takes it, paid twice takes nothing more, unpaid returns it once, five
paid/unpaid cycles leave stock exactly where it started, cancelling a paid order
returns the goods, un-cancelling takes them again, every movement lands on the
ledger and nets to the hold, and a shortfall refuses the payment and rolls it
back — plus 9 on the order-to-confirmation flow including RLS on a guessed order
id.

One process note: `supabase-js` returns `{ error }` rather than throwing, so two
test cleanups failed silently and left two demo orders drifted. Both were caught
and restored to their exact pre-session state. Cleanup blocks now check errors.

---

## 2026-08-22 — Orders could not be moved at all

Found while rebuilding the admin's order screen, and it is the whole story:
**no admin had ever been able to change an order's status.** Every attempt died
with `permission denied for table order_status_history`.

`log_order_status()` writes an audit row on every transition. It was a plain
invoker-rights trigger function, and `authenticated` holds only SELECT on
`order_status_history`, so the insert was refused and took the enclosing UPDATE
with it. Setting a courier or a tracking number worked, because only `status`
fires the trigger — which is exactly why this survived: it looked like a
half-working screen rather than a broken one. Every order in the database
reached its status through seeding on the service key.

The trigger is `security definer` now. An audit trail the acting user can refuse
to write is not an audit trail, and that is the standard shape for one.

**The dialog became a page**, `/admin/orders/[id]`. Three things a dialog could
not carry, all of which matter more than the space it saved: the audit history,
a thread of staff notes, and the invoice. It is also nowhere — it cannot be sent
to whoever is packing the parcel, and it loses everything on a refresh.

New on it:

- **A reason for every move.** `order_status_history.note` has existed since the
  first migration and nothing ever wrote it, so the trail could say an order went
  from processing to cancelled but never why — which is the only part anyone
  needs three weeks later. The note travels to the trigger through a
  transaction-local `set_config`, so concurrent changes on other orders cannot
  pick up each other's notes.
- **The history itself**, with who did it. `changed_by` was written from the
  start and never displayed, because resolving a name meant a query per row;
  `order_history()` joins `profiles` once. Unlike the customer's four-step
  ladder this shows moves backwards, repeats and cancellations — what someone
  actually looks for when an order has gone wrong.
- **Staff notes** — `order_notes`, a table rather than a column on `orders`,
  because RLS is row-level and "own orders readable" hands a customer their whole
  row. A `staff_notes` column would go straight to the person it is written
  about. Several timestamped notes rather than one blob: "customer rang, wants it
  held until Friday" and "courier lost the first parcel" are two facts with two
  dates.
- **A packing slip**, at `/admin/orders/[id]/packing-slip` — the document that
  goes in the box, monochrome and hairline-ruled rather than the invoice's
  amber-and-green, because it is photocopied, written on and read across a
  packing table. Tick boxes per line, quantities set large, "packed by" and
  "checked by" rules to sign, and **no prices anywhere**: the packer does not
  need them, and a large share of these orders are gifts sent straight to the
  recipient. The route's select does not fetch a price column at all, so the page
  cannot print one by accident. It borrows `.invoice-sheet` for the A4 print
  rules and overrides only the paper colour.
- **The invoice**, at `/admin/orders/[id]/invoice` — the same `InvoiceView` the
  customer sees, deliberately. Ramazah takes no card payment, so the invoice *is*
  the payment instrument and two versions of it is two versions of what is owed.
  What differs is the gate: `requireAdmin` rather than RLS on one's own order, so
  staff can print for any order, which is how it gets sent over WhatsApp today.
- **The next step as a button.** Almost every change an order sees is the obvious
  one, and making that a two-control operation is how a screen ends up slower
  than a chat thread.
- **WhatsApp** alongside mail and phone, since that is where this business
  actually talks to customers.

Two more bugs fixed on the way. `useAdminOrdersData` carried a "local copy of the
orders mapper, kept in sync with `lib/orders.ts`" that was not: it never mapped
`shippingAddress`, so **every delivery order in the admin claimed "No address
recorded"** while the address sat in the row. The copy is deleted; both paths use
`mapOrder`. And the client stamped `shipped_at` and `delivered_at` itself with no
branch for `picked_up_at`, so an in-store collection recorded no collection time
— `set_order_status()` stamps the right one, and never re-stamps one already set.

**Verified**: 17 checks on the migration (the transition that used to fail, notes
on and off a transition, timestamps stamped once and not twice, in-store
collection taking `picked_up_at` and not `delivered_at`, both admin guards, and
staff notes unreadable and unwritable by a customer), 12 more on the page's own
data paths including the invoice query and the address the old mapper lost, and 8
on the packing slip — among them that neither the order select nor the line items
carry a price column.

---

## 2026-08-22 — A product belongs to several collections, and one goes on the home page

`products.collection_id` was a single column, so collection membership was
last-write-wins: seeding a Cairo run and then a Ramadan table silently moved the
dates and the coffee out of the run. Nothing was lost by accident — the model
only had room for one answer.

That is the wrong shape for how this shop groups things. A collection here is
either a **buying run** ("everything from the March trip") or an **occasion**
("Ramadan table"), and those overlap by their nature: the same tin of coffee came
back on the March run *and* belongs on the Ramadan table. Categories are a tree
and stay single-valued; collections are curation and have to be many.

`product_collections (product_id, collection_id)` replaces the column, which is
**dropped** rather than kept alongside — two places recording the same fact is
how they drift. Everything that read it moved: `product_listing` now exposes
`collection_slugs` / `collection_names` as arrays (PostgREST filters them with
`cs`), and `filter_products`, `product_facets` and `collection_summaries` take an
existence check against the join table instead of a left join.

The admin's collection picker became multi-select — chips under the trigger, each
removable — and the product page writes "Part of A · B" rather than picking one.
`writeCollections()` in the products store is delete-then-insert: the set is a
handful of rows on a table that is nothing but the pair, so a diff would be more
code for no fewer round trips.

**The home page picks one, explicitly.** `is_featured` arrived meaning "one of
the two or three worth the front page", and then the design settled on a single
full-bleed band. A flag that permits three while the page renders one leaves the
other two set and invisible — the shopkeeper ticks a box and nothing happens. So
the flag now means what the page does: a partial unique index on a constant
(`on collections ((true)) where is_featured`) allows exactly one row to carry it,
and `set_home_collection(uuid)` moves it, clearing the previous one in the same
transaction so the index never sees two. Passing null shows no band at all.

Admin > Collections gained a summary card naming the current one, a badge on its
banner, and a "Show on the home page" control on every card that behaves as a
radio rather than a switch. Empty collections cannot be chosen: the band renders
nothing without products, which would read as the setting having failed.

Two things only running it caught. Table privileges are **explicit** in this
project rather than inherited from default privileges, so a new table starts with
none — the policies were right and every admin write still failed with
"permission denied for table product_collections" until the grants were added.
And `set_home_collection()` guards on `is_admin()`, which reads `auth.uid()`; the
seed script runs on the service key with no signed-in user, so it sets the flag
with two plain updates and says why in a comment.

`getFeaturedCollections(limit)` became `getHomeCollection()`, and
`admin_collection_counts()` replaced tallying every product's `collection_id` in
JavaScript — with a join table that would mean fetching the whole table to group
it.

**Verified**: 14 checks as an anonymous visitor (overlap kept on both sides, the
dropped column really gone, `contains()` and `filter_products` agreeing at 4 and
3, no duplicate rows for a product in two collections, exactly one featured row,
the unique index and both guards refusing) and 11 as a signed-in admin (setting,
clearing and restoring the home pick, an unknown id refused, one product into two
collections and back out, cascade on collection delete leaving the product).

---

## 2026-08-22 — Collections became somewhere to go

The table, `products.collection_id` and four admin files — 904 lines — have
existed since the first migration, and **nothing on the storefront ever rendered
one**: no route, no link, no mention. Zero collections existed and zero products
were in one, while all thirteen carried tags. A collection was strictly worse
than a tag: the same grouping, plus the admin work, minus any way to reach it.

Kept rather than deleted, because of what a collection is *for* in this shop
specifically. It buys in **runs** — a trip to Cairo comes back with veils, coffee
and brassware together — and that cuts across every category, so no category can
represent it. A tag cannot either, because a tag has no page. A collection is a
link you can send, which for a business that sells over WhatsApp is the point.

`filter_products` already scoped by category path and by search, so a collection
joined them as a third scope rather than getting its own query — the page then
reuses the same rail, sort, grid and pagination.

New: `/collections`, `/collections/[slug]`, a rail on the home page (which
renders nothing when nothing is featured), a "Part of …" line on every product
that belongs to one, and Collections in the menu. `collections` gained
`sort_order` and `is_featured`; `collection_summaries()` carries product counts
so an empty collection is visible on the index rather than after opening it. The
admin's warning banner is gone and its "View on shop" link is real.

A mistake worth recording: adding `p_collection` to `filter_products` and
`product_facets` created an **overload** rather than replacing them. Both
signatures then existed with defaults on every argument, so Postgres could not
choose — `filter_products()` failed with "is not unique" and PostgREST resolved
unpredictably. Caught it because the category and search checks, which had been
passing all session, suddenly failed. The old signatures are dropped explicitly
now.

`npm run seed-collections` (`--clean`) adds The Cairo Run and The Ramadan Table.
At this point a product belonged to one collection at a time, so the overlap
between the two resolved to whichever was written last — see the entry above for
the join table that fixed it.

**Verified**: 14 checks as an anonymous visitor — collection scoping, combining
with search and with facets, paging, `total_count`, no draft leaking — plus
explicit checks that category pages, search and category facets all return
exactly what they did before.

---

## 2026-08-22 — Search matches the way people type

`q=co` returned nothing. `websearch_to_tsquery('english','co')` looks for the
lexeme "co" and no product contains that word, so someone typing the first two
letters of "coffee" got an empty page — in a dialog that searches as you type,
which means it was empty for most of the typing.

**Every word is a prefix match now**, through `search_query(text)`: input is
split on non-alphanumerics, each term becomes `'term':*`, and all are required —
"ground co" means ground AND co*, which is what narrowing a search should do.
Terms are quoted before they reach `to_tsquery`, which otherwise reads `&`, `|`,
`!` and `:` in user input as operators and raises a syntax error on anything
with punctuation in it.

**Tags, SKU and item type are indexed.** The vector covered name, summary and
description only, so the tags the admin collects — 'ramadan', 'gift', 'spice' —
were invisible to search. Tags now sit at weight B beside the summary, and SKU
and item type at D, so someone who knows the code can type it.

Rebuilding a generated column meant dropping it and its index, and
`array_to_string` is declared STABLE rather than IMMUTABLE — true in general,
false for `text[]` — so a `text_array_to_string` wrapper asserts what is actually
the case. Without it the tags could not be part of a stored vector at all.

A bug found while testing awkward input: `q=!!!` returned the **whole
catalogue**. The guard treated "no search asked for" and "searched, but nothing
searchable in it" as the same thing. A blank query is a category page with no
term and everything passes; "!!!" parses to no terms and is a miss.

```
q=c  8 · q=co 4 · q=cof 2 · q=coff 2 · q=coffee 2
```

**Verified**: prefixes at every length, tags and tag prefixes, SKUs, two-word
AND, misses, punctuation-only, empty, quotes and tsquery operators, search
combined with a facet and with a category, paging without repeats, facets
following the search, and no draft ever surfacing.

**Not searchable: variant option values.** "250g" finds nothing. A generated
column cannot read another table, so that needs a trigger-maintained vector —
real write amplification for something the filter rail already does precisely.
Left deliberately.

---

## 2026-08-22 — Search has somewhere to go

The navbar dialog showed six ranked matches and then the line "refine to
narrow" — a dead end, on a catalogue that will not stay small.
`search_product_ids()` had always ranked the whole thing; nothing rendered past
the sixth row, and there was no `/search` route to render into.

**`/search` reuses the category rails.** Rather than a second filtering
implementation, `20260823000017_product_search.sql` generalises the two category
functions so both `p_path` and `p_search` are optional and a caller supplies
whichever scope it has:

- `product_facets(path, search)` — axes and counts for a shelf, a search, or both
- `filter_products(path, search, options, tags, min, max, currency, in_stock, sort, limit, offset)`

So a search result set gets the same axes, the same counts, the same paging and
the same sorts as a shelf, because it *is* the same query. `relevance` joins the
sorts and is the default when there is a term — someone who typed "coffee" wants
the best match first, not the newest. `category_facets` stays as a thin wrapper
so nothing broke while the app moved across.

The results page uses the same `CategoryFilter`, `CategorySort`, `CategoryGrid`
and `CategoryPagination` components, not lookalikes — one place to fix either,
and a shopper who has filtered a shelf already knows how to filter a search.

Empty states differ though, because they mean different things: an empty shelf is
something not stocked yet, an empty search is usually a spelling or a word the
catalogue does not use. The search one says so and offers somewhere to go.

**The dialog** now sends you there — a footer link, Enter when nothing is
highlighted, and Cmd/Ctrl+Enter to skip past the first result. It also no longer
swallows Enter when there are no matches at all.

**Verified** against the live catalogue as an anonymous visitor: search alone,
search narrowed by a facet, a category and a search together, paging without
repeats, a miss returning nothing rather than erroring, an empty query being the
whole catalogue rather than a crash, and no draft ever surfacing.

---

## 2026-08-22 — Quick-add for every product; filtering moved to the database

### The card's quick-add dialog

It understood Size and Colour and nothing else, so a product on the generic
option model — which is most of this catalogue — was pushed to the product page
instead of being added from the grid.

It now renders `VariantSelector`, the same component the product page uses,
rather than a second implementation of the same idea. A card and a product page
can no longer disagree about which combinations are buyable, and the price in
the dialog follows the variant being chosen. `ProductCard` lost 122 lines.

### Filtering happens in the database

`20260823000015_category_filtering.sql` adds two functions that share one
filter, so the rail and the grid agree by construction:

- `category_facets(path)` — the axes and their product counts, for the shelf and
  everything beneath it. Counted per product, not per variant: "products you can
  buy in 250g", not "variants that are 250g".
- `filter_category_products(path, options, tags, min, max, currency, in_stock)` —
  ids, narrowed. Within an axis any chosen value matches; across axes all must.

A bug found while testing: grouping the facets by option *position* as well as
value split "250g" into two rows whenever two products listed it at different
positions in their own option sets, each carrying part of the count. Grouped on
axis and value alone now, with the positions kept only to order by.

**Filters live in the URL.** `?Weight=250g,1kg&Grind=Ground&max=6000` — so the
route reads them, the database narrows, and the page renders the answer. They
are shareable and the back button works, neither of which was true of React
state. The toolbar's "n of m" now counts the shelf rather than the page.

**Verified** against the live catalogue, through the URL and through the RPCs as
an anonymous visitor: 8 unfiltered, 2 for Weight=250g, 3 for 250g or 1kg, 1 for
250g and Ground, 4 under ₦6,000, 0 for an impossible pair — and the filter and
`product_listing` agree on what is public, so nothing draft leaks through.

### Paged, twenty to a page

`20260823000016_category_pagination.sql` takes `p_sort`, `p_limit` and
`p_offset`, and returns `total_count` on every row through a window function
rather than a second query — so the count and the page can never disagree about
the filter.

**Sorting had to move with it.** It ran in the browser over whatever was on the
page, and sorting twenty rows client-side would show the cheapest of page one
rather than the cheapest on the shelf. It is `order by` in the same query now,
with a null price sorting last either way — a product with no price in the
currency being shown cannot be bought, so it does not deserve the top of a
cheapest-first list — and a tiebreak on `created_at, id` so paging never repeats
or skips a row.

Page and sort join the filters in the URL, and changing a filter resets to page
one: staying on page 4 of a result set that now has two shows nothing. The
control is links rather than buttons, so the back button walks the pages and a
crawler can reach every product on a long shelf. It windows to
`1 … 4 5 6 … 20`, keeping a steady width whether a shelf has three pages or
ninety, and renders nothing at all below two.

**Verified** by temporarily setting the page size to three against the eight
products in Food & Pantry: pages of 3, 3, 2 in alphabetical order across the
whole shelf, a fourth page empty rather than erroring, and the control absent
again at twenty per page.

---

## 2026-08-22 — The category filter reads the catalogue

The filter rail offered Size, Colour, Tags and Materials — the axes of the
streetwear shop this codebase came from. The catalogue's actual axes are Weight,
Grind, Flavour and Colour, so on every food page it gathered `product.sizes` and
`product.colors`, got empty arrays, and rendered a filter panel with no filters
in it. A rail with nothing in it reads as a broken page.

It derives from `product.options` now — the generic model `mapProduct` builds
from the variants, the same one the variant picker and the rebuilt product form
use. A coffee shelf offers **Weight** and **Grind**, a veil shelf offers
**Colour**; neither is a special case in the code any more. Colour values still
render as swatches when they carry a hex, with the name beside them, because
colour alone never carries meaning here.

Three details worth keeping:

- **Every value carries a count**, so a shopper can see a filter would empty the
  grid before clicking it.
- **Axes with a single value are dropped** — they cannot narrow anything.
- **Values keep the order they were entered in**, following
  `product_option_values.position`. Sorting puts 1kg before 250g alphabetically
  *and* numerically, and neither is how anyone lists weights.

Within an axis any ticked value matches; across axes all must. "250g or 1kg" and
"250g and Ground" are both what they look like.

Two bugs found alongside: the rail's price slider, the price sort and the max
price all read `prices[0]` — whichever currency row the database returned first —
rather than the one being displayed. They go through `useCurrency` now.

Also from the plan: shelf chips on a category page carry product counts, counted
the same way the page counts so a chip reading 4 and a page listing 4 agree; and
an empty shelf no longer says "Try adjusting your filters" when no filter is set.

**Verified** against the live catalogue: the food rail offers Weight (6 values),
Grind and Flavour; the veil rail offers Colour; neither offers Size. Filtering
Weight=250g narrows 8 products to 2, and adding Grind=Ground narrows it to 1.

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

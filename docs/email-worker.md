# Sending the queued email

Nothing in the app sends an email directly. Triggers write rows to
`email_outbox` and a worker drains them — that is what buys a record, retries and
dedupe (see [PROGRESS](PROGRESS.md)).

There are two ways a queued row gets sent, and the distinction is the whole
design.

**A nudge**, immediately after whatever caused the email — for the messages
somebody is actually sitting waiting for. Three mechanisms, because the caller
differs:

| Where | How | Sends |
|---|---|---|
| Confirmation page, auth callback | `after()` + `drainOutbox` | the invoice, `admin_new_order`, `welcome` |
| Admin screens | `nudgeMailer()` → `/api/email/worker` | payment, dispatch, quote, review published |
| Customer screens | `nudgeMyMail()` → `/api/email/nudge` | their own request acknowledgement |

`/api/email/nudge` exists because a customer must not be able to call the worker:
draining the whole queue on demand would let anyone mail every customer at once.
It reads the caller's own address from their session and sends **only rows
addressed to it**, so the worst anybody can do is receive their own email sooner.
It also skips the scheduler — a customer hurrying an acknowledgement is not the
shop's cron.

Everything else waits for the schedule, which is correct. A campaign to three
hundred people should not fire inside a button click, and being suspended is not
improved by hearing about it four seconds sooner.

**The schedule**, for everything else: the payment reminders dated days out, the
quote nudge, the review invitation, the abandoned basket, the morning digest.

The nudge is an *accelerator, not a second path*. The row is written and durable
before it runs, so if a nudge fails — the tab closed, SMTP was slow, the process
died — the row is still `queued` and the next scheduled run sends it. That is the
difference between "instant instead of queued", which is fragile, and "queued,
then nudged", which is not.

It also means the schedule is a safety net rather than the critical path, which
is why hourly is enough.

## In production

**`pg_cron`, in Supabase, hourly.** Not Vercel cron — Vercel's Hobby plan fires a
cron once a day, which cannot meet the requirement below, and putting the
schedule in the database keeps it independent of which hosting plan the shop is
on. `vercel.json` is left without a `crons` block on purpose; add one there
instead if you move to Vercel Pro and prefer its dashboard.

Set two values in Vault once, by hand — a migration must not carry a secret:

```sql
select vault.create_secret('https://your-site.com', 'app_base_url');
select vault.create_secret('<CRON_SECRET>',         'cron_secret');
```

`public.drain_email_queue()` reads both on every run, so rotating either needs no
rescheduling. Until they are set it raises a warning and does nothing, rather
than failing quietly.

Check it is running:

```sql
select jobname, schedule, active from cron.job;
select status_code, error_msg, created from net._http_response order by id desc limit 5;
```

Two things it still needs:

- **`CRON_SECRET`** in the project's environment variables. The route accepts a
  `Bearer` token matching it, or a signed-in admin. Without one of those it
  returns 401 — an open endpoint would let anyone on the internet drain the queue.
  Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once the
  variable exists.
- **`EMAIL_USER` and `EMAIL_PASSWORD`.** Without them the worker refuses the
  whole run rather than half-sending, and says so in `errors`.

## Keeping Supabase awake

Free-tier Supabase projects pause after about a week with no activity, and a
paused project runs no cron — so the schedule stops exactly when nobody is
watching.

A shop with customers never gets near that. Between now and launch it might, so:

- **The hourly job largely solves it by itself.** `drain_email_queue` calls the
  deployment, the deployment reads and writes the outbox with the service key,
  and that inbound request is real database activity. The loop keeps itself warm.
- **An uptime monitor pinging the homepage does it too** — every page load runs
  `getStoreNavigation()`, which is a real query. cron-job.org and UptimeRobot both
  do this on a free tier.

Neither is a substitute for checking. Supabase emails before it pauses a project,
and the dashboard shows the state; if the shop has been idle for a fortnight,
look before assuming the reminders went out.

Hourly is enough because nothing time-critical depends on it: the invoice, the
payment confirmation and the dispatch notice are all nudged the moment they are
queued. The schedule exists for dated work and as the net under a failed nudge.

It also matters for cost. **Vercel's Hobby plan allows two cron jobs and triggers
them once a day**, and its terms are for non-commercial use — a shop taking real
orders is neither. On a daily trigger the reminders would still work; only their
timing would drift. Verify the current limits at vercel.com/pricing rather than
trusting this paragraph.

`pg_cron` in Supabase is the alternative: free, any interval, and it lives in the
same database as the outbox. Both extensions are available in this project.

## In development

There is no cron. Two ways to send:

- **Admin → Mailer → Notifications → "Send the queue".** Also shows what is
  waiting, what failed and why.
- **Curl**, which is what the cron does:

  ```sh
  curl -X POST "http://localhost:3000/api/email/worker" \
    -H "authorization: Bearer $CRON_SECRET"
  ```

  Add `?dry=1` to render everything due and send nothing — the fastest way to
  find a template that throws on a real record.

## Reading a run

```json
{ "claimed": 2, "sent": 2, "failed": 0, "skipped": 0, "errors": [] }
```

- **claimed** — rows that were due. Reminders dated forward are not counted.
- **skipped** — cancelled on purpose: a marketing email to somebody who never
  opted in, or a reminder for an order that has since been paid.
- **failed** — retried with a widening gap, five times, then left visible in the
  Mailer for a person to look at.

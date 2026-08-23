-- The schedule lives in the database, not in the hosting plan.
--
-- `vercel.json` ran the worker hourly, and hourly is the requirement: the dated
-- work — the two payment reminders, the quote nudge, the review invitation, the
-- abandoned basket, the 8am digest — is all dated in *days* and does not care
-- what hour it goes. What sets the cadence is the safety net. If a nudge fails,
-- the invoice waits for the next scheduled run, and the invoice is the request
-- for payment: an hour lost is a delay, a day lost is a sale.
--
-- Vercel's Hobby plan allows two cron jobs and fires them **once a day**, so it
-- cannot do hourly at all. `pg_cron` can, for nothing, and it keeps the schedule
-- independent of which hosting plan the shop is on — moving between plans then
-- changes nothing about email.
--
-- The honest trade: `pg_net` fires the request and does not wait for the answer,
-- so a tick that lands while the deploy is down is simply lost. That costs an
-- hour rather than an email, because the outbox is the durability layer — the
-- row stays `queued` and the next tick sends it. That is what the queue is for.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ============ WHERE THE SECRET GOES ============
--
-- The worker refuses anything without `CRON_SECRET`, so the database needs it.
-- It goes in Vault rather than a table: a table row turns up in `pg_dump`, in a
-- backup, and in any query somebody runs while sharing a screen.
--
-- Run once, by hand, with the real values — a migration must not carry them:
--
--   select vault.create_secret('https://your-site.com', 'app_base_url');
--   select vault.create_secret('<CRON_SECRET>',         'cron_secret');
--
-- To rotate, `select vault.update_secret(id, new_value)` — the job below reads
-- them fresh on every run, so nothing needs rescheduling.

create or replace function public.drain_email_queue()
returns void
language plpgsql security definer set search_path = public as $$
declare v_url    text;
        v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret';

  -- Nothing configured yet is the normal state on a fresh database, and is not
  -- worth failing a cron run over. It is worth saying out loud once, though —
  -- silence here is how the last scheduling gap stayed invisible for a session.
  if v_url is null or v_secret is null then
    raise warning 'drain_email_queue: set app_base_url and cron_secret in Vault before this does anything';
    return;
  end if;

  perform net.http_post(
    url     := rtrim(v_url, '/') || '/api/email/worker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := '{}'::jsonb,
    -- Generous: the worker renders and sends up to 25 emails, and a timeout
    -- here only loses the tick, never the rows.
    timeout_milliseconds := 55000
  );
end $$;

comment on function public.drain_email_queue() is
  'Asks the deployment to send whatever is due. Called hourly by pg_cron; reads '
  'its URL and secret from Vault so rotating either needs no rescheduling.';

revoke all on function public.drain_email_queue() from public, anon, authenticated;

-- ============ THE SCHEDULE ============
--
-- Unscheduled first, so re-running this migration replaces the job rather than
-- adding a second one that doubles every send.
select cron.unschedule('drain-email-queue')
 where exists (select 1 from cron.job where jobname = 'drain-email-queue');

select cron.schedule(
  'drain-email-queue',
  '0 * * * *',
  $$ select public.drain_email_queue(); $$
);

-- The outbox has to survive going live.
--
-- Two things in it only bite at volume, which is exactly when nobody is looking
-- for them.
--
-- **The Mailer screen's numbers went wrong past a thousand rows.**
-- `getOutboxCounts` selected `status, send_after` with no limit and tallied in
-- the browser. The expectation was that this would merely get slow; measuring it
-- showed something worse. **PostgREST caps an unbounded select at 1000 rows**,
-- so past that the tally silently stopped counting: 2,505 rows in the table
-- reported as 1,000, and it would have read 1,000 forever. Not a performance
-- problem — a wrong number, on the screen that answers "did we send it".
--
-- **Nothing ever removed a sent row.** Every order writes four or five, every
-- campaign writes one per recipient, and the digest writes one per admin per
-- day. That grows without bound for a table whose value is almost entirely in
-- the recent end of it.

create or replace function public.outbox_counts()
returns table (queued int, sent int, failed int, cancelled int, due int)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where status = 'queued')::int,
    count(*) filter (where status = 'sent')::int,
    count(*) filter (where status = 'failed')::int,
    count(*) filter (where status = 'cancelled')::int,
    count(*) filter (where status = 'queued' and send_after <= now())::int
  from email_outbox;
$$;

comment on function public.outbox_counts() is
  'Tallies for the Mailer screen. Counted here rather than by shipping every row '
  'to the browser, which is what it used to do.';

grant execute on function public.outbox_counts() to authenticated;

-- `security invoker`, so RLS still applies: a customer calling this gets zeroes
-- rather than the shop's numbers.

-- ============ RETENTION ============
--
-- Ninety days. Long enough to answer "did you send my invoice" for anything a
-- customer is still likely to ask about, short enough that the table stays the
-- size of a working queue rather than an archive.
--
-- What is *not* deleted matters as much: anything still queued, whatever its
-- age, and anything that failed. A failed row is a problem somebody has not
-- looked at yet, and quietly deleting it three months later would mean the shop
-- never finds out an address has been bouncing all along.
create or replace function public.prune_email_outbox(p_days int default 90)
returns int
language plpgsql security definer set search_path = public as $$
declare v_removed int;
begin
  delete from email_outbox
   where status in ('sent', 'cancelled')
     and created_at < now() - (p_days || ' days')::interval;

  get diagnostics v_removed = row_count;
  return v_removed;
end $$;

revoke all on function public.prune_email_outbox(int) from public, anon, authenticated;
grant execute on function public.prune_email_outbox(int) to service_role;

-- Runs with the same job rather than a second schedule: the worker calls it once
-- a day's worth of ticks have gone by, which keeps it to one moving part.
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
    timeout_milliseconds := 55000
  );

  -- Once a day, at the small hours, rather than every hour — pruning is cheap
  -- but there is no reason to do it twenty-four times.
  if extract(hour from now() at time zone 'UTC') = 3 then
    perform public.prune_email_outbox(90);
  end if;
end $$;

revoke all on function public.drain_email_queue() from public, anon, authenticated;

-- Email gets a spine.
--
-- Nothing in this shop has ever sent a transactional email. `lib/email.ts` has
-- carried `sendOrderConfirmationEmail`, `sendOrderShippedEmail` and
-- `sendOrderDeliveredEmail` since the start and **nothing calls any of them** —
-- the only caller of any mail path in the codebase is the admin mailer. So the
-- FAQ's promise, "you will receive an invoice", has never been true.
--
-- The obvious fix is to call a mail route from the browser after checkout. It is
-- also the wrong one: the customer closes the tab, the request never lands, and
-- the order that just took their money sends nothing. There is no record either
-- way, so nobody can answer "I never got my invoice".
--
-- So: a queue. Triggers write a row, a worker drains it. Five things this buys
-- that a direct call does not —
--
--   * nothing is lost when SMTP is down at 2am; the row waits
--   * "did we send it?" is a query rather than a guess, which is most of what a
--     support conversation needs
--   * retries are free rather than a second architecture
--   * `dedupe_key` makes double-sending impossible, which matters because
--     payment status can legitimately be set, corrected and set again
--   * the admin gets a real log instead of a dialog that dies on refresh
--
-- This is the same shape the orders already use: `order_status_history` is
-- trigger-written, and `set_order_payment` / `set_order_status` are already the
-- single doorways every change passes through.

do $$ begin
  create type email_status as enum ('queued', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists email_outbox (
  id           uuid primary key default gen_random_uuid(),
  template     text not null,
  to_email     citext not null,
  to_name      text,
  -- What the email is about, so the worker can fetch the lines it needs rather
  -- than every trigger having to build them.
  subject_type text,
  subject_id   uuid,
  payload      jsonb not null default '{}'::jsonb,

  status       email_status not null default 'queued',
  -- Reminders and follow-ups are the same mechanism as everything else, just
  -- dated forward. The worker only picks up rows that are due.
  send_after   timestamptz not null default now(),
  attempts     int not null default 0,
  last_error   text,
  sent_at      timestamptz,

  -- One row per thing-that-happened. Without this, correcting a payment and
  -- setting it again sends "we received your payment" three times.
  dedupe_key   text not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists email_outbox_due_idx
  on email_outbox (send_after) where status = 'queued';
create index if not exists email_outbox_subject_idx
  on email_outbox (subject_type, subject_id);
create index if not exists email_outbox_recent_idx
  on email_outbox (created_at desc);

comment on table email_outbox is
  'Every email the shop intends to send. Written by triggers, drained by a '
  'worker. The record of what went out is the point as much as the sending.';
comment on column email_outbox.dedupe_key is
  'Unique. One row per event — the reason a corrected payment cannot send three '
  'confirmations.';
comment on column email_outbox.send_after is
  'Reminders are ordinary rows dated forward, not a second mechanism.';

alter table email_outbox enable row level security;

-- Staff only. It holds customer addresses and message contents, and nothing a
-- customer needs is in it that is not already on their order.
drop policy if exists "outbox admin" on email_outbox;
create policy "outbox admin" on email_outbox for all
  using (public.is_admin()) with check (public.is_admin());

grant select on email_outbox to authenticated;
grant all on email_outbox to service_role;

-- ============ ENQUEUEING ============
--
-- One doorway, so every trigger below stays three lines. `on conflict do
-- nothing` is what makes the whole thing idempotent: a trigger that fires twice
-- writes one row.
create or replace function public.enqueue_email(
  p_template     text,
  p_to_email     text,
  p_dedupe_key   text,
  p_to_name      text default null,
  p_subject_type text default null,
  p_subject_id   uuid default null,
  p_payload      jsonb default '{}'::jsonb,
  p_send_after   timestamptz default now()
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- An address is not optional and a blank one is not an error worth raising:
  -- plenty of customers here have a phone number and nothing else, and their
  -- order must still go through.
  if p_to_email is null or btrim(p_to_email) = '' then
    return;
  end if;

  insert into email_outbox (
    template, to_email, to_name, subject_type, subject_id, payload,
    dedupe_key, send_after
  ) values (
    p_template, btrim(p_to_email), p_to_name, p_subject_type, p_subject_id,
    coalesce(p_payload, '{}'::jsonb), p_dedupe_key, coalesce(p_send_after, now())
  )
  on conflict (dedupe_key) do nothing;
end $$;

revoke all on function public.enqueue_email(text, text, text, text, text, uuid, jsonb, timestamptz)
  from public, anon, authenticated;

-- Where staff notifications go. A constant until the settings screen owns it.
create or replace function public.shop_notification_email()
returns text language sql stable set search_path = public as $$
  select coalesce(
    (select email::text from profiles where role = 'admin' order by created_at limit 1),
    ''
  );
$$;

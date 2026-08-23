-- Staff notifications go to every admin, not the oldest one.
--
-- `shop_notification_email()` returned a single address: the first admin by
-- `created_at`. With one administrator that was invisible; with two it means a
-- new order, a new sourcing request and the morning digest all land in one
-- inbox, and whoever is actually on shift may not be looking at it.
--
-- The fix is one row per admin rather than one row per event, which the outbox
-- already supports — the dedupe key just has to carry the address so two admins
-- get one each rather than the second colliding with the first.

create or replace function public.enqueue_staff_email(
  p_template     text,
  p_dedupe_base  text,
  p_subject_type text default null,
  p_subject_id   uuid default null,
  p_payload      jsonb default '{}'::jsonb,
  p_send_after   timestamptz default now()
)
returns int
language plpgsql security definer set search_path = public as $$
declare v_admin record;
        v_count int := 0;
begin
  for v_admin in
    select email::text as email, display_name
      from profiles
     where role = 'admin'
       and coalesce(status, 'active') = 'active'
  loop
    perform public.enqueue_email(
      p_template, v_admin.email,
      -- The address is part of the key. Without it the second admin's row
      -- conflicts with the first and only one person is ever told.
      p_dedupe_base || ':' || v_admin.email,
      v_admin.display_name, p_subject_type, p_subject_id, p_payload, p_send_after
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

revoke all on function public.enqueue_staff_email(text, text, text, uuid, jsonb, timestamptz)
  from public, anon, authenticated;

comment on function public.enqueue_staff_email is
  'Queue one copy of a staff email for every active admin. A suspended admin is '
  'skipped — they cannot act on it.';

-- ============ THE TRIGGERS USE IT ============
create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_email(
      'order_received', new.customer_email, 'order_received:' || new.id,
      new.customer_name, 'order', new.id
    );
    perform public.enqueue_email(
      'payment_reminder', new.customer_email, 'payment_reminder:1:' || new.id,
      new.customer_name, 'order', new.id,
      jsonb_build_object('attempt', 1), now() + interval '3 days'
    );
    perform public.enqueue_email(
      'payment_reminder', new.customer_email, 'payment_reminder:2:' || new.id,
      new.customer_name, 'order', new.id,
      jsonb_build_object('attempt', 2), now() + interval '7 days'
    );

    perform public.enqueue_staff_email(
      'admin_new_order', 'admin_new_order:' || new.id, 'order', new.id
    );
    return null;
  end if;

  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'paid' then
      perform public.enqueue_email(
        'payment_received', new.customer_email, 'payment_received:' || new.id,
        new.customer_name, 'order', new.id
      );
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and template = 'payment_reminder' and status = 'queued';

    elsif new.payment_status = 'refunded' then
      perform public.enqueue_email(
        'refund_issued', new.customer_email, 'refund_issued:' || new.id,
        new.customer_name, 'order', new.id
      );
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'processing' then
      perform public.enqueue_email(
        'order_packed', new.customer_email, 'order_packed:' || new.id,
        new.customer_name, 'order', new.id
      );

    elsif new.status = 'shipped' then
      perform public.enqueue_email(
        'order_shipped', new.customer_email, 'order_shipped:' || new.id,
        new.customer_name, 'order', new.id
      );

    elsif new.status = 'delivered' then
      perform public.enqueue_email(
        case when new.delivery_type = 'in_store' then 'order_collected' else 'order_delivered' end,
        new.customer_email, 'order_delivered:' || new.id,
        new.customer_name, 'order', new.id
      );

      if new.user_id is not null then
        perform public.enqueue_email(
          'review_invite', new.customer_email, 'review_invite:' || new.id,
          new.customer_name, 'order', new.id, '{}'::jsonb, now() + interval '7 days'
        );
      end if;

    elsif new.status = 'cancelled' then
      perform public.enqueue_email(
        'order_cancelled', new.customer_email, 'order_cancelled:' || new.id,
        new.customer_name, 'order', new.id
      );
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and status = 'queued'
         and template in ('payment_reminder', 'review_invite');
    end if;
  end if;

  return null;
end $$;

create or replace function public.enqueue_request_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
        v_name  text;
begin
  select email::text, display_name into v_email, v_name
    from profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    perform public.enqueue_email(
      'request_received', v_email, 'request_received:' || new.id,
      v_name, 'request', new.id
    );
    perform public.enqueue_staff_email(
      'admin_new_request', 'admin_new_request:' || new.id, 'request', new.id
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'quoted' then
      perform public.enqueue_email(
        'quote_ready', v_email, 'quote_ready:' || new.id || ':' || coalesce(new.quoted_amount, 0)::text,
        v_name, 'request', new.id
      );
      perform public.enqueue_email(
        'quote_reminder', v_email, 'quote_reminder:' || new.id,
        v_name, 'request', new.id, '{}'::jsonb, now() + interval '5 days'
      );

    elsif new.status = 'declined' then
      perform public.enqueue_email(
        'request_declined', v_email, 'request_declined:' || new.id,
        v_name, 'request', new.id
      );

    elsif new.status = 'buying' then
      perform public.enqueue_email(
        'request_buying', v_email, 'request_buying:' || new.id,
        v_name, 'request', new.id
      );
    end if;

    if new.status <> 'quoted' then
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and template = 'quote_reminder' and status = 'queued';
    end if;
  end if;

  return null;
end $$;

-- The digest is scheduled rather than triggered, so it moves here too.
create or replace function public.enqueue_scheduled_emails()
returns int
language plpgsql security definer set search_path = public as $$
declare v_before int;
        v_after  int;
        v_row    record;
begin
  select count(*) into v_before from email_outbox;

  for v_row in
    select p.id, p.email::text as email, p.display_name,
           max(ci.updated_at) as touched
      from cart_items ci
      join profiles p on p.id = ci.user_id
     group by p.id, p.email, p.display_name
    having max(ci.updated_at) < now() - interval '24 hours'
       and max(ci.updated_at) > now() - interval '7 days'
  loop
    if public.may_email(v_row.email, 'abandoned_cart') then
      perform public.enqueue_email(
        'abandoned_cart', v_row.email,
        'abandoned_cart:' || v_row.id || ':' || to_char(v_row.touched, 'YYYYMMDD'),
        v_row.display_name, 'profile', v_row.id
      );
    end if;
  end loop;

  perform public.enqueue_staff_email(
    'admin_digest', 'admin_digest:' || to_char(now(), 'YYYYMMDD'),
    null, null, '{}'::jsonb, date_trunc('day', now()) + interval '8 hours'
  );

  select count(*) into v_after from email_outbox;
  return v_after - v_before;
end $$;

revoke all on function public.enqueue_scheduled_emails() from public, anon, authenticated;

-- Kept for anything that still wants a single address to show on a screen, but
-- nothing queues against it any more.
comment on function public.shop_notification_email() is
  'One admin address, for display. Staff *mail* goes to every admin — see '
  'enqueue_staff_email().';

-- ============ THE WORKER HAS TO BE ABLE TO CALL THESE ============
--
-- `revoke all ... from public` removes the *default* PUBLIC execute grant, which
-- leaves only the owner — service_role included. So the worker's call to
-- `enqueue_scheduled_emails` was failing with "permission denied", and because
-- `drainOutbox` did not check that call's error, it failed silently: the morning
-- digest and the abandoned-basket email would never have been queued in
-- production, and nothing anywhere would have said so.
--
-- Granted to service_role only. The worker runs on the service key; no browser
-- session can reach these.
grant execute on function public.enqueue_scheduled_emails() to service_role;
grant execute on function public.enqueue_staff_email(text, text, text, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.enqueue_email(text, text, text, text, text, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.sync_order_stock(uuid) to service_role;

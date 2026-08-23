-- Who may be written to, and how they stop it.
--
-- Two rules the rest of the system depends on.
--
-- **Transactional and marketing are different things.** Transactional email is
-- part of the transaction: it goes out whatever the preferences say and carries
-- no unsubscribe. Marketing needs explicit opt-in and a working unsubscribe in
-- every single send.
--
-- The current `preferences.emailNotifications.orderUpdates` switch let a
-- customer turn off "your order shipped". They should not be able to. That
-- switch now governs the *courtesies* — packed, delivered, review invitations —
-- and never the invoice, the payment confirmation or the dispatch notice.
--
-- **Every marketing template linked to `/unsubscribe`, which was a 404.** A dead
-- unsubscribe link is both a compliance problem and the fastest route into a
-- spam folder, because mailbox providers watch precisely this.

-- A token rather than an id: an unsubscribe link is followed by someone who is
-- not signed in, often from a forwarded email, so the URL is the credential. A
-- guessable one would let anyone unsubscribe anyone.
alter table profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
alter table newsletter_subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsub_idx on profiles (unsubscribe_token);
create unique index if not exists subscribers_unsub_idx on newsletter_subscribers (unsubscribe_token);

comment on column profiles.unsubscribe_token is
  'The credential in an unsubscribe URL. Followed by someone not signed in, so '
  'it must be unguessable.';

-- ============ MAY WE WRITE? ============
--
-- One place that answers it, so no template has to remember which category it
-- is in. Everything not named here is transactional and always sends.
create or replace function public.may_email(p_email text, p_template text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_prefs jsonb;
        v_optin boolean;
        v_switch text;
begin
  if p_email is null or btrim(p_email) = '' then
    return false;
  end if;

  -- Marketing: opt-in, and the switch that governs it.
  v_switch := case p_template
    when 'newsletter'        then 'newsletter'
    when 'new_arrivals'      then 'newArrivals'
    when 'collection_launch' then 'newArrivals'
    when 'promotion'         then 'promotions'
    when 'abandoned_cart'    then 'promotions'
    when 'back_in_stock'     then 'wishlistAlerts'
    -- Courtesies. Not the transaction, so they can be turned off; the invoice,
    -- the payment confirmation and the dispatch notice deliberately are not here.
    when 'order_packed'      then 'orderUpdates'
    when 'order_delivered'   then 'orderUpdates'
    when 'order_collected'   then 'orderUpdates'
    when 'review_invite'     then 'orderUpdates'
    when 'review_published'  then 'orderUpdates'
    else null
  end;

  if v_switch is null then
    return true;                       -- transactional, or staff-facing
  end if;

  select preferences, email_opt_in into v_prefs, v_optin
    from profiles where email = p_email::citext;

  if not found then
    -- No account. Only a footer subscriber, and only the newsletter.
    return p_template = 'newsletter'
       and exists (select 1 from newsletter_subscribers
                    where email = p_email::citext and is_active);
  end if;

  if coalesce(v_optin, true) = false then
    return false;
  end if;

  -- An unset switch means yes: the defaults in `handle_new_user` turn all five
  -- on, and a preferences blob written before a switch existed should not read
  -- as a refusal.
  return coalesce((v_prefs -> 'emailNotifications' ->> v_switch)::boolean, true);
end $$;

grant execute on function public.may_email(text, text) to authenticated, service_role;

-- ============ UNSUBSCRIBING ============
--
-- No auth: the whole point is that it works from a forwarded email on a phone
-- that has never signed in. The token is the credential, and it only ever turns
-- things off — worst case, somebody who found a leaked link stops marketing they
-- were not reading.
-- The output columns are `out_*`: naming one of them `email` makes every
-- reference to `newsletter_subscribers.email` inside the body ambiguous, and
-- Postgres resolves that at call time rather than at creation, so it fails only
-- when somebody actually clicks the link.
create or replace function public.unsubscribe(p_token uuid, p_scope text default 'all')
returns table (out_email text, out_scope text)
language plpgsql security definer set search_path = public as $$
declare v_profile profiles;
        v_sub     newsletter_subscribers;
        v_prefs   jsonb;
begin
  select * into v_profile from profiles where unsubscribe_token = p_token;

  if found then
    v_prefs := coalesce(v_profile.preferences, '{}'::jsonb);

    if p_scope = 'all' then
      update profiles
         set email_opt_in = false,
             preferences = jsonb_set(v_prefs, '{emailNotifications}', jsonb_build_object(
               'newsletter', false, 'promotions', false, 'newArrivals', false,
               'wishlistAlerts', false,
               -- Courtesies stay on. Someone unsubscribing from marketing has
               -- not asked to stop hearing that their parcel shipped, and
               -- silently turning that off would produce a support message.
               'orderUpdates', coalesce(v_prefs -> 'emailNotifications' ->> 'orderUpdates', 'true')::boolean
             ))
       where id = v_profile.id;
    else
      update profiles
         set preferences = jsonb_set(
               jsonb_set(v_prefs, '{emailNotifications}',
                 coalesce(v_prefs -> 'emailNotifications', '{}'::jsonb)),
               array['emailNotifications', p_scope], 'false'::jsonb)
       where id = v_profile.id;
    end if;

    -- The same address may also be on the footer list.
    update newsletter_subscribers set is_active = false
     where email = v_profile.email and p_scope in ('all', 'newsletter');

    return query select v_profile.email::text, p_scope;
    return;
  end if;

  select * into v_sub from newsletter_subscribers where unsubscribe_token = p_token;
  if found then
    update newsletter_subscribers set is_active = false where id = v_sub.id;
    return query select v_sub.email::text, 'newsletter'::text;
    return;
  end if;

  raise exception 'That link is not valid' using errcode = 'P0002';
end $$;

grant execute on function public.unsubscribe(uuid, text) to anon, authenticated;

-- ============ WHAT IS DUE ============
--
-- The reminders above are ordinary outbox rows dated forward, so they need no
-- special handling. This covers the two that cannot be: a basket nobody
-- triggered an event on, and a daily digest that is about a moment rather than a
-- record. Called by the worker before it drains.
create or replace function public.enqueue_scheduled_emails()
returns int
language plpgsql security definer set search_path = public as $$
declare v_before int;
        v_after  int;
        v_row    record;
begin
  select count(*) into v_before from email_outbox;

  -- A basket left alone for a day, by someone with an account and an address.
  -- Once only — the dedupe key is the day, so a basket that sits for a week
  -- does not produce seven emails.
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

  -- One email that replaces opening four screens. Keyed by the day so running
  -- the worker every minute does not send it every minute.
  perform public.enqueue_email(
    'admin_digest', public.shop_notification_email(),
    'admin_digest:' || to_char(now(), 'YYYYMMDD'),
    null, null, null, '{}'::jsonb,
    date_trunc('day', now()) + interval '8 hours'
  );

  select count(*) into v_after from email_outbox;
  return v_after - v_before;
end $$;

revoke all on function public.enqueue_scheduled_emails() from public, anon, authenticated;

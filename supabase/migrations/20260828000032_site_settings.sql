-- The constants become settings.
--
-- Everything the shop needs in order to be *this* shop — its registered name, the
-- bank account customers transfer to, VAT, shipping cost, delivery lead time, the
-- WhatsApp number, the reminder timings — was a literal in `constants/index.ts`
-- or, worse, in a migration. Half of them are still marked PLACEHOLDER, and
-- changing an account number meant a commit and a deploy.
--
-- Same shape as `site_content`, and for the same reason: one key-value table, and
-- every read falls back to the literals in the code. An empty table behaves
-- exactly like the app behaved before this existed, and a malformed row cannot
-- take the shop down.
--
-- One thing deliberately absent: SMTP credentials. A password in a database row
-- turns up in backups, in screenshots and in any admin's browser devtools. Those
-- stay in environment variables.

create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

comment on table site_settings is
  'Shop configuration, one row per group. Reads fall back to the code defaults, '
  'so an empty table is the same as the constants that used to hold these.';

alter table site_settings enable row level security;

-- Most groups are read by the storefront for signed-out visitors: the bank
-- details on an invoice, the WhatsApp number in the footer, the shipping cost at
-- checkout. Those are printed on public pages anyway.
--
-- `email` is the exception. It carries where staff notifications go and the
-- reminder cadence, which is operational detail a customer has no use for.
drop policy if exists "settings public" on site_settings;
create policy "settings public" on site_settings for select
  using (key <> 'email' or public.is_admin());

drop policy if exists "settings admin" on site_settings;
create policy "settings admin" on site_settings for all
  using (public.is_admin()) with check (public.is_admin());

grant select on site_settings to anon, authenticated;
grant insert, update, delete on site_settings to authenticated;
grant all on site_settings to service_role;

drop trigger if exists site_settings_touch on site_settings;
create trigger site_settings_touch
  before update on site_settings
  for each row execute function public.set_updated_at();

drop trigger if exists site_settings_editor on site_settings;
create trigger site_settings_editor
  before insert or update on site_settings
  for each row execute function public.set_content_editor();

-- ============ WHAT THE DATABASE ITSELF NEEDS ============
--
-- The reminder cadence lived in `interval '3 days'` literals inside the trigger
-- functions, which is the least reachable place in the whole system. This reads
-- the setting and falls back to the same numbers, so an empty table keeps
-- today's behaviour exactly.
create or replace function public.email_setting(p_field text, p_default int)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> p_field)::int from site_settings where key = 'email'),
    p_default
  );
$$;

grant execute on function public.email_setting(text, int) to service_role;

create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_first int := public.email_setting('paymentReminderDays', 3);
        v_second int := public.email_setting('paymentSecondReminderDays', 7);
        v_review int := public.email_setting('reviewInviteDays', 7);
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_email(
      'order_received', new.customer_email, 'order_received:' || new.id,
      new.customer_name, 'order', new.id
    );
    perform public.enqueue_email(
      'payment_reminder', new.customer_email, 'payment_reminder:1:' || new.id,
      new.customer_name, 'order', new.id,
      jsonb_build_object('attempt', 1), now() + (v_first || ' days')::interval
    );
    perform public.enqueue_email(
      'payment_reminder', new.customer_email, 'payment_reminder:2:' || new.id,
      new.customer_name, 'order', new.id,
      jsonb_build_object('attempt', 2), now() + (v_second || ' days')::interval
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
      perform public.enqueue_email('order_packed', new.customer_email,
        'order_packed:' || new.id, new.customer_name, 'order', new.id);
    elsif new.status = 'shipped' then
      perform public.enqueue_email('order_shipped', new.customer_email,
        'order_shipped:' || new.id, new.customer_name, 'order', new.id);
    elsif new.status = 'delivered' then
      perform public.enqueue_email(
        case when new.delivery_type = 'in_store' then 'order_collected' else 'order_delivered' end,
        new.customer_email, 'order_delivered:' || new.id,
        new.customer_name, 'order', new.id
      );
      if new.user_id is not null then
        perform public.enqueue_email(
          'review_invite', new.customer_email, 'review_invite:' || new.id,
          new.customer_name, 'order', new.id, '{}'::jsonb,
          now() + (v_review || ' days')::interval
        );
      end if;
    elsif new.status = 'cancelled' then
      perform public.enqueue_email('order_cancelled', new.customer_email,
        'order_cancelled:' || new.id, new.customer_name, 'order', new.id);
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
        v_nudge int := public.email_setting('quoteReminderDays', 5);
begin
  select email::text, display_name into v_email, v_name
    from profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    perform public.enqueue_email('request_received', v_email,
      'request_received:' || new.id, v_name, 'request', new.id);
    perform public.enqueue_staff_email(
      'admin_new_request', 'admin_new_request:' || new.id, 'request', new.id);
    return null;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'quoted' then
      perform public.enqueue_email('quote_ready', v_email,
        'quote_ready:' || new.id || ':' || coalesce(new.quoted_amount, 0)::text,
        v_name, 'request', new.id);
      perform public.enqueue_email('quote_reminder', v_email,
        'quote_reminder:' || new.id, v_name, 'request', new.id, '{}'::jsonb,
        now() + (v_nudge || ' days')::interval);
    elsif new.status = 'declined' then
      perform public.enqueue_email('request_declined', v_email,
        'request_declined:' || new.id, v_name, 'request', new.id);
    elsif new.status = 'buying' then
      perform public.enqueue_email('request_buying', v_email,
        'request_buying:' || new.id, v_name, 'request', new.id);
    end if;

    if new.status <> 'quoted' then
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and template = 'quote_reminder' and status = 'queued';
    end if;
  end if;

  return null;
end $$;

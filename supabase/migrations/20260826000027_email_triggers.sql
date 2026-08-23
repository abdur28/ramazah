-- What sends, and when.
--
-- Every trigger below does one thing: work out who to write to and call
-- `enqueue_email`. No formatting, no SMTP, no branching on preferences — the
-- worker owns all of that. A trigger that knows about HTML is a trigger nobody
-- can change safely.
--
-- Transactional mail ignores preferences on purpose. You cannot opt out of
-- "your order shipped"; the switches in `profiles.preferences` govern marketing
-- and the optional courtesies, never the invoice, the payment confirmation or
-- the dispatch notice. See migration 28 for that split.

-- ============ ORDERS ============
create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_admin text := public.shop_notification_email();
begin
  if tg_op = 'INSERT' then
    -- The invoice. There is no card checkout, so this email *is* the request
    -- for payment and is the highest-value thing in the whole system.
    perform public.enqueue_email(
      'order_received', new.customer_email, 'order_received:' || new.id,
      new.customer_name, 'order', new.id
    );

    -- Chased twice, then left alone. A third reminder reads as harassment and
    -- the shop can see the order sitting unpaid on the Payments screen anyway.
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

    perform public.enqueue_email(
      'admin_new_order', v_admin, 'admin_new_order:' || new.id,
      null, 'order', new.id
    );
    return null;
  end if;

  -- ---- payment
  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'paid' then
      perform public.enqueue_email(
        'payment_received', new.customer_email, 'payment_received:' || new.id,
        new.customer_name, 'order', new.id
      );

      -- Nothing to chase once the money is in. Cancelling rather than deleting
      -- keeps the record of what was intended.
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and template = 'payment_reminder' and status = 'queued';

    elsif new.payment_status = 'refunded' then
      perform public.enqueue_email(
        'refund_issued', new.customer_email, 'refund_issued:' || new.id,
        new.customer_name, 'order', new.id
      );
    end if;
  end if;

  -- ---- fulfilment
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
      -- One status, two different things. A collection order that says
      -- "delivered" reads as wrong to the person who walked in to collect it.
      perform public.enqueue_email(
        case when new.delivery_type = 'in_store' then 'order_collected' else 'order_delivered' end,
        new.customer_email, 'order_delivered:' || new.id,
        new.customer_name, 'order', new.id
      );

      -- Asked for a week later, once they have had the thing long enough to
      -- have an opinion about it. Only for someone with an account — a review
      -- needs somewhere to sign in and write it.
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

drop trigger if exists orders_enqueue_email on orders;
create trigger orders_enqueue_email
  after insert or update of status, payment_status on orders
  for each row execute function public.enqueue_order_email();

-- ============ SOURCING REQUESTS ============
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
    perform public.enqueue_email(
      'admin_new_request', public.shop_notification_email(),
      'admin_new_request:' || new.id, null, 'request', new.id
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'quoted' then
      -- Carries the price and a direct accept link. Without it the customer
      -- only learns they have a quote by logging in, which is why the ladder
      -- used to stall here.
      perform public.enqueue_email(
        'quote_ready', v_email, 'quote_ready:' || new.id || ':' || coalesce(new.quoted_amount, 0)::text,
        v_name, 'request', new.id
      );
      -- One nudge. A quote nobody answers is work already done for nothing.
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

    -- Once it is answered or dead, stop nudging.
    if new.status <> 'quoted' then
      update email_outbox set status = 'cancelled'
       where subject_id = new.id and template = 'quote_reminder' and status = 'queued';
    end if;
  end if;

  return null;
end $$;

drop trigger if exists requests_enqueue_email on product_requests;
create trigger requests_enqueue_email
  after insert or update of status on product_requests
  for each row execute function public.enqueue_request_email();

-- ============ ACCOUNT ============
create or replace function public.enqueue_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Says what the shop is, and that sourcing exists — most new customers do
    -- not know they can ask for things that are not in the catalogue.
    perform public.enqueue_email(
      'welcome', new.email::text, 'welcome:' || new.id, new.display_name, 'profile', new.id
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    perform public.enqueue_email(
      case when new.status = 'inactive' then 'account_suspended' else 'account_reinstated' end,
      new.email::text,
      'account_status:' || new.id || ':' || new.status || ':' || extract(epoch from now())::bigint,
      new.display_name, 'profile', new.id
    );
  end if;

  return null;
end $$;

drop trigger if exists profiles_enqueue_email on profiles;
create trigger profiles_enqueue_email
  after insert or update of status on profiles
  for each row execute function public.enqueue_profile_email();

-- ============ REVIEWS ============
create or replace function public.enqueue_review_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text; v_name text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select email::text, display_name into v_email, v_name from profiles where id = new.user_id;
    perform public.enqueue_email(
      'review_published', v_email, 'review_published:' || new.id,
      v_name, 'review', new.id
    );
  end if;
  return null;
end $$;

drop trigger if exists reviews_enqueue_email on reviews;
create trigger reviews_enqueue_email
  after update of status on reviews
  for each row execute function public.enqueue_review_email();

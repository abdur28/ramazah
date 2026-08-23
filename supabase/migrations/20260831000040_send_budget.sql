-- A daily budget, and a queue that knows what matters.
--
-- Two problems that only appear on the day the shop does well.
--
-- **The queue has no priority.** One table, ordered by `send_after` alone, one
-- SMTP transport. A newsletter to four hundred people queued at nine o'clock
-- drains ahead of an order confirmation queued at five past — and if the day's
-- sending allowance runs out in between, the invoice is what does not go. On a
-- shop paid by bank transfer against an invoice, that is the one email that
-- must never queue behind an advertisement.
--
-- **A campaign is sent all at once.** `send_campaign` inserts one row per
-- recipient with `send_after` defaulting to now, so four hundred people means
-- four hundred emails in one burst. Every sending plan worth using has a daily
-- limit; the free tiers put it around a hundred. Bursting past it does not
-- queue, it fails, and the failures land on the transactional mail sharing the
-- transport.
--
-- Neither needs a bigger plan to fix. A newsletter is not urgent — spreading it
-- over three days costs nothing anybody will notice, and it is what makes a free
-- tier genuinely workable rather than nominally workable.

-- ============ WHAT KIND OF EMAIL IS THIS ============
--
-- The categories live in `lib/email/templates.ts`, which Postgres cannot read.
-- This mirrors them. `may_email` carries an overlapping list — it maps templates
-- to the *preference switch* that governs them, which is finer-grained than a
-- category — so the two are checked against each other rather than merged; see
-- the verification in PROGRESS for 2026-08-23.
--
-- Anything unknown is transactional, which is the safe direction to be wrong in:
-- a new template sends promptly and carries no unsubscribe until somebody says
-- otherwise.
create or replace function public.email_class(p_template text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_template in ('admin_new_order', 'admin_new_request', 'admin_digest')
      then 'staff'
    when p_template in ('newsletter', 'new_arrivals', 'promotion',
                        'back_in_stock', 'collection_launch', 'abandoned_cart')
      then 'marketing'
    when p_template in ('order_packed', 'order_delivered', 'order_collected',
                        'request_buying', 'review_invite', 'review_published')
      then 'courtesy'
    else 'transactional'
  end;
$$;

comment on function public.email_class(text) is
  'The category of a template, mirroring lib/email/templates.ts. Unknown is '
  'transactional, which is the safe direction to be wrong in.';

-- ============ PRIORITY ============
--
-- Lower goes first. The gaps are deliberate: there is room to put something
-- between two of these without renumbering the rest.
alter table email_outbox
  add column if not exists priority smallint not null default 5;

create or replace function public.set_email_priority()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.priority is null or tg_op = 'INSERT' then
    new.priority := case
      -- A campaign is marketing whatever template it borrows: sending the
      -- `back_in_stock` design to a whole segment is an advertisement, and it
      -- must not inherit that template's ordinary urgency.
      when new.campaign_id is not null then 9
      else case public.email_class(new.template)
        when 'transactional' then 1   -- invoices, codes, dispatch notices
        when 'staff'         then 3   -- the shop needs to know, after the customer
        when 'courtesy'      then 5
        else 9
      end
    end;
  end if;
  return new;
end $$;

drop trigger if exists email_outbox_priority on email_outbox;
create trigger email_outbox_priority
  before insert on email_outbox
  for each row execute function public.set_email_priority();

-- Existing rows predate the column and all carry the default.
update email_outbox o
   set priority = case
     when o.campaign_id is not null then 9
     else case public.email_class(o.template)
       when 'transactional' then 1
       when 'staff'         then 3
       when 'courtesy'      then 5
       else 9
     end
   end
 where status = 'queued';

-- The worker reads in this order, so it wants an index in this order.
drop index if exists email_outbox_due_idx;
create index email_outbox_due_idx
  on email_outbox (priority, send_after)
  where status = 'queued';

-- ============ SPREADING A CAMPAIGN ============
--
-- `p_daily_budget` is how many of a day's allowance the campaign may take. It
-- is deliberately *not* the plan's whole daily limit: the transactional mail
-- shares the transport, and a campaign that eats the entire day's quota is the
-- problem this migration exists to prevent. The caller passes the reserved
-- figure from Settings.
--
-- Null means send at once, which is right for a small list and for anyone on a
-- plan with no daily cap.
--
-- Adding a parameter creates an overload rather than replacing the function, so
-- the four-argument version is dropped explicitly.
drop function if exists public.send_campaign(text, text, text, jsonb);

create or replace function public.send_campaign(
  p_template     text,
  p_subject      text,
  p_segment      text,
  p_payload      jsonb default '{}'::jsonb,
  p_daily_budget int   default null
)
returns email_campaigns
language plpgsql security definer set search_path = public as $$
declare v_campaign email_campaigns;
        v_person   record;
        v_count    int := 0;
        v_when     timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can send a campaign' using errcode = '42501';
  end if;

  if btrim(coalesce(p_subject, '')) = '' then
    raise exception 'A campaign needs a subject line' using errcode = 'P0001';
  end if;

  insert into email_campaigns (template, subject, payload, segment, created_by)
  values (p_template, btrim(p_subject), coalesce(p_payload, '{}'::jsonb), p_segment, auth.uid())
  returning * into v_campaign;

  for v_person in select * from public.campaign_audience(p_segment) loop
    -- Recipient 0..budget-1 today, the next batch tomorrow, and so on. The
    -- order is the audience's own, so nobody is systematically last.
    v_when := case
      when p_daily_budget is null or p_daily_budget < 1 then now()
      else now() + ((v_count / p_daily_budget) || ' days')::interval
    end;

    insert into email_outbox (
      template, to_email, to_name, payload, dedupe_key, campaign_id, send_after
    ) values (
      p_template, v_person.email, v_person.name,
      coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('subjectLine', btrim(p_subject)),
      'campaign:' || v_campaign.id || ':' || v_person.email,
      v_campaign.id,
      v_when
    )
    on conflict (dedupe_key) do nothing;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    delete from email_campaigns where id = v_campaign.id;
    raise exception 'Nobody is in that group' using errcode = 'P0001';
  end if;

  update email_campaigns set recipients = v_count where id = v_campaign.id
  returning * into v_campaign;

  return v_campaign;
end $$;

grant execute on function public.email_class(text) to authenticated;
grant execute on function public.send_campaign(text, text, text, jsonb, int) to authenticated;

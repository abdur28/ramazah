-- Campaigns go through the outbox like everything else.
--
-- The campaign side of the mailer sent by firing one `fetch` per recipient
-- straight at SMTP, in parallel, from the browser. Six consequences, all of them
-- real:
--
--   * no record — the results appeared in a dialog that died on refresh, so
--     "did that go out?" had no answer half an hour later
--   * no retries; a recipient whose send failed was simply never written to
--   * no dedupe, so pressing Send twice sent twice
--   * closing the tab stopped the campaign halfway through
--   * a hundred parallel SMTP connections is what providers rate-limit, and
--     what gets a sending domain flagged
--   * and it was **broken**: the templates it named were replaced in the same
--     session that rebuilt the email system, so a promotion would have rendered
--     the fallback div rather than an email
--
-- Everything above is already solved for transactional mail. A campaign is a set
-- of outbox rows with a campaign attached.

create table if not exists email_campaigns (
  id           uuid primary key default gen_random_uuid(),
  template     text not null,
  subject      text not null,
  payload      jsonb not null default '{}'::jsonb,
  segment      text not null,
  recipients   int not null default 0,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists email_campaigns_recent_idx on email_campaigns (created_at desc);

comment on table email_campaigns is
  'One send to many people. The outbox rows carry campaign_id, so what actually '
  'happened to each recipient is a query rather than a memory.';

alter table email_campaigns enable row level security;

drop policy if exists "campaigns admin" on email_campaigns;
create policy "campaigns admin" on email_campaigns for all
  using (public.is_admin()) with check (public.is_admin());

grant select on email_campaigns to authenticated;
grant all on email_campaigns to service_role;

alter table email_outbox add column if not exists campaign_id uuid
  references email_campaigns(id) on delete set null;
create index if not exists email_outbox_campaign_idx on email_outbox (campaign_id);

-- ============ WHO IS IN A SEGMENT ============
--
-- Segments rather than a list of checkboxes. Selecting people out of an
-- unchecked list stops working somewhere around fifty names, and "everyone who
-- bought in the last ninety days" is the thing somebody actually wants to say.
--
-- Opt-in is enforced here as well as in `may_email`, so a count shown on the
-- screen is the number that will really be written to rather than an optimistic
-- one that shrinks silently at send time.
create or replace function public.campaign_audience(p_segment text)
returns table (email text, name text)
language sql stable security definer set search_path = public as $$
  with accounts as (
    select p.id, p.email::text as email, p.display_name as name
      from profiles p
     where coalesce(p.email_opt_in, true)
       and coalesce(p.status, 'active') = 'active'
  ),
  ordered as (
    select user_id, max(created_at) as last_order
      from orders where user_id is not null group by user_id
  )
  select a.email, a.name from accounts a
   where p_segment = 'all'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'customers'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'recent' and o.last_order > now() - interval '90 days'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'lapsed' and o.last_order < now() - interval '180 days'
  union
  select a.email, a.name from accounts a
   where p_segment = 'never'
     and not exists (select 1 from ordered o where o.user_id = a.id)
  union
  -- Footer signups with no account. They filled the box on the storefront and
  -- nothing could reach them until the mailer learned to read this table.
  select s.email::text, null from newsletter_subscribers s
   where s.is_active
     and p_segment in ('all', 'subscribers')
     and not exists (select 1 from profiles p where p.email = s.email);
$$;

grant execute on function public.campaign_audience(text) to authenticated;

-- ============ SENDING ONE ============
--
-- Writes the campaign and one queued row per recipient. Nothing goes out here —
-- the worker sends, at its own pace, with the retries and the record that come
-- with it. Pressing Send twice produces two campaigns rather than two emails to
-- the same person, because the dedupe key carries the campaign id.
create or replace function public.send_campaign(
  p_template text,
  p_subject  text,
  p_segment  text,
  p_payload  jsonb default '{}'::jsonb
)
returns email_campaigns
language plpgsql security definer set search_path = public as $$
declare v_campaign email_campaigns;
        v_person   record;
        v_count    int := 0;
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
    insert into email_outbox (
      template, to_email, to_name, payload, dedupe_key, campaign_id
    ) values (
      p_template, v_person.email, v_person.name,
      coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('subjectLine', btrim(p_subject)),
      'campaign:' || v_campaign.id || ':' || v_person.email,
      v_campaign.id
    )
    on conflict (dedupe_key) do nothing;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    -- A campaign with nobody in it is a mistake, not an event worth recording.
    delete from email_campaigns where id = v_campaign.id;
    raise exception 'Nobody is in that group' using errcode = 'P0001';
  end if;

  update email_campaigns set recipients = v_count where id = v_campaign.id
  returning * into v_campaign;

  return v_campaign;
end $$;

grant execute on function public.send_campaign(text, text, text, jsonb) to authenticated;

-- What became of each one, for the campaign list.
create or replace function public.campaign_results()
returns table (
  id uuid, template text, subject text, segment text, recipients int,
  created_at timestamptz, sent int, failed int, queued int, cancelled int,
  sender text
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.template, c.subject, c.segment, c.recipients, c.created_at,
         count(*) filter (where o.status = 'sent')::int,
         count(*) filter (where o.status = 'failed')::int,
         count(*) filter (where o.status = 'queued')::int,
         count(*) filter (where o.status = 'cancelled')::int,
         p.display_name
    from email_campaigns c
    left join email_outbox o on o.campaign_id = c.id
    left join profiles p on p.id = c.created_by
   group by c.id, p.display_name
   order by c.created_at desc;
$$;

grant execute on function public.campaign_results() to authenticated;

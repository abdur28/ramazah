-- Campaigns, a page at a time.
--
-- `campaign_results()` returned every campaign ever sent. That is a slow-growing
-- table - one row per send, not one per recipient - so this is the least urgent
-- of the paging changes. It is here anyway because a set-returning function
-- called over REST is subject to the same silent 1000-row cap as a select, and
-- "we will notice when it happens" is not true of a limit that does not
-- announce itself.
--
-- The old zero-argument version is dropped rather than left alongside. Adding
-- defaulted parameters creates an *overload*, and PostgREST then has two
-- candidates for a call with no arguments.
drop function if exists public.campaign_results();

create or replace function public.campaign_results(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id uuid, template text, subject text, segment text, recipients int,
  created_at timestamptz, sent int, failed int, queued int, cancelled int,
  sender text, total bigint
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.template, c.subject, c.segment, c.recipients, c.created_at,
         count(*) filter (where o.status = 'sent')::int,
         count(*) filter (where o.status = 'failed')::int,
         count(*) filter (where o.status = 'queued')::int,
         count(*) filter (where o.status = 'cancelled')::int,
         p.display_name,
         (select count(*) from email_campaigns)
    from email_campaigns c
    left join email_outbox o on o.campaign_id = c.id
    left join profiles p on p.id = c.created_by
   group by c.id, p.display_name
   order by c.created_at desc
   limit p_limit offset p_offset;
$$;

grant execute on function public.campaign_results(int, int) to authenticated;

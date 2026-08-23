-- Counting belongs in the database.
--
-- Every admin list screen loaded its rows into the browser and then counted
-- them there: the status chips on Orders, the four stat cards above them, the
-- tab counts on Requests, the live/low/out tallies on Products. That works
-- exactly as long as every row is loaded, which is the assumption pagination
-- is about to remove — and it is the same assumption that had the Mailer
-- reporting 1,000 sent emails for ever (see 20260829000034).
--
-- So the counts move here first, before the lists get paged. Each function
-- tallies the whole table in one round trip, and the numbers on screen stop
-- depending on how far down the list somebody has scrolled.
--
-- All of these are `security invoker`: RLS still decides which rows are
-- visible, so a customer who calls `order_summary()` gets a summary of their
-- own orders rather than the shop's. The admin screens are the only place they
-- are used, but the guarantee is in the database, not in who calls it.

-- ============ ORDERS ============
--
-- One row, because the Orders screen asks one question in several shapes: how
-- many are there, how many need packing, how much money is outstanding, and how
-- much has arrived. `currency` comes along so the money cards can format
-- themselves without waiting for the first page of rows to land.
create or replace function public.order_summary()
returns table (
  total               int,
  pending             int,
  processing          int,
  shipped             int,
  delivered           int,
  cancelled           int,
  refunded            int,
  awaiting_fulfilment int,
  unpaid_count        int,
  unpaid_total        numeric,
  settled_total       numeric,
  currency            text
)
language sql stable security invoker set search_path = public as $$
  select
    count(*)::int,
    count(*) filter (where status = 'pending')::int,
    count(*) filter (where status = 'processing')::int,
    count(*) filter (where status = 'shipped')::int,
    count(*) filter (where status = 'delivered')::int,
    count(*) filter (where status = 'cancelled')::int,
    count(*) filter (where status = 'refunded')::int,
    count(*) filter (where status in ('pending', 'processing'))::int,
    count(*) filter (where payment_status = 'pending')::int,
    coalesce(sum(total) filter (where payment_status = 'pending'), 0),
    coalesce(sum(total) filter (where payment_status = 'paid'), 0),
    coalesce(max(currency::text), 'NGN')
  from orders;
$$;

comment on function public.order_summary() is
  'Tallies for the Orders screen, counted over every order rather than over the '
  'page currently loaded.';

-- ============ PAYMENTS ============
--
-- The same table read as money. `oldest_unpaid` is the one number on that
-- screen anyone acts on — how long the longest-waiting invoice has been out —
-- and it was previously derived from whichever 500 orders happened to load.
create or replace function public.payment_summary()
returns table (
  success_count   int,
  pending_count   int,
  failed_count    int,
  refunded_count  int,
  success_total   numeric,
  pending_total   numeric,
  failed_total    numeric,
  refunded_total  numeric,
  oldest_unpaid   timestamptz,
  currency        text
)
language sql stable security invoker set search_path = public as $$
  select
    count(*) filter (where payment_status = 'paid')::int,
    count(*) filter (where payment_status = 'pending')::int,
    count(*) filter (where payment_status = 'failed')::int,
    count(*) filter (where payment_status = 'refunded')::int,
    coalesce(sum(total) filter (where payment_status = 'paid'), 0),
    coalesce(sum(total) filter (where payment_status = 'pending'), 0),
    coalesce(sum(total) filter (where payment_status = 'failed'), 0),
    coalesce(sum(total) filter (where payment_status = 'refunded'), 0),
    min(created_at) filter (where payment_status = 'pending'),
    coalesce(max(currency::text), 'NGN')
  from orders;
$$;

comment on function public.payment_summary() is
  'Tallies for the Payments screen. oldest_unpaid is the longest an invoice has '
  'been outstanding, over every order rather than the ones on screen.';

-- ============ PRODUCTS ============
--
-- Stock has to be summed across variants first, which is why this one has a
-- subquery where the others do not. The buckets match `stockBucket()` in
-- components/admin/ui/StatusPill.tsx: nothing in stock is `out`, below the
-- product's own low-stock threshold is `low`. Keeping the rule in two places is
-- a liability, so if one moves, move the other.
create or replace function public.product_summary()
returns table (
  total    int,
  live     int,
  draft    int,
  archived int,
  low      int,
  out_of_stock int
)
language sql stable security invoker set search_path = public as $$
  with stock as (
    select p.id,
           p.status,
           coalesce(p.low_stock_alert, 10) as threshold,
           coalesce((select sum(v.stock_count)
                       from product_variants v
                      where v.product_id = p.id), 0) as on_hand
      from products p
  )
  select
    count(*)::int,
    count(*) filter (where status = 'active')::int,
    count(*) filter (where status = 'draft')::int,
    count(*) filter (where status = 'archived')::int,
    count(*) filter (where on_hand > 0 and on_hand < threshold)::int,
    count(*) filter (where on_hand <= 0)::int
  from stock;
$$;

comment on function public.product_summary() is
  'Catalogue tallies. Stock buckets mirror stockBucket() in StatusPill.tsx.';

-- ============ CUSTOMERS ============
create or replace function public.customer_summary()
returns table (total int, admins int, suspended int)
language sql stable security invoker set search_path = public as $$
  select
    count(*)::int,
    count(*) filter (where role = 'admin')::int,
    count(*) filter (where coalesce(status, 'active') = 'inactive')::int
  from profiles;
$$;

-- ============ REVIEWS AND REQUESTS ============
--
-- These two are pure per-status counts, so they return a row per status rather
-- than a column per status. Requests in particular has seven states and gained
-- two of them after the table was first written — a shape that survives the
-- next one beats a signature that has to be re-cut.
--
-- Statuses with no rows are absent rather than zero; the screens read them
-- through a lookup that defaults to nothing, which is the same thing.
create or replace function public.review_counts()
returns table (status text, tally int)
language sql stable security invoker set search_path = public as $$
  select status::text, count(*)::int from reviews group by status;
$$;

create or replace function public.request_counts()
returns table (status text, tally int)
language sql stable security invoker set search_path = public as $$
  select status::text, count(*)::int from product_requests group by status;
$$;

comment on function public.request_counts() is
  'One row per status. The admin Requests screen used to fetch every request '
  'twice per load - once filtered, once entire - purely to count the tabs.';

grant execute on function public.order_summary()    to authenticated;
grant execute on function public.payment_summary()  to authenticated;
grant execute on function public.product_summary()  to authenticated;
grant execute on function public.customer_summary() to authenticated;
grant execute on function public.review_counts()    to authenticated;
grant execute on function public.request_counts()   to authenticated;

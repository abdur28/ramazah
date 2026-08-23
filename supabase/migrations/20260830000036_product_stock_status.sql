-- Stock buckets, once.
--
-- The catalogue screen filters by "low stock" and "out of stock", and its cards
-- count how many of each there are. Neither is a column: stock lives on the
-- variants, so a product's on-hand figure is a sum and its bucket is that sum
-- compared against the product's own threshold.
--
-- That was computed in the browser over the loaded rows, which paging breaks in
-- the usual way — filter to "low stock" and you would get the low-stock rows
-- *of the fifty on screen*, on a screen whose whole purpose is telling you what
-- to reorder.
--
-- So the rule moves into a view, and the summary and the list filter both read
-- it. One definition, two callers, instead of two definitions drifting apart.
create or replace view public.product_stock_status
with (security_invoker = on) as
  select p.id as product_id,
         coalesce(p.low_stock_alert, 10) as threshold,
         coalesce((select sum(v.stock_count)
                     from product_variants v
                    where v.product_id = p.id), 0) as on_hand,
         case
           when coalesce((select sum(v.stock_count)
                            from product_variants v
                           where v.product_id = p.id), 0) <= 0 then 'out'
           when coalesce((select sum(v.stock_count)
                            from product_variants v
                           where v.product_id = p.id), 0)
                < coalesce(p.low_stock_alert, 10) then 'low'
           else 'in'
         end as bucket
    from products p;

comment on view public.product_stock_status is
  'A product''s total stock and its bucket. Mirrors stockBucket() in '
  'components/admin/ui/StatusPill.tsx - if one moves, move the other.';

-- `security_invoker` so the view does not become a way around the RLS on
-- `products` and `product_variants`. Without it a view runs as its owner, which
-- would show a signed-out visitor the stock level of every draft product.
grant select on public.product_stock_status to authenticated, service_role;

-- `service_role` is granted too. It bypasses RLS and can read `products` and
-- `product_variants` directly, so this concedes nothing - but without it any
-- server-side caller of `admin_product_page()` fails with "permission denied
-- for view product_stock_status", which points at the view rather than at the
-- missing grant and is a genuinely puzzling half-hour.

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
  select
    count(*)::int,
    count(*) filter (where p.status = 'active')::int,
    count(*) filter (where p.status = 'draft')::int,
    count(*) filter (where p.status = 'archived')::int,
    count(*) filter (where s.bucket = 'low')::int,
    count(*) filter (where s.bucket = 'out')::int
  from products p
  join product_stock_status s on s.product_id = p.id;
$$;

-- ============ THE PAGED LIST ============
--
-- Returns ids, not products. The catalogue needs the full nested shape -
-- images, variants, prices, options, collections - which `PRODUCT_SELECT`
-- already expresses far better than a SQL function would, and duplicating it
-- here would mean every future column had to be added in two places.
--
-- So this answers only the part PostgREST cannot: which products match, in what
-- order, and how many there are altogether. The caller fetches those ids with
-- the select it already has.
--
-- `total` repeats on every row. That is thirty bytes times fifty, and the
-- alternative is a second round trip to count what this query has already
-- counted.
create or replace function public.admin_product_page(
  p_search   text default null,
  p_status   text default null,
  p_category uuid default null,
  p_stock    text default null,
  p_limit    int  default 50,
  p_offset   int  default 0
)
returns table (id uuid, total bigint)
language sql stable security invoker set search_path = public as $$
  with term as (
    -- `%` and `_` are LIKE wildcards, so a search for "50%" would otherwise
    -- match everything beginning "50". Escaped rather than stripped: they are
    -- legitimate things to look for in a product name.
    select case
             when p_search is null or btrim(p_search) = '' then null
             else '%' || replace(replace(replace(btrim(p_search),
                    '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'
           end as pattern
  ),
  matched as (
    select p.id, p.created_at
      from products p
      join product_stock_status s on s.product_id = p.id
     cross join term t
     where (p_status   is null or p.status::text = p_status)
       and (p_category is null or p.category_id = p_category)
       and (p_stock    is null or s.bucket = p_stock)
       and (
         t.pattern is null
         or p.name ilike t.pattern
         or p.sku  ilike t.pattern
       )
  )
  select m.id, (select count(*) from matched)
    from matched m
   order by m.created_at desc
   limit p_limit offset p_offset;
$$;

grant execute on function public.admin_product_page(text, text, uuid, text, int, int)
  to authenticated;

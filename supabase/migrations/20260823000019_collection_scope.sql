-- Collections become a place a shopper can be sent.
--
-- The table, the admin screens and `products.collection_id` have all existed
-- from the start, and nothing on the storefront ever rendered one — no route, no
-- link, no mention. So a collection was strictly worse than a tag: the same
-- grouping, plus admin effort, minus any way to reach it.
--
-- What a collection is *for* here is a link you can send. This shop buys in
-- runs — a trip to Cairo comes back with veils, coffee and brassware together —
-- and that cuts straight across categories, so no category can represent it and
-- a tag has no page to point at.
--
-- `filter_products` already scopes by category path and by search. A collection
-- is a third scope of the same kind, so it joins them rather than getting its
-- own query.

alter table collections add column if not exists sort_order int not null default 0;
alter table collections add column if not exists is_featured boolean not null default false;

comment on column collections.is_featured is
  'Shown on the home page. A shop with a dozen collections still wants two or '
  'three on the front.';

create index if not exists collections_featured_idx
  on collections (is_featured, sort_order) where is_featured;

-- Adding a parameter creates an *overload*, it does not replace: both
-- signatures then exist, every argument has a default, and Postgres cannot
-- choose between them — `filter_products()` fails with "is not unique" and
-- PostgREST resolves unpredictably. The previous signatures have to go first.
drop function if exists public.product_facets(text, text);
drop function if exists public.filter_products(
  text, text, jsonb, text[], numeric, numeric, char, boolean, text, int, int
);

create or replace function public.product_facets(
  p_path       text default null,
  p_search     text default null,
  p_collection text default null
)
returns table (axis text, value text, hex text, product_count bigint)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id
      from products p
      left join categories c on c.id = p.category_id
      left join collections col on col.id = p.collection_id
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (p_collection is null or col.slug = p_collection)
       and (
         p_search is null or btrim(p_search) = ''
         or (
           public.search_query(p_search) is not null
           and p.search_vector @@ public.search_query(p_search)
         )
       )
  ),
  pairs as (
    select distinct
           po.name as axis, pov.value, pov.hex, p.id as product_id,
           po.position as axis_position, pov.position as value_position
      from in_scope p
      join product_options po on po.product_id = p.id
      join product_option_values pov on pov.option_id = po.id
  )
  select axis, value, max(hex) as hex, count(distinct product_id) as product_count
    from pairs
   group by axis, value
   order by min(axis_position), axis, min(value_position), value;
$$;

create or replace function public.filter_products(
  p_path       text    default null,
  p_search     text    default null,
  p_options    jsonb   default '{}'::jsonb,
  p_tags       text[]  default null,
  p_min_price  numeric default null,
  p_max_price  numeric default null,
  p_currency   char(3) default 'NGN',
  p_in_stock   boolean default null,
  p_sort       text    default 'featured',
  p_limit      int     default 20,
  p_offset     int     default 0,
  p_collection text    default null
)
returns table (id uuid, total_count bigint)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id, p.tags, p.name, p.created_at,
           p.is_featured, p.is_new, p.is_bestseller,
           case
             when public.search_query(coalesce(p_search, '')) is null then 0
             else ts_rank(p.search_vector, public.search_query(p_search))
           end as rank
      from products p
      left join categories c on c.id = p.category_id
      left join collections col on col.id = p.collection_id
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (p_collection is null or col.slug = p_collection)
       and (
         p_search is null or btrim(p_search) = ''
         or (
           public.search_query(p_search) is not null
           and p.search_vector @@ public.search_query(p_search)
         )
       )
  ),
  priced as (
    select s.*,
           min(pp.amount) filter (where pp.currency = p_currency) as price,
           coalesce(sum(pv.stock_count), 0) as stock
      from in_scope s
      left join product_variants pv on pv.product_id = s.id
      left join product_prices pp on pp.variant_id = pv.id
     group by s.id, s.tags, s.name, s.created_at,
              s.is_featured, s.is_new, s.is_bestseller, s.rank
  ),
  matched as (
    select pr.*
      from priced pr
     where (p_tags is null or pr.tags && p_tags)
       and (p_min_price is null or pr.price >= p_min_price)
       and (p_max_price is null or pr.price <= p_max_price)
       and (p_in_stock is not true or pr.stock > 0)
       and not exists (
         select 1
           from jsonb_each(coalesce(p_options, '{}'::jsonb)) as want(axis, values)
          where jsonb_array_length(want.values) > 0
            and not exists (
              select 1
                from product_options po
                join product_option_values pov on pov.option_id = po.id
               where po.product_id = pr.id
                 and po.name = want.axis
                 and pov.value in (select jsonb_array_elements_text(want.values))
            )
       )
  ),
  ordered as (
    select m.id,
           count(*) over () as total_count,
           row_number() over (
             order by
               case when p_sort = 'relevance' then m.rank end desc nulls last,
               case when p_sort = 'price-low-high' then m.price end asc nulls last,
               case when p_sort = 'price-high-low' then m.price end desc nulls last,
               case when p_sort = 'name-a-z'       then m.name end asc,
               case when p_sort = 'name-z-a'       then m.name end desc,
               case when p_sort = 'newest'         then m.created_at end desc,
               case when p_sort not in ('relevance','price-low-high','price-high-low','name-a-z','name-z-a','newest')
                    then (m.is_featured::int * 4 + m.is_new::int * 2 + m.is_bestseller::int)
               end desc,
               m.created_at desc, m.id
           ) as position
      from matched m
  )
  select o.id, o.total_count
    from ordered o
   where o.position > p_offset
     and o.position <= p_offset + greatest(p_limit, 1)
   order by o.position;
$$;

-- Counts for the index page, so a collection with nothing in it is visible
-- before it is opened.
create or replace function public.collection_summaries()
returns table (
  id uuid, name text, slug text, description text,
  banner_url text, banner_alt text, is_featured boolean,
  sort_order int, product_count bigint
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.name, c.slug, c.description,
         c.banner_url, c.banner_alt, c.is_featured, c.sort_order,
         count(p.id) filter (where p.status = 'active') as product_count
    from collections c
    left join products p on p.collection_id = c.id
   group by c.id
   order by c.sort_order, c.name;
$$;

grant execute on function public.product_facets(text, text, text) to anon, authenticated;
grant execute on function public.filter_products(
  text, text, jsonb, text[], numeric, numeric, char, boolean, text, int, int, text
) to anon, authenticated;
grant execute on function public.collection_summaries() to anon, authenticated;

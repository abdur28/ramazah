-- Sorting and paging, alongside the filtering.
--
-- `filter_category_products` returned every match and the page sorted them in
-- the browser. That is fine while a shelf fits in one response and wrong the
-- moment it does not: sorting a page of twenty only reorders the twenty you can
-- already see, so "price: low to high" would show the cheapest of page one
-- rather than the cheapest on the shelf. Paging and sorting have to move
-- together or neither is honest.
--
-- The total comes back on every row through a window function rather than a
-- second query, so the count and the page can never disagree about the filter.

drop function if exists public.filter_category_products(text, jsonb, text[], numeric, numeric, char, boolean);

create or replace function public.filter_category_products(
  p_path      text,
  p_options   jsonb   default '{}'::jsonb,
  p_tags      text[]  default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_currency  char(3) default 'NGN',
  p_in_stock  boolean default null,
  p_sort      text    default 'featured',
  p_limit     int     default 20,
  p_offset    int     default 0
)
returns table (id uuid, total_count bigint)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id, p.tags, p.name, p.created_at,
           p.is_featured, p.is_new, p.is_bestseller
      from products p
      join categories c on c.id = p.category_id
     where p.status = 'active'
       and (c.path = p_path or c.path like p_path || ' > %')
  ),
  priced as (
    select s.*,
           min(pp.amount) filter (where pp.currency = p_currency) as price,
           coalesce(sum(pv.stock_count), 0) as stock
      from in_scope s
      left join product_variants pv on pv.product_id = s.id
      left join product_prices pp on pp.variant_id = pv.id
     group by s.id, s.tags, s.name, s.created_at,
              s.is_featured, s.is_new, s.is_bestseller
  ),
  matched as (
    select pr.*
      from priced pr
     where (p_tags is null or pr.tags && p_tags)
       and (p_min_price is null or pr.price >= p_min_price)
       and (p_max_price is null or pr.price <= p_max_price)
       and (p_in_stock is not true or pr.stock > 0)
       -- Within an axis any chosen value matches; across axes all must.
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
               -- A null price sorts last either way: a product with no price in
               -- this currency cannot be bought, so it does not deserve the top
               -- of a cheapest-first list.
               case when p_sort = 'price-low-high'  then m.price end asc nulls last,
               case when p_sort = 'price-high-low'  then m.price end desc nulls last,
               case when p_sort = 'name-a-z'        then m.name end asc,
               case when p_sort = 'name-z-a'        then m.name end desc,
               case when p_sort = 'newest'          then m.created_at end desc,
               -- 'featured' and anything unrecognised.
               case when p_sort not in ('price-low-high','price-high-low','name-a-z','name-z-a','newest')
                    then (m.is_featured::int * 4 + m.is_new::int * 2 + m.is_bestseller::int)
               end desc,
               -- A total order, so paging never repeats or skips a row.
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

comment on function public.filter_category_products is
  'One page of a category, narrowed and sorted in the database. `total_count` '
  'rides along on every row so the count and the page share one filter.';

grant execute on function public.filter_category_products(
  text, jsonb, text[], numeric, numeric, char, boolean, text, int, int
) to anon, authenticated;

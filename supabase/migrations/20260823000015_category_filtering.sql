-- Filtering and facets, in the database.
--
-- The category rail derived its axes from the products already on the page and
-- filtered them in the browser. That is correct while a shelf holds a dozen
-- items and wrong past a few hundred: the whole category has to be shipped to
-- the client before anything can be narrowed, and the counts beside each value
-- describe the page rather than the shelf.
--
-- Two functions. `category_facets` is what the rail renders; `filter_category_products`
-- is what the grid renders. Both take the same `path` and agree by construction
-- because they share the same filter.
--
-- Paths nest as 'Food & Pantry > Coffee & Tea', so a shelf means itself plus
-- everything under it — the same prefix match the category page already uses.

create or replace function public.category_facets(p_path text)
returns table (axis text, value text, hex text, product_count bigint)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id
      from products p
      join categories c on c.id = p.category_id
     where p.status = 'active'
       and (c.path = p_path or c.path like p_path || ' > %')
  ),
  -- Distinct per product, not per variant: the count answers "products you can
  -- buy in 250g", not "variants that are 250g".
  pairs as (
    select distinct
           po.name  as axis,
           pov.value as value,
           pov.hex   as hex,
           p.id      as product_id,
           po.position  as axis_position,
           pov.position as value_position
      from in_scope p
      join product_options po on po.product_id = p.id
      join product_option_values pov on pov.option_id = po.id
  )
  -- Grouped on axis and value alone. Grouping on the positions as well split
  -- "250g" into two rows whenever two products happened to list it at different
  -- positions in their own option sets — the rail showed the same value twice,
  -- each with part of the count. The positions come back as an aggregate purely
  -- to order by.
  select axis,
         value,
         max(hex) as hex,
         count(distinct product_id) as product_count
    from pairs
   group by axis, value
   -- The order the shopkeeper entered them, taking the earliest any product
   -- placed it. Sorting alphabetically puts 1kg before 250g, and so does
   -- sorting numerically; neither is how weights read.
   order by min(axis_position), axis, min(value_position), value;
$$;

comment on function public.category_facets is
  'Filter axes and their product counts for a category and everything beneath it.';

create or replace function public.filter_category_products(
  p_path      text,
  -- {"Weight": ["250g","1kg"], "Grind": ["Ground"]}
  p_options   jsonb   default '{}'::jsonb,
  p_tags      text[]  default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_currency  char(3) default 'NGN',
  p_in_stock  boolean default null
)
returns table (id uuid)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id, p.tags
      from products p
      join categories c on c.id = p.category_id
     where p.status = 'active'
       and (c.path = p_path or c.path like p_path || ' > %')
  ),
  priced as (
    select s.id, s.tags,
           min(pp.amount) filter (where pp.currency = p_currency) as price,
           coalesce(sum(pv.stock_count), 0) as stock
      from in_scope s
      left join product_variants pv on pv.product_id = s.id
      left join product_prices pp on pp.variant_id = pv.id
     group by s.id, s.tags
  )
  select pr.id
    from priced pr
   where (p_tags is null or pr.tags && p_tags)
     and (p_min_price is null or pr.price >= p_min_price)
     and (p_max_price is null or pr.price <= p_max_price)
     and (p_in_stock is not true or pr.stock > 0)
     -- Within an axis any chosen value matches; across axes all must. So
     -- "250g or 1kg" and "250g and Ground" both behave as they read.
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
     );
$$;

comment on function public.filter_category_products is
  'Product ids for a category and everything beneath it, narrowed by option '
  'axes, tags, price and availability. Pairs with category_facets.';

grant execute on function public.category_facets(text) to anon, authenticated;
grant execute on function public.filter_category_products(text, jsonb, text[], numeric, numeric, char, boolean) to anon, authenticated;

-- The prefix scan behind both.
create index if not exists product_options_product_idx on product_options (product_id, name);

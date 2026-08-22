-- Search results, on the same rails as a category.
--
-- Search stopped at the dialog: six ranked matches and the line "refine to
-- narrow", with nowhere to go. `search_product_ids()` has always ranked the
-- whole catalogue; nothing rendered past the sixth row.
--
-- Rather than a second filtering implementation for search, the category
-- functions are generalised: both `p_path` and `p_search` are optional, and a
-- caller supplies whichever scope it has. A search page then gets the same
-- axes, the same counts, the same paging and the same sorts as a shelf, because
-- it is the same query.

create or replace function public.product_facets(
  p_path   text default null,
  p_search text default null
)
returns table (axis text, value text, hex text, product_count bigint)
language sql stable security invoker set search_path = public as $$
  with in_scope as (
    select p.id
      from products p
      left join categories c on c.id = p.category_id
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (
         p_search is null
         or btrim(p_search) = ''
         or p.search_vector @@ websearch_to_tsquery('english', p_search)
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

comment on function public.product_facets is
  'Filter axes and counts for a category, a search, or both. Supersedes '
  'category_facets, which only understood a path.';

create or replace function public.filter_products(
  p_path      text    default null,
  p_search    text    default null,
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
           p.is_featured, p.is_new, p.is_bestseller,
           case
             when p_search is null or btrim(p_search) = '' then 0
             else ts_rank(p.search_vector, websearch_to_tsquery('english', p_search))
           end as rank
      from products p
      left join categories c on c.id = p.category_id
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (
         p_search is null
         or btrim(p_search) = ''
         or p.search_vector @@ websearch_to_tsquery('english', p_search)
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
               -- Relevance is the default when there is a query: someone who
               -- typed "coffee" wants the best match first, not the newest.
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

comment on function public.filter_products is
  'One page of products, scoped by category path and/or full-text search, '
  'narrowed by axes, tags, price and availability, sorted and paged.';

grant execute on function public.product_facets(text, text) to anon, authenticated;
grant execute on function public.filter_products(
  text, text, jsonb, text[], numeric, numeric, char, boolean, text, int, int
) to anon, authenticated;

-- The category-only pair are now thin wrappers, so nothing that still calls
-- them breaks while the app moves across.
create or replace function public.category_facets(p_path text)
returns table (axis text, value text, hex text, product_count bigint)
language sql stable security invoker set search_path = public as $$
  select * from public.product_facets(p_path, null);
$$;

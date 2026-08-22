-- Make search behave the way people type.
--
-- Two things were wrong. `q=co` returned nothing, because
-- `websearch_to_tsquery('english','co')` looks for the lexeme "co" and no
-- product contains that word — a shopper typing the first two letters of
-- "coffee" got an empty page. And the index covered name, summary and
-- description only, so a product's tags, its SKU and its item type were
-- invisible to search even though the admin collects all three.

-- ------------------------------------------------------------- the query
-- Each word becomes a prefix match, and all of them are required: "ground co"
-- means ground AND co*, which is what someone narrowing a search expects.
--
-- Terms are quoted before they reach `to_tsquery`, which otherwise reads `&`,
-- `|`, `!` and `:` in user input as operators and raises a syntax error on
-- anything with punctuation in it.
create or replace function public.search_query(p_input text)
returns tsquery
language plpgsql immutable strict parallel safe set search_path = public as $$
declare
  v_terms text[];
  v_query text;
begin
  select array_agg(term)
    into v_terms
    from unnest(regexp_split_to_array(lower(btrim(p_input)), '[^a-z0-9]+')) as term
   where term <> '';

  if v_terms is null or cardinality(v_terms) = 0 then
    return null;
  end if;

  select string_agg(quote_literal(term) || ':*', ' & ')
    into v_query
    from unnest(v_terms) as term;

  return to_tsquery('english', v_query);
exception
  -- A query that still will not parse should return nothing, not break the page.
  when others then return null;
end $$;

comment on function public.search_query is
  'User input -> a prefix tsquery. Every word is a prefix match and all are '
  'required, so "co" finds Coffee and "ground co" finds ground coffee.';

-- --------------------------------------------------------- what is indexed
-- `array_to_string` is declared STABLE rather than IMMUTABLE — it depends on
-- the element type's output function in general — so a generated column refuses
-- it. For `text[]` it genuinely is immutable, which is what this wrapper
-- asserts. Without it the tags cannot be part of the stored vector at all.
create or replace function public.text_array_to_string(p_values text[])
returns text
language sql immutable strict parallel safe set search_path = public as $$
  select array_to_string(p_values, ' ');
$$;

-- A generated column cannot be altered in place, and dropping it takes its
-- index with it.
drop index if exists products_search_idx;
alter table products drop column if exists search_vector;

alter table products add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    -- Tags are how a shopkeeper describes a thing in words the description may
    -- not use — 'ramadan', 'gift'. Weighted with the summary.
    setweight(to_tsvector('english', coalesce(public.text_array_to_string(tags), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    -- Someone who knows the code should be able to type it.
    setweight(to_tsvector('english', coalesce(sku, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(item_type, '')), 'D')
  ) stored;

create index products_search_idx on products using gin (search_vector);

-- ------------------------------------------------------- use it everywhere
create or replace function public.search_product_ids(p_query text)
returns table (id uuid, rank real)
language sql stable set search_path = public as $$
  select p.id, ts_rank(p.search_vector, public.search_query(p_query)) as rank
  from products p
  where public.search_query(p_query) is not null
    and p.search_vector @@ public.search_query(p_query)
  order by rank desc;
$$;

grant execute on function public.search_query(text) to anon, authenticated;
grant execute on function public.search_product_ids(text) to anon, authenticated;

-- ---------------------------------------------- the filter functions follow
-- `filter_products` and `product_facets` were calling `websearch_to_tsquery`
-- directly, so they would have kept returning nothing for a partial word even
-- with the vector rebuilt.
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
       -- "No search asked for" and "searched, but nothing searchable in it"
       -- are different answers. A blank `p_search` means a category page with
       -- no query, so everything passes; a query of "!!!" parses to no terms
       -- and must be a miss, not the whole catalogue.
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
             when public.search_query(coalesce(p_search, '')) is null then 0
             else ts_rank(p.search_vector, public.search_query(p_search))
           end as rank
      from products p
      left join categories c on c.id = p.category_id
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       -- "No search asked for" and "searched, but nothing searchable in it"
       -- are different answers. A blank `p_search` means a category page with
       -- no query, so everything passes; a query of "!!!" parses to no terms
       -- and must be a miss, not the whole catalogue.
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

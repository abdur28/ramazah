-- A product can belong to more than one collection.
--
-- `products.collection_id` was a single column, so membership was last-write-
-- wins: seeding a Cairo run and then a Ramadan table silently moved the dates
-- and the coffee out of the run. Nothing was lost by accident — the model only
-- had room for one answer.
--
-- That is wrong for how this shop groups things. A collection here is either a
-- buying run ("everything from the March trip") or an occasion ("Ramadan
-- table"), and those overlap by their nature: the same tin of coffee came back
-- on the March run *and* belongs on the Ramadan table. Categories are a tree and
-- stay single-valued; collections are curation and have to be many.
--
-- The column goes rather than staying alongside the join table. Two places to
-- record the same fact is how they drift.

create table if not exists product_collections (
  product_id    uuid not null references products(id)    on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (product_id, collection_id)
);

comment on table product_collections is
  'Which collections a product is in. Many-to-many: a buying run and an '
  'occasion routinely claim the same product.';

-- The primary key already indexes (product_id, collection_id); this one serves
-- the other direction, which is the common read — "what is in this collection".
create index if not exists product_collections_collection_idx
  on product_collections (collection_id);

alter table product_collections enable row level security;

-- Membership is only interesting for a product the caller can already see, so
-- the read policy defers to the products policy rather than restating it.
drop policy if exists "product collections public" on product_collections;
create policy "product collections public" on product_collections for select
  using (exists (select 1 from products p where p.id = product_id
                 and (p.status = 'active' or public.is_admin())));

drop policy if exists "product collections admin" on product_collections;
create policy "product collections admin" on product_collections for all
  using (public.is_admin()) with check (public.is_admin());

-- Table privileges are explicit in this project rather than inherited from
-- default privileges, and a new table starts with none: RLS decides which rows
-- a role sees, the grant decides whether it can reach the table at all. Without
-- these the admin gets "permission denied for table product_collections" no
-- matter what the policies say. Mirrors `collections`.
grant select on product_collections to anon;
grant select, insert, update, delete on product_collections to authenticated;
grant all on product_collections to service_role;

-- Carry over what the single column held. `on conflict do nothing` so a re-run
-- is harmless.
insert into product_collections (product_id, collection_id)
select p.id, p.collection_id
  from products p
 where p.collection_id is not null
on conflict do nothing;

-- ============ THE HOME PAGE PICKS ONE ============
--
-- `is_featured` arrived meaning "one of the two or three worth putting on the
-- front page", and then the home page ended up showing exactly one band. A flag
-- that permits three while the design renders one leaves the other two set and
-- invisible — the shop owner ticks a box and nothing happens.
--
-- So the flag now means what the page does: this is *the* collection on the
-- home page, and at most one row can carry it.
comment on column collections.is_featured is
  'The one collection shown on the home page. At most one row is true — see '
  'collections_one_featured_idx and set_home_collection().';

-- Anything already featured beyond the first has to go before the index exists,
-- or creating it fails. Done here in plain SQL rather than through
-- set_home_collection() below: the migration runs as the owner, not as a
-- signed-in admin, so is_admin() is false and the guard would refuse.
update collections set is_featured = false
 where is_featured
   and id is distinct from (
     select id from collections where is_featured order by sort_order, name limit 1
   );

-- A partial unique index on a constant: every row where is_featured is true
-- indexes the same key, so the second one is rejected.
create unique index if not exists collections_one_featured_idx
  on collections ((true)) where is_featured;

-- Setting it directly would mean clearing the old one first and hoping nothing
-- fails in between. This does both halves in one function call, so the index
-- never sees two.
create or replace function public.set_home_collection(p_collection uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can choose the home page collection'
      using errcode = '42501';
  end if;

  update collections set is_featured = false
   where is_featured and (p_collection is null or id <> p_collection);

  if p_collection is not null then
    update collections set is_featured = true where id = p_collection;
    if not found then
      raise exception 'No such collection' using errcode = 'P0002';
    end if;
  end if;
end $$;

comment on function public.set_home_collection(uuid) is
  'Pick the home page collection, or pass null to show none. Clears the '
  'previous one in the same transaction.';

grant execute on function public.set_home_collection(uuid) to authenticated;

-- Only one row can be featured, so ordering by sort_order under it is dead
-- weight. Keep sort_order — it orders the /collections index — but index it on
-- its own.
drop index if exists collections_featured_idx;
create index if not exists collections_sort_idx on collections (sort_order, name);

-- ============ READERS MOVE TO THE JOIN TABLE ============

-- The view holds `collection_id` and a single `collection_slug`, both of which
-- stop meaning anything. `create or replace view` cannot change a column list,
-- so it is dropped and rebuilt; `collection_slugs` is an array, which PostgREST
-- filters with `cs` (contains).
drop view if exists product_listing;

create view product_listing with (security_invoker = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.short_description,
  p.sku,
  p.status,
  p.item_type,
  p.tags,
  p.materials,
  p.details,
  p.is_new,
  p.is_featured,
  p.is_bestseller,
  p.is_limited_edition,
  p.is_perishable,
  p.care_instructions,
  p.meta_title,
  p.meta_description,
  p.meta_keywords,
  p.rating_avg,
  p.rating_count,
  p.view_count,
  p.sales_count,
  p.low_stock_alert,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.category_id,
  c.path   as category_path,
  c.slug   as category_slug,
  coalesce(cols.slugs, '{}')       as collection_slugs,
  coalesce(cols.names, '{}')       as collection_names,
  coalesce(v.total_stock, 0)       as total_stock,
  coalesce(v.total_stock, 0) > 0   as in_stock,
  v.min_price,
  v.max_price,
  v.price_currency
from products p
left join categories c on c.id = p.category_id
left join lateral (
  select array_agg(col.slug order by col.sort_order, col.name) as slugs,
         array_agg(col.name order by col.sort_order, col.name) as names
    from product_collections pc
    join collections col on col.id = pc.collection_id
   where pc.product_id = p.id
) cols on true
left join lateral (
  select
    sum(pv.stock_count) as total_stock,
    min(pp.amount)      as min_price,
    max(pp.amount)      as max_price,
    min(pp.currency)    as price_currency
  from product_variants pv
  left join product_prices pp on pp.variant_id = pv.id
  where pv.product_id = p.id
) v on true;

grant select on product_listing to anon, authenticated;
grant select on product_listing to service_role;

-- `p_collection` was a left join to the one collection a product could have. It
-- becomes an existence check, which is also the shape that stays correct once a
-- product is in several.
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
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (
         p_collection is null
         or exists (
           select 1 from product_collections pc
             join collections col on col.id = pc.collection_id
            where pc.product_id = p.id and col.slug = p_collection
         )
       )
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
     where p.status = 'active'
       and (p_path is null or c.path = p_path or c.path like p_path || ' > %')
       and (
         p_collection is null
         or exists (
           select 1 from product_collections pc
             join collections col on col.id = pc.collection_id
            where pc.product_id = p.id and col.slug = p_collection
         )
       )
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
    left join product_collections pc on pc.collection_id = c.id
    left join products p on p.id = pc.product_id
   group by c.id
   order by c.sort_order, c.name;
$$;

-- Product counts per collection for the admin index, in one round trip. The
-- admin was fetching every product's collection_id and counting in JavaScript;
-- with a join table that becomes a second query, so it moves into the database.
-- Counts every product, not just active ones — a draft still occupies the edit.
create or replace function public.admin_collection_counts()
returns table (collection_id uuid, product_count bigint)
language sql stable security invoker set search_path = public as $$
  select pc.collection_id, count(*) as product_count
    from product_collections pc
   group by pc.collection_id;
$$;

grant execute on function public.admin_collection_counts() to authenticated;

-- Last, so everything above is already reading the join table.
alter table products drop column if exists collection_id;

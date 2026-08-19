-- Product-level aggregates for listing, filtering and sorting.
-- Stock and price live on variants, so without this the app would have to filter
-- in memory again — the exact defect this migration set out to remove.
--
-- security_invoker: RLS on the underlying tables applies to the caller, so drafts
-- stay invisible to shoppers.
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
  p.collection_id,
  c.path   as category_path,
  c.slug   as category_slug,
  col.slug as collection_slug,
  coalesce(v.total_stock, 0)       as total_stock,
  coalesce(v.total_stock, 0) > 0   as in_stock,
  v.min_price,
  v.max_price,
  v.price_currency
from products p
left join categories  c   on c.id = p.category_id
left join collections col on col.id = p.collection_id
left join lateral (
  select
    sum(pv.stock_count)                    as total_stock,
    min(pp.amount)                         as min_price,
    max(pp.amount)                         as max_price,
    min(pp.currency)                       as price_currency
  from product_variants pv
  left join product_prices pp on pp.variant_id = pv.id
  where pv.product_id = p.id
) v on true;

grant select on product_listing to anon, authenticated;
grant select on product_listing to service_role;

-- Ranked full-text search. Returns ids so callers can hydrate however they like.
create or replace function public.search_product_ids(p_query text)
returns table (id uuid, rank real)
language sql stable as $$
  select p.id, ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from products p
  where p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc;
$$;

grant execute on function public.search_product_ids(text) to anon, authenticated;

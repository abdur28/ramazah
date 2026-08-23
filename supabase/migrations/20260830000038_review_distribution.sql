-- The star breakdown, counted over every review rather than the page.
--
-- `ProductReviews` drew its five bars from the reviews it had loaded, which was
-- all of them because the query had no limit. Paging the list would have turned
-- that into a breakdown of the fifty most recent reviews presented as the
-- breakdown of the product's reviews — and on a product with a bad month
-- followed by a good one, the two are not the same picture at all.
--
-- Reads `review_public`, not `reviews`, so it counts exactly the rows a shopper
-- can see: approved only, by the same definition the list uses. Counting the
-- underlying table would include reviews still waiting on moderation and
-- rejected ones, and the bars would not add up to the list beneath them.
create or replace function public.review_distribution(p_product uuid)
returns table (rating int, tally int)
language sql stable security invoker set search_path = public as $$
  select r.rating::int, count(*)::int
    from review_public r
   where r.product_id = p_product
   group by r.rating;
$$;

comment on function public.review_distribution(uuid) is
  'Star breakdown for one product, over every approved review.';

grant execute on function public.review_distribution(uuid) to anon, authenticated;

-- Approved reviews, with their author's display name.
--
-- `profiles` is readable only by its owner and admins, which is correct — but
-- it means a shopper cannot see who wrote a review, and a review signed "a
-- customer" is worth very little. This view is the narrow exception: for
-- approved reviews only, it exposes the display name and nothing else from the
-- profile. No email, no phone, no role.
--
-- `security_invoker = false` (the default) makes the view run as its owner, so
-- it can read profiles on the reader's behalf. The where-clause is the security
-- boundary: rows that are not approved never leave the database through it.
--
-- Mirrors the pattern used by `product_listing`.

create or replace view review_public
with (security_invoker = false) as
select
  r.id,
  r.product_id,
  r.rating,
  r.title,
  r.body,
  r.helpful_count,
  r.created_at,
  -- Verified when the review is tied to a real order line.
  (r.order_item_id is not null) as is_verified_purchase,
  coalesce(nullif(trim(p.display_name), ''), 'Customer') as author_name
from reviews r
join profiles p on p.id = r.user_id
where r.status = 'approved';

comment on view review_public is
  'Approved reviews plus the author display name. The only route by which one '
  'customer sees another customer name, and it exposes nothing else.';

grant select on review_public to anon, authenticated;

-- Shop replies are already public; this pairs them with the same shape.
create index if not exists reviews_product_status_created_idx
  on reviews (product_id, status, created_at desc);

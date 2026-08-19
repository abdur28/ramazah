-- Ramazah: Row Level Security.
-- RLS is the security boundary for BOTH the web app and any future mobile client.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','categories','collections','products','product_images',
    'product_variants','product_options','product_option_values','variant_option_values',
    'variant_images','product_prices','cart_items','wishlist_items',
    'discount_codes','orders','order_items','order_status_history','discount_redemptions',
    'inventory_movements','reviews','review_images','review_votes','review_replies'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ============ GRANTS ============
-- "Automatically expose new tables" is off, so privileges are explicit.
grant usage on schema public to anon, authenticated, service_role;

-- service_role bypasses RLS but still needs table privileges. Without this,
-- every privileged server-side operation fails with "permission denied".
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Public catalog: readable by everyone (RLS still filters rows).
grant select on categories, collections, products, product_images,
                product_variants, product_options, product_option_values,
                variant_option_values, variant_images, product_prices,
                reviews, review_images, review_replies
  to anon, authenticated;

-- Signed-in users manage their own data.
grant select, insert, update, delete on
  profiles, addresses, cart_items, wishlist_items, reviews, review_images, review_votes
  to authenticated;
grant select on orders, order_items, order_status_history to authenticated;

-- Admin writes go through these tables under is_admin() policies.
grant insert, update, delete on
  categories, collections, products, product_images, product_variants,
  product_options, product_option_values, variant_option_values,
  variant_images, product_prices, discount_codes, review_replies
  to authenticated;
grant select, insert, update, delete on discount_codes, inventory_movements to authenticated;
grant update on orders to authenticated;
grant select on discount_redemptions to authenticated;

grant execute on function public.create_order(
  jsonb, delivery_type, text, text, text, char, jsonb, text, numeric, numeric, numeric, text, text
) to authenticated;

-- ============ IDENTITY ============
create policy "own profile readable"    on profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile updatable"   on profiles for update using (id = auth.uid() or public.is_admin())
                                                                with check (id = auth.uid() or public.is_admin());
create policy "own addresses"           on addresses for all using (user_id = auth.uid() or public.is_admin())
                                                        with check (user_id = auth.uid());

-- ============ CATALOG (public read, admin write) ============
create policy "categories public"   on categories  for select using (true);
create policy "categories admin"    on categories  for all    using (public.is_admin()) with check (public.is_admin());
create policy "collections public"  on collections for select using (true);
create policy "collections admin"   on collections for all    using (public.is_admin()) with check (public.is_admin());

create policy "active products public" on products for select
  using (status = 'active' or public.is_admin());
create policy "products admin" on products for all
  using (public.is_admin()) with check (public.is_admin());

create policy "product images public" on product_images for select
  using (exists (select 1 from products p where p.id = product_id
                 and (p.status = 'active' or public.is_admin())));
create policy "product images admin" on product_images for all
  using (public.is_admin()) with check (public.is_admin());

create policy "variants public" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id
                 and (p.status = 'active' or public.is_admin())));
create policy "variants admin" on product_variants for all
  using (public.is_admin()) with check (public.is_admin());

create policy "options public" on product_options for select using (true);
create policy "options admin"  on product_options for all
  using (public.is_admin()) with check (public.is_admin());
create policy "option values public" on product_option_values for select using (true);
create policy "option values admin"  on product_option_values for all
  using (public.is_admin()) with check (public.is_admin());
create policy "variant options public" on variant_option_values for select using (true);
create policy "variant options admin"  on variant_option_values for all
  using (public.is_admin()) with check (public.is_admin());

create policy "variant images public" on variant_images for select using (true);
create policy "variant images admin"  on variant_images for all
  using (public.is_admin()) with check (public.is_admin());

create policy "prices public" on product_prices for select using (true);
create policy "prices admin"  on product_prices for all
  using (public.is_admin()) with check (public.is_admin());

-- ============ CART & WISHLIST (owner only) ============
create policy "own cart"     on cart_items     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist" on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ ORDERS ============
-- Inserts happen only through create_order(); no INSERT policy exists on purpose.
create policy "own orders readable" on orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy "orders admin update" on orders for update
  using (public.is_admin()) with check (public.is_admin());

create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.is_admin())));

create policy "own order history" on order_status_history for select
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.is_admin())));

-- ============ DISCOUNTS (admin only; validation happens inside create_order) ============
create policy "discounts admin" on discount_codes for all
  using (public.is_admin()) with check (public.is_admin());
create policy "own redemptions" on discount_redemptions for select
  using (user_id = auth.uid() or public.is_admin());

-- ============ INVENTORY (admin only — never public) ============
create policy "inventory admin" on inventory_movements for all
  using (public.is_admin()) with check (public.is_admin());

-- ============ REVIEWS ============
create policy "approved reviews public" on reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());

-- A review may only be written by someone who actually bought the product.
create policy "verified purchasers write reviews" on reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = auth.uid()
        and o.status in ('delivered','shipped')
    )
  );

create policy "own reviews editable" on reviews for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "own reviews deletable" on reviews for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "review images public" on review_images for select
  using (exists (select 1 from reviews r where r.id = review_id
                 and (r.status = 'approved' or r.user_id = auth.uid() or public.is_admin())));
create policy "own review images" on review_images for all
  using (exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()));

create policy "own votes" on review_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "replies public" on review_replies for select using (true);
create policy "replies admin"  on review_replies for all
  using (public.is_admin()) with check (public.is_admin());

-- Ramazah: triggers, helpers, and the atomic order RPC

-- ============ GENERIC ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','categories','collections','products','product_variants',
    'product_prices','cart_items','orders','discount_codes','reviews','review_replies'
  ] loop
    execute format(
      'create trigger set_updated_at before update on %I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============ AUTH ============
-- SECURITY DEFINER so RLS policies can call it without recursing into profiles' own policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CATEGORY PATH ============
create or replace function public.category_path_for(p_parent uuid, p_name text)
returns text language plpgsql stable as $$
declare v_parent_path text;
begin
  if p_parent is null then return p_name; end if;
  select path into v_parent_path from categories where id = p_parent;
  return coalesce(v_parent_path || ' > ', '') || p_name;
end $$;

create or replace function public.maintain_category_path()
returns trigger language plpgsql as $$
begin
  new.path := public.category_path_for(new.parent_id, new.name);
  return new;
end $$;

create trigger categories_set_path
  before insert or update of name, parent_id on categories
  for each row execute function public.maintain_category_path();

-- Rewrite descendant paths when a category is renamed or reparented.
create or replace function public.cascade_category_path()
returns trigger language plpgsql as $$
begin
  if new.path is distinct from old.path then
    update categories set path = public.category_path_for(parent_id, name)
    where parent_id = new.id;
  end if;
  return null;
end $$;

create trigger categories_cascade_path
  after update of path on categories
  for each row execute function public.cascade_category_path();

-- ============ REVIEW AGGREGATES ============
create or replace function public.refresh_product_rating()
returns trigger language plpgsql as $$
declare v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update products p set
    rating_avg = coalesce((
      select round(avg(rating)::numeric, 2) from reviews
      where product_id = v_product and status = 'approved'), 0),
    rating_count = (
      select count(*) from reviews
      where product_id = v_product and status = 'approved')
  where p.id = v_product;
  return null;
end $$;

create trigger reviews_refresh_rating
  after insert or update or delete on reviews
  for each row execute function public.refresh_product_rating();

create or replace function public.refresh_review_helpful()
returns trigger language plpgsql as $$
declare v_review uuid := coalesce(new.review_id, old.review_id);
begin
  update reviews set helpful_count = (
    select count(*) from review_votes where review_id = v_review and is_helpful
  ) where id = v_review;
  return null;
end $$;

create trigger review_votes_refresh
  after insert or update or delete on review_votes
  for each row execute function public.refresh_review_helpful();

-- ============ ORDER STATUS HISTORY ============
create or replace function public.log_order_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return null;
end $$;

create trigger orders_log_status
  after insert or update of status on orders
  for each row execute function public.log_order_status();

-- ============ ATOMIC ORDER CREATION ============
-- Prices are read from the database, never trusted from the client.
create or replace function public.create_order(
  p_items           jsonb,                       -- [{"variant_id":"uuid","quantity":2}]
  p_delivery_type   delivery_type,
  p_customer_name   text,
  p_customer_email  text,
  p_customer_phone  text,
  p_currency        char(3) default 'NGN',
  p_shipping_address jsonb default null,
  p_discount_code   text    default null,
  p_shipping_cost   numeric default 0,
  p_tax_amount      numeric default 0,
  p_tax_rate        numeric default null,
  p_customer_notes  text    default null,
  p_idempotency_key text    default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_user      uuid := auth.uid();
  v_order     orders;
  v_item      record;
  v_stock     int;
  v_price     numeric(12,2);
  v_detail    record;
  v_subtotal  numeric(12,2) := 0;
  v_discount  numeric(12,2) := 0;
  v_total     numeric(12,2);
  v_code      discount_codes;
  v_used      int;
  v_number    text;
  v_lines     jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Idempotency: same key returns the original order instead of duplicating.
  if p_idempotency_key is not null then
    select * into v_order from orders
    where idempotency_key = p_idempotency_key and user_id = v_user;
    if found then return v_order; end if;
  end if;

  -- Pass 1: lock variants, validate stock, price from DB.
  for v_item in
    select * from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity int)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Invalid quantity for variant %', v_item.variant_id;
    end if;

    select stock_count into v_stock
    from product_variants where id = v_item.variant_id for update;

    if not found then
      raise exception 'Variant % not found', v_item.variant_id;
    end if;
    if v_stock < v_item.quantity then
      raise exception 'Insufficient stock for variant %: % available, % requested',
        v_item.variant_id, v_stock, v_item.quantity;
    end if;

    select pv.id, pv.sku, pv.product_id, pv.expiry_date, p.name as product_name,
           p.status, p.is_perishable,
           (select secure_url from product_images
             where product_id = p.id order by is_primary desc, position limit 1) as image_url,
           (select string_agg(ov.value, ' / ' order by po.position, ov.position)
              from variant_option_values vov
              join product_option_values ov on ov.id = vov.option_value_id
              join product_options po on po.id = ov.option_id
             where vov.variant_id = pv.id) as variant_label,
           coalesce((select jsonb_object_agg(po.name, ov.value)
              from variant_option_values vov
              join product_option_values ov on ov.id = vov.option_value_id
              join product_options po on po.id = ov.option_id
             where vov.variant_id = pv.id), '{}'::jsonb) as options
      into v_detail
      from product_variants pv
      join products p on p.id = pv.product_id
     where pv.id = v_item.variant_id;

    if v_detail.status <> 'active' then
      raise exception 'Product % is not available for purchase', v_detail.product_name;
    end if;

    if v_detail.is_perishable and v_detail.expiry_date is not null
       and v_detail.expiry_date <= current_date then
      raise exception 'Product % has expired (%) and cannot be sold',
        v_detail.product_name, v_detail.expiry_date;
    end if;

    select amount into v_price
      from product_prices
     where variant_id = v_item.variant_id and currency = p_currency;

    if not found then
      raise exception 'No % price set for variant %', p_currency, v_item.variant_id;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'variant_id', v_item.variant_id, 'product_id', v_detail.product_id,
      'name', v_detail.product_name, 'sku', v_detail.sku,
      'variant_label', v_detail.variant_label, 'options', v_detail.options,
      'image_url', v_detail.image_url, 'unit_price', v_price,
      'quantity', v_item.quantity, 'line_total', v_price * v_item.quantity
    );
    v_subtotal := v_subtotal + (v_price * v_item.quantity);
  end loop;

  -- Discount code
  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into v_code from discount_codes
     where code = p_discount_code and is_active for update;

    if not found then raise exception 'Invalid discount code'; end if;
    if v_code.starts_at is not null and now() < v_code.starts_at then
      raise exception 'Discount code is not yet active'; end if;
    if v_code.ends_at is not null and now() > v_code.ends_at then
      raise exception 'Discount code has expired'; end if;
    if v_subtotal < v_code.min_order_amount then
      raise exception 'Order subtotal below minimum of % for this code', v_code.min_order_amount; end if;
    if v_code.max_redemptions is not null and v_code.redemption_count >= v_code.max_redemptions then
      raise exception 'Discount code has reached its redemption limit'; end if;

    select count(*) into v_used from discount_redemptions
     where discount_code_id = v_code.id and user_id = v_user;
    if v_used >= v_code.max_per_user then
      raise exception 'You have already used this discount code'; end if;

    v_discount := case v_code.type
      when 'percentage'   then round(v_subtotal * v_code.value / 100, 2)
      when 'fixed_amount' then least(v_code.value, v_subtotal)
    end;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0)
             + coalesce(p_tax_amount, 0) + coalesce(p_shipping_cost, 0);

  v_number := 'RMZ-' || lpad(nextval('order_number_seq')::text, 5, '0');

  insert into orders (
    order_number, user_id, delivery_type, currency,
    subtotal, discount_amount, discount_code_id, tax_amount, tax_rate,
    shipping_cost, total,
    ship_full_name, ship_phone, ship_street, ship_city, ship_state, ship_postal_code, ship_country,
    customer_name, customer_email, customer_phone, customer_notes, idempotency_key
  ) values (
    v_number, v_user, p_delivery_type, p_currency,
    v_subtotal, v_discount, v_code.id, coalesce(p_tax_amount,0), p_tax_rate,
    coalesce(p_shipping_cost,0), v_total,
    p_shipping_address->>'full_name', p_shipping_address->>'phone',
    p_shipping_address->>'street', p_shipping_address->>'city',
    p_shipping_address->>'state', p_shipping_address->>'postal_code',
    coalesce(p_shipping_address->>'country', 'Nigeria'),
    p_customer_name, p_customer_email, p_customer_phone, p_customer_notes, p_idempotency_key
  ) returning * into v_order;

  -- Pass 2: items, stock decrement, ledger.
  for v_item in
    select * from jsonb_to_recordset(v_lines) as x(
      variant_id uuid, product_id uuid, name text, sku text,
      variant_label text, options jsonb, image_url text,
      unit_price numeric(12,2), quantity int, line_total numeric(12,2))
  loop
    insert into order_items (
      order_id, product_id, variant_id, name, sku,
      variant_label, options, image_url, unit_price, quantity, line_total
    ) values (
      v_order.id, v_item.product_id, v_item.variant_id, v_item.name, v_item.sku,
      v_item.variant_label, v_item.options, v_item.image_url,
      v_item.unit_price, v_item.quantity, v_item.line_total
    );

    update product_variants
       set stock_count = stock_count - v_item.quantity
     where id = v_item.variant_id
    returning stock_count into v_stock;

    insert into inventory_movements (variant_id, delta, reason, stock_after, order_id, actor_id)
    values (v_item.variant_id, -v_item.quantity, 'sale', v_stock, v_order.id, v_user);

    update products set sales_count = sales_count + v_item.quantity
     where id = v_item.product_id;
  end loop;

  if v_code.id is not null then
    insert into discount_redemptions (discount_code_id, user_id, order_id, amount_applied)
    values (v_code.id, v_user, v_order.id, v_discount);
    update discount_codes set redemption_count = redemption_count + 1 where id = v_code.id;
  end if;

  -- Purchased variants leave the cart in the same transaction.
  delete from cart_items
   where user_id = v_user
     and variant_id in (select (x->>'variant_id')::uuid from jsonb_array_elements(v_lines) x);

  return v_order;
end $$;

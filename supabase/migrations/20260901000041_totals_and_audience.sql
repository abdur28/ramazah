-- Two holes in SECURITY DEFINER, which is the one layer RLS does not cover.
--
-- Both were found by calling the database as an ordinary signed-in customer
-- rather than by reading the code. The shapes are different but the cause is
-- the same: a definer function is trusted by definition, so anything it does
-- not check for itself, nothing else checks either.

-- ============ SETTINGS, READABLE FROM SQL ============
--
-- Mirrors `email_setting`, which already existed for the reminder cadence. The
-- money group is public under RLS, but this is `security definer` for the same
-- reason that one is: a trigger or an RPC needs the value regardless of who is
-- calling, and falls back to the code default when the row is absent.
create or replace function public.money_setting(p_field text, p_default numeric)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> p_field)::numeric from site_settings where key = 'money'),
    p_default
  );
$$;

comment on function public.money_setting(text, numeric) is
  'One number from the money settings group, with the code default behind it. '
  'Defaults here must match lib/settings-defaults.ts.';

grant execute on function public.money_setting(text, numeric) to authenticated, service_role;

-- ============ THE MAILING LIST WAS PUBLIC ============
--
-- `campaign_audience` is `security definer` and returns every opted-in
-- customer's address and name. `authenticated` could execute it, so any signed
-- in account -- including one somebody registers in thirty seconds -- could
-- read the shop's entire list with a single RPC call.
--
-- RLS on `profiles` was working perfectly: the same session selecting from the
-- table directly got one row, its own. The definer function walked past it,
-- which is exactly what `security definer` means and exactly why every one of
-- them needs its own guard.
--
-- Converted to plpgsql only so it can refuse out loud. Returning nothing would
-- have closed the hole just as well and told the caller nothing about why.
-- The query below is unchanged.
create or replace function public.campaign_audience(p_segment text)
returns table (email text, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can read the campaign audience'
      using errcode = '42501';
  end if;

  return query
  with accounts as (
    select p.id, p.email::text as email, p.display_name as name
      from profiles p
     where coalesce(p.email_opt_in, true)
       and coalesce(p.status, 'active') = 'active'
  ),
  ordered as (
    select user_id, max(created_at) as last_order
      from orders where user_id is not null group by user_id
  )
  select a.email, a.name from accounts a
   where p_segment = 'all'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'customers'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'recent' and o.last_order > now() - interval '90 days'
  union
  select a.email, a.name from accounts a join ordered o on o.user_id = a.id
   where p_segment = 'lapsed' and o.last_order < now() - interval '180 days'
  union
  select a.email, a.name from accounts a
   where p_segment = 'never'
     and not exists (select 1 from ordered o where o.user_id = a.id)
  union
  -- Footer signups with no account. They filled the box on the storefront and
  -- nothing could reach them until the mailer learned to read this table.
  select s.email::text, null from newsletter_subscribers s
   where s.is_active
     and p_segment in ('all', 'subscribers')
     and not exists (select 1 from profiles p where p.email = s.email);
end $$;

comment on function public.campaign_audience(text) is
  'Who a campaign would reach. Admin only -- it returns other people''s email '
  'addresses, and security definer means RLS will not stop it.';

-- ============ THE TOTAL WAS THE CALLER'S TO DECIDE ============
--
-- `create_order` read item prices from `product_prices`, so those could never
-- be tampered with -- and then took `p_tax_amount` and `p_shipping_cost` from
-- the caller and added them to the total as given.
--
-- Measured as an ordinary customer, sending zero for both: a 12,500 order was
-- accepted, written and invoiced at 12,500 rather than 15,937.50. 7.5% VAT and
-- 2,500 delivery, gone, on every order anyone cared to place through the RPC
-- instead of the checkout.
--
-- The two parameters stay in the signature and are now ignored. Dropping them
-- would mean dropping and recreating the function, and every caller already
-- sends them; ignoring them is the change that cannot break anything.
-- `lib/orders.ts` stops sending them in the same commit.
CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_delivery_type delivery_type, p_customer_name text, p_customer_email text, p_customer_phone text, p_currency character DEFAULT 'NGN'::bpchar, p_shipping_address jsonb DEFAULT NULL::jsonb, p_discount_code text DEFAULT NULL::text, p_shipping_cost numeric DEFAULT 0, p_tax_amount numeric DEFAULT 0, p_tax_rate numeric DEFAULT NULL::numeric, p_customer_notes text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_tax       numeric(12,2);
  v_shipping  numeric(12,2);
  v_tax_rate  numeric;
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

    -- No `for update`: this reads availability, it no longer claims it. The row
    -- lock only mattered while the decrement happened in this transaction.
    select stock_count into v_stock
    from product_variants where id = v_item.variant_id;

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

  -- VAT and delivery are the shop's numbers, not the caller's.
  --
  -- These arrived as p_tax_amount and p_shipping_cost and were added to the
  -- total as given, so a client calling this RPC directly could send zero for
  -- both: a 12,500 order settled at 12,500 instead of 15,937.50, skipping 7.5%
  -- VAT and 2,500 delivery. Item prices were never exposed that way -- they are
  -- read from product_prices below -- which made the gap easy to miss.
  --
  -- The rule is the one the checkout shows the customer: VAT on the subtotal
  -- before any discount, and delivery waived above the free-shipping threshold
  -- or when they are collecting in person.
  --
  -- Staff-raised orders keep their own figures. create_manual_order is a
  -- separate function behind is_admin(), because waiving delivery for a
  -- regular on WhatsApp is a real thing to be able to do.
  v_tax_rate := public.money_setting('taxRate', 0.075);
  v_tax      := round(v_subtotal * v_tax_rate, 2);

  v_shipping := case
    when p_delivery_type <> 'delivery' then 0
    when v_subtotal >= public.money_setting('freeShippingThreshold', 100000) then 0
    else public.money_setting('standardShipping', 2500)
  end;

  v_total := greatest(v_subtotal - v_discount, 0) + v_tax + v_shipping;

  v_number := 'RMZ-' || lpad(nextval('order_number_seq')::text, 5, '0');

  insert into orders (
    order_number, user_id, delivery_type, currency,
    subtotal, discount_amount, discount_code_id, tax_amount, tax_rate,
    shipping_cost, total,
    ship_full_name, ship_phone, ship_street, ship_city, ship_state, ship_postal_code, ship_country,
    customer_name, customer_email, customer_phone, customer_notes, idempotency_key
  ) values (
    v_number, v_user, p_delivery_type, p_currency,
    -- tax_rate is stored so an order stays correct when the rate changes.
    -- The column existed for that and was being sent null on every order.
    v_subtotal, v_discount, v_code.id, v_tax, v_tax_rate,
    v_shipping, v_total,
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

    -- Stock does not move here any more. It moves when the money arrives — see
    -- sync_order_stock(). The check in pass 1 stays as a pre-flight: an order
    -- for something already sold out should be refused at the door rather than
    -- accepted and found unfulfillable a week later.
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
end $function$

;

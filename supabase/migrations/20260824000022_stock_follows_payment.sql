-- Stock moves when the money arrives, not when the order is placed.
--
-- Ramazah takes no card payment: an order is placed, an invoice goes out, and
-- the customer pays by bank transfer days later. `create_order` decremented
-- stock at the moment the order was written, so every unpaid order — including
-- the ones that are never paid — held goods off the shelf indefinitely, and the
-- shop's own stock figures described a warehouse it did not have.
--
-- The hard part is not moving the decrement. It is that payment status can be
-- set more than once: paid, then corrected to unpaid, then paid again. Taking
-- stock on each "paid" would remove it three times. So this does not hook
-- transitions at all.
--
-- Instead there is one rule, and one function that enforces it:
--
--     stock is held exactly when an order is paid and not cancelled or refunded
--
-- `sync_order_stock()` compares that condition against `orders.stock_committed`
-- and acts only on a difference. Called after any status or payment change, it
-- is idempotent by construction — running it ten times does what running it once
-- does — and it handles paths a transition hook would miss, such as cancelling a
-- paid order, or un-cancelling one that is still paid.

alter table orders
  add column if not exists stock_committed boolean not null default false;

comment on column orders.stock_committed is
  'Whether this order is currently holding stock. Owned by sync_order_stock() — '
  'never set it by hand, or the ledger stops matching the shelf.';

-- Every order that already exists is declared settled, whatever happened to its
-- stock in the past.
--
-- The first draft of this looked for a 'sale' movement per order and trusted
-- that. It matched nothing: the eleven demo orders were seeded with direct
-- inserts rather than through create_order, so no movement was ever written for
-- them, and the shop's stock figures were set independently. Left at false, the
-- first sync on any of them — an admin opening an old delivered order and
-- touching anything — would have taken their goods off the shelf years after the
-- fact. One of them alone is 39 units.
--
-- So the backfill sets the flag to whatever the rule already says, which makes
-- sync a no-op for all of them and freezes today's numbers. The invariant holds
-- from here: after this line, `stock_committed` means "this order's stock is
-- accounted for", and only sync_order_stock() ever changes it.
update orders
   set stock_committed = (payment_status = 'paid'
                          and status not in ('cancelled', 'refunded'));

-- ============ THE ONE RULE ============
create or replace function public.sync_order_stock(p_order uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order   orders;
  v_should  boolean;
  v_item    record;
  v_stock   int;
  v_reason  movement_reason;
begin
  select * into v_order from orders where id = p_order for update;
  if not found then
    raise exception 'No such order' using errcode = 'P0002';
  end if;

  v_should := v_order.payment_status = 'paid'
              and v_order.status not in ('cancelled', 'refunded');

  if v_should = v_order.stock_committed then
    return;                                   -- already where it should be
  end if;

  if v_should then
    -- Taking stock. Locked and checked first, so a shortfall stops the whole
    -- thing rather than leaving half an order committed.
    for v_item in
      select oi.variant_id, oi.product_id, oi.quantity, oi.name, pv.stock_count
        from order_items oi
        join product_variants pv on pv.id = oi.variant_id
       where oi.order_id = p_order
       order by oi.variant_id                 -- stable order, so two orders
                                              -- taking the same variants cannot
                                              -- deadlock against each other
       for update of pv
    loop
      if v_item.stock_count < v_item.quantity then
        raise exception
          'Not enough % in stock: % left, this order needs %',
          v_item.name, v_item.stock_count, v_item.quantity
          using errcode = 'P0001';
      end if;
    end loop;

    for v_item in
      select variant_id, product_id, quantity from order_items where order_id = p_order
    loop
      update product_variants
         set stock_count = stock_count - v_item.quantity
       where id = v_item.variant_id
      returning stock_count into v_stock;

      insert into inventory_movements
        (variant_id, delta, reason, stock_after, order_id, actor_id)
      values (v_item.variant_id, -v_item.quantity, 'sale', v_stock, p_order, auth.uid());

      update products set sales_count = sales_count + v_item.quantity
       where id = v_item.product_id;
    end loop;

    update orders set stock_committed = true where id = p_order;
  else
    -- Giving it back. 'return' when the money went back to the customer,
    -- 'cancellation' when the order simply stopped.
    v_reason := case
      when v_order.status = 'refunded' or v_order.payment_status = 'refunded'
        then 'return'::movement_reason
      else 'cancellation'::movement_reason
    end;

    for v_item in
      select variant_id, product_id, quantity from order_items where order_id = p_order
    loop
      update product_variants
         set stock_count = stock_count + v_item.quantity
       where id = v_item.variant_id
      returning stock_count into v_stock;

      insert into inventory_movements
        (variant_id, delta, reason, stock_after, order_id, actor_id)
      values (v_item.variant_id, v_item.quantity, v_reason, v_stock, p_order, auth.uid());

      -- sales_count is "how many of these were actually sold", so an order that
      -- came back should not still be counted in it.
      update products set sales_count = greatest(sales_count - v_item.quantity, 0)
       where id = v_item.product_id;
    end loop;

    update orders set stock_committed = false where id = p_order;
  end if;
end $$;

comment on function public.sync_order_stock(uuid) is
  'Reconcile an order''s stock hold with its status. Idempotent: acts only when '
  'the hold and the rule disagree.';

-- Not granted to anyone. It is called by the two guarded RPCs below, which check
-- is_admin() first; exposing it directly would let any signed-in user move stock
-- by naming an order id.
revoke all on function public.sync_order_stock(uuid) from public, anon, authenticated;

-- ============ THE TWO ENTRY POINTS CALL IT ============

create or replace function public.set_order_status(
  p_order  uuid,
  p_status order_status,
  p_note   text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_current order_status;
        v_delivery delivery_type;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can move an order' using errcode = '42501';
  end if;

  select status, delivery_type into v_current, v_delivery
    from orders where id = p_order;
  if not found then
    raise exception 'No such order' using errcode = 'P0002';
  end if;

  perform set_config('ramazah.status_note', coalesce(p_note, ''), true);

  update orders
     set status = p_status,
         shipped_at   = case when p_status = 'shipped'   and shipped_at   is null
                             then now() else shipped_at end,
         delivered_at = case when p_status = 'delivered' and delivered_at is null
                                  and v_delivery = 'delivery'
                             then now() else delivered_at end,
         picked_up_at = case when p_status = 'delivered' and picked_up_at is null
                                  and v_delivery = 'in_store'
                             then now() else picked_up_at end
   where id = p_order;

  if v_current is not distinct from p_status and p_note is not null and btrim(p_note) <> '' then
    insert into order_status_history (order_id, from_status, to_status, changed_by, note)
    values (p_order, v_current, p_status, auth.uid(), btrim(p_note));
  end if;

  -- Cancelling or refunding a paid order puts its goods back on the shelf.
  perform public.sync_order_stock(p_order);
end $$;

grant execute on function public.set_order_status(uuid, order_status, text) to authenticated;

create or replace function public.set_order_payment(
  p_order  uuid,
  p_status payment_status
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a payment' using errcode = '42501';
  end if;

  update orders
     set payment_status = p_status,
         paid_at = case when p_status = 'paid' and paid_at is null then now() else paid_at end
   where id = p_order;

  if not found then
    raise exception 'No such order' using errcode = 'P0002';
  end if;

  -- This is where stock actually leaves the shelf. If there is not enough, the
  -- exception rolls the payment back too — an order cannot be marked paid for
  -- goods the shop does not have, which is the whole point of moving the
  -- decrement here.
  perform public.sync_order_stock(p_order);
end $$;

grant execute on function public.set_order_payment(uuid, payment_status) to authenticated;
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



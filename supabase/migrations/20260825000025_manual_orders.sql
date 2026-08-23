-- Orders for people who are not on the site.
--
-- Most of this shop's selling happens on WhatsApp: someone messages, a price is
-- agreed, money is transferred. None of it existed in the database, so the
-- invoice went out as a photograph of something typed by hand, the stock figures
-- described only website sales, and the payments screen reported a minority of
-- the business as if it were all of it.
--
-- The alternative was a standalone document generator. That would mean a second
-- invoice implementation — two versions of what is owed — a second numbering
-- scheme competing with `order_number`, which is also the payment reference, and
-- goods leaving the shelf with nothing recording it. Making it a real order
-- means the order page, the invoice, the packing slip, the status ladder, the
-- payment guard and the audit history all work on it unchanged.

-- An order raised over WhatsApp has no account behind it, and the customer's
-- name, phone and email have always been stored on the order itself rather than
-- read from a profile — so the only thing in the way was the foreign key.
alter table orders alter column user_id drop not null;

-- Plenty of customers here have a phone number and no email at all. Requiring
-- one only produces invented addresses, which are worse than none.
alter table orders alter column customer_email drop not null;

alter table orders add column if not exists placed_by uuid references profiles(id) on delete set null;
alter table orders add column if not exists channel text not null default 'web'
  check (channel in ('web', 'whatsapp', 'in_store', 'phone'));

comment on column orders.user_id is
  'Null for an order raised by staff for someone with no account.';
comment on column orders.placed_by is
  'The admin who raised this order. Null for orders placed by the customer.';
comment on column orders.channel is
  'Where the order came from. Website orders are ''web''; the rest were taken by '
  'staff and have a placed_by.';

create index if not exists orders_channel_idx on orders (channel, created_at desc);

-- `user_id = auth.uid()` is NULL rather than true when user_id is null, so an
-- ownerless order already fails the customer branch of every policy. Restated
-- explicitly so nobody has to re-derive that from three-valued logic.
drop policy if exists "own orders readable" on orders;
create policy "own orders readable" on orders for select
  using ((user_id is not null and user_id = auth.uid()) or public.is_admin());

-- ============ A LINE MAY HAVE NO VARIANT ============
--
-- `order_items.product_id` and `variant_id` have always been nullable, so a line
-- for something that was never in the catalogue is representable — a sourced
-- one-off, say. But `sync_order_stock` looped over every line and updated
-- `product_variants` by id, and `inventory_movements.variant_id` is NOT NULL: a
-- free-text line would have made the insert fail, so marking a manual order paid
-- would have failed outright. Both loops now skip lines with nothing to move.
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
    return;
  end if;

  if v_should then
    for v_item in
      select oi.variant_id, oi.product_id, oi.quantity, oi.name, pv.stock_count
        from order_items oi
        join product_variants pv on pv.id = oi.variant_id
       where oi.order_id = p_order
       order by oi.variant_id
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
      select variant_id, product_id, quantity from order_items
       where order_id = p_order and variant_id is not null
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
    v_reason := case
      when v_order.status = 'refunded' or v_order.payment_status = 'refunded'
        then 'return'::movement_reason
      else 'cancellation'::movement_reason
    end;

    for v_item in
      select variant_id, product_id, quantity from order_items
       where order_id = p_order and variant_id is not null
    loop
      update product_variants
         set stock_count = stock_count + v_item.quantity
       where id = v_item.variant_id
      returning stock_count into v_stock;

      insert into inventory_movements
        (variant_id, delta, reason, stock_after, order_id, actor_id)
      values (v_item.variant_id, v_item.quantity, v_reason, v_stock, p_order, auth.uid());

      update products set sales_count = greatest(sales_count - v_item.quantity, 0)
       where id = v_item.product_id;
    end loop;

    update orders set stock_committed = false where id = p_order;
  end if;
end $$;

revoke all on function public.sync_order_stock(uuid) from public, anon, authenticated;

-- ============ RAISING ONE ============
--
-- Not `create_order`. That one is the customer's path: it reads prices from the
-- catalogue and refuses to trust the client, which is exactly right when the
-- client is a browser. Staff need the opposite in two places — a line for
-- something that was never in the catalogue, and a price that was actually
-- agreed rather than the one on the shelf today.
--
-- What it keeps from `create_order`: prices for catalogue lines still default to
-- the database, so the common case cannot be fat-fingered.
--
-- Deliberately no stock check. On a WhatsApp sale the goods have often already
-- changed hands, and refusing to record it would leave the shop with a sale it
-- cannot represent. Stock still moves when the order is marked paid, and if
-- there is not enough, `sync_order_stock` says so then — which is the right
-- moment for someone to go and count the shelf.
create or replace function public.create_manual_order(
  p_customer_name    text,
  p_customer_phone   text,
  p_lines            jsonb,
  p_customer_email   text default null,
  p_user             uuid default null,
  p_channel          text default 'whatsapp',
  p_delivery_type    delivery_type default 'delivery',
  p_shipping_address jsonb default null,
  p_currency         char(3) default 'NGN',
  p_shipping_cost    numeric default 0,
  p_discount         numeric default 0,
  p_tax_amount       numeric default 0,
  p_notes            text default null,
  p_idempotency_key  text default null
)
returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order    orders;
  v_line     record;
  v_detail   record;
  v_price    numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total    numeric(12,2);
  v_number   text;
  v_rows     jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can raise an order for someone else'
      using errcode = '42501';
  end if;

  if btrim(coalesce(p_customer_name, '')) = '' then
    raise exception 'The order needs a customer name' using errcode = 'P0001';
  end if;
  if btrim(coalesce(p_customer_phone, '')) = '' then
    raise exception 'The order needs a phone number' using errcode = 'P0001';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'The order needs at least one line' using errcode = 'P0001';
  end if;

  -- Same key, same order: a double-submit returns the first one rather than a
  -- duplicate invoice going out with a different number on it.
  if p_idempotency_key is not null then
    select * into v_order from orders where idempotency_key = p_idempotency_key;
    if found then return v_order; end if;
  end if;

  for v_line in
    select * from jsonb_to_recordset(p_lines) as x(
      variant_id uuid, name text, sku text, quantity int, unit_price numeric(12,2)
    )
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Every line needs a quantity of at least one' using errcode = 'P0001';
    end if;

    if v_line.variant_id is not null then
      select pv.id, pv.sku, pv.product_id, p.name as product_name,
             (select secure_url from product_images
               where product_id = p.id order by is_primary desc, position limit 1) as image_url,
             (select string_agg(ov.value, ' / ' order by po.position, ov.position)
                from variant_option_values vov
                join product_option_values ov on ov.id = vov.option_value_id
                join product_options po on po.id = ov.option_id
               where vov.variant_id = pv.id) as variant_label
        into v_detail
        from product_variants pv
        join products p on p.id = pv.product_id
       where pv.id = v_line.variant_id;

      if not found then
        raise exception 'No such product variant' using errcode = 'P0002';
      end if;

      -- The agreed price wins when one is given; otherwise today's catalogue
      -- price, so the common case cannot be mistyped.
      v_price := v_line.unit_price;
      if v_price is null then
        select amount into v_price from product_prices
         where variant_id = v_line.variant_id and currency = p_currency;
        if v_price is null then
          raise exception 'No % price for %', p_currency, v_detail.product_name
            using errcode = 'P0001';
        end if;
      end if;

      v_rows := v_rows || jsonb_build_object(
        'variant_id', v_detail.id, 'product_id', v_detail.product_id,
        'name', v_detail.product_name, 'sku', v_detail.sku,
        'variant_label', v_detail.variant_label, 'image_url', v_detail.image_url,
        'unit_price', v_price, 'quantity', v_line.quantity,
        'line_total', v_price * v_line.quantity
      );
    else
      -- A line for something that was never in the catalogue: a one-off sourced
      -- on request. It carries no variant, so it never moves stock.
      if btrim(coalesce(v_line.name, '')) = '' then
        raise exception 'A line with no product needs a description' using errcode = 'P0001';
      end if;
      if v_line.unit_price is null or v_line.unit_price < 0 then
        raise exception 'A line with no product needs a price' using errcode = 'P0001';
      end if;

      v_price := v_line.unit_price;
      v_rows := v_rows || jsonb_build_object(
        'variant_id', null, 'product_id', null,
        'name', btrim(v_line.name), 'sku', coalesce(nullif(btrim(coalesce(v_line.sku, '')), ''), 'ONE-OFF'),
        'variant_label', null, 'image_url', null,
        'unit_price', v_price, 'quantity', v_line.quantity,
        'line_total', v_price * v_line.quantity
      );
    end if;

    v_subtotal := v_subtotal + (v_price * v_line.quantity);
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0)
             + coalesce(p_tax_amount, 0) + coalesce(p_shipping_cost, 0);

  -- The same sequence as the website, so an invoice number is an invoice number
  -- whichever way the order came in.
  v_number := 'RMZ-' || lpad(nextval('order_number_seq')::text, 5, '0');

  insert into orders (
    order_number, user_id, placed_by, channel, delivery_type, currency,
    subtotal, discount_amount, tax_amount, shipping_cost, total,
    ship_full_name, ship_phone, ship_street, ship_city, ship_state,
    ship_postal_code, ship_country,
    customer_name, customer_email, customer_phone, customer_notes, idempotency_key
  ) values (
    v_number, p_user, auth.uid(), p_channel, p_delivery_type, p_currency,
    v_subtotal, coalesce(p_discount, 0), coalesce(p_tax_amount, 0),
    coalesce(p_shipping_cost, 0), v_total,
    coalesce(p_shipping_address->>'full_name', p_customer_name),
    coalesce(p_shipping_address->>'phone', p_customer_phone),
    p_shipping_address->>'street', p_shipping_address->>'city',
    p_shipping_address->>'state', p_shipping_address->>'postal_code',
    case when p_shipping_address is null then null
         else coalesce(p_shipping_address->>'country', 'Nigeria') end,
    btrim(p_customer_name), nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_phone), nullif(btrim(coalesce(p_notes, '')), ''), p_idempotency_key
  ) returning * into v_order;

  insert into order_items (
    order_id, product_id, variant_id, name, sku,
    variant_label, image_url, unit_price, quantity, line_total
  )
  select v_order.id, (x->>'product_id')::uuid, (x->>'variant_id')::uuid,
         x->>'name', x->>'sku', x->>'variant_label', x->>'image_url',
         (x->>'unit_price')::numeric, (x->>'quantity')::int, (x->>'line_total')::numeric
    from jsonb_array_elements(v_rows) x;

  return v_order;
end $$;

comment on function public.create_manual_order is
  'Raise an order for a customer who is not on the site. Lines may reference a '
  'catalogue variant or stand alone with their own description and price.';

grant execute on function public.create_manual_order(
  text, text, jsonb, text, uuid, text, delivery_type, jsonb, char, numeric, numeric, numeric, text, text
) to authenticated;

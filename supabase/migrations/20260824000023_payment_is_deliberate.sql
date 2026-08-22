-- Recording a payment is a money event, not a dropdown.
--
-- Payment status sat in the same control row as the courier and the tracking
-- number, as a plain select. So marking an order paid — which now takes stock
-- off the shelf — was one click, indistinguishable in weight from correcting a
-- typo, and marking it unpaid again was another. Nothing was recorded about
-- either. An order could go paid, unpaid, paid, and the only trace was the
-- current value.
--
-- Idempotency (migration 20260824000022) already means the stock arithmetic
-- survives that. What it does not do is make the flip *deliberate*, and it does
-- not answer the question anyone actually asks afterwards: who said this was
-- paid, and on what evidence?
--
-- Three changes. Every payment change is recorded with an actor. Reversing a
-- settled payment requires a stated reason. And a payment cannot be quietly
-- un-recorded once the goods have gone — at that point it is a refund or a debt,
-- which are real events, not corrections.

create table if not exists order_payment_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status payment_status,
  to_status   payment_status not null,
  reason      text,
  changed_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists order_payment_history_order_idx
  on order_payment_history (order_id, created_at);

comment on table order_payment_history is
  'Every change to an order''s payment status, with who made it and why. The '
  'money record: order_status_history cannot hold these because its to_status '
  'is an order_status.';

alter table order_payment_history enable row level security;

-- Readable by the customer for their own order, as the status history is: they
-- should be able to see that the shop marked their transfer received.
drop policy if exists "own payment history" on order_payment_history;
create policy "own payment history" on order_payment_history for select
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.is_admin())));

-- No insert policy for anyone. Rows arrive only through set_order_payment(),
-- which is security definer and checks is_admin() — a hand-written row would be
-- a payment record with no payment behind it.
grant select on order_payment_history to authenticated;
grant all on order_payment_history to service_role;

-- Backfill what can be known. Orders already settled get a single opening entry
-- dated when they were paid; the actor is unknown, because nothing recorded one.
insert into order_payment_history (order_id, from_status, to_status, created_at, reason)
select o.id, null, o.payment_status, coalesce(o.paid_at, o.created_at),
       'Recorded before payments were tracked.'
  from orders o
 where not exists (
   select 1 from order_payment_history h where h.order_id = o.id
 );

-- ============ THE GUARDED ENTRY POINT ============
create or replace function public.set_order_payment(
  p_order  uuid,
  p_status payment_status,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_order  orders;
        v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a payment' using errcode = '42501';
  end if;

  select * into v_order from orders where id = p_order for update;
  if not found then
    raise exception 'No such order' using errcode = 'P0002';
  end if;

  -- Setting a status to itself is not an event. Recording it would fill the
  -- history with noise and make a real reversal harder to find.
  if v_order.payment_status = p_status then
    return;
  end if;

  -- Undoing a settled payment. It happens — a transfer is matched to the wrong
  -- order, or a bank reverses one — but it is never routine, so it has to say
  -- why. The reason lands in the history and is the only account of it.
  if v_order.payment_status = 'paid' and p_status in ('pending', 'failed') then
    if v_reason is null then
      raise exception
        'Say why this payment is being undone — it is recorded against the order'
        using errcode = 'P0001';
    end if;

    -- Once the goods are out of the building, "not paid after all" is not a
    -- correction. Either the money went back, which is a refund, or the customer
    -- owes for something they already have, which is not a thing this screen can
    -- fix by changing a status.
    if v_order.status in ('shipped', 'delivered')
       or v_order.shipped_at is not null
       or v_order.delivered_at is not null
       or v_order.picked_up_at is not null then
      raise exception
        'This order has already gone out. Refund it instead of marking it unpaid'
        using errcode = 'P0001';
    end if;
  end if;

  insert into order_payment_history (order_id, from_status, to_status, reason, changed_by)
  values (p_order, v_order.payment_status, p_status, v_reason, auth.uid());

  update orders
     set payment_status = p_status,
         paid_at = case when p_status = 'paid' and paid_at is null then now() else paid_at end
   where id = p_order;

  -- Where stock actually leaves the shelf. A shortfall raises, and the
  -- exception rolls back the payment and its history row with it.
  perform public.sync_order_stock(p_order);
end $$;

comment on function public.set_order_payment(uuid, payment_status, text) is
  'Record a payment change. Undoing a settled payment needs a reason, and is '
  'refused once the order has shipped.';

-- The two-argument signature has to go explicitly: adding a defaulted parameter
-- creates an overload, and with every argument optional on both, Postgres cannot
-- choose between them.
drop function if exists public.set_order_payment(uuid, payment_status);
grant execute on function public.set_order_payment(uuid, payment_status, text) to authenticated;

-- ============ ONE TIMELINE ============
--
-- Status and payment are two tables and one story. Returning them separately
-- meant the screen either showed two lists side by side — where the reader has
-- to interleave the timestamps themselves — or silently dropped one.
drop function if exists public.order_history(uuid);

create or replace function public.order_history(p_order uuid)
returns table (
  id uuid, kind text,
  from_status text, to_status text,
  note text, created_at timestamptz,
  actor_name text, actor_email text
)
language sql stable security invoker set search_path = public as $$
  select h.id, 'status'::text,
         h.from_status::text, h.to_status::text,
         h.note, h.created_at,
         p.display_name, p.email::text
    from order_status_history h
    left join profiles p on p.id = h.changed_by
   where h.order_id = p_order
  union all
  select h.id, 'payment'::text,
         h.from_status::text, h.to_status::text,
         h.reason, h.created_at,
         p.display_name, p.email::text
    from order_payment_history h
    left join profiles p on p.id = h.changed_by
   where h.order_id = p_order
   order by created_at, id;
$$;

grant execute on function public.order_history(uuid) to authenticated;

-- Orders can actually be moved, and what happened to them is recorded.
--
-- The headline is a bug, not a feature: **no admin could change an order's
-- status.** `log_order_status()` writes an audit row on every transition, and it
-- is a plain (invoker-rights) trigger function, while `authenticated` holds only
-- SELECT on `order_status_history`. So the insert was refused and took the whole
-- UPDATE down with it — a signed-in admin got "permission denied for table
-- order_status_history" and the order stayed where it was. Setting a courier or
-- a tracking number worked, because only `status` fires the trigger.
--
-- Every order in the database reached its status through seeding on the service
-- key, which is why this survived: nothing had ever moved an order through the
-- admin.

-- security definer, so the audit row is written with the table owner's rights.
-- An audit trail the acting user can refuse to write is not an audit trail; this
-- is the standard shape for one.
--
-- The note comes from a transaction-local setting rather than a second UPDATE
-- chasing the row the trigger just made. `set_config(..., true)` is scoped to the
-- transaction and gone at commit, so concurrent status changes on other orders
-- cannot pick up each other's notes.
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_note text := nullif(btrim(coalesce(current_setting('ramazah.status_note', true), '')), '');
begin
  if tg_op = 'INSERT' then
    insert into order_status_history (order_id, from_status, to_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), v_note);
  elsif new.status is distinct from old.status then
    insert into order_status_history (order_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), v_note);
  end if;
  return null;
end $$;

-- ============ MOVING AN ORDER ============
--
-- One entry point for a status change, so the timestamp that goes with it can
-- never be forgotten. The client used to stamp `shipped_at` and `delivered_at`
-- itself and had no branch at all for `picked_up_at`, so an in-store collection
-- was marked delivered with the collection time left null.
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

  -- Read back by the trigger above.
  perform set_config('ramazah.status_note', coalesce(p_note, ''), true);

  update orders
     set status = p_status,
         -- Stamped once. A status set twice, or walked back and forward again,
         -- keeps the time it first happened.
         shipped_at   = case when p_status = 'shipped'   and shipped_at   is null
                             then now() else shipped_at end,
         delivered_at = case when p_status = 'delivered' and delivered_at is null
                                  and v_delivery = 'delivery'
                             then now() else delivered_at end,
         picked_up_at = case when p_status = 'delivered' and picked_up_at is null
                                  and v_delivery = 'in_store'
                             then now() else picked_up_at end
   where id = p_order;

  -- A note with no status change still belongs on the record, and the trigger
  -- only fires when the status actually differs.
  if v_current is not distinct from p_status and p_note is not null and btrim(p_note) <> '' then
    insert into order_status_history (order_id, from_status, to_status, changed_by, note)
    values (p_order, v_current, p_status, auth.uid(), btrim(p_note));
  end if;
end $$;

comment on function public.set_order_status(uuid, order_status, text) is
  'Move an order and record why. Stamps shipped_at, delivered_at or picked_up_at '
  'to match, and never re-stamps one that is already set.';

grant execute on function public.set_order_status(uuid, order_status, text) to authenticated;

-- ============ PAYMENT ============
--
-- `order_status_history.to_status` is an `order_status`, so a payment change has
-- nowhere to go in it. It gets its own guarded entry point for the timestamps.
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
end $$;

grant execute on function public.set_order_payment(uuid, payment_status) to authenticated;

-- ============ STAFF NOTES ============
--
-- Not a column on `orders`. RLS is row-level, and "own orders readable" hands a
-- customer their whole row — a `staff_notes` column would go straight to the
-- person it is written about. A separate table can be admin-only outright.
--
-- Several timestamped notes rather than one editable blob: "customer rang, wants
-- it held until Friday" and "courier lost the first parcel" are two facts with
-- two dates, and flattening them loses the sequence that makes them useful.
create table if not exists order_notes (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create index if not exists order_notes_order_idx on order_notes (order_id, created_at desc);

comment on table order_notes is
  'Internal notes on an order. Staff-only — never shown to the customer, which '
  'is why this is a table with its own policy rather than a column on orders.';

alter table order_notes enable row level security;

drop policy if exists "order notes admin" on order_notes;
create policy "order notes admin" on order_notes for all
  using (public.is_admin()) with check (public.is_admin());

-- Table privileges are explicit in this project; a new table starts with none,
-- and the policy above cannot grant reach the role does not have.
grant select, insert, update, delete on order_notes to authenticated;
grant all on order_notes to service_role;

-- ============ READING ONE ORDER ============
--
-- The history carries `changed_by`, and every screen that showed a timeline
-- showed a bare timestamp because resolving the actor meant a second query per
-- row against `profiles`.
create or replace function public.order_history(p_order uuid)
returns table (
  id uuid, from_status order_status, to_status order_status,
  note text, created_at timestamptz,
  actor_name text, actor_email text
)
language sql stable security invoker set search_path = public as $$
  select h.id, h.from_status, h.to_status, h.note, h.created_at,
         p.display_name, p.email::text
    from order_status_history h
    left join profiles p on p.id = h.changed_by
   where h.order_id = p_order
   order by h.created_at, h.id;
$$;

grant execute on function public.order_history(uuid) to authenticated;

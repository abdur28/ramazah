-- Sourcing requests — "tell us what you need and we'll do the rest".
--
-- The service the business leads with on WhatsApp had no representation in the
-- database at all: the storefront could only sell what was already stocked, so
-- every request lived in a chat thread where neither side could see its state.
--
-- The status ladder mirrors how the work actually runs: a request is asked,
-- then priced once someone has looked for it, then bought on the next run, then
-- it becomes an ordinary order. `quoted_amount` is what the customer is told
-- before anything is purchased on their behalf.

do $$ begin
  create type request_status as enum ('asked', 'quoted', 'buying', 'fulfilled', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists product_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  item           text not null,
  details        text not null default '',
  reference_url  text,
  quantity       int  not null default 1 check (quantity > 0),
  budget         numeric(12,2),
  status         request_status not null default 'asked',
  quoted_amount  numeric(12,2),
  staff_note     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists product_requests_user_idx on product_requests (user_id, created_at desc);
create index if not exists product_requests_status_idx on product_requests (status, created_at desc);

comment on table product_requests is
  'Customer sourcing requests. The quote and status are staff-owned; the item, '
  'details and budget are the customer''s.';

drop trigger if exists product_requests_touch on product_requests;
create trigger product_requests_touch
  before update on product_requests
  for each row execute function public.set_updated_at();

alter table product_requests enable row level security;

drop policy if exists "own requests readable" on product_requests;
create policy "own requests readable" on product_requests for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "own requests writable" on product_requests;
create policy "own requests writable" on product_requests for insert
  with check (user_id = auth.uid());

drop policy if exists "own requests editable" on product_requests;
create policy "own requests editable" on product_requests for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "requests admin" on product_requests;
create policy "requests admin" on product_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- A customer may write the request, never its price or its state. Same reason
-- reviews cannot approve themselves: RLS restricts rows, not columns.
grant select on product_requests to authenticated;
grant insert (user_id, item, details, reference_url, quantity, budget) on product_requests to authenticated;
grant update (item, details, reference_url, quantity, budget) on product_requests to authenticated;
grant all on product_requests to service_role;

create or replace function public.set_request_status(
  p_request uuid,
  p_status request_status,
  p_quote numeric default null,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update a request' using errcode = '42501';
  end if;

  update product_requests
     set status = p_status,
         quoted_amount = coalesce(p_quote, quoted_amount),
         staff_note = coalesce(p_note, staff_note)
   where id = p_request;
end $$;

grant execute on function public.set_request_status(uuid, request_status, numeric, text) to authenticated;

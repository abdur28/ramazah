-- The customer gets a say, and a quote stops being a moving target.
--
-- Six defects, all confirmed against the database rather than read off the code.
--
-- 1. A customer could rewrite a request after it had been quoted. The update
--    policy allowed it at any status and the column grant covers `item` and
--    `quantity`, so "Hibiscus tea, 1kg" quoted at ₦24,000 could become "A gold
--    bar ×50" still quoted at ₦24,000. The quote detached from the thing quoted.
--
-- 2. Staff could never clear a note or a quote. `coalesce(p_quote, quoted_amount)`
--    reads a null as "leave it alone", so emptying the note box and saving
--    reported success and changed nothing — while the customer went on reading
--    the old note.
--
-- 3. The customer had no way to answer. The dashboard told them "Reply to accept
--    and we will buy it on the next run", and there was nothing to reply with:
--    no button, no link. They could not withdraw one either — delete is not
--    granted. The whole point of the feature was to get this conversation out of
--    WhatsApp, and the customer's half was still in WhatsApp.
--
-- There is no haggling here: a quote is answered yes or no.

-- Separate statements, and first in the file: a new enum value cannot be used in
-- the same transaction that adds it, and psql commits each of these on its own.
alter type request_status add value if not exists 'accepted' after 'quoted';
alter type request_status add value if not exists 'withdrawn';

comment on type request_status is
  'asked -> quoted -> accepted -> buying -> fulfilled. The customer owns the '
  'quoted -> accepted step and can withdraw before buying; declined is the '
  'shop''s answer, withdrawn is the customer''s.';

-- ============ A REQUEST FREEZES WHEN IT IS QUOTED ============
--
-- Editing stays open while it is still `asked`, because refining what you asked
-- for is the normal thing to do before anyone has looked. Once there is a price
-- against it, the description is part of the deal.
drop policy if exists "own requests editable" on product_requests;
create policy "own requests editable" on product_requests for update
  using (
    public.is_admin()
    or (user_id = auth.uid() and status = 'asked')
  )
  with check (
    public.is_admin()
    or (user_id = auth.uid() and status = 'asked')
  );

-- ============ THE CUSTOMER'S ANSWER ============
--
-- security definer, because `status` is deliberately not grantable to customers
-- — the same reason a review cannot approve itself. The guard here is ownership
-- plus which answers make sense from where they are.
create or replace function public.answer_request(
  p_request uuid,
  p_accept  boolean
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_request product_requests;
begin
  select * into v_request from product_requests where id = p_request for update;
  if not found then
    raise exception 'No such request' using errcode = 'P0002';
  end if;

  if v_request.user_id <> auth.uid() then
    raise exception 'That is not your request' using errcode = '42501';
  end if;

  if p_accept then
    -- Only a quoted request can be accepted. Accepting one with no price would
    -- be agreeing to an amount nobody has named.
    if v_request.status <> 'quoted' then
      raise exception 'There is no quote to accept' using errcode = 'P0001';
    end if;
    update product_requests set status = 'accepted' where id = p_request;
  else
    -- Withdrawing is allowed right up to the point the shop has spent money.
    if v_request.status not in ('asked', 'quoted', 'accepted') then
      raise exception 'This one is already being bought — talk to us instead'
        using errcode = 'P0001';
    end if;
    update product_requests set status = 'withdrawn' where id = p_request;
  end if;
end $$;

comment on function public.answer_request(uuid, boolean) is
  'The customer answers their own quote: accept it, or withdraw the request.';

grant execute on function public.answer_request(uuid, boolean) to authenticated;

-- ============ STAFF FIELDS SAY WHAT THEY SAY ============
--
-- `coalesce(p_quote, quoted_amount)` meant a null could only ever mean "leave
-- it", so nothing could be taken back. The admin form seeds both fields from
-- what is already stored, so it always sends the values on screen — which makes
-- direct assignment the honest rule: what you are looking at is what is saved,
-- including when you have emptied it.
create or replace function public.set_request_status(
  p_request uuid,
  p_status  request_status,
  p_quote   numeric default null,
  p_note    text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update a request' using errcode = '42501';
  end if;

  if p_status = 'quoted' and (p_quote is null or p_quote <= 0) then
    raise exception 'A quote needs an amount' using errcode = 'P0001';
  end if;

  update product_requests
     set status = p_status,
         quoted_amount = p_quote,
         staff_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_request;

  if not found then
    raise exception 'No such request' using errcode = 'P0002';
  end if;
end $$;

grant execute on function public.set_request_status(uuid, request_status, numeric, text) to authenticated;

-- RLS restricts WHICH ROWS a user may touch; it cannot restrict WHICH COLUMNS.
-- Without these grants, "update your own profile" also means "set your own role
-- to admin", and "edit your own review" also means "approve your own review".

-- ============ PROFILES ============
revoke update on profiles from authenticated;
grant update (display_name, photo_url, phone, email_opt_in, preferences)
  on profiles to authenticated;
-- Deliberately NOT grantable: id, email (owned by auth), role, status, timestamps.

-- ============ REVIEWS ============
revoke insert, update on reviews from authenticated;
grant insert (product_id, user_id, order_item_id, rating, title, body)
  on reviews to authenticated;
grant update (rating, title, body)
  on reviews to authenticated;
-- status stays 'pending' by default; helpful_count is trigger-maintained.

-- ============ ADMIN OPERATIONS ============
-- Admins are also the `authenticated` role, so privileged column writes go
-- through SECURITY DEFINER functions that check is_admin() explicitly.
create or replace function public.set_user_role(p_user uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;
  update profiles set role = p_role where id = p_user;
end $$;

create or replace function public.set_user_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change account status' using errcode = '42501';
  end if;
  if p_status not in ('active','inactive') then
    raise exception 'Invalid status: %', p_status;
  end if;
  update profiles set status = p_status where id = p_user;
end $$;

create or replace function public.set_review_status(p_review uuid, p_status review_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can moderate reviews' using errcode = '42501';
  end if;
  update reviews set status = p_status where id = p_review;
end $$;

grant execute on function public.set_user_role(uuid, user_role)        to authenticated;
grant execute on function public.set_user_status(uuid, text)           to authenticated;
grant execute on function public.set_review_status(uuid, review_status) to authenticated;

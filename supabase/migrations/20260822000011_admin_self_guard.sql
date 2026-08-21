-- Stop an administrator locking themselves — or everybody — out.
--
-- `set_user_role` and `set_user_status` check `is_admin()` and nothing else, so
-- an admin could demote their own account or suspend it. With one administrator
-- on this installation, either action makes the admin area unreachable from the
-- admin area: recovering it needs the service-role key and a terminal.
--
-- Two guards, in the database rather than in the screen, because the RPC is the
-- boundary — a check in React only protects the button.

create or replace function public.set_user_role(p_user uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admins int;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;

  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin access'
      using errcode = '42501',
            hint = 'Ask another administrator to do it.';
  end if;

  -- Demoting the last admin leaves nobody who can promote anyone.
  if p_role <> 'admin' then
    select count(*) into v_admins from profiles where role = 'admin' and id <> p_user;
    if v_admins = 0 then
      raise exception 'This is the only administrator left'
        using errcode = '42501',
              hint = 'Promote someone else first.';
    end if;
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

  if p_user = auth.uid() and p_status = 'inactive' then
    raise exception 'You cannot suspend your own account' using errcode = '42501';
  end if;

  update profiles set status = p_status where id = p_user;
end $$;

grant execute on function public.set_user_role(uuid, user_role) to authenticated;
grant execute on function public.set_user_status(uuid, text)    to authenticated;

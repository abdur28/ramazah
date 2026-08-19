-- Seed default preferences server-side. The client cannot write them at signup:
-- with email confirmation enabled there is no session yet, so the write would run
-- as `anon` and be denied.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, preferences)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    jsonb_build_object(
      'currency', 'ngn',
      'emailNotifications', jsonb_build_object(
        'orderUpdates',   true,
        'promotions',     true,
        'newArrivals',    true,
        'wishlistAlerts', true,
        'newsletter',     true
      )
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

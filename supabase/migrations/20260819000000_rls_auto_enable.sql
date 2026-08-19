-- Recreates the "automatic RLS" safety net enabled at project creation.
-- It lives in the public schema, so `drop schema public cascade` removes it —
-- keeping it here means a reset restores it instead of silently losing it.
create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql as $$
declare obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE' and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', obj.object_identity);
  end loop;
end $$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.rls_auto_enable();

-- Newsletter subscribers.
--
-- The footer has always had a subscribe form; until now it called
-- `console.log` and told the customer they were subscribed. This is the table
-- that makes it true.
--
-- Anonymous visitors may INSERT and nothing else: they cannot read the list,
-- cannot update it, and cannot delete from it. Reading is admin-only, which is
-- what stops the form doubling as an email-address dump.

create table if not exists newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  source      text   not null default 'footer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table newsletter_subscribers is
  'Email captures from the storefront. Signed-in customers use profiles.preferences instead.';

alter table newsletter_subscribers enable row level security;

drop policy if exists "newsletter insert public" on newsletter_subscribers;
create policy "newsletter insert public"
  on newsletter_subscribers for insert
  with check (true);

drop policy if exists "newsletter admin" on newsletter_subscribers;
create policy "newsletter admin"
  on newsletter_subscribers for all
  using (public.is_admin())
  with check (public.is_admin());

-- Insert only. No select grant, so a subscriber cannot read the list back.
grant insert on newsletter_subscribers to anon, authenticated;
grant select, update, delete on newsletter_subscribers to authenticated;
grant all on newsletter_subscribers to service_role;

create index if not exists newsletter_subscribers_created_at_idx
  on newsletter_subscribers (created_at desc);

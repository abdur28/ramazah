-- Editable copy, without a CMS.
--
-- Every word and photograph on the home page and the six policy pages is a
-- string literal in a `.tsx` file, so changing "How long does delivery take?"
-- means a developer, a commit and a deploy. For a shop whose delivery time,
-- shipping cost and returns wording will all move around before launch, that is
-- the wrong shape.
--
-- One key-value table rather than a page builder. The pages keep their layout,
-- their components and their design in code — which is where those belong — and
-- only the words and the images come from here. A page builder would let
-- somebody produce a page that does not look like this shop, and that is a
-- bigger loss than the flexibility is a gain.
--
-- The other half of the design is in `lib/content.ts`: every read falls back to
-- the literals still in the code, so an empty table renders exactly what the
-- site renders today and a malformed row cannot take a page down.

create table if not exists site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

comment on table site_content is
  'Editable copy and imagery, keyed by page. Layout stays in code; only words '
  'and pictures live here, and every read falls back to the code defaults.';

alter table site_content enable row level security;

-- Readable by everyone, including signed-out visitors: this is the text of
-- public pages, and the storefront renders it server-side for people with no
-- session at all.
drop policy if exists "content public" on site_content;
create policy "content public" on site_content for select using (true);

drop policy if exists "content admin" on site_content;
create policy "content admin" on site_content for all
  using (public.is_admin()) with check (public.is_admin());

grant select on site_content to anon, authenticated;
grant insert, update, delete on site_content to authenticated;
grant all on site_content to service_role;

drop trigger if exists site_content_touch on site_content;
create trigger site_content_touch
  before update on site_content
  for each row execute function public.set_updated_at();

-- Stamps the editor, so "who changed the returns policy" has an answer. Done in
-- a trigger rather than trusted from the client for the same reason every other
-- actor column on this installation is.
create or replace function public.set_content_editor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists site_content_editor on site_content;
create trigger site_content_editor
  before insert or update on site_content
  for each row execute function public.set_content_editor();

-- Let the menu be built from the catalogue.
--
-- `constants/navigation.ts` was a hand-written list, so a category added in the
-- admin appeared nowhere until someone edited code. The reason it stayed
-- hand-written is real though: the menu is not a mirror of the table. It needs
-- shorter labels than the catalogue uses — "Beauty & Personal Care" is a fine
-- category name and a poor menu item, and six of those on one line is what
-- makes a desktop nav wrap into itself — and it needs some categories left out.
--
-- So rather than choosing between "curated" and "automatic", the two columns
-- the curation actually needed live on the row.

alter table categories add column if not exists nav_label text;
alter table categories add column if not exists show_in_nav boolean not null default true;

comment on column categories.nav_label is
  'Short label for the menu. Falls back to `name` when null — set it when the '
  'full name is too long to sit on one line with its neighbours.';

comment on column categories.show_in_nav is
  'Whether this appears in the storefront menu. A category can be browsable '
  'without being advertised.';

-- The labels the curated menu used, so nothing changes visually on the switch.
update categories set nav_label = 'Veils'      where slug = 'veils-scarves'        and nav_label is null;
update categories set nav_label = 'Food'       where slug = 'food-pantry'          and nav_label is null;
update categories set nav_label = 'Beauty'     where slug = 'beauty-personal-care' and nav_label is null;
update categories set nav_label = 'Kitchen'    where slug = 'kitchen-dining'       and nav_label is null;
update categories set nav_label = 'Home'       where slug = 'home-decor'           and nav_label is null;
update categories set nav_label = 'Stationery' where slug = 'school-stationery'    and nav_label is null;

-- The order the curated menu used. `sort_order` defaulted to 0 on every row, so
-- without this the menu order would be whatever the table felt like returning.
update categories set sort_order = 1 where slug = 'veils-scarves';
update categories set sort_order = 2 where slug = 'food-pantry';
update categories set sort_order = 3 where slug = 'beauty-personal-care';
update categories set sort_order = 4 where slug = 'kitchen-dining';
update categories set sort_order = 5 where slug = 'home-decor';
update categories set sort_order = 6 where slug = 'school-stationery';

-- Deep shelves are for browsing into, not for the top bar. The menu shows two
-- levels; anything below that is reached from the category page.
update categories set show_in_nav = false where depth > 2;

create index if not exists categories_nav_idx
  on categories (show_in_nav, depth, sort_order) where show_in_nav;

-- Ramazah: initial category tree.
-- Six top-level categories; Food & Pantry carries three children.
-- Finer slicing (skincare, haircare, fragrance, ...) uses products.tags, not
-- deeper nesting — a launching catalog cannot fill sub-sub-category pages.
-- Idempotent: safe to re-run.

insert into categories (name, slug, sort_order) values
  ('Veils & Scarves',        'veils-scarves',        1),
  ('Food & Pantry',          'food-pantry',          2),
  ('Beauty & Personal Care', 'beauty-personal-care', 3),
  ('Kitchen & Dining',       'kitchen-dining',       4),
  ('Home & Decor',           'home-decor',           5),
  ('School & Stationery',    'school-stationery',    6)
on conflict (slug) do nothing;

insert into categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.sort_order
from (values
  ('Coffee & Tea',        'coffee-tea',        1),
  ('Spices & Condiments', 'spices-condiments', 2),
  ('Dry Foods',           'dry-foods',         3)
) as v(name, slug, sort_order)
cross join lateral (select id from categories where slug = 'food-pantry') p
on conflict (slug) do nothing;

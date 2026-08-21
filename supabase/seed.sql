-- Sample catalog for local verification. Safe to delete once you add real products.
-- Eight products, one per category, so every tile on the home page leads
-- somewhere with stock in it.
-- Demonstrates: multi-axis options (coffee), colour swatches (veil),
-- perishables with expiry, a sale price, and option-less products.

begin;

with cat as (select slug, id from categories)
insert into products (id, name, slug, sku, status, is_featured, is_new, is_perishable,
                      category_id, description, short_description, tags, published_at)
values
  ('11110000-0000-0000-0000-000000000001','Egyptian Ground Coffee','egyptian-ground-coffee','RMZ-COF-01',
   'active', true, true, true, (select id from cat where slug='coffee-tea'),
   'Medium roast Egyptian coffee blended with cardamom.','Medium roast with cardamom',
   array['coffee','cardamom','egypt'], now()),
  ('11110000-0000-0000-0000-000000000002','Chiffon Veil','chiffon-veil','RMZ-VEIL-01',
   'active', true, false, false, (select id from cat where slug='veils-scarves'),
   'Soft everyday chiffon veil with a matte finish.','Soft matte chiffon',
   array['veil','chiffon'], now()),
  ('11110000-0000-0000-0000-000000000003','Ground Cumin','ground-cumin','RMZ-SPC-01',
   'active', true, false, true, (select id from cat where slug='spices-condiments'),
   'Freshly milled cumin, imported from Egypt.','Freshly milled cumin',
   array['spice','cumin'], now()),
  ('11110000-0000-0000-0000-000000000004','Brass Serving Tray','brass-serving-tray','RMZ-KIT-01',
   'active', true, false, false, (select id from cat where slug='kitchen-dining'),
   'Hand-finished brass tray. Sold as a single item — no options.','Hand-finished brass',
   array['brass','serving'], now()),
  ('11110000-0000-0000-0000-000000000005','Black Seed Oil','black-seed-oil','RMZ-BTY-01',
   'active', true, true, true, (select id from cat where slug='beauty-personal-care'),
   'Cold-pressed Nigella sativa oil, bottled in amber glass to keep the light out.','Cold-pressed, amber bottled',
   array['oil','black seed','skincare'], now()),
  ('11110000-0000-0000-0000-000000000006','Medjool Dates','medjool-dates','RMZ-DRY-01',
   'active', true, true, true, (select id from cat where slug='dry-foods'),
   'Soft Medjool dates, packed the week they are picked.','Soft, freshly packed',
   array['dates','medjool','ramadan'], now()),
  ('11110000-0000-0000-0000-000000000007','Brass Lantern','brass-lantern','RMZ-HOM-01',
   'active', false, true, false, (select id from cat where slug='home-decor'),
   'Pierced brass lantern for a tealight. Sold as a single item — no options.','Pierced brass, single item',
   array['brass','lantern','decor'], now()),
  ('11110000-0000-0000-0000-000000000008','Exercise Books, pack of 10','exercise-books-pack','RMZ-STA-01',
   'active', false, false, false, (select id from cat where slug='school-stationery'),
   'A5 ruled exercise books, ten to a pack. Sold as a single item — no options.','A5 ruled, ten to a pack',
   array['school','books','stationery'], now());

-- Placeholder photography, one per product. Was a single local file that no
-- longer exists, so every card in the seeded catalog rendered a 404. Keep in
-- step with `productImages` in constants/demo.ts; real products get Cloudinary
-- URLs at upload time.
insert into product_images (product_id, public_id, url, secure_url, alt_text, is_primary)
select p.id, 'ramazah/'||p.slug, i.url, i.url, p.name, true
from products p
join (values
  ('chiffon-veil',           'https://images.unsplash.com/photo-1622532470022-24107cac5ef3?auto=format&fit=crop&w=1000&q=70'),
  ('egyptian-ground-coffee', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1000&q=70'),
  ('ground-cumin',           'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=70'),
  ('brass-serving-tray',     'https://images.unsplash.com/photo-1747571855541-394b53b3b7e8?auto=format&fit=crop&w=1000&q=70'),
  ('black-seed-oil',         'https://images.unsplash.com/photo-1608571424266-edeb9bbefdec?auto=format&fit=crop&w=1000&q=70'),
  ('medjool-dates',          'https://images.unsplash.com/photo-1629738601425-494c3d6ba3e2?auto=format&fit=crop&w=1000&q=70'),
  ('brass-lantern',          'https://images.unsplash.com/photo-1779599790541-2f50889661ed?auto=format&fit=crop&w=1000&q=70'),
  ('exercise-books-pack',    'https://images.unsplash.com/photo-1761322572550-967ea8c0bfd9?auto=format&fit=crop&w=1000&q=70')
) as i(slug, url) on i.slug = p.slug;

-- Coffee: Weight x Grind · Oil: Size · Dates: Weight
insert into product_options (id, product_id, name, position) values
  ('22220000-0000-0000-0000-000000000001','11110000-0000-0000-0000-000000000001','Weight',0),
  ('22220000-0000-0000-0000-000000000002','11110000-0000-0000-0000-000000000001','Grind',1),
  ('22220000-0000-0000-0000-000000000003','11110000-0000-0000-0000-000000000002','Colour',0),
  ('22220000-0000-0000-0000-000000000004','11110000-0000-0000-0000-000000000003','Weight',0),
  ('22220000-0000-0000-0000-000000000005','11110000-0000-0000-0000-000000000005','Size',0),
  ('22220000-0000-0000-0000-000000000006','11110000-0000-0000-0000-000000000006','Weight',0);

insert into product_option_values (id, option_id, value, hex, position) values
  ('33330000-0000-0000-0000-000000000001','22220000-0000-0000-0000-000000000001','250g',null,0),
  ('33330000-0000-0000-0000-000000000002','22220000-0000-0000-0000-000000000001','1kg',null,1),
  ('33330000-0000-0000-0000-000000000003','22220000-0000-0000-0000-000000000002','Whole bean',null,0),
  ('33330000-0000-0000-0000-000000000004','22220000-0000-0000-0000-000000000002','Ground',null,1),
  ('33330000-0000-0000-0000-000000000005','22220000-0000-0000-0000-000000000003','Black','#111111',0),
  ('33330000-0000-0000-0000-000000000006','22220000-0000-0000-0000-000000000003','Sand','#d8c3a5',1),
  ('33330000-0000-0000-0000-000000000007','22220000-0000-0000-0000-000000000004','100g',null,0),
  ('33330000-0000-0000-0000-000000000008','22220000-0000-0000-0000-000000000005','60ml',null,0),
  ('33330000-0000-0000-0000-000000000009','22220000-0000-0000-0000-000000000005','120ml',null,1),
  ('33330000-0000-0000-0000-000000000010','22220000-0000-0000-0000-000000000006','500g',null,0),
  ('33330000-0000-0000-0000-000000000011','22220000-0000-0000-0000-000000000006','1kg',null,1);

insert into product_variants (id, product_id, sku, stock_count, expiry_date, position) values
  ('44440000-0000-0000-0000-000000000001','11110000-0000-0000-0000-000000000001','RMZ-COF-01-250-G', 24, current_date+240, 0),
  ('44440000-0000-0000-0000-000000000002','11110000-0000-0000-0000-000000000001','RMZ-COF-01-1KG-W', 8,  current_date+240, 1),
  ('44440000-0000-0000-0000-000000000003','11110000-0000-0000-0000-000000000002','RMZ-VEIL-01-BLK', 30, null, 0),
  ('44440000-0000-0000-0000-000000000004','11110000-0000-0000-0000-000000000002','RMZ-VEIL-01-SND', 18, null, 1),
  ('44440000-0000-0000-0000-000000000005','11110000-0000-0000-0000-000000000003','RMZ-SPC-01-100', 40, current_date+365, 0),
  ('44440000-0000-0000-0000-000000000006','11110000-0000-0000-0000-000000000004','RMZ-KIT-01', 12, null, 0),
  ('44440000-0000-0000-0000-000000000007','11110000-0000-0000-0000-000000000005','RMZ-BTY-01-60',  26, current_date+540, 0),
  ('44440000-0000-0000-0000-000000000008','11110000-0000-0000-0000-000000000005','RMZ-BTY-01-120', 14, current_date+540, 1),
  ('44440000-0000-0000-0000-000000000009','11110000-0000-0000-0000-000000000006','RMZ-DRY-01-500', 35, current_date+180, 0),
  ('44440000-0000-0000-0000-000000000010','11110000-0000-0000-0000-000000000006','RMZ-DRY-01-1KG', 20, current_date+180, 1),
  ('44440000-0000-0000-0000-000000000011','11110000-0000-0000-0000-000000000007','RMZ-HOM-01',      9, null, 0),
  ('44440000-0000-0000-0000-000000000012','11110000-0000-0000-0000-000000000008','RMZ-STA-01',     60, null, 0);

insert into variant_option_values (variant_id, option_value_id) values
  ('44440000-0000-0000-0000-000000000001','33330000-0000-0000-0000-000000000001'),
  ('44440000-0000-0000-0000-000000000001','33330000-0000-0000-0000-000000000004'),
  ('44440000-0000-0000-0000-000000000002','33330000-0000-0000-0000-000000000002'),
  ('44440000-0000-0000-0000-000000000002','33330000-0000-0000-0000-000000000003'),
  ('44440000-0000-0000-0000-000000000003','33330000-0000-0000-0000-000000000005'),
  ('44440000-0000-0000-0000-000000000004','33330000-0000-0000-0000-000000000006'),
  ('44440000-0000-0000-0000-000000000005','33330000-0000-0000-0000-000000000007'),
  ('44440000-0000-0000-0000-000000000007','33330000-0000-0000-0000-000000000008'),
  ('44440000-0000-0000-0000-000000000008','33330000-0000-0000-0000-000000000009'),
  ('44440000-0000-0000-0000-000000000009','33330000-0000-0000-0000-000000000010'),
  ('44440000-0000-0000-0000-000000000010','33330000-0000-0000-0000-000000000011');

insert into product_prices (variant_id, currency, amount, compare_at_amount) values
  ('44440000-0000-0000-0000-000000000001','NGN', 12500, 15000),
  ('44440000-0000-0000-0000-000000000002','NGN', 42000, null),
  ('44440000-0000-0000-0000-000000000003','NGN',  8000, null),
  ('44440000-0000-0000-0000-000000000004','NGN',  8000, null),
  ('44440000-0000-0000-0000-000000000005','NGN',  3200, 4000),
  ('44440000-0000-0000-0000-000000000006','NGN', 27500, null),
  ('44440000-0000-0000-0000-000000000007','NGN',  6500, null),
  ('44440000-0000-0000-0000-000000000008','NGN', 11000, null),
  ('44440000-0000-0000-0000-000000000009','NGN',  9500, 12000),
  ('44440000-0000-0000-0000-000000000010','NGN', 17000, null),
  ('44440000-0000-0000-0000-000000000011','NGN', 34000, null),
  ('44440000-0000-0000-0000-000000000012','NGN',  4800, null);

commit;

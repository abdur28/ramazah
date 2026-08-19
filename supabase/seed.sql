-- Sample catalog for local verification. Safe to delete once you add real products.
-- Demonstrates: multi-axis options (coffee), colour swatches (veil),
-- perishables with expiry, and an option-less product (single default variant).

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
   array['brass','serving'], now());

insert into product_images (product_id, public_id, url, secure_url, alt_text, is_primary)
select id, 'ramazah/'||slug, '/DSC09599.jpg', '/DSC09599.jpg', name, true from products;

-- Coffee: Weight x Grind
insert into product_options (id, product_id, name, position) values
  ('22220000-0000-0000-0000-000000000001','11110000-0000-0000-0000-000000000001','Weight',0),
  ('22220000-0000-0000-0000-000000000002','11110000-0000-0000-0000-000000000001','Grind',1),
  ('22220000-0000-0000-0000-000000000003','11110000-0000-0000-0000-000000000002','Colour',0),
  ('22220000-0000-0000-0000-000000000004','11110000-0000-0000-0000-000000000003','Weight',0);

insert into product_option_values (id, option_id, value, hex, position) values
  ('33330000-0000-0000-0000-000000000001','22220000-0000-0000-0000-000000000001','250g',null,0),
  ('33330000-0000-0000-0000-000000000002','22220000-0000-0000-0000-000000000001','1kg',null,1),
  ('33330000-0000-0000-0000-000000000003','22220000-0000-0000-0000-000000000002','Whole bean',null,0),
  ('33330000-0000-0000-0000-000000000004','22220000-0000-0000-0000-000000000002','Ground',null,1),
  ('33330000-0000-0000-0000-000000000005','22220000-0000-0000-0000-000000000003','Black','#111111',0),
  ('33330000-0000-0000-0000-000000000006','22220000-0000-0000-0000-000000000003','Sand','#d8c3a5',1),
  ('33330000-0000-0000-0000-000000000007','22220000-0000-0000-0000-000000000004','100g',null,0);

insert into product_variants (id, product_id, sku, stock_count, expiry_date, position) values
  ('44440000-0000-0000-0000-000000000001','11110000-0000-0000-0000-000000000001','RMZ-COF-01-250-G', 24, current_date+240, 0),
  ('44440000-0000-0000-0000-000000000002','11110000-0000-0000-0000-000000000001','RMZ-COF-01-1KG-W', 8,  current_date+240, 1),
  ('44440000-0000-0000-0000-000000000003','11110000-0000-0000-0000-000000000002','RMZ-VEIL-01-BLK', 30, null, 0),
  ('44440000-0000-0000-0000-000000000004','11110000-0000-0000-0000-000000000002','RMZ-VEIL-01-SND', 18, null, 1),
  ('44440000-0000-0000-0000-000000000005','11110000-0000-0000-0000-000000000003','RMZ-SPC-01-100', 40, current_date+365, 0),
  ('44440000-0000-0000-0000-000000000006','11110000-0000-0000-0000-000000000004','RMZ-KIT-01', 12, null, 0);

insert into variant_option_values (variant_id, option_value_id) values
  ('44440000-0000-0000-0000-000000000001','33330000-0000-0000-0000-000000000001'),
  ('44440000-0000-0000-0000-000000000001','33330000-0000-0000-0000-000000000004'),
  ('44440000-0000-0000-0000-000000000002','33330000-0000-0000-0000-000000000002'),
  ('44440000-0000-0000-0000-000000000002','33330000-0000-0000-0000-000000000003'),
  ('44440000-0000-0000-0000-000000000003','33330000-0000-0000-0000-000000000005'),
  ('44440000-0000-0000-0000-000000000004','33330000-0000-0000-0000-000000000006'),
  ('44440000-0000-0000-0000-000000000005','33330000-0000-0000-0000-000000000007');

insert into product_prices (variant_id, currency, amount, compare_at_amount) values
  ('44440000-0000-0000-0000-000000000001','NGN', 12500, 15000),
  ('44440000-0000-0000-0000-000000000002','NGN', 42000, null),
  ('44440000-0000-0000-0000-000000000003','NGN',  8000, null),
  ('44440000-0000-0000-0000-000000000004','NGN',  8000, null),
  ('44440000-0000-0000-0000-000000000005','NGN',  3200, 4000),
  ('44440000-0000-0000-0000-000000000006','NGN', 27500, null);

commit;

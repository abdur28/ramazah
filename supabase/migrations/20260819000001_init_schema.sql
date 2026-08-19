-- Ramazah: initial schema
-- Postgres 17 / Supabase. Money = numeric(12,2). Time = timestamptz.

create extension if not exists citext;
create extension if not exists pg_trgm;

-- ============ ENUMS ============
create type user_role       as enum ('user','admin');
create type product_status  as enum ('draft','active','archived');
create type order_status    as enum ('pending','processing','shipped','delivered','cancelled','refunded');
create type payment_status  as enum ('pending','paid','failed','refunded');
create type delivery_type   as enum ('in_store','delivery');
create type review_status   as enum ('pending','approved','rejected');
create type movement_reason as enum ('sale','restock','adjustment','return','cancellation');
create type discount_type   as enum ('percentage','fixed_amount');

-- ============ IDENTITY ============
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null,
  display_name  text,
  photo_url     text,
  phone         text,
  role          user_role not null default 'user',
  status        text not null default 'active' check (status in ('active','inactive')),
  email_opt_in  boolean not null default true,
  preferences   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on profiles (role);

create table addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  full_name   text not null,
  phone       text not null,
  street      text not null,
  city        text not null,
  state       text not null,
  postal_code text,
  country     text not null default 'Nigeria',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on addresses (user_id);
create unique index addresses_one_default_per_user
  on addresses (user_id) where is_default;

-- ============ CATALOG ============
create table categories (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references categories(id) on delete restrict,
  name          text not null,
  slug          text not null unique,
  path          text not null,           -- maintained by trigger, e.g. 'Clothing > Tops'
  description   text,
  subtitle      text,
  banner_public_id text,
  banner_url    text,
  banner_alt    text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on categories (parent_id);
create index on categories (path);

create table collections (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  banner_public_id text,
  banner_url    text,
  banner_alt    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text not null default '',
  short_description text,
  category_id       uuid references categories(id) on delete restrict,
  collection_id     uuid references collections(id) on delete set null,
  item_type         text,
  sku               text not null unique,
  status            product_status not null default 'draft',
  tags              text[] not null default '{}',
  materials         text[] not null default '{}',
  details           jsonb not null default '{}'::jsonb,
  care_instructions text,
  is_perishable     boolean not null default false,
  is_new            boolean not null default false,
  is_featured       boolean not null default false,
  is_bestseller     boolean not null default false,
  is_limited_edition boolean not null default false,
  meta_title        text,
  meta_description  text,
  meta_keywords     text[] not null default '{}',
  low_stock_alert   int not null default 5,
  view_count        int not null default 0,
  sales_count       int not null default 0,
  rating_avg        numeric(3,2) not null default 0,
  rating_count      int not null default 0,
  search_vector     tsvector generated always as (
      setweight(to_tsvector('english', coalesce(name,'')), 'A') ||
      setweight(to_tsvector('english', coalesce(short_description,'')), 'B') ||
      setweight(to_tsvector('english', coalesce(description,'')), 'C')
  ) stored,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on products (status);
create index on products (category_id);
create index on products (collection_id);
create index products_search_idx on products using gin (search_vector);
create index products_tags_idx   on products using gin (tags);
create index products_name_trgm  on products using gin (name gin_trgm_ops);

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  public_id  text not null,
  url        text not null,
  secure_url text not null,
  alt_text   text not null default '',
  position   int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index on product_images (product_id);
create unique index product_images_one_primary
  on product_images (product_id) where is_primary;

-- Every product has at least one variant. Products without options get a single
-- default variant, so pricing and stock always live in exactly one place.
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  sku         text not null unique,
  stock_count int not null default 0 check (stock_count >= 0),
  expiry_date date,
  in_stock    boolean generated always as (stock_count > 0) stored,
  weight      numeric(10,3),
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on product_variants (product_id);
create index on product_variants (expiry_date) where expiry_date is not null;

-- ---- Generic variant options ----
-- 'Weight: 250g / 1kg', 'Grind: Whole bean / Ground', 'Shade: 03', 'Colour: Black'.
-- One model covers coffee, spices, beauty, veils and kitchenware alike.
create table product_options (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  unique (product_id, name)
);
create index on product_options (product_id);

create table product_option_values (
  id        uuid primary key default gen_random_uuid(),
  option_id uuid not null references product_options(id) on delete cascade,
  value     text not null,
  hex       text check (hex ~* '^#[0-9a-f]{6}$'),  -- colour swatches only
  position  int not null default 0,
  unique (option_id, value)
);
create index on product_option_values (option_id);

create table variant_option_values (
  variant_id      uuid not null references product_variants(id) on delete cascade,
  option_value_id uuid not null references product_option_values(id) on delete restrict,
  primary key (variant_id, option_value_id)
);
create index on variant_option_values (option_value_id);

create table variant_images (
  variant_id uuid not null references product_variants(id) on delete cascade,
  image_id   uuid not null references product_images(id) on delete cascade,
  primary key (variant_id, image_id)
);

create table product_prices (
  id                uuid primary key default gen_random_uuid(),
  variant_id        uuid not null references product_variants(id) on delete cascade,
  currency          char(3) not null default 'NGN',
  amount            numeric(12,2) not null check (amount >= 0),
  compare_at_amount numeric(12,2) check (compare_at_amount >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (variant_id, currency)
);
create index on product_prices (currency);

-- ============ CART & WISHLIST ============
create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity   int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant_id)
);
create index on cart_items (user_id);

create table wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index on wishlist_items (user_id);

-- ============ DISCOUNTS ============
create table discount_codes (
  id               uuid primary key default gen_random_uuid(),
  code             citext not null unique,
  description      text,
  type             discount_type not null,
  value            numeric(12,2) not null check (value > 0),
  currency         char(3) not null default 'NGN',
  min_order_amount numeric(12,2) not null default 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  max_redemptions  int check (max_redemptions > 0),
  max_per_user     int not null default 1 check (max_per_user > 0),
  redemption_count int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ============ ORDERS ============
create sequence order_number_seq start 1000;

create table orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  user_id          uuid not null references profiles(id) on delete restrict,
  delivery_type    delivery_type not null,
  status           order_status not null default 'pending',
  payment_status   payment_status not null default 'pending',
  currency         char(3) not null default 'NGN',
  subtotal         numeric(12,2) not null check (subtotal >= 0),
  discount_amount  numeric(12,2) not null default 0 check (discount_amount >= 0),
  discount_code_id uuid references discount_codes(id) on delete set null,
  tax_amount       numeric(12,2) not null default 0 check (tax_amount >= 0),
  tax_rate         numeric(5,4),          -- rate applied at purchase time; null until VAT system exists
  shipping_cost    numeric(12,2) not null default 0 check (shipping_cost >= 0),
  total            numeric(12,2) not null check (total >= 0),
  ship_full_name   text,
  ship_phone       text,
  ship_street      text,
  ship_city        text,
  ship_state       text,
  ship_postal_code text,
  ship_country     text,
  customer_name    text not null,
  customer_email   citext not null,
  customer_phone   text not null,
  payment_method   text,
  payment_intent_id text,
  tracking_number  text,
  carrier          text,
  customer_notes   text,
  idempotency_key  text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  paid_at          timestamptz,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  picked_up_at     timestamptz
);
create index on orders (user_id);
create index on orders (status);
create index on orders (created_at desc);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  variant_id  uuid references product_variants(id) on delete set null,
  name          text not null,
  sku           text not null,
  variant_label text,           -- e.g. '250g / Ground'
  options       jsonb not null default '{}'::jsonb,
  image_url     text,
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  quantity    int not null check (quantity > 0),
  line_total  numeric(12,2) not null check (line_total >= 0),
  created_at  timestamptz not null default now()
);
create index on order_items (order_id);
create index on order_items (product_id);

create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  changed_by  uuid references profiles(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index on order_status_history (order_id);

create table discount_redemptions (
  id               uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references discount_codes(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  order_id         uuid not null references orders(id) on delete cascade,
  amount_applied   numeric(12,2) not null check (amount_applied >= 0),
  created_at       timestamptz not null default now()
);
create index on discount_redemptions (discount_code_id, user_id);

-- ============ INVENTORY LEDGER (append-only) ============
create table inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  delta       int not null check (delta <> 0),
  reason      movement_reason not null,
  stock_after int not null check (stock_after >= 0),
  order_id    uuid references orders(id) on delete set null,
  actor_id    uuid references profiles(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index on inventory_movements (variant_id, created_at desc);
create index on inventory_movements (order_id);

-- ============ REVIEWS ============
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete set null,  -- verified purchase
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text not null default '',
  status        review_status not null default 'pending',
  helpful_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, user_id)
);
create index on reviews (product_id, status);
create index on reviews (user_id);

create table review_images (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  public_id  text not null,
  url        text not null,
  secure_url text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index on review_images (review_id);

create table review_votes (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  is_helpful boolean not null,
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);

create table review_replies (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on review_replies (review_id);

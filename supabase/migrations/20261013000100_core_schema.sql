-- =====================================================================
-- Subbulakshmi Thanga Maligai · Phase 4 · Migration 1 — core schema
-- Tables: profiles, user_roles, categories, products, product_images,
--         wishlists, orders, order_items, order_events, audit_logs
-- Safe to run on a new project. It creates objects only; it never drops
-- or rewrites existing data.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text check (full_name is null or char_length(btrim(full_name)) between 2 and 80),
  phone              text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  town               text check (town is null or char_length(town) <= 60),
  preferred_language text not null default 'ta' check (preferred_language in ('ta', 'en')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- user_roles (privileges are granted ONLY by an administrative process) ----------
create table if not exists public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'staff')),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Role checks used by RLS policies and functions.
-- SECURITY DEFINER so they can read user_roles regardless of the caller's RLS.
create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = p_role);
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.has_role('admin');
$$;
create or replace function public.is_staff()   -- admin or staff
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'staff'));
$$;

-- ---------- categories ----------
create table if not exists public.categories (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name_en     text not null check (char_length(btrim(name_en)) between 2 and 60),
  name_ta     text not null check (char_length(btrim(name_ta)) between 2 and 60),
  sort_order  integer not null default 100 check (sort_order between 0 and 10000),
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9-]{2,29}$'),
  category_id     text not null references public.categories (id) on update cascade on delete restrict,
  name_en         text not null check (char_length(btrim(name_en)) between 2 and 120),
  name_ta         text not null check (char_length(btrim(name_ta)) between 2 and 120),
  description_en  text check (description_en is null or char_length(description_en) <= 2000),
  description_ta  text check (description_ta is null or char_length(description_ta) <= 2000),
  purity          text not null check (purity in ('24K', '22K', '18K', '14K', '999', '925', 'other')),
  gross_weight_g  numeric(10,3) check (gross_weight_g is null or gross_weight_g > 0),
  net_weight_g    numeric(10,3) check (net_weight_g is null or net_weight_g > 0),
  stone_weight_g  numeric(10,3) check (stone_weight_g is null or stone_weight_g >= 0),
  making_charge   numeric(12,2) check (making_charge is null or making_charge >= 0),
  stone_charge    numeric(12,2) check (stone_charge is null or stone_charge >= 0),
  price_mode      text not null default 'enquiry' check (price_mode in ('enquiry', 'fixed')),
  fixed_price     numeric(12,2) check (fixed_price is null or fixed_price > 0),
  stock_status    text not null default 'in_stock' check (stock_status in ('in_stock', 'made_to_order', 'out_of_stock')),
  stock_qty       integer not null default 1 check (stock_qty between 0 and 100000),
  max_order_qty   integer not null default 1 check (max_order_qty between 1 and 10),
  tags            text[] not null default '{}' check (tags <@ array['new', 'popular', 'bridal', 'featured']::text[]),
  is_published    boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint products_fixed_price_required check ((price_mode = 'fixed') = (fixed_price is not null)),
  constraint products_net_not_above_gross check (net_weight_g is null or gross_weight_g is null or net_weight_g <= gross_weight_g)
);
create index if not exists products_category_idx  on public.products (category_id);
create index if not exists products_published_idx on public.products (is_published, created_at desc);
create index if not exists products_tags_idx      on public.products using gin (tags);

-- ---------- product_images (files live in Storage bucket "product-images") ----------
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^products/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  alt_en       text check (alt_en is null or char_length(alt_en) <= 160),
  alt_ta       text check (alt_ta is null or char_length(alt_ta) <= 160),
  sort_order   integer not null default 0 check (sort_order between 0 and 100),
  created_at   timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------- wishlists ----------
create table if not exists public.wishlists (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists wishlists_product_idx on public.wishlists (product_id);

-- ---------- orders (order REQUESTS — no payment in this phase) ----------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique
                     default ('STM-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  customer_id        uuid not null references auth.users (id) on delete restrict,
  status             text not null default 'requested'
                     check (status in ('requested', 'confirmed', 'ready', 'completed', 'cancelled', 'rejected')),
  fulfilment         text not null default 'store_pickup' check (fulfilment in ('store_pickup')),
  contact_name       text not null check (char_length(btrim(contact_name)) between 2 and 80),
  contact_phone      text not null check (contact_phone ~ '^[6-9][0-9]{9}$'),
  customer_note      text check (customer_note is null or char_length(customer_note) <= 500),
  items_count        integer not null check (items_count between 1 and 20),
  priced_total       numeric(12,2) not null default 0 check (priced_total >= 0),
  has_unpriced_items boolean not null default false,
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid')),  -- no gateway in Phase 4
  idempotency_key    uuid not null,
  admin_note         text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint orders_one_per_submission unique (customer_id, idempotency_key)
);
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_idx   on public.orders (status, created_at desc);

-- order_items keep an order-time SNAPSHOT of the product and price
create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  product_id     uuid references public.products (id) on delete set null,
  product_sku    text not null,
  name_en        text not null,
  name_ta        text not null,
  purity         text not null,
  gross_weight_g numeric(10,3),
  net_weight_g   numeric(10,3),
  price_mode     text not null check (price_mode in ('enquiry', 'fixed')),
  unit_price     numeric(12,2) check (unit_price is null or unit_price > 0),
  quantity       integer not null check (quantity between 1 and 10),
  line_total     numeric(12,2) generated always as (unit_price * quantity) stored,
  created_at     timestamptz not null default now(),
  constraint order_items_price_mode_match check ((price_mode = 'fixed') = (unit_price is not null)),
  constraint order_items_one_line_per_product unique (order_id, product_sku)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- order status history
create table if not exists public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status   text not null,
  note        text check (note is null or char_length(note) <= 500),
  actor_id    uuid references auth.users (id) on delete set null,
  actor_role  text not null check (actor_role in ('customer', 'staff', 'admin', 'system')),
  created_at  timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- ---------- audit log for administrative changes ----------
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  table_name text not null,
  record_id  text,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_table_idx on public.audit_logs (table_name, created_at desc);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text;
begin
  v_id := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'id',
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'user_id');
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, v_id, tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end $$;

-- ---------- triggers ----------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at   before update on public.profiles   for each row execute function public.set_updated_at();
drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at   before update on public.products   for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at     before update on public.orders     for each row execute function public.set_updated_at();

drop trigger if exists audit_categories on public.categories;
create trigger audit_categories     after insert or update or delete on public.categories     for each row execute function public.audit_row();
drop trigger if exists audit_products on public.products;
create trigger audit_products       after insert or update or delete on public.products       for each row execute function public.audit_row();
drop trigger if exists audit_product_images on public.product_images;
create trigger audit_product_images after insert or update or delete on public.product_images for each row execute function public.audit_row();
drop trigger if exists audit_user_roles on public.user_roles;
create trigger audit_user_roles     after insert or update or delete on public.user_roles     for each row execute function public.audit_row();

-- Create a profile automatically when someone registers.
-- Invalid sign-up metadata is ignored (stored as NULL) instead of blocking registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name  text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
  v_lang  text := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'ta');
begin
  insert into public.profiles (id, full_name, phone, preferred_language)
  values (new.id,
          case when char_length(v_name) between 2 and 80 then v_name end,
          case when v_phone ~ '^[6-9][0-9]{9}$' then v_phone end,
          case when v_lang in ('ta', 'en') then v_lang else 'ta' end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

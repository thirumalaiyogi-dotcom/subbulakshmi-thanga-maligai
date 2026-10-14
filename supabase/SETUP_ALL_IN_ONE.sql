-- =====================================================================
-- Subbulakshmi Thanga Maligai — FULL DATABASE SETUP (one paste, one Run)
-- For a NEW Supabase project. Supabase dashboard → SQL Editor → New query →
-- paste ALL of this → Run. Contains, in order: migrations 1–6 + production
-- categories + the two savings schemes as DRAFT / NOT APPROVED.
-- Safe to run again (non-destructive). Does NOT add demo products or any
-- fictional customer, payment or savings record.
-- =====================================================================


-- >>>>>>>>>> supabase/migrations/20261013000100_core_schema.sql >>>>>>>>>>

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


-- >>>>>>>>>> supabase/migrations/20261013000200_rls_policies.sql >>>>>>>>>>

-- =====================================================================
-- Phase 4 · Migration 2 — privileges and Row Level Security
-- Principle: deny by default. Supabase grants broad table privileges to
-- the anon and authenticated roles, so they are revoked here and only the
-- operations the app needs are granted back. RLS then limits WHICH rows.
-- There is deliberately NO policy that grants unrestricted access.
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.wishlists      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.order_events   enable row level security;
alter table public.audit_logs     enable row level security;

-- ---------- table privileges ----------
revoke all on public.profiles, public.user_roles, public.categories, public.products, public.product_images,
              public.wishlists, public.orders, public.order_items, public.order_events, public.audit_logs
  from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

grant select on public.categories, public.products, public.product_images to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images to authenticated;  -- RLS: admin only
grant select on public.profiles to authenticated;
grant update (full_name, phone, town, preferred_language) on public.profiles to authenticated;            -- only these columns
grant select on public.user_roles to authenticated;                                                         -- no write grant at all
grant select, insert, delete on public.wishlists to authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;                   -- writes only via functions
grant select on public.audit_logs to authenticated;                                                         -- RLS: admin only

-- ---------- categories ----------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated
  using (is_visible or public.is_admin());
drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories for delete to authenticated using (public.is_admin());

-- ---------- products: public sees only published products in visible categories ----------
drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated
  using (
    (is_published and exists (select 1 from public.categories c where c.id = category_id and c.is_visible))
    or public.is_admin()
  );
drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

-- ---------- product_images: visible when the product is visible ----------
drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));   -- products RLS applies inside
drop policy if exists product_images_admin_insert on public.product_images;
create policy product_images_admin_insert on public.product_images for insert to authenticated with check (public.is_admin());
drop policy if exists product_images_admin_update on public.product_images;
create policy product_images_admin_update on public.product_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_images_admin_delete on public.product_images;
create policy product_images_admin_delete on public.product_images for delete to authenticated using (public.is_admin());

-- ---------- profiles ----------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- no insert policy (created by trigger), no delete policy

-- ---------- user_roles: readable by the user themself and admins; NOT writable through the API ----------
drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- wishlists: own rows only ----------
drop policy if exists wishlists_read_own on public.wishlists;
create policy wishlists_read_own on public.wishlists for select to authenticated using (user_id = auth.uid());
drop policy if exists wishlists_insert_own on public.wishlists;
create policy wishlists_insert_own on public.wishlists for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.products p where p.id = product_id and p.is_published));
drop policy if exists wishlists_delete_own on public.wishlists;
create policy wishlists_delete_own on public.wishlists for delete to authenticated using (user_id = auth.uid());

-- ---------- orders & items & events: customers read their own, staff read all ----------
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff())));
drop policy if exists order_events_read on public.order_events;
create policy order_events_read on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff())));

-- ---------- audit log: admins only ----------
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- Role-check helpers must be callable during policy evaluation (they return false for visitors).
revoke all on function public.has_role(text), public.is_admin(), public.is_staff() from public;
grant execute on function public.has_role(text), public.is_admin(), public.is_staff() to anon, authenticated;
-- Trigger functions are not callable through the API.
revoke all on function public.audit_row(), public.handle_new_user(), public.set_updated_at() from public, anon, authenticated;


-- >>>>>>>>>> supabase/migrations/20261013000300_order_functions.sql >>>>>>>>>>

-- =====================================================================
-- Phase 4 · Migration 3 — trusted order functions
-- Customers cannot insert or update orders directly (no grants). These
-- SECURITY DEFINER functions are the only write path. They:
--   * read only product_id + quantity from the browser — any price, total
--     or status sent by the browser is ignored
--   * re-check publication, availability, quantity limits and stock
--   * compute prices and totals from the products table
--   * write the order, its items and the first status event in ONE transaction
--   * return the existing order when the same idempotency key is reused
-- No function here can mark an order as paid.
-- Error messages are stable codes (e.g. 'product_unavailable') for the app to translate.
-- =====================================================================

create or replace function public.create_order_request(
  p_items           jsonb,
  p_idempotency_key uuid,
  p_contact_name    text,
  p_contact_phone   text,
  p_note            text default null
)
returns table (order_id uuid, order_number text, status text, priced_total numeric, has_unpriced_items boolean, is_duplicate boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid       uuid := auth.uid();
  v_order     public.orders%rowtype;
  v_item      jsonb;
  v_pid       uuid;
  v_qty       integer;
  v_p         public.products%rowtype;
  v_seen      uuid[] := '{}';
  v_total     numeric(12,2) := 0;
  v_unpriced  boolean := false;
  v_count     integer;
  v_name      text := btrim(coalesce(p_contact_name, ''));
  v_phone     text := regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g');
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_idempotency_key is null then raise exception 'missing_idempotency_key' using errcode = '22023'; end if;

  -- Same submission again (double tap, retry, refresh): return the original order.
  select * into v_order from public.orders o where o.customer_id = v_uid and o.idempotency_key = p_idempotency_key;
  if found then
    return query select v_order.id, v_order.order_number, v_order.status, v_order.priced_total, v_order.has_unpriced_items, true;
    return;
  end if;

  if char_length(v_name) not between 2 and 80 then raise exception 'invalid_contact_name' using errcode = '22023'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_contact_phone' using errcode = '22023'; end if;
  if v_note is not null and char_length(v_note) > 500 then raise exception 'note_too_long' using errcode = '22023'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'invalid_items' using errcode = '22023'; end if;
  v_count := jsonb_array_length(p_items);
  if v_count not between 1 and 20 then raise exception 'invalid_item_count' using errcode = '22023'; end if;

  -- Basic abuse protection: at most 10 order requests per customer per hour.
  if (select count(*) from public.orders o where o.customer_id = v_uid and o.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_requests' using errcode = '54000';
  end if;

  -- Validate every line before writing anything.
  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_pid := (v_item ->> 'product_id')::uuid;
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid_items' using errcode = '22023';
    end;
    if v_pid is null or v_qty is null then raise exception 'invalid_items' using errcode = '22023'; end if;
    if v_pid = any (v_seen) then raise exception 'duplicate_item' using errcode = '22023'; end if;
    v_seen := v_seen || v_pid;
    if v_qty not between 1 and 10 then raise exception 'invalid_quantity' using errcode = '22023'; end if;

    select p.* into v_p
      from public.products p join public.categories c on c.id = p.category_id
     where p.id = v_pid and p.is_published and c.is_visible
     for share of p;
    if not found then raise exception 'product_unavailable:%', v_pid using errcode = 'P0001'; end if;
    if v_p.stock_status = 'out_of_stock' then raise exception 'product_out_of_stock:%', v_p.sku using errcode = 'P0001'; end if;
    if v_qty > v_p.max_order_qty then raise exception 'quantity_exceeds_limit:%', v_p.sku using errcode = 'P0001'; end if;
    if v_p.stock_status = 'in_stock' and v_qty > v_p.stock_qty then raise exception 'insufficient_stock:%', v_p.sku using errcode = 'P0001'; end if;

    if v_p.price_mode = 'fixed' then v_total := v_total + v_p.fixed_price * v_qty; else v_unpriced := true; end if;
  end loop;

  begin
    insert into public.orders (customer_id, contact_name, contact_phone, customer_note, items_count, priced_total, has_unpriced_items, idempotency_key)
    values (v_uid, v_name, v_phone, v_note, v_count, v_total, v_unpriced, p_idempotency_key)
    returning * into v_order;
  exception when unique_violation then
    -- a concurrent request with the same key won the race: return that order
    select * into v_order from public.orders o where o.customer_id = v_uid and o.idempotency_key = p_idempotency_key;
    return query select v_order.id, v_order.order_number, v_order.status, v_order.priced_total, v_order.has_unpriced_items, true;
    return;
  end;

  insert into public.order_items (order_id, product_id, product_sku, name_en, name_ta, purity, gross_weight_g, net_weight_g, price_mode, unit_price, quantity)
  select v_order.id, p.id, p.sku, p.name_en, p.name_ta, p.purity, p.gross_weight_g, p.net_weight_g, p.price_mode,
         case when p.price_mode = 'fixed' then p.fixed_price end,
         (i ->> 'quantity')::integer
    from jsonb_array_elements(p_items) i
    join public.products p on p.id = (i ->> 'product_id')::uuid;

  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_role)
  values (v_order.id, null, 'requested', null, v_uid, 'customer');

  return query select v_order.id, v_order.order_number, v_order.status, v_order.priced_total, v_order.has_unpriced_items, false;
end $$;

-- Customer may cancel only their own order, and only while it is still 'requested'.
create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select o.status into v_old from public.orders o where o.id = p_order_id and o.customer_id = v_uid for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if v_old <> 'requested' then raise exception 'order_not_cancellable' using errcode = 'P0001'; end if;
  update public.orders set status = 'cancelled' where id = p_order_id;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_role)
  values (p_order_id, v_old, 'cancelled', left(nullif(btrim(coalesce(p_reason, '')), ''), 500), v_uid, 'customer');
  return 'cancelled';
end $$;

-- Staff/admin status changes, with an allowed-transition map and history.
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text, p_note text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_old  text;
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_staff() then raise exception 'not_authorized' using errcode = '42501'; end if;
  v_role := case when public.is_admin() then 'admin' else 'staff' end;
  select o.status into v_old from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  if not (
       (v_old = 'requested' and p_status in ('confirmed', 'rejected', 'cancelled'))
    or (v_old = 'confirmed' and p_status in ('ready', 'cancelled'))
    or (v_old = 'ready'     and p_status in ('completed', 'cancelled'))
  ) then
    raise exception 'invalid_status_transition:%->%', v_old, p_status using errcode = 'P0001';
  end if;
  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_role)
  values (p_order_id, v_old, p_status, left(nullif(btrim(coalesce(p_note, '')), ''), 500), v_uid, v_role);
  return p_status;
end $$;

-- Staff/admin internal note on an order.
create or replace function public.admin_set_order_note(p_order_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_staff() then raise exception 'not_authorized' using errcode = '42501'; end if;
  update public.orders set admin_note = left(nullif(btrim(coalesce(p_note, '')), ''), 1000) where id = p_order_id;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.create_order_request(jsonb, uuid, text, text, text) from public, anon;
revoke all on function public.cancel_my_order(uuid, text) from public, anon;
revoke all on function public.admin_update_order_status(uuid, text, text) from public, anon;
revoke all on function public.admin_set_order_note(uuid, text) from public, anon;
grant execute on function public.create_order_request(jsonb, uuid, text, text, text) to authenticated;
grant execute on function public.cancel_my_order(uuid, text) to authenticated;
grant execute on function public.admin_update_order_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_order_note(uuid, text) to authenticated;


-- >>>>>>>>>> supabase/migrations/20261013000400_storage.sql >>>>>>>>>>

-- =====================================================================
-- Phase 4 · Migration 4 — product image storage
-- Bucket "product-images": public READ by URL (catalogue photos are public),
-- 5 MB limit, JPEG/PNG/WebP only (enforced by Storage itself).
-- Upload, replace, delete and listing: admins only, under products/<product-uuid>/.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images: admin list" on storage.objects;
create policy "product images: admin list" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin upload" on storage.objects;
create policy "product images: admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin()
              and (storage.foldername(name))[1] = 'products'
              and lower(name) ~ '\.(jpe?g|png|webp)$');

drop policy if exists "product images: admin update" on storage.objects;
create policy "product images: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = 'products');

drop policy if exists "product images: admin delete" on storage.objects;
create policy "product images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());


-- >>>>>>>>>> supabase/migrations/20261014000500_savings_schema.sql >>>>>>>>>>

-- =====================================================================
-- Phase 5 · Migration 5 — gold savings: schemes, enrollments, installments,
-- payments, redemptions, gold-rate history (tables, integrity, RLS)
--
-- IMPORTANT — scheme rules are NOT invented here. Every financial term
-- (duration, amounts, payment window, gold conversion, redemption timing)
-- is a nullable, admin-configurable column. A scheme can only accept
-- enrollments after an admin records the shop owner's approval.
--
-- Financial records are never deleted (DELETE is blocked by trigger and
-- not granted). Corrections are traceable: a verified payment can only be
-- VOIDED with a reason, never edited. All changes go to audit_logs.
-- Non-destructive: safe to run more than once.
-- =====================================================================

create sequence if not exists public.savings_enrollment_seq start 1001;
create sequence if not exists public.savings_receipt_seq    start 100001;
create sequence if not exists public.savings_redemption_seq start 1001;

-- ---------- scheme definitions (terms configurable; approval gate) ----------
create table if not exists public.savings_schemes (
  id                       text primary key check (id ~ '^[a-z][a-z0-9-]{1,39}$'),
  name_en                  text not null check (char_length(btrim(name_en)) between 2 and 100),
  name_ta                  text not null check (char_length(btrim(name_ta)) between 2 and 100),
  description_en           text check (char_length(description_en) <= 2000),
  description_ta           text check (char_length(description_ta) <= 2000),
  -- financial terms: NULL = not configured / not approved
  contribution_type        text check (contribution_type in ('fixed', 'flexible')),
  duration_months          integer check (duration_months between 1 and 120),
  min_installment          numeric(12,2) check (min_installment > 0),
  max_installment          numeric(12,2) check (max_installment > 0),
  allowed_fixed_amounts    numeric(12,2)[] check (allowed_fixed_amounts is null or (cardinality(allowed_fixed_amounts) between 1 and 20 and 0 < all (allowed_fixed_amounts))),
  payment_window_start_day integer check (payment_window_start_day between 1 and 28),
  payment_window_end_day   integer check (payment_window_end_day between 1 and 31),
  gold_conversion          text not null default 'none' check (gold_conversion in ('none', 'verification_date_rate')),
  conversion_purity        text check (conversion_purity in ('22K', '24K')),
  redemption_after_months  integer check (redemption_after_months between 1 and 240),
  terms_en                 text check (char_length(terms_en) <= 8000),
  terms_ta                 text check (char_length(terms_ta) <= 8000),
  -- approval (written only by admin_approve_scheme / admin_retire_scheme)
  approval_status          text not null default 'draft' check (approval_status in ('draft', 'approved', 'retired')),
  approval_note            text check (char_length(approval_note) <= 500),
  approved_by              uuid references auth.users (id),
  approved_at              timestamptz,
  terms_version            integer not null default 0 check (terms_version >= 0),   -- +1 on every approval
  enrollment_open          boolean not null default false,
  sort_order               integer not null default 100 check (sort_order between 0 and 10000),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint savings_schemes_minmax check (min_installment is null or max_installment is null or max_installment >= min_installment),
  constraint savings_schemes_window check ((payment_window_start_day is null) = (payment_window_end_day is null)
                                           and (payment_window_start_day is null or payment_window_end_day >= payment_window_start_day)),
  constraint savings_schemes_conversion check (gold_conversion = 'none' or conversion_purity is not null),
  constraint savings_schemes_open_needs_approval check (not enrollment_open or approval_status = 'approved'),
  constraint savings_schemes_approved_meta check (approval_status <> 'approved' or (approved_by is not null and approved_at is not null))
);

-- ---------- enrollments (terms are SNAPSHOTTED at request time) ----------
create table if not exists public.savings_enrollments (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_number   text not null unique default ('SV-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('public.savings_enrollment_seq')::text, 5, '0')),
  customer_id         uuid not null references public.profiles (id) on delete restrict,
  scheme_id           text not null references public.savings_schemes (id) on delete restrict,
  status              text not null default 'pending_approval'
                      check (status in ('pending_approval', 'active', 'rejected', 'cancelled', 'redeemed')),
  start_month         date check (start_month is null or start_month = date_trunc('month', start_month)::date),
  duration_months     integer not null check (duration_months between 1 and 120),
  contribution_type   text not null check (contribution_type in ('fixed', 'flexible')),
  fixed_amount        numeric(12,2) check (fixed_amount > 0),
  min_installment     numeric(12,2),
  max_installment     numeric(12,2),
  gold_conversion     text not null check (gold_conversion in ('none', 'verification_date_rate')),
  conversion_purity   text check (conversion_purity in ('22K', '24K')),
  terms_snapshot      jsonb not null,
  terms_approved_at   timestamptz not null,
  terms_version       integer not null,
  requested_by        uuid not null,
  requested_at        timestamptz not null default now(),
  decided_by          uuid,
  decided_at          timestamptz,
  decision_note       text check (char_length(decision_note) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint savings_enr_fixed check ((contribution_type = 'fixed') = (fixed_amount is not null)),
  constraint savings_enr_start check (status in ('pending_approval', 'rejected', 'cancelled') or start_month is not null)
);
create index if not exists savings_enr_customer_idx on public.savings_enrollments (customer_id, created_at desc);
create index if not exists savings_enr_status_idx on public.savings_enrollments (status, created_at desc);
create unique index if not exists savings_enr_one_pending_request
  on public.savings_enrollments (customer_id, scheme_id) where status = 'pending_approval';

-- ---------- installment schedule (created when an enrollment is activated) ----------
create table if not exists public.savings_installments (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null references public.savings_enrollments (id) on delete restrict,
  installment_no   integer not null check (installment_no between 1 and 120),
  due_month        date not null check (due_month = date_trunc('month', due_month)::date),
  expected_amount  numeric(12,2) check (expected_amount > 0),
  status           text not null default 'pending_payment' check (status in ('pending_payment', 'pending_verification', 'paid')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (enrollment_id, installment_no),
  unique (enrollment_id, due_month)
);

-- ---------- gold-rate history (insert-only; withdraw instead of edit/delete) ----------
create table if not exists public.gold_rates (
  id               bigint generated always as identity primary key,
  purity           text not null check (purity in ('22K', '24K')),
  rate_per_gram    numeric(10,2) not null check (rate_per_gram between 1000 and 100000),
  effective_at     timestamptz not null,
  source_note      text not null check (char_length(btrim(source_note)) between 3 and 300),
  status           text not null default 'active' check (status in ('active', 'withdrawn')),
  created_by       uuid not null,
  created_at       timestamptz not null default now(),
  withdrawn_by     uuid,
  withdrawn_at     timestamptz,
  withdraw_reason  text check (char_length(withdraw_reason) <= 300),
  constraint gold_rates_withdrawn_meta check (status = 'active' or (withdrawn_by is not null and withdrawn_at is not null and char_length(btrim(coalesce(withdraw_reason, ''))) >= 5))
);
create index if not exists gold_rates_lookup_idx on public.gold_rates (purity, effective_at desc) where status = 'active';

-- ---------- payments (customer UPI references + in-store entries) ----------
create table if not exists public.savings_payments (
  id                uuid primary key default gen_random_uuid(),
  receipt_number    text unique,
  enrollment_id     uuid not null references public.savings_enrollments (id) on delete restrict,
  installment_id    uuid not null references public.savings_installments (id) on delete restrict,
  customer_id       uuid not null references public.profiles (id) on delete restrict,
  amount            numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  channel           text not null check (channel in ('in_store', 'customer_upi')),
  method            text not null check (method in ('cash', 'upi', 'card', 'bank_transfer')),
  upi_reference     text check (upi_reference ~ '^[A-Z0-9]{6,35}$'),
  store_reference   text check (char_length(store_reference) <= 40),
  paid_on           date not null,
  status            text not null check (status in ('pending_verification', 'verified', 'rejected', 'voided')),
  submitted_by      uuid not null,
  submitted_at      timestamptz not null default now(),
  verified_by       uuid,
  verified_at       timestamptz,
  rejected_by       uuid,
  rejected_at       timestamptz,
  rejection_reason  text check (char_length(rejection_reason) <= 300),
  voided_by         uuid,
  voided_at         timestamptz,
  void_reason       text check (char_length(void_reason) <= 300),
  gold_rate_id      bigint references public.gold_rates (id),
  gold_purity       text check (gold_purity in ('22K', '24K')),
  gold_rate_per_g   numeric(10,2),
  gold_weight_g     numeric(12,3),
  note              text check (char_length(note) <= 300),
  created_at        timestamptz not null default now(),
  constraint savings_pay_upi_channel check (channel <> 'customer_upi' or (method = 'upi' and upi_reference is not null)),
  constraint savings_pay_verified_meta check (status not in ('verified', 'voided') or (verified_by is not null and verified_at is not null and receipt_number is not null)),
  constraint savings_pay_rejected_meta check (status <> 'rejected' or (rejected_by is not null and rejected_at is not null and char_length(btrim(coalesce(rejection_reason, ''))) >= 5)),
  constraint savings_pay_voided_meta check (status <> 'voided' or (voided_by is not null and voided_at is not null and char_length(btrim(coalesce(void_reason, ''))) >= 5)),
  constraint savings_pay_gold check (gold_weight_g is null or (gold_rate_id is not null and gold_rate_per_g is not null and gold_purity is not null))
);
-- At most ONE active (pending or verified) payment per installment -> no duplicate credits.
create unique index if not exists savings_pay_one_active_per_installment
  on public.savings_payments (installment_id) where status in ('pending_verification', 'verified');
-- A UPI reference can back only one active payment.
create unique index if not exists savings_pay_upi_reference_unique
  on public.savings_payments (upi_reference) where upi_reference is not null and status in ('pending_verification', 'verified');
create index if not exists savings_pay_status_idx on public.savings_payments (status, submitted_at desc);
create index if not exists savings_pay_enrollment_idx on public.savings_payments (enrollment_id, submitted_at desc);
create index if not exists savings_pay_customer_idx on public.savings_payments (customer_id, submitted_at desc);

-- ---------- redemption requests and decisions ----------
create table if not exists public.savings_redemptions (
  id                        uuid primary key default gen_random_uuid(),
  request_number            text not null unique default ('RD-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('public.savings_redemption_seq')::text, 5, '0')),
  enrollment_id             uuid not null references public.savings_enrollments (id) on delete restrict,
  customer_id               uuid not null references public.profiles (id) on delete restrict,
  redemption_type           text not null check (redemption_type in ('jewellery', 'coin')),
  preference                text check (char_length(preference) <= 200),
  preferred_visit_date      date,
  status                    text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  verified_total_at_request numeric(12,2) not null,
  paid_count_at_request     integer not null,
  gold_weight_at_request    numeric(12,3),
  requested_at              timestamptz not null default now(),
  decided_by                uuid,
  decided_at                timestamptz,
  decision_note             text check (char_length(decision_note) <= 500),
  completed_by              uuid,
  completed_at              timestamptz,
  completion_note           text check (char_length(completion_note) <= 500),
  cancelled_at              timestamptz,
  constraint savings_rdm_rejected_note check (status <> 'rejected' or char_length(btrim(coalesce(decision_note, ''))) >= 5)
);
create unique index if not exists savings_rdm_one_open
  on public.savings_redemptions (enrollment_id) where status in ('pending', 'approved');
create index if not exists savings_rdm_status_idx on public.savings_redemptions (status, requested_at desc);

-- ---------- passbook totals (computed from verified payments only) ----------
create or replace view public.savings_enrollment_totals with (security_invoker = true) as
select e.id as enrollment_id,
       coalesce(sum(p.amount) filter (where p.status = 'verified'), 0)::numeric(12,2)             as verified_total,
       coalesce(sum(p.amount) filter (where p.status = 'pending_verification'), 0)::numeric(12,2) as pending_total,
       count(p.id) filter (where p.status = 'verified')::integer                                   as paid_count,
       count(p.id) filter (where p.status = 'pending_verification')::integer                       as pending_count,
       (sum(p.gold_weight_g) filter (where p.status = 'verified'))::numeric(12,3)                  as gold_weight_g
from public.savings_enrollments e
left join public.savings_payments p on p.enrollment_id = e.id
group by e.id;

-- =====================================================================
-- Integrity triggers
-- =====================================================================
create or replace function public.savings_block_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'financial_record_delete_blocked' using errcode = '42501';
end $$;

drop trigger if exists savings_schemes_no_delete on public.savings_schemes;
create trigger savings_schemes_no_delete before delete on public.savings_schemes for each row execute function public.savings_block_delete();
drop trigger if exists savings_enr_no_delete on public.savings_enrollments;
create trigger savings_enr_no_delete before delete on public.savings_enrollments for each row execute function public.savings_block_delete();
drop trigger if exists savings_inst_no_delete on public.savings_installments;
create trigger savings_inst_no_delete before delete on public.savings_installments for each row execute function public.savings_block_delete();
drop trigger if exists savings_pay_no_delete on public.savings_payments;
create trigger savings_pay_no_delete before delete on public.savings_payments for each row execute function public.savings_block_delete();
drop trigger if exists savings_rdm_no_delete on public.savings_redemptions;
create trigger savings_rdm_no_delete before delete on public.savings_redemptions for each row execute function public.savings_block_delete();
drop trigger if exists gold_rates_no_delete on public.gold_rates;
create trigger gold_rates_no_delete before delete on public.gold_rates for each row execute function public.savings_block_delete();

-- Payments: only these transitions; the money facts never change after insert.
create or replace function public.savings_payment_guard()
returns trigger language plpgsql as $$
begin
  if (new.amount, new.enrollment_id, new.installment_id, new.customer_id, new.channel, new.method,
      new.upi_reference, new.store_reference, new.paid_on, new.submitted_by, new.submitted_at, new.created_at)
     is distinct from
     (old.amount, old.enrollment_id, old.installment_id, old.customer_id, old.channel, old.method,
      old.upi_reference, old.store_reference, old.paid_on, old.submitted_by, old.submitted_at, old.created_at) then
    raise exception 'payment_fields_immutable' using errcode = '42501';
  end if;
  if old.status = new.status then
    raise exception 'payment_status_unchanged' using errcode = '22023';
  end if;
  if not ((old.status = 'pending_verification' and new.status in ('verified', 'rejected'))
       or (old.status = 'verified' and new.status = 'voided')) then
    raise exception 'invalid_payment_transition' using errcode = '22023';
  end if;
  if old.status = 'verified' and (new.receipt_number, new.verified_by, new.verified_at, new.gold_rate_id, new.gold_rate_per_g, new.gold_weight_g)
                                  is distinct from (old.receipt_number, old.verified_by, old.verified_at, old.gold_rate_id, old.gold_rate_per_g, old.gold_weight_g) then
    raise exception 'payment_fields_immutable' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists savings_pay_guard on public.savings_payments;
create trigger savings_pay_guard before update on public.savings_payments for each row execute function public.savings_payment_guard();

-- Gold rates: only active -> withdrawn; the rate itself never changes.
create or replace function public.gold_rate_guard()
returns trigger language plpgsql as $$
begin
  if (new.purity, new.rate_per_gram, new.effective_at, new.source_note, new.created_by, new.created_at)
     is distinct from (old.purity, old.rate_per_gram, old.effective_at, old.source_note, old.created_by, old.created_at)
     or not (old.status = 'active' and new.status = 'withdrawn') then
    raise exception 'gold_rate_immutable' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists gold_rates_guard on public.gold_rates;
create trigger gold_rates_guard before update on public.gold_rates for each row execute function public.gold_rate_guard();

-- Schemes: a new scheme always starts as draft; changing any TERM of an
-- approved scheme sends it back to draft and closes enrollment until it
-- is approved again (existing enrollments keep their own snapshot).
create or replace function public.savings_scheme_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.approval_status := 'draft'; new.approved_by := null; new.approved_at := null;
    new.approval_note := null; new.enrollment_open := false;
    return new;
  end if;
  if (new.contribution_type, new.duration_months, new.min_installment, new.max_installment, new.allowed_fixed_amounts,
      new.payment_window_start_day, new.payment_window_end_day, new.gold_conversion, new.conversion_purity,
      new.redemption_after_months, new.terms_en, new.terms_ta, new.name_en, new.name_ta)
     is distinct from
     (old.contribution_type, old.duration_months, old.min_installment, old.max_installment, old.allowed_fixed_amounts,
      old.payment_window_start_day, old.payment_window_end_day, old.gold_conversion, old.conversion_purity,
      old.redemption_after_months, old.terms_en, old.terms_ta, old.name_en, old.name_ta)
     and old.approval_status = 'approved' then
    new.approval_status := 'draft'; new.approved_by := null; new.approved_at := null; new.enrollment_open := false;
    new.approval_note := 'Terms changed after approval — needs approval again';
  end if;
  return new;
end $$;
drop trigger if exists savings_schemes_guard on public.savings_schemes;
create trigger savings_schemes_guard before insert or update on public.savings_schemes for each row execute function public.savings_scheme_guard();

-- updated_at + audit trail
drop trigger if exists savings_schemes_updated_at on public.savings_schemes;
create trigger savings_schemes_updated_at before update on public.savings_schemes for each row execute function public.set_updated_at();
drop trigger if exists savings_enr_updated_at on public.savings_enrollments;
create trigger savings_enr_updated_at before update on public.savings_enrollments for each row execute function public.set_updated_at();
drop trigger if exists savings_inst_updated_at on public.savings_installments;
create trigger savings_inst_updated_at before update on public.savings_installments for each row execute function public.set_updated_at();

drop trigger if exists audit_savings_schemes on public.savings_schemes;
create trigger audit_savings_schemes after insert or update or delete on public.savings_schemes for each row execute function public.audit_row();
drop trigger if exists audit_savings_enrollments on public.savings_enrollments;
create trigger audit_savings_enrollments after insert or update or delete on public.savings_enrollments for each row execute function public.audit_row();
drop trigger if exists audit_savings_payments on public.savings_payments;
create trigger audit_savings_payments after insert or update or delete on public.savings_payments for each row execute function public.audit_row();
drop trigger if exists audit_savings_redemptions on public.savings_redemptions;
create trigger audit_savings_redemptions after insert or update or delete on public.savings_redemptions for each row execute function public.audit_row();
drop trigger if exists audit_gold_rates on public.gold_rates;
create trigger audit_gold_rates after insert or update or delete on public.gold_rates for each row execute function public.audit_row();

-- =====================================================================
-- Privileges + Row Level Security (deny by default)
-- =====================================================================
alter table public.savings_schemes      enable row level security;
alter table public.savings_enrollments  enable row level security;
alter table public.savings_installments enable row level security;
alter table public.savings_payments     enable row level security;
alter table public.savings_redemptions  enable row level security;
alter table public.gold_rates           enable row level security;

revoke all on public.savings_schemes, public.savings_enrollments, public.savings_installments,
              public.savings_payments, public.savings_redemptions, public.gold_rates,
              public.savings_enrollment_totals
  from anon, authenticated;
revoke all on sequence public.savings_enrollment_seq, public.savings_receipt_seq, public.savings_redemption_seq from anon, authenticated;

grant select on public.savings_schemes, public.gold_rates to anon, authenticated;
-- Admin edits scheme TERMS directly (RLS: admin only); approval columns are NOT grantable.
grant insert (id, name_en, name_ta, description_en, description_ta, contribution_type, duration_months, min_installment, max_installment,
              allowed_fixed_amounts, payment_window_start_day, payment_window_end_day, gold_conversion, conversion_purity,
              redemption_after_months, terms_en, terms_ta, sort_order)
  on public.savings_schemes to authenticated;
grant update (name_en, name_ta, description_en, description_ta, contribution_type, duration_months, min_installment, max_installment,
              allowed_fixed_amounts, payment_window_start_day, payment_window_end_day, gold_conversion, conversion_purity,
              redemption_after_months, terms_en, terms_ta, sort_order, enrollment_open)
  on public.savings_schemes to authenticated;
-- Everything else is READ-ONLY for app users; all writes go through the functions in migration 6.
grant select on public.savings_enrollments, public.savings_installments, public.savings_payments,
                public.savings_redemptions, public.savings_enrollment_totals to authenticated;

drop policy if exists savings_schemes_read on public.savings_schemes;
create policy savings_schemes_read on public.savings_schemes for select to anon, authenticated using (true);  -- scheme info is public (shows DRAFT / NOT APPROVED)
drop policy if exists savings_schemes_admin_insert on public.savings_schemes;
create policy savings_schemes_admin_insert on public.savings_schemes for insert to authenticated with check (public.is_admin());
drop policy if exists savings_schemes_admin_update on public.savings_schemes;
create policy savings_schemes_admin_update on public.savings_schemes for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists savings_enr_read on public.savings_enrollments;
create policy savings_enr_read on public.savings_enrollments for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists savings_inst_read on public.savings_installments;
create policy savings_inst_read on public.savings_installments for select to authenticated
  using (public.is_staff() or exists (select 1 from public.savings_enrollments e where e.id = enrollment_id and e.customer_id = auth.uid()));
drop policy if exists savings_pay_read on public.savings_payments;
create policy savings_pay_read on public.savings_payments for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists savings_rdm_read on public.savings_redemptions;
create policy savings_rdm_read on public.savings_redemptions for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists gold_rates_read on public.gold_rates;
create policy gold_rates_read on public.gold_rates for select to anon, authenticated
  using (status = 'active' or public.is_staff());

revoke all on function public.savings_block_delete(), public.savings_payment_guard(), public.gold_rate_guard(), public.savings_scheme_guard()
  from public, anon, authenticated;


-- >>>>>>>>>> supabase/migrations/20261014000600_savings_functions.sql >>>>>>>>>>

-- =====================================================================
-- Phase 5 · Migration 6 — trusted savings functions (the ONLY write path)
--
--   Customer : request_enrollment, cancel_my_enrollment_request,
--              submit_upi_payment (-> PENDING VERIFICATION only),
--              request_redemption, cancel_my_redemption
--   Staff    : record_instore_payment (admin or staff, recorded as verified
--              with the staff member's identity)
--   Admin    : admin_approve_scheme, admin_retire_scheme,
--              admin_decide_enrollment, admin_create_enrollment,
--              admin_verify_upi_payment, admin_reject_upi_payment,
--              admin_void_payment, admin_add_gold_rates,
--              admin_withdraw_gold_rate, admin_decide_redemption,
--              admin_complete_redemption
--   Public   : current_gold_rates
--
-- Each function runs in one transaction, locks the rows it changes, checks
-- the caller's role inside the database and raises a stable error code.
-- A customer-submitted UPI reference NEVER credits an installment by itself.
-- =====================================================================

-- ---------- helpers (not callable through the API) ----------
create or replace function public.savings_today()
returns date language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function public.savings_terms_complete(s public.savings_schemes)
returns boolean language sql immutable as $$
  select s.contribution_type is not null
     and s.duration_months is not null
     and (s.contribution_type <> 'fixed' or coalesce(cardinality(s.allowed_fixed_amounts), 0) > 0)
     and (s.contribution_type <> 'flexible' or s.min_installment is not null)
     and char_length(btrim(coalesce(s.terms_en, ''))) >= 20
     and char_length(btrim(coalesce(s.terms_ta, ''))) >= 20
$$;

-- Validate an installment amount against the enrollment's SNAPSHOT terms.
create or replace function public.savings_check_amount(e public.savings_enrollments, i public.savings_installments, p_amount numeric)
returns void language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if e.contribution_type = 'fixed' then
    if p_amount <> coalesce(i.expected_amount, e.fixed_amount) then raise exception 'amount_mismatch' using errcode = '22023'; end if;
  else
    if e.min_installment is not null and p_amount < e.min_installment then raise exception 'amount_out_of_range' using errcode = '22023'; end if;
    if e.max_installment is not null and p_amount > e.max_installment then raise exception 'amount_out_of_range' using errcode = '22023'; end if;
  end if;
end $$;

-- Gold conversion ONLY when the approved terms say so; never guessed.
create or replace function public.savings_conversion(e public.savings_enrollments, p_amount numeric, p_at timestamptz,
                                                     out o_rate_id bigint, out o_purity text, out o_rate numeric, out o_weight numeric)
language plpgsql as $$
declare r public.gold_rates%rowtype;
begin
  if e.gold_conversion = 'none' then return; end if;
  select * into r from public.gold_rates g
   where g.purity = e.conversion_purity and g.status = 'active' and g.effective_at <= p_at
   order by g.effective_at desc, g.id desc limit 1;
  if not found then raise exception 'gold_rate_missing' using errcode = '22023'; end if;
  o_rate_id := r.id; o_purity := r.purity; o_rate := r.rate_per_gram;
  o_weight := round(p_amount / r.rate_per_gram, 3);
end $$;

create or replace function public.savings_next_receipt()
returns text language sql as $$
  select 'STM-RC-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('public.savings_receipt_seq')::text, 6, '0')
$$;

create or replace function public.savings_activate(p_enrollment_id uuid, p_start_month date)
returns void language plpgsql as $$
declare e public.savings_enrollments%rowtype; n integer;
begin
  select * into e from public.savings_enrollments where id = p_enrollment_id for update;
  if p_start_month is null or p_start_month <> date_trunc('month', p_start_month)::date then
    raise exception 'invalid_start_month' using errcode = '22023';
  end if;
  if p_start_month < (date_trunc('month', public.savings_today()) - interval '24 months')::date
     or p_start_month > (date_trunc('month', public.savings_today()) + interval '24 months')::date then
    raise exception 'invalid_start_month' using errcode = '22023';
  end if;
  update public.savings_enrollments set status = 'active', start_month = p_start_month where id = e.id;
  for n in 1 .. e.duration_months loop
    insert into public.savings_installments (enrollment_id, installment_no, due_month, expected_amount)
    values (e.id, n, (p_start_month + make_interval(months => n - 1))::date, e.fixed_amount);
  end loop;
end $$;

-- ---------- schemes ----------
create or replace function public.admin_approve_scheme(p_scheme_id text, p_approval_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.savings_schemes%rowtype; v_note text := btrim(coalesce(p_approval_note, ''));
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into s from public.savings_schemes where id = p_scheme_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public.savings_terms_complete(s) then raise exception 'scheme_terms_incomplete' using errcode = '22023'; end if;
  if char_length(v_note) < 10 then raise exception 'approval_note_required' using errcode = '22023'; end if;
  update public.savings_schemes
     set approval_status = 'approved', approved_by = auth.uid(), approved_at = now(), approval_note = left(v_note, 500),
         terms_version = s.terms_version + 1
   where id = s.id;
end $$;

create or replace function public.admin_retire_scheme(p_scheme_id text, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.savings_schemes
     set approval_status = 'retired', enrollment_open = false, approval_note = left(btrim(p_note), 500)
   where id = p_scheme_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- ---------- enrollments ----------
create or replace function public.request_enrollment(p_scheme_id text, p_fixed_amount numeric default null)
returns table (enrollment_id uuid, enrollment_number text, status text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  s     public.savings_schemes%rowtype;
  pr    public.profiles%rowtype;
  e     public.savings_enrollments%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into pr from public.profiles where id = v_uid;
  if not found or pr.full_name is null or pr.phone is null then raise exception 'profile_incomplete' using errcode = '22023'; end if;
  select * into s from public.savings_schemes where id = p_scheme_id;
  if not found or s.approval_status <> 'approved' or not s.enrollment_open then
    raise exception 'scheme_not_open' using errcode = '22023';
  end if;
  if s.contribution_type = 'fixed' then
    if p_fixed_amount is null or not (p_fixed_amount = any (s.allowed_fixed_amounts)) then raise exception 'invalid_amount' using errcode = '22023'; end if;
  elsif p_fixed_amount is not null then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if (select count(*) from public.savings_enrollments x where x.requested_by = v_uid and x.requested_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_requests' using errcode = '22023';
  end if;
  begin
    insert into public.savings_enrollments
      (customer_id, scheme_id, duration_months, contribution_type, fixed_amount, min_installment, max_installment,
       gold_conversion, conversion_purity, terms_snapshot, terms_approved_at, terms_version, requested_by)
    values (v_uid, s.id, s.duration_months, s.contribution_type, p_fixed_amount, s.min_installment, s.max_installment,
            s.gold_conversion, s.conversion_purity,
            to_jsonb(s) - 'enrollment_open' - 'sort_order' - 'created_at' - 'updated_at', s.approved_at, s.terms_version, v_uid)
    returning * into e;
  exception when unique_violation then
    raise exception 'duplicate_request' using errcode = '23505';
  end;
  return query select e.id, e.enrollment_number, e.status;
end $$;

create or replace function public.cancel_my_enrollment_request(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.savings_enrollments set status = 'cancelled'
   where id = p_enrollment_id and customer_id = auth.uid() and status = 'pending_approval';
  if not found then raise exception 'cannot_cancel' using errcode = '22023'; end if;
end $$;

create or replace function public.admin_decide_enrollment(p_enrollment_id uuid, p_approve boolean, p_start_month date default null, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.savings_enrollments%rowtype; s public.savings_schemes%rowtype; v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into e from public.savings_enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if e.status <> 'pending_approval' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  if p_approve then
    select * into s from public.savings_schemes where id = e.scheme_id;
    -- the terms the customer agreed to must still be the approved terms
    if s.approval_status <> 'approved' or s.terms_version <> e.terms_version then
      raise exception 'scheme_terms_changed' using errcode = '22023';
    end if;
    update public.savings_enrollments set decided_by = auth.uid(), decided_at = now(), decision_note = left(v_note, 500) where id = e.id;
    perform public.savings_activate(e.id, p_start_month);
  else
    if char_length(coalesce(v_note, '')) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
    update public.savings_enrollments set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = left(v_note, 500) where id = e.id;
  end if;
end $$;

-- In-store enrollment by an admin for a registered customer.
create or replace function public.admin_create_enrollment(p_customer_id uuid, p_scheme_id text, p_fixed_amount numeric, p_start_month date, p_note text default null)
returns table (enrollment_id uuid, enrollment_number text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.savings_schemes%rowtype; e public.savings_enrollments%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_customer_id) then raise exception 'customer_not_found' using errcode = 'P0002'; end if;
  select * into s from public.savings_schemes where id = p_scheme_id;
  if not found or s.approval_status <> 'approved' then raise exception 'scheme_not_open' using errcode = '22023'; end if;
  if s.contribution_type = 'fixed' then
    if p_fixed_amount is null or not (p_fixed_amount = any (s.allowed_fixed_amounts)) then raise exception 'invalid_amount' using errcode = '22023'; end if;
  elsif p_fixed_amount is not null then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  insert into public.savings_enrollments
    (customer_id, scheme_id, duration_months, contribution_type, fixed_amount, min_installment, max_installment,
     gold_conversion, conversion_purity, terms_snapshot, terms_approved_at, terms_version, requested_by, decided_by, decided_at, decision_note)
  values (p_customer_id, s.id, s.duration_months, s.contribution_type, p_fixed_amount, s.min_installment, s.max_installment,
          s.gold_conversion, s.conversion_purity, to_jsonb(s) - 'enrollment_open' - 'sort_order' - 'created_at' - 'updated_at',
          s.approved_at, s.terms_version, auth.uid(), auth.uid(), now(), left(nullif(btrim(coalesce(p_note, '')), ''), 500))
  returning * into e;
  perform public.savings_activate(e.id, p_start_month);
  return query select e.id, e.enrollment_number;
end $$;

-- ---------- payments ----------
-- Customer: submit a UPI reference. Result is PENDING VERIFICATION, never paid.
create or replace function public.submit_upi_payment(p_installment_id uuid, p_amount numeric, p_upi_reference text, p_paid_on date)
returns table (payment_id uuid, status text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  i public.savings_installments%rowtype;
  e public.savings_enrollments%rowtype;
  v_ref text := upper(regexp_replace(coalesce(p_upi_reference, ''), '[\s-]', '', 'g'));
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into i from public.savings_installments where id = p_installment_id for update;
  if not found then raise exception 'installment_not_found' using errcode = 'P0002'; end if;
  select * into e from public.savings_enrollments where id = i.enrollment_id;
  if e.customer_id <> v_uid then raise exception 'installment_not_found' using errcode = 'P0002'; end if;   -- do not reveal others' data
  if e.status <> 'active' then raise exception 'enrollment_not_active' using errcode = '22023'; end if;
  if i.status <> 'pending_payment' then raise exception 'installment_not_payable' using errcode = '22023'; end if;
  perform public.savings_check_amount(e, i, p_amount);
  if v_ref !~ '^[A-Z0-9]{6,35}$' then raise exception 'invalid_reference' using errcode = '22023'; end if;
  if p_paid_on is null or p_paid_on > public.savings_today() or p_paid_on < public.savings_today() - 90 then
    raise exception 'invalid_payment_date' using errcode = '22023';
  end if;
  if (select count(*) from public.savings_payments x where x.submitted_by = v_uid and x.submitted_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many_requests' using errcode = '22023';
  end if;
  begin
    insert into public.savings_payments (enrollment_id, installment_id, customer_id, amount, channel, method, upi_reference, paid_on, status, submitted_by)
    values (e.id, i.id, v_uid, p_amount, 'customer_upi', 'upi', v_ref, p_paid_on, 'pending_verification', v_uid)
    returning id into v_id;
  exception when unique_violation then
    if exists (select 1 from public.savings_payments x where x.upi_reference = v_ref and x.status in ('pending_verification', 'verified')) then
      raise exception 'duplicate_reference' using errcode = '23505';
    end if;
    raise exception 'installment_not_payable' using errcode = '23505';
  end;
  update public.savings_installments set status = 'pending_verification' where id = i.id;
  return query select v_id, 'pending_verification'::text;
end $$;

-- Admin only: approve a customer's UPI reference after checking the real statement.
create or replace function public.admin_verify_upi_payment(p_payment_id uuid, p_note text default null)
returns table (receipt_number text, gold_weight_g numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.savings_payments%rowtype; e public.savings_enrollments%rowtype; c record; v_receipt text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into p from public.savings_payments where id = p_payment_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p.status <> 'pending_verification' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  select * into e from public.savings_enrollments where id = p.enrollment_id for update;
  if e.status <> 'active' then raise exception 'enrollment_not_active' using errcode = '22023'; end if;
  c := public.savings_conversion(e, p.amount, now());
  v_receipt := public.savings_next_receipt();
  update public.savings_payments
     set status = 'verified', verified_by = auth.uid(), verified_at = now(), receipt_number = v_receipt,
         gold_rate_id = c.o_rate_id, gold_purity = c.o_purity, gold_rate_per_g = c.o_rate, gold_weight_g = c.o_weight,
         note = coalesce(left(nullif(btrim(coalesce(p_note, '')), ''), 300), note)
   where id = p.id;
  update public.savings_installments set status = 'paid' where id = p.installment_id;
  return query select v_receipt, c.o_weight;
end $$;

create or replace function public.admin_reject_upi_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.savings_payments%rowtype; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(v_reason) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into p from public.savings_payments where id = p_payment_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p.status <> 'pending_verification' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  update public.savings_payments set status = 'rejected', rejected_by = auth.uid(), rejected_at = now(), rejection_reason = left(v_reason, 300) where id = p.id;
  update public.savings_installments set status = 'pending_payment' where id = p.installment_id;
end $$;

-- Admin or staff: payment received at the counter. Recorded as verified with the staff identity.
create or replace function public.record_instore_payment(p_installment_id uuid, p_amount numeric, p_method text, p_paid_on date,
                                                         p_store_reference text default null, p_upi_reference text default null, p_note text default null)
returns table (payment_id uuid, receipt_number text, gold_weight_g numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  i public.savings_installments%rowtype; e public.savings_enrollments%rowtype; c record;
  v_ref text := nullif(upper(regexp_replace(coalesce(p_upi_reference, ''), '[\s-]', '', 'g')), '');
  v_store text := nullif(btrim(coalesce(p_store_reference, '')), '');
  v_receipt text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_method not in ('cash', 'upi', 'card', 'bank_transfer') then raise exception 'invalid_method' using errcode = '22023'; end if;
  if v_ref is not null and v_ref !~ '^[A-Z0-9]{6,35}$' then raise exception 'invalid_reference' using errcode = '22023'; end if;
  if v_store is not null and char_length(v_store) > 40 then raise exception 'invalid_reference' using errcode = '22023'; end if;
  if p_paid_on is null or p_paid_on > public.savings_today() or p_paid_on < public.savings_today() - 90 then
    raise exception 'invalid_payment_date' using errcode = '22023';
  end if;
  select * into i from public.savings_installments where id = p_installment_id for update;
  if not found then raise exception 'installment_not_found' using errcode = 'P0002'; end if;
  select * into e from public.savings_enrollments where id = i.enrollment_id for update;
  if e.status <> 'active' then raise exception 'enrollment_not_active' using errcode = '22023'; end if;
  if i.status = 'pending_verification' then raise exception 'payment_pending_verification' using errcode = '22023'; end if;
  if i.status <> 'pending_payment' then raise exception 'installment_not_payable' using errcode = '22023'; end if;
  perform public.savings_check_amount(e, i, p_amount);
  c := public.savings_conversion(e, p_amount, now());
  v_receipt := public.savings_next_receipt();
  begin
    insert into public.savings_payments (enrollment_id, installment_id, customer_id, amount, channel, method, upi_reference, store_reference,
                                         paid_on, status, submitted_by, verified_by, verified_at, receipt_number,
                                         gold_rate_id, gold_purity, gold_rate_per_g, gold_weight_g, note)
    values (e.id, i.id, e.customer_id, p_amount, 'in_store', p_method, v_ref, v_store, p_paid_on, 'verified',
            auth.uid(), auth.uid(), now(), v_receipt, c.o_rate_id, c.o_purity, c.o_rate, c.o_weight,
            left(nullif(btrim(coalesce(p_note, '')), ''), 300))
    returning id into v_id;
  exception when unique_violation then
    if v_ref is not null and exists (select 1 from public.savings_payments x where x.upi_reference = v_ref and x.status in ('pending_verification', 'verified')) then
      raise exception 'duplicate_reference' using errcode = '23505';
    end if;
    raise exception 'installment_not_payable' using errcode = '23505';
  end;
  update public.savings_installments set status = 'paid' where id = i.id;
  return query select v_id, v_receipt, c.o_weight;
end $$;

-- Admin only: correct a mistaken credit. The record stays, marked VOIDED with a reason.
create or replace function public.admin_void_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.savings_payments%rowtype; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(v_reason) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into p from public.savings_payments where id = p_payment_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p.status <> 'verified' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  if exists (select 1 from public.savings_redemptions r where r.enrollment_id = p.enrollment_id and r.status in ('approved', 'completed')) then
    raise exception 'redemption_in_progress' using errcode = '22023';
  end if;
  update public.savings_payments set status = 'voided', voided_by = auth.uid(), voided_at = now(), void_reason = left(v_reason, 300) where id = p.id;
  update public.savings_installments set status = 'pending_payment' where id = p.installment_id;
end $$;

-- ---------- gold rates ----------
create or replace function public.admin_add_gold_rates(p_rate_22k numeric, p_rate_24k numeric, p_effective_at timestamptz, p_source_note text)
returns setof bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare v_note text := btrim(coalesce(p_source_note, '')); v_id bigint;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_rate_22k is null and p_rate_24k is null then raise exception 'rate_required' using errcode = '22023'; end if;
  if (p_rate_22k is not null and (p_rate_22k < 1000 or p_rate_22k > 100000 or p_rate_22k <> round(p_rate_22k, 2)))
     or (p_rate_24k is not null and (p_rate_24k < 1000 or p_rate_24k > 100000 or p_rate_24k <> round(p_rate_24k, 2))) then
    raise exception 'invalid_rate' using errcode = '22023';
  end if;
  -- 22K gold is less pure than 24K, so its rate must be lower.
  if p_rate_22k is not null and p_rate_24k is not null and p_rate_22k >= p_rate_24k then raise exception 'invalid_rate_order' using errcode = '22023'; end if;
  if p_effective_at is null or p_effective_at > now() + interval '7 days' or p_effective_at < now() - interval '30 days' then
    raise exception 'invalid_effective_date' using errcode = '22023';
  end if;
  if char_length(v_note) < 3 then raise exception 'source_required' using errcode = '22023'; end if;
  if p_rate_22k is not null then
    insert into public.gold_rates (purity, rate_per_gram, effective_at, source_note, created_by)
    values ('22K', p_rate_22k, p_effective_at, left(v_note, 300), auth.uid()) returning id into v_id;
    return next v_id;
  end if;
  if p_rate_24k is not null then
    insert into public.gold_rates (purity, rate_per_gram, effective_at, source_note, created_by)
    values ('24K', p_rate_24k, p_effective_at, left(v_note, 300), auth.uid()) returning id into v_id;
    return next v_id;
  end if;
end $$;

create or replace function public.admin_withdraw_gold_rate(p_rate_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.gold_rates set status = 'withdrawn', withdrawn_by = auth.uid(), withdrawn_at = now(), withdraw_reason = left(btrim(p_reason), 300)
   where id = p_rate_id and status = 'active';
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- Latest active rate per purity that is already in effect (security invoker: RLS applies).
create or replace function public.current_gold_rates()
returns table (id bigint, purity text, rate_per_gram numeric, effective_at timestamptz, source_note text)
language sql stable set search_path = public, pg_temp as $$
  select distinct on (g.purity) g.id, g.purity, g.rate_per_gram, g.effective_at, g.source_note
  from public.gold_rates g
  where g.status = 'active' and g.effective_at <= now()
  order by g.purity, g.effective_at desc, g.id desc
$$;

-- ---------- redemptions ----------
create or replace function public.request_redemption(p_enrollment_id uuid, p_type text, p_preference text default null, p_visit_date date default null)
returns table (redemption_id uuid, request_number text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.savings_enrollments%rowtype; tot record; r public.savings_redemptions%rowtype;
        v_pref text := nullif(btrim(coalesce(p_preference, '')), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into e from public.savings_enrollments where id = p_enrollment_id for update;
  if not found or e.customer_id <> auth.uid() then raise exception 'not_found' using errcode = 'P0002'; end if;
  if e.status <> 'active' then raise exception 'enrollment_not_active' using errcode = '22023'; end if;
  if p_type not in ('jewellery', 'coin') then raise exception 'invalid_type' using errcode = '22023'; end if;
  if v_pref is not null and char_length(v_pref) > 200 then raise exception 'invalid_preference' using errcode = '22023'; end if;
  if p_visit_date is not null and (p_visit_date < public.savings_today() or p_visit_date > public.savings_today() + 90) then
    raise exception 'invalid_visit_date' using errcode = '22023';
  end if;
  select * into tot from public.savings_enrollment_totals t where t.enrollment_id = e.id;
  begin
    insert into public.savings_redemptions (enrollment_id, customer_id, redemption_type, preference, preferred_visit_date,
                                            verified_total_at_request, paid_count_at_request, gold_weight_at_request)
    values (e.id, e.customer_id, p_type, v_pref, p_visit_date, coalesce(tot.verified_total, 0), coalesce(tot.paid_count, 0), tot.gold_weight_g)
    returning * into r;
  exception when unique_violation then
    raise exception 'duplicate_request' using errcode = '23505';
  end;
  return query select r.id, r.request_number;
end $$;

create or replace function public.cancel_my_redemption(p_redemption_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.savings_redemptions set status = 'cancelled', cancelled_at = now()
   where id = p_redemption_id and customer_id = auth.uid() and status = 'pending';
  if not found then raise exception 'cannot_cancel' using errcode = '22023'; end if;
end $$;

create or replace function public.admin_decide_redemption(p_redemption_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.savings_redemptions%rowtype; v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.savings_redemptions where id = p_redemption_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if r.status <> 'pending' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  if not p_approve and char_length(coalesce(v_note, '')) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.savings_redemptions
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = left(v_note, 500)
   where id = r.id;
end $$;

create or replace function public.admin_complete_redemption(p_redemption_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.savings_redemptions%rowtype; v_note text := btrim(coalesce(p_note, ''));
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(v_note) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into r from public.savings_redemptions where id = p_redemption_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if r.status <> 'approved' then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  if exists (select 1 from public.savings_payments p where p.enrollment_id = r.enrollment_id and p.status = 'pending_verification') then
    raise exception 'payment_pending_verification' using errcode = '22023';
  end if;
  update public.savings_redemptions set status = 'completed', completed_by = auth.uid(), completed_at = now(), completion_note = left(v_note, 500) where id = r.id;
  update public.savings_enrollments set status = 'redeemed' where id = r.enrollment_id;
end $$;

-- ---------- execute privileges ----------
revoke all on function public.savings_today(), public.savings_terms_complete(public.savings_schemes),
  public.savings_check_amount(public.savings_enrollments, public.savings_installments, numeric),
  public.savings_conversion(public.savings_enrollments, numeric, timestamptz), public.savings_next_receipt(),
  public.savings_activate(uuid, date)
  from public, anon, authenticated;

revoke all on function
  public.admin_approve_scheme(text, text), public.admin_retire_scheme(text, text),
  public.request_enrollment(text, numeric), public.cancel_my_enrollment_request(uuid),
  public.admin_decide_enrollment(uuid, boolean, date, text), public.admin_create_enrollment(uuid, text, numeric, date, text),
  public.submit_upi_payment(uuid, numeric, text, date), public.admin_verify_upi_payment(uuid, text),
  public.admin_reject_upi_payment(uuid, text), public.record_instore_payment(uuid, numeric, text, date, text, text, text),
  public.admin_void_payment(uuid, text), public.admin_add_gold_rates(numeric, numeric, timestamptz, text),
  public.admin_withdraw_gold_rate(bigint, text), public.current_gold_rates(),
  public.request_redemption(uuid, text, text, date), public.cancel_my_redemption(uuid),
  public.admin_decide_redemption(uuid, boolean, text), public.admin_complete_redemption(uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.admin_approve_scheme(text, text), public.admin_retire_scheme(text, text),
  public.request_enrollment(text, numeric), public.cancel_my_enrollment_request(uuid),
  public.admin_decide_enrollment(uuid, boolean, date, text), public.admin_create_enrollment(uuid, text, numeric, date, text),
  public.submit_upi_payment(uuid, numeric, text, date), public.admin_verify_upi_payment(uuid, text),
  public.admin_reject_upi_payment(uuid, text), public.record_instore_payment(uuid, numeric, text, date, text, text, text),
  public.admin_void_payment(uuid, text), public.admin_add_gold_rates(numeric, numeric, timestamptz, text),
  public.admin_withdraw_gold_rate(bigint, text),
  public.request_redemption(uuid, text, text, date), public.cancel_my_redemption(uuid),
  public.admin_decide_redemption(uuid, boolean, text), public.admin_complete_redemption(uuid, text)
  to authenticated;
grant execute on function public.current_gold_rates() to anon, authenticated;


-- >>>>>>>>>> supabase/seed/01_categories.sql >>>>>>>>>>

-- Jewellery categories (structure only — safe for production).
-- Re-running is safe: existing rows are left unchanged.
insert into public.categories (id, name_en, name_ta, sort_order, is_visible) values
  ('rings',     'Gold Rings',       'தங்க மோதிரங்கள்',   10, true),
  ('chains',    'Gold Chains',      'தங்கச் சங்கிலிகள்',  20, true),
  ('necklaces', 'Necklaces',        'நெக்லஸ்கள்',         30, true),
  ('bangles',   'Bangles',          'வளையல்கள்',          40, true),
  ('earrings',  'Earrings',         'கம்மல்கள்',           50, true),
  ('bridal',    'Bridal Jewellery', 'மணப்பெண் நகைகள்',    60, true),
  ('thali',     'Thali Chains',     'தாலிக் கொடிகள்',     70, true),
  ('coins',     'Gold Coins',       'தங்க நாணயங்கள்',     80, true),
  ('silver',    'Silver Jewellery', 'வெள்ளி நகைகள்',      90, true)
on conflict (id) do nothing;


-- >>>>>>>>>> supabase/seed/02_savings_schemes.sql >>>>>>>>>>

-- =====================================================================
-- The store's two scheme NAMES, created as DRAFT / NOT APPROVED.
-- No financial term is filled in: duration, amounts, payment window,
-- gold conversion and redemption timing stay EMPTY until an admin enters
-- the shop owner's officially approved terms in Admin → Savings schemes
-- and records the approval. Customers cannot enroll until then.
-- Safe to run more than once (existing rows are left untouched).
-- =====================================================================
insert into public.savings_schemes (id, name_en, name_ta, description_en, description_ta, sort_order) values
  ('dhanalakshmi', 'Dhanalakshmi Gold Savings Scheme', 'தனலட்சுமி தங்கச் சேமிப்புத் திட்டம்',
   'Scheme terms are awaiting the shop owner''s official approval.', 'திட்ட விதிமுறைகள் கடை உரிமையாளரின் அதிகாரப்பூர்வ ஒப்புதலுக்காகக் காத்திருக்கின்றன.', 10),
  ('kuber', 'Kuber Lakshmi Gold Savings Scheme', 'குபேர லட்சுமி தங்கச் சேமிப்புத் திட்டம்',
   'Scheme terms are awaiting the shop owner''s official approval.', 'திட்ட விதிமுறைகள் கடை உரிமையாளரின் அதிகாரப்பூர்வ ஒப்புதலுக்காகக் காத்திருக்கின்றன.', 20)
on conflict (id) do nothing;


-- =====================================================================
-- Subbulakshmi Thanga Maligai — FULL DATABASE SETUP (one paste, one Run)
-- Supabase dashboard → SQL Editor → New query → paste ALL of this → Run
-- Contains, in order: 4 migrations + production categories.
-- Safe to run again (non-destructive). Does NOT add demo products.
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


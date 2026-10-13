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

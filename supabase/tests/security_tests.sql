-- =====================================================================
-- Phase 4 · Security test suite (RLS, roles, order functions, storage)
-- Run in the Supabase SQL Editor of a DEVELOPMENT project after the
-- migrations. Everything runs inside one transaction that is ROLLED BACK
-- at the end, so no test users, products or orders remain.
-- Output: one row per test with passed = true/false.
-- =====================================================================
begin;

create schema rls_test;
create table rls_test.results (n serial, name text, passed boolean, detail text);
grant usage on schema rls_test to anon, authenticated;
grant insert, select on rls_test.results to anon, authenticated;
grant usage on sequence rls_test.results_n_seq to anon, authenticated;

create function rls_test.ok(p_name text, p_passed boolean, p_detail text default null) returns void
language sql as $$ insert into rls_test.results (name, passed, detail) values (p_name, coalesce(p_passed, false), p_detail) $$;

-- run SQL as the current role; pass if it raises an error containing p_expect
create function rls_test.expect_error(p_name text, p_sql text, p_expect text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    perform rls_test.ok(p_name, false, 'no error raised');
  exception when others then
    perform rls_test.ok(p_name, p_expect is null or position(p_expect in sqlerrm) > 0, sqlerrm);
  end;
end $$;

-- pass if the query returns exactly p_value as text (errors fail the test)
create function rls_test.expect_value(p_name text, p_sql text, p_value text) returns void
language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql into v;
    perform rls_test.ok(p_name, v is not distinct from p_value, 'got ' || coalesce(v, 'NULL') || ', expected ' || coalesce(p_value, 'NULL'));
  exception when others then
    perform rls_test.ok(p_name, false, 'error: ' || sqlerrm);
  end;
end $$;

-- pass if an UPDATE/DELETE affects p_rows rows (RLS hides rows silently) or is denied when p_rows = 0
create function rls_test.expect_affected(p_name text, p_sql text, p_rows integer) returns void
language plpgsql as $$
declare v integer;
begin
  begin
    execute p_sql;
    get diagnostics v = row_count;
    perform rls_test.ok(p_name, v = p_rows, 'affected ' || v || ' rows');
  exception when insufficient_privilege then
    perform rls_test.ok(p_name, p_rows = 0, 'denied: ' || sqlerrm);
  end;
end $$;

create function rls_test.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function rls_test.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;
grant execute on all functions in schema rls_test to anon, authenticated;

-- ---------------------------------------------------------------- fixtures (as owner)
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'test-a@example.test', '{"full_name":"Customer A","phone":"9876543210","preferred_language":"ta"}'),
  ('a0000000-0000-4000-8000-000000000002', 'test-b@example.test', '{"full_name":"Customer B","phone":"not-a-phone"}'),
  ('a0000000-0000-4000-8000-000000000003', 'test-admin@example.test', '{"full_name":"Store Admin"}'),
  ('a0000000-0000-4000-8000-000000000004', 'test-staff@example.test', '{"full_name":"Store Staff"}');
insert into public.user_roles (user_id, role) values
  ('a0000000-0000-4000-8000-000000000003', 'admin'),
  ('a0000000-0000-4000-8000-000000000004', 'staff');

insert into public.categories (id, name_en, name_ta, sort_order, is_visible) values
  ('t-visible', 'Test Visible', 'சோதனை', 1, true),
  ('t-hidden', 'Test Hidden', 'மறைவு', 2, false)
on conflict (id) do nothing;

insert into public.products (id, sku, category_id, name_en, name_ta, purity, gross_weight_g, net_weight_g, price_mode, fixed_price, stock_status, stock_qty, max_order_qty, is_published) values
  ('b0000000-0000-4000-8000-000000000001', 'T-PUB',    't-visible', 'Published enquiry', 'வெளியீடு', '22K', 5, 5, 'enquiry', null,    'in_stock',      1, 1, true),
  ('b0000000-0000-4000-8000-000000000002', 'T-FIXED',  't-visible', 'Published fixed',   'நிலை விலை', '925', 10, 10, 'fixed', 1000.00, 'in_stock',      2, 3, true),
  ('b0000000-0000-4000-8000-000000000003', 'T-DRAFT',  't-visible', 'Draft',             'வரைவு',    '22K', 3, 3, 'enquiry', null,    'in_stock',      1, 1, false),
  ('b0000000-0000-4000-8000-000000000004', 'T-OOS',    't-visible', 'Out of stock',      'இல்லை',    '22K', 3, 3, 'enquiry', null,    'out_of_stock',  0, 1, true),
  ('b0000000-0000-4000-8000-000000000005', 'T-HIDCAT', 't-hidden',  'Hidden category',   'மறை',      '22K', 3, 3, 'enquiry', null,    'in_stock',      1, 1, true),
  ('b0000000-0000-4000-8000-000000000006', 'T-MTO',    't-visible', 'Made to order',     'ஆர்டர்',   '22K', 9, 9, 'enquiry', null,    'made_to_order', 0, 2, true);

-- Customer B places an order and saves a wishlist item (as B, through the real function)
select rls_test.act_as('a0000000-0000-4000-8000-000000000002');
select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000001","quantity":1}]',
  'c0000000-0000-4000-8000-0000000000b1', 'Customer B', '9123456780', null);
insert into public.wishlists (user_id, product_id) values ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001');
reset role;
create temp table t_b_order as select id from public.orders where contact_name = 'Customer B';
grant select on t_b_order to anon, authenticated;

-- ---------------------------------------------------------------- visitor (anon)
select rls_test.act_as_anon();
select rls_test.expect_value('anon: sees only published products in visible categories',
  $q$select string_agg(sku, ',' order by sku) from public.products where sku like 'T-%'$q$, 'T-FIXED,T-MTO,T-OOS,T-PUB');
select rls_test.expect_value('anon: hidden category not listed',
  $q$select count(*)::text from public.categories where id = 't-hidden'$q$, '0');
select rls_test.expect_error('anon: cannot read profiles', $q$select count(*) from public.profiles$q$, 'permission denied');
select rls_test.expect_error('anon: cannot read orders', $q$select count(*) from public.orders$q$, 'permission denied');
select rls_test.expect_error('anon: cannot read wishlists', $q$select count(*) from public.wishlists$q$, 'permission denied');
select rls_test.expect_error('anon: cannot insert a product',
  $q$insert into public.products (sku, category_id, name_en, name_ta, purity) values ('T-HACK','t-visible','Hack','ஹேக்','22K')$q$, 'permission denied');
select rls_test.expect_error('anon: cannot create an order',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000001","quantity":1}]', gen_random_uuid(), 'X Y', '9876543210')$q$, 'permission denied');
select rls_test.expect_error('anon: cannot upload a product image',
  $q$insert into storage.objects (bucket_id, name) values ('product-images', 'products/b0000000-0000-4000-8000-000000000001/x.jpg')$q$);
reset role;

-- ---------------------------------------------------------------- customer A
select rls_test.act_as('a0000000-0000-4000-8000-000000000001');
select rls_test.expect_value('A: profile auto-created from sign-up data',
  $q$select full_name || '|' || phone || '|' || preferred_language from public.profiles where id = auth.uid()$q$, 'Customer A|9876543210|ta');
select rls_test.expect_value('A: sees only own profile', $q$select count(*)::text from public.profiles$q$, '1');
select rls_test.expect_affected('A: can update own name', $q$update public.profiles set full_name = 'Customer A2' where id = auth.uid()$q$, 1);
select rls_test.expect_affected('A: cannot update B''s profile', $q$update public.profiles set full_name = 'Hacked' where id = 'a0000000-0000-4000-8000-000000000002'$q$, 0);
select rls_test.expect_error('A: cannot change protected profile column (created_at)', $q$update public.profiles set created_at = now() - interval '9 years' where id = auth.uid()$q$, 'permission denied');
select rls_test.expect_value('A: is_admin() is false', $q$select public.is_admin()::text$q$, 'false');
select rls_test.expect_error('A: cannot make self admin (insert user_roles)',
  $q$insert into public.user_roles (user_id, role) values (auth.uid(), 'admin')$q$, 'permission denied');
select rls_test.expect_error('A: cannot change roles (update user_roles)',
  $q$update public.user_roles set user_id = auth.uid() where role = 'admin'$q$, 'permission denied');
select rls_test.expect_value('A: cannot see other users'' roles', $q$select count(*)::text from public.user_roles$q$, '0');
select rls_test.expect_value('A: cannot see draft products', $q$select count(*)::text from public.products where sku = 'T-DRAFT'$q$, '0');
select rls_test.expect_affected('A: cannot change a product price', $q$update public.products set fixed_price = 1 where sku = 'T-FIXED'$q$, 0);
select rls_test.expect_error('A: cannot insert a product',
  $q$insert into public.products (sku, category_id, name_en, name_ta, purity) values ('T-HACK','t-visible','Hack','ஹேக்','22K')$q$, 'row-level security');
select rls_test.expect_affected('A: wishlist add (published product)',
  $q$insert into public.wishlists (user_id, product_id) values (auth.uid(), 'b0000000-0000-4000-8000-000000000002')$q$, 1);
select rls_test.expect_error('A: wishlist add of a draft product is refused',
  $q$insert into public.wishlists (user_id, product_id) values (auth.uid(), 'b0000000-0000-4000-8000-000000000003')$q$, 'row-level security');
select rls_test.expect_error('A: cannot add to B''s wishlist',
  $q$insert into public.wishlists (user_id, product_id) values ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002')$q$, 'row-level security');
select rls_test.expect_value('A: sees only own wishlist', $q$select count(*)::text from public.wishlists$q$, '1');
select rls_test.expect_affected('A: cannot delete B''s wishlist rows', $q$delete from public.wishlists where user_id = 'a0000000-0000-4000-8000-000000000002'$q$, 0);

-- order creation: browser-sent price/total/status fields are ignored
select rls_test.expect_value('A: order total computed by the database (fake price ignored)',
  $q$select priced_total::text from public.create_order_request(
       '[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":2,"unit_price":1,"price":1}, {"product_id":"b0000000-0000-4000-8000-000000000006","quantity":1}]',
       'c0000000-0000-4000-8000-0000000000a1', 'Customer A', '98765 43210', 'Please call')$q$, '2000.00');
select rls_test.expect_value('A: same submission again returns the same order (duplicate)',
  $q$select is_duplicate::text from public.create_order_request(
       '[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":2}]', 'c0000000-0000-4000-8000-0000000000a1', 'Customer A', '9876543210')$q$, 'true');
select rls_test.expect_value('A: only one order exists after the duplicate', $q$select count(*)::text from public.orders$q$, '1');
select rls_test.expect_value('A: order flags the enquiry-priced line', $q$select has_unpriced_items::text || '|' || status || '|' || payment_status from public.orders$q$, 'true|requested|unpaid');
select rls_test.expect_value('A: item price snapshot and line total',
  $q$select unit_price::text || '|' || quantity || '|' || line_total::text from public.order_items where product_sku = 'T-FIXED'$q$, '1000.00|2|2000.00');
select rls_test.expect_error('A: invalid product ID refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-0000000000ff","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'product_unavailable');
select rls_test.expect_error('A: malformed product ID refused',
  $q$select * from public.create_order_request('[{"product_id":"not-a-uuid","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'invalid_items');
select rls_test.expect_error('A: unpublished product refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000003","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'product_unavailable');
select rls_test.expect_error('A: product in hidden category refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000005","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'product_unavailable');
select rls_test.expect_error('A: out-of-stock product refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000004","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'product_out_of_stock');
select rls_test.expect_error('A: quantity above the product limit refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000001","quantity":2}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'quantity_exceeds_limit');
select rls_test.expect_error('A: quantity above stock refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":3}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'insufficient_stock');
select rls_test.expect_error('A: zero/negative quantity refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":-1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'invalid_quantity');
select rls_test.expect_error('A: same product twice in one request refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":1},{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":1}]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'duplicate_item');
select rls_test.expect_error('A: empty order refused',
  $q$select * from public.create_order_request('[]', gen_random_uuid(), 'Customer A', '9876543210')$q$, 'invalid_item_count');
select rls_test.expect_error('A: invalid phone refused',
  $q$select * from public.create_order_request('[{"product_id":"b0000000-0000-4000-8000-000000000002","quantity":1}]', gen_random_uuid(), 'Customer A', '12345')$q$, 'invalid_contact_phone');
select rls_test.expect_error('A: cannot insert an order directly',
  $q$insert into public.orders (customer_id, contact_name, contact_phone, items_count, idempotency_key) values (auth.uid(), 'Xx', '9876543210', 1, gen_random_uuid())$q$, 'permission denied');
select rls_test.expect_error('A: cannot insert order items directly',
  $q$insert into public.order_items (order_id, product_sku, name_en, name_ta, purity, price_mode, quantity) select id, 'X', 'X', 'X', '22K', 'enquiry', 1 from public.orders limit 1$q$, 'permission denied');
select rls_test.expect_error('A: cannot change own order status directly',
  $q$update public.orders set status = 'completed'$q$, 'permission denied');
select rls_test.expect_error('A: cannot mark an order as paid',
  $q$update public.orders set payment_status = 'paid'$q$, 'permission denied');
select rls_test.expect_error('A: cannot use the staff status function',
  $q$select public.admin_update_order_status((select id from public.orders limit 1), 'confirmed')$q$, 'not_authorized');
select rls_test.expect_value('A: cannot see B''s order', $q$select count(*)::text from public.orders where contact_name = 'Customer B'$q$, '0');
select rls_test.expect_value('A: cannot see B''s order items', $q$select count(*)::text from public.order_items where product_sku = 'T-PUB'$q$, '0');
select rls_test.expect_error('A: cannot cancel B''s order',
  $q$select public.cancel_my_order((select id from t_b_order))$q$, 'order_not_found');
select rls_test.expect_value('A: can cancel own requested order',
  $q$select public.cancel_my_order((select id from public.orders limit 1), 'changed my mind')$q$, 'cancelled');
select rls_test.expect_error('A: cannot cancel twice', $q$select public.cancel_my_order((select id from public.orders limit 1))$q$, 'order_not_cancellable');
select rls_test.expect_value('A: order history visible to owner', $q$select string_agg(to_status, '>' order by id) from public.order_events$q$, 'requested>cancelled');
select rls_test.expect_value('A: cannot read the audit log', $q$select count(*)::text from public.audit_logs$q$, '0');
select rls_test.expect_error('A: cannot upload a product image',
  $q$insert into storage.objects (bucket_id, name) values ('product-images', 'products/b0000000-0000-4000-8000-000000000001/x.jpg')$q$, 'row-level security');
reset role;

-- ---------------------------------------------------------------- staff
select rls_test.act_as('a0000000-0000-4000-8000-000000000004');
select rls_test.expect_value('staff: sees all orders', $q$select count(*)::text from public.orders$q$, '2');
select rls_test.expect_value('staff: can confirm a requested order',
  $q$select public.admin_update_order_status((select id from t_b_order), 'confirmed', 'Checked stock')$q$, 'confirmed');
select rls_test.expect_error('staff: invalid status jump refused (confirmed -> requested)',
  $q$select public.admin_update_order_status((select id from t_b_order), 'requested')$q$, 'invalid_status_transition');
select rls_test.expect_error('staff: cannot set an unknown status',
  $q$select public.admin_update_order_status((select id from t_b_order), 'paid')$q$, 'invalid_status_transition');
select rls_test.expect_affected('staff: cannot edit the catalogue', $q$update public.products set name_en = 'Staff edit' where sku = 'T-PUB'$q$, 0);
select rls_test.expect_value('staff: is_admin() is false', $q$select public.is_admin()::text$q$, 'false');
reset role;

-- ---------------------------------------------------------------- admin
select rls_test.act_as('a0000000-0000-4000-8000-000000000003');
select rls_test.expect_value('admin: sees drafts and hidden-category products', $q$select count(*)::text from public.products where sku like 'T-%'$q$, '6');
select rls_test.expect_affected('admin: can create a product',
  $q$insert into public.products (sku, category_id, name_en, name_ta, purity, gross_weight_g, net_weight_g) values ('T-NEW','t-visible','New ring','புதிய மோதிரம்','22K', 4.25, 4.1)$q$, 1);
select rls_test.expect_affected('admin: can publish a product', $q$update public.products set is_published = true where sku = 'T-DRAFT'$q$, 1);
select rls_test.expect_error('admin: data validation — net weight above gross refused',
  $q$update public.products set net_weight_g = 99 where sku = 'T-PUB'$q$, 'products_net_not_above_gross');
select rls_test.expect_error('admin: data validation — fixed price required for fixed mode',
  $q$update public.products set price_mode = 'fixed' where sku = 'T-PUB'$q$, 'products_fixed_price_required');
select rls_test.expect_value('admin: changes recorded in the audit log with the admin as actor',
  $q$select count(*)::text from public.audit_logs where table_name = 'products' and actor_id = auth.uid()$q$, '2');
select rls_test.expect_affected('admin: can upload a product image to products/<id>/',
  $q$insert into storage.objects (bucket_id, name) values ('product-images', 'products/b0000000-0000-4000-8000-000000000001/front.webp')$q$, 1);
select rls_test.expect_error('admin: upload outside products/ refused',
  $q$insert into storage.objects (bucket_id, name) values ('product-images', 'other/x.jpg')$q$, 'row-level security');
select rls_test.expect_error('admin: non-image file extension refused',
  $q$insert into storage.objects (bucket_id, name) values ('product-images', 'products/b0000000-0000-4000-8000-000000000001/run.html')$q$, 'row-level security');
select rls_test.expect_error('admin: still cannot grant roles through the API',
  $q$insert into public.user_roles (user_id, role) values ('a0000000-0000-4000-8000-000000000001', 'admin')$q$, 'permission denied');
select rls_test.expect_value('admin: can complete the order lifecycle',
  $q$select public.admin_update_order_status((select id from t_b_order), 'ready') || '>' || public.admin_update_order_status((select id from t_b_order), 'completed')$q$, 'ready>completed');
reset role;

-- ---------------------------------------------------------------- results
select n, passed, name, detail from rls_test.results order by n;
select count(*) filter (where passed) as passed, count(*) filter (where not passed) as failed from rls_test.results;

rollback;

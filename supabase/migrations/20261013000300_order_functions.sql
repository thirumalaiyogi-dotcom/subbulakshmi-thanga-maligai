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

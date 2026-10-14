-- =====================================================================
-- Subbulakshmi Thanga Maligai — PHASE 5 update, PART 2 of 3
-- Run parts 1, 2, 3 in order (SQL Editor → New query → paste ALL → Run).
-- Safe to run again. Functions: helpers, schemes, enrollments.
-- =====================================================================

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


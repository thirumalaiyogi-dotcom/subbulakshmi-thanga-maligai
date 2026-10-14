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

-- =====================================================================
-- Phase 5 · Migration 7 — options needed for the store's published terms
--
-- 1. Gold conversion "payment_date_rate": each verified payment is
--    converted at the store's rate entered FOR THE DATE THE CUSTOMER PAID
--    (the last rate entered that day, or the latest so far for today).
--    If the store entered no rate for that date, verification is refused
--    ('gold_rate_missing_for_date') — no older or newer rate is guessed.
-- 2. Fixed-amount schemes may allow ANY amount within min–max chosen at
--    enrollment (instead of a fixed list). The amount then stays the same
--    for every installment, as before.
-- Non-destructive; safe to run more than once. Existing data unchanged.
-- =====================================================================

alter table public.savings_schemes drop constraint if exists savings_schemes_gold_conversion_check;
alter table public.savings_schemes add constraint savings_schemes_gold_conversion_check
  check (gold_conversion in ('none', 'verification_date_rate', 'payment_date_rate'));
alter table public.savings_enrollments drop constraint if exists savings_enrollments_gold_conversion_check;
alter table public.savings_enrollments add constraint savings_enrollments_gold_conversion_check
  check (gold_conversion in ('none', 'verification_date_rate', 'payment_date_rate'));

-- A fixed scheme is complete with EITHER a list of amounts OR a minimum.
create or replace function public.savings_terms_complete(s public.savings_schemes)
returns boolean language sql immutable as $$
  select s.contribution_type is not null
     and s.duration_months is not null
     and (s.contribution_type <> 'fixed' or coalesce(cardinality(s.allowed_fixed_amounts), 0) > 0 or s.min_installment is not null)
     and (s.contribution_type <> 'flexible' or s.min_installment is not null)
     and char_length(btrim(coalesce(s.terms_en, ''))) >= 20
     and char_length(btrim(coalesce(s.terms_ta, ''))) >= 20
$$;

-- Is this fixed monthly amount allowed by the scheme? (list, or min–max range)
create or replace function public.savings_fixed_amount_ok(s public.savings_schemes, p_amount numeric)
returns boolean language sql immutable as $$
  select coalesce(
    p_amount is not null and p_amount > 0 and p_amount = round(p_amount, 2)
    and case when coalesce(cardinality(s.allowed_fixed_amounts), 0) > 0 then p_amount = any (s.allowed_fixed_amounts)
             else s.min_installment is not null and p_amount >= s.min_installment
                  and (s.max_installment is null or p_amount <= s.max_installment) end,
    false)
$$;

create or replace function public.savings_conversion_v2(e public.savings_enrollments, p_amount numeric, p_at timestamptz, p_paid_on date,
                                                        out o_rate_id bigint, out o_purity text, out o_rate numeric, out o_weight numeric)
language plpgsql as $$
declare r public.gold_rates%rowtype; v_start timestamptz; v_end timestamptz;
begin
  if e.gold_conversion = 'none' then return; end if;
  if e.gold_conversion = 'payment_date_rate' then
    v_start := p_paid_on::timestamp at time zone 'Asia/Kolkata';
    v_end   := least((p_paid_on + 1)::timestamp at time zone 'Asia/Kolkata', p_at);
    select * into r from public.gold_rates g
     where g.purity = e.conversion_purity and g.status = 'active' and g.effective_at >= v_start and g.effective_at < v_end
     order by g.effective_at desc, g.id desc limit 1;
    if not found then raise exception 'gold_rate_missing_for_date' using errcode = '22023'; end if;
  else
    select * into r from public.gold_rates g
     where g.purity = e.conversion_purity and g.status = 'active' and g.effective_at <= p_at
     order by g.effective_at desc, g.id desc limit 1;
    if not found then raise exception 'gold_rate_missing' using errcode = '22023'; end if;
  end if;
  o_rate_id := r.id; o_purity := r.purity; o_rate := r.rate_per_gram;
  o_weight := round(p_amount / r.rate_per_gram, 3);
end $$;

-- Updated callers (identical to migration 6 except the lines noted above)
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
    if not public.savings_fixed_amount_ok(s, p_fixed_amount) then raise exception 'invalid_amount' using errcode = '22023'; end if;
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
    if not public.savings_fixed_amount_ok(s, p_fixed_amount) then raise exception 'invalid_amount' using errcode = '22023'; end if;
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
  c := public.savings_conversion_v2(e, p.amount, now(), p.paid_on);
  v_receipt := public.savings_next_receipt();
  update public.savings_payments
     set status = 'verified', verified_by = auth.uid(), verified_at = now(), receipt_number = v_receipt,
         gold_rate_id = c.o_rate_id, gold_purity = c.o_purity, gold_rate_per_g = c.o_rate, gold_weight_g = c.o_weight,
         note = coalesce(left(nullif(btrim(coalesce(p_note, '')), ''), 300), note)
   where id = p.id;
  update public.savings_installments set status = 'paid' where id = p.installment_id;
  return query select v_receipt, c.o_weight;
end $$;

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
  c := public.savings_conversion_v2(e, p_amount, now(), p_paid_on);
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

revoke all on function public.savings_fixed_amount_ok(public.savings_schemes, numeric),
  public.savings_conversion_v2(public.savings_enrollments, numeric, timestamptz, date)
  from public, anon, authenticated;
revoke all on function public.request_enrollment(text, numeric), public.admin_create_enrollment(uuid, text, numeric, date, text),
  public.admin_verify_upi_payment(uuid, text), public.record_instore_payment(uuid, numeric, text, date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.request_enrollment(text, numeric), public.admin_create_enrollment(uuid, text, numeric, date, text),
  public.admin_verify_upi_payment(uuid, text), public.record_instore_payment(uuid, numeric, text, date, text, text, text)
  to authenticated;

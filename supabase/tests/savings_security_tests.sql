-- =====================================================================
-- Phase 5 · Savings security & integrity test suite
-- Run on a DEVELOPMENT project after migrations 1–6 and seeds 01–02
-- (psql -f). Everything runs in one transaction that is ROLLED BACK.
-- Output: one row per test (passed = true/false) and a summary line.
-- Uses its own test users and test schemes (t-fixed, t-flex, t-draft).
-- =====================================================================
begin;

create schema sv_test;
create table sv_test.results (n serial, name text, passed boolean, detail text);
grant usage on schema sv_test to anon, authenticated;
grant insert, select on sv_test.results to anon, authenticated;
grant usage on sequence sv_test.results_n_seq to anon, authenticated;
create table sv_test.ids (k text primary key, v uuid);
grant select, insert, update on sv_test.ids to anon, authenticated;

create function sv_test.ok(p_name text, p_passed boolean, p_detail text default null) returns void
language sql as $$ insert into sv_test.results (name, passed, detail) values (p_name, coalesce(p_passed, false), p_detail) $$;
create function sv_test.expect_error(p_name text, p_sql text, p_expect text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    perform sv_test.ok(p_name, false, 'no error raised');
  exception when others then
    perform sv_test.ok(p_name, p_expect is null or position(p_expect in sqlerrm) > 0, sqlerrm);
  end;
end $$;
create function sv_test.expect_value(p_name text, p_sql text, p_value text) returns void
language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql into v;
    perform sv_test.ok(p_name, v is not distinct from p_value, 'got ' || coalesce(v, 'NULL') || ', expected ' || coalesce(p_value, 'NULL'));
  exception when others then
    perform sv_test.ok(p_name, false, 'error: ' || sqlerrm);
  end;
end $$;
create function sv_test.expect_affected(p_name text, p_sql text, p_rows integer) returns void
language plpgsql as $$
declare v integer;
begin
  begin
    execute p_sql;
    get diagnostics v = row_count;
    perform sv_test.ok(p_name, v = p_rows, 'affected ' || v || ' rows');
  exception when insufficient_privilege then
    perform sv_test.ok(p_name, p_rows = 0, 'denied: ' || sqlerrm);
  end;
end $$;
create function sv_test.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function sv_test.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;
create function sv_test.id(p_k text) returns uuid language sql stable as $$ select v from sv_test.ids where k = p_k $$;
create function sv_test.month0() returns date language sql stable as $$ select date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date $$;
grant execute on all functions in schema sv_test to anon, authenticated;

-- ---------------------------------------------------------------- fixtures (as owner)
insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-8000-000000000001', 'sv-c@example.test', '{"full_name":"Saver C","phone":"9876500001"}'),
  ('d0000000-0000-4000-8000-000000000002', 'sv-d@example.test', '{"full_name":"Saver D","phone":"9876500002"}'),
  ('d0000000-0000-4000-8000-000000000003', 'sv-admin@example.test', '{"full_name":"Savings Admin"}'),
  ('d0000000-0000-4000-8000-000000000004', 'sv-staff@example.test', '{"full_name":"Counter Staff"}'),
  ('d0000000-0000-4000-8000-000000000005', 'sv-e@example.test', '{"full_name":"No Phone"}');
insert into public.user_roles (user_id, role) values
  ('d0000000-0000-4000-8000-000000000003', 'admin'),
  ('d0000000-0000-4000-8000-000000000004', 'staff');

-- ---------------------------------------------------------------- seeded schemes are NOT approved
select sv_test.act_as_anon();
select sv_test.expect_value('seed: both store schemes exist as DRAFT with no financial terms',
  $q$select string_agg(id || ':' || approval_status || ':' || coalesce(duration_months::text, '-') || ':' || coalesce(contribution_type, '-') || ':' || enrollment_open::text, ',' order by id)
     from public.savings_schemes where id in ('dhanalakshmi', 'kuber')$q$,
  'dhanalakshmi:draft:-:-:false,kuber:draft:-:-:false');
select sv_test.expect_error('anon: cannot read enrollments', $q$select count(*) from public.savings_enrollments$q$, 'permission denied');
select sv_test.expect_error('anon: cannot read payments', $q$select count(*) from public.savings_payments$q$, 'permission denied');
select sv_test.expect_error('anon: cannot read installments', $q$select count(*) from public.savings_installments$q$, 'permission denied');
select sv_test.expect_error('anon: cannot read redemptions', $q$select count(*) from public.savings_redemptions$q$, 'permission denied');
select sv_test.expect_error('anon: cannot submit a UPI payment',
  $q$select * from public.submit_upi_payment(gen_random_uuid(), 1000, 'UTR999999999', current_date)$q$, 'permission denied');
select sv_test.expect_error('anon: cannot insert a gold rate',
  $q$insert into public.gold_rates (purity, rate_per_gram, effective_at, source_note, created_by) values ('22K', 9999, now(), 'hack', gen_random_uuid())$q$, 'permission denied');
reset role;

-- ---------------------------------------------------------------- customer cannot configure schemes or rates
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_error('customer: cannot create a scheme',
  $q$insert into public.savings_schemes (id, name_en, name_ta) values ('hack', 'Hack scheme', 'ஹேக் திட்டம்')$q$, 'row-level security');
select sv_test.expect_affected('customer: cannot change scheme terms',
  $q$update public.savings_schemes set duration_months = 1 where id = 'kuber'$q$, 0);
select sv_test.expect_error('customer: cannot set approval status directly',
  $q$update public.savings_schemes set approval_status = 'approved' where id = 'kuber'$q$, 'permission denied');
select sv_test.expect_error('customer: cannot approve a scheme', $q$select public.admin_approve_scheme('kuber', 'I approve this myself')$q$, 'forbidden');
select sv_test.expect_error('customer: cannot add a gold rate',
  $q$select public.admin_add_gold_rates(9000, 9800, now(), 'customer rate')$q$, 'forbidden');
select sv_test.expect_error('customer: cannot enroll in an unapproved (DRAFT) scheme',
  $q$select * from public.request_enrollment('kuber', 1000)$q$, 'scheme_not_open');
reset role;

-- ---------------------------------------------------------------- admin configures + approves test schemes
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_error('admin: cannot insert a scheme already marked approved',
  $q$insert into public.savings_schemes (id, name_en, name_ta, approval_status) values ('t-x', 'Test X', 'சோதனை X', 'approved')$q$, 'permission denied');
insert into public.savings_schemes (id, name_en, name_ta, contribution_type, duration_months, allowed_fixed_amounts, gold_conversion, conversion_purity, terms_en, terms_ta)
values ('t-fixed', 'Test Fixed', 'சோதனை நிலை', 'fixed', 3, '{1000,2000}', 'verification_date_rate', '22K',
        'TEST TERMS ONLY — fixed amount, three installments.', 'சோதனை விதிமுறைகள் மட்டும் — நிலைத் தொகை, மூன்று தவணைகள்.');
insert into public.savings_schemes (id, name_en, name_ta, contribution_type, duration_months, min_installment, max_installment, terms_en, terms_ta)
values ('t-flex', 'Test Flexible', 'சோதனை நெகிழ்', 'flexible', 2, 500, 5000,
        'TEST TERMS ONLY — flexible amount, two installments.', 'சோதனை விதிமுறைகள் மட்டும் — நெகிழ்வான தொகை, இரண்டு தவணைகள்.');
insert into public.savings_schemes (id, name_en, name_ta) values ('t-draft', 'Test Draft', 'சோதனை வரைவு');
select sv_test.expect_error('admin: incomplete terms cannot be approved', $q$select public.admin_approve_scheme('t-draft', 'Owner approved in writing')$q$, 'scheme_terms_incomplete');
select sv_test.expect_error('admin: approval needs a recorded note', $q$select public.admin_approve_scheme('t-fixed', 'ok')$q$, 'approval_note_required');
select sv_test.expect_error('admin: cannot open enrollment on an unapproved scheme',
  $q$update public.savings_schemes set enrollment_open = true where id = 't-fixed'$q$, 'savings_schemes_open_needs_approval');
select public.admin_approve_scheme('t-fixed', 'TEST: owner approval recorded');
select public.admin_approve_scheme('t-flex', 'TEST: owner approval recorded');
update public.savings_schemes set enrollment_open = true where id in ('t-fixed', 't-flex');
select sv_test.expect_value('admin: scheme approved with approver identity',
  $q$select approval_status || ':' || (approved_by = auth.uid())::text from public.savings_schemes where id = 't-fixed'$q$, 'approved:true');
-- gold rates
select sv_test.expect_error('rate: 22K must be lower than 24K', $q$select public.admin_add_gold_rates(9900, 9800, now(), 'Board rate')$q$, 'invalid_rate_order');
select sv_test.expect_error('rate: implausible value refused', $q$select public.admin_add_gold_rates(500, null, now(), 'Board rate')$q$, 'invalid_rate');
select sv_test.expect_error('rate: effective date far in the future refused', $q$select public.admin_add_gold_rates(9000, null, now() + interval '40 days', 'Board rate')$q$, 'invalid_effective_date');
select sv_test.expect_error('rate: source / note is required', $q$select public.admin_add_gold_rates(9000, null, now(), '')$q$, 'source_required');
select sv_test.expect_error('rate: at least one rate is required', $q$select public.admin_add_gold_rates(null, null, now(), 'Board rate')$q$, 'rate_required');
select public.admin_add_gold_rates(9000, 9800, now() - interval '1 hour', 'TEST board rate');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000004');
select sv_test.expect_error('staff: cannot add a gold rate (admin only)', $q$select public.admin_add_gold_rates(9000, 9800, now(), 'staff rate')$q$, 'forbidden');
select sv_test.expect_error('staff: cannot approve a scheme', $q$select public.admin_approve_scheme('t-draft', 'staff approval attempt')$q$, 'forbidden');
reset role;

select sv_test.act_as_anon();
select sv_test.expect_value('rate: customers see the current approved rates',
  $q$select string_agg(purity || '=' || rate_per_gram::text, ',' order by purity) from public.current_gold_rates()$q$, '22K=9000.00,24K=9800.00');
reset role;

-- ---------------------------------------------------------------- enrollment requests
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_error('enroll: amount not in the approved list refused', $q$select * from public.request_enrollment('t-fixed', 1500)$q$, 'invalid_amount');
insert into sv_test.ids select 'c_fixed', enrollment_id from public.request_enrollment('t-fixed', 1000);
select sv_test.expect_value('enroll: request starts as pending approval',
  $q$select status from public.savings_enrollments where id = sv_test.id('c_fixed')$q$, 'pending_approval');
select sv_test.expect_error('enroll: duplicate pending request refused', $q$select * from public.request_enrollment('t-fixed', 2000)$q$, 'duplicate_request');
select sv_test.expect_error('enroll: flexible scheme takes no fixed amount', $q$select * from public.request_enrollment('t-flex', 1000)$q$, 'invalid_amount');
insert into sv_test.ids select 'c_flex', enrollment_id from public.request_enrollment('t-flex', null);
select sv_test.expect_error('enroll: customer cannot approve own request',
  $q$select public.admin_decide_enrollment(sv_test.id('c_fixed'), true, sv_test.month0(), null)$q$, 'forbidden');
select sv_test.expect_error('enroll: customer cannot change enrollment status directly',
  $q$update public.savings_enrollments set status = 'active' where id = sv_test.id('c_fixed')$q$, 'permission denied');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000005');
select sv_test.expect_error('enroll: profile without phone refused', $q$select * from public.request_enrollment('t-flex', null)$q$, 'profile_incomplete');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000002');
select sv_test.expect_value('isolation: D cannot see C''s enrollments', $q$select count(*)::text from public.savings_enrollments where customer_id = 'd0000000-0000-4000-8000-000000000001'$q$, '0');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000004');
select sv_test.expect_error('staff: cannot approve enrollments (admin only)',
  $q$select public.admin_decide_enrollment(sv_test.id('c_fixed'), true, sv_test.month0(), null)$q$, 'forbidden');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
-- changing the TERMS of an approved scheme sends it back to draft
update public.savings_schemes set max_installment = 6000 where id = 't-flex';
select sv_test.expect_value('terms: editing an approved scheme returns it to DRAFT and closes enrollment',
  $q$select approval_status || ':' || enrollment_open::text from public.savings_schemes where id = 't-flex'$q$, 'draft:false');
select public.admin_approve_scheme('t-flex', 'TEST: re-approved after change');
update public.savings_schemes set enrollment_open = true where id = 't-flex';
select sv_test.expect_error('terms: request made under old terms cannot be approved',
  $q$select public.admin_decide_enrollment(sv_test.id('c_flex'), true, sv_test.month0(), null)$q$, 'scheme_terms_changed');
select sv_test.expect_error('enroll: rejection needs a reason', $q$select public.admin_decide_enrollment(sv_test.id('c_flex'), false, null, 'no')$q$, 'reason_required');
select public.admin_decide_enrollment(sv_test.id('c_flex'), false, null, 'Terms changed, please request again');
select sv_test.expect_error('enroll: start month must be the 1st of a month',
  $q$select public.admin_decide_enrollment(sv_test.id('c_fixed'), true, sv_test.month0() + 3, null)$q$, 'invalid_start_month');
select public.admin_decide_enrollment(sv_test.id('c_fixed'), true, sv_test.month0(), 'TEST approved');
select sv_test.expect_value('enroll: approval creates the installment schedule from the snapshot',
  $q$select count(*)::text || ':' || min(expected_amount)::text || ':' || string_agg(status, ',' order by installment_no)
     from public.savings_installments where enrollment_id = sv_test.id('c_fixed')$q$, '3:1000.00:pending_payment,pending_payment,pending_payment');
insert into sv_test.ids select 'd_flex', enrollment_id from public.admin_create_enrollment('d0000000-0000-4000-8000-000000000002', 't-flex', null, sv_test.month0(), 'In-store enrollment');
insert into sv_test.ids select 'c_i' || installment_no, id from public.savings_installments where enrollment_id = sv_test.id('c_fixed');
insert into sv_test.ids select 'd_i' || installment_no, id from public.savings_installments where enrollment_id = sv_test.id('d_flex');
reset role;

-- ---------------------------------------------------------------- UPI submissions (customer)
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_value('isolation: C sees own 3 installments only',
  $q$select count(*)::text from public.savings_installments$q$, '3');
select sv_test.expect_error('upi: wrong amount for a fixed scheme refused',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i1'), 1500, 'UTR111111111', current_date)$q$, 'amount_mismatch');
select sv_test.expect_error('upi: malformed reference refused',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i1'), 1000, 'ab', current_date)$q$, 'invalid_reference');
select sv_test.expect_error('upi: future payment date refused',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i1'), 1000, 'UTR111111111', current_date + 5)$q$, 'invalid_payment_date');
select sv_test.expect_value('upi: submission is PENDING VERIFICATION, not paid',
  $q$select status from public.submit_upi_payment(sv_test.id('c_i1'), 1000, 'utr 1111-1111-1111', current_date)$q$, 'pending_verification');
select sv_test.expect_value('upi: installment shows pending verification; nothing credited',
  $q$select i.status || ':' || t.verified_total::text || ':' || t.pending_total::text
     from public.savings_installments i join public.savings_enrollment_totals t on t.enrollment_id = i.enrollment_id
     where i.id = sv_test.id('c_i1')$q$, 'pending_verification:0.00:1000.00');
select sv_test.expect_error('upi: second payment for the same installment refused',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i1'), 1000, 'UTR999988887', current_date)$q$, 'installment_not_payable');
select sv_test.expect_error('upi: duplicate UPI reference refused (normalised)',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i2'), 1000, 'UTR111111111111', current_date)$q$, 'duplicate_reference');
select sv_test.expect_error('upi: customer cannot mark own payment verified (no update right)',
  $q$update public.savings_payments set status = 'verified' where customer_id = auth.uid()$q$, 'permission denied');
select sv_test.expect_error('upi: customer cannot insert a payment directly',
  $q$insert into public.savings_payments (enrollment_id, installment_id, customer_id, amount, channel, method, paid_on, status, submitted_by)
     values (sv_test.id('c_fixed'), sv_test.id('c_i2'), auth.uid(), 1000, 'in_store', 'cash', current_date, 'verified', auth.uid())$q$, 'permission denied');
select sv_test.expect_error('upi: customer cannot verify own payment',
  $q$select * from public.admin_verify_upi_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1')))$q$, 'forbidden');
select sv_test.expect_error('upi: customer cannot delete a payment',
  $q$delete from public.savings_payments where customer_id = auth.uid()$q$, 'permission denied');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000002');
select sv_test.expect_value('isolation: D cannot see C''s payments', $q$select count(*)::text from public.savings_payments where customer_id = 'd0000000-0000-4000-8000-000000000001'$q$, '0');
select sv_test.expect_error('isolation: D cannot pay into C''s installment',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i2'), 1000, 'UTR555555555', current_date)$q$, 'installment_not_found');
select sv_test.expect_error('upi: flexible amount below minimum refused',
  $q$select * from public.submit_upi_payment(sv_test.id('d_i1'), 400, 'UTR444444444', current_date)$q$, 'amount_out_of_range');
select sv_test.expect_error('upi: flexible amount above maximum refused',
  $q$select * from public.submit_upi_payment(sv_test.id('d_i1'), 6000.01, 'UTR444444444', current_date)$q$, 'amount_out_of_range');
select sv_test.expect_value('upi: flexible amount within range accepted as pending',
  $q$select status from public.submit_upi_payment(sv_test.id('d_i1'), 600, 'UTR444444444', current_date)$q$, 'pending_verification');
reset role;

-- ---------------------------------------------------------------- verification (admin only)
select sv_test.act_as('d0000000-0000-4000-8000-000000000004');
select sv_test.expect_error('staff: cannot approve a UPI payment (admin only)',
  $q$select * from public.admin_verify_upi_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1')))$q$, 'forbidden');
select sv_test.expect_error('staff: cannot reject a UPI payment (admin only)',
  $q$select public.admin_reject_upi_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1')), 'not found in bank')$q$, 'forbidden');
select sv_test.expect_error('in-store: cannot record while a UPI payment is pending verification',
  $q$select * from public.record_instore_payment(sv_test.id('d_i1'), 600, 'cash', current_date)$q$, 'payment_pending_verification');
reset role;

select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_value('verify: admin approval credits the installment with a receipt and gold weight',
  $q$select (receipt_number like 'STM-RC-%')::text || ':' || gold_weight_g::text
     from public.admin_verify_upi_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1')), 'Matched bank statement')$q$, 'true:0.111');
select sv_test.expect_value('verify: verifier identity, time and rate recorded',
  $q$select (verified_by = auth.uid())::text || ':' || (verified_at is not null)::text || ':' || gold_rate_per_g::text || ':' || gold_purity
     from public.savings_payments where installment_id = sv_test.id('c_i1') and status = 'verified'$q$, 'true:true:9000.00:22K');
select sv_test.expect_error('verify: cannot verify twice',
  $q$select * from public.admin_verify_upi_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1')))$q$, 'invalid_status_transition');
select sv_test.expect_error('verify: even an admin cannot edit a payment row directly',
  $q$update public.savings_payments set amount = 1 where installment_id = sv_test.id('c_i1')$q$, 'permission denied');
reset role;

-- owner-level protections (SQL editor / service role)
select sv_test.expect_error('integrity: verified amount immutable even for the database owner',
  $q$update public.savings_payments set amount = 1 where installment_id = sv_test.id('c_i1')$q$, 'payment_fields_immutable');
select sv_test.expect_error('integrity: financial records cannot be deleted (even by the owner)',
  $q$delete from public.savings_payments where installment_id = sv_test.id('c_i1')$q$, 'financial_record_delete_blocked');
select sv_test.expect_error('integrity: verified payment cannot go back to pending',
  $q$update public.savings_payments set status = 'pending_verification' where installment_id = sv_test.id('c_i1')$q$, 'invalid_payment_transition');

select sv_test.expect_error('integrity: database refuses a second active payment for a paid installment (owner insert)',
  $q$insert into public.savings_payments (enrollment_id, installment_id, customer_id, amount, channel, method, paid_on, status, submitted_by, verified_by, verified_at, receipt_number)
     values (sv_test.id('c_fixed'), sv_test.id('c_i1'), 'd0000000-0000-4000-8000-000000000001', 1000, 'in_store', 'cash', current_date, 'verified',
             'd0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', now(), 'TEST-DUP-1')$q$, 'savings_pay_one_active_per_installment');
select sv_test.expect_error('integrity: database refuses a reused UPI reference (owner insert)',
  $q$insert into public.savings_payments (enrollment_id, installment_id, customer_id, amount, channel, method, upi_reference, paid_on, status, submitted_by)
     values (sv_test.id('c_fixed'), sv_test.id('c_i3'), 'd0000000-0000-4000-8000-000000000001', 1000, 'customer_upi', 'upi', 'UTR111111111111', current_date, 'pending_verification',
             'd0000000-0000-4000-8000-000000000001')$q$, 'savings_pay_upi_reference_unique');

-- rejection flow
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select status from public.submit_upi_payment(sv_test.id('c_i2'), 1000, 'UTR222222222', current_date);
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_error('reject: reason is required',
  $q$select public.admin_reject_upi_payment((select id from public.savings_payments where upi_reference = 'UTR222222222'), 'no')$q$, 'reason_required');
select public.admin_reject_upi_payment((select id from public.savings_payments where upi_reference = 'UTR222222222'), 'Reference not found in bank statement');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_value('reject: customer sees the rejection reason; installment payable again',
  $q$select p.status || ':' || p.rejection_reason || ':' || i.status
     from public.savings_payments p join public.savings_installments i on i.id = p.installment_id where p.upi_reference = 'UTR222222222'$q$,
  'rejected:Reference not found in bank statement:pending_payment');
reset role;

-- ---------------------------------------------------------------- in-store payments
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_error('in-store: customer cannot record a counter payment',
  $q$select * from public.record_instore_payment(sv_test.id('c_i2'), 1000, 'cash', current_date)$q$, 'forbidden');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000004');
select sv_test.expect_error('in-store: duplicate UPI reference refused',
  $q$select * from public.record_instore_payment(sv_test.id('c_i2'), 1000, 'upi', current_date, null, 'UTR444444444')$q$, 'duplicate_reference');
select sv_test.expect_error('in-store: invalid method refused',
  $q$select * from public.record_instore_payment(sv_test.id('c_i2'), 1000, 'cheque', current_date)$q$, 'invalid_method');
select sv_test.expect_value('in-store: staff records a cash payment -> receipt issued',
  $q$select (receipt_number like 'STM-RC-%')::text from public.record_instore_payment(sv_test.id('c_i2'), 1000, 'cash', current_date, 'BOOK-17', null, 'Counter 1')$q$, 'true');
select sv_test.expect_value('in-store: recorded as verified with the staff member''s identity',
  $q$select (verified_by = auth.uid())::text || ':' || (submitted_by = auth.uid())::text || ':' || channel || ':' || method || ':' || status || ':' || store_reference
     from public.savings_payments where installment_id = sv_test.id('c_i2') and status = 'verified'$q$, 'true:true:in_store:cash:verified:BOOK-17');
select sv_test.expect_error('in-store: installment already paid cannot be paid again',
  $q$select * from public.record_instore_payment(sv_test.id('c_i2'), 1000, 'cash', current_date)$q$, 'installment_not_payable');
select sv_test.expect_error('void: staff cannot void a payment (admin only)',
  $q$select public.admin_void_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i2') and status = 'verified'), 'wrong entry')$q$, 'forbidden');
reset role;

-- passbook totals
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_value('passbook: totals = verified payments only (2 x 1000, weight 0.111 + 0.111)',
  $q$select verified_total::text || ':' || paid_count::text || ':' || pending_total::text || ':' || gold_weight_g::text
     from public.savings_enrollment_totals where enrollment_id = sv_test.id('c_fixed')$q$, '2000.00:2:0.00:0.222');
reset role;

-- ---------------------------------------------------------------- corrections (void)
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_error('void: reason required',
  $q$select public.admin_void_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i2') and status = 'verified'), 'x')$q$, 'reason_required');
select public.admin_void_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i2') and status = 'verified'), 'Entered against the wrong month');
select sv_test.expect_value('void: record kept as VOIDED; total corrected; installment payable again',
  $q$select (select count(*) from public.savings_payments where installment_id = sv_test.id('c_i2'))::text || ':' ||
            (select string_agg(status, ',' order by submitted_at) from public.savings_payments where installment_id = sv_test.id('c_i2')) || ':' ||
            (select verified_total::text from public.savings_enrollment_totals where enrollment_id = sv_test.id('c_fixed')) || ':' ||
            (select status from public.savings_installments where id = sv_test.id('c_i2'))$q$,
  '2:rejected,voided:1000.00:pending_payment');
select sv_test.expect_error('void: cannot void twice',
  $q$select public.admin_void_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i2') and status = 'voided'), 'again please')$q$, 'invalid_status_transition');

-- ---------------------------------------------------------------- gold-rate history
select public.admin_add_gold_rates(9100, null, now() - interval '1 minute', 'TEST newer board rate');
select sv_test.expect_value('rate: newer rate becomes current; older rate preserved in history',
  $q$select (select rate_per_gram::text from public.current_gold_rates() where purity = '22K') || ':' ||
            (select count(*)::text from public.gold_rates where purity = '22K' and source_note like 'TEST%')$q$, '9100.00:2');
select sv_test.expect_error('rate: an admin cannot edit a stored rate',
  $q$update public.gold_rates set rate_per_gram = 1 where source_note = 'TEST newer board rate'$q$, 'permission denied');
select sv_test.expect_error('rate: withdrawal needs a reason',
  $q$select public.admin_withdraw_gold_rate((select id from public.gold_rates where source_note = 'TEST newer board rate'), 'x')$q$, 'reason_required');
select public.admin_withdraw_gold_rate((select id from public.gold_rates where source_note = 'TEST newer board rate'), 'Typing mistake');
select sv_test.expect_value('rate: withdrawn rate no longer current; previous rate applies again',
  $q$select rate_per_gram::text from public.current_gold_rates() where purity = '22K'$q$, '9000.00');
reset role;
select sv_test.expect_error('rate: stored rate immutable even for the database owner',
  $q$update public.gold_rates set rate_per_gram = 1 where source_note = 'TEST board rate' and purity = '22K'$q$, 'gold_rate_immutable');
select sv_test.act_as_anon();
select sv_test.expect_value('rate: customers do not see withdrawn rates',
  $q$select count(*)::text from public.gold_rates where source_note = 'TEST newer board rate'$q$, '0');
reset role;

-- missing rate blocks a gold conversion instead of guessing
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select public.admin_withdraw_gold_rate((select id from public.gold_rates where source_note = 'TEST board rate' and purity = '22K'), 'Testing missing rate');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select status from public.submit_upi_payment(sv_test.id('c_i3'), 1000, 'UTR333333333', current_date);
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_error('rate: verification refused when no approved rate exists (no guessing)',
  $q$select * from public.admin_verify_upi_payment((select id from public.savings_payments where upi_reference = 'UTR333333333'))$q$, 'gold_rate_missing');
select sv_test.expect_value('rate: payment stays pending after the refused verification',
  $q$select status from public.savings_payments where upi_reference = 'UTR333333333'$q$, 'pending_verification');
reset role;

-- ---------------------------------------------------------------- redemptions
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
insert into sv_test.ids select 'c_rdm', redemption_id from public.request_redemption(sv_test.id('c_fixed'), 'coin', 'Lakshmi coin', null);
select sv_test.expect_value('redeem: request is pending with a snapshot of verified totals',
  $q$select status || ':' || verified_total_at_request::text || ':' || paid_count_at_request::text from public.savings_redemptions where id = sv_test.id('c_rdm')$q$,
  'pending:1000.00:1');
select sv_test.expect_error('redeem: duplicate open request refused', $q$select * from public.request_redemption(sv_test.id('c_fixed'), 'jewellery')$q$, 'duplicate_request');
select sv_test.expect_error('redeem: customer cannot approve own request', $q$select public.admin_decide_redemption(sv_test.id('c_rdm'), true, 'ok')$q$, 'forbidden');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000002');
select sv_test.expect_value('isolation: D cannot see C''s redemption', $q$select count(*)::text from public.savings_redemptions where id = sv_test.id('c_rdm')$q$, '0');
select sv_test.expect_error('isolation: D cannot request redemption on C''s enrollment', $q$select * from public.request_redemption(sv_test.id('c_fixed'), 'coin')$q$, 'not_found');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_error('redeem: rejection needs a reason', $q$select public.admin_decide_redemption(sv_test.id('c_rdm'), false, 'no')$q$, 'reason_required');
select public.admin_decide_redemption(sv_test.id('c_rdm'), true, 'Visit on Friday');
select sv_test.expect_error('redeem: cannot complete while a payment is pending verification',
  $q$select public.admin_complete_redemption(sv_test.id('c_rdm'), 'Coin handed over')$q$, 'payment_pending_verification');
select public.admin_reject_upi_payment((select id from public.savings_payments where upi_reference = 'UTR333333333'), 'Customer chose to redeem first');
select sv_test.expect_error('void: blocked once a redemption is approved',
  $q$select public.admin_void_payment((select id from public.savings_payments where installment_id = sv_test.id('c_i1') and status = 'verified'), 'late correction')$q$, 'redemption_in_progress');
select public.admin_complete_redemption(sv_test.id('c_rdm'), 'Coin handed over, receipt signed');
select sv_test.expect_value('redeem: completion closes the enrollment as redeemed',
  $q$select r.status || ':' || e.status from public.savings_redemptions r join public.savings_enrollments e on e.id = r.enrollment_id where r.id = sv_test.id('c_rdm')$q$,
  'completed:redeemed');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000001');
select sv_test.expect_error('redeem: no further payments after redemption',
  $q$select * from public.submit_upi_payment(sv_test.id('c_i3'), 1000, 'UTR777777777', current_date)$q$, 'enrollment_not_active');
select sv_test.expect_error('redeem: customer cannot cancel a completed request', $q$select public.cancel_my_redemption(sv_test.id('c_rdm'))$q$, 'cannot_cancel');

-- ---------------------------------------------------------------- audit trail
select sv_test.expect_value('audit: customers cannot read the audit log',
  $q$select count(*)::text from public.audit_logs where table_name like 'savings_%'$q$, '0');
reset role;
select sv_test.act_as('d0000000-0000-4000-8000-000000000003');
select sv_test.expect_value('audit: approvals, rejections, voids and rate changes are logged with the actor',
  $q$select (count(*) filter (where table_name = 'savings_payments' and action = 'UPDATE' and new_data ->> 'status' = 'verified' and actor_id = auth.uid()) >= 1
          and count(*) filter (where table_name = 'savings_payments' and new_data ->> 'status' = 'voided') >= 1
          and count(*) filter (where table_name = 'savings_payments' and new_data ->> 'status' = 'rejected') >= 1
          and count(*) filter (where table_name = 'gold_rates' and new_data ->> 'status' = 'withdrawn') >= 1
          and count(*) filter (where table_name = 'savings_schemes' and new_data ->> 'approval_status' = 'approved') >= 1)::text
     from public.audit_logs$q$, 'true');
reset role;

-- ---------------------------------------------------------------- results
select n, passed, name, detail from sv_test.results order by n;
select count(*) filter (where passed) as passed, count(*) filter (where not passed) as failed from sv_test.results;

rollback;

-- =====================================================================
-- Subbulakshmi Thanga Maligai — PHASE 5 DATABASE UPDATE (one paste, one Run)
-- For a project that ALREADY ran the Phase 4 setup (SETUP_ALL_IN_ONE.sql).
-- Supabase dashboard → SQL Editor → New query → paste ALL of this → Run
-- Adds: gold savings schemes (as DRAFT / NOT APPROVED, no terms), enrollments,
-- installments, payments, redemptions, gold-rate history, RLS, functions.
-- Safe to run again (non-destructive). Adds no fictional data.
-- =====================================================================


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


-- >>>>>>>>>> supabase/migrations/20261015000700_savings_terms_options.sql >>>>>>>>>>

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


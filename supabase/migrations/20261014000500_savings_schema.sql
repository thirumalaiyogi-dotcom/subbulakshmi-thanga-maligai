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

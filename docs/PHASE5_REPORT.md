# Phase 5 — Final report: gold savings, installments, payment records, gold rates

**Date:** 14 Oct 2026
**Step 1 audit:** see [PHASE5_AUDIT.md](PHASE5_AUDIT.md).
**Update 15 Oct 2026 (migration 7):** the store's published terms were shared. Two options were added to model them: conversion at the rate of the **date paid**, and **fixed amounts in a min–max range**. The values to enter are in [SCHEME_TERMS_ENTRY.md](SCHEME_TERMS_ENTRY.md). They are entered by an admin; nothing is approved automatically.

> **Not production-ready for real money yet.** The financial workflows are built and tested (see §4). Before customers' real savings are recorded, the following still need review:
> - the shop owner's **official scheme terms** (§8);
> - a **legal / accountant review** of the schemes (jewellery savings schemes can fall under deposit regulations);
> - **backup and recovery** settings in Supabase;
> - a test pass on the **real Supabase project**.

---

## 1. Files changed

**New**

| File | Purpose |
|---|---|
| `supabase/migrations/20261014000500_savings_schema.sql` | Savings tables, constraints, indexes, integrity triggers, RLS, grants |
| `supabase/migrations/20261014000600_savings_functions.sql` | The only write path: 18 trusted functions + helpers |
| `supabase/seed/02_savings_schemes.sql` | The two scheme **names**, created as DRAFT with no terms |
| `supabase/PHASE5_UPDATE.sql` | One-paste update for a project that already has Phase 4 |
| `supabase/migrations/20261015000700_savings_terms_options.sql` | Migration 7: paid-date conversion; fixed amount in a range |
| `supabase/PHASE5B_UPDATE.sql` | One-paste migration 7 for the existing project |
| `docs/SCHEME_TERMS_ENTRY.md` | Exact values + EN/TA terms text from the store's published terms, with open questions |
| `supabase/tests/savings_security_tests.sql` | 111 database security / integrity tests |
| `js/savings-api.js` | Savings data layer + shared views (statuses, terms, passbook, rate card), EN + TA |
| `js/customer/savings-live.js` | Customer screens on the real backend |
| `js/admin/savings-live.js` | Admin screens on the real backend |
| `tests/frontend/savings_live_test.py` | 52-check browser test of the savings flows |
| `tests/frontend/i18n_duplicates.mjs` | Detects translation keys that silently overwrite each other |
| `docs/PHASE5_AUDIT.md`, `docs/PHASE5_REPORT.md` | Step 1 audit and this report |

**Changed**

| File | Change |
|---|---|
| `index.html`, `admin.html` | Load the new scripts |
| `js/customer/app.js`, `js/customer/shell.js` | Live savings routes; `#/goldrate`; honest top strip |
| `js/admin/admin.js`, `js/admin/navigation.js`, `js/admin/catalogue-live.js` | Live savings routes, Audit menu item, savings KPIs on the overview |
| `css/admin.css`, `css/components.css` | Wrapping fixes found by the layout test; stacked terms list on phones |
| `tests/db/run-db-tests.mjs` | Also runs the Phase 5 suite and seed |
| `tests/frontend/supabase-mock.js` | Test-only imitation of the savings tables and functions |
| `tests/frontend/layout_test.py`, `tests/frontend/live_mode_test.py` | Phase 5 routes and data |
| `supabase/SETUP_ALL_IN_ONE.sql` | Now includes Phase 5 (for new projects) |

**Unchanged on purpose**

- `js/savings-core.js`, `js/savings-views.js`, `js/customer/savings.js`, `js/admin/savings-admin.js`.
- These are the DEMO screens. They still run, with their old calculations, when no Supabase configuration exists (Step 1: "Do not silently change existing scheme calculations").

## 2. Database migrations and SQL

| Object | Notes |
|---|---|
| `savings_schemes` | Every financial term is **nullable** and admin-configurable. |
| | Approval fields: `approval_status` draft / approved / retired, `approved_by`, `approved_at`, `approval_note`, `terms_version`. These are written only by `admin_approve_scheme`. |
| | `enrollment_open` is allowed only when the scheme is approved (CHECK constraint). |
| | Editing any term of an approved scheme returns it to **draft** and closes enrollment (trigger). |
| `savings_enrollments` | Number `SV-YYYY-NNNNN`. |
| | **Snapshot** of the agreed terms (`terms_snapshot`, `terms_version`, amounts, conversion). |
| | Statuses: pending_approval → active / rejected / cancelled → redeemed. |
| | One open request per customer per scheme. |
| `savings_installments` | Created on approval from the snapshot. Unique (enrollment, no) and (enrollment, month). |
| | Status: pending_payment / pending_verification / paid. There is **no "missed" status and no maturity rule**; both are unapproved business rules. |
| `savings_payments` | Receipt `STM-RC-YYYY-NNNNNN`. Channel: `customer_upi` / `in_store`. Method: cash / upi / card / bank_transfer. |
| | Status: pending_verification → verified / rejected; verified → voided. |
| | Records submitter, verifier, rejecter and voider, each with a time and a reason. |
| | Stores the rate id, purity, rate and weight used. |
| | **Unique: at most one active payment per installment.** |
| | **Unique: a UPI reference can back only one active payment.** |
| `savings_redemptions` | Number `RD-YYYY-NNNNN`. Type jewellery / coin. |
| | Status: pending → approved / rejected → completed; cancelled. |
| | Snapshot of the verified total, paid count and weight at request time. One open request per enrollment. |
| `gold_rates` | 22K / 24K, ₹1,000–₹1,00,000 per gram, effective time, source note required, created_by. |
| | **Insert-only.** A mistake is *withdrawn* with a reason, never edited or deleted. |
| `savings_enrollment_totals` | View (`security_invoker`). Totals come from **verified payments only**. |
| Triggers | DELETE is blocked on all six tables, even for the database owner. |
| | The money facts of a payment and a stored rate are immutable. |
| | Status transitions are enforced. |
| | Every change goes to `audit_logs` with the actor. |

## 3. Security policies added

- **RLS** on all six tables, with the deny-by-default grants revoked first.
- **Customers can read only their own rows**: enrollments, installments, payments, redemptions, totals.
- **Admin and staff can read all of them.**
- **Customers have no write privilege on any savings table.**
  - Every change goes through `SECURITY DEFINER` functions.
  - Each function re-checks the caller's role and row ownership in the database.
- **Customer actions:**
  - request / cancel enrollment;
  - submit a UPI reference (always **pending verification**);
  - request / cancel redemption.
- **Staff actions:** record an in-store payment (stored as verified with the staff identity).
- **Admin-only actions:**
  - scheme terms and approval;
  - enrollment decisions;
  - **UPI verify / reject**;
  - void;
  - gold rates;
  - redemption decisions;
  - the audit log.
- **Scheme approval columns** cannot be written through the API at all (column-level grants).
- **Function execute rights** were revoked from `public` and `anon`. Supabase grants EXECUTE to `anon` by default, and the test suite caught this.
- **No service-role key in the browser.** No secrets were added to the frontend.

## 4. Tests actually performed (14 Oct 2026)

| Suite | How | Result |
|---|---|---|
| Phase 5 database security (`savings_security_tests.sql`) | Real PostgreSQL (PGlite 0.5.9) + Supabase auth / storage shim | **111 / 111 pass** (incl. 8 for migration 7) |
| Phase 4 database security (`security_tests.sql`) | Same | **71 / 71 pass** |
| Mutation check of the Phase 5 suite | 6 deliberate holes, each caught: UPI auto-credit, staff can verify, no unique UPI reference, no one-payment-per-installment, payments readable by all, customers can update payments | **6 / 6 caught** (+2 / 2 for migration 7) |
| One-paste SQL files | Phase 4 file then `PHASE5_UPDATE.sql` ×2 (your situation); and `SETUP_ALL_IN_ONE.sql` ×2 (fresh). Both suites run after each. | Both paths: no errors, 71 + 103 pass. Admin role and data kept. |
| Savings browser test (`savings_live_test.py`) | Headless Chromium + test-only mock, Asia/Kolkata timezone | **58 / 58 pass** (incl. the store's Kuber Lakshmi model) |
| Phase 4 browser test (`live_mode_test.py`) | Same | **59 / 59 pass** |
| DEMO-mode regression (`demo_mode_test.py`) | Headless Chromium | **57 / 57 pass** |
| Layout (`layout_test.py`) | 6 widths (320–1280) × Tamil / English × DEMO + Supabase mode, including all new savings screens | **792 page loads, 0 problems** |
| Translation keys | Every key used exists in EN **and** TA; no key silently overwritten | Pass. This check found a real clash (`payNotPaid`) that broke the order screen text; fixed. |
| Every button / form / select has a handler | Both apps | Pass |

**What the database tests check:**

- **Duplicate prevention:**
  - duplicate installment credits;
  - duplicate UPI references (including normalised spacing, and at database level).
- **Unauthorised actions refused:**
  - approval attempts by a customer and by staff;
  - customers editing or verifying their own payments.
- **Isolation:** customer-to-customer data access is blocked.
- **Gold rates:**
  - invalid and missing gold rates (verification is refused rather than guessed);
  - rate history is preserved;
  - rates cannot be edited.
- **Approval, rejection and void flows:**
  - reasons are required;
  - records are kept;
  - totals are corrected.
- **Passbook accuracy:** totals come from verified payments only.
- **Terms changes:**
  - editing approved terms sends the scheme back to draft;
  - requests made under the old terms cannot be approved.
- **Redemption lifecycle.**
- **Audit trail:** entries carry the actor.

**Browser tests use a mock.** It imitates Supabase only roughly; the database suite is the real security proof.

**Not executed:** anything against your real Supabase project. Network access to supabase.co is blocked from this build environment.

## 5. Remaining issues

- **Official scheme terms are missing** (§8). Until an admin enters and approves them, no customer can enroll; this is by design.
- **The store's official UPI ID / QR is not in the app.** The pay screen tells customers to use the one shown at the counter.
- **Rounding of gold weight:** 3 decimals (milligram), half-up. This needs the owner's confirmation.
- **No payment window is enforced.** If configured, it is shown as information only. Whether late payments are refused is an unapproved rule.
- **Installments can be paid in any order** and in advance; admin verification is the control. Confirm with the owner.
- **No automatic maturity, penalties, bonus or redemption eligibility.** The admin decides each redemption.
- **Backup and recovery has not been set up or tested.**
  - Check which backup options your Supabase plan includes (Dashboard → Database → Backups). The options differ between plans.
  - Until that is confirmed, export the savings tables regularly (Table Editor → Export CSV).
  - Do this before recording real money.
- **The Reports screen still shows DEMO data.**
- **No SMS / WhatsApp notification** of verification.

## 6. Connected to the real backend (Supabase mode)

**Customer:**
- my schemes;
- scheme list and details (approved terms or "NOT APPROVED");
- enrollment request;
- passbook with the installment schedule;
- UPI reference submission and status;
- payment history;
- redemption requests;
- the current gold rate.

**Admin:**
- scheme configuration and approval record, open / close enrollment;
- enrollment approval / rejection and in-store enrollment;
- pending UPI verifications (admin verify / reject);
- in-store payment entry (staff + admin);
- passbooks and records;
- voids (corrections);
- customers;
- redemption decisions and completion;
- daily gold rates, history and withdrawal;
- financial audit log;
- overview KPIs.

## 7. Still demo-only

- **Admin → Reports** (marked DEMO).
- **DEMO mode:** when no Supabase configuration is present, the whole old prototype runs with fictional data, as before.
- **No fictional customer, payment or savings record** was imported into the database.

## 8. Official rules that still need the shop owner's approval

Enter these in **Admin → Savings schemes → Edit terms** only after written approval, then use **Record owner approval**:

1. Duration of each scheme.
2. Dhanalakshmi: minimum / maximum monthly amount. Kuber Lakshmi: the list of allowed fixed amounts.
3. Payment window (e.g. 1st–7th), and what happens to late payments.
4. Missed installments: grace period, penalty, or lapse.
5. Gold conversion:
   - whether it applies;
   - which purity;
   - verification-date rate or another rule;
   - rounding.
6. When an enrollment is complete (maturity).
7. Redemption:
   - when it is allowed and whether early redemption is allowed;
   - how the value is calculated;
   - making charges, wastage, GST;
   - coin vs jewellery.
8. Bonus or benefits: confirm there are none, or state them exactly.
9. Cancellation and refund policy.
10. Full terms text in English and Tamil.
11. Legal / accountant review of the schemes before taking real money.

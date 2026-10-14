# Phase 5 — Step 1: Audit of the existing gold-savings DEMO

**Date:** 14 Oct 2026

**Files inspected:**
- `js/savings-core.js`
- `js/savings-views.js`
- `js/customer/savings.js`
- `js/admin/savings-admin.js`
- `js/admin/catalogue-admin.js` (`aSchemes`)
- `js/utils.js` (`windowInfo`)
- `js/ui.js` (`STATUS_TONE`)
- `js/i18n.js` (status strings)

**Summary:** none of the rules below are official. Every rule, number and calculation in the old screens comes from the Phase 1 prototype. **None of it has been approved by Subbulakshmi Thanga Maligai.** Phase 5 keeps these screens unchanged in DEMO mode. It does **not** copy any of these rules into the real database.

---

## 1. Existing fields and calculations

| Area | Fields / logic in the DEMO code |
|---|---|
| Scheme (`SCHEMES`) | `id`, `code` (DL/KL), `type` (`flexible` for Dhanalakshmi, `fixed` for Kuber), names, tagline, description, contribution text, `rules[]`, `special` |
| Enrollment | `id` (`DEMO-KL-0087`), `customerId`, `scheme`, `start` (YYYY-MM), `status` (`pending`/`active`), `enrolledOn`, `fixedAmount` |
| Transaction | `id` (`TX0001`), `enrollmentId`, `customerId`, `scheme`, `month`, `date`, `amount`, `ref` (UPI ref), `receipt`, `status` (`pending`/`verified`/`rejected`), `rate`, `weight`, `reason` |
| Gold rate | `date`, `rate`, `by`, `note`. **22K only.** The history is a sorted array, and new entries are pushed onto it. |
| Redemption | `id`, `enrollmentId`, `type` (`jewellery`/`coin`), `preference`, `visitDate`, `status` (`submitted` → `review` → `ready` → `closed`), `createdOn` |
| `summary(e)` | `verifiedAmt` = sum of verified amounts; `pendingAmt`; `verifiedCount`; `status` = `matured` when 12 or more are verified; `weight` = sum of `amount / rate` (Kuber only); `end` = start + 11 months; `eligible` = 12 verified **and** current month ≥ start + 12 |
| `installmentsOf(e)` | Always **12** rows. Status is `missed` if not paid after the 7th of the month, `due` on days 1–7, `upcoming` for future months |
| Verify (admin) | Generates a receipt `DEMO-RCPT-…`. For Kuber, rate = *current* 22K demo rate and weight = `round3(amount / rate)` |
| Demo rate | `demoRate(ym) = 6600 + i*38 + (i%3)*12`, an invented formula used only to illustrate the passbook |

## 2. Scheme conditions displayed in the UI (all unapproved)

- **Duration:** "12 months from the month of enrollment".
- **Payment window:** "Pay between the 1st and 7th of every month".
- **Dhanalakshmi:** "flexible monthly contribution … within the approved scheme terms". The UI never states any limits.
- **Kuber Lakshmi:**
  - "fixed monthly contribution selected at enrollment";
  - enrollment offers ₹1,000 / 2,000 / 3,000 / 5,000 / 10,000;
  - "gold weight … at the store's verified gold rate applicable on the date of verification".
- **Redemption:** "in the 13th month, as jewellery or gold coin".
- **Start month:** the month after enrollment, "after approval".
- **Crediting:** "Every payment is credited only after verification by the store". This is a process rule, not a financial term, so Phase 5 keeps it.
- **Disclaimer:** "No returns, bonuses or benefits are promised". Phase 5 keeps it.

## 3. Existing demo data and calculations

- **Fictional records:** 6 customers (C0142…C0195), 7 enrollments, about 50 transactions, 3 demo gold rates (₹7,385–₹7,410 per gram), 0 redemptions.
- **Storage:** sessionStorage only (`demoState`). The data resets when the tab closes.
- **Kuber gold weights:** calculated from the invented `demoRate` formula above. **They are not real balances.**

## 4. Missing business rules (must come from the shop owner)

1. Scheme **duration** for each scheme.
2. **Minimum / maximum** monthly amounts (Dhanalakshmi), and the **allowed fixed amounts** (Kuber).
3. **Payment window**: whether the 1st–7th window is real, and what happens to a payment made after the 7th.
4. **Missed installments**: is there a penalty, a grace period, or does the enrollment lapse?
5. **Gold conversion**:
   - whether payments convert to gold weight at all (Dhanalakshmi shows none);
   - which purity (22K or 24K);
   - which rate (payment date or verification date);
   - rounding.
6. **Maturity**: when is an enrollment complete?
7. **Redemption eligibility and timing**:
   - the 13th month or another time;
   - whether early redemption is allowed;
   - what happens on partial payment.
8. **Redemption value**:
   - making charges and wastage;
   - GST;
   - whether coin and jewellery are treated differently.
9. **Bonus / benefit**: none is shown. Confirm that there is none.
10. **Cancellation and refund** policy.
11. **Accepted payment methods** in store (cash, UPI, card).
12. The store's **official UPI ID / QR code**. The old screen shows a DEMO QR code.
13. **Legal / regulatory review** of the scheme. Jewellery savings schemes can fall under deposit regulations. This needs the owner's accountant or lawyer, not software.

## 5. Conflicting or unclear rules

- **Undefined limits:** Dhanalakshmi says "within the limits set in the approved scheme terms", but no limits exist anywhere.
- **Which rate:** Kuber converts at "the rate applicable on the date of verification". The demo actually uses the *latest* rate at the moment of verification, which differs if a rate is back-dated. Purity is not stated (the demo uses 22K).
- **Two different redemption rules:** `summary().eligible` requires **all 12** verified **and** month ≥ start + 12. The UI text only says "in the 13th month".
- **Payment window not enforced:** the window (1–7) is shown, but payment is still accepted outside it with only a note. Whether late payment is allowed is unclear.
- **"Missed" status:** an installment is marked `missed` purely from the calendar. That is a business rule (late = missed) that has not been approved.
- **Reused references:** after a rejection, the demo accepts a second payment for the same month. It also does not check that a reference is unique across *rejected* entries.
- **Redemption statuses:** the old flow (submitted → review → ready → closed) has no "rejected" state. The Phase 5 prompt requires Pending / Approved / Rejected.
- **Rate history:** the gold-rate history can be pushed with any past date and has no record of who changed what. The "rate by" field is a fixed text.

## 6. What Phase 5 does with this

- **DEMO mode is unchanged:** no Supabase config means the old screens and calculations run exactly as before.
- **Supabase mode:**
  - The two schemes are created as **DRAFT (NOT APPROVED)**, with every financial term **empty**. Nothing from the demo is copied in.
  - An admin fills in the terms only after the owner's written approval, then presses **Approve**. Only then can customers enroll.
  - Gold conversion, the payment window, minimum/maximum amounts and redemption timing are each **optional, configurable fields**. If a field is empty, the app does not apply the rule and says that it is not configured.
  - There is **no "missed" status and no maturity calculation**. An installment is only *pending payment*, *pending verification* or *paid*.

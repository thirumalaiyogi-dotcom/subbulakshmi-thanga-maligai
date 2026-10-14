"""
Phase 5 browser test: gold savings in SUPABASE mode, driven through the UI
with the test-only mock client (tests/frontend/supabase-mock.js).
Run from the project root:  python tests/frontend/savings_live_test.py
The real authorisation rules are proven by supabase/tests/savings_security_tests.sql;
this test checks that the screens use them correctly and show honest statuses.
"""
import asyncio, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from live_mode_test import ctx_with, C, A

R = []
def ok(name, cond, info=''): R.append((name, bool(cond), str(info)[:200]))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await ctx_with(b, width=390)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        w = lambda ms=700: pg.wait_for_timeout(ms)
        text = lambda sel='#app': pg.inner_text(sel)

        async def login_admin_app(email, pw):
            await pg.goto(A); await w(600)
            if await pg.locator('[data-action="admin-logout"]').count():
                await pg.click('.topbar [data-action="admin-logout"]' if await pg.locator('.topbar [data-action="admin-logout"]').count() else '[data-action="admin-logout"]'); await w(700)
            await pg.fill('#alEmail', email); await pg.fill('#alPass', pw)
            await pg.click('form[data-form="admin-login"] button[type=submit]'); await w(1000)
            await pg.evaluate("setLang('en')")

        async def as_customer(email='b@test.local', pw='CustomerB123'):
            await pg.goto(C); await w(400)
            await pg.evaluate("async ([e,p]) => { await Auth.signOut(); await Auth.signIn(e, p); setLang('en'); }", [email, pw]); await w(400)

        async def reason_modal(value, check=False):
            await pg.fill('#svReason', value)
            if check: await pg.check('#svCheck')
            await pg.click('button[form="svReasonForm"]'); await w(900)

        await pg.goto(C)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('stm_digigold_seenWelcome','true'); localStorage.setItem('stm_digigold_lang','\"en\"')")
        await pg.reload(); await w(800)

        # ---------- visitor ----------
        await pg.goto(C + '#/savings'); await w(900)
        t = await text()
        ok('visitor: savings asks to log in (records are private)', 'Log in to see your savings' in t)
        ok('visitor: missing gold rate shown as a clear warning (no invented rate)', 'No approved gold rate' in t)
        await pg.goto(C + '#/schemes'); await w(900)
        t = await text()
        ok('schemes: both store schemes marked DEMO / NOT APPROVED', t.count('DEMO / NOT APPROVED') >= 2, t[:200])
        ok('schemes: no invented durations or amounts shown', '12 months' not in t and '₹1,000' not in t)
        await pg.goto(C + '#/scheme/kuber'); await w(900)
        t = await text()
        ok('scheme detail: unapproved terms -> no enrollment form, terms "Not configured"', await pg.locator('form[data-form="sv-enroll"]').count() == 0 and 'not been approved' in t and 'Not configured' in t)

        # ---------- admin configures + approves ----------
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/scheme-edit/kuber'); await w(900)
        await pg.select_option('#scType', 'fixed'); await pg.fill('#scDuration', '3'); await pg.fill('#scAmounts', '1000, 2000')
        await pg.select_option('#scConv', 'verification_date_rate'); await pg.select_option('#scPurity', '')
        await pg.fill('#scTermsEn', 'TEST terms only — fixed amount, three installments.'); await pg.fill('#scTermsTa', 'சோதனை விதிமுறைகள் — நிலைத் தொகை, மூன்று தவணைகள்.')
        await pg.click('form[data-form="sv-scheme"] button[type=submit]'); await w(400)
        ok('admin: conversion without purity refused by the form', await pg.locator('#scPurity[aria-invalid="true"]').count() == 1)
        await pg.select_option('#scPurity', '22K'); await pg.fill('#scWinFrom', '1')
        await pg.click('form[data-form="sv-scheme"] button[type=submit]'); await w(400)
        ok('admin: payment window needs both days', await pg.locator('#scWinFrom[aria-invalid="true"]').count() == 1)
        await pg.fill('#scWinFrom', '')
        await pg.click('form[data-form="sv-scheme"] button[type=submit]'); await w(1000)
        t = await text()
        ok('admin: terms saved, scheme still NOT APPROVED', 'schemes' in await pg.evaluate('location.hash') and 'DEMO / NOT APPROVED' in t)
        await pg.click('[data-action="sv-approve-scheme"][data-id="kuber"]'); await w(300)
        await reason_modal('ok')
        ok('admin: approval needs a recorded note', 'at least 10 characters' in await pg.inner_text('#svReason-err'))
        await reason_modal('Owner approved signed terms sheet (TEST)')
        ok('admin: approval needs the confirmation tick', 'Tick the confirmation box' in await pg.inner_text('#svModalErr'), await pg.inner_text('#svModalErr'))
        await reason_modal('Owner approved signed terms sheet (TEST)', check=True)
        t = await text()
        ok('admin: scheme approved with the approval record shown', 'Approved terms' in t and 'Owner approved signed terms sheet' in t)
        await pg.click('[data-action="sv-toggle-open"][data-id="kuber"]'); await w(900)
        ok('admin: enrollment opened', 'Enrollment open' in await text())
        # gold rates
        await pg.goto(A + '#/goldrate'); await w(900)
        await pg.fill('#gr22', '9900'); await pg.fill('#gr24', '9800'); await pg.fill('#grNote', 'TEST board rate')
        await pg.click('form[data-form="sv-rates"] button[type=submit]'); await w(300)
        ok('rates: 22K above 24K refused', await pg.locator('#gr24[aria-invalid="true"]').count() == 1)
        await pg.fill('#gr22', '9000'); await pg.click('form[data-form="sv-rates"] button[type=submit]'); await w(300)
        await pg.click('#mConfirm'); await w(1100)
        t = await text()
        ok('rates: saved; current rate card + history with who/when', '₹9,000' in t and '₹9,800' in t and 'Store Admin' in await pg.inner_text('#svaRateHist'))

        # ---------- customer enrolls ----------
        await as_customer()
        await pg.goto(C + '#/scheme/kuber'); await w(1000)
        t = await text()
        ok('customer: approved terms shown exactly as configured', 'Approved terms' in t and '₹1,000, ₹2,000' in t and '3 months' in t and '22K' in t)
        await pg.click('form[data-form="sv-enroll"] button[type=submit]'); await w(300)
        ok('customer: amount + agreement required', await pg.locator('#seAmt[aria-invalid="true"]').count() == 1 and await pg.locator('#seAgree[aria-invalid="true"]').count() == 1)
        await pg.select_option('#seAmt', '1000'); await pg.check('#seAgree')
        await pg.click('form[data-form="sv-enroll"] button[type=submit]'); await w(1300)
        t = await text()
        ok('customer: enrollment request created, awaiting store approval', 'passbook/' in await pg.evaluate('location.hash') and 'Awaiting store approval' in t and re.search(r'SV-\d{4}-\d{5}', t), t[:200])
        enr_id = (await pg.evaluate('location.hash')).split('/')[-1]
        await pg.goto(C + '#/scheme/kuber'); await w(900)
        await pg.select_option('#seAmt', '2000'); await pg.check('#seAgree'); await pg.click('form[data-form="sv-enroll"] button[type=submit]'); await w(900)
        ok('customer: duplicate request refused with a clear message', 'already have an open request' in await pg.inner_text('#seErr'))
        bad = await pg.evaluate("Backend.client.rpc('admin_decide_enrollment', {p_enrollment_id: '%s', p_approve: true, p_start_month: '2026-10-01'}).then(r => r.error && r.error.message)" % enr_id)
        ok('customer: cannot approve own enrollment (database refuses)', bad == 'forbidden', bad)

        # ---------- admin approves enrollment ----------
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/enrollments'); await w(1000)
        ok('admin: request listed with customer name', 'Customer B' in await pg.inner_text('#svaEnr'))
        await pg.click('[data-action="sv-enr-approve"]'); await w(300)
        await pg.click('button[form="svReasonForm"]'); await w(1100)
        await pg.goto(A + '#/records/' + enr_id); await w(1100)
        t = await pg.inner_text('#svaPb')
        ok('admin: approval created a 3-installment schedule from the snapshot', t.count('Pending payment') == 3 and 'Active' in t, t[:200])

        # ---------- customer submits a UPI reference ----------
        await as_customer()
        await pg.goto(C + '#/pay/' + enr_id); await w(1200)
        ok('pay: fixed amount pre-filled and read-only', await pg.input_value('#spAmt') == '1000' and await pg.locator('#spAmt[readonly]').count() == 1)
        ok('pay: honest notice — reference is not payment', 'does NOT mark the installment as paid' in await text())
        await pg.fill('#spRef', 'ab'); await pg.click('form[data-form="sv-pay"] button[type=submit]'); await w(300)
        ok('pay: malformed reference refused', await pg.locator('#spRef[aria-invalid="true"]').count() == 1)
        await pg.fill('#spRef', 'utr 1234-5678-9012'); await pg.click('form[data-form="sv-pay"] button[type=submit]'); await w(300)
        await pg.click('#mConfirm'); await w(1300)
        t = await text()
        ok('pay: result says PENDING VERIFICATION, not paid', 'pending verification' in t.lower() and 'NOT paid yet' in t and 'UTR123456789012' in t)
        await pg.goto(C + '#/passbook/' + enr_id); await w(1100)
        t = await pg.inner_text('#svPassbook')
        ok('passbook: installment 1 pending verification; verified total still ₹0', 'Pending verification' in t and re.search(r'Verified total\s*₹0', t), t[:240])
        await pg.goto(C + '#/pay/' + enr_id); await w(1100)
        await pg.fill('#spRef', 'UTR123456789012'); await pg.click('form[data-form="sv-pay"] button[type=submit]'); await w(300); await pg.click('#mConfirm'); await w(1000)
        ok('pay: same UPI reference for another installment refused', 'already been used' in await pg.inner_text('#spErr'))
        bad = await pg.evaluate("Backend.client.rpc('admin_verify_upi_payment', {p_payment_id: window.__mockDb().savings_payments[0].id}).then(r => r.error && r.error.message)")
        ok('pay: customer cannot verify own payment (database refuses)', bad == 'forbidden', bad)

        # ---------- staff ----------
        await login_admin_app('staff@test.local', 'StaffPass123')
        await pg.goto(A + '#/payments'); await w(1100)
        t = await text()
        ok('staff: sees the pending UPI payment but no Verify/Reject buttons', 'UTR123456789012' in t and await pg.locator('[data-action="sv-verify-pay"]').count() == 0 and 'Only an admin' in t)
        bad = await pg.evaluate("Backend.client.rpc('admin_verify_upi_payment', {p_payment_id: window.__mockDb().savings_payments[0].id}).then(r => r.error && r.error.message)")
        ok('staff: verification attempt refused by the database', bad == 'forbidden', bad)
        await pg.goto(A + '#/records/' + enr_id); await w(1100)
        ok('staff: no counter entry offered for the installment awaiting verification', await pg.locator('[data-action="sv-record"][data-no="1"]').count() == 0)
        await pg.click('[data-action="sv-record"][data-no="2"]'); await w(300)
        ok('in-store: fixed amount pre-filled', await pg.input_value('#rpAmt') == '1000')
        await pg.fill('#rpStore', 'BOOK-17'); await pg.click('button[form="svRecForm"]'); await w(1200)
        t = await pg.inner_text('#svaPb')
        ok('in-store: recorded as verified with receipt and staff identity', re.search(r'STM-RC-\d{4}-\d{6}', t) and 'Store Staff' in t and 'BOOK-17' in t, t[-300:])
        ok('in-store: staff has no Void button (admin only)', await pg.locator('[data-action="sv-void"]').count() == 0)
        await pg.goto(A + '#/audit'); await w(800)
        ok('staff: audit log is admin only', 'Only admins' in await text() or 'admin' in (await text()).lower() and await pg.locator('#svaAudit').count() == 0)

        # ---------- admin verifies / rejects / voids ----------
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/payments'); await w(1100)
        await pg.click('[data-action="sv-verify-pay"]'); await w(300); await pg.click('#mConfirm'); await w(1200)
        ok('verify: queue cleared after admin verification', 'UTR123456789012' not in await pg.inner_text('#svaPay'))
        await pg.goto(A + '#/records/' + enr_id); await w(1100)
        t = await pg.inner_text('#svaPb')
        ok('verify: receipt + verifier + gold weight at the stored rate (1000 ÷ 9000 = 0.111 g)', 'Store Admin' in t and '0.111 g' in t and '0.222 g' in t, t[:300])
        await as_customer()
        await pg.goto(C + '#/pay/' + enr_id); await w(1100)
        await pg.fill('#spRef', 'UTR999999999'); await pg.click('form[data-form="sv-pay"] button[type=submit]'); await w(300); await pg.click('#mConfirm'); await w(1100)
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/payments'); await w(1100)
        await pg.click('[data-action="sv-reject-pay"]'); await w(300)
        await reason_modal('no')
        ok('reject: reason required', 'at least 5' in await pg.inner_text('#svReason-err'))
        await reason_modal('Reference not found in bank statement')
        await as_customer()
        await pg.goto(C + '#/transactions'); await w(1100)
        t = await pg.inner_text('#svTx')
        ok('customer: sees Rejected with the store\'s reason, and Verified payments with receipts', 'Rejected' in t and 'Reference not found in bank statement' in t and t.count('Verified') >= 2 and 'STM-RC-' in t)
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/records/' + enr_id); await w(1100)
        await pg.click('[data-action="sv-void"] >> nth=0'); await w(300)
        await reason_modal('Entered against the wrong month')
        await pg.goto(A + '#/records/' + enr_id); await w(1100)
        t = await pg.inner_text('#svaPb')
        ok('void: record kept as Voided with reason; total corrected', 'Voided (corrected)' in t and 'Entered against the wrong month' in t and re.search(r'Verified total\s*₹1,000', t), t[:300])

        # ---------- rates history ----------
        await pg.goto(A + '#/goldrate'); await w(1000)
        await pg.click('[data-action="sv-withdraw-rate"] >> nth=0'); await w(300)
        await reason_modal('Typing mistake (TEST)')
        t = await pg.inner_text('#svaRateHist')
        ok('rates: withdrawn rate stays in history with reason', 'Withdrawn' in t and 'Typing mistake (TEST)' in t and 'Active' in t)

        # ---------- redemption ----------
        await as_customer()
        await pg.goto(C + '#/redeem'); await w(1100)
        await pg.click('input[name="srType"][value="coin"] + .choice-box'); await pg.fill('#srPref', '4 g coin')
        await pg.click('form[data-form="sv-redeem"] button[type=submit]'); await w(300); await pg.click('#mConfirm'); await w(1200)
        ok('redeem: request shows "Redemption pending" with verified total snapshot', 'Redemption pending' in await pg.inner_text('#svRedeemList') and '₹1,000' in await pg.inner_text('#svRedeemList'))
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/redemptions'); await w(1100)
        await pg.click('[data-action="sv-rdm-approve"]'); await w(300); await reason_modal('Visit on Friday')
        await pg.goto(A + '#/redemptions'); UI_tab = await pg.click('[data-action="sv-ar-tab"][data-v="approved"]'); await w(1000)
        await pg.click('[data-action="sv-rdm-complete"]'); await w(300); await reason_modal('22K coin 4 g handed over (TEST)')
        await as_customer()
        await pg.goto(C + '#/redeem'); await w(1100)
        ok('redeem: customer sees "Redemption completed"', 'Redemption completed' in await pg.inner_text('#svRedeemList'))
        await pg.goto(C + '#/savings'); await w(1100)
        ok('redeem: enrollment shown as Redeemed', 'Redeemed' in await pg.inner_text('#svMine'))

        # ---------- audit ----------
        await login_admin_app('admin@test.local', 'AdminPass123')
        await pg.goto(A + '#/audit'); await w(1100)
        t = await pg.inner_text('#svaAudit')
        ok('audit: approvals, rejections, voids and rate changes listed with the actor', all(k in t for k in ['Store Admin', 'Store Staff', 'status: pending_verification → verified', 'status: verified → voided', 'status: active → withdrawn', 'approval_status: draft → approved']), t[:300])

        # ---------- editing approved terms sends the scheme back to NOT APPROVED ----------
        await pg.goto(A + '#/scheme-edit/kuber'); await w(900)
        await pg.fill('#scDuration', '4'); await pg.click('form[data-form="sv-scheme"] button[type=submit]'); await w(1100)
        ok('terms: editing approved terms returns the scheme to NOT APPROVED and closes enrollment', 'DEMO / NOT APPROVED' in await text() and 'Terms changed after approval' in await text())

        # ---------- overview KPIs ----------
        await pg.goto(A + '#/overview'); await w(1100)
        ok('admin overview: live savings KPIs shown', 'UPI payments to verify' in await text() and await pg.locator('#svKpis .kpi').count() == 4)

        # ---------- isolation: another customer ----------
        await pg.goto(C); await w(400)
        await pg.evaluate("async () => { await Auth.signOut(); await Auth.signUp({ email: 'c2@test.local', password: 'Customer2Pass', fullName: 'Customer Two', phone: '9000000002' }); setLang('en'); }"); await w(600)
        await pg.goto(C + '#/transactions'); await w(1100)
        ok('isolation: a different customer sees no payments', 'No payments yet' in await text())
        await pg.goto(C + '#/passbook/' + enr_id); await w(1100)
        ok('isolation: a different customer cannot open B\'s passbook', 'Customer B' not in await text() and 'UTR' not in await text() and ('No results' in await text() or 'nothing' in (await text()).lower() or await pg.locator('.empty').count() >= 1))

        # ---------- Tamil ----------
        await as_customer()
        await pg.goto(C + '#/savings'); await w(900)
        await pg.click('.topbar [data-action="set-lang"][data-v="ta"]'); await w(1100)
        t = await text()
        ok('Tamil: savings screen + statuses in Tamil', 'என் சேமிப்புத் திட்டங்கள்' in t and 'மீட்கப்பட்டது' in t)
        missing = await pg.evaluate("""() => { const k = []; ['is_pending_payment','is_pending_verification','is_paid','ps_pending_verification','ps_verified','ps_rejected','ps_voided','es_pending_approval','es_active','es_rejected','es_cancelled','es_redeemed','rs_pending','rs_approved','rs_rejected','rs_completed','rs_cancelled','ss_draft','ss_approved','ss_retired','m_cash','m_upi','m_card','m_bank_transfer','ch_in_store','ch_customer_upi','ct_fixed','ct_flexible','gc_none','gc_verification_date_rate'].forEach(x => { if (!I18N.en[x] || !I18N.ta[x]) k.push(x); }); return k; }""")
        ok('Tamil: every status / method label exists in both languages', not missing, missing)
        await pg.click('.topbar [data-action="set-lang"][data-v="en"]'); await w(300)

        ok('no JavaScript errors', not errs, errs[:3])
        await b.close()
    for n, passed, info in R: print(('PASS ' if passed else 'FAIL ') + n + ('' if passed else '  -> ' + info))
    print(sum(1 for r in R if r[1]), '/', len(R))
    sys.exit(0 if all(r[1] for r in R) else 1)

if __name__ == '__main__':
    asyncio.run(main())

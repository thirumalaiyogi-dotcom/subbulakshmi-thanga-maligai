'use strict';
/* =========================================================
   CUSTOMER · GOLD SAVINGS on the real backend (Supabase mode, Phase 5)
   Routes: #/savings  #/schemes  #/scheme/<id>  #/passbook/<enrollmentId>
           #/pay/<enrollmentId?>/<installmentId?>  #/transactions  #/redeem  #/goldrate
   The DEMO screens in savings.js stay unchanged and are used when no
   Supabase configuration exists.
   ========================================================= */
addStrings({
  svLiveSub: 'Your gold savings with Subbulakshmi Thanga Maligai.', svLoginTitle: 'Log in to see your savings',
  svLoginMsg: 'Your enrollments, payments and passbook are private to your account.', mySchemes: 'My savings schemes',
  browseSchemes: 'View schemes', payNow: 'Submit payment', schemesLiveSub: 'Scheme terms are shown exactly as approved by the store.', viewTerms: 'View details',
  enrollTitle: 'Request enrollment', enrollAgree: 'I have read the scheme terms above and request enrollment.', enrollSend: 'Send enrollment request',
  enrollSentTitle: 'Enrollment request sent', enrollSentMsg: 'The store will review your request. Your installment schedule appears after the store approves it.',
  enrollLoginMsg: 'Log in or register to request enrollment.', cancelRequest: 'Cancel request', cancelRequestQ: 'Cancel this enrollment request?', requestCancelled: 'Request cancelled.',
  payLiveTitle: 'Submit a UPI payment reference', payLiveSub: 'After paying by UPI, send the reference number here. The store verifies it against its bank statement.',
  payHowTitle: 'How to pay', payHow1: 'Pay only to the store\'s official UPI ID or QR code shown at the counter.', payHow2: 'Note the UPI transaction / reference number (UTR) from your payment app.',
  payHow3: 'Submit it here. Status stays "Pending verification" until the store confirms the money was received.', payHow4: 'Or pay at the store — staff will record it and give you a receipt number.',
  upiNotPaidNote: 'Submitting a reference does NOT mark the installment as paid. Only the store can verify a payment.',
  chooseEnrollment: 'Enrollment', chooseInstallment: 'Installment', nothingPayable: 'No installment is waiting for payment.',
  windowInfo: 'Approved payment window', amountRangeHint: 'Allowed', paidDate: 'Date you paid',
  confirmUpiTitle: 'Submit this reference?', confirmUpiMsg: 'The store will check this against its bank statement. The installment stays "Pending verification" until then.',
  upiSentTitle: 'Reference submitted — pending verification', upiSentMsg: 'Your installment is NOT paid yet. You will see "Verified" and a receipt number once the store confirms the money was received.',
  myPaymentsTitle: 'Payment history', myPaymentsSub: 'Every payment you submitted and every payment recorded at the store.',
  redeemLiveSub: 'Ask the store to redeem a scheme. Eligibility, value and charges follow the approved terms and are confirmed by the store.',
  redeemRequestOnly: 'This is a request only. No value is promised by the app.', redeemType: 'Redeem as', visitDateOpt: 'Preferred visit date (optional)',
  redeemSentTitle: 'Redemption request sent', redeemSentMsg: 'The store will review it and contact you.', noActiveEnrollments: 'You have no active enrollment to redeem.',
  myRequests: 'My redemption requests', cancelRedeemQ: 'Cancel this redemption request?',
  goldRateSub: 'The store\'s current rate, entered manually by the store.'
}, {
  svLiveSub: 'சுப்புலட்சுமி தங்க மாளிகையில் உங்கள் தங்கச் சேமிப்பு.', svLoginTitle: 'உங்கள் சேமிப்பைப் பார்க்க உள்நுழையவும்',
  svLoginMsg: 'உங்கள் பதிவுகள், தவணைகள், பாஸ்புக் ஆகியவை உங்கள் கணக்குக்கு மட்டுமே தெரியும்.', mySchemes: 'என் சேமிப்புத் திட்டங்கள்',
  browseSchemes: 'திட்டங்களைப் பார்', payNow: 'தவணையைச் சமர்ப்பி', schemesLiveSub: 'கடை அங்கீகரித்த விதிமுறைகளே இங்கே அப்படியே காட்டப்படுகின்றன.', viewTerms: 'விவரங்களைப் பார்',
  enrollTitle: 'பதிவுக் கோரிக்கை', enrollAgree: 'மேலே உள்ள திட்ட விதிமுறைகளைப் படித்தேன்; பதிவு செய்யக் கோருகிறேன்.', enrollSend: 'பதிவுக் கோரிக்கையை அனுப்பு',
  enrollSentTitle: 'பதிவுக் கோரிக்கை அனுப்பப்பட்டது', enrollSentMsg: 'கடை உங்கள் கோரிக்கையைப் பரிசீலிக்கும். கடை ஒப்புதல் அளித்த பிறகு தவணை அட்டவணை தோன்றும்.',
  enrollLoginMsg: 'பதிவுக் கோரிக்கைக்கு உள்நுழையவும் அல்லது கணக்கு உருவாக்கவும்.', cancelRequest: 'கோரிக்கையை ரத்து செய்', cancelRequestQ: 'இந்தப் பதிவுக் கோரிக்கையை ரத்து செய்யவா?', requestCancelled: 'கோரிக்கை ரத்து செய்யப்பட்டது.',
  payLiveTitle: 'UPI குறிப்பு எண்ணைச் சமர்ப்பிக்கவும்', payLiveSub: 'UPI மூலம் செலுத்திய பின் குறிப்பு எண்ணை இங்கே அனுப்பவும். கடை தனது வங்கி அறிக்கையுடன் சரிபார்க்கும்.',
  payHowTitle: 'எப்படிச் செலுத்துவது', payHow1: 'கடை கவுண்டரில் காட்டப்படும் அதிகாரப்பூர்வ UPI ID அல்லது QR குறியீட்டுக்கு மட்டுமே செலுத்தவும்.', payHow2: 'உங்கள் பணம் செலுத்தும் செயலியிலிருந்து UPI பரிவர்த்தனை / குறிப்பு எண்ணை (UTR) குறித்துக்கொள்ளவும்.',
  payHow3: 'அதை இங்கே சமர்ப்பிக்கவும். பணம் வந்ததைக் கடை உறுதிசெய்யும் வரை நிலை "சரிபார்ப்பில் உள்ளது" என்றே இருக்கும்.', payHow4: 'அல்லது கடையில் நேரடியாகச் செலுத்தலாம் — ஊழியர் பதிவு செய்து ரசீது எண் தருவார்.',
  upiNotPaidNote: 'குறிப்பு எண்ணைச் சமர்ப்பிப்பதால் தவணை செலுத்தப்பட்டதாகாது. கடை மட்டுமே பணத்தைச் சரிபார்க்க முடியும்.',
  chooseEnrollment: 'பதிவு', chooseInstallment: 'தவணை', nothingPayable: 'செலுத்த வேண்டிய தவணை எதுவும் இல்லை.',
  windowInfo: 'அங்கீகரிக்கப்பட்ட செலுத்தும் காலம்', amountRangeHint: 'அனுமதிக்கப்பட்டது', paidDate: 'செலுத்திய நாள்',
  confirmUpiTitle: 'இந்தக் குறிப்பு எண்ணைச் சமர்ப்பிக்கவா?', confirmUpiMsg: 'கடை இதைத் தனது வங்கி அறிக்கையுடன் சரிபார்க்கும். அதுவரை தவணை "சரிபார்ப்பில் உள்ளது" என்றே இருக்கும்.',
  upiSentTitle: 'குறிப்பு எண் சமர்ப்பிக்கப்பட்டது — சரிபார்ப்பில்', upiSentMsg: 'உங்கள் தவணை இன்னும் செலுத்தப்பட்டதாகக் கணக்கில் வரவில்லை. பணம் வந்ததைக் கடை உறுதிசெய்ததும் "சரிபார்க்கப்பட்டது" நிலையும் ரசீது எண்ணும் தெரியும்.',
  myPaymentsTitle: 'தவணை வரலாறு', myPaymentsSub: 'நீங்கள் சமர்ப்பித்த மற்றும் கடையில் பதிவான அனைத்துத் தவணைகளும்.',
  redeemLiveSub: 'ஒரு திட்டத்தை மீட்கக் கடையிடம் கோருங்கள். தகுதி, மதிப்பு, கட்டணங்கள் அங்கீகரிக்கப்பட்ட விதிமுறைகளின்படி கடையால் உறுதிசெய்யப்படும்.',
  redeemRequestOnly: 'இது ஒரு கோரிக்கை மட்டுமே. செயலி எந்த மதிப்பையும் உறுதியளிக்கவில்லை.', redeemType: 'மீட்கும் முறை', visitDateOpt: 'விரும்பும் வருகை நாள் (விருப்பம்)',
  redeemSentTitle: 'மீட்புக் கோரிக்கை அனுப்பப்பட்டது', redeemSentMsg: 'கடை பரிசீலித்து உங்களைத் தொடர்புகொள்ளும்.', noActiveEnrollments: 'மீட்க உங்களிடம் செயலில் உள்ள பதிவு எதுவும் இல்லை.',
  myRequests: 'என் மீட்புக் கோரிக்கைகள்', cancelRedeemQ: 'இந்த மீட்புக் கோரிக்கையை ரத்து செய்யவா?',
  goldRateSub: 'கடை கைமுறையாக உள்ளிட்ட தற்போதைய விலை.'
});

const svLoginGate = () => emptyState('user', t('svLoginTitle'), t('svLoginMsg'), '<button class="btn btn-primary" data-go="account">' + t('loginOrRegister') + '</button>');

/* ---------- #/savings ---------- */
function pageSavingsLive() {
  return pageHead(t('n_savings'), t('svLiveSub')) +
    '<div id="svRates">' + skel(1) + '</div>' +
    (Auth.user
      ? '<section aria-labelledby="msT"><div class="section-head"><h2 class="h2" id="msT">' + t('mySchemes') + '</h2><button class="link-btn" data-go="schemes">' + t('browseSchemes') + ic('right') + '</button></div><div id="svMine">' + skel(2) + '</div></section>'
      : svLoginGate()) +
    '<div class="qa-grid mt">' + [['pay', 'wallet', 'payNow'], ['transactions', 'clock', 'history'], ['redeem', 'gift', 'redemption'], ['schemes', 'layers', 'schemes']]
      .map(([to, i, l]) => '<button class="qa" data-go="' + to + '"><span class="qa-ic">' + ic(i) + '</span>' + t(l) + '</button>').join('') + '</div>';
}
function fillSavingsLive(token) {
  fillAsync('#svRates', token, () => SavingsApi.currentRates(), svRateCard, 'retry');
  if (!Auth.user) return;
  fillAsync('#svMine', token, async () => { await svSchemeMap(); return SavingsApi.myEnrollments(); }, list => {
    if (!list.length) return emptyState('layers', t('noEnrollmentsLive'), t('schemesLiveSub'), '<button class="btn btn-primary" data-go="schemes">' + t('browseSchemes') + '</button>');
    return '<div class="enr-list">' + list.map(e => {
      const tot = e.totals || {};
      return '<article class="enr-card enr-card--live"><div class="enr-top"><div class="enr-name"><strong>' + esc(svSchemeName(e.scheme_id)) + '</strong><small class="mono">' + esc(e.enrollment_number) + '</small></div>' + svChip('es', e.status) + '</div>' +
        (e.status === 'active' || e.status === 'redeemed' ? progressBar(Number(tot.paid_count || 0), e.duration_months, t('progress')) : '') +
        '<div class="enr-foot"><span>' + (tot.paid_count || 0) + ' / ' + e.duration_months + ' · ' + (e.contribution_type === 'fixed' ? inr(e.fixed_amount) + '/' + t('monthly').toLowerCase() : t('ct_flexible')) + '</span><strong>' + inr(tot.verified_total || 0) + '</strong></div>' +
        (Number(tot.pending_count || 0) ? '<p class="small"><span class="chip chip--warn">' + t('ps_pending_verification') + ' · ' + inr(tot.pending_total) + '</span></p>' : '') +
        '<div class="row-actions"><button class="btn btn-outline btn-sm" data-go="passbook/' + e.id + '">' + ic('book') + t('openPassbook') + '</button>' +
          (e.status === 'active' ? '<button class="btn btn-primary btn-sm" data-go="pay/' + e.id + '">' + ic('wallet') + t('payNow') + '</button>' : '') + '</div></article>';
    }).join('') + '</div>';
  }, 'retry');
}

/* ---------- #/schemes ---------- */
function pageSchemesLive() { return pageHead(t('schemes'), t('schemesLiveSub')) + '<div id="svSchemes">' + skel(2) + '</div>'; }
function fillSchemesLive(token) {
  fillAsync('#svSchemes', token, () => SavingsApi.schemes(), list => {
    const shown = list.filter(s => s.approval_status !== 'retired');
    if (!shown.length) return emptyState('layers', t('noResults'), t('noResultsHint'));
    return '<div class="scheme-grid">' + shown.map(s =>
      '<article class="scheme-card scheme-card--' + esc(s.id) + '"><div class="scheme-orn">' + emblem() + '</div>' +
        '<p class="eyebrow">' + t('goldSavingsScheme') + '</p><h2>' + esc(svName(s)) + '</h2>' +
        '<p>' + svChip('ss', s.approval_status) + (s.approval_status === 'approved' ? ' <span class="chip chip--' + (s.enrollment_open ? 'ok' : 'neutral') + '">' + t(s.enrollment_open ? 'enrollmentOpen' : 'enrollmentClosed') + '</span>' : '') + '</p>' +
        (s.approval_status === 'approved' ? svTermsList(s) : '<p class="tagline">' + t('termsPending') + '</p>') +
        '<button class="btn btn-primary btn-block" data-go="scheme/' + esc(s.id) + '">' + t('viewTerms') + ic('right') + '</button></article>').join('') + '</div>';
  }, 'retry');
}

/* ---------- #/scheme/<id> ---------- */
function pageSchemeLive(id) { return backBtn('schemes') + '<div id="svScheme">' + skel(3) + '</div>'; }
function fillSchemeLive(token) {
  fillAsync('#svScheme', token, () => SavingsApi.scheme(route.arg), s => {
    if (!s) return emptyState('layers', t('noResults'), t('noResultsHint'));
    UI.svScheme = s;
    const approved = s.approval_status === 'approved';
    const desc = lang === 'ta' ? s.description_ta : s.description_en;
    let enroll;
    if (!approved || !s.enrollment_open) enroll = '<div class="note note--warn">' + ic('alert') + '<span>' + t(approved ? 'enrollmentClosed' : 'termsPending') + '</span></div>';
    else if (!Auth.user) enroll = emptyState('user', t('enrollTitle'), t('enrollLoginMsg'), '<button class="btn btn-primary" data-go="account">' + t('loginOrRegister') + '</button>');
    else enroll = '<form class="panel" data-form="sv-enroll" data-scheme="' + esc(s.id) + '" novalidate><h2 class="h3">' + t('enrollTitle') + '</h2>' +
      (s.contribution_type === 'fixed'
        ? svFixedAmountField('seAmt', s)
        : '<div class="note note--info">' + ic('info') + '<span>' + t('enrollFlexNote') + '</span></div>') +
      '<label class="check"><input type="checkbox" id="seAgree" name="seAgree" aria-describedby="seAgree-err"><span>' + t('enrollAgree') + '</span></label><p class="err" id="seAgree-err" role="alert"></p>' +
      '<p class="err" id="seErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + t('enrollSend') + '</button></form>';
    return '<section class="detail-hero detail-hero--' + esc(s.id) + '"><div class="hero-orn">' + emblem() + '</div><p class="eyebrow">' + t('goldSavingsScheme') + '</p>' +
        '<h1>' + esc(svName(s)) + '</h1><p>' + svChip('ss', s.approval_status) + '</p>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</section>' +
      '<div class="two-col"><section class="panel"><h2 class="h3">' + t('schemeTerms') + '</h2>' + svTermsList(s) +
          (approved && s.approved_at ? '<p class="small muted">' + t('termsApprovedOn') + ': ' + svTime(s.approved_at) + '</p>' : '') + '</section>' +
        '<section class="panel"><h2 class="h3">' + t('terms') + '</h2>' + (svTermsText(s) || '<p class="muted">' + t('svNotSet') + '</p>') + '</section></div>' + enroll;
  }, 'retry');
}
FORMS['sv-enroll'] = async f => {
  const amtSel = f.elements.seAmt, agree = f.elements.seAgree.checked;
  let ok = true;
  const sch = UI.svScheme;
  if (amtSel) ok = setErr(f, 'seAmt', sch ? svFixedAmountErr(sch, amtSel.value) : (amtSel.value ? '' : t('errSelectAmount'))) && ok;
  ok = setErr(f, 'seAgree', agree ? '' : t('errAgree')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    const r = await SavingsApi.requestEnrollment(f.dataset.scheme, amtSel ? svAmountValue(amtSel.value) : null);
    toast(t('enrollSentTitle') + ' · ' + r.enrollment_number, 'ok');
    go('passbook/' + r.enrollment_id);
  } catch (e) { $('#seErr').textContent = errorText(toApiError(e)); }
  finally { if (document.contains(btn)) btn.disabled = false; }
};

/* ---------- #/passbook/<id> ---------- */
function pagePassbookLive(id) {
  if (!Auth.user) return pageHead(t('digitalPassbook')) + svLoginGate();
  return pageHead(t('digitalPassbook')) + '<div id="svPassbook">' + skel(4) + '</div>';
}
function fillPassbookLive(token) {
  if (!Auth.user) return;
  fillAsync('#svPassbook', token, async () => {
    await svSchemeMap();
    if (!route.arg) { const list = await SavingsApi.myEnrollments(); return { list }; }
    return { b: await SavingsApi.passbook(route.arg) };
  }, r => {
    if (r.list) {
      if (!r.list.length) return emptyState('book', t('noEnrollmentsLive'), t('schemesLiveSub'), '<button class="btn btn-primary" data-go="schemes">' + t('browseSchemes') + '</button>');
      return '<div class="enr-list">' + r.list.map(e => '<button class="enr-card" data-go="passbook/' + e.id + '"><div class="enr-top"><div class="enr-name"><strong>' + esc(svSchemeName(e.scheme_id)) + '</strong><small class="mono">' + esc(e.enrollment_number) + '</small></div>' + svChip('es', e.status) + '</div></button>').join('') + '</div>';
    }
    const b = r.b;
    if (!b) return emptyState('book', t('noResults'), t('noResultsHint'), '<button class="btn btn-outline" data-go="passbook">' + t('back') + '</button>');
    const e = b.enrollment;
    const actions = '<div class="row-actions mt">' +
      (e.status === 'active' ? '<button class="btn btn-primary" data-go="pay/' + e.id + '">' + ic('wallet') + t('payNow') + '</button><button class="btn btn-outline" data-go="redeem">' + ic('gift') + t('redemption') + '</button>' : '') +
      (e.status === 'pending_approval' ? '<button class="btn btn-outline" data-action="sv-cancel-enr" data-id="' + e.id + '">' + ic('x') + t('cancelRequest') + '</button>' : '') + '</div>';
    return svPassbook(b, { instAction: i => (e.status === 'active' && i.status === 'pending_payment') ? '<button class="btn btn-outline btn-sm" data-go="pay/' + e.id + '/' + i.id + '">' + t('payNow') + '</button>' : '' }) +
      (e.decision_note && e.status === 'rejected' ? '<div class="note note--err">' + ic('alert') + '<span>' + t('decisionNote') + ': ' + esc(e.decision_note) + '</span></div>' : '') +
      '<section class="panel mt"><h2 class="h3">' + t('schemeTerms') + '</h2>' + svTermsList(e.terms_snapshot || {}) + svTermsText(e.terms_snapshot || {}) + '</section>' + actions;
  }, 'retry');
}
ACTIONS['sv-cancel-enr'] = async b => {
  if (!(await confirmDialog({ title: t('cancelRequestQ'), message: t('cancelRequestQ'), confirmText: t('cancelRequest'), danger: true }))) return;
  try { await SavingsApi.cancelEnrollment(b.dataset.id); toast(t('requestCancelled')); render(); } catch (e) { toast(errorText(toApiError(e)), 'err'); }
};

/* ---------- #/pay/<enrollmentId?>/<installmentId?> ---------- */
UI.svPayResult = null;
function pagePayLive() {
  if (!Auth.user) return pageHead(t('payLiveTitle')) + svLoginGate();
  return pageHead(t('payLiveTitle'), t('payLiveSub')) +
    '<div class="note note--warn" role="note">' + ic('alert') + '<span>' + t('upiNotPaidNote') + '</span></div>' +
    (UI.svPayResult ? '<div class="result result--info" id="svPayResult" tabindex="-1">' + ic('clock') + '<div><h3>' + t('upiSentTitle') + '</h3><p>' + t('upiSentMsg') + '</p>' +
      '<dl class="kv"><dt>' + t('upiRef') + '</dt><dd class="mono">' + esc(UI.svPayResult.ref) + '</dd><dt>' + t('amount') + '</dt><dd>' + inr(UI.svPayResult.amount) + '</dd><dt>' + t('status') + '</dt><dd>' + svChip('ps', 'pending_verification') + '</dd></dl>' +
      '<div class="row-actions"><button class="btn btn-outline btn-sm" data-go="transactions">' + t('history') + '</button><button class="btn btn-outline btn-sm" data-go="passbook/' + UI.svPayResult.enr + '">' + t('passbook') + '</button></div></div></div>' : '') +
    '<div class="pay-grid"><section class="panel"><h2 class="h3">' + t('payHowTitle') + '</h2><ol class="steps"><li>' + t('payHow1') + '</li><li>' + t('payHow2') + '</li><li>' + t('payHow3') + '</li><li>' + t('payHow4') + '</li></ol></section>' +
    '<div id="svPayForm">' + skel(3) + '</div></div>';
}
function fillPayLive(token) {
  if (!Auth.user) return;
  fillAsync('#svPayForm', token, async () => {
    await svSchemeMap();
    const active = (await SavingsApi.myEnrollments()).filter(e => e.status === 'active');
    if (!active.length) return { active };
    const sel = active.find(e => e.id === route.arg) || active[0];
    const b = await SavingsApi.passbook(sel.id);
    return { active, sel, b };
  }, r => {
    if (!r.active.length) return emptyState('wallet', t('nothingPayable'), t('noEnrollmentsLive'), '<button class="btn btn-outline" data-go="schemes">' + t('browseSchemes') + '</button>');
    const e = r.b.enrollment, open = r.b.installments.filter(i => i.status === 'pending_payment');
    const selInst = open.find(i => i.id === route.arg2) || open[0];
    const snap = e.terms_snapshot || {};
    const enrSel = '<div class="field"><label for="spEnr">' + t('chooseEnrollment') + '</label><select id="spEnr" name="spEnr" data-change="sv-pay-enr">' +
      r.active.map(x => '<option value="' + x.id + '"' + (x.id === e.id ? ' selected' : '') + '>' + esc(svSchemeName(x.scheme_id)) + ' · ' + esc(x.enrollment_number) + '</option>').join('') + '</select></div>';
    if (!selInst) return '<div class="panel">' + enrSel + emptyState('checkCircle', t('nothingPayable'), t('realDataNote')) + '</div>';
    const fixed = e.contribution_type === 'fixed';
    return '<form class="panel" data-form="sv-pay" data-enr="' + e.id + '" novalidate><h2 class="h3">' + t('paymentDetails') + '</h2>' + enrSel +
      '<div class="field"><label for="spInst">' + t('chooseInstallment') + '</label><select id="spInst" name="spInst">' +
        open.map(i => '<option value="' + i.id + '"' + (i.id === selInst.id ? ' selected' : '') + '>' + t('installmentNo') + ' ' + i.installment_no + ' · ' + svMonth(i.due_month) + '</option>').join('') + '</select></div>' +
      (snap.payment_window_start_day ? '<div class="kv-row"><span>' + t('windowInfo') + '</span><b>' + tf('dayRange', { a: snap.payment_window_start_day, b: snap.payment_window_end_day }) + '</b></div>' : '') +
      field({ id: 'spAmt', label: t('amount') + ' (₹)', value: fixed ? Number(e.fixed_amount) : '',
        hint: fixed ? t('amountFixedHint') : t('amountRangeHint') + ': ' + (e.min_installment != null ? t('fromAmt') + ' ' + inr(e.min_installment) : '') + (e.max_installment != null ? ' · ' + t('upTo') + ' ' + inr(e.max_installment) : ''),
        attrs: 'inputmode="decimal" maxlength="10" autocomplete="off"' + (fixed ? ' readonly' : '') }) +
      field({ id: 'spRef', label: t('upiRef'), hint: t('payRefHint'), attrs: 'autocomplete="off" maxlength="40" autocapitalize="characters" spellcheck="false"' }) +
      field({ id: 'spDate', label: t('paidDate'), type: 'date', value: todayISO(), attrs: 'max="' + todayISO() + '" min="' + addDays(-90) + '"' }) +
      '<p class="err" id="spErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + ic('shield') + t('submitRef') + '</button></form>';
  }, 'retry');
}
CHANGES['sv-pay-enr'] = el => { UI.svPayResult = null; go('pay/' + el.value); };
FORMS['sv-pay'] = async f => {
  const amt = f.elements.spAmt.value.replace(/[,\s₹]/g, ''), ref = f.elements.spRef.value.toUpperCase().replace(/[\s-]/g, ''), date = f.elements.spDate.value;
  let ok = true;
  ok = setErr(f, 'spAmt', /^\d{1,8}(\.\d{1,2})?$/.test(amt) && Number(amt) > 0 ? '' : t('errAmount')) && ok;
  ok = setErr(f, 'spRef', /^[A-Z0-9]{6,35}$/.test(ref) ? '' : t('err_invalid_reference')) && ok;
  ok = setErr(f, 'spDate', date && date <= todayISO() && date >= addDays(-90) ? '' : t('err_invalid_payment_date')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const instSel = f.elements.spInst;
  if (!(await confirmDialog({ title: t('confirmUpiTitle'), message: esc(instSel.options[instSel.selectedIndex].text) + '<br>' + t('amount') + ': <b>' + inr(amt) + '</b><br>' + t('upiRef') + ': <b class="mono">' + esc(ref) + '</b><br><br>' + t('confirmUpiMsg'), confirmText: t('submitRef') }))) return;
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    await SavingsApi.submitUpi(instSel.value, Number(amt), ref, date);
    UI.svPayResult = { ref, amount: Number(amt), enr: f.dataset.enr };
    render();
    const box = $('#svPayResult'); if (box) { box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'center' }); }
  } catch (e) { const el = $('#spErr'); if (el) el.textContent = errorText(toApiError(e)); }
  finally { if (document.contains(btn)) btn.disabled = false; }
};

/* ---------- #/transactions ---------- */
UI.svTxStatus = 'all';
function pageTransactionsLive() {
  if (!Auth.user) return pageHead(t('myPaymentsTitle')) + svLoginGate();
  return pageHead(t('myPaymentsTitle'), t('myPaymentsSub')) +
    '<div class="chips" role="group" aria-label="' + t('status') + '">' + ['all', 'pending_verification', 'verified', 'rejected', 'voided']
      .map(v => '<button class="fchip" data-action="sv-tx-status" data-v="' + v + '" aria-pressed="' + (UI.svTxStatus === v) + '">' + (v === 'all' ? t('all') : t('ps_' + v)) + '</button>').join('') + '</div>' +
    '<div id="svTx">' + skel(4) + '</div><p class="muted small">' + t('realDataNote') + '</p>';
}
function fillTransactionsLive(token) {
  if (!Auth.user) return;
  fillAsync('#svTx', token, () => SavingsApi.myPayments(), list => {
    const rows = list.filter(p => UI.svTxStatus === 'all' || p.status === UI.svTxStatus);
    if (!rows.length) return emptyState('clock', t('noPayments'), t('realDataNote'));
    return svPaymentsTable(rows, null, {});
  }, 'retry');
}
ACTIONS['sv-tx-status'] = b => { UI.svTxStatus = b.dataset.v; render(); };

/* ---------- #/redeem ---------- */
function pageRedeemLive() {
  if (!Auth.user) return pageHead(t('redeemTitle')) + svLoginGate();
  return pageHead(t('redeemTitle'), t('redeemLiveSub')) + '<div class="two-col"><div id="svRedeemForm">' + skel(3) + '</div>' +
    '<section aria-labelledby="mrT"><h2 class="h2 section-head" id="mrT">' + t('myRequests') + '</h2><div id="svRedeemList">' + skel(2) + '</div></section></div>';
}
function fillRedeemLive(token) {
  if (!Auth.user) return;
  fillAsync('#svRedeemForm', token, async () => { await svSchemeMap(); return SavingsApi.myEnrollments(); }, list => {
    const active = list.filter(e => e.status === 'active');
    if (!active.length) return emptyState('gift', t('noActiveEnrollments'), t('redeemRequestOnly'));
    return '<form class="panel" data-form="sv-redeem" novalidate><div class="note note--info">' + ic('info') + '<span>' + t('redeemRequestOnly') + '</span></div>' +
      '<div class="field mt"><label for="srEnr">' + t('chooseEnrollment') + '</label><select id="srEnr" name="srEnr">' + active.map(e => '<option value="' + e.id + '">' + esc(svSchemeName(e.scheme_id)) + ' · ' + esc(e.enrollment_number) + ' · ' + inr((e.totals || {}).verified_total || 0) + '</option>').join('') + '</select></div>' +
      '<fieldset class="field"><legend>' + t('redeemType') + '</legend><div class="choice-grid">' +
        ['jewellery', 'coin'].map((v, i) => '<label class="choice"><input type="radio" name="srType" value="' + v + '"' + (i === 0 ? ' checked' : '') + '><span class="choice-box">' + ic(v === 'coin' ? 'coins' : 'gift') + '<b>' + t(v === 'coin' ? 'goldCoin' : 'jewellery') + '</b></span></label>').join('') + '</div></fieldset>' +
      field({ id: 'srPref', label: t('preference'), required: false, hint: t('prefHint'), attrs: 'maxlength="200" autocomplete="off"' }) +
      field({ id: 'srDate', label: t('visitDateOpt'), type: 'date', required: false, attrs: 'min="' + todayISO() + '" max="' + addDays(90) + '"' }) +
      '<p class="err" id="srErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + t('submitRequest') + '</button></form>';
  }, 'retry');
  fillAsync('#svRedeemList', token, async () => { await svSchemeMap(); return SavingsApi.myRedemptions(); }, list => {
    if (!list.length) return emptyState('file', t('noRequests'), t('noRequestsHint'));
    return '<div class="req-list">' + list.map(r => '<article class="req"><div class="req-head"><div><strong class="mono">' + esc(r.request_number) + '</strong><small>' + (r.savings_enrollments ? esc(svSchemeName(r.savings_enrollments.scheme_id)) + ' · ' + esc(r.savings_enrollments.enrollment_number) : '') + '</small></div>' + svChip('rs', r.status) + '</div>' +
      '<dl class="kv mt"><dt>' + t('type') + '</dt><dd>' + t(r.redemption_type === 'coin' ? 'goldCoin' : 'jewellery') + '</dd>' + (r.preference ? '<dt>' + t('preference') + '</dt><dd>' + esc(r.preference) + '</dd>' : '') +
        (r.preferred_visit_date ? '<dt>' + t('visitDate') + '</dt><dd>' + fmtDate(r.preferred_visit_date) + '</dd>' : '') + '<dt>' + t('requestedOn') + '</dt><dd>' + svTime(r.requested_at) + '</dd>' +
        '<dt>' + t('paidTotal') + '</dt><dd>' + inr(r.verified_total_at_request) + '</dd>' + (r.decision_note ? '<dt>' + t('decisionNote') + '</dt><dd>' + esc(r.decision_note) + '</dd>' : '') + '</dl>' +
      (r.status === 'pending' ? '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-action="sv-cancel-rdm" data-id="' + r.id + '">' + ic('x') + t('cancelRequest') + '</button></div>' : '') + '</article>').join('') + '</div>';
  }, 'retry');
}
FORMS['sv-redeem'] = async f => {
  const pref = f.elements.srPref.value.trim(), date = f.elements.srDate.value, type = (f.querySelector('input[name="srType"]:checked') || {}).value;
  let ok = setErr(f, 'srDate', !date || (date >= todayISO() && date <= addDays(90)) ? '' : t('err_invalid_visit_date'));
  if (!ok) { focusFirstInvalid(f); return; }
  if (!(await confirmDialog({ title: t('confirmRedeemTitle'), message: t(type === 'coin' ? 'goldCoin' : 'jewellery') + (date ? '<br>' + t('visitDate') + ': ' + fmtDate(date) : '') + '<br><br>' + t('redeemRequestOnly'), confirmText: t('submitRequest') }))) return;
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    const r = await SavingsApi.requestRedemption(f.elements.srEnr.value, type, pref, date || null);
    toast(t('redeemSentTitle') + ' · ' + r.request_number, 'ok'); render();
  } catch (e) { const el = $('#srErr'); if (el) el.textContent = errorText(toApiError(e)); }
  finally { if (document.contains(btn)) btn.disabled = false; }
};
ACTIONS['sv-cancel-rdm'] = async b => {
  if (!(await confirmDialog({ title: t('cancelRedeemQ'), message: t('cancelRedeemQ'), confirmText: t('cancelRequest'), danger: true }))) return;
  try { await SavingsApi.cancelRedemption(b.dataset.id); toast(t('requestCancelled')); render(); } catch (e) { toast(errorText(toApiError(e)), 'err'); }
};

/* ---------- #/goldrate ---------- */
function pageGoldRateLive() { return pageHead(t('goldRateTitle'), t('goldRateSub')) + '<div id="svRateBox">' + skel(1) + '</div>'; }
function fillGoldRateLive(token) { fillAsync('#svRateBox', token, () => SavingsApi.currentRates(), svRateCard, 'retry'); }

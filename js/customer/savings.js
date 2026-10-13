'use strict';
/* =========================================================
   CUSTOMER · SAVINGS — schemes, scheme detail, enrollment, passbook,
   transaction history, payment reference, redemption (preserved & migrated)
   ========================================================= */
function enrCard(e) {
  const s = summary(e), sc = SCHEMES[e.scheme];
  return '<button class="enr-card" data-go="passbook/' + e.id + '" aria-label="' + esc(L(sc.name)) + ', ' + e.id + '">' +
    '<div class="enr-top"><span class="enr-badge enr-badge--' + e.scheme + '" aria-hidden="true">' + sc.code + '</span>' +
    '<div class="enr-name"><strong>' + L(sc.short) + '</strong><small class="mono">' + e.id + '</small></div>' + statusChip(s.status) + '</div>' +
    progressBar(s.verifiedCount, 12, t('progress')) +
    '<div class="enr-foot"><span>' + s.verifiedCount + ' ' + t('paidOf') + (e.fixedAmount ? ' · ' + inr(e.fixedAmount) + '/' + t('monthly').toLowerCase() : '') + '</span><strong>' + inr(s.verifiedAmt) + '</strong></div></button>';
}
function txRow(x) {
  const icn = x.status === 'verified' ? 'check' : x.status === 'pending' ? 'clock' : 'x';
  return '<li class="tx"><div class="tx-ic tx-ic--' + x.status + '">' + ic(icn) + '</div>' +
    '<div class="tx-main"><strong>' + L(SCHEMES[x.scheme].short) + ' · ' + fmtMonth(x.month) + '<span class="demo-mini">DEMO</span></strong>' +
    '<small>' + fmtDate(x.date) + ' · <span class="mono">' + (x.receipt || t('noReceipt')) + '</span></small></div>' +
    '<div class="tx-end"><b>' + inr(x.amount) + '</b>' + statusChip(x.status) + '</div></li>';
}

function pageSavings() {
  const me = getCust(ME), enrs = enrOf(ME), sums = enrs.map(e => summary(e));
  const verified = sums.reduce((a, s) => a + s.verifiedAmt, 0), pending = sums.reduce((a, s) => a + s.pendingAmt, 0);
  const weight = sums.reduce((a, s) => a + (s.weight || 0), 0);
  const w = windowInfo();
  const recent = S.transactions.filter(x => x.customerId === ME).sort(byDateDesc).slice(0, 4);
  const reminder = prefs.notify
    ? '<section class="reminder' + (w.open ? ' is-open' : '') + '" aria-label="' + t('reminder') + '"><div class="rem-ic">' + ic('calendar') + '</div>' +
      '<div class="rem-txt"><b>' + t('reminder') + '</b><span>' + (w.open ? t('windowOpen') + ' · ' + t('windowClosesOn') + ' ' + fmtDate(w.end) : t('nextWindow') + ': ' + fmtDate(w.start) + ' – ' + fmtDate(w.end)) + '</span></div>' +
      '<button class="btn btn-primary btn-sm" data-go="pay">' + t('payInstallment') + '</button></section>'
    : '<p class="muted small">' + t('hideReminder') + '</p>';
  const qa = [['pay', 'wallet', 'payInstallment'], ['passbook', 'book', 'digitalPassbook'], ['redeem', 'gift', 'redemption'], ['schemes', 'layers', 'exploreSchemes']]
    .map(([to, i, l]) => '<button class="qa" data-go="' + to + '"><span class="qa-ic">' + ic(i) + '</span>' + t(l) + '</button>').join('');
  return '<section class="hello"><p class="eyebrow">' + t('vanakkam') + '</p><h1 class="h1">' + esc(custName(me)) + '</h1><p class="muted small">' + fmtDate(todayISO()) + ' · <span class="mono">' + ME + '</span></p></section>' +
    '<div class="grid-2"><div class="stack">' +
      '<section class="hero-card" aria-labelledby="ovT"><div class="hero-orn">' + emblem() + '</div>' +
        '<div class="hero-head"><h2 id="ovT">' + t('overview') + '</h2><span class="tag-demo">DEMO</span></div>' +
        '<div class="hero-amount"><span>' + t('verifiedTotal') + '</span><strong>' + inr(verified) + '</strong></div>' +
        '<div class="hero-grid"><div><span>' + t('pendingTotal') + '</span><b>' + inr(pending) + '</b></div><div><span>' + t('goldWeight') + '</span><b>' + grams(weight) + '</b></div><div><span>' + t('activeSchemes') + '</span><b>' + enrs.length + '</b></div></div>' +
        '<p class="hero-note">' + ic('info') + t('notVerifiedBalance') + '</p></section>' +
      reminder +
      '<section aria-labelledby="qaT"><h2 class="h2 section-head" id="qaT">' + t('quickActions') + '</h2><div class="qa-grid">' + qa + '</div></section>' +
    '</div><div class="stack">' +
      '<section aria-labelledby="ysT"><div class="section-head"><h2 class="h2" id="ysT">' + t('yourSchemes') + '</h2><button class="link-btn" data-go="schemes">' + t('exploreSchemes') + ic('right') + '</button></div>' +
        (enrs.length ? '<div class="enr-list">' + enrs.map(enrCard).join('') + '</div>' : emptyState('layers', t('noEnrollments'), t('noEnrollmentsHint'), '<button class="btn btn-primary" data-go="schemes">' + t('exploreSchemes') + '</button>')) + '</section>' +
      '<section aria-labelledby="rtT"><div class="section-head"><h2 class="h2" id="rtT">' + t('recentTx') + '</h2><button class="link-btn" data-go="transactions">' + t('viewAll') + ic('right') + '</button></div>' +
        (recent.length ? '<ul class="tx-list">' + recent.map(txRow).join('') + '</ul>' : emptyState('clock', t('noResults'), t('noResultsHint'))) + '</section>' +
    '</div></div>';
}

function schemeFacts(sc, cls) {
  return '<dl class="facts ' + (cls || '') + '">' +
    '<div class="fact"><dt>' + t('duration') + '</dt><dd>' + t('months12') + '</dd></div>' +
    '<div class="fact"><dt>' + t('paymentWindow') + '</dt><dd>' + t('window17') + '</dd></div>' +
    '<div class="fact"><dt>' + t('contribution') + '</dt><dd>' + (sc.type === 'fixed' ? t('fixedShort') : t('flexibleShort')) + '</dd></div>' +
    '<div class="fact"><dt>' + t('redemptionShort') + '</dt><dd>' + t('month13') + '</dd></div></dl>';
}
function pageSchemes() {
  return pageHead(t('schemes'), t('schemesSub')) +
    '<div class="scheme-grid">' + Object.values(SCHEMES).map(sc =>
      '<article class="scheme-card scheme-card--' + sc.id + '"><div class="scheme-orn">' + emblem() + '</div>' +
      '<p class="eyebrow">' + t('goldSavingsScheme') + '</p><h2>' + L(sc.short) + '</h2><p class="tagline">' + L(sc.tagline) + '</p>' +
      schemeFacts(sc) +
      '<button class="btn btn-primary btn-block" data-go="scheme/' + sc.id + '">' + t('viewDetails') + ic('right') + '</button></article>').join('') + '</div>' +
    '<p class="muted small">' + t('termsPlaceholder') + '</p>' + '<div class="contact-actions">' + waButton('savings') + '</div>';
}
function pageScheme(id) {
  const sc = SCHEMES[id];
  if (!sc) return backBtn('schemes') + emptyState('layers', t('noResults'), t('noResultsHint'));
  return backBtn('schemes') +
    '<section class="detail-hero detail-hero--' + id + '"><div class="hero-orn">' + emblem() + '</div><p class="eyebrow">' + t('goldSavingsScheme') + ' · ' + t('months12') + '</p>' +
      '<h1>' + L(sc.name) + '</h1><p>' + L(sc.tagline) + '</p>' +
      '<button class="btn btn-gold" data-action="enroll" data-scheme="' + id + '">' + t('enrollNow') + ic('right') + '</button></section>' +
    schemeFacts(sc, 'detail-facts') +
    '<div class="two-col">' +
      '<section class="panel"><h2 class="h3">' + t('aboutScheme') + '</h2><p class="muted">' + L(sc.desc) + '</p><p><b>' + t('contribution') + ':</b> ' + L(sc.contribution) + '</p></section>' +
      '<section class="panel"><h2 class="h3">' + t('paymentRules') + '</h2><ul class="ticks">' + sc.rules.map(r => '<li>' + L(r) + '</li>').join('') + '</ul></section>' +
      '<section class="panel"><h2 class="h3">' + t('redemptionInfo') + '</h2><p class="muted">' + L(REDEMPTION_TEXT) + '</p></section>' +
      '<section class="panel"><h2 class="h3">' + t('terms') + '</h2><ol class="terms-list">' + schemeTerms(sc).map(r => '<li>' + L(r) + '</li>').join('') + '</ol><p class="muted small">' + t('termsPlaceholder') + '</p></section>' +
    '</div>' +
    '<div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="enroll" data-scheme="' + id + '">' + t('enrollNow') + '</button></div>';
}

function pagePassbook(arg) {
  const enrs = enrOf(ME);
  if (!enrs.length) return pageHead(t('digitalPassbook')) + emptyState('book', t('noEnrollments'), t('noEnrollmentsHint'), '<button class="btn btn-primary" data-go="schemes">' + t('exploreSchemes') + '</button>');
  const e = enrs.find(x => x.id === arg) || enrs[0];
  const tabs = enrs.length > 1 ? '<div class="pb-tabs" role="tablist" aria-label="' + t('yourSchemes') + '">' + enrs.map(x => '<button class="pb-tab" role="tab" aria-selected="' + (x.id === e.id) + '" aria-current="' + (x.id === e.id) + '" data-go="passbook/' + x.id + '">' + L(SCHEMES[x.scheme].short) + ' · <span class="mono">' + x.id.slice(-4) + '</span></button>').join('') + '</div>' : '';
  return pageHead(t('digitalPassbook')) + tabs + passbookView(e);
}

function pageTransactions() {
  const chips = ['all', 'verified', 'pending', 'rejected'].map(v => '<button class="fchip" data-action="tx-status" data-v="' + v + '" aria-pressed="' + (UI.txStatus === v) + '">' + (v === 'all' ? t('all') : t('st_' + v)) + '</button>').join('');
  return pageHead(t('transactions'), t('txSub')) +
    '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchRef') + '" aria-label="' + t('searchRef') + '" value="' + esc(UI.txQ) + '" data-filter="tx"></div>' +
    '<select class="select" aria-label="' + t('scheme') + '" data-change="tx-scheme"><option value="all">' + t('all') + ' · ' + t('schemes') + '</option>' + Object.values(SCHEMES).map(sc => '<option value="' + sc.id + '"' + (UI.txScheme === sc.id ? ' selected' : '') + '>' + L(sc.short) + '</option>').join('') + '</select></div>' +
    '<div class="chips" role="group" aria-label="' + t('status') + '">' + chips + '</div>' +
    '<div id="txList">' + skel(4) + '</div>';
}
function renderTxList() {
  const box = $('#txList'); if (!box) return;
  const q = UI.txQ.trim().toLowerCase();
  const rows = S.transactions.filter(x => x.customerId === ME)
    .filter(x => UI.txStatus === 'all' || x.status === UI.txStatus)
    .filter(x => UI.txScheme === 'all' || x.scheme === UI.txScheme)
    .filter(x => !q || [x.receipt, x.ref, x.enrollmentId].join(' ').toLowerCase().includes(q))
    .sort(byDateDesc);
  if (!rows.length) { box.innerHTML = emptyState('search', t('noResults'), t('noResultsHint')); return; }
  box.innerHTML = '<p class="result-count" aria-live="polite">' + rows.length + ' ' + t('results') + '</p>' +
    '<div class="table-wrap mt"><table class="table"><caption class="sr-only">' + t('transactions') + '</caption><thead><tr><th>' + t('date') + '</th><th>' + t('scheme') + '</th><th>' + t('month') + '</th><th class="r">' + t('amount') + '</th><th>' + t('status') + '</th><th>' + t('receipt') + '</th></tr></thead><tbody>' +
    rows.map(x => '<tr><td data-label="' + t('date') + '">' + fmtDate(x.date) + '<span class="demo-mini">DEMO</span></td><td data-label="' + t('scheme') + '">' + L(SCHEMES[x.scheme].short) + '</td><td data-label="' + t('month') + '">' + fmtMonth(x.month) + '</td>' +
      '<td data-label="' + t('amount') + '" class="r num"><b>' + inr(x.amount) + '</b></td><td data-label="' + t('status') + '">' + statusChip(x.status) + '</td>' +
      '<td data-label="' + t('receipt') + '"><span class="mono small">' + (x.receipt || '—') + '</span></td></tr>').join('') + '</tbody></table></div>';
}

function pagePay() {
  const head = pageHead(t('payTitle'), t('paySub'));
  const notice = '<div class="note note--warn" role="note">' + ic('alert') + '<span>' + t('payNotice') + '</span></div>';
  const r = UI.payResult;
  const result = r ? '<div class="result result--info" id="payResultBox" tabindex="-1">' + ic('clock') + '<div><h3>' + t('refSubmittedTitle') + '</h3><p>' + t('refSubmittedMsg') + '</p>' +
    '<dl class="kv"><dt>' + t('payRef') + '</dt><dd class="mono">' + esc(r.ref) + '</dd><dt>' + t('amount') + '</dt><dd>' + inr(r.amount) + '</dd><dt>' + t('installmentFor') + '</dt><dd>' + fmtMonth(r.month) + '</dd><dt>' + t('status') + '</dt><dd>' + statusChip('pending') + '</dd></dl>' +
    '<div class="row-actions"><button class="btn btn-outline btn-sm" data-go="transactions">' + t('history') + '</button><button class="btn btn-outline btn-sm" data-go="passbook/' + r.enr + '">' + t('passbook') + '</button></div></div></div>' : '';
  const opts = payOptions();
  if (!opts.length) return head + notice + result + emptyState('wallet', t('nothingToPay'), t('nothingToPayHint'), '<button class="btn btn-outline" data-go="schemes">' + t('exploreSchemes') + '</button>');
  const sel = opts.find(o => o.e.id === UI.paySel) || opts[0];
  UI.paySel = sel.e.id;
  const fixed = SCHEMES[sel.e.scheme].type === 'fixed', w = windowInfo();
  return head + notice + result +
    '<div class="pay-grid">' +
      '<section class="panel" aria-labelledby="qrH"><h2 class="h3" id="qrH">' + t('scanToPay') + '</h2>' +
        '<div class="qr-wrap" role="img" aria-label="' + t('qrDemo') + '">' + qrSVG() + '<span class="qr-label">' + t('qrDemo') + '</span></div>' +
        '<p class="muted small center">' + t('upiPlaceholder') + '</p>' +
        '<h3 class="h4">' + t('payInstructions') + '</h3><ol class="steps">' + PAY_STEPS.map(s => '<li>' + L(s) + '</li>').join('') + '</ol>' +
        '<p class="muted small">' + t('placeholderSteps') + '</p></section>' +
      '<form class="panel" data-form="pay" novalidate aria-labelledby="payH"><h2 class="h3" id="payH">' + t('paymentDetails') + '</h2>' +
        '<div class="field"><label for="payEnr">' + t('selectScheme') + '</label><select id="payEnr" name="payEnr" data-change="pay-sel">' + opts.map(o => '<option value="' + o.e.id + '"' + (o.e.id === sel.e.id ? ' selected' : '') + '>' + L(SCHEMES[o.e.scheme].short) + ' · ' + o.e.id + '</option>').join('') + '</select></div>' +
        '<div><div class="kv-row"><span>' + t('installmentFor') + '</span><b>' + fmtMonth(sel.next.month) + '</b></div>' +
        '<div class="kv-row"><span>' + t('paymentWindow') + '</span><b>' + (w.open ? t('openNow') + ' (' + fmtDate(w.end) + ')' : fmtDate(w.start) + ' – ' + fmtDate(w.end)) + '</b></div></div>' +
        field({ id: 'payAmt', label: t('amount') + ' (₹)', value: fixed ? sel.e.fixedAmount : '', hint: fixed ? t('fixedAmtHint') : t('flexAmtHint'), attrs: 'inputmode="numeric" maxlength="8" autocomplete="off"' + (fixed ? ' readonly' : '') }) +
        field({ id: 'payRef', label: t('payRef'), hint: t('payRefHint'), attrs: 'autocomplete="off" maxlength="30" autocapitalize="characters" spellcheck="false"' }) +
        (!w.open ? '<div class="note note--info">' + ic('calendar') + '<span>' + t('outsideWindow') + '</span></div>' : '') +
        '<button class="btn btn-primary btn-block" type="submit">' + ic('shield') + t('submitRef') + '</button>' +
      '</form></div>';
}

function reqCard(r) {
  const order = ['submitted', 'review', 'ready', 'closed'], idx = order.indexOf(r.status), e = S.enrollments.find(x => x.id === r.enrollmentId);
  return '<article class="req"><div class="req-head"><div><strong class="mono">' + r.id + '<span class="demo-mini">DEMO</span></strong><small>' + (e ? L(SCHEMES[e.scheme].short) + ' · ' + e.id : '') + '</small></div>' + statusChip(r.status) + '</div>' +
    '<dl class="kv mt"><dt>' + t('type') + '</dt><dd>' + t(r.type === 'coin' ? 'goldCoin' : 'jewellery') + '</dd>' + (r.preference ? '<dt>' + t('preference') + '</dt><dd>' + esc(r.preference) + '</dd>' : '') +
    '<dt>' + t('visitDate') + '</dt><dd>' + fmtDate(r.visitDate) + '</dd><dt>' + t('requestedOn') + '</dt><dd>' + fmtDate(r.createdOn) + '</dd></dl>' +
    '<ol class="timeline" aria-label="' + t('status') + '">' + order.map((s, i) => '<li class="' + (i <= idx ? 'done' : '') + '">' + t('st_' + s) + '</li>').join('') + '</ol></article>';
}
function pageRedeem() {
  const mine = S.redemptions.filter(r => r.customerId === ME);
  const eligible = enrOf(ME).filter(e => summary(e).eligible);
  let form;
  if (!eligible.length) {
    form = emptyState('gift', t('notEligible'), t('notEligibleHint'), '<button class="btn btn-outline" data-go="passbook">' + t('digitalPassbook') + '</button>');
  } else {
    const sel = eligible.find(e => e.id === UI.redeemSel) || eligible[0];
    UI.redeemSel = sel.id;
    const s = summary(sel), sc = SCHEMES[sel.scheme];
    const open = mine.find(r => r.enrollmentId === sel.id && r.status !== 'closed');
    form = '<form class="panel" data-form="redeem" novalidate aria-label="' + t('redeemTitle') + '">' +
      '<div class="field"><label for="rdEnr">' + t('selectScheme') + '</label><select id="rdEnr" name="rdEnr" data-change="redeem-sel">' + eligible.map(e => '<option value="' + e.id + '"' + (e.id === sel.id ? ' selected' : '') + '>' + L(SCHEMES[e.scheme].short) + ' · ' + e.id + '</option>').join('') + '</select></div>' +
      '<fieldset class="field"><legend>' + t('redeemType') + '</legend><div class="choice-grid">' +
        ['jewellery', 'coin'].map(v => '<label class="choice"><input type="radio" name="rdType" value="' + v + '"' + (UI.redeemType === v ? ' checked' : '') + ' data-change="redeem-type"><span class="choice-box">' + ic(v === 'coin' ? 'coins' : 'gift') + '<b>' + t(v === 'coin' ? 'goldCoin' : 'jewellery') + '</b><small>' + t(v === 'coin' ? 'coinHint' : 'jewelHint') + '</small></span></label>').join('') +
      '</div></fieldset>' +
      field({ id: 'rdPref', label: t('preference'), required: false, hint: t('prefHint'), attrs: 'maxlength="60" autocomplete="off"' }) +
      field({ id: 'rdDate', label: t('visitDate'), type: 'date', attrs: 'min="' + addDays(1) + '" max="' + addDays(60) + '"' }) +
      '<div class="summary-box"><h3 class="h4">' + t('requestSummary') + '</h3><dl class="kv">' +
        '<dt>' + t('scheme') + '</dt><dd>' + L(sc.short) + '</dd><dt>' + t('enrollmentId') + '</dt><dd class="mono">' + sel.id + '</dd>' +
        '<dt>' + t('totalContribution') + '</dt><dd>' + inr(s.verifiedAmt) + '</dd>' +
        (s.weight != null ? '<dt>' + t('goldWeight') + '</dt><dd>' + grams(s.weight) + ' <span class="demo-mini">DEMO</span></dd>' : '') +
        '<dt>' + t('type') + '</dt><dd id="sumType">' + t(UI.redeemType === 'coin' ? 'goldCoin' : 'jewellery') + '</dd></dl>' +
        '<p class="muted small">' + t('redeemSummaryNote') + '</p></div>' +
      (open ? '<div class="note note--info mt">' + ic('info') + '<span>' + t('openRequestExists') + '</span></div>' : '') +
      '<button class="btn btn-primary btn-block mt" type="submit"' + (open ? ' disabled' : '') + '>' + t('submitRequest') + '</button></form>';
  }
  const list = mine.length ? '<div class="req-list">' + mine.slice().reverse().map(reqCard).join('') + '</div>' : emptyState('file', t('noRequests'), t('noRequestsHint'));
  return pageHead(t('redeemTitle'), t('redeemSub')) + '<div class="two-col">' + form + '<section aria-labelledby="yrT"><h2 class="h2 section-head" id="yrT">' + t('yourRequests') + '</h2>' + list + '</section></div>';
}

/* ---------- Customer forms ---------- */
function openEnroll(schemeId, draft) {
  const sc = SCHEMES[schemeId]; if (!sc) return;
  const d = draft || { name: custName(getCust(ME)), phone: '', amount: '', agree: false };
  const amountField = sc.type === 'fixed'
    ? '<div class="field"><label for="enAmount">' + t('fixedAmountLabel') + ' <span class="req" aria-hidden="true">*</span></label><select id="enAmount" name="enAmount" aria-required="true" aria-describedby="enAmount-err"><option value="">' + t('selectAmount') + '</option>' +
      [1000, 2000, 3000, 5000, 10000].map(a => '<option value="' + a + '"' + (String(d.amount) === String(a) ? ' selected' : '') + '>' + inr(a) + '</option>').join('') + '</select><p class="hint">' + t('demoAmountHint') + '</p><p class="err" id="enAmount-err" role="alert"></p></div>'
    : '<div class="note note--info">' + ic('info') + '<span>' + t('flexibleEnrollNote') + '</span></div>';
  openModal({
    title: t('enrollIn') + ' ' + L(sc.short),
    body: '<form id="enrollForm" data-form="enroll" data-scheme="' + schemeId + '" novalidate>' +
      '<div class="note note--warn">' + ic('alert') + '<span>' + t('enrollDemoNote') + '</span></div>' +
      '<div class="mt">' + field({ id: 'enName', label: t('fullName'), value: d.name, attrs: 'autocomplete="off" maxlength="60"' }) +
      field({ id: 'enPhone', label: t('mobile'), type: 'tel', value: d.phone, hint: t('mobileHint'), attrs: 'inputmode="numeric" maxlength="10" autocomplete="off"' }) + '</div>' +
      '<div class="mt">' + amountField + '</div>' +
      '<div class="kv-row mt"><span>' + t('startMonth') + '</span><b>' + fmtMonth(ymAdd(curYM(), 1)) + ' · ' + t('afterApproval') + '</b></div>' +
      '<label class="check"><input type="checkbox" id="enAgree" name="enAgree"' + (d.agree ? ' checked' : '') + ' aria-describedby="enAgree-err"><span>' + t('agreeTerms') + '</span></label><p class="err" id="enAgree-err" role="alert"></p>' +
      '</form>',
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn btn-primary" type="submit" form="enrollForm">' + t('submitEnroll') + '</button>'
  });
}
FORMS.enroll = async f => {
  const sid = f.dataset.scheme, sc = SCHEMES[sid];
  const name = f.enName.value.trim(), phone = f.enPhone.value.trim(), amount = f.enAmount ? f.enAmount.value : '', agree = f.enAgree.checked;
  let ok = true;
  ok = setErr(f, 'enName', (name.length < 2 || !/^[\p{L}\p{M} .'-]+$/u.test(name)) ? t('errName') : '') && ok;
  ok = setErr(f, 'enPhone', /^[6-9]\d{9}$/.test(phone) ? '' : t('errPhone')) && ok;
  if (sc.type === 'fixed') ok = setErr(f, 'enAmount', amount ? '' : t('errSelectAmount')) && ok;
  ok = setErr(f, 'enAgree', agree ? '' : t('errAgree')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const draft = { name, phone, amount, agree };
  const yes = await confirmDialog({
    title: t('confirmEnrollTitle'),
    message: '<b>' + L(sc.name) + '</b><br>' + t('fullName') + ': ' + esc(name) + (amount ? '<br>' + t('contribution') + ': ' + inr(amount) : '') + '<br>' + t('startMonth') + ': ' + fmtMonth(ymAdd(curYM(), 1)) + '<br><br>' + t('confirmEnrollMsg'),
    confirmText: t('submitEnroll')
  });
  if (!yes) { openEnroll(sid, draft); return; }
  showProcessing();
  await wait(900);
  let id; do { id = 'DEMO-' + sc.code + '-' + Math.floor(1000 + Math.random() * 9000); } while (S.enrollments.some(e => e.id === id));
  S.enrollments.push({ id, customerId: ME, scheme: sid, start: ymAdd(curYM(), 1), status: 'pending', enrolledOn: todayISO(), fixedAmount: sc.type === 'fixed' ? Number(amount) : null });
  openModal({
    title: t('enrollRecordedTitle'),
    body: '<div class="result result--info">' + ic('info') + '<div><p class="mono"><b>' + id + '</b></p><p>' + t('enrollRecordedMsg') + '</p></div></div>',
    footer: '<button type="button" class="btn btn-primary" data-go="savings">' + t('goSavings') + '</button>'
  });
};
FORMS.pay = async f => {
  const opt = payOptions().find(o => o.e.id === f.payEnr.value); if (!opt) return;
  const fixed = SCHEMES[opt.e.scheme].type === 'fixed';
  const amtRaw = f.payAmt.value.replace(/[,\s₹]/g, ''), ref = f.payRef.value.trim().toUpperCase();
  let ok = true;
  let amtErr = '';
  if (!/^\d{1,7}$/.test(amtRaw) || Number(amtRaw) <= 0) amtErr = t('errAmount');
  else if (fixed && Number(amtRaw) !== opt.e.fixedAmount) amtErr = t('errFixedAmount');
  ok = setErr(f, 'payAmt', amtErr) && ok;
  let refErr = '';
  if (!/^[A-Z0-9-]{6,30}$/.test(ref)) refErr = t('errRef');
  else if (S.transactions.some(x => x.ref === ref)) refErr = t('errRefDup');
  ok = setErr(f, 'payRef', refErr) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const w = windowInfo();
  const yes = await confirmDialog({
    title: t('confirmRefTitle'),
    message: t('installmentFor') + ': <b>' + fmtMonth(opt.next.month) + '</b><br>' + t('amount') + ': <b>' + inr(amtRaw) + '</b><br>' + t('payRef') + ': <b class="mono">' + esc(ref) + '</b><br><br>' + t('confirmRefMsg') + (w.open ? '' : '<br><br>' + t('outsideWindow')),
    confirmText: t('submitRef')
  });
  if (!yes) return;
  await btnLoading(f.querySelector('button[type="submit"]'), 1000);
  S.transactions.push({ id: nextTxId(), enrollmentId: opt.e.id, customerId: ME, scheme: opt.e.scheme, month: opt.next.month, date: todayISO(), amount: Number(amtRaw), ref, receipt: '', status: 'pending', rate: null, weight: null, reason: '' });
  UI.payResult = { ref, amount: Number(amtRaw), month: opt.next.month, enr: opt.e.id };
  render();
  const box = $('#payResultBox'); if (box) { box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
};
FORMS.redeem = async f => {
  const e = S.enrollments.find(x => x.id === f.rdEnr.value); if (!e) return;
  const type = (f.querySelector('input[name="rdType"]:checked') || {}).value || 'jewellery';
  const pref = f.rdPref.value.trim(), date = f.rdDate.value;
  let ok = true;
  ok = setErr(f, 'rdPref', pref.length > 60 ? t('errPref') : '') && ok;
  ok = setErr(f, 'rdDate', (!date || date < addDays(1) || date > addDays(60)) ? t('errDate') : '') && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const yes = await confirmDialog({
    title: t('confirmRedeemTitle'),
    message: '<b>' + L(SCHEMES[e.scheme].short) + '</b> · <span class="mono">' + e.id + '</span><br>' + t('type') + ': ' + t(type === 'coin' ? 'goldCoin' : 'jewellery') + '<br>' + t('visitDate') + ': ' + fmtDate(date) + '<br><br>' + t('confirmRedeemMsg'),
    confirmText: t('submitRequest')
  });
  if (!yes) return;
  await btnLoading(f.querySelector('button[type="submit"]'), 900);
  S.redemptions.push({ id: 'DEMO-RDM-' + (101 + S.redemptions.length), enrollmentId: e.id, customerId: ME, type, preference: pref, visitDate: date, status: 'submitted', createdOn: todayISO() });
  toast(t('redeemRecorded'));
  render();
};

addStrings({ goSavings: 'Go to savings' }, { goSavings: 'சேமிப்புக்குச் செல்' });

/* ---------- Savings event handlers (preserved from the Phase 1 router) ---------- */
Object.assign(ACTIONS, {
  'enroll': b => openEnroll(b.dataset.scheme),
  'tx-status': b => { UI.txStatus = b.dataset.v; document.querySelectorAll('[data-action="tx-status"]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderTxList(); }
});
Object.assign(CHANGES, {
  'pay-sel': el => { UI.paySel = el.value; UI.payResult = null; render(); const s = $('#payEnr'); if (s) s.focus(); },
  'redeem-sel': el => { UI.redeemSel = el.value; render(); },
  'redeem-type': el => { UI.redeemType = el.value; const s = $('#sumType'); if (s) s.textContent = t(el.value === 'coin' ? 'goldCoin' : 'jewellery'); },
  'tx-scheme': el => { UI.txScheme = el.value; renderTxList(); }
});
FILTERS.tx = el => { UI.txQ = el.value; renderTxList(); };

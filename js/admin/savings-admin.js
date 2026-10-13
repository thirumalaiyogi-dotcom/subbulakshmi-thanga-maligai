'use strict';
/* =========================================================
   ADMIN · SAVINGS & BUSINESS — overview, customers, enrollments, payment
   verification, gold rate, records, redemptions, reports, settings (preserved)
   ========================================================= */
function aHead(key, extra) { return pageHead(t('a_' + key), t('a_' + key + 'Sub'), extra); }
function kpi(label, value, sub, accent) { return '<div class="kpi' + (accent ? ' kpi--accent' : '') + '"><span>' + label + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
function enrSchemeLabel(e) { return L(SCHEMES[e.scheme].short); }

function aOverview() {
  const pend = S.transactions.filter(x => x.status === 'pending');
  const active = S.enrollments.filter(e => e.status === 'active').length;
  const pendEnr = S.enrollments.filter(e => e.status === 'pending');
  const cm = curYM();
  const monthVerified = sumBy(S.transactions.filter(x => x.status === 'verified' && (x.verifiedOn || x.date).slice(0, 7) === cm), 'amount');
  const openRed = S.redemptions.filter(r => r.status !== 'closed');
  const rate = currentRate();
  const attention = pend.slice(0, 4).map(x => { const c = getCust(x.customerId); return '<li><div class="tx-ic tx-ic--pending">' + ic('clock') + '</div><div><b>' + esc(custName(c)) + '</b> · ' + inr(x.amount) + '<small>' + enrSchemeLabel(x) + ' · ' + fmtMonth(x.month) + ' · <span class="mono">' + x.ref + '</span></small></div></li>'; }).join('') +
    pendEnr.map(e => '<li><div class="tx-ic tx-ic--pending">' + ic('layers') + '</div><div><b>' + esc(custName(getCust(e.customerId))) + '</b> · ' + t('st_pendingEnroll') + '<small>' + enrSchemeLabel(e) + ' · <span class="mono">' + e.id + '</span></small></div></li>').join('');
  const recent = S.transactions.slice().sort(byDateDesc).slice(0, 6).map(x => '<li><div class="tx-ic tx-ic--' + x.status + '">' + ic(x.status === 'verified' ? 'check' : x.status === 'pending' ? 'clock' : 'x') + '</div><div><b>' + esc(custName(getCust(x.customerId))) + '</b> · ' + inr(x.amount) + '<small>' + fmtDate(x.date) + ' · ' + enrSchemeLabel(x) + '</small></div>' + statusChip(x.status) + '</li>').join('');
  return aHead('overview') +
    '<div class="kpi-grid">' +
      kpi(t('k_pending'), pend.length, inr(sumBy(pend, 'amount')) + ' · DEMO', true) +
      kpi(t('k_active'), active) + kpi(t('k_customers'), S.customers.length) +
      kpi(t('k_monthVerified'), inr(monthVerified), fmtMonth(cm)) +
      kpi(t('k_pendingEnroll'), pendEnr.length) + kpi(t('k_redemptions'), openRed.length) +
    '</div>' +
    '<div class="rate-card"><div><span>' + t('currentRate') + '</span><b>' + inr(rate.rate) + '</b><span>' + fmtDate(rate.date) + ' · ' + t('demoRateLabel') + '</span></div><button class="btn btn-primary" data-go="goldrate">' + ic('coins') + t('update') + '</button></div>' +
    '<div class="two-col">' +
      '<section class="panel"><div class="section-head"><h2 class="h3">' + t('needsAttention') + '</h2><button class="link-btn" data-go="payments">' + t('a_payments') + ic('right') + '</button></div>' +
        (attention ? '<ul class="activity">' + attention + '</ul>' : emptyState('checkCircle', t('allClear'), t('allClearHint'))) + '</section>' +
      '<section class="panel"><div class="section-head"><h2 class="h3">' + t('recentActivity') + '</h2><button class="link-btn" data-go="records">' + t('viewAll') + ic('right') + '</button></div><ul class="activity">' + recent + '</ul></section>' +
    '</div>';
}

function aCustomers() {
  return aHead('customers') + '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchCustomers') + '" aria-label="' + t('searchCustomers') + '" value="' + esc(UI.custQ) + '" data-filter="cust"></div></div><div id="custList">' + skel(4) + '</div>';
}
function renderCustList() {
  const box = $('#custList'); if (!box) return;
  const q = UI.custQ.trim().toLowerCase();
  const rows = S.customers.filter(c => !q || [c.id, c.name, c.nameTa, c.town, c.townTa, c.phone].join(' ').toLowerCase().includes(q));
  if (!rows.length) { box.innerHTML = emptyState('search', t('noResults'), t('noResultsHint')); return; }
  box.innerHTML = '<p class="result-count" aria-live="polite">' + rows.length + ' ' + t('results') + '</p><div class="table-wrap mt"><table class="table"><thead><tr><th>ID</th><th>' + t('customer') + '</th><th>' + t('town') + '</th><th>' + t('phone') + '</th><th>' + t('enrollmentsLabel') + '</th><th class="r">' + t('verifiedSum') + '</th><th></th></tr></thead><tbody>' +
    rows.map(c => {
      const enrs = enrOf(c.id), tot = enrs.reduce((a, e) => a + summary(e).verifiedAmt, 0);
      return '<tr><td data-label="ID"><span class="mono">' + c.id + '</span><span class="demo-mini">DEMO</span></td><td data-label="' + t('customer') + '"><b>' + esc(custName(c)) + '</b></td><td data-label="' + t('town') + '">' + custTown(c) + '</td><td data-label="' + t('phone') + '" class="mono">' + c.phone + '</td><td data-label="' + t('enrollmentsLabel') + '">' + enrs.length + '</td><td data-label="' + t('verifiedSum') + '" class="r num">' + inr(tot) + '</td><td data-label=""><div class="td-actions"><button class="btn btn-outline btn-sm" data-action="view-cust" data-id="' + c.id + '">' + t('view') + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
}
function viewCustomer(id) {
  const c = getCust(id); if (!c) return;
  const enrs = enrOf(id);
  openModal({
    title: esc(custName(c)) + ' <span class="demo-mini">DEMO</span>',
    body: '<dl class="kv"><dt>' + t('customerId') + '</dt><dd class="mono">' + c.id + '</dd><dt>' + t('phone') + '</dt><dd class="mono">' + c.phone + '</dd><dt>' + t('town') + '</dt><dd>' + custTown(c) + '</dd><dt>' + t('memberSince') + '</dt><dd>' + fmtDate(c.joined) + '</dd></dl>' +
      '<h3 class="h4">' + t('enrollmentsLabel') + '</h3>' +
      (enrs.length ? enrs.map(e => { const s = summary(e); return '<div class="qcard"><div class="qcard-head"><div><strong>' + enrSchemeLabel(e) + '</strong><small class="mono">' + e.id + '</small></div>' + statusChip(s.status) + '</div>' + progressBar(s.verifiedCount, 12, t('progress')) + '<div class="enr-foot"><span>' + s.verifiedCount + ' ' + t('paidOf') + '</span><strong>' + inr(s.verifiedAmt) + '</strong></div><div class="qcard-actions"><button class="btn btn-outline btn-sm" data-go="records/' + e.id + '">' + t('openPassbook') + '</button></div></div>'; }).join('') : '<p class="muted">—</p>'),
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('close') + '</button>'
  });
}

function aEnrollments() {
  const opt = (v, l, cur) => '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>';
  const rows = S.enrollments.filter(e => UI.enrScheme === 'all' || e.scheme === UI.enrScheme)
    .filter(e => UI.enrStatus === 'all' || summary(e).status === UI.enrStatus);
  return aHead('enrollments') +
    '<div class="toolbar"><select class="select" aria-label="' + t('scheme') + '" data-change="enr-scheme">' + opt('all', t('all') + ' · ' + t('schemes'), UI.enrScheme) + Object.values(SCHEMES).map(sc => opt(sc.id, L(sc.short), UI.enrScheme)).join('') + '</select>' +
    '<select class="select" aria-label="' + t('status') + '" data-change="enr-status">' + opt('all', t('all') + ' · ' + t('status'), UI.enrStatus) + ['active', 'pendingEnroll', 'matured'].map(s => opt(s, t('st_' + s), UI.enrStatus)).join('') + '</select>' +
    '<span class="result-count">' + rows.length + ' ' + t('results') + '</span></div>' +
    (rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('enrollmentId') + '</th><th>' + t('customer') + '</th><th>' + t('scheme') + '</th><th>' + t('start') + '</th><th class="r">' + t('monthly') + '</th><th>' + t('progress') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
      rows.map(e => { const s = summary(e); return '<tr><td data-label="' + t('enrollmentId') + '"><span class="mono">' + e.id + '</span></td><td data-label="' + t('customer') + '">' + esc(custName(getCust(e.customerId))) + '</td><td data-label="' + t('scheme') + '">' + enrSchemeLabel(e) + '</td><td data-label="' + t('start') + '">' + fmtMonth(e.start) + '</td>' +
        '<td data-label="' + t('monthly') + '" class="r num">' + (e.fixedAmount ? inr(e.fixedAmount) : t('flexible')) + '</td><td data-label="' + t('progress') + '">' + s.verifiedCount + ' / 12</td><td data-label="' + t('status') + '">' + statusChip(s.status) + '</td>' +
        '<td data-label=""><div class="td-actions">' + (e.status === 'pending' ? '<button class="btn btn-ok btn-sm" data-action="approve-enr" data-id="' + e.id + '">' + t('approve') + '</button>' : '') + '<button class="btn btn-outline btn-sm" data-go="records/' + e.id + '">' + t('passbook') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>'
      : emptyState('search', t('noResults'), t('noResultsHint')));
}

function aPayments() {
  const pend = S.transactions.filter(x => x.status === 'pending').sort(byDateDesc);
  const done = S.transactions.filter(x => x.status !== 'pending').sort(byDateDesc).slice(0, 25);
  const tabs = '<div class="chips" role="group" aria-label="' + t('status') + '"><button class="fchip" data-action="pay-tab" data-v="pending" aria-pressed="' + (UI.payTab === 'pending') + '">' + t('pendingTab') + ' (' + pend.length + ')</button><button class="fchip" data-action="pay-tab" data-v="processed" aria-pressed="' + (UI.payTab === 'processed') + '">' + t('processedTab') + '</button></div>';
  let body;
  if (UI.payTab === 'pending') {
    body = pend.length ? '<div class="queue">' + pend.map(x => { const c = getCust(x.customerId); return '<article class="qcard"><div class="qcard-head"><div><strong>' + esc(custName(c)) + '<span class="demo-mini">DEMO</span></strong><small class="mono">' + x.enrollmentId + '</small></div>' + statusChip('pending') + '</div>' +
      '<dl class="kv"><dt>' + t('scheme') + '</dt><dd>' + enrSchemeLabel(x) + '</dd><dt>' + t('installmentFor') + '</dt><dd>' + fmtMonth(x.month) + '</dd><dt>' + t('amount') + '</dt><dd>' + inr(x.amount) + '</dd><dt>' + t('submittedOn') + '</dt><dd>' + fmtDate(x.date) + '</dd><dt>' + t('customerRef') + '</dt><dd class="mono">' + esc(x.ref) + '</dd></dl>' +
      '<div class="qcard-actions"><button class="btn btn-outline btn-sm" data-action="reject-tx" data-id="' + x.id + '">' + ic('x') + t('reject') + '</button><button class="btn btn-ok btn-sm" data-action="verify-tx" data-id="' + x.id + '">' + ic('check') + t('verify') + '</button></div></article>'; }).join('') + '</div>'
      : emptyState('checkCircle', t('allClear'), t('allClearHint'));
  } else {
    body = '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('date') + '</th><th>' + t('customer') + '</th><th>' + t('scheme') + '</th><th class="r">' + t('amount') + '</th><th>' + t('status') + '</th><th>' + t('receipt') + ' / ' + t('reason') + '</th></tr></thead><tbody>' +
      done.map(x => '<tr><td data-label="' + t('date') + '">' + fmtDate(x.date) + '</td><td data-label="' + t('customer') + '">' + esc(custName(getCust(x.customerId))) + '</td><td data-label="' + t('scheme') + '">' + enrSchemeLabel(x) + ' · ' + fmtMonth(x.month) + '</td><td data-label="' + t('amount') + '" class="r num">' + inr(x.amount) + '</td><td data-label="' + t('status') + '">' + statusChip(x.status) + '</td><td data-label="' + t('receipt') + '"><span class="mono small">' + (x.receipt || esc(x.reason) || '—') + '</span></td></tr>').join('') + '</tbody></table></div>';
  }
  return aHead('payments') + '<div class="note note--warn">' + ic('alert') + '<span>' + t('verifyMsg') + '</span></div>' + tabs + body;
}

function aGoldrate() {
  const r = currentRate();
  return aHead('goldrate') +
    '<div class="note note--warn">' + ic('alert') + '<span>' + t('rateWarning') + '</span></div>' +
    '<div class="rate-card"><div><span>' + t('currentRate') + '</span><b>' + inr(r.rate) + '</b><span>' + fmtDate(r.date) + ' · ' + t('demoRateLabel') + '</span></div></div>' +
    '<div class="two-col">' +
      '<form class="panel" data-form="rate" novalidate><h2 class="h3">' + t('rateFormTitle') + '</h2>' +
        field({ id: 'rtDate', label: t('rateDate'), type: 'date', value: todayISO(), attrs: 'max="' + todayISO() + '"' }) +
        field({ id: 'rtValue', label: t('rateValue'), hint: t('rateHint'), attrs: 'inputmode="decimal" maxlength="9" autocomplete="off"' }) +
        field({ id: 'rtNote', label: t('rateNote'), required: false, hint: t('rateNoteHint'), attrs: 'maxlength="60" autocomplete="off"' }) +
        '<button class="btn btn-primary btn-block mt" type="submit">' + ic('coins') + t('update') + '</button></form>' +
      '<section><h2 class="h2 section-head">' + t('rateHistory') + '</h2><div class="table-wrap"><table class="table"><thead><tr><th>' + t('rateDate') + '</th><th class="r">22K ₹/g</th><th>' + t('enteredBy') + '</th><th>' + t('rateNote') + '</th></tr></thead><tbody>' +
        S.goldRates.map(g => '<tr><td data-label="' + t('rateDate') + '">' + fmtDate(g.date) + '</td><td data-label="22K ₹/g" class="r num"><b>' + inr(g.rate) + '</b></td><td data-label="' + t('enteredBy') + '">' + esc(g.by) + '</td><td data-label="' + t('rateNote') + '">' + (esc(g.note) || '—') + '<span class="demo-mini">DEMO</span></td></tr>').join('') + '</tbody></table></div></section>' +
    '</div>';
}

function aRecords(arg) {
  if (arg && S.enrollments.some(e => e.id === arg)) UI.recEnr = arg;
  if (!UI.recEnr || !S.enrollments.some(e => e.id === UI.recEnr)) UI.recEnr = S.enrollments[0].id;
  const e = S.enrollments.find(x => x.id === UI.recEnr);
  return aHead('records', '<button class="btn btn-outline" data-action="export-csv">' + ic('download') + t('exportCsv') + '</button>') +
    '<section class="stack"><div class="section-head"><h2 class="h2">' + t('passbookLookup') + '</h2></div>' +
      '<select class="select" aria-label="' + t('enrollmentId') + '" data-change="rec-enr">' + S.enrollments.map(x => '<option value="' + x.id + '"' + (x.id === e.id ? ' selected' : '') + '>' + x.id + ' · ' + esc(custName(getCust(x.customerId))) + '</option>').join('') + '</select>' +
      passbookView(e, true) + '</section>' +
    '<section class="stack"><h2 class="h2">' + t('allTransactions') + '</h2>' +
      '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchRef') + '" aria-label="' + t('searchRef') + '" value="' + esc(UI.recQ) + '" data-filter="rec"></div>' +
      '<select class="select" aria-label="' + t('status') + '" data-change="rec-status">' + ['all', 'verified', 'pending', 'rejected'].map(v => '<option value="' + v + '"' + (UI.recStatus === v ? ' selected' : '') + '>' + (v === 'all' ? t('all') + ' · ' + t('status') : t('st_' + v)) + '</option>').join('') + '</select></div>' +
      '<div id="recList">' + skel(5) + '</div></section>';
}
function renderRecList() {
  const box = $('#recList'); if (!box) return;
  const q = UI.recQ.trim().toLowerCase();
  const rows = S.transactions.filter(x => UI.recStatus === 'all' || x.status === UI.recStatus)
    .filter(x => { if (!q) return true; const c = getCust(x.customerId); return [x.id, x.ref, x.receipt, x.enrollmentId, c.name, c.nameTa].join(' ').toLowerCase().includes(q); })
    .sort(byDateDesc);
  if (!rows.length) { box.innerHTML = emptyState('search', t('noResults'), t('noResultsHint')); return; }
  box.innerHTML = '<p class="result-count" aria-live="polite">' + rows.length + ' ' + t('results') + '</p><div class="table-wrap mt"><table class="table"><thead><tr><th>Txn</th><th>' + t('date') + '</th><th>' + t('customer') + '</th><th>' + t('enrollmentId') + '</th><th>' + t('month') + '</th><th class="r">' + t('amount') + '</th><th>' + t('status') + '</th><th>' + t('receipt') + '</th></tr></thead><tbody>' +
    rows.map(x => '<tr><td data-label="Txn"><span class="mono small">' + x.id + '</span><span class="demo-mini">DEMO</span></td><td data-label="' + t('date') + '">' + fmtDate(x.date) + '</td><td data-label="' + t('customer') + '">' + esc(custName(getCust(x.customerId))) + '</td><td data-label="' + t('enrollmentId') + '"><span class="mono small">' + x.enrollmentId + '</span></td><td data-label="' + t('month') + '">' + fmtMonth(x.month) + '</td><td data-label="' + t('amount') + '" class="r num">' + inr(x.amount) + '</td><td data-label="' + t('status') + '">' + statusChip(x.status) + '</td><td data-label="' + t('receipt') + '"><span class="mono small">' + (x.receipt || '—') + '</span></td></tr>').join('') +
    '</tbody></table></div>';
}

function aRedemptions() {
  const list = S.redemptions.slice().reverse();
  const opts = ['submitted', 'review', 'ready', 'closed'];
  return aHead('redemptions') +
    (list.length ? '<div class="queue">' + list.map(r => { const c = getCust(r.customerId), e = S.enrollments.find(x => x.id === r.enrollmentId), s = e ? summary(e) : null;
      return '<article class="qcard"><div class="qcard-head"><div><strong class="mono">' + r.id + '<span class="demo-mini">DEMO</span></strong><small>' + esc(custName(c)) + ' · ' + (e ? enrSchemeLabel(e) + ' · ' + e.id : '') + '</small></div>' + statusChip(r.status) + '</div>' +
        '<dl class="kv"><dt>' + t('type') + '</dt><dd>' + t(r.type === 'coin' ? 'goldCoin' : 'jewellery') + '</dd>' + (r.preference ? '<dt>' + t('preference') + '</dt><dd>' + esc(r.preference) + '</dd>' : '') + '<dt>' + t('visitDate') + '</dt><dd>' + fmtDate(r.visitDate) + '</dd>' +
        (s ? '<dt>' + t('totalContribution') + '</dt><dd>' + inr(s.verifiedAmt) + '</dd>' + (s.weight != null ? '<dt>' + t('goldWeight') + '</dt><dd>' + grams(s.weight) + '</dd>' : '') : '') + '</dl>' +
        '<div class="qcard-actions"><select class="select" id="rs-' + r.id + '" aria-label="' + t('updateStatus') + '">' + opts.map(o => '<option value="' + o + '"' + (o === r.status ? ' selected' : '') + '>' + t('st_' + o) + '</option>').join('') + '</select><button class="btn btn-primary btn-sm" data-action="upd-red" data-id="' + r.id + '">' + t('update') + '</button></div></article>'; }).join('') + '</div>'
      : emptyState('gift', t('noRedemptions'), t('noRedemptionsHint')));
}

function aReports() {
  const ver = S.transactions.filter(x => x.status === 'verified');
  const total = sumBy(ver, 'amount');
  const months = Array.from({ length: 8 }, (_, i) => ymAdd(curYM(), i - 7));
  const vals = months.map(m => sumBy(ver.filter(x => x.month === m), 'amount'));
  const max = Math.max(1, ...vals);
  const byScheme = Object.values(SCHEMES).map(sc => ({ sc, v: sumBy(ver.filter(x => x.scheme === sc.id), 'amount') }));
  const stCounts = ['active', 'pendingEnroll', 'matured'].map(s => ({ s, n: S.enrollments.filter(e => summary(e).status === s).length }));
  return aHead('reports', '<button class="btn btn-outline" data-action="export-csv">' + ic('download') + t('exportCsv') + '</button>') +
    '<div class="kpi-grid">' + kpi(t('totalVerified'), inr(total), 'DEMO', true) + kpi(t('avgInstallment'), inr(ver.length ? Math.round(total / ver.length) : 0)) + kpi(t('k_active'), S.enrollments.filter(e => e.status === 'active').length) + '</div>' +
    '<section class="panel"><h2 class="h3">' + t('collectionsByMonth') + ' <span class="demo-mini">DEMO</span></h2>' +
      '<div class="bars" role="img" aria-label="' + t('collectionsByMonth') + ': ' + months.map((m, i) => fmtMonth(m) + ' ' + inr(vals[i])).join(', ') + '">' + vals.map(v => '<div class="bar"><small>' + (v ? (v >= 1000 ? '₹' + (v / 1000).toFixed(1) + 'k' : inr(v)) : '') + '</small><i style="height:' + (v / max * 100).toFixed(1) + '%"></i></div>').join('') + '</div>' +
      '<div class="bar-labels" aria-hidden="true">' + months.map(m => '<span>' + fmtMonth(m).split(' ')[0] + '</span>').join('') + '</div></section>' +
    '<div class="two-col">' +
      '<section class="panel"><h2 class="h3">' + t('schemeSplit') + '</h2><div class="split">' + byScheme.map(b => '<div class="split-row"><div><span>' + L(b.sc.short) + '</span><b>' + inr(b.v) + '</b></div>' + progressBar(b.v, Math.max(1, total), L(b.sc.short)) + '</div>').join('') + '</div></section>' +
      '<section class="panel"><h2 class="h3">' + t('enrollmentStatus') + '</h2><div class="split">' + stCounts.map(c => '<div class="split-row"><div><span>' + t('st_' + c.s) + '</span><b>' + c.n + '</b></div>' + progressBar(c.n, Math.max(1, S.enrollments.length), t('st_' + c.s)) + '</div>').join('') + '</div></section>' +
    '</div>';
}

function aSettings() {
  return aHead('settings') +
    '<div class="two-col">' +
      '<section class="panel"><h2 class="h3">' + t('storeProfile') + '</h2><dl class="kv"><dt>' + t('storeName') + '</dt><dd>' + t('brand') + '</dd><dt>' + t('address') + '</dt><dd>' + t('storeAddress') + '</dd><dt>' + t('phone') + '</dt><dd>' + t('notConfigured') + '</dd></dl></section>' +
      '<section class="panel"><h2 class="h3">' + t('schemeConfig') + '</h2><dl class="kv"><dt>' + t('duration') + '</dt><dd>' + t('months12') + '</dd><dt>' + t('paymentWindow') + '</dt><dd>' + t('window17') + '</dd><dt>' + t('redemptionShort') + '</dt><dd>' + t('month13') + '</dd><dt>' + t('paymentGateway') + '</dt><dd>' + t('disabled') + '</dd><dt>' + t('authLabel') + '</dt><dd>' + t('authValue') + '</dd></dl></section>' +
      '<section class="panel"><h2 class="h3">' + t('preferences') + '</h2><p class="muted small">' + t('languageHint') + '</p>' + langToggle('wide') +
        '<label class="switch mt"><input type="checkbox" data-change="notify"' + (prefs.notify ? ' checked' : '') + '><span class="switch-track"></span><span>' + t('notifications') + '</span></label></section>' +
      '<section class="panel danger-zone"><h2 class="h3">' + t('dangerZone') + '</h2><p class="muted small">' + t('resetMsg') + '</p><button class="btn btn-outline" data-action="reset-demo">' + ic('refresh') + t('resetDemo') + '</button></section>' +
    '</div>';
}

/* ---------- Admin forms ---------- */
FORMS.reject = f => {
  const x = S.transactions.find(y => y.id === f.dataset.id); if (!x) return;
  const reason = f.rjReason.value.trim();
  if (!setErr(f, 'rjReason', reason.length < 5 ? t('errReason') : '')) { focusFirstInvalid(f); return; }
  x.status = 'rejected'; x.reason = reason + ' (DEMO)';
  closeModal(true);
  toast(t('rejectedToast'));
  render();
};
FORMS.rate = async f => {
  const date = f.rtDate.value, raw = f.rtValue.value.replace(/[,\s₹]/g, ''), note = f.rtNote.value.trim();
  const rate = Number(raw);
  let ok = true;
  ok = setErr(f, 'rtDate', (!date || date > todayISO()) ? t('errRateDate') : '') && ok;
  ok = setErr(f, 'rtValue', (!/^\d+(\.\d{1,2})?$/.test(raw) || rate < 1000 || rate > 100000) ? t('errRate') : '') && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const yes = await confirmDialog({ title: t('rateConfirmTitle'), message: fmtDate(date) + ' · <b>' + inr(rate) + '</b> / g (22K)<br><br>' + t('rateConfirmMsg') + '<br><br>' + t('rateWarning'), confirmText: t('update') });
  if (!yes) return;
  await btnLoading(f.querySelector('button[type="submit"]'), 700);
  S.goldRates.push({ date, rate, by: 'Admin (DEMO)', note: note || 'DEMO entry' });
  S.goldRates.sort((a, b) => b.date.localeCompare(a.date));
  toast(t('rateSaved'), 'ok');
  render();
};

/* ---------- CSV export (demo data) ---------- */
function exportCSV() {
  const rows = [['DEMO DATA - fictional records from the DigiGold prototype - not real transactions'],
    ['Txn ID', 'Date', 'Customer ID', 'Customer', 'Enrollment ID', 'Scheme', 'Installment month', 'Amount (INR)', 'Status', 'Receipt ref', 'Payment ref', 'Demo rate (INR/g)', 'Demo weight (g)']];
  S.transactions.slice().sort(byDateDesc).forEach(x => { const c = getCust(x.customerId); rows.push([x.id, x.date, x.customerId, c ? c.name : '', x.enrollmentId, SCHEMES[x.scheme].short.en, x.month, x.amount, x.status, x.receipt, x.ref, x.rate || '', x.weight || '']); });
  const csv = rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  try {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'stm-digigold-DEMO-transactions.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast(t('exported'), 'ok');
  } catch (err) { toast('Export failed in this browser.', 'err'); }
}

/* ---------- Admin actions (preserved) ---------- */
Object.assign(ACTIONS, {
'reset-demo': async () => {
    const ok = await confirmDialog({ title: t('resetTitle'), message: t('resetMsg'), confirmText: t('resetBtn'), danger: true });
    if (!ok) return;
    S = seed(); Object.assign(UI, { paySel: null, payResult: null, redeemSel: null, recEnr: null });
    toast(t('resetDone')); render();
  },
  'view-cust': b => viewCustomer(b.dataset.id),
  'approve-enr': async b => {
    const e = S.enrollments.find(x => x.id === b.dataset.id); if (!e) return;
    const ok = await confirmDialog({ title: t('approveEnrollTitle'), message: '<span class="mono">' + e.id + '</span> · ' + esc(custName(getCust(e.customerId))) + ' · ' + enrSchemeLabel(e) + '<br><br>' + t('approveEnrollMsg'), confirmText: t('approve') });
    if (!ok) return;
    e.status = 'active'; toast(t('approvedToast'), 'ok'); render();
  },
  'pay-tab': b => { UI.payTab = b.dataset.v; render(); },
  'verify-tx': async b => {
    const x = S.transactions.find(y => y.id === b.dataset.id); if (!x || x.status !== 'pending') return;
    const ok = await confirmDialog({ title: t('verifyTitle'), message: esc(custName(getCust(x.customerId))) + ' · <b>' + inr(x.amount) + '</b> · ' + fmtMonth(x.month) + '<br>' + t('customerRef') + ': <span class="mono">' + esc(x.ref) + '</span><br><br>' + t('verifyMsg'), confirmText: t('verify') });
    if (!ok) return;
    x.status = 'verified'; x.verifiedOn = todayISO();
    x.receipt = 'DEMO-RCPT-' + (5000 + S.transactions.filter(y => y.receipt).length);
    if (x.scheme === 'kuber') { x.rate = currentRate().rate; x.weight = round3(x.amount / x.rate); }
    toast(t('verifiedToast'), 'ok'); render();
  },
  'reject-tx': b => {
    const x = S.transactions.find(y => y.id === b.dataset.id); if (!x) return;
    openModal({
      title: t('rejectTitle'),
      body: '<form id="rejectForm" data-form="reject" data-id="' + x.id + '" novalidate><p class="modal-text">' + esc(custName(getCust(x.customerId))) + ' · ' + inr(x.amount) + ' · <span class="mono">' + esc(x.ref) + '</span></p>' +
        '<div class="field mt"><label for="rjReason">' + t('rejectReason') + ' <span class="req" aria-hidden="true">*</span></label><textarea id="rjReason" name="rjReason" maxlength="200" aria-required="true" aria-describedby="rjReason-hint rjReason-err"></textarea><p class="hint" id="rjReason-hint">' + t('rejectHint') + '</p><p class="err" id="rjReason-err" role="alert"></p></div></form>',
      footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn btn-danger" type="submit" form="rejectForm">' + t('reject') + '</button>'
    });
  },
  'upd-red': async b => {
    const r = S.redemptions.find(x => x.id === b.dataset.id), sel = document.getElementById('rs-' + b.dataset.id);
    if (!r || !sel || sel.value === r.status) return;
    const ok = await confirmDialog({ title: t('statusTitle'), message: '<span class="mono">' + r.id + '</span><br>' + t('st_' + r.status) + ' → <b>' + t('st_' + sel.value) + '</b>', confirmText: t('update') });
    if (!ok) { sel.value = r.status; return; }
    r.status = sel.value; toast(t('statusUpdated'), 'ok'); render();
  },
  'export-csv': () => exportCSV()
});

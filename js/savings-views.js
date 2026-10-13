'use strict';
/* =========================================================
   SAVINGS VIEWS shared by the customer and admin apps:
   installment table and digital passbook view
   ========================================================= */
function instTable(e, opts) {
  const sc = SCHEMES[e.scheme], k = sc.type === 'fixed', rows = installmentsOf(e);
  return '<div class="table-wrap"><table class="table"><caption class="sr-only">' + t('installments') + '</caption><thead><tr><th>#</th><th>' + t('month') + '</th><th class="r">' + t('amount') + '</th><th>' + t('paidOn') + '</th><th>' + t('status') + '</th><th>' + t('receipt') + '</th>' +
    (k ? '<th class="r">' + t('rate') + '</th><th class="r">' + t('weight') + '</th>' : '') + '</tr></thead><tbody>' +
    rows.map(r => {
      const x = r.tx, amt = x ? x.amount : (k ? e.fixedAmount : null);
      return '<tr><td data-label="#">' + r.n + '</td><td data-label="' + t('month') + '">' + fmtMonth(r.month) + '</td>' +
        '<td data-label="' + t('amount') + '" class="r num">' + (amt ? inr(amt) : '—') + '</td>' +
        '<td data-label="' + t('paidOn') + '">' + (x ? fmtDate(x.date) : '—') + '</td>' +
        '<td data-label="' + t('status') + '">' + statusChip(r.status) + (x && x.reason ? '<br><small class="muted">' + esc(x.reason) + '</small>' : '') + '</td>' +
        '<td data-label="' + t('receipt') + '"><span class="mono small">' + (x && x.receipt ? x.receipt : '—') + '</span></td>' +
        (k ? '<td data-label="' + t('rate') + '" class="r num">' + (x && x.rate ? inr(x.rate) : '—') + '</td><td data-label="' + t('weight') + '" class="r num">' + (x && x.weight ? grams(x.weight) : '—') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>' + (opts && opts.noNote ? '' : '<p class="muted small">' + t('passbookNote') + '</p>');
}
function passbookView(e, admin) {
  const s = summary(e), sc = SCHEMES[e.scheme], c = getCust(e.customerId);
  return '<section class="pb-cover"><span class="pb-stamp">DEMO</span><div><p class="eyebrow">' + t('digitalPassbook') + '</p><h1>' + L(sc.name) + '</h1>' +
      '<dl class="pb-meta"><div><dt>' + t('enrollmentId') + '</dt><dd class="mono">' + e.id + '</dd></div><div><dt>' + t('customer') + '</dt><dd>' + esc(custName(c)) + '</dd></div>' +
      '<div><dt>' + t('period') + '</dt><dd>' + fmtMonth(e.start) + ' – ' + fmtMonth(s.end) + '</dd></div><div><dt>' + t('contribution') + '</dt><dd>' + (e.fixedAmount ? inr(e.fixedAmount) : t('flexibleShort')) + '</dd></div>' +
      '<div><dt>' + t('status') + '</dt><dd>' + statusChip(s.status) + '</dd></div></dl></div>' +
      ring(s.verifiedCount, 12, t('progress')) + '</section>' +
    '<div class="stat-row"><div class="stat"><span>' + t('totalContribution') + '</span><b>' + inr(s.verifiedAmt) + '</b><small>DEMO</small></div>' +
      '<div class="stat"><span>' + t('pendingAmount') + '</span><b>' + inr(s.pendingAmt) + '</b></div>' +
      '<div class="stat"><span>' + t('goldWeight') + '</span><b>' + (s.weight != null ? grams(s.weight) : t('asPerTerms')) + '</b>' + (s.weight != null ? '<small>' + t('notVerifiedBalance') + '</small>' : '') + '</div></div>' +
    (e.status === 'pending' ? '<div class="note note--info">' + ic('info') + '<span>' + t('pendingEnrollNote') + '</span></div>' : '') +
    '<section><h2 class="h2 section-head">' + t('installments') + '</h2>' + instTable(e) + '</section>';
}

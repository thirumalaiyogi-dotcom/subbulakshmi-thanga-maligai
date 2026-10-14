'use strict';
/* =========================================================
   GOLD SAVINGS · Supabase data layer + shared views (Phase 5)
   Used by both apps in Supabase mode only. All money-changing actions go
   through database functions; the browser never sets a payment status.
   Scheme terms come from the database. Empty terms are shown as
   "Not configured"; nothing is assumed or calculated in the browser.
   ========================================================= */
addStrings({
  decisionNote: 'Store note',
  enrollFlexNote: 'You choose the amount for each installment, within the approved range.',
  chooseAmount: 'Monthly amount',
  noEnrollmentsLive: 'You have not enrolled in a scheme yet.',
  openPassbook: 'Open passbook',
  amountFixedHint: 'Your fixed monthly amount.',
  /* statuses */
  is_pending_payment: 'Pending payment', is_pending_verification: 'Pending verification', is_paid: 'Paid',
  ps_pending_verification: 'Pending verification', ps_verified: 'Verified', ps_rejected: 'Rejected', ps_voided: 'Voided (corrected)',
  es_pending_approval: 'Awaiting store approval', es_active: 'Active', es_rejected: 'Not approved', es_cancelled: 'Cancelled', es_redeemed: 'Redeemed',
  rs_pending: 'Redemption pending', rs_approved: 'Redemption approved', rs_rejected: 'Redemption rejected', rs_completed: 'Redemption completed', rs_cancelled: 'Cancelled',
  ss_draft: 'DEMO / NOT APPROVED', ss_approved: 'Approved terms', ss_retired: 'Closed',
  /* scheme terms */
  svNotSet: 'Not configured', termsPending: 'The official terms of this scheme have not been approved by the shop owner yet. Enrollment is not available.',
  termsApprovedOn: 'Terms approved on', schemeTerms: 'Scheme terms', ct_fixed: 'Fixed monthly amount', ct_flexible: 'Flexible monthly amount',
  t_contribution: 'Contribution', t_duration: 'Duration', t_minmax: 'Monthly amount range', t_allowedAmounts: 'Allowed monthly amounts',
  t_window: 'Payment window', t_conversion: 'Gold conversion', t_redemptionAfter: 'Redemption available after', monthsN: '{n} months',
  dayRange: 'Day {a}–{b} of each month', gc_none: 'No gold conversion', gc_verification_date_rate: 'Each verified payment ÷ the store\'s {p} rate on the verification date',
  upTo: 'up to', fromAmt: 'from', enrollmentOpen: 'Enrollment open', enrollmentClosed: 'Enrollment closed',
  /* rates */
  goldRateTitle: 'Gold rate', currentRates: 'Today\'s store gold rate', perGram: 'per gram', effectiveFrom: 'Effective from',
  rateMissing: 'No approved gold rate has been entered by the store yet.', rateStale: 'This rate was entered more than 3 days ago and may be outdated. Please confirm at the store.',
  rateManualNote: 'Rates are entered manually by the store. They are not a live market feed.', rateSource: 'Source / note',
  /* passbook */
  enrollmentNo: 'Enrollment no.', installmentNo: 'Installment', dueMonth: 'Due month', expected: 'Expected', paidTotal: 'Verified total',
  pendingTotalLbl: 'Awaiting verification', paidCount: 'Installments paid', goldWeightTotal: 'Gold weight (from verified payments)',
  startMonthLbl: 'Start month', receiptNo: 'Receipt no.', upiRef: 'UPI reference', paidOnLbl: 'Paid on', methodLbl: 'Method',
  m_cash: 'Cash', m_upi: 'UPI', m_card: 'Card', m_bank_transfer: 'Bank transfer', ch_in_store: 'At the store', ch_customer_upi: 'UPI reference (online)',
  payments: 'Payments', noPayments: 'No payments yet.', schedule: 'Installment schedule', rejectionReason: 'Reason', voidReason: 'Correction reason',
  recordedBy: 'Recorded by', verifiedByLbl: 'Verified by', submittedAt: 'Submitted', rateUsed: 'Rate used', weightLbl: 'Weight',
  realDataNote: 'Only payments verified by the store count towards your total. A submitted UPI reference is not proof of payment until the store verifies it.',
  /* errors from the savings functions */
  err_profile_incomplete: 'Please add your full name and mobile number in your account first.',
  err_scheme_not_open: 'This scheme is not open for enrollment.', err_invalid_amount: 'This amount is not allowed for the scheme.',
  err_amount_mismatch: 'The amount must equal your fixed monthly amount.', err_amount_out_of_range: 'The amount is outside the scheme\'s allowed range.',
  err_duplicate_request: 'You already have an open request for this.', err_cannot_cancel: 'This request can no longer be cancelled.',
  err_reason_required: 'Please enter a reason (at least 5 characters).', err_scheme_terms_incomplete: 'Fill in all required terms before approval.',
  err_approval_note_required: 'Record how the shop owner approved these terms (at least 10 characters).',
  err_scheme_terms_changed: 'The scheme terms changed after this request. Reject it and ask the customer to request again.',
  err_invalid_start_month: 'Choose a valid start month.', err_customer_not_found: 'Customer not found.',
  err_installment_not_found: 'Installment not found.', err_enrollment_not_active: 'This enrollment is not active.',
  err_installment_not_payable: 'This installment is already paid or awaiting verification.', err_invalid_reference: 'Enter a valid UPI reference (6–35 letters/digits).',
  err_invalid_payment_date: 'The payment date cannot be in the future or more than 90 days ago.',
  err_duplicate_reference: 'This UPI reference has already been used.', err_gold_rate_missing: 'No approved gold rate exists for this scheme\'s purity. Enter today\'s rate first.',
  err_payment_pending_verification: 'A UPI payment for this is still awaiting verification. Verify or reject it first.',
  err_invalid_method: 'Choose a payment method.', err_redemption_in_progress: 'A redemption is approved or completed for this enrollment, so payments cannot be changed.',
  err_rate_required: 'Enter at least one rate.', err_invalid_rate: 'Enter a rate between ₹1,000 and ₹1,00,000 per gram.',
  err_invalid_rate_order: 'The 22K rate must be lower than the 24K rate.', err_invalid_effective_date: 'The effective time must be within the last 30 days or the next 7 days.',
  err_source_required: 'Enter the source or a note for this rate.', err_invalid_type: 'Choose jewellery or gold coin.',
  err_invalid_preference: 'The preference is too long.', err_invalid_visit_date: 'Choose a visit date within the next 90 days.',
  err_financial_record_delete_blocked: 'Financial records cannot be deleted.', err_payment_fields_immutable: 'Verified payment details cannot be changed.'
}, {
  decisionNote: 'கடையின் குறிப்பு',
  enrollFlexNote: 'அங்கீகரிக்கப்பட்ட வரம்புக்குள் ஒவ்வொரு தவணைக்கும் தொகையை நீங்களே தேர்ந்தெடுக்கலாம்.',
  chooseAmount: 'மாதத் தொகை',
  noEnrollmentsLive: 'நீங்கள் இன்னும் எந்தத் திட்டத்திலும் சேரவில்லை.',
  openPassbook: 'பாஸ்புக்கைத் திற',
  amountFixedHint: 'உங்கள் நிலையான மாதத் தொகை.',
  is_pending_payment: 'செலுத்த வேண்டியது', is_pending_verification: 'சரிபார்ப்பில் உள்ளது', is_paid: 'செலுத்தப்பட்டது',
  ps_pending_verification: 'சரிபார்ப்பில் உள்ளது', ps_verified: 'சரிபார்க்கப்பட்டது', ps_rejected: 'நிராகரிக்கப்பட்டது', ps_voided: 'ரத்து (திருத்தம்)',
  es_pending_approval: 'கடையின் ஒப்புதலுக்குக் காத்திருக்கிறது', es_active: 'செயலில்', es_rejected: 'ஏற்கப்படவில்லை', es_cancelled: 'ரத்து செய்யப்பட்டது', es_redeemed: 'மீட்கப்பட்டது',
  rs_pending: 'மீட்பு நிலுவையில்', rs_approved: 'மீட்புக்கு ஒப்புதல்', rs_rejected: 'மீட்பு நிராகரிக்கப்பட்டது', rs_completed: 'மீட்பு நிறைவு', rs_cancelled: 'ரத்து செய்யப்பட்டது',
  ss_draft: 'டெமோ / ஒப்புதல் இல்லை', ss_approved: 'அங்கீகரிக்கப்பட்ட விதிமுறைகள்', ss_retired: 'நிறுத்தப்பட்டது',
  svNotSet: 'அமைக்கப்படவில்லை', termsPending: 'இந்தத் திட்டத்தின் அதிகாரப்பூர்வ விதிமுறைகளுக்குக் கடை உரிமையாளர் இன்னும் ஒப்புதல் அளிக்கவில்லை. இப்போது பதிவு செய்ய இயலாது.',
  termsApprovedOn: 'விதிமுறைகள் அங்கீகரிக்கப்பட்ட நாள்', schemeTerms: 'திட்ட விதிமுறைகள்', ct_fixed: 'நிலையான மாதத் தொகை', ct_flexible: 'நெகிழ்வான மாதத் தொகை',
  t_contribution: 'தவணை முறை', t_duration: 'காலம்', t_minmax: 'மாதத் தொகை வரம்பு', t_allowedAmounts: 'அனுமதிக்கப்பட்ட மாதத் தொகைகள்',
  t_window: 'செலுத்தும் காலம்', t_conversion: 'தங்க மாற்றம்', t_redemptionAfter: 'மீட்பு கிடைக்கும் காலம்', monthsN: '{n} மாதங்கள்',
  dayRange: 'ஒவ்வொரு மாதமும் {a}–{b} தேதி', gc_none: 'தங்க மாற்றம் இல்லை', gc_verification_date_rate: 'சரிபார்க்கப்பட்ட ஒவ்வொரு தவணையும் ÷ சரிபார்ப்பு நாளின் கடை {p} விலை',
  upTo: 'அதிகபட்சம்', fromAmt: 'குறைந்தது', enrollmentOpen: 'பதிவு திறந்துள்ளது', enrollmentClosed: 'பதிவு மூடப்பட்டுள்ளது',
  goldRateTitle: 'தங்க விலை', currentRates: 'இன்றைய கடை தங்க விலை', perGram: 'ஒரு கிராம்', effectiveFrom: 'நடைமுறைக்கு வந்தது',
  rateMissing: 'கடை இன்னும் அங்கீகரிக்கப்பட்ட தங்க விலையை உள்ளிடவில்லை.', rateStale: 'இந்த விலை 3 நாட்களுக்கு முன் உள்ளிடப்பட்டது; பழையதாக இருக்கலாம். கடையில் உறுதிசெய்யவும்.',
  rateManualNote: 'விலைகள் கடையால் கைமுறையாக உள்ளிடப்படுகின்றன. இவை நேரடிச் சந்தை விலை அல்ல.', rateSource: 'மூலம் / குறிப்பு',
  enrollmentNo: 'பதிவு எண்', installmentNo: 'தவணை', dueMonth: 'செலுத்த வேண்டிய மாதம்', expected: 'எதிர்பார்க்கும் தொகை', paidTotal: 'சரிபார்க்கப்பட்ட மொத்தம்',
  pendingTotalLbl: 'சரிபார்ப்புக்குக் காத்திருப்பவை', paidCount: 'செலுத்திய தவணைகள்', goldWeightTotal: 'தங்க எடை (சரிபார்க்கப்பட்ட தவணைகளிலிருந்து)',
  startMonthLbl: 'தொடக்க மாதம்', receiptNo: 'ரசீது எண்', upiRef: 'UPI குறிப்பு எண்', paidOnLbl: 'செலுத்திய நாள்', methodLbl: 'முறை',
  m_cash: 'ரொக்கம்', m_upi: 'UPI', m_card: 'கார்டு', m_bank_transfer: 'வங்கிப் பரிமாற்றம்', ch_in_store: 'கடையில்', ch_customer_upi: 'UPI குறிப்பு (ஆன்லைன்)',
  payments: 'தவணைப் பதிவுகள்', noPayments: 'இன்னும் தவணைப் பதிவுகள் இல்லை.', schedule: 'தவணை அட்டவணை', rejectionReason: 'காரணம்', voidReason: 'திருத்தக் காரணம்',
  recordedBy: 'பதிவு செய்தவர்', verifiedByLbl: 'சரிபார்த்தவர்', submittedAt: 'சமர்ப்பித்தது', rateUsed: 'பயன்படுத்திய விலை', weightLbl: 'எடை',
  realDataNote: 'கடை சரிபார்த்த தவணைகள் மட்டுமே உங்கள் மொத்தத்தில் சேரும். நீங்கள் சமர்ப்பிக்கும் UPI குறிப்பு எண், கடை சரிபார்க்கும் வரை பணம் செலுத்தியதற்கான சான்று அல்ல.',
  err_profile_incomplete: 'முதலில் உங்கள் கணக்கில் முழுப் பெயரையும் கைபேசி எண்ணையும் சேர்க்கவும்.',
  err_scheme_not_open: 'இந்தத் திட்டத்தில் இப்போது பதிவு செய்ய இயலாது.', err_invalid_amount: 'இந்தத் தொகை திட்டத்தில் அனுமதிக்கப்படவில்லை.',
  err_amount_mismatch: 'தொகை உங்கள் நிலையான மாதத் தொகைக்குச் சமமாக இருக்க வேண்டும்.', err_amount_out_of_range: 'தொகை திட்டம் அனுமதிக்கும் வரம்புக்கு வெளியே உள்ளது.',
  err_duplicate_request: 'இதற்கு ஏற்கனவே ஒரு கோரிக்கை நிலுவையில் உள்ளது.', err_cannot_cancel: 'இந்தக் கோரிக்கையை இனி ரத்து செய்ய இயலாது.',
  err_reason_required: 'காரணத்தை உள்ளிடவும் (குறைந்தது 5 எழுத்துகள்).', err_scheme_terms_incomplete: 'ஒப்புதலுக்கு முன் தேவையான எல்லா விதிமுறைகளையும் நிரப்பவும்.',
  err_approval_note_required: 'கடை உரிமையாளர் இந்த விதிமுறைகளுக்கு எப்படி ஒப்புதல் அளித்தார் என்பதைப் பதிவு செய்யவும் (குறைந்தது 10 எழுத்துகள்).',
  err_scheme_terms_changed: 'இந்தக் கோரிக்கைக்குப் பின் திட்ட விதிமுறைகள் மாறியுள்ளன. இதை நிராகரித்து, வாடிக்கையாளரை மீண்டும் கோரச் சொல்லவும்.',
  err_invalid_start_month: 'சரியான தொடக்க மாதத்தைத் தேர்ந்தெடுக்கவும்.', err_customer_not_found: 'வாடிக்கையாளர் கிடைக்கவில்லை.',
  err_installment_not_found: 'தவணை கிடைக்கவில்லை.', err_enrollment_not_active: 'இந்தப் பதிவு செயலில் இல்லை.',
  err_installment_not_payable: 'இந்தத் தவணை ஏற்கனவே செலுத்தப்பட்டது அல்லது சரிபார்ப்பில் உள்ளது.', err_invalid_reference: 'சரியான UPI குறிப்பு எண்ணை உள்ளிடவும் (6–35 எழுத்து/எண்கள்).',
  err_invalid_payment_date: 'செலுத்திய நாள் எதிர்காலமாகவோ 90 நாட்களுக்கு முந்தையதாகவோ இருக்கக் கூடாது.',
  err_duplicate_reference: 'இந்த UPI குறிப்பு எண் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது.', err_gold_rate_missing: 'இந்தத் திட்டத்தின் தூய்மைக்கு அங்கீகரிக்கப்பட்ட தங்க விலை இல்லை. முதலில் இன்றைய விலையை உள்ளிடவும்.',
  err_payment_pending_verification: 'இதற்கான UPI தவணை இன்னும் சரிபார்ப்பில் உள்ளது. முதலில் அதைச் சரிபார்க்கவும் அல்லது நிராகரிக்கவும்.',
  err_invalid_method: 'செலுத்தும் முறையைத் தேர்ந்தெடுக்கவும்.', err_redemption_in_progress: 'இந்தப் பதிவுக்கு மீட்பு ஒப்புதல் பெற்றுள்ளது அல்லது நிறைவடைந்துள்ளது; தவணைகளை மாற்ற இயலாது.',
  err_rate_required: 'குறைந்தது ஒரு விலையை உள்ளிடவும்.', err_invalid_rate: 'ஒரு கிராமுக்கு ₹1,000 முதல் ₹1,00,000 வரையிலான விலையை உள்ளிடவும்.',
  err_invalid_rate_order: '22K விலை 24K விலையைவிடக் குறைவாக இருக்க வேண்டும்.', err_invalid_effective_date: 'நடைமுறை நேரம் கடந்த 30 நாட்களுக்குள் அல்லது அடுத்த 7 நாட்களுக்குள் இருக்க வேண்டும்.',
  err_source_required: 'இந்த விலைக்கான மூலம் அல்லது குறிப்பை உள்ளிடவும்.', err_invalid_type: 'நகை அல்லது தங்க நாணயத்தைத் தேர்ந்தெடுக்கவும்.',
  err_invalid_preference: 'விருப்பக் குறிப்பு மிக நீளமாக உள்ளது.', err_invalid_visit_date: 'அடுத்த 90 நாட்களுக்குள் ஒரு வருகை நாளைத் தேர்ந்தெடுக்கவும்.',
  err_financial_record_delete_blocked: 'நிதிப் பதிவுகளை நீக்க இயலாது.', err_payment_fields_immutable: 'சரிபார்க்கப்பட்ட தவணை விவரங்களை மாற்ற இயலாது.'
});

const SV_TONE = {
  is: { pending_payment: 'neutral', pending_verification: 'warn', paid: 'ok' },
  ps: { pending_verification: 'warn', verified: 'ok', rejected: 'err', voided: 'neutral' },
  es: { pending_approval: 'warn', active: 'info', rejected: 'err', cancelled: 'neutral', redeemed: 'ok' },
  rs: { pending: 'warn', approved: 'info', rejected: 'err', completed: 'ok', cancelled: 'neutral' },
  ss: { draft: 'warn', approved: 'ok', retired: 'neutral' }
};
function svChip(kind, st) { return '<span class="chip chip--' + ((SV_TONE[kind] || {})[st] || 'neutral') + '">' + t(kind + '_' + st) + '</span>'; }
const svName = s => s ? L({ en: s.name_en, ta: s.name_ta }) : '—';
const svMonth = d => d ? fmtMonth(String(d).slice(0, 7)) : '—';
function svTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts); if (isNaN(d)) return '—';
  return fmtDate(isoOf(d)) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
const tf = (k, o) => Object.keys(o).reduce((s, x) => s.replace('{' + x + '}', o[x]), t(k));
const nc = () => '<span class="muted">' + t('svNotSet') + '</span>';

/* Terms list for a scheme row OR an enrollment's snapshot (same column names). */
function svTermsList(s) {
  const amounts = s.contribution_type === 'fixed'
    ? (s.allowed_fixed_amounts && s.allowed_fixed_amounts.length ? s.allowed_fixed_amounts.map(inr).join(', ') : nc())
    : (s.contribution_type === 'flexible'
      ? (s.min_installment != null ? t('fromAmt') + ' ' + inr(s.min_installment) : '') + (s.max_installment != null ? ' · ' + t('upTo') + ' ' + inr(s.max_installment) : '') || nc()
      : nc());
  return '<dl class="kv kv--terms">' +
    '<dt>' + t('t_contribution') + '</dt><dd>' + (s.contribution_type ? t('ct_' + s.contribution_type) : nc()) + '</dd>' +
    '<dt>' + (s.contribution_type === 'fixed' ? t('t_allowedAmounts') : t('t_minmax')) + '</dt><dd>' + amounts + '</dd>' +
    '<dt>' + t('t_duration') + '</dt><dd>' + (s.duration_months ? tf('monthsN', { n: s.duration_months }) : nc()) + '</dd>' +
    '<dt>' + t('t_window') + '</dt><dd>' + (s.payment_window_start_day ? tf('dayRange', { a: s.payment_window_start_day, b: s.payment_window_end_day }) : nc()) + '</dd>' +
    '<dt>' + t('t_conversion') + '</dt><dd>' + (s.gold_conversion && s.gold_conversion !== 'none' ? tf('gc_' + s.gold_conversion, { p: s.conversion_purity || '' }) : t('gc_none')) + '</dd>' +
    '<dt>' + t('t_redemptionAfter') + '</dt><dd>' + (s.redemption_after_months ? tf('monthsN', { n: s.redemption_after_months }) : nc()) + '</dd></dl>';
}
function svTermsText(s) {
  const txt = lang === 'ta' ? s.terms_ta : s.terms_en;
  return txt ? '<div class="terms-text">' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '';
}

/* Current store gold rate card (customer + admin). */
function svRateCard(rates) {
  if (!rates || !rates.length) return '<div class="note note--warn" role="status">' + ic('alert') + '<span>' + t('rateMissing') + ' ' + t('rateManualNote') + '</span></div>';
  const newest = rates.reduce((a, r) => (a && a.effective_at > r.effective_at ? a : r), null);
  const stale = Date.now() - new Date(newest.effective_at).getTime() > 3 * 86400000;
  return '<section class="rate-card rate-card--live" aria-label="' + t('currentRates') + '"><div class="rate-cells">' +
      ['22K', '24K'].map(p => { const r = rates.find(x => x.purity === p);
        return '<div><span>' + p + ' · ' + t('perGram') + '</span><b>' + (r ? inr(r.rate_per_gram) : '—') + '</b><small>' + (r ? t('effectiveFrom') + ' ' + svTime(r.effective_at) : t('svNotSet')) + '</small></div>'; }).join('') +
    '</div><p class="small muted">' + t('rateManualNote') + '</p></section>' +
    (stale ? '<div class="note note--warn" role="status">' + ic('alert') + '<span>' + t('rateStale') + '</span></div>' : '');
}

/* Passbook: enrollment + schedule + payments (customer and admin). */
function svPassbook(b, opts) {
  opts = opts || {};
  const e = b.enrollment, tot = b.totals || {}, snap = e.terms_snapshot || {};
  const byInst = {}; b.payments.forEach(p => { (byInst[p.installment_id] = byInst[p.installment_id] || []).push(p); });
  const activePay = id => (byInst[id] || []).find(p => p.status === 'verified' || p.status === 'pending_verification');
  const who = id => id ? esc((opts.names && opts.names[id]) || '—') : '—';
  return '<section class="pb-cover pb-cover--live"><div><p class="eyebrow">' + t('digitalPassbook') + '</p><h1>' + esc(svName(snap)) + '</h1>' +
      '<dl class="pb-meta"><div><dt>' + t('enrollmentNo') + '</dt><dd class="mono">' + esc(e.enrollment_number) + '</dd></div>' +
      (opts.admin && b.customer ? '<div><dt>' + t('customer') + '</dt><dd>' + esc(b.customer.full_name || '—') + (b.customer.phone ? ' · <span class="mono">' + esc(b.customer.phone) + '</span>' : '') + '</dd></div>' : '') +
      '<div><dt>' + t('startMonthLbl') + '</dt><dd>' + svMonth(e.start_month) + '</dd></div>' +
      '<div><dt>' + t('t_contribution') + '</dt><dd>' + (e.contribution_type === 'fixed' ? inr(e.fixed_amount) + ' / ' + t('monthly').toLowerCase() : t('ct_flexible')) + '</dd></div>' +
      '<div><dt>' + t('status') + '</dt><dd>' + svChip('es', e.status) + '</dd></div></dl></div>' +
      ring(Number(tot.paid_count || 0), e.duration_months, t('progress')) + '</section>' +
    '<div class="stat-row"><div class="stat"><span>' + t('paidTotal') + '</span><b>' + inr(tot.verified_total || 0) + '</b><small>' + (tot.paid_count || 0) + ' / ' + e.duration_months + ' ' + t('paidCount').toLowerCase() + '</small></div>' +
      '<div class="stat"><span>' + t('pendingTotalLbl') + '</span><b>' + inr(tot.pending_total || 0) + '</b></div>' +
      (e.gold_conversion !== 'none' ? '<div class="stat"><span>' + t('goldWeightTotal') + '</span><b>' + grams(tot.gold_weight_g || 0) + '</b><small>' + esc(e.conversion_purity || '') + '</small></div>' : '') + '</div>' +
    '<p class="muted small">' + t('realDataNote') + '</p>' +
    '<section><h2 class="h2 section-head">' + t('schedule') + '</h2><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>' + t('dueMonth') + '</th><th class="r">' + t('expected') + '</th><th>' + t('status') + '</th><th>' + t('receiptNo') + '</th>' + (opts.instAction ? '<th></th>' : '') + '</tr></thead><tbody>' +
      (b.installments.length ? b.installments.map(i => { const p = activePay(i.id);
        return '<tr><td data-label="#">' + i.installment_no + '</td><td data-label="' + t('dueMonth') + '">' + svMonth(i.due_month) + '</td>' +
          '<td data-label="' + t('expected') + '" class="r num">' + (i.expected_amount ? inr(i.expected_amount) : '—') + '</td>' +
          '<td data-label="' + t('status') + '">' + svChip('is', i.status) + '</td>' +
          '<td data-label="' + t('receiptNo') + '"><span class="mono small">' + (p && p.receipt_number ? esc(p.receipt_number) : '—') + '</span></td>' +
          (opts.instAction ? '<td data-label="">' + opts.instAction(i) + '</td>' : '') + '</tr>'; }).join('')
        : '<tr><td colspan="6" class="muted">' + t(e.status === 'pending_approval' ? 'es_pending_approval' : 'noPayments') + '</td></tr>') +
    '</tbody></table></div></section>' +
    '<section><h2 class="h2 section-head">' + t('payments') + '</h2>' + svPaymentsTable(b.payments, b.installments, Object.assign({}, opts, { who })) + '</section>';
}
function svPaymentsTable(list, installments, opts) {
  opts = opts || {};
  if (!list.length) return '<p class="muted">' + t('noPayments') + '</p>';
  const instNo = id => { const i = (installments || []).find(x => x.id === id); return i ? i.installment_no + ' · ' + svMonth(i.due_month) : '—'; };
  return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('submittedAt') + '</th><th>' + t('installmentNo') + '</th><th class="r">' + t('amount') + '</th><th>' + t('methodLbl') + '</th><th>' + t('status') + '</th><th>' + t('receiptNo') + ' / ' + t('upiRef') + '</th>' + (opts.admin ? '<th>' + t('verifiedByLbl') + '</th>' : '') + (opts.payAction ? '<th></th>' : '') + '</tr></thead><tbody>' +
    list.map(p => '<tr><td data-label="' + t('submittedAt') + '">' + svTime(p.submitted_at) + '<br><small class="muted">' + t('paidOnLbl') + ': ' + fmtDate(p.paid_on) + '</small></td>' +
      '<td data-label="' + t('installmentNo') + '">' + (p.savings_installments ? p.savings_installments.installment_no + ' · ' + svMonth(p.savings_installments.due_month) : instNo(p.installment_id)) +
        (p.savings_enrollments ? '<br><small class="mono muted">' + esc(p.savings_enrollments.enrollment_number) + '</small>' : '') + (opts.admin && p.profiles ? '<br><small>' + esc(p.profiles.full_name || '—') + '</small>' : '') + '</td>' +
      '<td data-label="' + t('amount') + '" class="r num"><b>' + inr(p.amount) + '</b>' + (p.gold_weight_g != null ? '<br><small class="muted">' + grams(p.gold_weight_g) + ' @ ' + inr(p.gold_rate_per_g) + '</small>' : '') + '</td>' +
      '<td data-label="' + t('methodLbl') + '">' + t('m_' + p.method) + '<br><small class="muted">' + t('ch_' + p.channel) + '</small></td>' +
      '<td data-label="' + t('status') + '">' + svChip('ps', p.status) +
        (p.status === 'rejected' && p.rejection_reason ? '<br><small class="muted">' + t('rejectionReason') + ': ' + esc(p.rejection_reason) + '</small>' : '') +
        (p.status === 'voided' && p.void_reason ? '<br><small class="muted">' + t('voidReason') + ': ' + esc(p.void_reason) + '</small>' : '') + '</td>' +
      '<td data-label="' + t('receiptNo') + '"><span class="mono small">' + (p.receipt_number ? esc(p.receipt_number) : '—') + (p.upi_reference ? '<br>UPI ' + esc(p.upi_reference) : '') + (p.store_reference ? '<br>' + esc(p.store_reference) : '') + '</span></td>' +
      (opts.admin ? '<td data-label="' + t('verifiedByLbl') + '">' + (opts.who ? opts.who(p.verified_by) : '—') + (p.verified_at ? '<br><small class="muted">' + svTime(p.verified_at) + '</small>' : '') + '</td>' : '') +
      (opts.payAction ? '<td data-label="">' + opts.payAction(p) + '</td>' : '') + '</tr>').join('') +
    '</tbody></table></div>';
}

/* ---------- data access ---------- */
const PAY_EMBED = '*, savings_enrollments(enrollment_number, scheme_id, contribution_type), savings_installments(installment_no, due_month)';
const SavingsApi = {
  async schemes() { const { data } = await run(Backend.client.from('savings_schemes').select('*').order('sort_order')); return data || []; },
  async scheme(id) { const { data } = await run(Backend.client.from('savings_schemes').select('*').eq('id', id).maybeSingle()); return data; },
  async currentRates() { const { data } = await run(Backend.client.rpc('current_gold_rates')); return data || []; },
  async rateHistory() { const { data } = await run(Backend.client.from('gold_rates').select('*').order('effective_at', { ascending: false }).limit(100)); return data || []; },
  async myEnrollments() {
    const [{ data: enr }, { data: tots }] = await Promise.all([
      run(Backend.client.from('savings_enrollments').select('*').eq('customer_id', Auth.user.id).order('created_at', { ascending: false })),
      run(Backend.client.from('savings_enrollment_totals').select('*'))]);
    const map = {}; (tots || []).forEach(x => { map[x.enrollment_id] = x; });
    return (enr || []).map(e => Object.assign({}, e, { totals: map[e.id] || {} }));
  },
  async passbook(id) {
    const { data: e } = await run(Backend.client.from('savings_enrollments').select('*').eq('id', id).maybeSingle());
    if (!e) return null;
    const [{ data: inst }, { data: pays }, { data: tot }] = await Promise.all([
      run(Backend.client.from('savings_installments').select('*').eq('enrollment_id', id).order('installment_no')),
      run(Backend.client.from('savings_payments').select('*').eq('enrollment_id', id).order('submitted_at', { ascending: false })),
      run(Backend.client.from('savings_enrollment_totals').select('*').eq('enrollment_id', id).maybeSingle())]);
    return { enrollment: e, installments: inst || [], payments: pays || [], totals: tot || {} };
  },
  async myPayments() { const { data } = await run(Backend.client.from('savings_payments').select(PAY_EMBED).eq('customer_id', Auth.user.id).order('submitted_at', { ascending: false }).limit(200)); return data || []; },
  async myRedemptions() { const { data } = await run(Backend.client.from('savings_redemptions').select('*, savings_enrollments(enrollment_number, scheme_id)').eq('customer_id', Auth.user.id).order('requested_at', { ascending: false })); return data || []; },
  async requestEnrollment(schemeId, amount) { const { data } = await run(Backend.client.rpc('request_enrollment', { p_scheme_id: schemeId, p_fixed_amount: amount == null ? null : amount })); return Array.isArray(data) ? data[0] : data; },
  async cancelEnrollment(id) { await run(Backend.client.rpc('cancel_my_enrollment_request', { p_enrollment_id: id })); },
  async submitUpi(installmentId, amount, ref, paidOn) { const { data } = await run(Backend.client.rpc('submit_upi_payment', { p_installment_id: installmentId, p_amount: amount, p_upi_reference: ref, p_paid_on: paidOn })); return Array.isArray(data) ? data[0] : data; },
  async requestRedemption(enrId, type, pref, visit) { const { data } = await run(Backend.client.rpc('request_redemption', { p_enrollment_id: enrId, p_type: type, p_preference: pref || null, p_visit_date: visit || null })); return Array.isArray(data) ? data[0] : data; },
  async cancelRedemption(id) { await run(Backend.client.rpc('cancel_my_redemption', { p_redemption_id: id })); }
};
/* Map scheme id -> scheme row, cached per page load */
let SV_SCHEMES = null;
async function svSchemeMap() { if (!SV_SCHEMES) { const list = await SavingsApi.schemes(); SV_SCHEMES = {}; list.forEach(s => { SV_SCHEMES[s.id] = s; }); } return SV_SCHEMES; }
const svSchemeName = (id) => (SV_SCHEMES && SV_SCHEMES[id]) ? svName(SV_SCHEMES[id]) : id;

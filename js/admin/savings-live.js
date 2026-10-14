'use strict';
/* =========================================================
   ADMIN · GOLD SAVINGS on the real backend (Supabase mode, Phase 5)
   Routes: #/schemes  #/scheme-edit/<id|new>  #/enrollments  #/payments
           #/records/<enrollmentId?>  #/customers  #/redemptions  #/goldrate  #/audit
   Every action calls a database function that checks the role again:
   hidden buttons are a convenience, not the security.
     admin  : scheme terms + approval, enrollment decisions, UPI verify/reject,
              void (correction), gold rates, redemption decisions, audit log
     staff  : view records, record in-store payments
   ========================================================= */
addStrings({
  a_audit: 'Financial audit log',
  lv_schemesSub: 'Scheme terms are entered only after the shop owner formally approves them.',
  lv_enrollmentsSub: 'Approve enrollment requests and enroll customers at the counter.',
  lv_paymentsSub: 'Customer UPI references waiting for verification against the store\'s bank statement.',
  lv_recordsSub: 'Customer passbooks, installment records and in-store payment entry.',
  lv_customersSub: 'Registered customers and their savings enrollments.',
  lv_redemptionsSub: 'Review, approve or reject customer redemption requests.',
  lv_goldrateSub: 'Enter the store\'s approved 22K / 24K rates. Every entry is kept in the history.',
  lv_auditSub: 'Who changed what, and when: approvals, rejections, corrections and rate changes.',
  /* schemes */
  addScheme: 'Add scheme', editTerms: 'Edit terms', approveTerms: 'Record owner approval', openEnrollment: 'Open enrollment', closeEnrollment: 'Close enrollment',
  retireScheme: 'Close scheme', schemeIdLbl: 'Scheme code', schemeIdHint: 'Lower-case letters, digits and hyphens, e.g. dhanalakshmi. Cannot be changed later.',
  termsWarn: 'Enter ONLY terms that the shop owner has formally approved. Leave a field empty if it has not been decided — the app will show "Not configured". Saving changes to an approved scheme returns it to NOT APPROVED until approval is recorded again. Existing enrollments keep the terms they joined with.',
  notSet: '— Not configured —', durationMonths: 'Duration (months)', minAmount: 'Minimum monthly amount (₹)', maxAmount: 'Maximum monthly amount (₹)',
  allowedAmountsLbl: 'Allowed fixed amounts (₹, comma separated) — leave empty to allow any amount between the minimum and maximum', windowStart: 'Payment window — from day', windowEnd: 'Payment window — to day',
  conversionLbl: 'Gold conversion', purityLbl: 'Conversion purity', redemptionAfterLbl: 'Redemption available after (months)',
  termsEnLbl: 'Full terms (English)', termsTaLbl: 'Full terms (Tamil)', saveTerms: 'Save terms', termsSaved: 'Scheme saved. It is NOT APPROVED until you record the owner\'s approval.',
  approveTitle: 'Record the shop owner\'s approval', approveNoteLbl: 'How was it approved?', approveNoteHint: 'e.g. "Signed terms sheet dated 20-10-2026, approved by owner Mr. …". At least 10 characters.',
  approveConfirm: 'I confirm the shop owner formally approved exactly these terms.', errConfirmTick: 'Tick the confirmation box to continue.', schemeApprovedToast: 'Approval recorded.',
  retireTitle: 'Close this scheme?', retireReason: 'Reason', schemeClosed: 'Scheme closed.', openToast: 'Enrollment opened.', closeToast: 'Enrollment closed.',
  approvalNoteLbl: 'Approval record', e_amountList: 'Enter amounts like 1000, 2000, 5000.', e_window: 'Both days are needed, "from" ≤ "to".',
  e_minmax: 'The maximum must be at least the minimum.', e_purity: 'Choose the purity used for conversion.', e_schemeId: 'Use 2–40 lower-case letters, digits or hyphens.',
  /* enrollments */
  tabPendingReq: 'Requests', tabActive: 'Active', tabAll: 'All', requestedAt: 'Requested', approveEnr: 'Approve', rejectEnr: 'Reject',
  approveEnrTitle: 'Approve enrollment', startMonthPick: 'First installment month', approveEnrNote: 'The installment schedule is created from the terms the customer agreed to.',
  rejectEnrTitle: 'Reject enrollment request', enrollCustomer: 'Enroll a customer', enrollCustomerTitle: 'Enroll a registered customer',
  findCustomer: 'Customer (search by name or mobile)', noCustomers: 'No matching customer. The customer must register in the app first.',
  schemeLbl: 'Scheme', noApprovedSchemes: 'No scheme has approved terms yet.', enrolledToast: 'Enrollment created.', decisionSaved: 'Decision saved.',
  /* payments */
  pendingUpi: 'Pending verification', processedPay: 'Processed', verifyPay: 'Verify', rejectPay: 'Reject', voidPay: 'Void (correct)',
  verifyPayTitle: 'Verify this UPI payment?', verifyChecklist: 'Only verify after you have found this exact amount, reference AND payment date in the store\'s bank / UPI statement. (Schemes that convert at the paid date\'s rate use that date.)',
  verifiedToastLive: 'Payment verified · receipt', rejectPayTitle: 'Reject this payment reference', rejectedPayToast: 'Payment rejected.',
  voidTitle: 'Void this verified payment?', voidHint: 'Use only to correct a mistake. The record stays in the passbook marked VOIDED with your reason.', voidedToast: 'Payment voided.',
  adminOnlyVerify: 'Only an admin can verify or reject customer UPI payments.', customerLbl: 'Customer',
  /* records / in-store */
  findEnrollment: 'Search by enrollment no., customer name or mobile', recordPay: 'Record in-store payment', recordPayTitle: 'Record payment received at the store',
  storeRefLbl: 'Store receipt book / reference (optional)', upiRefOpt: 'UPI reference (if paid by UPI at the counter)', noteOpt: 'Note (optional)',
  recordedToast: 'Payment recorded · receipt', backToRecords: 'All enrollments',
  /* redemptions */
  tabPendingRdm: 'Pending', tabApprovedRdm: 'Approved', approveRdm: 'Approve', rejectRdm: 'Reject', completeRdm: 'Mark completed',
  approveRdmTitle: 'Approve redemption request', rejectRdmTitle: 'Reject redemption request', completeRdmTitle: 'Mark redemption completed',
  completeNoteLbl: 'What was handed over?', completeHint: 'e.g. "22K coin 4 g handed over, invoice 1234". The enrollment is closed as REDEEMED.',
  noteLbl: 'Note', atRequest: 'At request', paidInst: 'installments paid',
  /* gold rate */
  addRates: 'Enter new rates', rate22: '22K rate per gram (₹)', rate24: '24K rate per gram (₹)', effectiveAt: 'Effective from', sourceLbl: 'Source / note',
  sourceHint: 'e.g. "Tenkasi jewellers association board rate, morning".', saveRates: 'Save rates', ratesSaved: 'Rates saved.',
  confirmRatesTitle: 'Save these rates?', confirmRatesMsg: 'Rates cannot be edited later. A mistake can only be withdrawn with a reason, and the record stays in the history.',
  rateHistoryLbl: 'Rate history', withdrawRate: 'Withdraw', withdrawTitle: 'Withdraw this rate?', withdrawnToast: 'Rate withdrawn.',
  rs_active: 'Active', rs_withdrawn: 'Withdrawn', enteredByLbl: 'Entered by', e_rate: 'Enter a rate between 1,000 and 1,00,000 (up to 2 decimals).',
  /* audit */
  auditTable: 'Record type', auditWhen: 'When', auditWho: 'By', auditWhat: 'Change', allRecords: 'All savings records',
  tb_savings_payments: 'Payments', tb_savings_enrollments: 'Enrollments', tb_savings_redemptions: 'Redemptions', tb_savings_schemes: 'Schemes', tb_gold_rates: 'Gold rates',
  ac_INSERT: 'Created', ac_UPDATE: 'Changed', ac_DELETE: 'Deleted',
  svKpiPending: 'UPI payments to verify', svKpiEnr: 'Enrollment requests', svKpiRdm: 'Open redemptions', svKpiActive: 'Active enrollments', savingsLiveHeading: 'Gold savings'
}, {
  a_audit: 'நிதி தணிக்கைப் பதிவு',
  lv_schemesSub: 'கடை உரிமையாளர் அதிகாரப்பூர்வமாக ஒப்புதல் அளித்த பிறகே திட்ட விதிமுறைகள் உள்ளிடப்பட வேண்டும்.',
  lv_enrollmentsSub: 'பதிவுக் கோரிக்கைகளுக்கு ஒப்புதல் அளிக்கவும்; கவுண்டரில் வாடிக்கையாளர்களைப் பதிவு செய்யவும்.',
  lv_paymentsSub: 'கடையின் வங்கி அறிக்கையுடன் சரிபார்க்கக் காத்திருக்கும் வாடிக்கையாளர் UPI குறிப்புகள்.',
  lv_recordsSub: 'வாடிக்கையாளர் பாஸ்புக், தவணைப் பதிவுகள், கடையில் செலுத்திய தவணைப் பதிவு.',
  lv_customersSub: 'பதிவு செய்த வாடிக்கையாளர்களும் அவர்களின் சேமிப்புப் பதிவுகளும்.',
  lv_redemptionsSub: 'வாடிக்கையாளர் மீட்புக் கோரிக்கைகளைப் பரிசீலித்து ஒப்புதல் அளிக்கவும் அல்லது நிராகரிக்கவும்.',
  lv_goldrateSub: 'கடையின் அங்கீகரிக்கப்பட்ட 22K / 24K விலைகளை உள்ளிடவும். ஒவ்வொரு பதிவும் வரலாற்றில் சேமிக்கப்படும்.',
  lv_auditSub: 'யார், எதை, எப்போது மாற்றினார்கள்: ஒப்புதல்கள், நிராகரிப்புகள், திருத்தங்கள், விலை மாற்றங்கள்.',
  addScheme: 'திட்டம் சேர்', editTerms: 'விதிமுறைகளைத் திருத்து', approveTerms: 'உரிமையாளர் ஒப்புதலைப் பதிவு செய்', openEnrollment: 'பதிவைத் திற', closeEnrollment: 'பதிவை மூடு',
  retireScheme: 'திட்டத்தை நிறுத்து', schemeIdLbl: 'திட்டக் குறியீடு', schemeIdHint: 'ஆங்கிலச் சிறிய எழுத்துகள், எண்கள், hyphen மட்டும், உதா. dhanalakshmi. பின்னர் மாற்ற இயலாது.',
  termsWarn: 'கடை உரிமையாளர் அதிகாரப்பூர்வமாக ஒப்புதல் அளித்த விதிமுறைகளை மட்டுமே உள்ளிடவும். முடிவு செய்யப்படாத இடத்தைக் காலியாக விடுங்கள் — செயலி "அமைக்கப்படவில்லை" எனக் காட்டும். அங்கீகரிக்கப்பட்ட திட்டத்தை மாற்றினால், ஒப்புதல் மீண்டும் பதிவாகும் வரை அது "ஒப்புதல் இல்லை" நிலைக்குத் திரும்பும். ஏற்கனவே சேர்ந்தவர்களுக்கு அவர்கள் சேர்ந்தபோதைய விதிமுறைகளே பொருந்தும்.',
  notSet: '— அமைக்கப்படவில்லை —', durationMonths: 'காலம் (மாதங்கள்)', minAmount: 'குறைந்தபட்ச மாதத் தொகை (₹)', maxAmount: 'அதிகபட்ச மாதத் தொகை (₹)',
  allowedAmountsLbl: 'அனுமதிக்கப்பட்ட நிலைத் தொகைகள் (₹, காற்புள்ளியால் பிரிக்கவும்) — குறைந்தபட்சம்–அதிகபட்சம் இடையே எந்தத் தொகையும் அனுமதிக்கக் காலியாக விடவும்', windowStart: 'செலுத்தும் காலம் — தொடக்கத் தேதி', windowEnd: 'செலுத்தும் காலம் — இறுதித் தேதி',
  conversionLbl: 'தங்க மாற்றம்', purityLbl: 'மாற்றத் தூய்மை', redemptionAfterLbl: 'மீட்பு கிடைக்கும் காலம் (மாதங்கள்)',
  termsEnLbl: 'முழு விதிமுறைகள் (ஆங்கிலம்)', termsTaLbl: 'முழு விதிமுறைகள் (தமிழ்)', saveTerms: 'விதிமுறைகளைச் சேமி', termsSaved: 'திட்டம் சேமிக்கப்பட்டது. உரிமையாளர் ஒப்புதலைப் பதிவு செய்யும் வரை இது "ஒப்புதல் இல்லை" நிலையில் இருக்கும்.',
  approveTitle: 'கடை உரிமையாளரின் ஒப்புதலைப் பதிவு செய்யவும்', approveNoteLbl: 'ஒப்புதல் எப்படிப் பெறப்பட்டது?', approveNoteHint: 'உதா. "20-10-2026 தேதியிட்ட கையொப்பமிட்ட விதிமுறைத் தாள், உரிமையாளர் திரு. … ஒப்புதல்". குறைந்தது 10 எழுத்துகள்.',
  approveConfirm: 'இதே விதிமுறைகளுக்குக் கடை உரிமையாளர் அதிகாரப்பூர்வமாக ஒப்புதல் அளித்தார் என உறுதிசெய்கிறேன்.', errConfirmTick: 'தொடர, உறுதிப்படுத்தல் பெட்டியில் டிக் செய்யவும்.', schemeApprovedToast: 'ஒப்புதல் பதிவு செய்யப்பட்டது.',
  retireTitle: 'இந்தத் திட்டத்தை நிறுத்தவா?', retireReason: 'காரணம்', schemeClosed: 'திட்டம் நிறுத்தப்பட்டது.', openToast: 'பதிவு திறக்கப்பட்டது.', closeToast: 'பதிவு மூடப்பட்டது.',
  approvalNoteLbl: 'ஒப்புதல் பதிவு', e_amountList: '1000, 2000, 5000 போல் தொகைகளை உள்ளிடவும்.', e_window: 'இரண்டு தேதிகளும் தேவை; "தொடக்கம்" ≤ "இறுதி".',
  e_minmax: 'அதிகபட்சம் குறைந்தபட்சத்தைவிடக் குறையக் கூடாது.', e_purity: 'மாற்றத்துக்கான தூய்மையைத் தேர்ந்தெடுக்கவும்.', e_schemeId: '2–40 ஆங்கிலச் சிறிய எழுத்து, எண் அல்லது hyphen பயன்படுத்தவும்.',
  tabPendingReq: 'கோரிக்கைகள்', tabActive: 'செயலில்', tabAll: 'அனைத்தும்', requestedAt: 'கோரிய நாள்', approveEnr: 'ஒப்புதல்', rejectEnr: 'நிராகரி',
  approveEnrTitle: 'பதிவுக்கு ஒப்புதல்', startMonthPick: 'முதல் தவணை மாதம்', approveEnrNote: 'வாடிக்கையாளர் ஏற்ற விதிமுறைகளிலிருந்தே தவணை அட்டவணை உருவாக்கப்படும்.',
  rejectEnrTitle: 'பதிவுக் கோரிக்கையை நிராகரி', enrollCustomer: 'வாடிக்கையாளரைப் பதிவு செய்', enrollCustomerTitle: 'பதிவு செய்த வாடிக்கையாளரைத் திட்டத்தில் சேர்',
  findCustomer: 'வாடிக்கையாளர் (பெயர் அல்லது கைபேசி எண்ணால் தேடவும்)', noCustomers: 'பொருந்தும் வாடிக்கையாளர் இல்லை. வாடிக்கையாளர் முதலில் செயலியில் பதிவு செய்ய வேண்டும்.',
  schemeLbl: 'திட்டம்', noApprovedSchemes: 'எந்தத் திட்டத்துக்கும் இன்னும் அங்கீகரிக்கப்பட்ட விதிமுறைகள் இல்லை.', enrolledToast: 'பதிவு உருவாக்கப்பட்டது.', decisionSaved: 'முடிவு சேமிக்கப்பட்டது.',
  pendingUpi: 'சரிபார்ப்பில்', processedPay: 'முடிந்தவை', verifyPay: 'சரிபார்', rejectPay: 'நிராகரி', voidPay: 'ரத்து (திருத்தம்)',
  verifyPayTitle: 'இந்த UPI தவணையைச் சரிபார்க்கவா?', verifyChecklist: 'கடையின் வங்கி / UPI அறிக்கையில் இதே தொகை, குறிப்பு எண், செலுத்திய தேதி மூன்றையும் கண்டறிந்த பிறகே சரிபார்க்கவும். (செலுத்திய நாள் விலையில் மாற்றும் திட்டங்கள் அந்தத் தேதியையே பயன்படுத்தும்.)',
  verifiedToastLive: 'தவணை சரிபார்க்கப்பட்டது · ரசீது', rejectPayTitle: 'இந்தக் குறிப்பு எண்ணை நிராகரி', rejectedPayToast: 'தவணை நிராகரிக்கப்பட்டது.',
  voidTitle: 'சரிபார்க்கப்பட்ட இந்தத் தவணையை ரத்து செய்யவா?', voidHint: 'தவறைத் திருத்த மட்டுமே பயன்படுத்தவும். பதிவு பாஸ்புக்கில் உங்கள் காரணத்துடன் "ரத்து" எனக் குறிக்கப்பட்டு அப்படியே இருக்கும்.', voidedToast: 'தவணை ரத்து செய்யப்பட்டது.',
  adminOnlyVerify: 'வாடிக்கையாளர் UPI தவணைகளை admin மட்டுமே சரிபார்க்கவோ நிராகரிக்கவோ முடியும்.', customerLbl: 'வாடிக்கையாளர்',
  findEnrollment: 'பதிவு எண், வாடிக்கையாளர் பெயர் அல்லது கைபேசி எண்ணால் தேடவும்', recordPay: 'கடையில் செலுத்தியதைப் பதிவு செய்', recordPayTitle: 'கடையில் பெற்ற தவணையைப் பதிவு செய்யவும்',
  storeRefLbl: 'கடை ரசீதுப் புத்தகம் / குறிப்பு (விருப்பம்)', upiRefOpt: 'UPI குறிப்பு எண் (கவுண்டரில் UPI மூலம் செலுத்தினால்)', noteOpt: 'குறிப்பு (விருப்பம்)',
  recordedToast: 'தவணை பதிவு செய்யப்பட்டது · ரசீது', backToRecords: 'அனைத்துப் பதிவுகள்',
  tabPendingRdm: 'நிலுவையில்', tabApprovedRdm: 'ஒப்புதல் பெற்றவை', approveRdm: 'ஒப்புதல்', rejectRdm: 'நிராகரி', completeRdm: 'நிறைவு எனக் குறி',
  approveRdmTitle: 'மீட்புக் கோரிக்கைக்கு ஒப்புதல்', rejectRdmTitle: 'மீட்புக் கோரிக்கையை நிராகரி', completeRdmTitle: 'மீட்பு நிறைவு எனக் குறி',
  completeNoteLbl: 'என்ன வழங்கப்பட்டது?', completeHint: 'உதா. "22K நாணயம் 4 கி வழங்கப்பட்டது, விலைப்பட்டியல் 1234". பதிவு "மீட்கப்பட்டது" என மூடப்படும்.',
  noteLbl: 'குறிப்பு', atRequest: 'கோரிக்கையின்போது', paidInst: 'தவணைகள் செலுத்தப்பட்டன',
  addRates: 'புதிய விலைகளை உள்ளிடு', rate22: '22K விலை ஒரு கிராமுக்கு (₹)', rate24: '24K விலை ஒரு கிராமுக்கு (₹)', effectiveAt: 'நடைமுறைக்கு வரும் நேரம்', sourceLbl: 'மூலம் / குறிப்பு',
  sourceHint: 'உதா. "தென்காசி நகை வியாபாரிகள் சங்க விலைப் பலகை, காலை".', saveRates: 'விலைகளைச் சேமி', ratesSaved: 'விலைகள் சேமிக்கப்பட்டன.',
  confirmRatesTitle: 'இந்த விலைகளைச் சேமிக்கவா?', confirmRatesMsg: 'விலைகளைப் பின்னர் திருத்த இயலாது. தவறு இருந்தால் காரணத்துடன் திரும்பப் பெறலாம்; பதிவு வரலாற்றில் அப்படியே இருக்கும்.',
  rateHistoryLbl: 'விலை வரலாறு', withdrawRate: 'திரும்பப் பெறு', withdrawTitle: 'இந்த விலையைத் திரும்பப் பெறவா?', withdrawnToast: 'விலை திரும்பப் பெறப்பட்டது.',
  rs_active: 'நடைமுறையில்', rs_withdrawn: 'திரும்பப் பெறப்பட்டது', enteredByLbl: 'உள்ளிட்டவர்', e_rate: '1,000 முதல் 1,00,000 வரையிலான விலையை உள்ளிடவும் (2 தசம இடங்கள் வரை).',
  auditTable: 'பதிவு வகை', auditWhen: 'எப்போது', auditWho: 'யார்', auditWhat: 'மாற்றம்', allRecords: 'அனைத்துச் சேமிப்புப் பதிவுகள்',
  tb_savings_payments: 'தவணைகள்', tb_savings_enrollments: 'பதிவுகள்', tb_savings_redemptions: 'மீட்புகள்', tb_savings_schemes: 'திட்டங்கள்', tb_gold_rates: 'தங்க விலைகள்',
  ac_INSERT: 'உருவாக்கப்பட்டது', ac_UPDATE: 'மாற்றப்பட்டது', ac_DELETE: 'நீக்கப்பட்டது',
  svKpiPending: 'சரிபார்க்க வேண்டிய UPI தவணைகள்', svKpiEnr: 'பதிவுக் கோரிக்கைகள்', svKpiRdm: 'நிலுவையிலுள்ள மீட்புகள்', svKpiActive: 'செயலிலுள்ள பதிவுகள்', savingsLiveHeading: 'தங்கச் சேமிப்பு'
});

const svHead = (key, extra) => pageHead(t('a_' + key), t('lv_' + key + 'Sub'), extra);
const AUDIT_TABLES = ['savings_payments', 'savings_enrollments', 'savings_redemptions', 'savings_schemes', 'gold_rates'];
const C = () => Backend.client;
const one = d => Array.isArray(d) ? d[0] : d;
const AdminSv = {
  async saveScheme(id, fields, isNew) {
    if (isNew) await run(C().from('savings_schemes').insert(Object.assign({ id }, fields)));
    else await run(C().from('savings_schemes').update(fields).eq('id', id));
  },
  approveScheme: (id, note) => run(C().rpc('admin_approve_scheme', { p_scheme_id: id, p_approval_note: note })),
  retireScheme: (id, note) => run(C().rpc('admin_retire_scheme', { p_scheme_id: id, p_note: note })),
  setOpen: (id, open) => run(C().from('savings_schemes').update({ enrollment_open: open }).eq('id', id)),
  async enrollments(status) {
    let q = C().from('savings_enrollments').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') q = q.eq('status', status);
    return (await run(q)).data || [];
  },
  decideEnrollment: (id, approve, start, note) => run(C().rpc('admin_decide_enrollment', { p_enrollment_id: id, p_approve: approve, p_start_month: start || null, p_note: note || null })),
  async createEnrollment(cid, sid, amount, start, note) { return one((await run(C().rpc('admin_create_enrollment', { p_customer_id: cid, p_scheme_id: sid, p_fixed_amount: amount, p_start_month: start, p_note: note || null }))).data); },
  async customers(q) {
    let b = C().from('profiles').select('id, full_name, phone, town, created_at').order('created_at', { ascending: false }).limit(50);
    const term = cleanTerm(q); if (term) b = b.or('full_name.ilike.*' + term + '*,phone.ilike.*' + term + '*');
    return (await run(b)).data || [];
  },
  async customerEnrollments(cid) { return (await run(C().from('savings_enrollments').select('*').eq('customer_id', cid).order('created_at', { ascending: false }))).data || []; },
  async payments(status) {
    let q = C().from('savings_payments').select(PAY_EMBED + ', profiles(full_name, phone)').order('submitted_at', { ascending: status === 'pending_verification' }).limit(100);
    q = status === 'pending_verification' ? q.eq('status', status) : q.in('status', ['verified', 'rejected', 'voided']);
    return (await run(q)).data || [];
  },
  async verify(id, note) { return one((await run(C().rpc('admin_verify_upi_payment', { p_payment_id: id, p_note: note || null }))).data); },
  reject: (id, reason) => run(C().rpc('admin_reject_upi_payment', { p_payment_id: id, p_reason: reason })),
  voidPay: (id, reason) => run(C().rpc('admin_void_payment', { p_payment_id: id, p_reason: reason })),
  async recordInstore(o) { return one((await run(C().rpc('record_instore_payment', { p_installment_id: o.inst, p_amount: o.amount, p_method: o.method, p_paid_on: o.date, p_store_reference: o.storeRef || null, p_upi_reference: o.upiRef || null, p_note: o.note || null }))).data); },
  async passbook(id) {
    const b = await SavingsApi.passbook(id); if (!b) return null;
    const { data: c } = await run(C().from('profiles').select('id, full_name, phone').eq('id', b.enrollment.customer_id).maybeSingle());
    b.customer = c; b.names = await AdminSv.names(b.payments.flatMap(p => [p.verified_by, p.submitted_by]));
    return b;
  },
  async searchEnrollments(q) {
    const term = cleanTerm(q);
    let b = C().from('savings_enrollments').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(50);
    if (term && /^SV-?/i.test(term)) b = b.ilike('enrollment_number', '*' + term.toUpperCase() + '*');
    const rows = (await run(b)).data || [];
    if (!term || /^SV-?/i.test(term)) return rows;
    const lc = term.toLowerCase();
    return rows.filter(e => [e.enrollment_number, e.profiles && e.profiles.full_name, e.profiles && e.profiles.phone].join(' ').toLowerCase().includes(lc));
  },
  async names(ids) {
    const uniq = [...new Set(ids.filter(Boolean))]; if (!uniq.length) return {};
    const { data } = await run(C().from('profiles').select('id, full_name').in('id', uniq));
    const m = {}; (data || []).forEach(p => { m[p.id] = p.full_name || '—'; }); return m;
  },
  async redemptions(status) {
    let q = C().from('savings_redemptions').select('*, profiles(full_name, phone), savings_enrollments(enrollment_number, scheme_id)').order('requested_at', { ascending: false }).limit(100);
    if (status !== 'all') q = q.eq('status', status);
    return (await run(q)).data || [];
  },
  decideRedemption: (id, approve, note) => run(C().rpc('admin_decide_redemption', { p_redemption_id: id, p_approve: approve, p_note: note || null })),
  completeRedemption: (id, note) => run(C().rpc('admin_complete_redemption', { p_redemption_id: id, p_note: note })),
  addRates: (r22, r24, at, note) => run(C().rpc('admin_add_gold_rates', { p_rate_22k: r22, p_rate_24k: r24, p_effective_at: at, p_source_note: note })),
  withdrawRate: (id, reason) => run(C().rpc('admin_withdraw_gold_rate', { p_rate_id: id, p_reason: reason })),
  async audit(table) {
    const q = C().from('audit_logs').select('*').in('table_name', table === 'all' ? AUDIT_TABLES : [table]).order('created_at', { ascending: false }).limit(100);
    return (await run(q)).data || [];
  },
  async counts() {
    const head = q => run(q).then(r => r.count || 0);
    const [pay, enr, rdm, act] = await Promise.all([
      head(C().from('savings_payments').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification')),
      head(C().from('savings_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval')),
      head(C().from('savings_redemptions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'approved'])),
      head(C().from('savings_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'))]);
    return { pay, enr, rdm, act };
  }
};
const svErr = (sel, e) => { const el = $(sel); if (el) el.textContent = errorText(toApiError(e)); else toast(errorText(toApiError(e)), 'err'); };
const ymToDate = ym => /^\d{4}-\d{2}$/.test(ym || '') ? ym + '-01' : null;
/* Modal form helper: one textarea/field + submit; handler gets (value, form) */
function svReasonModal(o) {
  openModal({ title: o.title,
    body: '<form id="svReasonForm" data-form="sv-reason" novalidate>' + (o.intro ? '<p class="modal-text">' + o.intro + '</p>' : '') +
      '<div class="field mt"><label for="svReason">' + o.label + (o.optional ? '' : ' <span class="req" aria-hidden="true">*</span>') + '</label><textarea id="svReason" name="svReason" maxlength="' + (o.max || 300) + '" aria-describedby="svReason-hint svReason-err"></textarea>' +
      (o.hint ? '<p class="hint" id="svReason-hint">' + o.hint + '</p>' : '') + '<p class="err" id="svReason-err" role="alert"></p></div>' + (o.extra || '') + '<p class="err" id="svModalErr" role="alert"></p></form>',
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" type="submit" form="svReasonForm">' + o.confirm + '</button>' });
  svReasonModal.cb = o;
}
FORMS['sv-reason'] = async f => {
  const o = svReasonModal.cb; if (!o) return;
  const v = f.elements.svReason.value.trim();
  const min = o.optional ? 0 : (o.min || 5);
  if (!setErr(f, 'svReason', v.length < min ? (min >= 10 ? t('err_approval_note_required') : t('err_reason_required')) : '')) { focusFirstInvalid(f); return; }
  if (o.check && !f.elements.svCheck.checked) { $('#svModalErr').textContent = t('errConfirmTick'); f.elements.svCheck.focus(); return; }
  const btn = document.querySelector('button[form="svReasonForm"]'); if (btn) btn.disabled = true;
  try { await o.run(v, f); closeModal(true); if (o.done) toast(o.done, 'ok'); render(); }
  catch (e) { svErr('#svModalErr', e); if (btn) btn.disabled = false; }
};
const svCheckbox = label => '<label class="check"><input type="checkbox" id="svCheck" name="svCheck"><span>' + label + '</span></label>';

/* ---------- overview KPIs ---------- */
function fillSavingsKpis(token) {
  fillAsync('#svKpis', token, () => AdminSv.counts(), c =>
    [['payments', 'svKpiPending', c.pay, true], ['enrollments', 'svKpiEnr', c.enr], ['redemptions', 'svKpiRdm', c.rdm], ['records', 'svKpiActive', c.act]]
      .map(([to, l, n, acc]) => '<button class="kpi' + (acc && n ? ' kpi--accent' : '') + '" data-go="' + to + '" style="text-align:left"><span>' + t(l) + '</span><b>' + n + '</b></button>').join(''));
  fillAsync('#svOverviewRates', token, () => SavingsApi.currentRates(), svRateCard);
}

/* ---------- #/schemes ---------- */
function aSchemesLive() {
  return svHead('schemes', Auth.isAdmin ? '<button class="btn btn-primary" data-go="scheme-edit/new">' + ic('plus') + t('addScheme') + '</button>' : '') + '<div id="svaSchemes">' + skel(2) + '</div>';
}
function fillSchemesAdmin(token) {
  fillAsync('#svaSchemes', token, () => SavingsApi.schemes(), list => {
    if (!list.length) return emptyState('layers', t('noResults'), t('noResultsHint'));
    return '<div class="scheme-grid">' + list.map(s => '<section class="panel"><div class="qcard-head"><div><p class="eyebrow">' + esc(s.id) + '</p><h2 class="h3">' + esc(svName(s)) + '</h2></div>' + svChip('ss', s.approval_status) + '</div>' +
      (s.approval_status === 'approved' ? '<p><span class="chip chip--' + (s.enrollment_open ? 'ok' : 'neutral') + '">' + t(s.enrollment_open ? 'enrollmentOpen' : 'enrollmentClosed') + '</span></p>' : '') +
      svTermsList(s) +
      (s.approval_note ? '<p class="small muted">' + t('approvalNoteLbl') + ': ' + esc(s.approval_note) + (s.approved_at ? ' · ' + svTime(s.approved_at) : '') + '</p>' : '') +
      (Auth.isAdmin ? '<div class="qcard-actions">' +
        (s.approval_status !== 'retired' ? '<button class="btn btn-outline btn-sm" data-go="scheme-edit/' + esc(s.id) + '">' + t('editTerms') + '</button>' : '') +
        (s.approval_status === 'draft' ? '<button class="btn btn-ok btn-sm" data-action="sv-approve-scheme" data-id="' + esc(s.id) + '">' + ic('check') + t('approveTerms') + '</button>' : '') +
        (s.approval_status === 'approved' ? '<button class="btn btn-' + (s.enrollment_open ? 'outline' : 'ok') + ' btn-sm" data-action="sv-toggle-open" data-id="' + esc(s.id) + '" data-open="' + (!s.enrollment_open) + '">' + t(s.enrollment_open ? 'closeEnrollment' : 'openEnrollment') + '</button>' : '') +
        (s.approval_status !== 'retired' ? '<button class="btn btn-ghost btn-sm" data-action="sv-retire-scheme" data-id="' + esc(s.id) + '">' + t('retireScheme') + '</button>' : '') + '</div>' : '') +
      '</section>').join('') + '</div>';
  }, 'retry');
}
function aSchemeEdit(arg) {
  if (!Auth.isAdmin) return svHead('schemes') + adminOnlyNote();
  return '<button class="back" data-go="schemes">' + ic('left') + t('a_schemes') + '</button><h1 class="h1">' + t(arg === 'new' ? 'addScheme' : 'editTerms') + '</h1>' +
    '<div class="note note--warn">' + ic('alert') + '<span>' + t('termsWarn') + '</span></div><div id="svaSchemeForm">' + skel(4) + '</div>';
}
function fillSchemeEdit(token) {
  if (!Auth.isAdmin) return;
  const isNew = route.arg === 'new';
  fillAsync('#svaSchemeForm', token, () => isNew ? Promise.resolve({}) : SavingsApi.scheme(route.arg), s => {
    if (!s) return emptyState('layers', t('noResults'), t('noResultsHint'));
    const v = x => x == null ? '' : x;
    const opt = (val, label, cur) => '<option value="' + val + '"' + (String(cur == null ? '' : cur) === val ? ' selected' : '') + '>' + label + '</option>';
    const sel = (id, label, opts) => '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" name="' + id + '" aria-describedby="' + id + '-err">' + opts + '</select><p class="err" id="' + id + '-err" role="alert"></p></div>';
    const ta = (id, label, val) => '<div class="field"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="' + id + '" rows="6" maxlength="8000">' + esc(v(val)) + '</textarea></div>';
    const numF = (id, label, val) => field({ id, label, value: v(val), required: false, attrs: 'inputmode="decimal" maxlength="10" autocomplete="off"' });
    return '<form class="panel" data-form="sv-scheme" data-new="' + isNew + '" data-id="' + esc(s.id || '') + '" novalidate>' +
      (isNew ? field({ id: 'scId', label: t('schemeIdLbl'), hint: t('schemeIdHint'), attrs: 'maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false"' }) : '<p class="mono">' + esc(s.id) + ' · ' + svChip('ss', s.approval_status) + '</p>') +
      '<div class="form-grid">' + field({ id: 'scNameEn', label: t('nameEn'), value: v(s.name_en), attrs: 'maxlength="100"' }) + field({ id: 'scNameTa', label: t('nameTa'), value: v(s.name_ta), attrs: 'maxlength="100" lang="ta"' }) + '</div>' +
      '<div class="form-grid">' +
        sel('scType', t('t_contribution'), opt('', t('notSet'), s.contribution_type) + opt('fixed', t('ct_fixed'), s.contribution_type) + opt('flexible', t('ct_flexible'), s.contribution_type)) +
        numF('scDuration', t('durationMonths'), s.duration_months) +
        numF('scMin', t('minAmount'), s.min_installment) + numF('scMax', t('maxAmount'), s.max_installment) +
        field({ id: 'scAmounts', label: t('allowedAmountsLbl'), value: (s.allowed_fixed_amounts || []).map(Number).join(', '), required: false, attrs: 'maxlength="200" autocomplete="off"' }) +
        numF('scWinFrom', t('windowStart'), s.payment_window_start_day) + numF('scWinTo', t('windowEnd'), s.payment_window_end_day) +
        sel('scConv', t('conversionLbl'), opt('none', t('gc_none'), s.gold_conversion || 'none') + opt('payment_date_rate', tf('gc_payment_date_rate', { p: '22K/24K' }), s.gold_conversion) + opt('verification_date_rate', tf('gc_verification_date_rate', { p: '22K/24K' }), s.gold_conversion)) +
        sel('scPurity', t('purityLbl'), opt('', t('notSet'), s.conversion_purity) + opt('22K', '22K', s.conversion_purity) + opt('24K', '24K', s.conversion_purity)) +
        numF('scRedeem', t('redemptionAfterLbl'), s.redemption_after_months) + '</div>' +
      ta('scTermsEn', t('termsEnLbl'), s.terms_en) + ta('scTermsTa', t('termsTaLbl'), s.terms_ta) +
      '<p class="err" id="scErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + t('saveTerms') + '</button></form>';
  }, 'retry');
}
FORMS['sv-scheme'] = async f => {
  const E = f.elements, isNew = f.dataset.new === 'true';
  const n = id => { const x = E[id].value.trim().replace(/[,\s₹]/g, ''); return x === '' ? null : Number(x); };
  const intOk = (x, a, b) => x == null || (Number.isInteger(x) && x >= a && x <= b);
  let ok = true;
  const id = isNew ? E.scId.value.trim() : f.dataset.id;
  if (isNew) ok = setErr(f, 'scId', /^[a-z][a-z0-9-]{1,39}$/.test(id) ? '' : t('e_schemeId')) && ok;
  ok = setErr(f, 'scNameEn', E.scNameEn.value.trim().length >= 2 ? '' : t('errName')) && ok;
  ok = setErr(f, 'scNameTa', E.scNameTa.value.trim().length >= 2 ? '' : t('errName')) && ok;
  const dur = n('scDuration'), min = n('scMin'), max = n('scMax'), wf = n('scWinFrom'), wt = n('scWinTo'), red = n('scRedeem');
  ok = setErr(f, 'scDuration', intOk(dur, 1, 120) ? '' : t('e_int')) && ok;
  ok = setErr(f, 'scMin', min == null || (min > 0 && !isNaN(min)) ? '' : t('errAmount')) && ok;
  ok = setErr(f, 'scMax', max == null || (max > 0 && !isNaN(max) && (min == null || max >= min)) ? '' : t('e_minmax')) && ok;
  const rawAmts = E.scAmounts.value.trim();
  const amts = rawAmts ? rawAmts.split(/[,;\s]+/).filter(Boolean).map(x => Number(x.replace(/[₹]/g, ''))) : null;
  ok = setErr(f, 'scAmounts', !amts || (amts.length <= 20 && amts.every(a => a > 0 && Number.isFinite(a))) ? '' : t('e_amountList')) && ok;
  ok = setErr(f, 'scWinFrom', (wf == null) === (wt == null) && intOk(wf, 1, 28) && intOk(wt, 1, 31) && (wf == null || wt >= wf) ? '' : t('e_window')) && ok;
  ok = setErr(f, 'scRedeem', intOk(red, 1, 240) ? '' : t('e_int')) && ok;
  const conv = E.scConv.value, purity = E.scPurity.value || null;
  ok = setErr(f, 'scPurity', conv === 'none' || purity ? '' : t('e_purity')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const fields = { name_en: E.scNameEn.value.trim(), name_ta: E.scNameTa.value.trim(), contribution_type: E.scType.value || null, duration_months: dur,
    min_installment: min, max_installment: max, allowed_fixed_amounts: amts, payment_window_start_day: wf, payment_window_end_day: wt,
    gold_conversion: conv, conversion_purity: purity, redemption_after_months: red,
    terms_en: E.scTermsEn.value.trim() || null, terms_ta: E.scTermsTa.value.trim() || null };
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { await AdminSv.saveScheme(id, fields, isNew); SV_SCHEMES = null; toast(t('termsSaved'), 'ok'); go('schemes'); }
  catch (e) { svErr('#scErr', e); }
  finally { if (document.contains(btn)) btn.disabled = false; }
};

/* ---------- #/enrollments ---------- */
UI.aeTab = 'pending_approval';
function aEnrollmentsLive() {
  return svHead('enrollments', Auth.isAdmin ? '<button class="btn btn-primary" data-action="sv-enroll-customer">' + ic('plus') + t('enrollCustomer') + '</button>' : '') +
    '<div class="chips" role="group" aria-label="' + t('status') + '">' + [['pending_approval', 'tabPendingReq'], ['active', 'tabActive'], ['all', 'tabAll']]
      .map(([v, l]) => '<button class="fchip" data-action="sv-ae-tab" data-v="' + v + '" aria-pressed="' + (UI.aeTab === v) + '">' + t(l) + '</button>').join('') + '</div>' +
    '<div id="svaEnr">' + skel(3) + '</div>';
}
function fillEnrollmentsAdmin(token) {
  fillAsync('#svaEnr', token, async () => { await svSchemeMap(); return AdminSv.enrollments(UI.aeTab); }, list => {
    if (!list.length) return emptyState('layers', t('noResults'), t('allClearHint'));
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('enrollmentNo') + '</th><th>' + t('customerLbl') + '</th><th>' + t('schemeLbl') + '</th><th>' + t('requestedAt') + '</th><th>' + t('t_contribution') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
      list.map(e => '<tr><td data-label="' + t('enrollmentNo') + '"><span class="mono">' + esc(e.enrollment_number) + '</span></td>' +
        '<td data-label="' + t('customerLbl') + '">' + esc(e.profiles ? e.profiles.full_name || '—' : '—') + (e.profiles && e.profiles.phone ? '<br><small class="mono">' + esc(e.profiles.phone) + '</small>' : '') + '</td>' +
        '<td data-label="' + t('schemeLbl') + '">' + esc(svSchemeName(e.scheme_id)) + '</td><td data-label="' + t('requestedAt') + '">' + svTime(e.requested_at) + '</td>' +
        '<td data-label="' + t('t_contribution') + '">' + (e.contribution_type === 'fixed' ? inr(e.fixed_amount) : t('ct_flexible')) + ' · ' + tf('monthsN', { n: e.duration_months }) + '</td>' +
        '<td data-label="' + t('status') + '">' + svChip('es', e.status) + (e.decision_note ? '<br><small class="muted">' + esc(e.decision_note) + '</small>' : '') + '</td>' +
        '<td data-label=""><div class="td-actions">' + (e.status === 'pending_approval' && Auth.isAdmin
          ? '<button class="btn btn-ok btn-sm" data-action="sv-enr-approve" data-id="' + e.id + '">' + t('approveEnr') + '</button><button class="btn btn-outline btn-sm" data-action="sv-enr-reject" data-id="' + e.id + '">' + t('rejectEnr') + '</button>'
          : (e.status !== 'pending_approval' && e.status !== 'rejected' && e.status !== 'cancelled' ? '<button class="btn btn-outline btn-sm" data-go="records/' + e.id + '">' + t('passbook') + '</button>' : '')) + '</div></td></tr>').join('') +
      '</tbody></table></div>';
  }, 'retry');
}
const monthInput = (id, label) => '<div class="field"><label for="' + id + '">' + label + ' <span class="req" aria-hidden="true">*</span></label><input type="month" id="' + id + '" name="' + id + '" value="' + curYM() + '" aria-describedby="' + id + '-err"><p class="err" id="' + id + '-err" role="alert"></p></div>';

/* ---------- #/payments (pending UPI verifications) ---------- */
UI.apTab = 'pending_verification';
function aPaymentsLive() {
  return svHead('payments') + (Auth.isAdmin ? '<div class="note note--warn">' + ic('alert') + '<span>' + t('verifyChecklist') + '</span></div>' : '<div class="note note--info">' + ic('shield') + '<span>' + t('adminOnlyVerify') + '</span></div>') +
    '<div class="chips" role="group" aria-label="' + t('status') + '">' + [['pending_verification', 'pendingUpi'], ['processed', 'processedPay']]
      .map(([v, l]) => '<button class="fchip" data-action="sv-ap-tab" data-v="' + v + '" aria-pressed="' + (UI.apTab === v) + '">' + t(l) + '</button>').join('') + '</div>' +
    '<div id="svaPay">' + skel(3) + '</div>';
}
function fillPaymentsAdmin(token) {
  fillAsync('#svaPay', token, async () => { await svSchemeMap(); const list = await AdminSv.payments(UI.apTab); const names = await AdminSv.names(list.map(p => p.verified_by)); return { list, names }; }, ({ list, names }) => {
    if (!list.length) return emptyState('checkCircle', t('allClear'), t('allClearHint'));
    if (UI.apTab !== 'pending_verification') return svPaymentsTable(list, null, { admin: true, who: id => id ? esc(names[id] || '—') : '—', payAction: p => p.status === 'verified' && Auth.isAdmin ? '<button class="btn btn-ghost btn-sm" data-action="sv-void" data-id="' + p.id + '">' + t('voidPay') + '</button>' : '' });
    return '<div class="queue">' + list.map(p => '<article class="qcard"><div class="qcard-head"><div><strong>' + esc(p.profiles ? p.profiles.full_name || '—' : '—') + '</strong><small class="mono">' + esc(p.profiles && p.profiles.phone || '') + '</small></div>' + svChip('ps', p.status) + '</div>' +
      '<dl class="kv"><dt>' + t('enrollmentNo') + '</dt><dd class="mono">' + esc(p.savings_enrollments ? p.savings_enrollments.enrollment_number : '') + '</dd>' +
        '<dt>' + t('schemeLbl') + '</dt><dd>' + esc(p.savings_enrollments ? svSchemeName(p.savings_enrollments.scheme_id) : '') + '</dd>' +
        '<dt>' + t('installmentNo') + '</dt><dd>' + (p.savings_installments ? p.savings_installments.installment_no + ' · ' + svMonth(p.savings_installments.due_month) : '') + '</dd>' +
        '<dt>' + t('amount') + '</dt><dd><b>' + inr(p.amount) + '</b></dd><dt>' + t('upiRef') + '</dt><dd class="mono"><b>' + esc(p.upi_reference || '') + '</b></dd>' +
        '<dt>' + t('paidOnLbl') + '</dt><dd>' + fmtDate(p.paid_on) + '</dd><dt>' + t('submittedAt') + '</dt><dd>' + svTime(p.submitted_at) + '</dd></dl>' +
      (Auth.isAdmin ? '<div class="qcard-actions"><button class="btn btn-outline btn-sm" data-action="sv-reject-pay" data-id="' + p.id + '">' + ic('x') + t('rejectPay') + '</button><button class="btn btn-ok btn-sm" data-action="sv-verify-pay" data-id="' + p.id + '" data-amt="' + p.amount + '" data-ref="' + esc(p.upi_reference || '') + '" data-date="' + esc(p.paid_on || '') + '">' + ic('check') + t('verifyPay') + '</button></div>' : '') +
      '</article>').join('') + '</div>';
  }, 'retry');
}

/* ---------- #/records/<enrollmentId?> (passbooks + in-store entry) ---------- */
UI.arQ = '';
function aRecordsLive(arg) {
  if (!arg) return svHead('records') + '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('findEnrollment') + '" aria-label="' + t('findEnrollment') + '" value="' + esc(UI.arQ) + '" data-filter="sv-ar" maxlength="40"></div></div><div id="svaRec">' + skel(3) + '</div>';
  return '<button class="back" data-go="records">' + ic('left') + t('backToRecords') + '</button><div id="svaPb">' + skel(4) + '</div>';
}
function fillRecordsAdmin(token) {
  if (!route.arg) {
    fillAsync('#svaRec', token, async () => { await svSchemeMap(); return AdminSv.searchEnrollments(UI.arQ); }, list => {
      if (!list.length) return emptyState('search', t('noResults'), t('noResultsHint'));
      return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('enrollmentNo') + '</th><th>' + t('customerLbl') + '</th><th>' + t('schemeLbl') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
        list.map(e => '<tr><td data-label="' + t('enrollmentNo') + '"><span class="mono">' + esc(e.enrollment_number) + '</span></td><td data-label="' + t('customerLbl') + '">' + esc(e.profiles ? e.profiles.full_name || '—' : '—') + (e.profiles && e.profiles.phone ? ' · <span class="mono small">' + esc(e.profiles.phone) + '</span>' : '') + '</td>' +
          '<td data-label="' + t('schemeLbl') + '">' + esc(svSchemeName(e.scheme_id)) + '</td><td data-label="' + t('status') + '">' + svChip('es', e.status) + '</td>' +
          '<td data-label=""><div class="td-actions"><button class="btn btn-outline btn-sm" data-go="records/' + e.id + '">' + t('openPassbook') + '</button></div></td></tr>').join('') + '</tbody></table></div>';
    }, 'retry');
    return;
  }
  fillAsync('#svaPb', token, () => AdminSv.passbook(route.arg), b => {
    if (!b) return emptyState('book', t('noResults'), t('noResultsHint'));
    const e = b.enrollment;
    return svPassbook(b, { admin: true, names: b.names,
      instAction: i => (e.status === 'active' && i.status === 'pending_payment') ? '<button class="btn btn-primary btn-sm" data-action="sv-record" data-inst="' + i.id + '" data-no="' + i.installment_no + '" data-month="' + i.due_month + '" data-amt="' + (i.expected_amount || '') + '" data-fixed="' + (e.contribution_type === 'fixed') + '" data-min="' + (e.min_installment || '') + '" data-max="' + (e.max_installment || '') + '">' + t('recordPay') + '</button>' : '',
      payAction: p => p.status === 'verified' && Auth.isAdmin ? '<button class="btn btn-ghost btn-sm" data-action="sv-void" data-id="' + p.id + '">' + t('voidPay') + '</button>' : '' }) +
      '<section class="panel mt"><h2 class="h3">' + t('schemeTerms') + '</h2>' + svTermsList(e.terms_snapshot || {}) + '</section>';
  }, 'retry');
}
let arTimer = null;
FILTERS['sv-ar'] = el => { UI.arQ = el.value; clearTimeout(arTimer); arTimer = setTimeout(() => fillRecordsAdmin(renderToken), 350); };

/* ---------- #/customers ---------- */
UI.acQ = '';
function aCustomersLive() {
  return svHead('customers') + '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchCustomers') + '" aria-label="' + t('searchCustomers') + '" value="' + esc(UI.acQ) + '" data-filter="sv-ac" maxlength="40"></div></div><div id="svaCust">' + skel(3) + '</div>';
}
function fillCustomersAdmin(token) {
  fillAsync('#svaCust', token, () => AdminSv.customers(UI.acQ), list => {
    if (!list.length) return emptyState('users', t('noResults'), t('noCustomers'));
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('customerLbl') + '</th><th>' + t('phone') + '</th><th>' + t('town') + '</th><th>' + t('memberSince') + '</th><th></th></tr></thead><tbody>' +
      list.map(c => '<tr><td data-label="' + t('customerLbl') + '"><b>' + esc(c.full_name || '—') + '</b></td><td data-label="' + t('phone') + '" class="mono">' + esc(c.phone || '—') + '</td><td data-label="' + t('town') + '">' + esc(c.town || '—') + '</td>' +
        '<td data-label="' + t('memberSince') + '">' + svTime(c.created_at) + '</td><td data-label=""><div class="td-actions"><button class="btn btn-outline btn-sm" data-action="sv-cust" data-id="' + c.id + '" data-name="' + esc(c.full_name || '') + '">' + t('enrollmentsLabel') + '</button></div></td></tr>').join('') + '</tbody></table></div>';
  }, 'retry');
}
let acTimer = null;
FILTERS['sv-ac'] = el => { UI.acQ = el.value; clearTimeout(acTimer); acTimer = setTimeout(() => fillCustomersAdmin(renderToken), 350); };

/* ---------- #/redemptions ---------- */
UI.arTab = 'pending';
function aRedemptionsLive() {
  return svHead('redemptions') + '<div class="chips" role="group" aria-label="' + t('status') + '">' + [['pending', 'tabPendingRdm'], ['approved', 'tabApprovedRdm'], ['all', 'tabAll']]
    .map(([v, l]) => '<button class="fchip" data-action="sv-ar-tab" data-v="' + v + '" aria-pressed="' + (UI.arTab === v) + '">' + t(l) + '</button>').join('') + '</div><div id="svaRdm">' + skel(3) + '</div>';
}
function fillRedemptionsAdmin(token) {
  fillAsync('#svaRdm', token, async () => { await svSchemeMap(); return AdminSv.redemptions(UI.arTab); }, list => {
    if (!list.length) return emptyState('gift', t('noRedemptions'), t('allClearHint'));
    return '<div class="queue">' + list.map(r => '<article class="qcard"><div class="qcard-head"><div><strong class="mono">' + esc(r.request_number) + '</strong><small>' + esc(r.profiles ? r.profiles.full_name || '—' : '—') + ' · ' + esc(r.savings_enrollments ? svSchemeName(r.savings_enrollments.scheme_id) + ' · ' + r.savings_enrollments.enrollment_number : '') + '</small></div>' + svChip('rs', r.status) + '</div>' +
      '<dl class="kv"><dt>' + t('type') + '</dt><dd>' + t(r.redemption_type === 'coin' ? 'goldCoin' : 'jewellery') + '</dd>' + (r.preference ? '<dt>' + t('preference') + '</dt><dd>' + esc(r.preference) + '</dd>' : '') +
        (r.preferred_visit_date ? '<dt>' + t('visitDate') + '</dt><dd>' + fmtDate(r.preferred_visit_date) + '</dd>' : '') + '<dt>' + t('requestedOn') + '</dt><dd>' + svTime(r.requested_at) + '</dd>' +
        '<dt>' + t('atRequest') + '</dt><dd>' + inr(r.verified_total_at_request) + ' · ' + r.paid_count_at_request + ' ' + t('paidInst') + (r.gold_weight_at_request != null ? ' · ' + grams(r.gold_weight_at_request) : '') + '</dd>' +
        (r.decision_note ? '<dt>' + t('decisionNote') + '</dt><dd>' + esc(r.decision_note) + '</dd>' : '') + (r.completion_note ? '<dt>' + t('noteLbl') + '</dt><dd>' + esc(r.completion_note) + '</dd>' : '') + '</dl>' +
      '<div class="qcard-actions"><button class="btn btn-outline btn-sm" data-go="records/' + r.enrollment_id + '">' + t('passbook') + '</button>' + (Auth.isAdmin ? (r.status === 'pending'
        ? '<button class="btn btn-outline btn-sm" data-action="sv-rdm-reject" data-id="' + r.id + '">' + t('rejectRdm') + '</button><button class="btn btn-ok btn-sm" data-action="sv-rdm-approve" data-id="' + r.id + '">' + t('approveRdm') + '</button>'
        : r.status === 'approved' ? '<button class="btn btn-primary btn-sm" data-action="sv-rdm-complete" data-id="' + r.id + '">' + t('completeRdm') + '</button>' : '') : '') + '</div></article>').join('') + '</div>';
  }, 'retry');
}

/* ---------- #/goldrate ---------- */
const localDT = d => isoOf(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
function aGoldrateLive() {
  return svHead('goldrate') + '<div id="svaRateNow">' + skel(1) + '</div><div class="two-col">' +
    (Auth.isAdmin ? '<form class="panel" data-form="sv-rates" novalidate><h2 class="h3">' + t('addRates') + '</h2>' +
      field({ id: 'gr22', label: t('rate22'), required: false, attrs: 'inputmode="decimal" maxlength="10" autocomplete="off"' }) +
      field({ id: 'gr24', label: t('rate24'), required: false, attrs: 'inputmode="decimal" maxlength="10" autocomplete="off"' }) +
      field({ id: 'grAt', label: t('effectiveAt'), type: 'datetime-local', value: localDT(new Date()) }) +
      field({ id: 'grNote', label: t('sourceLbl'), hint: t('sourceHint'), attrs: 'maxlength="300" autocomplete="off"' }) +
      '<p class="err" id="grErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + ic('coins') + t('saveRates') + '</button></form>' : adminOnlyNote()) +
    '<section><h2 class="h2 section-head">' + t('rateHistoryLbl') + '</h2><div id="svaRateHist">' + skel(3) + '</div></section></div>';
}
function fillGoldrateAdmin(token) {
  fillAsync('#svaRateNow', token, () => SavingsApi.currentRates(), svRateCard);
  fillAsync('#svaRateHist', token, async () => { const list = await SavingsApi.rateHistory(); return { list, names: await AdminSv.names(list.flatMap(r => [r.created_by, r.withdrawn_by])) }; }, ({ list, names }) => {
    if (!list.length) return emptyState('coins', t('rateMissing'), t('rateManualNote'));
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('effectiveAt') + '</th><th>' + t('purityLbl') + '</th><th class="r">₹ / g</th><th>' + t('sourceLbl') + '</th><th>' + t('enteredByLbl') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
      list.map(r => '<tr><td data-label="' + t('effectiveAt') + '">' + svTime(r.effective_at) + '</td><td data-label="' + t('purityLbl') + '">' + esc(r.purity) + '</td><td data-label="₹ / g" class="r num"><b>' + inr(r.rate_per_gram) + '</b></td>' +
        '<td data-label="' + t('sourceLbl') + '">' + esc(r.source_note) + '</td><td data-label="' + t('enteredByLbl') + '">' + esc(names[r.created_by] || '—') + '<br><small class="muted">' + svTime(r.created_at) + '</small></td>' +
        '<td data-label="' + t('status') + '"><span class="chip chip--' + (r.status === 'active' ? 'ok' : 'neutral') + '">' + t('rs_' + r.status) + '</span>' + (r.withdraw_reason ? '<br><small class="muted">' + esc(r.withdraw_reason) + ' · ' + esc(names[r.withdrawn_by] || '') + '</small>' : '') + '</td>' +
        '<td data-label="">' + (r.status === 'active' && Auth.isAdmin ? '<button class="btn btn-ghost btn-sm" data-action="sv-withdraw-rate" data-id="' + r.id + '">' + t('withdrawRate') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  }, 'retry');
}
FORMS['sv-rates'] = async f => {
  const E = f.elements, val = id => { const x = E[id].value.trim().replace(/[,\s₹]/g, ''); return x === '' ? null : x; };
  const r22 = val('gr22'), r24 = val('gr24'), okRate = x => x == null || (/^\d+(\.\d{1,2})?$/.test(x) && Number(x) >= 1000 && Number(x) <= 100000);
  let ok = true;
  ok = setErr(f, 'gr22', okRate(r22) ? (r22 == null && r24 == null ? t('err_rate_required') : '') : t('e_rate')) && ok;
  ok = setErr(f, 'gr24', okRate(r24) ? (r22 != null && r24 != null && Number(r22) >= Number(r24) ? t('err_invalid_rate_order') : '') : t('e_rate')) && ok;
  const at = E.grAt.value ? new Date(E.grAt.value) : null;
  ok = setErr(f, 'grAt', at && !isNaN(at) && at.getTime() <= Date.now() + 7 * 86400000 && at.getTime() >= Date.now() - 30 * 86400000 ? '' : t('err_invalid_effective_date')) && ok;
  ok = setErr(f, 'grNote', E.grNote.value.trim().length >= 3 ? '' : t('err_source_required')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  if (!(await confirmDialog({ title: t('confirmRatesTitle'), message: (r22 ? '22K: <b>' + inr(r22) + '</b> / g<br>' : '') + (r24 ? '24K: <b>' + inr(r24) + '</b> / g<br>' : '') + t('effectiveAt') + ': ' + svTime(at.toISOString()) + '<br>' + t('sourceLbl') + ': ' + esc(E.grNote.value.trim()) + '<br><br>' + t('confirmRatesMsg'), confirmText: t('saveRates') }))) return;
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { await AdminSv.addRates(r22 == null ? null : Number(r22), r24 == null ? null : Number(r24), at.toISOString(), E.grNote.value.trim()); toast(t('ratesSaved'), 'ok'); render(); }
  catch (e) { svErr('#grErr', e); }
  finally { if (document.contains(btn)) btn.disabled = false; }
};

/* ---------- #/audit ---------- */
UI.auTable = 'all';
function aAuditLive() {
  if (!Auth.isAdmin) return svHead('audit') + adminOnlyNote();
  return svHead('audit') + '<div class="toolbar"><select class="select" aria-label="' + t('auditTable') + '" data-change="sv-au-table">' +
    ['all'].concat(AUDIT_TABLES).map(v => '<option value="' + v + '"' + (UI.auTable === v ? ' selected' : '') + '>' + (v === 'all' ? t('allRecords') : t('tb_' + v)) + '</option>').join('') + '</select></div><div id="svaAudit">' + skel(4) + '</div>';
}
function auditSummary(r) {
  const n = r.new_data || {}, o = r.old_data || {};
  const parts = [];
  ['status', 'approval_status', 'enrollment_open'].forEach(k => { if (n[k] !== undefined && o[k] !== n[k]) parts.push(k + ': ' + (o[k] == null ? '—' : o[k]) + ' → ' + n[k]); });
  ['enrollment_number', 'receipt_number', 'request_number', 'upi_reference'].forEach(k => { if (n[k]) parts.push(k + ' ' + n[k]); });
  if (n.amount) parts.push('₹' + n.amount);
  if (r.table_name === 'gold_rates' && n.rate_per_gram) parts.push(n.purity + ' ₹' + n.rate_per_gram);
  ['rejection_reason', 'void_reason', 'decision_note', 'withdraw_reason', 'approval_note'].forEach(k => { if (n[k] && o[k] !== n[k]) parts.push(k.replace('_', ' ') + ': "' + n[k] + '"'); });
  if (r.table_name === 'savings_schemes' && r.action === 'UPDATE' && !parts.length) parts.push('terms');
  return esc(parts.join(' · ') || '—');
}
function fillAuditAdmin(token) {
  if (!Auth.isAdmin) return;
  fillAsync('#svaAudit', token, async () => { const list = await AdminSv.audit(UI.auTable); return { list, names: await AdminSv.names(list.map(r => r.actor_id)) }; }, ({ list, names }) => {
    if (!list.length) return emptyState('file', t('noResults'), t('noResultsHint'));
    return '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('auditWhen') + '</th><th>' + t('auditWho') + '</th><th>' + t('auditTable') + '</th><th>' + t('auditWhat') + '</th></tr></thead><tbody>' +
      list.map(r => '<tr><td data-label="' + t('auditWhen') + '">' + svTime(r.created_at) + '</td><td data-label="' + t('auditWho') + '">' + esc(r.actor_id ? (names[r.actor_id] || r.actor_id.slice(0, 8)) : 'system') + '</td>' +
        '<td data-label="' + t('auditTable') + '">' + t('tb_' + r.table_name) + ' · ' + t('ac_' + r.action) + '</td><td data-label="' + t('auditWhat') + '"><span class="small">' + auditSummary(r) + '</span></td></tr>').join('') + '</tbody></table></div>';
  }, 'retry');
}

/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  'sv-ae-tab': b => { UI.aeTab = b.dataset.v; render(); },
  'sv-ap-tab': b => { UI.apTab = b.dataset.v; render(); },
  'sv-ar-tab': b => { UI.arTab = b.dataset.v; render(); },
  'sv-approve-scheme': b => svReasonModal({ title: t('approveTitle'), label: t('approveNoteLbl'), hint: t('approveNoteHint'), min: 10, max: 500, check: true,
    extra: svCheckbox(t('approveConfirm')), confirm: t('approveTerms'), done: t('schemeApprovedToast'), run: v => AdminSv.approveScheme(b.dataset.id, v).then(() => { SV_SCHEMES = null; }) }),
  'sv-retire-scheme': b => svReasonModal({ title: t('retireTitle'), label: t('retireReason'), confirm: t('retireScheme'), danger: true, done: t('schemeClosed'), run: v => AdminSv.retireScheme(b.dataset.id, v) }),
  'sv-toggle-open': async b => { try { await AdminSv.setOpen(b.dataset.id, b.dataset.open === 'true'); toast(t(b.dataset.open === 'true' ? 'openToast' : 'closeToast'), 'ok'); render(); } catch (e) { toast(errorText(toApiError(e)), 'err'); } },
  'sv-enr-approve': b => svReasonModal({ title: t('approveEnrTitle'), intro: t('approveEnrNote'), label: t('noteOpt'), optional: true, extra: monthInput('svStart', t('startMonthPick')),
    confirm: t('approveEnr'), done: t('decisionSaved'), run: (v, f) => AdminSv.decideEnrollment(b.dataset.id, true, ymToDate(f.elements.svStart.value), v) }),
  'sv-enr-reject': b => svReasonModal({ title: t('rejectEnrTitle'), label: t('rejectReason'), confirm: t('rejectEnr'), danger: true, done: t('decisionSaved'), run: v => AdminSv.decideEnrollment(b.dataset.id, false, null, v) }),
  'sv-verify-pay': async b => {
    if (!(await confirmDialog({ title: t('verifyPayTitle'), message: t('amount') + ': <b>' + inr(b.dataset.amt) + '</b><br>' + t('upiRef') + ': <b class="mono">' + esc(b.dataset.ref) + '</b><br>' + t('paidOnLbl') + ': <b>' + fmtDate(b.dataset.date) + '</b><br><br>' + t('verifyChecklist'), confirmText: t('verifyPay') }))) return;
    try { const r = await AdminSv.verify(b.dataset.id); toast(t('verifiedToastLive') + ' ' + r.receipt_number, 'ok'); render(); } catch (e) { toast(errorText(toApiError(e)), 'err'); }
  },
  'sv-reject-pay': b => svReasonModal({ title: t('rejectPayTitle'), label: t('rejectReason'), hint: t('rejectHint'), confirm: t('rejectPay'), danger: true, done: t('rejectedPayToast'), run: v => AdminSv.reject(b.dataset.id, v) }),
  'sv-void': b => svReasonModal({ title: t('voidTitle'), intro: t('voidHint'), label: t('voidReason'), confirm: t('voidPay'), danger: true, done: t('voidedToast'), run: v => AdminSv.voidPay(b.dataset.id, v) }),
  'sv-withdraw-rate': b => svReasonModal({ title: t('withdrawTitle'), intro: t('confirmRatesMsg'), label: t('retireReason'), confirm: t('withdrawRate'), danger: true, done: t('withdrawnToast'), run: v => AdminSv.withdrawRate(Number(b.dataset.id), v) }),
  'sv-rdm-approve': b => svReasonModal({ title: t('approveRdmTitle'), label: t('noteLbl'), optional: true, confirm: t('approveRdm'), done: t('decisionSaved'), run: v => AdminSv.decideRedemption(b.dataset.id, true, v) }),
  'sv-rdm-reject': b => svReasonModal({ title: t('rejectRdmTitle'), label: t('rejectReason'), confirm: t('rejectRdm'), danger: true, done: t('decisionSaved'), run: v => AdminSv.decideRedemption(b.dataset.id, false, v) }),
  'sv-rdm-complete': b => svReasonModal({ title: t('completeRdmTitle'), label: t('completeNoteLbl'), hint: t('completeHint'), max: 500, confirm: t('completeRdm'), done: t('decisionSaved'), run: v => AdminSv.completeRedemption(b.dataset.id, v) }),
  'sv-record': b => {
    const fixed = b.dataset.fixed === 'true';
    openModal({ title: t('recordPayTitle'),
      body: '<form id="svRecForm" data-form="sv-record" data-inst="' + b.dataset.inst + '" novalidate><p class="modal-text">' + t('installmentNo') + ' ' + esc(b.dataset.no) + ' · ' + svMonth(b.dataset.month) + '</p>' +
        field({ id: 'rpAmt', label: t('amount') + ' (₹)', value: fixed ? Number(b.dataset.amt) : '', hint: fixed ? t('amountFixedHint') : (b.dataset.min ? t('fromAmt') + ' ' + inr(b.dataset.min) : '') + (b.dataset.max ? ' · ' + t('upTo') + ' ' + inr(b.dataset.max) : ''), attrs: 'inputmode="decimal" maxlength="10" autocomplete="off"' + (fixed ? ' readonly' : '') }) +
        '<div class="field"><label for="rpMethod">' + t('methodLbl') + '</label><select id="rpMethod" name="rpMethod">' + ['cash', 'upi', 'card', 'bank_transfer'].map(m => '<option value="' + m + '">' + t('m_' + m) + '</option>').join('') + '</select></div>' +
        field({ id: 'rpDate', label: t('paidOnLbl'), type: 'date', value: todayISO(), attrs: 'max="' + todayISO() + '" min="' + addDays(-90) + '"' }) +
        field({ id: 'rpStore', label: t('storeRefLbl'), required: false, attrs: 'maxlength="40" autocomplete="off"' }) +
        field({ id: 'rpUpi', label: t('upiRefOpt'), required: false, attrs: 'maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false"' }) +
        field({ id: 'rpNote', label: t('noteOpt'), required: false, attrs: 'maxlength="300" autocomplete="off"' }) + '<p class="err" id="rpErr" role="alert"></p></form>',
      footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn btn-primary" type="submit" form="svRecForm">' + t('recordPay') + '</button>' });
  },
  'sv-cust': async b => {
    try {
      await svSchemeMap();
      const list = await AdminSv.customerEnrollments(b.dataset.id);
      openModal({ title: esc(b.dataset.name || '—'), body: list.length ? '<div class="enr-list">' + list.map(e => '<button class="enr-card" data-action="modal-close" data-go="records/' + e.id + '"><div class="enr-top"><div class="enr-name"><strong>' + esc(svSchemeName(e.scheme_id)) + '</strong><small class="mono">' + esc(e.enrollment_number) + '</small></div>' + svChip('es', e.status) + '</div></button>').join('') + '</div>' : '<p class="muted">' + t('noEnrollmentsLive') + '</p>',
        footer: (Auth.isAdmin ? '<button type="button" class="btn btn-primary" data-action="sv-enroll-customer" data-id="' + b.dataset.id + '" data-name="' + esc(b.dataset.name || '') + '">' + t('enrollCustomer') + '</button>' : '') + '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('close') + '</button>' });
    } catch (e) { toast(errorText(toApiError(e)), 'err'); }
  }
});
ACTIONS['sv-enroll-customer'] = b => openEnrollCustomer(b && b.dataset ? b.dataset.id : null, b && b.dataset ? b.dataset.name : null);
CHANGES['sv-au-table'] = el => { UI.auTable = el.value; render(); };

FORMS['sv-record'] = async f => {
  const E = f.elements, amt = E.rpAmt.value.replace(/[,\s₹]/g, ''), upi = E.rpUpi.value.toUpperCase().replace(/[\s-]/g, '');
  let ok = true;
  ok = setErr(f, 'rpAmt', /^\d{1,8}(\.\d{1,2})?$/.test(amt) && Number(amt) > 0 ? '' : t('errAmount')) && ok;
  ok = setErr(f, 'rpDate', E.rpDate.value && E.rpDate.value <= todayISO() && E.rpDate.value >= addDays(-90) ? '' : t('err_invalid_payment_date')) && ok;
  ok = setErr(f, 'rpUpi', !upi || /^[A-Z0-9]{6,35}$/.test(upi) ? '' : t('err_invalid_reference')) && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  const btn = document.querySelector('button[form="svRecForm"]'); if (btn) btn.disabled = true;
  try {
    const r = await AdminSv.recordInstore({ inst: f.dataset.inst, amount: Number(amt), method: E.rpMethod.value, date: E.rpDate.value, storeRef: E.rpStore.value.trim(), upiRef: upi, note: E.rpNote.value.trim() });
    closeModal(true); toast(t('recordedToast') + ' ' + r.receipt_number, 'ok'); render();
  } catch (e) { svErr('#rpErr', e); if (btn) btn.disabled = false; }
};

async function openEnrollCustomer(cid, cname) {
  let schemes;
  try { schemes = (await SavingsApi.schemes()).filter(s => s.approval_status === 'approved'); } catch (e) { toast(errorText(toApiError(e)), 'err'); return; }
  if (!schemes.length) { openModal({ title: t('enrollCustomerTitle'), body: '<div class="note note--warn">' + ic('alert') + '<span>' + t('noApprovedSchemes') + '</span></div>', footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('close') + '</button>' }); return; }
  openModal({ title: t('enrollCustomerTitle'),
    body: '<form id="svEnrForm" data-form="sv-enroll-customer" novalidate>' +
      (cid ? '<input type="hidden" name="ecCust" value="' + esc(cid) + '"><p class="modal-text"><b>' + esc(cname || '') + '</b></p>'
        : '<div class="field"><label for="ecSearch">' + t('findCustomer') + '</label><input type="search" id="ecSearch" maxlength="40" autocomplete="off" data-filter="sv-ec"></div><div class="field"><label for="ecCust">' + t('customerLbl') + ' <span class="req" aria-hidden="true">*</span></label><select id="ecCust" name="ecCust" aria-describedby="ecCust-err"><option value="">—</option></select><p class="err" id="ecCust-err" role="alert"></p></div>') +
      '<div class="field"><label for="ecScheme">' + t('schemeLbl') + '</label><select id="ecScheme" name="ecScheme" data-change="sv-ec-scheme">' + schemes.map(s => '<option value="' + esc(s.id) + '">' + esc(svName(s)) + '</option>').join('') + '</select></div>' +
      '<div id="ecAmtBox"></div>' + monthInput('ecStart', t('startMonthPick')) +
      field({ id: 'ecNote', label: t('noteOpt'), required: false, attrs: 'maxlength="300" autocomplete="off"' }) + '<p class="err" id="ecErr" role="alert"></p></form>',
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn btn-primary" type="submit" form="svEnrForm">' + t('enrollCustomer') + '</button>' });
  openEnrollCustomer.schemes = schemes;
  ecAmountField();
}
function ecAmountField() {
  const sel = $('#ecScheme'), box = $('#ecAmtBox'); if (!sel || !box) return;
  const s = (openEnrollCustomer.schemes || []).find(x => x.id === sel.value);
  box.innerHTML = s && s.contribution_type === 'fixed'
    ? svFixedAmountField('ecAmt', s)
    : '<p class="small muted">' + t('enrollFlexNote') + '</p>';
}
CHANGES['sv-ec-scheme'] = () => ecAmountField();
let ecTimer = null;
FILTERS['sv-ec'] = el => {
  clearTimeout(ecTimer);
  ecTimer = setTimeout(async () => {
    try {
      const list = await AdminSv.customers(el.value); const sel = $('#ecCust'); if (!sel) return;
      sel.innerHTML = list.length ? list.map(c => '<option value="' + c.id + '">' + esc(c.full_name || '—') + ' · ' + esc(c.phone || '') + '</option>').join('') : '<option value="">' + t('noCustomers') + '</option>';
    } catch (e) { svErr('#ecErr', e); }
  }, 300);
};
FORMS['sv-enroll-customer'] = async f => {
  const E = f.elements, cust = E.ecCust.value, amtEl = E.ecAmt;
  let ok = true;
  if (f.querySelector('#ecCust')) ok = setErr(f, 'ecCust', cust ? '' : t('noCustomers')) && ok;
  const sch = (openEnrollCustomer.schemes || []).find(x => x.id === E.ecScheme.value);
  if (amtEl) ok = setErr(f, 'ecAmt', sch ? svFixedAmountErr(sch, amtEl.value) : (amtEl.value ? '' : t('errSelectAmount'))) && ok;
  ok = setErr(f, 'ecStart', ymToDate(E.ecStart.value) ? '' : t('err_invalid_start_month')) && ok;
  if (!ok || !cust) { focusFirstInvalid(f); return; }
  const btn = document.querySelector('button[form="svEnrForm"]'); if (btn) btn.disabled = true;
  try {
    const r = await AdminSv.createEnrollment(cust, E.ecScheme.value, amtEl ? svAmountValue(amtEl.value) : null, ymToDate(E.ecStart.value), E.ecNote.value.trim());
    closeModal(true); toast(t('enrolledToast') + ' · ' + r.enrollment_number, 'ok'); go('records/' + r.enrollment_id);
  } catch (e) { svErr('#ecErr', e); if (btn) btn.disabled = false; }
};

'use strict';
/* =========================================================
   GOLD SAVINGS — scheme definitions, DEMO seed records, domain helpers
   (Preserved from the Phase 1 application.)
   ========================================================= */
/* ---------- Scheme definitions ---------- */
const SCHEMES = {
  dhanalakshmi: {
    id: 'dhanalakshmi', code: 'DL', type: 'flexible',
    name: { en: 'Dhanalakshmi Gold Savings Scheme', ta: 'தனலட்சுமி தங்கச் சேமிப்புத் திட்டம்' },
    short: { en: 'Dhanalakshmi', ta: 'தனலட்சுமி' },
    tagline: { en: 'Save at your own pace, every month.', ta: 'உங்கள் வசதிக்கேற்ப, மாதந்தோறும் சேமியுங்கள்.' },
    desc: { en: 'A 12-month savings plan where you choose how much to contribute each month, within the approved scheme terms. Suited to families whose monthly budgets vary.', ta: 'அங்கீகரிக்கப்பட்ட விதிமுறைகளுக்குள், ஒவ்வொரு மாதமும் எவ்வளவு செலுத்துவது என்பதை நீங்களே தேர்ந்தெடுக்கும் 12 மாதச் சேமிப்புத் திட்டம். மாதந்தோறும் மாறும் வரவுசெலவு உள்ள குடும்பங்களுக்கு ஏற்றது.' },
    contribution: { en: 'Flexible monthly contribution according to the approved scheme terms.', ta: 'அங்கீகரிக்கப்பட்ட திட்ட விதிமுறைகளின்படி நெகிழ்வான மாதத் தொகை.' },
    rules: [
      { en: 'Pay between the 1st and 7th of every month.', ta: 'ஒவ்வொரு மாதமும் 1 முதல் 7 தேதிக்குள் செலுத்தவும்.' },
      { en: 'Choose your monthly amount, as permitted by the approved scheme terms.', ta: 'அங்கீகரிக்கப்பட்ட விதிமுறைகள் அனுமதிக்கும் அளவில் மாதத் தொகையைத் தேர்ந்தெடுக்கலாம்.' },
      { en: 'Each payment is credited to your passbook only after the store verifies it.', ta: 'கடை சரிபார்த்த பிறகே ஒவ்வொரு தவணையும் உங்கள் பாஸ்புக்கில் வரவு வைக்கப்படும்.' }
    ],
    special: { en: 'The monthly amount may vary from month to month, within the limits set in the approved scheme terms.', ta: 'மாதத் தொகை அங்கீகரிக்கப்பட்ட விதிமுறைகளின் வரம்புக்குள் மாதத்திற்கு மாதம் மாறலாம்.' }
  },
  kuber: {
    id: 'kuber', code: 'KL', type: 'fixed',
    name: { en: 'Kuber Lakshmi Gold Savings Scheme', ta: 'குபேர லட்சுமி தங்கச் சேமிப்புத் திட்டம்' },
    short: { en: 'Kuber Lakshmi', ta: 'குபேர லட்சுமி' },
    tagline: { en: 'A fixed monthly saving, tracked in gold weight.', ta: 'நிலையான மாதச் சேமிப்பு, தங்க எடையில் கணக்கு.' },
    desc: { en: 'A 12-month plan with a fixed monthly contribution chosen at enrollment. Each verified payment is converted to gold weight at the applicable verified gold rate, as per the approved scheme rules.', ta: 'பதிவின்போது தேர்ந்தெடுக்கும் நிலையான மாதத் தொகையுடன் கூடிய 12 மாதத் திட்டம். சரிபார்க்கப்பட்ட ஒவ்வொரு தவணையும், அங்கீகரிக்கப்பட்ட விதிகளின்படி பொருந்தும் உறுதிசெய்யப்பட்ட தங்க விலையில் தங்க எடையாகக் கணக்கிடப்படும்.' },
    contribution: { en: 'Fixed monthly contribution selected at enrollment.', ta: 'பதிவின்போது தேர்ந்தெடுக்கப்படும் நிலையான மாதத் தொகை.' },
    rules: [
      { en: 'Pay between the 1st and 7th of every month.', ta: 'ஒவ்வொரு மாதமும் 1 முதல் 7 தேதிக்குள் செலுத்தவும்.' },
      { en: 'Your monthly amount is fixed when you enroll and stays the same for 12 months.', ta: 'பதிவு செய்யும்போதே உங்கள் மாதத் தொகை நிர்ணயிக்கப்பட்டு 12 மாதங்களுக்கும் மாறாமல் இருக்கும்.' },
      { en: 'Gold weight is calculated at the store\'s verified gold rate, as per the approved scheme rules.', ta: 'அங்கீகரிக்கப்பட்ட விதிகளின்படி, கடை உறுதிசெய்த தங்க விலையில் தங்க எடை கணக்கிடப்படும்.' },
      { en: 'Each payment is credited to your passbook only after the store verifies it.', ta: 'கடை சரிபார்த்த பிறகே ஒவ்வொரு தவணையும் உங்கள் பாஸ்புக்கில் வரவு வைக்கப்படும்.' }
    ],
    special: { en: 'Gold weight for each installment is calculated using the store\'s verified gold rate applicable on the date of verification, as per the approved scheme rules.', ta: 'ஒவ்வொரு தவணைக்குமான தங்க எடை, சரிபார்க்கப்படும் நாளில் பொருந்தும் கடையின் உறுதிசெய்யப்பட்ட தங்க விலையில், அங்கீகரிக்கப்பட்ட விதிகளின்படி கணக்கிடப்படும்.' }
  }
};
const REDEMPTION_TEXT = { en: 'Redemption in the 13th month, as jewellery or gold coin, subject to the approved terms. Final value, making charges and item selection are confirmed at the store.', ta: 'அங்கீகரிக்கப்பட்ட விதிமுறைகளுக்கு உட்பட்டு, 13-ஆம் மாதத்தில் நகையாகவோ தங்க நாணயமாகவோ மீட்கலாம். இறுதி மதிப்பு, செய்கூலி மற்றும் பொருள் தேர்வு கடையில் உறுதிசெய்யப்படும்.' };
function schemeTerms(sc) {
  return [
    { en: 'The scheme duration is 12 months from the month of enrollment.', ta: 'திட்டக் காலம் பதிவு செய்த மாதத்திலிருந்து 12 மாதங்கள்.' },
    { en: 'Monthly payments are accepted between the 1st and 7th of each month.', ta: 'மாதத் தவணைகள் ஒவ்வொரு மாதமும் 1 முதல் 7 தேதி வரை ஏற்கப்படும்.' },
    sc.special,
    { en: 'Every payment is credited only after verification by the store.', ta: 'ஒவ்வொரு தவணையும் கடையின் சரிபார்ப்புக்குப் பிறகே வரவு வைக்கப்படும்.' },
    { en: 'Redemption is available in the 13th month as jewellery or gold coin, subject to the approved terms.', ta: 'அங்கீகரிக்கப்பட்ட விதிமுறைகளுக்கு உட்பட்டு, 13-ஆம் மாதத்தில் நகையாகவோ தங்க நாணயமாகவோ மீட்கலாம்.' },
    { en: 'No returns, bonuses or benefits are promised by this prototype. Final terms are those approved and issued by Subbulakshmi Thanga Maligai.', ta: 'இந்த மாதிரி எந்த வருமானத்தையோ போனஸையோ பலனையோ உறுதியளிக்கவில்லை. சுப்புலட்சுமி தங்க மாளிகை அங்கீகரித்து வழங்கும் விதிமுறைகளே இறுதியானவை.' }
  ];
}
const PAY_STEPS = [
  { en: 'Scan the store\'s official QR code or use the UPI ID given at the counter.', ta: 'கடையின் அதிகாரப்பூர்வ QR குறியீட்டை ஸ்கேன் செய்யவும் அல்லது கவுண்டரில் வழங்கப்படும் UPI ID-ஐப் பயன்படுத்தவும்.' },
  { en: 'Pay the installment amount within the 1st–7th payment window.', ta: '1 – 7 தேதி செலுத்தும் காலத்திற்குள் தவணைத் தொகையைச் செலுத்தவும்.' },
  { en: 'Enter the payment reference number here and submit it.', ta: 'பணம் செலுத்திய குறிப்பு எண்ணை இங்கே உள்ளிட்டுச் சமர்ப்பிக்கவும்.' },
  { en: 'The store verifies the payment and issues a receipt reference.', ta: 'கடை பணத்தைச் சரிபார்த்து ரசீது எண்ணை வழங்கும்.' }
];

/* ---------- DEMO data (fictional) ---------- */
const ME = 'C0142';
/* Fictional sample rates used only to illustrate the passbook. Not market data. */
function demoRate(ym) { const [y, m] = ym.split('-').map(Number); const i = (y - 2025) * 12 + (m - 1); return 6600 + i * 38 + (i % 3) * 12; }

function seed() {
  const customers = [
    { id: 'C0142', name: 'Meenakshi S', nameTa: 'மீனாட்சி S', phone: '98XXX XX142', town: 'Puliyangudi', townTa: 'புளியங்குடி', joined: '2025-10-02' },
    { id: 'C0151', name: 'Ramesh K', nameTa: 'ரமேஷ் K', phone: '97XXX XX151', town: 'Sivagiri', townTa: 'சிவகிரி', joined: '2026-02-03' },
    { id: 'C0163', name: 'Fathima B', nameTa: 'பாத்திமா B', phone: '94XXX XX163', town: 'Kadayanallur', townTa: 'கடையநல்லூர்', joined: '2026-06-01' },
    { id: 'C0170', name: 'Murugan P', nameTa: 'முருகன் P', phone: '90XXX XX170', town: 'Sankarankovil', townTa: 'சங்கரன்கோவில்', joined: '2026-09-02' },
    { id: 'C0188', name: 'Selvi R', nameTa: 'செல்வி R', phone: '93XXX XX188', town: 'Vasudevanallur', townTa: 'வாசுதேவநல்லூர்', joined: '2026-01-04' },
    { id: 'C0195', name: 'Anitha J', nameTa: 'அனிதா J', phone: '99XXX XX195', town: 'Tenkasi', townTa: 'தென்காசி', joined: '2026-10-09' }
  ];
  const enrollments = [
    { id: 'DEMO-DL-0142', customerId: 'C0142', scheme: 'dhanalakshmi', start: '2026-04', status: 'active', enrolledOn: '2026-04-02', fixedAmount: null },
    { id: 'DEMO-KL-0087', customerId: 'C0142', scheme: 'kuber', start: '2025-10', status: 'active', enrolledOn: '2025-10-02', fixedAmount: 5000 },
    { id: 'DEMO-KL-0151', customerId: 'C0151', scheme: 'kuber', start: '2026-02', status: 'active', enrolledOn: '2026-02-03', fixedAmount: 2000 },
    { id: 'DEMO-DL-0163', customerId: 'C0163', scheme: 'dhanalakshmi', start: '2026-06', status: 'active', enrolledOn: '2026-06-01', fixedAmount: null },
    { id: 'DEMO-KL-0170', customerId: 'C0170', scheme: 'kuber', start: '2026-09', status: 'active', enrolledOn: '2026-09-02', fixedAmount: 10000 },
    { id: 'DEMO-DL-0188', customerId: 'C0188', scheme: 'dhanalakshmi', start: '2026-01', status: 'active', enrolledOn: '2026-01-04', fixedAmount: null },
    { id: 'DEMO-KL-0195', customerId: 'C0195', scheme: 'kuber', start: '2026-11', status: 'pending', enrolledOn: '2026-10-09', fixedAmount: 3000 }
  ];
  const tx = []; let n = 0;
  const add = (eid, ym, amount, status, day, reason) => {
    n++;
    const e = enrollments.find(x => x.id === eid);
    const rate = (e.scheme === 'kuber' && status === 'verified') ? demoRate(ym) : null;
    tx.push({
      id: 'TX' + String(n).padStart(4, '0'), enrollmentId: eid, customerId: e.customerId, scheme: e.scheme,
      month: ym, date: ym + '-' + pad(day), amount, ref: 'DEMOUPI' + (518200 + n * 73),
      receipt: status === 'verified' ? 'DEMO-RCPT-' + (3100 + n) : '', status, rate,
      weight: rate ? round3(amount / rate) : null, reason: reason || ''
    });
  };
  [3000, 2500, 5000, 2000, 4000, 3000].forEach((a, i) => add('DEMO-DL-0142', ymAdd('2026-04', i), a, 'verified', [3, 5, 2, 4, 6, 3][i]));
  add('DEMO-DL-0142', '2026-10', 3500, 'pending', 4);
  for (let i = 0; i < 12; i++) add('DEMO-KL-0087', ymAdd('2025-10', i), 5000, 'verified', (i % 5) + 2);
  for (let i = 0; i < 8; i++) add('DEMO-KL-0151', ymAdd('2026-02', i), 2000, 'verified', (i % 6) + 1);
  add('DEMO-KL-0151', '2026-10', 2000, 'pending', 6);
  [1500, 2000, 1500, 2500].forEach((a, i) => add('DEMO-DL-0163', ymAdd('2026-06', i), a, 'verified', (i % 4) + 2));
  add('DEMO-DL-0163', '2026-10', 2000, 'pending', 3);
  add('DEMO-KL-0170', '2026-09', 10000, 'verified', 2);
  add('DEMO-KL-0170', '2026-10', 10000, 'pending', 5);
  [2000, 2000, 3000, 2500, 2000, 4000, 3000, 2500].forEach((a, i) => add('DEMO-DL-0188', ymAdd('2026-01', i), a, 'verified', (i % 5) + 1));
  add('DEMO-DL-0188', '2026-09', 3000, 'rejected', 2, 'Reference not found in store statement (DEMO)');
  add('DEMO-DL-0188', '2026-09', 3000, 'verified', 6);
  return {
    customers, enrollments, transactions: tx, redemptions: [],
    goldRates: [
      { date: '2026-10-12', rate: 7410, by: 'Admin (DEMO)', note: 'DEMO sample' },
      { date: '2026-10-05', rate: 7398, by: 'Admin (DEMO)', note: 'DEMO sample' },
      { date: '2026-09-28', rate: 7385, by: 'Admin (DEMO)', note: 'DEMO sample' }
    ]
  };
}

/* State S, prefs and UI are created in demo-data.js */

/* ---------- Domain helpers ---------- */
const getCust = id => S.customers.find(c => c.id === id);
const custName = c => c ? (lang === 'ta' ? c.nameTa : c.name) : '—';
const custTown = c => c ? (lang === 'ta' ? c.townTa : c.town) : '—';
const enrOf = cid => S.enrollments.filter(e => e.customerId === cid);
const txOf = eid => S.transactions.filter(x => x.enrollmentId === eid);
const currentRate = () => S.goldRates[0];
const byDateDesc = (a, b) => (b.date + b.id).localeCompare(a.date + a.id);

function summary(e) {
  const tx = txOf(e.id);
  const ver = tx.filter(x => x.status === 'verified');
  const pen = tx.filter(x => x.status === 'pending');
  const verifiedCount = ver.length;
  const status = e.status === 'pending' ? 'pendingEnroll' : (verifiedCount >= 12 ? 'matured' : 'active');
  return {
    verifiedAmt: sumBy(ver, 'amount'), pendingAmt: sumBy(pen, 'amount'), verifiedCount, status,
    weight: e.scheme === 'kuber' ? round3(ver.reduce((a, x) => a + (x.weight || 0), 0)) : null,
    end: ymAdd(e.start, 11), redeemFrom: ymAdd(e.start, 12),
    eligible: e.status === 'active' && verifiedCount >= 12 && curYM() >= ymAdd(e.start, 12)
  };
}
function installmentsOf(e) {
  const cur = curYM(), day = new Date().getDate(), tx = txOf(e.id);
  const prio = { verified: 3, pending: 2, rejected: 1 };
  return Array.from({ length: 12 }, (_, i) => {
    const ym = ymAdd(e.start, i);
    const found = tx.filter(x => x.month === ym).sort((a, b) => prio[b.status] - prio[a.status])[0];
    let status;
    if (found) status = found.status;
    else if (e.status === 'pending' || ym > cur) status = 'upcoming';
    else if (ym === cur) status = day <= 7 ? 'due' : 'missed';
    else status = 'missed';
    return { n: i + 1, month: ym, status, tx: found || null };
  });
}
function nextPayable(e) {
  if (e.status !== 'active') return null;
  const cur = curYM();
  return installmentsOf(e).find(x => !['verified', 'pending'].includes(x.status) && x.month >= cur) || null;
}
function payOptions() { return enrOf(ME).map(e => ({ e, next: nextPayable(e) })).filter(o => o.next); }
function nextTxId() { const max = S.transactions.reduce((m, x) => Math.max(m, parseInt(x.id.slice(2), 10) || 0), 0); return 'TX' + String(max + 1).padStart(4, '0'); }

'use strict';
/* =========================================================
   DEMO DATA & STATE
   - Savings records: fictional, kept in sessionStorage so the customer and admin
     pages share them within one browser tab. Closing the tab or "Reset demo data"
     restores the original sample records.
   - Catalogue: fictional SAMPLE products (not the store's inventory). Weights are
     illustrative; no making-charge, stone-charge or tax rules are invented.
   Structured so the same objects can later come from Supabase tables
   (categories, products, product_images).
   ========================================================= */
const DEMO_VERSION = 2;

let S = (function () {
  const saved = sstore.get('demoState');
  if (saved && saved.v === DEMO_VERSION && saved.data && Array.isArray(saved.data.transactions)) return saved.data;
  return seed();
}());
function persistDemo() { sstore.set('demoState', { v: DEMO_VERSION, data: S }); }
function resetDemo() { S = seed(); persistDemo(); }

const prefs = Object.assign({ notify: true }, store.get('prefs', {}));
const UI = {
  txStatus: 'all', txScheme: 'all', txQ: '', custQ: '', enrScheme: 'all', enrStatus: 'all',
  recQ: '', recStatus: 'all', recEnr: null, payTab: 'pending', paySel: null, payResult: null,
  redeemSel: null, redeemType: 'jewellery',
  shopQ: '', shopSort: 'newest', shopLimit: 12, galIdx: 0, prodQ: '', prodCat: 'all'
};

/* ---------- Categories (later: categories table) ---------- */
const CATEGORIES = [
  { id: 'rings', order: 1, visible: true, art: 'ring', name: { en: 'Gold Rings', ta: 'தங்க மோதிரங்கள்' } },
  { id: 'chains', order: 2, visible: true, art: 'chain', name: { en: 'Gold Chains', ta: 'தங்கச் சங்கிலிகள்' } },
  { id: 'necklaces', order: 3, visible: true, art: 'necklace', name: { en: 'Necklaces', ta: 'நெக்லஸ்கள்' } },
  { id: 'bangles', order: 4, visible: true, art: 'bangle', name: { en: 'Bangles', ta: 'வளையல்கள்' } },
  { id: 'earrings', order: 5, visible: true, art: 'earring', name: { en: 'Earrings', ta: 'கம்மல்கள்' } },
  { id: 'bridal', order: 6, visible: true, art: 'bridal', name: { en: 'Bridal Jewellery', ta: 'மணப்பெண் நகைகள்' } },
  { id: 'thali', order: 7, visible: true, art: 'thali', name: { en: 'Thali Chains', ta: 'தாலிக் கொடிகள்' } },
  { id: 'coins', order: 8, visible: true, art: 'coin', name: { en: 'Gold Coins', ta: 'தங்க நாணயங்கள்' } },
  { id: 'silver', order: 9, visible: true, art: 'silver', name: { en: 'Silver Jewellery', ta: 'வெள்ளி நகைகள்' } }
];
/* After start-up the active category list is Catalog.cats (demo list or Supabase rows). */
const activeCats = () => (Catalog.cats.length ? Catalog.cats : CATEGORIES);
const getCat = id => activeCats().find(c => c.id === id);
const visibleCats = () => activeCats().filter(c => c.visible).sort((a, b) => a.order - b.order);

/* ---------- Products (later: products + product_images tables) ----------
   price.mode: 'enquiry' = final price only from the store
               'sample'  = a DEMO sample price used only to demonstrate the cart */
function P(o) {
  return Object.assign({
    isDemo: true, stoneWeight: null, makingCharge: null, stoneCharge: null, tax: null,
    price: { mode: 'enquiry' }, stock: 'in_stock', stockQty: 1, qtySelectable: false, tags: [],
    images: [0, 1, 2].map(v => ({ art: CATEGORIES.find(c => c.id === o.category).art, v }))
  }, o);
}
const PRODUCTS = [
  P({ id: 'DEMO-R001', category: 'rings', purity: '22K', grossWeight: 4.2, netWeight: 4.2, addedOn: '2026-10-08', tags: ['new', 'featured'],
    name: { en: 'Lotus Motif Ring', ta: 'தாமரை வடிவ மோதிரம்' },
    desc: { en: 'A ring with a lotus motif and a fine textured band. Sample product for the prototype.', ta: 'தாமரை வடிவமும் நுணுக்கமான வேலைப்பாடும் கொண்ட மோதிரம். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-R002', category: 'rings', purity: '22K', grossWeight: 5.1, netWeight: 4.6, stoneWeight: 0.5, addedOn: '2026-08-21', tags: ['popular'],
    name: { en: 'Classic Stone Ring', ta: 'கல் பதித்த மோதிரம்' },
    desc: { en: 'A classic ring with a single set stone. Sample product for the prototype.', ta: 'ஒற்றைக் கல் பதித்த பாரம்பரிய மோதிரம். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-R003', category: 'rings', purity: '22K', grossWeight: 6.8, netWeight: 6.8, addedOn: '2026-07-14', tags: ['popular'],
    name: { en: "Men's Band Ring", ta: 'ஆண்கள் பேண்ட் மோதிரம்' },
    desc: { en: 'A plain, broad band ring. Sample product for the prototype.', ta: 'அகலமான, எளிய வடிவ மோதிரம். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-C001', category: 'chains', purity: '22K', grossWeight: 12.0, netWeight: 12.0, addedOn: '2026-09-02', tags: ['popular'],
    name: { en: 'Rope Chain', ta: 'கயிறு வடிவ சங்கிலி' },
    desc: { en: 'A twisted rope-pattern chain for daily wear. Sample product for the prototype.', ta: 'தினசரி அணிய ஏற்ற கயிறு வடிவ சங்கிலி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-C002', category: 'chains', purity: '22K', grossWeight: 8.4, netWeight: 8.4, addedOn: '2026-10-05', tags: ['new'],
    name: { en: 'Light Box Chain', ta: 'மெல்லிய பாக்ஸ் சங்கிலி' },
    desc: { en: 'A lightweight box-link chain. Sample product for the prototype.', ta: 'எடை குறைந்த பாக்ஸ் இணைப்புச் சங்கிலி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-C003', category: 'chains', purity: '22K', grossWeight: 4.0, netWeight: 4.0, addedOn: '2026-09-28', tags: ['new'],
    name: { en: "Children's Chain", ta: 'குழந்தைகள் சங்கிலி' },
    desc: { en: 'A short, light chain for children. Sample product for the prototype.', ta: 'குழந்தைகளுக்கான சிறிய, எடை குறைந்த சங்கிலி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-N001', category: 'necklaces', purity: '22K', grossWeight: 32.5, netWeight: 30.1, stoneWeight: 2.4, addedOn: '2026-08-30', tags: ['bridal', 'featured'],
    name: { en: 'Temple Necklace', ta: 'கோயில் வடிவ நெக்லஸ்' },
    desc: { en: 'A temple-style necklace with a central pendant. Sample product for the prototype.', ta: 'நடுவில் டாலருடன் கூடிய கோயில் பாணி நெக்லஸ். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-N002', category: 'necklaces', purity: '22K', grossWeight: 24.0, netWeight: 22.2, stoneWeight: 1.8, addedOn: '2026-07-30', tags: ['popular'],
    name: { en: 'Kemp Stone Necklace', ta: 'கெம்ப் கல் நெக்லஸ்' },
    desc: { en: 'A necklace set with kemp stones. Sample product for the prototype.', ta: 'கெம்ப் கற்கள் பதித்த நெக்லஸ். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-N003', category: 'necklaces', purity: '18K', grossWeight: 9.6, netWeight: 9.6, addedOn: '2026-10-10', tags: ['new'],
    name: { en: 'Daily Wear Necklace', ta: 'தினசரி அணியும் நெக்லஸ்' },
    desc: { en: 'A light necklace for everyday wear. Sample product for the prototype.', ta: 'தினமும் அணிய ஏற்ற எடை குறைந்த நெக்லஸ். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-B001', category: 'bangles', purity: '22K', grossWeight: 20.0, netWeight: 20.0, addedOn: '2026-06-18', tags: ['popular'],
    name: { en: 'Plain Bangle Pair', ta: 'சாதா வளையல் ஜோடி' },
    desc: { en: 'A pair of plain polished bangles. Sample product for the prototype.', ta: 'பளபளப்பான சாதா வளையல் ஜோடி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-B002', category: 'bangles', purity: '22K', grossWeight: 26.4, netWeight: 26.4, addedOn: '2026-10-01', tags: ['bridal', 'new'],
    name: { en: 'Carved Bangle Pair', ta: 'செதுக்கு வேலை வளையல் ஜோடி' },
    desc: { en: 'A pair of bangles with hand-carved patterns. Sample product for the prototype.', ta: 'கைவேலைச் செதுக்கல் கொண்ட வளையல் ஜோடி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-E001', category: 'earrings', purity: '22K', grossWeight: 8.2, netWeight: 7.6, stoneWeight: 0.6, addedOn: '2026-09-12', tags: ['popular', 'featured'],
    name: { en: 'Jhumka Earrings', ta: 'ஜிமிக்கி கம்மல்' },
    desc: { en: 'Bell-shaped jhumka earrings with small drops. Sample product for the prototype.', ta: 'சிறு மணிகளுடன் கூடிய ஜிமிக்கி கம்மல். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-E002', category: 'earrings', purity: '22K', grossWeight: 3.1, netWeight: 3.1, addedOn: '2026-10-07', tags: ['new'],
    name: { en: 'Stud Earrings', ta: 'தோடு' },
    desc: { en: 'Small round stud earrings. Sample product for the prototype.', ta: 'சிறிய வட்ட வடிவத் தோடு. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-BR01', category: 'bridal', purity: '22K', grossWeight: 68.0, netWeight: 62.5, stoneWeight: 5.5, addedOn: '2026-09-20', tags: ['bridal', 'featured'], stock: 'made_to_order', stockQty: 0,
    name: { en: 'Bridal Necklace Set', ta: 'மணப்பெண் நெக்லஸ் செட்' },
    desc: { en: 'A layered bridal necklace set. Made to order in the prototype example.', ta: 'அடுக்கு வடிவ மணப்பெண் நெக்லஸ் செட். இந்த மாதிரியில் ஆர்டரின் பேரில் செய்யப்படும்.' } }),
  P({ id: 'DEMO-BR02', category: 'bridal', purity: '22K', grossWeight: 54.0, netWeight: 50.0, stoneWeight: 4.0, addedOn: '2026-06-05', tags: ['bridal'], stock: 'out_of_stock', stockQty: 0,
    name: { en: 'Bridal Haram', ta: 'மணப்பெண் ஆரம்' },
    desc: { en: 'A long bridal haram. Shown as out of stock to demonstrate the status.', ta: 'நீளமான மணப்பெண் ஆரம். இருப்பு நிலையைக் காட்ட "இருப்பில் இல்லை" எனக் காட்டப்படுகிறது.' } }),
  P({ id: 'DEMO-T001', category: 'thali', purity: '22K', grossWeight: 24.0, netWeight: 24.0, addedOn: '2026-08-11', tags: ['bridal', 'popular'],
    name: { en: 'Thali Chain (Kodi)', ta: 'தாலிக் கொடி' },
    desc: { en: 'A traditional thali kodi chain. Sample product for the prototype.', ta: 'பாரம்பரியத் தாலிக் கொடி. மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-T002', category: 'thali', purity: '22K', grossWeight: 6.0, netWeight: 6.0, addedOn: '2026-09-25', tags: ['bridal'], stock: 'made_to_order', stockQty: 0,
    name: { en: 'Thali Pendant', ta: 'தாலி டாலர்' },
    desc: { en: 'A thali pendant, made to order as per family custom. Sample product.', ta: 'குடும்ப வழக்கப்படி ஆர்டரின் பேரில் செய்யப்படும் தாலி டாலர். மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-G001', category: 'coins', purity: '24K', grossWeight: 1.0, netWeight: 1.0, addedOn: '2026-09-15', tags: ['popular'], stockQty: 10, qtySelectable: true,
    name: { en: 'Gold Coin · 1 g', ta: 'தங்க நாணயம் · 1 கிராம்' },
    desc: { en: 'A 1 gram gold coin. Sample product for the prototype.', ta: '1 கிராம் தங்க நாணயம். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-G002', category: 'coins', purity: '24K', grossWeight: 2.0, netWeight: 2.0, addedOn: '2026-09-15', tags: [], stockQty: 6, qtySelectable: true,
    name: { en: 'Gold Coin · 2 g', ta: 'தங்க நாணயம் · 2 கிராம்' },
    desc: { en: 'A 2 gram gold coin. Sample product for the prototype.', ta: '2 கிராம் தங்க நாணயம். மாதிரிப் பதிப்பிற்கான மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-S001', category: 'silver', purity: '925', grossWeight: 42.0, netWeight: 42.0, addedOn: '2026-09-30', tags: ['popular'], price: { mode: 'sample', amount: 4800 }, stockQty: 5, qtySelectable: true,
    name: { en: 'Silver Anklets (Kolusu)', ta: 'வெள்ளிக் கொலுசு' },
    desc: { en: 'A pair of silver anklets with small bells. Sample product with a DEMO sample price.', ta: 'சிறு மணிகளுடன் கூடிய வெள்ளிக் கொலுசு ஜோடி. டெமோ மாதிரி விலையுடன் கூடிய மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-S002', category: 'silver', purity: '925', grossWeight: 18.0, netWeight: 18.0, addedOn: '2026-08-02', tags: [], price: { mode: 'sample', amount: 2150 }, stockQty: 4, qtySelectable: true,
    name: { en: 'Silver Kumkum Box', ta: 'வெள்ளிக் குங்குமச் சிமிழ்' },
    desc: { en: 'A small silver kumkum box. Sample product with a DEMO sample price.', ta: 'சிறிய வெள்ளிக் குங்குமச் சிமிழ். டெமோ மாதிரி விலையுடன் கூடிய மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-S003', category: 'silver', purity: '925', grossWeight: 6.0, netWeight: 6.0, addedOn: '2026-10-09', tags: ['new', 'popular'], price: { mode: 'sample', amount: 650 }, stockQty: 12, qtySelectable: true,
    name: { en: 'Silver Toe Rings (Metti)', ta: 'வெள்ளி மெட்டி' },
    desc: { en: 'A pair of silver toe rings. Sample product with a DEMO sample price.', ta: 'வெள்ளி மெட்டி ஜோடி. டெமோ மாதிரி விலையுடன் கூடிய மாதிரிப் பொருள்.' } }),
  P({ id: 'DEMO-S004', category: 'silver', purity: '925', grossWeight: 85.0, netWeight: 85.0, addedOn: '2026-07-01', tags: ['featured'], stock: 'made_to_order', stockQty: 0,
    name: { en: 'Silver Pooja Lamp', ta: 'வெள்ளி விளக்கு' },
    desc: { en: 'A silver pooja lamp, made to order. Sample product.', ta: 'ஆர்டரின் பேரில் செய்யப்படும் வெள்ளி விளக்கு. மாதிரிப் பொருள்.' } })
];
/* Products already loaded (demo list, or rows fetched from Supabase), keyed by product ID / SKU. */
const getProduct = id => Catalog.products.get(id);


/* Catalogue labels shared by the customer and admin apps */
addStrings({
  priceEnquiry: 'Contact store for price',
  samplePriceShort: 'DEMO sample price',
  purity: 'Purity',
  grossWeight: 'Gross weight',
  netWeight: 'Net gold weight',
  netWeightGeneric: 'Net weight',
  stoneWeight: 'Stone weight',
  stockStatus: 'Availability',
  category: 'Category',
  stock_in_stock: 'In stock',
  stock_made_to_order: 'Made to order',
  stock_out_of_stock: 'Out of stock',
  silverWord: 'Silver',
  sampleImage: 'sample image',
  sampleImageShort: 'SAMPLE',
  productId: 'Product ID'
}, {
  priceEnquiry: 'விலைக்கு கடையைத் தொடர்புகொள்ளவும்',
  samplePriceShort: 'டெமோ மாதிரி விலை',
  purity: 'தூய்மை',
  grossWeight: 'மொத்த எடை',
  netWeight: 'நிகரத் தங்க எடை',
  netWeightGeneric: 'நிகர எடை',
  stoneWeight: 'கல் எடை',
  stockStatus: 'இருப்பு நிலை',
  category: 'வகை',
  stock_in_stock: 'கையிருப்பில் உள்ளது',
  stock_made_to_order: 'ஆர்டரின் பேரில் செய்யப்படும்',
  stock_out_of_stock: 'தற்போது இருப்பில் இல்லை',
  silverWord: 'வெள்ளி',
  sampleImage: 'மாதிரிப் படம்',
  sampleImageShort: 'மாதிரி',
  productId: 'பொருள் எண்'
});

/* ---------- Pricing — never invents making charges, stone charges or taxes ---------- */
/* Only the DEMO catalogue uses the DEMO 22K rate. With Supabase there is no verified rate source yet, so no estimate is shown. */
function rateFor(purity) { return (!isLive() && purity === '22K') ? currentRate() : null; }
function priceInfo(p) {
  const r = p.netWeight ? rateFor(p.purity) : null;
  return {
    sample: p.price.mode === 'enquiry' ? null : p.price.amount,   // a known price (DEMO sample or the store's fixed price)
    isSample: p.price.mode === 'sample',
    goldEst: r ? Math.round(p.netWeight * r.rate) : null,
    rate: r
  };
}
function purityLabel(p) { return p.purity === '925' ? '925 ' + t('silverWord') : p.purity; }

/* ---------- Placeholder jewellery art (until real product photos are uploaded) ---------- */
function jewelArt(kind, v) {
  const tf = v === 1 ? 'translate(100 104) scale(1.32) translate(-100 -104)' : v === 2 ? 'rotate(-14 100 104)' : '';
  let g = '';
  const f = n => n.toFixed(1);
  if (kind === 'ring') {
    g = '<circle class="art-line" cx="100" cy="122" r="44" stroke-width="8"/><circle class="art-line" cx="100" cy="122" r="36" stroke-width="1.2"/><circle class="art-line" cx="100" cy="122" r="52" stroke-width="1.2"/><path class="art-fill" d="M82 82 90 70h20l8 12Z"/><path class="art-gem" d="M88 70 100 50 112 70 100 84Z"/>';
  } else if (kind === 'chain' || kind === 'thali') {
    const cy = kind === 'thali' ? 34 : 60, ry = kind === 'thali' ? 100 : 92;
    for (let i = 0; i <= 22; i++) {
      const a = (12 + i * 7) * Math.PI / 180, x = 100 + 66 * Math.cos(a), y = cy + ry * Math.sin(a);
      const rot = Math.atan2(ry * Math.cos(a), -66 * Math.sin(a)) * 180 / Math.PI;
      g += '<ellipse class="art-line" cx="' + f(x) + '" cy="' + f(y) + '" rx="6.5" ry="' + (i % 2 ? 2.4 : 3.8) + '" stroke-width="2.2" transform="rotate(' + f(rot) + ' ' + f(x) + ' ' + f(y) + ')"/>';
    }
    if (kind === 'thali') g += '<path class="art-fill" d="M100 136C82 152 86 178 100 188 114 178 118 152 100 136Z"/><path class="art-line" d="M100 148v28" stroke-width="1.4"/><circle class="art-gem" cx="100" cy="142" r="4"/>';
  } else if (kind === 'necklace' || kind === 'bridal') {
    const outer = kind === 'bridal' ? [28, 44, 196] : [36, 52, 188];
    const q = (t, p0, p1, p2) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    g += '<path class="art-line" d="M' + outer[0] + ' ' + outer[1] + 'Q100 ' + outer[2] + ' ' + (200 - outer[0]) + ' ' + outer[1] + '" stroke-width="5"/>';
    g += '<path class="art-line" d="M' + (outer[0] + 14) + ' ' + outer[1] + 'Q100 ' + (outer[2] - 30) + ' ' + (186 - outer[0]) + ' ' + outer[1] + '" stroke-width="1.6"/>';
    for (let i = 2; i <= 8; i++) {
      if (i === 5) continue;
      const t2 = i / 10, x = q(t2, outer[0], 100, 200 - outer[0]), y = q(t2, outer[1], outer[2], outer[1]);
      g += kind === 'bridal' ? '<circle class="art-gem" cx="' + f(x) + '" cy="' + f(y + 2) + '" r="4.5"/><path class="art-fill" d="M' + f(x) + ' ' + f(y + 8) + 'l-4 8 4 6 4-6Z"/>' : '<path class="art-fill" d="M' + f(x) + ' ' + f(y + 3) + 'l-4 7 4 6 4-6Z"/>';
    }
    const cy = q(0.5, outer[1], outer[2], outer[1]);
    g += '<path class="art-fill" d="M100 ' + f(cy + 2) + 'C84 ' + f(cy + 18) + ' 86 ' + f(cy + 40) + ' 100 ' + f(cy + 48) + ' 114 ' + f(cy + 40) + ' 116 ' + f(cy + 18) + ' 100 ' + f(cy + 2) + 'Z"/><circle class="art-gem" cx="100" cy="' + f(cy + 24) + '" r="' + (kind === 'bridal' ? 8 : 6) + '"/>';
    if (kind === 'bridal') g += '<circle class="art-gem" cx="88" cy="' + f(cy + 14) + '" r="3"/><circle class="art-gem" cx="112" cy="' + f(cy + 14) + '" r="3"/>';
  } else if (kind === 'bangle') {
    g = '<ellipse class="art-line" cx="86" cy="96" rx="54" ry="24" stroke-width="9"/><ellipse class="art-line" cx="114" cy="120" rx="54" ry="24" stroke-width="9"/>';
    for (let i = 0; i < 12; i++) { const a = (200 + i * 12) * Math.PI / 180; g += '<circle class="art-fill" cx="' + f(86 + 54 * Math.cos(a)) + '" cy="' + f(96 + 24 * Math.sin(a)) + '" r="2.4"/>'; }
  } else if (kind === 'earring') {
    [66, 134].forEach(x => {
      g += '<circle class="art-fill" cx="' + x + '" cy="48" r="8"/><circle class="art-gem" cx="' + x + '" cy="48" r="3.5"/><path class="art-line" d="M' + x + ' 56v12" stroke-width="2"/>';
      g += '<path class="art-fill" d="M' + (x - 24) + ' 116C' + (x - 24) + ' 82 ' + (x + 24) + ' 82 ' + (x + 24) + ' 116Z"/><path class="art-line" d="M' + (x - 27) + ' 116H' + (x + 27) + '" stroke-width="3"/>';
      for (let k = -20; k <= 20; k += 8) g += '<circle class="art-fill" cx="' + (x + k) + '" cy="124" r="3"/>';
    });
  } else if (kind === 'coin') {
    let petals = '';
    for (let i = 0; i < 8; i++) petals += '<path class="art-line" d="M100 82C106 92 106 98 100 104C94 98 94 92 100 82Z" stroke-width="1.6" transform="rotate(' + (i * 45) + ' 100 104)"/>';
    g = '<circle class="art-fill" cx="100" cy="104" r="62"/><circle class="art-line" cx="100" cy="104" r="54" stroke-width="2"/>' + petals + '<circle class="art-line" cx="100" cy="104" r="6" stroke-width="1.6"/>';
  } else {
    for (let x = 22; x <= 178; x += 9) {
      const y = 92 + 10 * Math.sin(x / 16);
      g += '<ellipse class="art-silver" cx="' + x + '" cy="' + f(y) + '" rx="5.5" ry="3" stroke-width="2"/>';
      if ((x - 22) % 27 === 0) g += '<path class="art-silver" d="M' + x + ' ' + f(y + 3) + 'v12" stroke-width="1.4"/><circle class="art-silver-fill" cx="' + x + '" cy="' + f(y + 20) + '" r="5"/>';
    }
  }
  return '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><rect class="art-bg" width="200" height="200"/><circle class="art-glow" cx="100" cy="104" r="80"/><g transform="' + tf + '">' + g + '</g></svg>';
}
/* A product image: a real photo once `src` exists, otherwise the labelled placeholder */
function productImg(p, idx, withTag) {
  const img = p.images[idx || 0] || p.images[0];
  const alt = L(p.name);
  if (img.src) return '<img class="product-photo" src="' + esc(img.src) + '" alt="' + esc(L(img.alt) || alt) + '" loading="lazy" decoding="async" width="600" height="600">';
  const tag = img.noPhoto ? t('noPhotoYet') : t('sampleImageShort');
  return '<span class="art" role="img" aria-label="' + esc(alt) + ' — ' + (img.noPhoto ? t('noPhotoYet') : t('sampleImage')) + '">' + jewelArt(img.art, img.v) + (withTag === false ? '' : '<span class="sample-tag">' + tag + '</span>') + '</span>';
}
function catArt(c) { return '<span class="art" aria-hidden="true">' + jewelArt(c.art, 0) + '</span>'; }

/* ---------- Device storage: wishlist (DEMO mode or before login) and cart (always local in Phase 4) ----------
   The cart is NOT an order. Orders exist only after the database accepts an order request. */
function getLocalWishlist() { const w = store.get('wishlist', []); return Array.isArray(w) ? w.filter(x => typeof x === 'string').slice(0, 200) : []; }
function setLocalWishlist(list) { store.set('wishlist', list); }
function getCart() { const c = store.get('cart', []); return Array.isArray(c) ? c.filter(i => i && typeof i.id === 'string' && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 10).slice(0, 20) : []; }
function setCart(list) { store.set('cart', list); }
function cartCount() { return getCart().reduce((a, i) => a + i.qty, 0); }
function maxQty(p) {
  if (p.isLive) return Math.max(1, Math.min(p.maxOrderQty || 1, p.stock === 'in_stock' ? Math.max(1, p.stockQty) : 10));
  return p.qtySelectable ? Math.max(1, Math.min(10, p.stockQty || 1)) : 1;
}
addStrings({ noPhotoYet: 'Photo coming soon', storePrice: 'Store price' }, { noPhotoYet: 'படம் விரைவில்', storePrice: 'கடை விலை' });

/* Collection and catalogue labels shared by the customer and admin apps */
addStrings({
  tag_new: 'New arrivals',
  tag_popular: 'Popular',
  tag_bridal: 'Bridal collection',
  tag_featured: 'Featured',
  loadMore: 'Show more',
  productMissing: 'Item not found',
  productMissingHint: 'It may have been removed from the sample catalogue.'
}, {
  tag_new: 'புதிய வரவுகள்',
  tag_popular: 'பிரபலமானவை',
  tag_bridal: 'மணப்பெண் தொகுப்பு',
  tag_featured: 'சிறப்புத் தேர்வுகள்',
  loadMore: 'மேலும் காட்டு',
  productMissing: 'நகை கிடைக்கவில்லை',
  productMissingHint: 'இது மாதிரிப் பட்டியலிலிருந்து நீக்கப்பட்டிருக்கலாம்.'
});

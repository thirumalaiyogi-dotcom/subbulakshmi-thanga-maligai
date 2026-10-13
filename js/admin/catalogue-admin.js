'use strict';
/* =========================================================
   ADMIN · CATALOGUE & PLANNED MODULES — products and categories (read-only
   view of the DEMO catalogue), orders and scheme configuration shown honestly
   as "Coming soon"
   ========================================================= */
addStrings({
  a_productsSub: 'Sample catalogue — read-only in this phase.', a_categoriesSub: 'Categories shown in the customer app — read-only in this phase.',
  a_ordersSub: 'Customer jewellery orders.', a_schemesSub: 'Savings scheme configuration — read-only in this phase.',
  readOnlyNote: 'Read-only: editing arrives together with the database in a later phase.',
  priceCol: 'Price', orderCol: 'Order', nameEn: 'Name (English)', nameTa: 'Name (Tamil)', productsCount: 'Products', visibleCol: 'Shown', yesWord: 'Yes',
  allCategories: 'All categories', searchProducts: 'Search name or product ID',
  soonProductsTitle: 'Product management', soonProducts1: 'Add and edit products, with Tamil and English names', soonProducts2: 'Upload product photos',
  soonProducts3: 'Set purity, weights, making and stone charges', soonProducts4: 'Manage stock and availability', soonProducts5: 'Publish or hide products',
  soonCatsTitle: 'Category management', soonCats1: 'Add, rename and reorder categories', soonCats2: 'Hide a category without deleting it',
  soonOrdersTitle: 'Order management', soonOrders0: 'No order system exists yet. The customer cart is a demo kept on each device, so there are no orders to show.',
  soonOrders1: 'Order list with search by order ID or customer', soonOrders2: 'Saved price breakdown at the time of order',
  soonOrders3: 'Confirm or reject orders and update fulfilment status', soonOrders4: 'Cancellation and refund records, internal notes',
  soonSchemesTitle: 'Scheme configuration', soonSchemes1: 'Create and edit schemes with the store\'s approved terms',
  soonSchemes2: 'Set contribution limits and redemption rules', soonSchemes3: 'Activate or close a scheme for new enrollments',
  activeEnrollmentsCol: 'Active enrollments'
}, {
  a_productsSub: 'மாதிரிப் பட்டியல் — இந்தக் கட்டத்தில் பார்வைக்கு மட்டும்.', a_categoriesSub: 'வாடிக்கையாளர் செயலியில் காட்டப்படும் வகைகள் — இந்தக் கட்டத்தில் பார்வைக்கு மட்டும்.',
  a_ordersSub: 'வாடிக்கையாளர் நகை ஆர்டர்கள்.', a_schemesSub: 'சேமிப்புத் திட்ட அமைப்பு — இந்தக் கட்டத்தில் பார்வைக்கு மட்டும்.',
  readOnlyNote: 'பார்வைக்கு மட்டும்: அடுத்த கட்டத்தில் database உடன் திருத்தும் வசதி வரும்.',
  priceCol: 'விலை', orderCol: 'வரிசை', nameEn: 'பெயர் (ஆங்கிலம்)', nameTa: 'பெயர் (தமிழ்)', productsCount: 'நகைகள்', visibleCol: 'காட்டப்படுகிறது', yesWord: 'ஆம்',
  allCategories: 'அனைத்து வகைகள்', searchProducts: 'பெயர் அல்லது பொருள் எண் மூலம் தேடுக',
  soonProductsTitle: 'நகை மேலாண்மை', soonProducts1: 'தமிழ், ஆங்கிலப் பெயர்களுடன் நகைகளைச் சேர்த்தல், திருத்துதல்', soonProducts2: 'நகைப் படங்களைப் பதிவேற்றுதல்',
  soonProducts3: 'தூய்மை, எடை, செய்கூலி, கல் கட்டணம் அமைத்தல்', soonProducts4: 'இருப்பு மற்றும் கிடைப்பு நிலையை நிர்வகித்தல்', soonProducts5: 'நகைகளை வெளியிடுதல் அல்லது மறைத்தல்',
  soonCatsTitle: 'வகை மேலாண்மை', soonCats1: 'வகைகளைச் சேர்த்தல், பெயர் மாற்றுதல், வரிசைப்படுத்துதல்', soonCats2: 'நீக்காமல் ஒரு வகையை மறைத்தல்',
  soonOrdersTitle: 'ஆர்டர் மேலாண்மை', soonOrders0: 'இன்னும் ஆர்டர் அமைப்பு இல்லை. வாடிக்கையாளர் கூடை ஒவ்வொரு சாதனத்திலும் உள்ள டெமோ மட்டுமே; காட்டுவதற்கு ஆர்டர்கள் இல்லை.',
  soonOrders1: 'ஆர்டர் எண் அல்லது வாடிக்கையாளர் மூலம் தேடக்கூடிய ஆர்டர் பட்டியல்', soonOrders2: 'ஆர்டர் நேரத்தில் சேமிக்கப்பட்ட விலை விவரம்',
  soonOrders3: 'ஆர்டரை உறுதிசெய்தல்/நிராகரித்தல், நிலையைப் புதுப்பித்தல்', soonOrders4: 'ரத்து, பணத்திருப்பப் பதிவுகள், உள் குறிப்புகள்',
  soonSchemesTitle: 'திட்ட அமைப்பு', soonSchemes1: 'கடை அங்கீகரித்த விதிமுறைகளுடன் திட்டங்களை உருவாக்குதல், திருத்துதல்',
  soonSchemes2: 'தொகை வரம்புகள், மீட்பு விதிகளை அமைத்தல்', soonSchemes3: 'புதிய பதிவுகளுக்குத் திட்டத்தைத் திறத்தல் அல்லது மூடுதல்',
  activeEnrollmentsCol: 'செயலில் உள்ள பதிவுகள்'
});

function aProducts() {
  const opt = (v, l) => '<option value="' + v + '"' + (UI.prodCat === v ? ' selected' : '') + '>' + l + '</option>';
  return aHead('products') +
    '<div class="note note--info">' + ic('info') + '<span>' + t('readOnlyNote') + '</span></div>' +
    '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchProducts') + '" aria-label="' + t('searchProducts') + '" value="' + esc(UI.prodQ) + '" data-filter="prod"></div>' +
      '<select class="select" aria-label="' + t('category') + '" data-change="prod-cat">' + opt('all', t('allCategories')) + visibleCats().map(c => opt(c.id, L(c.name))).join('') + '</select></div>' +
    '<div id="prodList"></div>' +
    comingSoon(t('soonProductsTitle'), [t('soonProducts1'), t('soonProducts2'), t('soonProducts3'), t('soonProducts4'), t('soonProducts5')]);
}
function renderProdList() {
  const box = $('#prodList'); if (!box) return;
  const q = UI.prodQ.trim().toLowerCase();
  const rows = PRODUCTS.filter(p => (UI.prodCat === 'all' || p.category === UI.prodCat) && (!q || [p.id, p.name.en, p.name.ta].join(' ').toLowerCase().includes(q)));
  if (!rows.length) { box.innerHTML = emptyState('search', t('noResults'), t('noResultsHint')); return; }
  box.innerHTML = '<p class="result-count" aria-live="polite">' + rows.length + ' ' + t('results') + '</p><div class="table-wrap mt"><table class="table"><thead><tr><th>' + t('productDetailsShort') + '</th><th>ID</th><th>' + t('category') + '</th><th>' + t('purity') + '</th><th class="r">' + t('grossWeight') + '</th><th>' + t('stockStatus') + '</th><th>' + t('priceCol') + '</th></tr></thead><tbody>' +
    rows.map(p => '<tr><td data-label="' + t('productDetailsShort') + '"><span class="thumb-cell">' + productImg(p, 0, false) + '<b>' + L(p.name) + '</b></span></td>' +
      '<td data-label="ID"><span class="mono small">' + p.id + '</span></td><td data-label="' + t('category') + '">' + L(getCat(p.category).name) + '</td><td data-label="' + t('purity') + '">' + purityLabel(p) + '</td>' +
      '<td data-label="' + t('grossWeight') + '" class="r num">' + grams(p.grossWeight) + '</td><td data-label="' + t('stockStatus') + '">' + t('stock_' + p.stock) + '</td>' +
      '<td data-label="' + t('priceCol') + '">' + (p.price.mode === 'sample' ? inr(p.price.amount) + ' <span class="demo-mini">DEMO</span>' : t('priceEnquiry')) + '</td></tr>').join('') + '</tbody></table></div>';
}
function aCategories() {
  return aHead('categories') + '<div class="note note--info">' + ic('info') + '<span>' + t('readOnlyNote') + '</span></div>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('orderCol') + '</th><th>' + t('nameEn') + '</th><th>' + t('nameTa') + '</th><th class="r">' + t('productsCount') + '</th><th>' + t('visibleCol') + '</th></tr></thead><tbody>' +
    CATEGORIES.slice().sort((a, b) => a.order - b.order).map(c => '<tr><td data-label="' + t('orderCol') + '">' + c.order + '</td><td data-label="' + t('nameEn') + '"><span class="thumb-cell">' + catArt(c) + '<b>' + esc(c.name.en) + '</b></span></td><td data-label="' + t('nameTa') + '" lang="ta">' + esc(c.name.ta) + '</td>' +
      '<td data-label="' + t('productsCount') + '" class="r num">' + PRODUCTS.filter(p => p.category === c.id).length + '</td><td data-label="' + t('visibleCol') + '">' + (c.visible ? t('yesWord') : '—') + '</td></tr>').join('') + '</tbody></table></div>' +
    comingSoon(t('soonCatsTitle'), [t('soonCats1'), t('soonCats2')]);
}
function aOrders() {
  return aHead('orders') + '<div class="note note--info">' + ic('info') + '<span>' + t('soonOrders0') + '</span></div>' +
    comingSoon(t('soonOrdersTitle'), [t('soonOrders1'), t('soonOrders2'), t('soonOrders3'), t('soonOrders4')]);
}
function aSchemes() {
  return aHead('schemes') + '<div class="note note--info">' + ic('info') + '<span>' + t('readOnlyNote') + '</span></div>' +
    '<div class="scheme-grid">' + Object.values(SCHEMES).map(sc => {
      const active = S.enrollments.filter(e => e.scheme === sc.id && e.status === 'active').length;
      return '<section class="panel"><p class="eyebrow">' + t('goldSavingsScheme') + '</p><h2 class="h3">' + L(sc.name) + '</h2>' +
        '<dl class="kv"><dt>' + t('duration') + '</dt><dd>' + t('months12') + '</dd><dt>' + t('paymentWindow') + '</dt><dd>' + t('window17') + '</dd><dt>' + t('contribution') + '</dt><dd>' + (sc.type === 'fixed' ? t('fixedShort') : t('flexibleShort')) + '</dd><dt>' + t('redemptionShort') + '</dt><dd>' + t('month13') + '</dd><dt>' + t('activeEnrollmentsCol') + '</dt><dd>' + active + '</dd></dl>' +
        '<p class="muted small">' + L(sc.contribution) + '</p></section>';
    }).join('') + '</div>' +
    comingSoon(t('soonSchemesTitle'), [t('soonSchemes1'), t('soonSchemes2'), t('soonSchemes3')]);
}

addStrings({ productDetailsShort: 'Item' }, { productDetailsShort: 'நகை' });
FILTERS.prod = el => { UI.prodQ = el.value; renderProdList(); };
CHANGES['prod-cat'] = el => { UI.prodCat = el.value; renderProdList(); };

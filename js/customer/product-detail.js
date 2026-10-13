'use strict';
/* =========================================================
   CUSTOMER · PRODUCT DETAIL — gallery, specifications, honest price
   breakdown (no invented making charges / taxes), wishlist, cart,
   WhatsApp enquiry, share
   ========================================================= */
addStrings({
  backToShop: 'Back to shop',
  gallery: 'Product images', imageN: 'Image', priceBreakdown: 'Price breakdown', metalValue: 'Metal value (DEMO estimate)',
  makingCharges: 'Making charges', stoneCharges: 'Stone charges', taxes: 'Taxes (GST)', finalPrice: 'Final price',
  toConfirm: 'To be confirmed by the store', notApplicable: 'Not applicable', rateNotConfigured: 'Rate for this purity is not configured',
  inSamplePrice: 'Included in the sample price', demoRateShort: 'DEMO rate, not live',
  goldEstNote: 'Estimated metal value only. Making charges, stone charges and GST are not included.',
  samplePriceNote: "DEMO sample price for the prototype — not the store's price.", description: 'Description',
  addToCart: 'Add to cart', inCart: 'In cart · view', addedToCart: 'Added to cart (demo, this device only).',
  demoProductNote: 'This is a fictional DEMO product. Weights are illustrative. Final weight, price, making charges and taxes are confirmed only at the store.',
  wishAdded: 'Saved to wishlist on this device.', wishRemoved: 'Removed from wishlist.', unavailable: 'Unavailable', productDetails: 'Product details', wishSaved: 'Saved'
}, {
  backToShop: 'நகைகளுக்குத் திரும்பு',
  gallery: 'நகைப் படங்கள்', imageN: 'படம்', priceBreakdown: 'விலை விவரம்', metalValue: 'உலோக மதிப்பு (டெமோ மதிப்பீடு)',
  makingCharges: 'செய்கூலி', stoneCharges: 'கல் கட்டணம்', taxes: 'வரி (GST)', finalPrice: 'இறுதி விலை',
  toConfirm: 'கடையால் உறுதிசெய்யப்படும்', notApplicable: 'பொருந்தாது', rateNotConfigured: 'இந்தத் தூய்மைக்கான விலை அமைக்கப்படவில்லை',
  inSamplePrice: 'மாதிரி விலையில் அடங்கும்', demoRateShort: 'டெமோ விலை, நேரடி விலை அல்ல',
  goldEstNote: 'உலோக மதிப்பின் மதிப்பீடு மட்டுமே. செய்கூலி, கல் கட்டணம், GST சேர்க்கப்படவில்லை.',
  samplePriceNote: 'மாதிரிப் பதிப்பிற்கான டெமோ மாதிரி விலை — கடையின் விலை அல்ல.', description: 'விவரம்',
  addToCart: 'கூடையில் சேர்', inCart: 'கூடையில் உள்ளது · பார்', addedToCart: 'கூடையில் சேர்க்கப்பட்டது (டெமோ, இந்தச் சாதனத்தில் மட்டும்).',
  demoProductNote: 'இது ஒரு கற்பனையான டெமோ நகை. எடைகள் உதாரணத்திற்கு மட்டுமே. இறுதி எடை, விலை, செய்கூலி, வரி ஆகியவை கடையில் மட்டுமே உறுதிசெய்யப்படும்.',
  wishAdded: 'இந்தச் சாதனத்தில் பிடித்தவையில் சேமிக்கப்பட்டது.', wishRemoved: 'பிடித்தவையிலிருந்து நீக்கப்பட்டது.', unavailable: 'கிடைக்கவில்லை', productDetails: 'நகை விவரங்கள்', wishSaved: 'சேமிக்கப்பட்டது'
});

const STOCK_TONE = { in_stock: 'ok', made_to_order: 'info', out_of_stock: 'neutral' };

function pdGallery(p) {
  const idx = Math.min(UI.galIdx || 0, p.images.length - 1);
  return '<div class="pd-gallery"><div class="pd-main" id="pdMain">' + productImg(p, idx) + '</div>' +
    (p.images.length > 1 ? '<div class="pd-thumbs" role="group" aria-label="' + t('gallery') + '">' + p.images.map((_, i) =>
      '<button type="button" class="pd-thumb" data-action="gal" data-i="' + i + '" aria-current="' + (i === idx) + '" aria-label="' + t('imageN') + ' ' + (i + 1) + ' / ' + p.images.length + '">' + productImg(p, i, false) + '</button>').join('') + '</div>' : '') + '</div>';
}
function pdPrice(p) {
  const pi = priceInfo(p);
  if (pi.sample) return '<div class="pd-price"><b>' + inr(pi.sample) + '</b><small>' + (pi.isSample ? t('samplePriceNote') : t('storePriceNote')) + '</small></div>';
  return '<div class="pd-price"><span class="enq">' + t('priceEnquiry') + '</span>' +
    (pi.goldEst ? '<small>' + t('metalValue') + ': <b>' + inr(pi.goldEst) + '</b> · ' + grams(p.netWeight) + ' × ' + inr(pi.rate.rate) + '/g (' + t('demoRateShort') + '). ' + t('goldEstNote') + '</small>' : '') + '</div>';
}
function pdBreakdown(p) {
  const pi = priceInfo(p);
  const metal = pi.goldEst ? inr(pi.goldEst) + '<small>' + grams(p.netWeight) + ' × ' + inr(pi.rate.rate) + '/g · ' + fmtDate(pi.rate.date) + '</small>'
    : pi.sample ? t('inSamplePrice') : t('rateNotConfigured');
  const charge = (v, applies) => v != null ? inr(v) : (applies ? t('toConfirm') : t('notApplicable'));
  const rows = [
    [t('metalValue'), metal],
    [t('makingCharges'), charge(p.makingCharge, true)],
    [t('stoneCharges'), charge(p.stoneCharge, !!p.stoneWeight)],
    [t('taxes'), t('notConfigured')],
    [t('finalPrice'), pi.sample ? inr(pi.sample) + '<small>' + (pi.isSample ? t('samplePriceShort') : t('storePriceShort')) + '</small>' : t('priceEnquiry')]
  ];
  return '<table class="breakdown"><caption class="sr-only">' + t('priceBreakdown') + '</caption><tbody>' + rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>';
}
function pdActions(p) {
  const wished = Wishlist.has(p), inC = getCart().some(i => i.id === p.id), out = p.stock === 'out_of_stock';
  return '<div class="pd-actions">' +
    (inC ? '<button type="button" class="btn btn-primary" data-go="cart">' + ic('bag') + t('inCart') + '</button>'
      : '<button type="button" class="btn btn-primary" data-action="add-cart" data-id="' + esc(p.id) + '"' + (out ? ' disabled' : '') + '>' + ic('bag') + (out ? t('unavailable') : t('addToCart')) + '</button>') +
    '<button type="button" class="btn btn-outline" data-action="wish" data-id="' + esc(p.id) + '" aria-pressed="' + wished + '">' + ic('heart') + (wished ? t('wishSaved') : t('wishAdd')) + '</button>' +
    waButton('product', p.id, 'full') +
    '<button type="button" class="btn btn-outline full" data-action="share" data-id="' + esc(p.id) + '">' + ic('share') + t('share') + '</button></div>';
}
function pageProduct(id) {
  const p = getProduct(id);
  const back = '<button class="back" data-action="back" data-fallback="shop/all">' + ic('left') + t('back') + '</button>';
  if (!p) {
    if (UI.pdChecked === id) return back + emptyState('search', t('productMissing'), t('productMissingHint'), '<button class="btn btn-primary" data-go="shop/all">' + t('backToShop') + '</button>');
    return back + '<div class="pd" id="pdLoading" aria-busy="true"><div class="skel skel--card"></div><div class="skel-list"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>';
  }
  const c = getCat(p.category);
  const isGold = !['925', '999'].includes(p.purity);
  return back +
    '<div class="pd">' + pdGallery(p) +
      '<div class="pd-info">' +
        '<div class="pd-tags"><span class="chip chip--neutral">' + esc(c ? L(c.name) : p.category) + '</span><span class="chip chip--info">' + purityLabel(p) + '</span>' + (p.isDemo ? '<span class="tag-demo">DEMO</span>' : '') + '</div>' +
        '<h1 class="pd-title">' + esc(L(p.name)) + '</h1>' +
        '<p class="muted small">' + t('productId') + ': <span class="mono"><b>' + esc(p.id) + '</b></span> · ' + '<span class="chip chip--' + STOCK_TONE[p.stock] + '">' + t('stock_' + p.stock) + '</span></p>' +
        pdPrice(p) + pdActions(p) +
        '<section class="panel"><h2 class="h3">' + t('productDetails') + '</h2><dl class="spec">' +
          '<div><dt>' + t('purity') + '</dt><dd>' + purityLabel(p) + '</dd></div>' +
          '<div><dt>' + t('grossWeight') + '</dt><dd>' + (p.grossWeight ? grams(p.grossWeight) : '—') + '</dd></div>' +
          '<div><dt>' + (isGold ? t('netWeight') : t('netWeightGeneric')) + '</dt><dd>' + (p.netWeight ? grams(p.netWeight) : '—') + '</dd></div>' +
          (p.stoneWeight ? '<div><dt>' + t('stoneWeight') + '</dt><dd>' + grams(p.stoneWeight) + '</dd></div>' : '') +
          '<div><dt>' + t('stockStatus') + '</dt><dd>' + t('stock_' + p.stock) + '</dd></div>' +
          '<div><dt>' + t('category') + '</dt><dd>' + esc(c ? L(c.name) : p.category) + '</dd></div></dl></section>' +
        '<section class="panel"><h2 class="h3">' + t('priceBreakdown') + '</h2>' + pdBreakdown(p) + '</section>' +
        (L(p.desc) ? '<section class="panel"><h2 class="h3">' + t('description') + '</h2><p class="muted" style="white-space:pre-line">' + esc(L(p.desc)) + '</p></section>' : '') +
        (p.isDemo ? '<div class="note note--warn">' + ic('alert') + '<span>' + t('demoProductNote') + '</span></div>' : '<div class="note note--info">' + ic('info') + '<span>' + t('liveProductNote') + '</span></div>') +
      '</div></div>';
}
/* product not in memory yet (opened by link): fetch it once */
function loadProductIfNeeded(token) {
  const id = route.arg;
  if (!id || getProduct(id) || UI.pdChecked === id) return;
  Catalog.get(id).then(p => { if (token !== renderToken) return; if (!p) UI.pdChecked = id; render(); })
    .catch(e => { if (token !== renderToken) return; const el = $('#pdLoading'); if (el) el.outerHTML = errorBlock(toApiError(e)); });
}
addStrings({
  storePriceNote: "The store's listed price. Final bill is confirmed at the store.",
  liveProductNote: 'Final weight and price are confirmed at the store. Making charges and taxes are shown only when the store has entered them.'
}, {
  storePriceNote: 'கடை குறிப்பிட்ட விலை. இறுதிக் கட்டணம் கடையில் உறுதிசெய்யப்படும்.',
  liveProductNote: 'இறுதி எடையும் விலையும் கடையில் உறுதிசெய்யப்படும். கடை உள்ளிட்டிருந்தால் மட்டுமே செய்கூலியும் வரியும் காட்டப்படும்.'
});

Object.assign(ACTIONS, {
  'gal': b => {
    const p = getProduct(route.arg); if (!p) return;
    UI.galIdx = Number(b.dataset.i) || 0;
    const main = $('#pdMain'); if (main) main.innerHTML = productImg(p, UI.galIdx);
    document.querySelectorAll('.pd-thumb').forEach(x => x.setAttribute('aria-current', String(x === b)));
  },
  'back': b => { if (navDepth > 0) history.back(); else go(b.dataset.fallback || 'home'); }
});

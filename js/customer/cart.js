'use strict';
/* =========================================================
   CUSTOMER · CART (DEMO) — add, remove, quantity, subtotal of DEMO sample
   prices only. No checkout, no payment, no confirmed orders in this phase.
   ========================================================= */
addStrings({
  cartTitle: 'Cart', cartSub: 'A demo cart on this device. Orders and checkout arrive in a later phase.',
  cartEmpty: 'Your cart is empty', cartEmptyHint: 'Add jewellery from the shop to see it here.',
  qtyLabel: 'Quantity', increaseQty: 'Increase quantity', decreaseQty: 'Decrease quantity', removeItem: 'Remove',
  removedFromCart: 'Removed from cart.', orderSummary: 'Summary', sampleSubtotal: 'Subtotal (DEMO sample prices)',
  enquiryItems: 'Items priced by the store', checkoutSoon: 'Place order — coming in a later phase',
  checkoutNote: 'Checkout, payment and order confirmation are not available in this prototype. No order is created. Use WhatsApp to ask the store about these items.',
  clearCart: 'Clear cart', clearCartTitle: 'Clear the cart?', clearCartMsg: 'All items will be removed from this device.',
  noPricedItems: 'No item in the cart has a price in this prototype.', maxQtyReached: 'Maximum quantity for this item reached.'
}, {
  cartTitle: 'கூடை', cartSub: 'இந்தச் சாதனத்தில் உள்ள டெமோ கூடை. ஆர்டர், பணம் செலுத்துதல் அடுத்த கட்டங்களில் சேர்க்கப்படும்.',
  cartEmpty: 'கூடை காலியாக உள்ளது', cartEmptyHint: 'நகைகளைக் கூடையில் சேர்த்தால் இங்கே காணலாம்.',
  qtyLabel: 'எண்ணிக்கை', increaseQty: 'எண்ணிக்கையைக் கூட்டு', decreaseQty: 'எண்ணிக்கையைக் குறை', removeItem: 'நீக்கு',
  removedFromCart: 'கூடையிலிருந்து நீக்கப்பட்டது.', orderSummary: 'சுருக்கம்', sampleSubtotal: 'கூட்டுத்தொகை (டெமோ மாதிரி விலைகள்)',
  enquiryItems: 'கடை விலை சொல்ல வேண்டிய நகைகள்', checkoutSoon: 'ஆர்டர் செய் — அடுத்த கட்டத்தில் வரும்',
  checkoutNote: 'இந்த மாதிரியில் checkout, பணம் செலுத்துதல், ஆர்டர் உறுதிப்படுத்தல் இல்லை. எந்த ஆர்டரும் உருவாகாது. இந்த நகைகள் பற்றிக் கடையிடம் கேட்க WhatsApp-ஐப் பயன்படுத்தவும்.',
  clearCart: 'கூடையை அழி', clearCartTitle: 'கூடையை அழிக்கவா?', clearCartMsg: 'அனைத்து நகைகளும் இந்தச் சாதனத்திலிருந்து நீக்கப்படும்.',
  noPricedItems: 'இந்த மாதிரியில் கூடையிலுள்ள எந்த நகைக்கும் விலை இல்லை.', maxQtyReached: 'இந்த நகைக்கான அதிகபட்ச எண்ணிக்கை எட்டப்பட்டது.'
});

function addToCart(id) {
  const p = getProduct(id); if (!p || p.stock === 'out_of_stock') return false;
  const list = getCart(), it = list.find(i => i.id === id);
  if (it) { if (it.qty >= maxQty(p)) { toast(t('maxQtyReached')); return false; } it.qty++; }
  else { if (list.length >= 20) { toast(t('cartFull')); return false; } list.push({ id, qty: 1 }); }
  setCart(list); return true;
}
/* Load the products currently in the cart. With Supabase this re-checks publication, stock and price. */
async function loadCartLines() {
  const cart = getCart();
  const prods = await Catalog.bySkus(cart.map(i => i.id));
  return cart.map(i => {
    const p = prods.find(x => x.id === i.id) || null;
    const problem = !p ? 'gone' : p.stock === 'out_of_stock' ? 'out' : (i.qty > maxQty(p) ? 'qty' : null);
    return { id: i.id, qty: i.qty, p, problem };
  });
}
function cartLineHTML(l) {
  if (!l.p) return '<article class="cart-item"><span class="art" aria-hidden="true"></span><div class="cart-info"><strong class="mono">' + esc(l.id) + '</strong><span class="chip chip--err">' + t('itemUnavailable') + '</span>' +
    '<div class="cart-row"><button type="button" class="btn btn-ghost btn-sm" data-action="cart-remove" data-id="' + esc(l.id) + '">' + ic('trash') + t('removeItem') + '</button></div></div></article>';
  const p = l.p, pi = priceInfo(p), max = maxQty(p), qty = l.qty;
  return '<article class="cart-item">' +
    '<button type="button" data-go="product/' + encodeURIComponent(p.id) + '" tabindex="-1" aria-hidden="true">' + productImg(p, 0, false) + '</button>' +
    '<div class="cart-info"><strong>' + esc(L(p.name)) + '</strong><span class="small muted"><span class="mono">' + esc(p.id) + '</span> · ' + purityLabel(p) + (p.grossWeight ? ' · ' + grams(p.grossWeight) : '') + '</span>' +
      (pi.sample ? '<span><b>' + inr(pi.sample) + '</b> <span class="small muted">' + (pi.isSample ? t('samplePriceShort') : t('storePriceShort')) + '</span></span>' : '<span class="small"><b>' + t('priceEnquiry') + '</b></span>') +
      (l.problem === 'out' ? '<span class="chip chip--err">' + t('stock_out_of_stock') + '</span>' : '') +
      (l.problem === 'qty' ? '<span class="chip chip--warn">' + t('qtyAboveLimit') + ' (' + max + ')</span>' : '') +
      '<div class="cart-row">' +
        (max > 1 || qty > 1 ? '<div class="qty" role="group" aria-label="' + t('qtyLabel') + '"><button type="button" data-action="qty" data-id="' + esc(p.id) + '" data-d="-1" aria-label="' + t('decreaseQty') + '"' + (qty <= 1 ? ' disabled' : '') + '>' + ic('minus') + '</button><output aria-live="polite">' + qty + '</output><button type="button" data-action="qty" data-id="' + esc(p.id) + '" data-d="1" aria-label="' + t('increaseQty') + '"' + (qty >= max ? ' disabled' : '') + '>' + ic('plus') + '</button></div>'
          : '<span class="small muted">' + t('qtyLabel') + ': 1</span>') +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="cart-remove" data-id="' + esc(p.id) + '">' + ic('trash') + t('removeItem') + '</button>' +
      '</div></div></article>';
}
function pageCart() {
  if (!getCart().length) return pageHead(t('cartTitle'), isLive() ? t('cartSubLive') : t('cartSub')) + emptyState('bag', t('cartEmpty'), t('cartEmptyHint'), '<button class="btn btn-primary" data-go="shop/all">' + t('browseJewellery') + '</button>');
  return pageHead(t('cartTitle'), isLive() ? t('cartSubLive') : t('cartSub'), '<button class="btn btn-ghost btn-sm" data-action="cart-clear">' + ic('trash') + t('clearCart') + '</button>') +
    '<div id="cartBox"><div class="skel-list" aria-busy="true"><div class="skel"></div><div class="skel"></div></div></div>';
}
function fillCart(token) {
  fillAsync('#cartBox', token, loadCartLines, lines => {
    const ok = lines.filter(l => l.p && !l.problem), blocked = lines.some(l => l.problem);
    const priced = ok.filter(l => priceInfo(l.p).sample != null), enquiry = ok.length - priced.length;
    const subtotal = priced.reduce((a, l) => a + priceInfo(l.p).sample * l.qty, 0);
    const anySample = priced.some(l => priceInfo(l.p).isSample);
    const checkout = isLive()
      ? '<button type="button" class="btn btn-primary btn-block" data-go="checkout"' + (blocked || !ok.length ? ' disabled' : '') + '>' + ic('receipt') + t('continueToRequest') + '</button>' +
        (blocked ? '<p class="small err">' + t('fixCartFirst') + '</p>' : '') + '<p class="small muted">' + t('requestExplainer') + '</p>'
      : '<div class="note note--warn">' + ic('alert') + '<span>' + t('checkoutNote') + '</span></div><button type="button" class="btn btn-outline btn-block" disabled>' + t('checkoutSoon') + '</button>';
    return '<div class="two-col"><div class="cart-list">' + lines.map(cartLineHTML).join('') + '</div>' +
      '<section class="panel cart-sum" aria-labelledby="sumH"><h2 class="h3" id="sumH">' + t('orderSummary') + (isLive() ? '' : ' <span class="tag-demo">DEMO</span>') + '</h2>' +
        '<dl class="kv"><dt>' + (anySample ? t('sampleSubtotal') : t('pricedSubtotal')) + '</dt><dd>' + (priced.length ? inr(subtotal) : '—') + '</dd><dt>' + t('enquiryItems') + '</dt><dd>' + enquiry + '</dd></dl>' +
        (!priced.length ? '<p class="small muted">' + t('noPricedItems') + '</p>' : '') +
        checkout + waButton('cart', '', 'btn-block') +
        '<p class="small muted">' + t('cartDeviceNote') + '</p></section></div>';
  });
}

Object.assign(ACTIONS, {
  'add-cart': b => { if (addToCart(b.dataset.id)) { toast(t('addedToCart'), 'ok'); render(); } },
  'qty': b => {
    const p = getProduct(b.dataset.id); if (!p) return;
    const list = getCart(), it = list.find(i => i.id === p.id); if (!it) return;
    it.qty = Math.max(1, Math.min(maxQty(p), it.qty + Number(b.dataset.d)));
    setCart(list); render();
  },
  'cart-remove': b => { setCart(getCart().filter(i => i.id !== b.dataset.id)); toast(t('removedFromCart')); render(); },
  'cart-clear': async () => {
    if (!(await confirmDialog({ title: t('clearCartTitle'), message: t('clearCartMsg'), confirmText: t('clearCart'), danger: true }))) return;
    setCart([]); toast(t('cleared')); render();
  }
});
addStrings({
  cartSubLive: 'Your cart is kept on this device until you send an order request.', cartFull: 'The cart can hold up to 20 different items.',
  itemUnavailable: 'No longer available', qtyAboveLimit: 'Quantity above the limit', continueToRequest: 'Continue to order request',
  fixCartFirst: 'Remove or adjust the highlighted items to continue.', pricedSubtotal: 'Subtotal of priced items',
  requestExplainer: 'An order request is not a payment. The store will contact you to confirm availability and the final price.',
  cartDeviceNote: 'The cart is stored only in this browser. It becomes an order only after the store receives your order request.'
}, {
  cartSubLive: 'ஆர்டர் கோரிக்கை அனுப்பும் வரை உங்கள் கூடை இந்தச் சாதனத்தில் வைக்கப்படும்.', cartFull: 'கூடையில் அதிகபட்சம் 20 வகை நகைகள் வைக்கலாம்.',
  itemUnavailable: 'இப்போது கிடைக்கவில்லை', qtyAboveLimit: 'எண்ணிக்கை வரம்பை மீறுகிறது', continueToRequest: 'ஆர்டர் கோரிக்கைக்குத் தொடர்',
  fixCartFirst: 'தொடர, குறிக்கப்பட்ட நகைகளை நீக்கவும் அல்லது சரிசெய்யவும்.', pricedSubtotal: 'விலை உள்ள நகைகளின் கூட்டுத்தொகை',
  requestExplainer: 'ஆர்டர் கோரிக்கை என்பது பணம் செலுத்துதல் அல்ல. இருப்பையும் இறுதி விலையையும் உறுதிசெய்ய கடை உங்களைத் தொடர்புகொள்ளும்.',
  cartDeviceNote: 'கூடை இந்த browser-ல் மட்டுமே சேமிக்கப்படுகிறது. கடை உங்கள் ஆர்டர் கோரிக்கையைப் பெற்ற பிறகே அது ஆர்டராகும்.'
});

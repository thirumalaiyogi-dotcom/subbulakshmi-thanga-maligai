'use strict';
/* =========================================================
   CUSTOMER · ORDER REQUESTS (Supabase mode)
   checkout → create_order_request() → my orders → order detail / cancel.
   The browser sends only product IDs and quantities. The database checks
   availability, computes prices and totals, and ignores repeated submissions
   (idempotency key). Nothing is charged; payment_status is always "unpaid".
   ========================================================= */

function needLogin(titleKey) {
  return emptyState('user', t(titleKey), t('wishLoginMsg'), '<button class="btn btn-primary" data-go="account">' + t('loginOrRegister') + '</button>');
}

/* One idempotency key per cart content: retries and double taps reuse it, a changed cart gets a new one. */
function checkoutKey() {
  const sig = JSON.stringify(getCart());
  const saved = sstore.get('checkoutKey', null);
  if (saved && saved.sig === sig) return saved.key;
  const key = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
  sstore.set('checkoutKey', { sig, key });
  return key;
}

function pageCheckout() {
  if (!isLive()) return pageHead(t('checkoutTitle')) + '<div class="note note--warn">' + ic('alert') + '<span>' + t('orderDemoOnly') + '</span></div>';
  if (!Auth.user) return pageHead(t('checkoutTitle'), t('checkoutSub')) + needLogin('wishLoginTitle');
  if (!getCart().length) { setTimeout(() => go('cart'), 0); return ''; }
  return pageHead(t('checkoutTitle'), t('checkoutSub')) + '<div id="checkoutBox"><div class="skel-list" aria-busy="true"><div class="skel"></div><div class="skel"></div></div></div>';
}
function fillCheckout(token) {
  fillAsync('#checkoutBox', token, loadCartLines, lines => {
    if (lines.some(l => l.problem) || !lines.length) { setTimeout(() => { toast(t('fixCartFirst'), 'err'); go('cart'); }, 0); return ''; }
    const prof = Auth.profile || {};
    const priced = lines.filter(l => priceInfo(l.p).sample != null);
    const total = priced.reduce((a, l) => a + priceInfo(l.p).sample * l.qty, 0);
    return '<div class="two-col">' +
      '<form class="panel" data-form="order-request" novalidate aria-labelledby="crH"><h2 class="h3" id="crH">' + t('contactDetails') + '</h2>' +
        field({ id: 'orName', label: t('contactName'), value: prof.full_name || '', attrs: 'autocomplete="name" maxlength="80"' }) +
        field({ id: 'orPhone', label: t('contactPhone'), type: 'tel', value: prof.phone || '', hint: t('phoneHint10'), attrs: 'inputmode="numeric" autocomplete="tel-national" maxlength="14"' }) +
        '<div class="field"><label for="orNote">' + t('orderNote') + '</label><textarea id="orNote" name="orNote" maxlength="500" aria-describedby="orNote-hint orNote-err"></textarea><p class="hint" id="orNote-hint">' + t('orderNoteHint') + '</p><p class="err" id="orNote-err" role="alert"></p></div>' +
        '<div class="kv-row mt"><span>' + t('fulfilmentLabel') + '</span><b>' + t('storePickup') + '</b></div>' +
        '<div class="note note--info mt">' + ic('info') + '<span>' + t('requestExplainer') + '</span></div>' +
        '<p class="err" id="orFormErr" role="alert"></p>' +
        '<button class="btn btn-primary btn-block mt" type="submit">' + ic('receipt') + t('sendRequest') + '</button></form>' +
      '<section class="panel" aria-labelledby="ciH"><h2 class="h3" id="ciH">' + t('itemsLabel') + ' (' + lines.length + ')</h2><ul class="list-rows">' +
        lines.map(l => { const pi = priceInfo(l.p); return '<li><span style="flex:1;min-width:0"><b>' + esc(L(l.p.name)) + '</b><br><span class="small muted mono">' + esc(l.p.id) + '</span> · ' + t('qtyShort') + ' ' + l.qty + '</span><span>' + (pi.sample ? inr(pi.sample * l.qty) : '<span class="small">' + t('priceEnquiry') + '</span>') + '</span></li>'; }).join('') + '</ul>' +
        '<dl class="kv"><dt>' + t('estTotal') + '</dt><dd>' + (priced.length ? inr(total) : '—') + '</dd><dt>' + t('paymentLabel') + '</dt><dd>' + t('payNotPaid') + '</dd></dl>' +
        '<p class="small muted">' + t('estNote') + '</p></section></div>';
  });
}

function pageOrders() {
  if (!isLive()) return pageHead(t('ordersTitle')) + '<div class="note note--warn">' + ic('alert') + '<span>' + t('orderDemoOnly') + '</span></div>';
  if (!Auth.user) return pageHead(t('ordersTitle'), t('ordersSub')) + needLogin('loginForOrders');
  return pageHead(t('ordersTitle'), t('ordersSub')) + '<div id="ordersBox"><div class="skel-list" aria-busy="true"><div class="skel"></div><div class="skel"></div></div></div>';
}
function fillOrders(token) {
  fillAsync('#ordersBox', token, () => Orders.mine(), rows => {
    if (!rows.length) return emptyState('receipt', t('noOrders'), t('noOrdersHint'), '<button class="btn btn-primary" data-go="shop/all">' + t('browseJewellery') + '</button>');
    return '<ul class="tx-list">' + rows.map(o => '<li class="tx"><div class="tx-ic tx-ic--pending">' + ic('receipt') + '</div><div class="tx-main"><strong class="mono">' + esc(o.order_number) + '</strong><small>' + fmtStamp(o.created_at) + ' · ' + o.items_count + ' ' + t('itemsCount') + '</small></div>' +
      '<div class="tx-end">' + (Number(o.priced_total) > 0 ? '<b>' + inr(o.priced_total) + (o.has_unpriced_items ? '+' : '') + '</b>' : '') + orderChip(o.status) + '<button class="link-btn" data-go="order/' + o.id + '">' + t('viewOrder') + ic('right') + '</button></div></li>').join('') + '</ul>';
  });
}

function pageOrder(id) {
  if (!isLive()) return pageOrders();
  if (!Auth.user) return pageHead(t('orderTitle')) + needLogin('loginForOrders');
  return '<button class="back" data-go="orders">' + ic('left') + t('myOrdersLink') + '</button><div id="orderBox"><div class="skel-list" aria-busy="true"><div class="skel"></div><div class="skel"></div></div></div>';
}
function fillOrder(token) {
  fillAsync('#orderBox', token, () => Orders.get(route.arg), o => {
    if (!o) return emptyState('receipt', t('err_order_not_found'), t('noOrdersHint'));
    return '<div class="flow">' + (UI.justOrdered === o.id ? '<div class="result result--info">' + ic('checkCircle') + '<div><h3>' + t('requestSentTitle') + '</h3><p>' + t('requestSent') + ' ' + t('requestExplainer') + '</p></div></div>' : '') +
      orderDetailHTML(o) +
      (o.status === 'requested' ? '<button class="btn btn-outline" data-action="order-cancel" data-id="' + o.id + '">' + ic('x') + t('cancelOrder') + '</button>' : '') + '</div>';
  });
}

FORMS['order-request'] = async f => {
  const name = f.elements.orName.value.trim(), phone = f.elements.orPhone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''), note = f.elements.orNote.value.trim();
  let ok = true;
  ok = setErr(f, 'orName', (name.length < 2 || name.length > 80) ? t('err_invalid_contact_name') : '') && ok;
  ok = setErr(f, 'orPhone', /^[6-9]\d{9}$/.test(phone) ? '' : t('err_invalid_contact_phone')) && ok;
  ok = setErr(f, 'orNote', note.length > 500 ? t('err_note_too_long') : '') && ok;
  if (!ok) { focusFirstInvalid(f); return; }
  if (!(await confirmDialog({ title: t('requestConfirmTitle'), message: t('requestConfirmMsg'), confirmText: t('sendRequest') }))) return;
  const btn = f.querySelector('button[type="submit"]'); const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + t('processing') + '</span>';
  const errBox = $('#orFormErr'); if (errBox) errBox.textContent = '';
  try {
    const lines = await loadCartLines();
    if (lines.some(l => l.problem)) throw new ApiError('product_unavailable');
    const res = await Orders.create({ items: lines.map(l => ({ uuid: l.p.uuid, qty: l.qty })), key: checkoutKey(), name, phone, note });
    setCart([]); sstore.del('checkoutKey');
    UI.justOrdered = res.order_id;
    toast(res.is_duplicate ? t('requestAlready') : t('requestSent'), 'ok');
    go('order/' + res.order_id);
  } catch (e) {
    const err = toApiError(e);
    if (errBox) errBox.textContent = errorText(err);
    btn.disabled = false; btn.innerHTML = label;
    if (['product_unavailable', 'product_out_of_stock', 'insufficient_stock', 'quantity_exceeds_limit'].includes(err.code)) toast(errorText(err), 'err');
  }
};
ACTIONS['order-cancel'] = async b => {
  if (!(await confirmDialog({ title: t('cancelConfirmTitle'), message: t('cancelConfirmMsg'), confirmText: t('cancelOrder'), danger: true }))) return;
  b.disabled = true;
  try { await Orders.cancel(b.dataset.id); toast(t('cancelledToast')); render(); }
  catch (e) { b.disabled = false; toast(errorText(toApiError(e)), 'err'); }
};

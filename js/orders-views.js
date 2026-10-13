'use strict';
/* =========================================================
   ORDER VIEWS shared by the customer and admin apps: labels,
   status chips and the order detail (items snapshot + history)
   ========================================================= */
addStrings({
  checkoutTitle: 'Order request', checkoutSub: 'Send this request to the store. Nothing is charged now.',
  ordersTitle: 'My orders', ordersSub: 'Order requests you have sent to the store.', orderTitle: 'Order',
  contactName: 'Your name', contactPhone: 'Mobile number', orderNote: 'Note for the store (optional)', orderNoteHint: 'For example: size, preferred visit time.',
  fulfilmentLabel: 'Collection', storePickup: 'Pick up at the store', sendRequest: 'Send order request',
  requestConfirmTitle: 'Send this order request?', requestConfirmMsg: 'The store will check availability and contact you to confirm the final price. This is not a payment.',
  requestSent: 'Order request sent. The store will contact you.', requestSentTitle: 'Order request received',
  requestAlready: 'This request was already sent — showing the existing order.', estTotal: 'Total of priced items',
  estNote: 'The store confirms the final amount. Items without a price are priced by the store.', orderNumber: 'Order number', orderedOn: 'Requested on',
  payNotPaid: 'Not paid — payment is made at the store', paymentLabel: 'Payment', itemsLabel: 'Items', historyLabel: 'Status history',
  cancelOrder: 'Cancel this request', cancelConfirmTitle: 'Cancel this order request?', cancelConfirmMsg: 'The store will see that you cancelled it. This cannot be undone.',
  cancelledToast: 'Order request cancelled.', noOrders: 'No orders yet', noOrdersHint: 'When you send an order request from your cart, it will appear here.',
  loginForOrders: 'Log in to see your orders', orderDemoOnly: 'Order requests need the store database. This copy of the app is running in DEMO mode, so ordering is turned off.',
  qtyShort: 'Qty', lineTotal: 'Line total', viewOrder: 'View', myOrdersLink: 'My orders',
  os_requested: 'Requested', os_confirmed: 'Confirmed by store', os_ready: 'Ready for pickup', os_completed: 'Completed', os_cancelled: 'Cancelled', os_rejected: 'Not accepted'
}, {
  checkoutTitle: 'ஆர்டர் கோரிக்கை', checkoutSub: 'இந்தக் கோரிக்கையைக் கடைக்கு அனுப்புங்கள். இப்போது எந்தக் கட்டணமும் இல்லை.',
  ordersTitle: 'என் ஆர்டர்கள்', ordersSub: 'நீங்கள் கடைக்கு அனுப்பிய ஆர்டர் கோரிக்கைகள்.', orderTitle: 'ஆர்டர்',
  contactName: 'உங்கள் பெயர்', contactPhone: 'கைபேசி எண்', orderNote: 'கடைக்கான குறிப்பு (விரும்பினால்)', orderNoteHint: 'உதா: அளவு, கடைக்கு வர விரும்பும் நேரம்.',
  fulfilmentLabel: 'பெறும் முறை', storePickup: 'கடையில் பெற்றுக்கொள்ளுதல்', sendRequest: 'ஆர்டர் கோரிக்கையை அனுப்பு',
  requestConfirmTitle: 'இந்த ஆர்டர் கோரிக்கையை அனுப்பவா?', requestConfirmMsg: 'கடை இருப்பைச் சரிபார்த்து, இறுதி விலையை உறுதிசெய்ய உங்களைத் தொடர்புகொள்ளும். இது பணம் செலுத்துதல் அல்ல.',
  requestSent: 'ஆர்டர் கோரிக்கை அனுப்பப்பட்டது. கடை உங்களைத் தொடர்புகொள்ளும்.', requestSentTitle: 'ஆர்டர் கோரிக்கை பெறப்பட்டது',
  requestAlready: 'இந்தக் கோரிக்கை ஏற்கெனவே அனுப்பப்பட்டது — அதே ஆர்டர் காட்டப்படுகிறது.', estTotal: 'விலை உள்ள நகைகளின் மொத்தம்',
  estNote: 'இறுதித் தொகையைக் கடை உறுதிசெய்யும். விலை இல்லாத நகைகளுக்குக் கடை விலை சொல்லும்.', orderNumber: 'ஆர்டர் எண்', orderedOn: 'கோரிய நாள்',
  payNotPaid: 'பணம் செலுத்தப்படவில்லை — கடையில் செலுத்தலாம்', paymentLabel: 'கட்டணம்', itemsLabel: 'நகைகள்', historyLabel: 'நிலை வரலாறு',
  cancelOrder: 'இந்தக் கோரிக்கையை ரத்து செய்', cancelConfirmTitle: 'இந்த ஆர்டர் கோரிக்கையை ரத்து செய்யவா?', cancelConfirmMsg: 'நீங்கள் ரத்து செய்ததைக் கடை பார்க்கும். இதைத் திரும்பப் பெற இயலாது.',
  cancelledToast: 'ஆர்டர் கோரிக்கை ரத்து செய்யப்பட்டது.', noOrders: 'இன்னும் ஆர்டர்கள் இல்லை', noOrdersHint: 'கூடையிலிருந்து ஆர்டர் கோரிக்கை அனுப்பினால் இங்கே தோன்றும்.',
  loginForOrders: 'உங்கள் ஆர்டர்களைக் காண உள்நுழையவும்', orderDemoOnly: 'ஆர்டர் கோரிக்கைகளுக்குக் கடையின் database தேவை. இந்தச் செயலி டெமோ நிலையில் இயங்குவதால் ஆர்டர் வசதி நிறுத்தப்பட்டுள்ளது.',
  qtyShort: 'எண்.', lineTotal: 'தொகை', viewOrder: 'பார்', myOrdersLink: 'என் ஆர்டர்கள்',
  os_requested: 'கோரிக்கை அனுப்பப்பட்டது', os_confirmed: 'கடை உறுதிசெய்தது', os_ready: 'பெற்றுக்கொள்ளத் தயார்', os_completed: 'முடிந்தது', os_cancelled: 'ரத்து செய்யப்பட்டது', os_rejected: 'ஏற்கப்படவில்லை'
});

const ORDER_TONE = { requested: 'warn', confirmed: 'info', ready: 'ok', completed: 'ok', cancelled: 'neutral', rejected: 'err' };
function orderChip(st) { return '<span class="chip chip--' + (ORDER_TONE[st] || 'neutral') + '">' + t('os_' + st) + '</span>'; }
function fmtStamp(ts) { return ts ? fmtDate(String(ts).slice(0, 10)) : '—'; }
function orderDetailHTML(o, opts) {
  const items = (o.order_items || []).slice().sort((a, b) => a.product_sku.localeCompare(b.product_sku));
  const events = (o.order_events || []).slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id - b.id);
  return '<section class="pb-cover"><div><p class="eyebrow">' + t('orderNumber') + '</p><h1 class="mono">' + esc(o.order_number) + '</h1>' +
      '<dl class="pb-meta"><div><dt>' + t('status') + '</dt><dd>' + orderChip(o.status) + '</dd></div><div><dt>' + t('orderedOn') + '</dt><dd>' + fmtStamp(o.created_at) + '</dd></div>' +
      '<div><dt>' + t('fulfilmentLabel') + '</dt><dd>' + t('storePickup') + '</dd></div><div><dt>' + t('paymentLabel') + '</dt><dd>' + t('payNotPaid') + '</dd></div>' +
      (opts && opts.admin ? '<div><dt>' + t('customer') + '</dt><dd>' + esc(o.contact_name) + '</dd></div><div><dt>' + t('phone') + '</dt><dd class="mono">' + esc(o.contact_phone) + '</dd></div>' : '') +
      '</dl></div></section>' +
    '<section><h2 class="h2 section-head">' + t('itemsLabel') + '</h2><div class="table-wrap"><table class="table"><thead><tr><th>' + t('productId') + '</th><th>' + t('productDetailsShort') + '</th><th>' + t('purity') + '</th><th class="r">' + t('qtyShort') + '</th><th class="r">' + t('priceCol') + '</th><th class="r">' + t('lineTotal') + '</th></tr></thead><tbody>' +
      items.map(i => '<tr><td data-label="' + t('productId') + '"><span class="mono small">' + esc(i.product_sku) + '</span></td><td data-label="' + t('productDetailsShort') + '">' + esc(lang === 'ta' ? i.name_ta : i.name_en) + '</td><td data-label="' + t('purity') + '">' + esc(i.purity) + '</td>' +
        '<td data-label="' + t('qtyShort') + '" class="r num">' + i.quantity + '</td><td data-label="' + t('priceCol') + '" class="r">' + (i.unit_price != null ? inr(i.unit_price) : t('priceEnquiry')) + '</td><td data-label="' + t('lineTotal') + '" class="r num">' + (i.line_total != null ? inr(i.line_total) : '—') + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '<dl class="kv mt"><dt>' + t('estTotal') + '</dt><dd>' + (Number(o.priced_total) > 0 ? inr(o.priced_total) : '—') + '</dd></dl>' + (o.has_unpriced_items ? '<p class="small muted">' + t('estNote') + '</p>' : '') + '</section>' +
    (o.customer_note ? '<section class="panel"><h2 class="h3">' + t('orderNote') + '</h2><p style="white-space:pre-line">' + esc(o.customer_note) + '</p></section>' : '') +
    '<section class="panel"><h2 class="h3">' + t('historyLabel') + '</h2><ul class="list-rows">' +
      events.map(e => '<li>' + ic('clock') + '<span style="flex:1">' + orderChip(e.to_status) + ' <span class="small muted">' + fmtStamp(e.created_at) + (opts && opts.admin ? ' · ' + esc(e.actor_role) : '') + '</span>' + (e.note ? '<br><span class="small">' + esc(e.note) + '</span>' : '') + '</span></li>').join('') + '</ul></section>';
}
addStrings({ contactDetails: 'Contact details', phoneHint10: '10-digit mobile number', priceCol: 'Price', productDetailsShort: 'Item' },
           { contactDetails: 'தொடர்பு விவரங்கள்', phoneHint10: '10 இலக்கக் கைபேசி எண்', priceCol: 'விலை', productDetailsShort: 'நகை' });

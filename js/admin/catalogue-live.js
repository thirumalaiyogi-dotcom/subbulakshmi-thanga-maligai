'use strict';
/* =========================================================
   ADMIN · LIVE STORE MANAGEMENT (Supabase mode)
   Login + role check, products (create/edit/publish/stock/images),
   categories, order requests (list, detail, status, internal note).
   The buttons here are conveniences only: every write is checked again by
   the database (RLS policies and functions) using the logged-in user's role.
   ========================================================= */
addStrings({
  adminLoginTitle: 'Store admin login', adminLoginSub: 'Log in with an account that the store owner has given the admin or staff role.',
  deniedTitle: 'No admin access', deniedMsg: 'This account does not have the admin or staff role. The store owner can grant it from the Supabase dashboard.',
  adminOnly: 'Only admins can manage the catalogue. Your account has the staff role.', signedInAs: 'Signed in as',
  storeKpis: 'Store', publishedProducts: 'Published products', draftProducts: 'Draft products', requestedOrders: 'New order requests', openOrders: 'Confirmed / ready orders',
  savingsDemoHeading: 'Gold savings — DEMO data (not connected to the database yet)', demoBadge: 'DEMO',
  addProduct: 'Add product', editProduct: 'Edit product', newProduct: 'New product', saveProduct: 'Save product', productSaved: 'Product saved.',
  publish: 'Publish', unpublish: 'Unpublish', publishedLabel: 'Published', draftLabel: 'Draft', allStatuses: 'All',
  publishedToast: 'Product published.', unpublishedToast: 'Product hidden from customers.',
  f_sku: 'Product ID (SKU)', f_skuHint: 'Capital letters, digits and hyphens, e.g. STM-R1024. Cannot be changed later without care — it appears on orders.',
  f_category: 'Category', f_nameEn: 'Name (English)', f_nameTa: 'Name (Tamil)', f_descEn: 'Description (English)', f_descTa: 'Description (Tamil)',
  f_purity: 'Purity', f_gross: 'Gross weight (g)', f_net: 'Net weight (g)', f_stone: 'Stone weight (g)', f_weightHint: 'Up to 3 decimals. Leave empty if not applicable.',
  f_making: 'Making charge (₹)', f_stoneCharge: 'Stone charge (₹)', f_chargeHint: 'Optional. Shown to customers only when entered.',
  f_priceMode: 'Price shown to customers', pm_enquiry: 'Contact store for price', pm_fixed: 'Fixed price', f_fixedPrice: 'Fixed price (₹)',
  f_stockStatus: 'Availability', f_stockQty: 'Stock quantity', f_maxQty: 'Maximum per order (1–10)', f_tags: 'Show in collections', f_published: 'Published (visible to customers)',
  imagesTitle: 'Photos', imagesSaveFirst: 'Save the product first, then add photos.', uploadPhoto: 'Add photo', uploadHint: 'JPG, PNG or WebP, up to 5 MB.',
  uploading: 'Uploading…', photoUploaded: 'Photo added.', deletePhoto: 'Delete photo', deletePhotoTitle: 'Delete this photo?', deletePhotoMsg: 'The photo will be removed from the product and from storage.', photoDeleted: 'Photo deleted.',
  e_sku: 'Use 3–30 capital letters, digits or hyphens.', e_required: 'Required.', e_name: '2–120 characters.', e_weight: 'Enter a positive number with up to 3 decimals.',
  e_netGross: 'Net weight cannot be more than gross weight.', e_money: 'Enter a positive amount with up to 2 decimals.', e_int: 'Enter a whole number in range.', e_fixed: 'A fixed price is required for this price mode.',
  addCategory: 'Add category', editCategory: 'Edit category', saveCategory: 'Save category', categorySaved: 'Category saved.',
  f_catId: 'Category code', f_catIdHint: 'Lowercase letters, digits, hyphens (e.g. anklets). Used in links; cannot be changed here later.', f_sortOrder: 'Display order', f_visible: 'Visible to customers',
  e_catId: 'Use 2–40 lowercase letters, digits or hyphens.', e_name60: '2–60 characters.',
  ordersFilterAll: 'All', orderSearch: 'Search order number, name or phone', updateOrderStatus: 'Update status', newStatus: 'New status', statusNote: 'Note (shown in history)',
  statusUpdatedToast: 'Order status updated.', finalStatus: 'This order is closed. No further status changes.', internalNote: 'Internal note (staff only)', saveNote: 'Save note', noteSaved: 'Note saved.',
  noOrdersAdmin: 'No order requests', noOrdersAdminHint: 'Order requests from customers will appear here.', backToOrders: 'Back to orders', backToProducts: 'Back to products',
  statusConfirmTitle: 'Change order status?', notPaidAdmin: 'Payment is not collected online. Record payment at the counter as usual.'
}, {
  adminLoginTitle: 'கடை நிர்வாக உள்நுழைவு', adminLoginSub: 'கடை உரிமையாளர் admin அல்லது staff பங்கு வழங்கிய கணக்கில் உள்நுழையவும்.',
  deniedTitle: 'நிர்வாக அனுமதி இல்லை', deniedMsg: 'இந்தக் கணக்குக்கு admin அல்லது staff பங்கு இல்லை. கடை உரிமையாளர் Supabase dashboard-ல் வழங்கலாம்.',
  adminOnly: 'நகைப் பட்டியலை admin மட்டுமே நிர்வகிக்க முடியும். உங்கள் கணக்கு staff பங்கு கொண்டது.', signedInAs: 'உள்நுழைந்தவர்',
  storeKpis: 'கடை', publishedProducts: 'வெளியிட்ட நகைகள்', draftProducts: 'வரைவு நகைகள்', requestedOrders: 'புதிய ஆர்டர் கோரிக்கைகள்', openOrders: 'உறுதிசெய்த / தயாரான ஆர்டர்கள்',
  savingsDemoHeading: 'தங்கச் சேமிப்பு — டெமோ தரவு (இன்னும் database உடன் இணைக்கப்படவில்லை)', demoBadge: 'டெமோ',
  addProduct: 'நகை சேர்', editProduct: 'நகையைத் திருத்து', newProduct: 'புதிய நகை', saveProduct: 'நகையைச் சேமி', productSaved: 'நகை சேமிக்கப்பட்டது.',
  publish: 'வெளியிடு', unpublish: 'மறை', publishedLabel: 'வெளியிடப்பட்டது', draftLabel: 'வரைவு', allStatuses: 'அனைத்தும்',
  publishedToast: 'நகை வெளியிடப்பட்டது.', unpublishedToast: 'நகை வாடிக்கையாளர்களிடமிருந்து மறைக்கப்பட்டது.',
  f_sku: 'பொருள் எண் (SKU)', f_skuHint: 'ஆங்கிலப் பெரிய எழுத்துகள், எண்கள், கோடுகள் — உதா. STM-R1024. ஆர்டர்களில் தோன்றும்; பின்னர் கவனமாக மட்டுமே மாற்றவும்.',
  f_category: 'வகை', f_nameEn: 'பெயர் (ஆங்கிலம்)', f_nameTa: 'பெயர் (தமிழ்)', f_descEn: 'விவரம் (ஆங்கிலம்)', f_descTa: 'விவரம் (தமிழ்)',
  f_purity: 'தூய்மை', f_gross: 'மொத்த எடை (கி)', f_net: 'நிகர எடை (கி)', f_stone: 'கல் எடை (கி)', f_weightHint: '3 தசம இடங்கள் வரை. பொருந்தாவிட்டால் காலியாக விடவும்.',
  f_making: 'செய்கூலி (₹)', f_stoneCharge: 'கல் கட்டணம் (₹)', f_chargeHint: 'விரும்பினால். உள்ளிட்டால் மட்டுமே வாடிக்கையாளர்களுக்குக் காட்டப்படும்.',
  f_priceMode: 'வாடிக்கையாளருக்குக் காட்டும் விலை', pm_enquiry: 'விலைக்குக் கடையைத் தொடர்புகொள்ளவும்', pm_fixed: 'நிலையான விலை', f_fixedPrice: 'நிலையான விலை (₹)',
  f_stockStatus: 'கிடைப்பு நிலை', f_stockQty: 'இருப்பு எண்ணிக்கை', f_maxQty: 'ஒரு ஆர்டருக்கு அதிகபட்சம் (1–10)', f_tags: 'தொகுப்புகளில் காட்டு', f_published: 'வெளியிடு (வாடிக்கையாளர்களுக்குத் தெரியும்)',
  imagesTitle: 'படங்கள்', imagesSaveFirst: 'முதலில் நகையைச் சேமித்து, பிறகு படங்களைச் சேர்க்கவும்.', uploadPhoto: 'படம் சேர்', uploadHint: 'JPG, PNG அல்லது WebP, 5 MB வரை.',
  uploading: 'பதிவேற்றுகிறது…', photoUploaded: 'படம் சேர்க்கப்பட்டது.', deletePhoto: 'படத்தை நீக்கு', deletePhotoTitle: 'இந்தப் படத்தை நீக்கவா?', deletePhotoMsg: 'படம் நகையிலிருந்தும் சேமிப்பகத்திலிருந்தும் நீக்கப்படும்.', photoDeleted: 'படம் நீக்கப்பட்டது.',
  e_sku: '3–30 ஆங்கிலப் பெரிய எழுத்துகள், எண்கள் அல்லது கோடுகள் பயன்படுத்தவும்.', e_required: 'தேவை.', e_name: '2–120 எழுத்துகள்.', e_weight: '3 தசம இடங்கள் வரை நேர்மறை எண்ணை உள்ளிடவும்.',
  e_netGross: 'நிகர எடை மொத்த எடையை விட அதிகமாக இருக்கக் கூடாது.', e_money: '2 தசம இடங்கள் வரை நேர்மறைத் தொகையை உள்ளிடவும்.', e_int: 'வரம்புக்குள் முழு எண்ணை உள்ளிடவும்.', e_fixed: 'இந்த விலை முறைக்கு நிலையான விலை தேவை.',
  addCategory: 'வகை சேர்', editCategory: 'வகையைத் திருத்து', saveCategory: 'வகையைச் சேமி', categorySaved: 'வகை சேமிக்கப்பட்டது.',
  f_catId: 'வகைக் குறியீடு', f_catIdHint: 'ஆங்கிலச் சிறிய எழுத்துகள், எண்கள், கோடுகள் (உதா. anklets). இணைப்புகளில் பயன்படும்; பின்னர் இங்கே மாற்ற இயலாது.', f_sortOrder: 'காட்சி வரிசை', f_visible: 'வாடிக்கையாளர்களுக்குத் தெரியும்',
  e_catId: '2–40 ஆங்கிலச் சிறிய எழுத்துகள், எண்கள் அல்லது கோடுகள் பயன்படுத்தவும்.', e_name60: '2–60 எழுத்துகள்.',
  ordersFilterAll: 'அனைத்தும்', orderSearch: 'ஆர்டர் எண், பெயர் அல்லது தொலைபேசி மூலம் தேடுக', updateOrderStatus: 'நிலையைப் புதுப்பி', newStatus: 'புதிய நிலை', statusNote: 'குறிப்பு (வரலாற்றில் காட்டப்படும்)',
  statusUpdatedToast: 'ஆர்டர் நிலை புதுப்பிக்கப்பட்டது.', finalStatus: 'இந்த ஆர்டர் முடிந்துவிட்டது. மேலும் நிலை மாற்றம் இல்லை.', internalNote: 'உள் குறிப்பு (ஊழியர்களுக்கு மட்டும்)', saveNote: 'குறிப்பைச் சேமி', noteSaved: 'குறிப்பு சேமிக்கப்பட்டது.',
  noOrdersAdmin: 'ஆர்டர் கோரிக்கைகள் இல்லை', noOrdersAdminHint: 'வாடிக்கையாளர்களின் ஆர்டர் கோரிக்கைகள் இங்கே தோன்றும்.', backToOrders: 'ஆர்டர்களுக்குத் திரும்பு', backToProducts: 'நகைகளுக்குத் திரும்பு',
  statusConfirmTitle: 'ஆர்டர் நிலையை மாற்றவா?', notPaidAdmin: 'ஆன்லைனில் பணம் வசூலிக்கப்படுவதில்லை. வழக்கம்போல் கவுண்டரில் பணத்தைப் பதிவுசெய்யவும்.'
});

const NEXT_STATUS = { requested: ['confirmed', 'rejected', 'cancelled'], confirmed: ['ready', 'cancelled'], ready: ['completed', 'cancelled'] };
const PURITIES = ['22K', '24K', '18K', '14K', '999', '925', 'other'];
const pending = el => { el.innerHTML = '<div class="skel-list" aria-busy="true"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>'; };

/* ---------- login / access ---------- */
function adminLogin() {
  return '<div class="shell"><main class="main" style="max-width:520px;margin:0 auto;padding-top:40px"><section class="panel">' +
    '<div class="sb-brand" style="padding:0;border:0;color:var(--gold)">' + emblem('emb') + '</div>' +
    '<h1 class="h1">' + t('adminLoginTitle') + '</h1><p class="muted">' + t('adminLoginSub') + '</p>' +
    '<form data-form="admin-login" novalidate>' +
      field({ id: 'alEmail', label: t('emailLabel'), type: 'email', attrs: 'autocomplete="username" maxlength="254"' }) +
      field({ id: 'alPass', label: t('passwordLabel'), type: 'password', attrs: 'autocomplete="current-password" maxlength="72"' }) +
      '<p class="err" id="authErr" role="alert"></p><button class="btn btn-primary btn-block mt" type="submit">' + ic('shield') + t('loginBtn') + '</button></form>' +
    '<div class="profile-actions"><a class="btn btn-ghost" href="index.html">' + t('backToStoreApp') + '</a></div>' + langToggle('wide') + '</section></main></div>';
}
function adminDenied() {
  return '<div class="shell"><main class="main" style="max-width:520px;margin:0 auto;padding-top:40px"><section class="panel">' +
    '<h1 class="h1">' + t('deniedTitle') + '</h1><div class="note note--warn">' + ic('alert') + '<span>' + t('deniedMsg') + '</span></div>' +
    '<p class="small muted">' + t('signedInAs') + ' <span class="mono">' + esc(Auth.user ? Auth.user.email : '') + '</span></p>' +
    '<div class="profile-actions"><button class="btn btn-outline" data-action="admin-logout">' + ic('logout') + t('logoutBtn') + '</button><a class="btn btn-ghost" href="index.html">' + t('backToStoreApp') + '</a></div></section></main></div>';
}
const adminOnlyNote = () => '<div class="note note--warn">' + ic('shield') + '<span>' + t('adminOnly') + '</span></div>';

/* ---------- overview (live store KPIs + demo savings) ---------- */
function aOverviewLive() {
  return aHead('overview') +
    '<section aria-labelledby="skH"><h2 class="h2 section-head" id="skH">' + t('storeKpis') + '</h2><div class="kpi-grid" id="storeKpis"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></section>' +
    '<h2 class="h2">' + t('savingsDemoHeading') + '</h2>' + aOverview().replace(aHead('overview'), '');
}
function fillOverviewLive(token) {
  fillAsync('#storeKpis', token, () => AdminApi.storeCounts(), c =>
    '<button class="kpi" data-go="orders" style="text-align:left"><span>' + t('requestedOrders') + '</span><b>' + c.requested + '</b></button>' +
    '<button class="kpi" data-go="orders" style="text-align:left"><span>' + t('openOrders') + '</span><b>' + c.open + '</b></button>' +
    '<button class="kpi" data-go="products" style="text-align:left"><span>' + t('publishedProducts') + '</span><b>' + c.published + '</b><small>' + t('draftProducts') + ': ' + c.drafts + '</small></button>');
}

/* ---------- products ---------- */
UI.apQ = ''; UI.apCat = 'all'; UI.apPub = 'all'; UI.apLimit = 25;
function aProductsLive() {
  if (!Auth.isAdmin) return aHead('products') + adminOnlyNote();
  const opt = (v, l, cur) => '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(l) + '</option>';
  return aHead('products', '<button class="btn btn-primary" data-go="product-edit/new">' + ic('plus') + t('addProduct') + '</button>') +
    '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchProducts') + '" aria-label="' + t('searchProducts') + '" value="' + esc(UI.apQ) + '" data-filter="ap" maxlength="40"></div>' +
      '<select class="select" aria-label="' + t('category') + '" data-change="ap-cat">' + opt('all', t('allCategories'), UI.apCat) + Catalog.cats.map(c => opt(c.id, L(c.name), UI.apCat)).join('') + '</select>' +
      '<select class="select" aria-label="' + t('status') + '" data-change="ap-pub">' + opt('all', t('allStatuses'), UI.apPub) + opt('pub', t('publishedLabel'), UI.apPub) + opt('draft', t('draftLabel'), UI.apPub) + '</select></div>' +
    '<div id="apList"></div>';
}
function renderAdminProducts() {
  const el = $('#apList'); if (!el) return; if (!el.innerHTML) pending(el);
  fillAsync('#apList', renderToken, async () => {
    const r = await Catalog.list({ category: UI.apCat, q: UI.apQ, includeDrafts: true, limit: UI.apLimit, sort: 'newest' });
    if (UI.apPub !== 'all') r.rows = r.rows.filter(p => p.isPublished === (UI.apPub === 'pub'));
    return r;
  }, ({ rows, count }) => {
    if (!rows.length) return emptyState('shop', t('noResults'), t('noResultsHint'), '<button class="btn btn-primary" data-go="product-edit/new">' + t('addProduct') + '</button>');
    return '<p class="result-count">' + count + ' ' + t('results') + '</p><div class="table-wrap mt"><table class="table"><thead><tr><th>' + t('productDetailsShort') + '</th><th>SKU</th><th>' + t('category') + '</th><th>' + t('stockStatus') + '</th><th>' + t('priceCol') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
      rows.map(p => '<tr><td data-label="' + t('productDetailsShort') + '"><span class="thumb-cell">' + productImg(p, 0, false) + '<b>' + esc(L(p.name)) + '</b></span></td>' +
        '<td data-label="SKU"><span class="mono small">' + esc(p.id) + '</span></td><td data-label="' + t('category') + '">' + esc((getCat(p.category) && L(getCat(p.category).name)) || p.category) + '</td>' +
        '<td data-label="' + t('stockStatus') + '">' + t('stock_' + p.stock) + (p.stock === 'in_stock' ? ' · ' + p.stockQty : '') + '</td>' +
        '<td data-label="' + t('priceCol') + '">' + (p.price.mode === 'fixed' ? inr(p.price.amount) : t('priceEnquiry')) + '</td>' +
        '<td data-label="' + t('status') + '">' + (p.isPublished ? '<span class="chip chip--ok">' + t('publishedLabel') + '</span>' : '<span class="chip chip--neutral">' + t('draftLabel') + '</span>') + '</td>' +
        '<td data-label=""><div class="td-actions"><button class="btn btn-outline btn-sm" data-action="ap-pubtoggle" data-id="' + p.uuid + '" data-on="' + (!p.isPublished) + '">' + (p.isPublished ? t('unpublish') : t('publish')) + '</button>' +
        '<button class="btn btn-primary btn-sm" data-go="product-edit/' + p.uuid + '">' + t('editProduct') + '</button></div></td></tr>').join('') + '</tbody></table></div>' +
      (count > rows.length && UI.apPub === 'all' ? '<div class="load-more"><button class="btn btn-outline" data-action="ap-more">' + t('loadMore') + '</button></div>' : '');
  }, 'ap-retry');
}

function productForm(r) {
  const v = k => (r && r[k] != null) ? r[k] : '';
  const sel = (id, opts, cur) => '<select id="' + id + '" name="' + id + '" aria-describedby="' + id + '-err">' + opts.map(([val, lab]) => '<option value="' + esc(val) + '"' + (String(cur) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>').join('') + '</select><p class="err" id="' + id + '-err" role="alert"></p>';
  const area = (id, label, val) => '<div class="field"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="' + id + '" maxlength="2000" aria-describedby="' + id + '-err">' + esc(val) + '</textarea><p class="err" id="' + id + '-err" role="alert"></p></div>';
  const tags = (r && r.tags) || [];
  return '<form class="panel" data-form="product" data-id="' + (r ? r.id : '') + '" novalidate>' +
    field({ id: 'pSku', label: t('f_sku'), value: v('sku'), hint: t('f_skuHint'), attrs: 'maxlength="30" autocapitalize="characters" spellcheck="false"' }) +
    '<div class="field mt"><label for="pCat">' + t('f_category') + ' <span class="req" aria-hidden="true">*</span></label>' + sel('pCat', Catalog.cats.map(c => [c.id, L(c.name) + (c.visible ? '' : ' (hidden)')]), v('category_id')) + '</div>' +
    field({ id: 'pNameEn', label: t('f_nameEn'), value: v('name_en'), attrs: 'maxlength="120"' }) +
    field({ id: 'pNameTa', label: t('f_nameTa'), value: v('name_ta'), attrs: 'maxlength="120" lang="ta"' }) +
    area('pDescEn', t('f_descEn'), v('description_en')) + area('pDescTa', t('f_descTa'), v('description_ta')) +
    '<div class="field mt"><label for="pPurity">' + t('f_purity') + '</label>' + sel('pPurity', PURITIES.map(x => [x, x]), v('purity') || '22K') + '</div>' +
    field({ id: 'pGross', label: t('f_gross'), value: v('gross_weight_g'), required: false, hint: t('f_weightHint'), attrs: 'inputmode="decimal" maxlength="10"' }) +
    field({ id: 'pNet', label: t('f_net'), value: v('net_weight_g'), required: false, attrs: 'inputmode="decimal" maxlength="10"' }) +
    field({ id: 'pStone', label: t('f_stone'), value: v('stone_weight_g'), required: false, attrs: 'inputmode="decimal" maxlength="10"' }) +
    field({ id: 'pMaking', label: t('f_making'), value: v('making_charge'), required: false, hint: t('f_chargeHint'), attrs: 'inputmode="decimal" maxlength="12"' }) +
    field({ id: 'pStoneCh', label: t('f_stoneCharge'), value: v('stone_charge'), required: false, attrs: 'inputmode="decimal" maxlength="12"' }) +
    '<div class="field mt"><label for="pMode">' + t('f_priceMode') + '</label>' + sel('pMode', [['enquiry', t('pm_enquiry')], ['fixed', t('pm_fixed')]], v('price_mode') || 'enquiry') + '</div>' +
    field({ id: 'pPrice', label: t('f_fixedPrice'), value: v('fixed_price'), required: false, attrs: 'inputmode="decimal" maxlength="12"' }) +
    '<div class="field mt"><label for="pStock">' + t('f_stockStatus') + '</label>' + sel('pStock', ['in_stock', 'made_to_order', 'out_of_stock'].map(s => [s, t('stock_' + s)]), v('stock_status') || 'in_stock') + '</div>' +
    field({ id: 'pQty', label: t('f_stockQty'), value: r ? r.stock_qty : 1, attrs: 'inputmode="numeric" maxlength="6"' }) +
    field({ id: 'pMax', label: t('f_maxQty'), value: r ? r.max_order_qty : 1, attrs: 'inputmode="numeric" maxlength="2"' }) +
    '<fieldset class="field mt"><legend>' + t('f_tags') + '</legend><div class="chips">' + SHOP_TAGS_ADMIN.map(tg => '<label class="check" style="margin:0 12px 0 0"><input type="checkbox" name="pTag" value="' + tg + '"' + (tags.includes(tg) ? ' checked' : '') + '><span>' + t('tag_' + tg) + '</span></label>').join('') + '</div></fieldset>' +
    '<label class="check"><input type="checkbox" id="pPub" name="pPub"' + (r && r.is_published ? ' checked' : '') + '><span>' + t('f_published') + '</span></label>' +
    '<p class="err" id="pFormErr" role="alert"></p><button class="btn btn-primary btn-block mt" type="submit">' + t('saveProduct') + '</button></form>';
}
const SHOP_TAGS_ADMIN = ['new', 'popular', 'bridal', 'featured'];
function aProductEdit(arg) {
  if (!Auth.isAdmin) return aHead('products') + adminOnlyNote();
  const isNew = arg === 'new';
  return '<button class="back" data-go="products">' + ic('left') + t('backToProducts') + '</button>' +
    pageHead(isNew ? t('newProduct') : t('editProduct')) +
    '<div class="two-col"><div id="peForm">' + (isNew ? productForm(null) : '') + '</div>' +
    '<section class="panel"><h2 class="h3">' + t('imagesTitle') + '</h2><div id="peImages">' + (isNew ? '<p class="muted small">' + t('imagesSaveFirst') + '</p>' : '') + '</div></section></div>';
}
function fillProductEdit(token) {
  const id = route.arg; if (!id || id === 'new' || !Auth.isAdmin) return;
  pending($('#peForm'));
  fillAsync('#peForm', token, () => AdminApi.productRow(id), r => {
    if (!r) return emptyState('shop', t('productMissing'), t('productMissingHint'));
    const imgs = (r.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const box = $('#peImages');
    if (box) box.innerHTML = '<div class="pgrid">' + imgs.map(im => '<figure class="pcard"><img class="product-photo" src="' + esc(publicImageUrl(im.storage_path)) + '" alt="" loading="lazy"><button class="btn btn-ghost btn-sm" data-action="pe-delimg" data-id="' + im.id + '" data-path="' + esc(im.storage_path) + '">' + ic('trash') + t('deletePhoto') + '</button></figure>').join('') + '</div>' +
      '<div class="field mt"><label for="peFile" class="btn btn-outline" style="cursor:pointer">' + ic('plus') + t('uploadPhoto') + '</label><input id="peFile" type="file" accept="image/jpeg,image/png,image/webp" data-change="pe-upload" data-id="' + r.id + '" data-count="' + imgs.length + '" class="sr-only"><p class="hint">' + t('uploadHint') + '</p><p class="err" id="peUpErr" role="alert"></p></div>';
    return productForm(r);
  });
}
function readProductForm(f) {
  const E = n => f.elements[n], val = n => String(E(n).value || '').trim();
  const dec = (n, places, req) => { const s = val(n).replace(/,/g, ''); if (!s) return req ? NaN : null; const re = new RegExp('^\\d+(\\.\\d{1,' + places + '})?$'); return re.test(s) && Number(s) > 0 ? Number(s) : NaN; };
  const intIn = (n, lo, hi) => { const s = val(n); return /^\d+$/.test(s) && +s >= lo && +s <= hi ? +s : NaN; };
  const d = {
    sku: val('pSku').toUpperCase(), category_id: val('pCat'), name_en: val('pNameEn'), name_ta: val('pNameTa'),
    description_en: val('pDescEn') || null, description_ta: val('pDescTa') || null, purity: val('pPurity'),
    gross_weight_g: dec('pGross', 3), net_weight_g: dec('pNet', 3), stone_weight_g: val('pStone') === '0' ? 0 : dec('pStone', 3),
    making_charge: val('pMaking') === '0' ? 0 : dec('pMaking', 2), stone_charge: val('pStoneCh') === '0' ? 0 : dec('pStoneCh', 2),
    price_mode: val('pMode'), fixed_price: dec('pPrice', 2), stock_status: val('pStock'),
    stock_qty: intIn('pQty', 0, 100000), max_order_qty: intIn('pMax', 1, 10),
    tags: Array.from(f.querySelectorAll('input[name="pTag"]:checked')).map(x => x.value), is_published: E('pPub').checked
  };
  if (d.price_mode !== 'fixed') d.fixed_price = null;
  let ok = true;
  const chk = (id, bad, msg) => { ok = setErr(f, id, bad ? msg : '') && ok; };
  chk('pSku', !/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(d.sku), t('e_sku'));
  chk('pCat', !d.category_id, t('e_required'));
  chk('pNameEn', d.name_en.length < 2 || d.name_en.length > 120, t('e_name'));
  chk('pNameTa', d.name_ta.length < 2 || d.name_ta.length > 120, t('e_name'));
  chk('pGross', Number.isNaN(d.gross_weight_g), t('e_weight'));
  chk('pNet', Number.isNaN(d.net_weight_g) || (d.net_weight_g && d.gross_weight_g && d.net_weight_g > d.gross_weight_g), Number.isNaN(d.net_weight_g) ? t('e_weight') : t('e_netGross'));
  chk('pStone', Number.isNaN(d.stone_weight_g), t('e_weight'));
  chk('pMaking', Number.isNaN(d.making_charge), t('e_money'));
  chk('pStoneCh', Number.isNaN(d.stone_charge), t('e_money'));
  chk('pPrice', d.price_mode === 'fixed' && (d.fixed_price == null || Number.isNaN(d.fixed_price)), t('e_fixed'));
  chk('pQty', Number.isNaN(d.stock_qty), t('e_int'));
  chk('pMax', Number.isNaN(d.max_order_qty), t('e_int'));
  return ok ? d : null;
}

/* ---------- categories ---------- */
function aCategoriesLive() {
  if (!Auth.isAdmin) return aHead('categories') + adminOnlyNote();
  return aHead('categories', '<button class="btn btn-primary" data-action="cat-edit" data-id="">' + ic('plus') + t('addCategory') + '</button>') + '<div id="acList"></div>';
}
function renderAdminCategories(token) {
  const el = $('#acList'); if (!el || !Auth.isAdmin) return; pending(el);
  fillAsync('#acList', token, () => AdminApi.categoriesAll(), rows => '<div class="table-wrap"><table class="table"><thead><tr><th>' + t('orderCol') + '</th><th>' + t('f_catId') + '</th><th>' + t('nameEn') + '</th><th>' + t('nameTa') + '</th><th>' + t('visibleCol') + '</th><th></th></tr></thead><tbody>' +
    rows.map(c => '<tr><td data-label="' + t('orderCol') + '">' + c.sort_order + '</td><td data-label="' + t('f_catId') + '"><span class="mono small">' + esc(c.id) + '</span></td><td data-label="' + t('nameEn') + '">' + esc(c.name_en) + '</td><td data-label="' + t('nameTa') + '" lang="ta">' + esc(c.name_ta) + '</td>' +
      '<td data-label="' + t('visibleCol') + '">' + (c.is_visible ? '<span class="chip chip--ok">' + t('yesWord') + '</span>' : '<span class="chip chip--neutral">—</span>') + '</td>' +
      '<td data-label=""><div class="td-actions"><button class="btn btn-outline btn-sm" data-action="cat-edit" data-id="' + esc(c.id) + '">' + t('editCategory') + '</button></div></td></tr>').join('') + '</tbody></table></div>');
}
async function openCategoryForm(id) {
  let c = null;
  if (id) { const all = await AdminApi.categoriesAll(); c = all.find(x => x.id === id) || null; }
  openModal({
    title: c ? t('editCategory') : t('addCategory'),
    body: '<form id="catForm" data-form="category" data-id="' + esc(c ? c.id : '') + '" novalidate>' +
      (c ? '<div class="kv-row"><span>' + t('f_catId') + '</span><b class="mono">' + esc(c.id) + '</b></div>' : field({ id: 'cId', label: t('f_catId'), hint: t('f_catIdHint'), attrs: 'maxlength="40" autocapitalize="off" spellcheck="false"' })) +
      field({ id: 'cNameEn', label: t('nameEn'), value: c ? c.name_en : '', attrs: 'maxlength="60"' }) +
      field({ id: 'cNameTa', label: t('nameTa'), value: c ? c.name_ta : '', attrs: 'maxlength="60" lang="ta"' }) +
      field({ id: 'cSort', label: t('f_sortOrder'), value: c ? c.sort_order : 100, attrs: 'inputmode="numeric" maxlength="5"' }) +
      '<label class="check"><input type="checkbox" id="cVis" name="cVis"' + (!c || c.is_visible ? ' checked' : '') + '><span>' + t('f_visible') + '</span></label>' +
      '<p class="err" id="cErr" role="alert"></p></form>',
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button class="btn btn-primary" type="submit" form="catForm">' + t('saveCategory') + '</button>'
  });
}

/* ---------- orders ---------- */
UI.aoStatus = 'all'; UI.aoQ = ''; UI.aoLimit = 25;
function aOrdersLive() {
  const chips = ['all', 'requested', 'confirmed', 'ready', 'completed', 'cancelled', 'rejected'].map(s => '<button class="fchip" data-action="ao-status" data-v="' + s + '" aria-pressed="' + (UI.aoStatus === s) + '">' + (s === 'all' ? t('ordersFilterAll') : t('os_' + s)) + '</button>').join('');
  return aHead('orders') + '<div class="note note--info">' + ic('info') + '<span>' + t('notPaidAdmin') + '</span></div>' +
    '<div class="toolbar"><div class="search">' + ic('search') + '<input type="search" placeholder="' + t('orderSearch') + '" aria-label="' + t('orderSearch') + '" value="' + esc(UI.aoQ) + '" data-filter="ao" maxlength="40"></div></div>' +
    '<div class="chips chips--scroll" role="group" aria-label="' + t('status') + '">' + chips + '</div><div id="aoList"></div>';
}
function renderAdminOrders() {
  const el = $('#aoList'); if (!el) return; if (!el.innerHTML) pending(el);
  fillAsync('#aoList', renderToken, () => Orders.adminList({ status: UI.aoStatus, q: UI.aoQ, limit: UI.aoLimit }), ({ rows, count }) => {
    if (!rows.length) return emptyState('receipt', t('noOrdersAdmin'), t('noOrdersAdminHint'));
    return '<p class="result-count">' + count + ' ' + t('results') + '</p><div class="table-wrap mt"><table class="table"><thead><tr><th>' + t('orderNumber') + '</th><th>' + t('orderedOn') + '</th><th>' + t('customer') + '</th><th>' + t('phone') + '</th><th class="r">' + t('itemsLabel') + '</th><th class="r">' + t('estTotal') + '</th><th>' + t('status') + '</th><th></th></tr></thead><tbody>' +
      rows.map(o => '<tr><td data-label="' + t('orderNumber') + '"><span class="mono small">' + esc(o.order_number) + '</span></td><td data-label="' + t('orderedOn') + '">' + fmtStamp(o.created_at) + '</td><td data-label="' + t('customer') + '">' + esc(o.contact_name) + '</td>' +
        '<td data-label="' + t('phone') + '"><span class="mono small">' + esc(o.contact_phone) + '</span></td><td data-label="' + t('itemsLabel') + '" class="r num">' + o.items_count + '</td><td data-label="' + t('estTotal') + '" class="r num">' + (Number(o.priced_total) > 0 ? inr(o.priced_total) + (o.has_unpriced_items ? '+' : '') : '—') + '</td>' +
        '<td data-label="' + t('status') + '">' + orderChip(o.status) + '</td><td data-label=""><div class="td-actions"><button class="btn btn-primary btn-sm" data-go="admin-order/' + o.id + '">' + t('view') + '</button></div></td></tr>').join('') + '</tbody></table></div>' +
      (count > rows.length ? '<div class="load-more"><button class="btn btn-outline" data-action="ao-more">' + t('loadMore') + '</button></div>' : '');
  }, 'ao-retry');
}
function aAdminOrder() {
  return '<button class="back" data-go="orders">' + ic('left') + t('backToOrders') + '</button><div id="aoDetail"></div>';
}
function fillAdminOrder(token) {
  const el = $('#aoDetail'); if (!el) return; pending(el);
  fillAsync('#aoDetail', token, () => Orders.get(route.arg), o => {
    if (!o) return emptyState('receipt', t('err_order_not_found'), '');
    const next = NEXT_STATUS[o.status] || [];
    return '<div class="flow">' + orderDetailHTML(o, { admin: true }) +
      '<div class="two-col">' +
      (next.length ? '<form class="panel" data-form="order-status" data-id="' + o.id + '" novalidate><h2 class="h3">' + t('updateOrderStatus') + '</h2>' +
        '<div class="field"><label for="osNew">' + t('newStatus') + '</label><select id="osNew" name="osNew">' + next.map(s => '<option value="' + s + '">' + t('os_' + s) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="osNote">' + t('statusNote') + '</label><textarea id="osNote" name="osNote" maxlength="500"></textarea></div>' +
        '<p class="err" id="osErr" role="alert"></p><button class="btn btn-primary btn-block" type="submit">' + t('updateOrderStatus') + '</button></form>'
        : '<div class="note note--info">' + ic('info') + '<span>' + t('finalStatus') + '</span></div>') +
      '<form class="panel" data-form="order-note" data-id="' + o.id + '" novalidate><h2 class="h3">' + t('internalNote') + '</h2><div class="field"><label class="sr-only" for="onNote">' + t('internalNote') + '</label><textarea id="onNote" name="onNote" maxlength="1000">' + esc(o.admin_note || '') + '</textarea></div>' +
        '<p class="err" id="onErr" role="alert"></p><button class="btn btn-outline btn-block" type="submit">' + t('saveNote') + '</button></form></div></div>';
  });
}

/* ---------- forms & actions ---------- */
async function busy(btn, fn, errSel) {
  const label = btn.innerHTML, err = errSel && $(errSel);
  btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + t('processing') + '</span>';
  if (err) err.textContent = '';
  try { await fn(); } catch (e) { const m = errorText(toApiError(e)); if (err) err.textContent = m; else toast(m, 'err'); }
  finally { if (document.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } }
}
Object.assign(FORMS, {
  'admin-login': f => {
    const email = f.elements.alEmail.value.trim().toLowerCase(), pass = f.elements.alPass.value;
    let ok = setErr(f, 'alEmail', EMAIL_RE_ADMIN.test(email) ? '' : t('errEmail'));
    ok = setErr(f, 'alPass', pass ? '' : t('errPasswordShort')) && ok;
    if (!ok) return;
    return busy(f.querySelector('button[type="submit"]'), async () => { await Auth.signIn(email, pass); await Auth.loadRoles(); await Catalog.init(); route = APP.resolve(parseHash()); render(); }, '#authErr');
  },
  product: f => {
    const d = readProductForm(f);
    if (!d) { focusFirstInvalid(f); const e = $('#pFormErr'); if (e) e.textContent = t('err_invalid_data'); return; }
    const id = f.dataset.id || null;
    return busy(f.querySelector('button[type="submit"]'), async () => {
      const newId = await AdminApi.saveProduct(id, d);
      toast(t('productSaved'), 'ok');
      if (!id) go('product-edit/' + newId); else render();
    }, '#pFormErr');
  },
  category: f => {
    const id = f.dataset.id, isNew = !id;
    const cid = isNew ? f.elements.cId.value.trim().toLowerCase() : id;
    const d = { name_en: f.elements.cNameEn.value.trim(), name_ta: f.elements.cNameTa.value.trim(), sort_order: Number(f.elements.cSort.value), is_visible: f.elements.cVis.checked };
    let ok = true;
    if (isNew) ok = setErr(f, 'cId', /^[a-z0-9][a-z0-9-]{1,39}$/.test(cid) ? '' : t('e_catId')) && ok;
    ok = setErr(f, 'cNameEn', d.name_en.length >= 2 && d.name_en.length <= 60 ? '' : t('e_name60')) && ok;
    ok = setErr(f, 'cNameTa', d.name_ta.length >= 2 && d.name_ta.length <= 60 ? '' : t('e_name60')) && ok;
    ok = setErr(f, 'cSort', Number.isInteger(d.sort_order) && d.sort_order >= 0 && d.sort_order <= 10000 ? '' : t('e_int')) && ok;
    if (!ok) { focusFirstInvalid(f); return; }
    return busy($('.modal-foot button[type="submit"]'), async () => { await AdminApi.saveCategory(cid, d, isNew); closeModal(true); toast(t('categorySaved'), 'ok'); render(); }, '#cErr');
  },
  'order-status': async f => {
    const status = f.elements.osNew.value, note = f.elements.osNote.value.trim();
    if (!(await confirmDialog({ title: t('statusConfirmTitle'), message: orderChip(status) + (note ? '<br><br>' + esc(note) : ''), confirmText: t('updateOrderStatus') }))) return;
    return busy(f.querySelector('button[type="submit"]'), async () => { await Orders.setStatus(f.dataset.id, status, note); toast(t('statusUpdatedToast'), 'ok'); render(); }, '#osErr');
  },
  'order-note': f => busy(f.querySelector('button[type="submit"]'), async () => { await Orders.setNote(f.dataset.id, f.elements.onNote.value.trim()); toast(t('noteSaved'), 'ok'); }, '#onErr')
});
const EMAIL_RE_ADMIN = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
Object.assign(ACTIONS, {
  'admin-logout': async () => { try { await Auth.signOut(); } catch (e) { /* cleared locally */ } location.hash = '/overview'; route = APP.resolve(parseHash()); render(); },
  'ap-pubtoggle': b => busy(b, async () => { const on = b.dataset.on === 'true'; await AdminApi.setPublished(b.dataset.id, on); toast(on ? t('publishedToast') : t('unpublishedToast'), 'ok'); renderAdminProducts(); }),
  'ap-more': () => { UI.apLimit += 25; renderAdminProducts(); },
  'ap-retry': () => renderAdminProducts(),
  'cat-edit': b => openCategoryForm(b.dataset.id).catch(e => toast(errorText(toApiError(e)), 'err')),
  'pe-delimg': async b => {
    if (!(await confirmDialog({ title: t('deletePhotoTitle'), message: t('deletePhotoMsg'), confirmText: t('deletePhoto'), danger: true }))) return;
    busy(b, async () => { await AdminApi.deleteImage({ id: b.dataset.id, path: b.dataset.path }); toast(t('photoDeleted')); render(); });
  },
  'ao-status': b => { UI.aoStatus = b.dataset.v; document.querySelectorAll('[data-action="ao-status"]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#aoList').innerHTML = ''; renderAdminOrders(); },
  'ao-more': () => { UI.aoLimit += 25; renderAdminOrders(); },
  'ao-retry': () => renderAdminOrders()
});
Object.assign(CHANGES, {
  'ap-cat': el => { UI.apCat = el.value; renderAdminProducts(); },
  'ap-pub': el => { UI.apPub = el.value; renderAdminProducts(); },
  'pe-upload': async el => {
    const file = el.files && el.files[0]; if (!file) return;
    const err = $('#peUpErr'); if (err) err.textContent = '';
    try { AdminApi.validateImage(file); } catch (e) { if (err) err.textContent = errorText(e); el.value = ''; return; }
    toast(t('uploading'));
    try { await AdminApi.uploadImage(el.dataset.id, file, Number(el.dataset.count) || 0); toast(t('photoUploaded'), 'ok'); render(); }
    catch (e) { if (err) err.textContent = errorText(toApiError(e)); el.value = ''; }
  }
});
let apTimer = null, aoTimer = null;
Object.assign(FILTERS, {
  ap: el => { UI.apQ = el.value; clearTimeout(apTimer); apTimer = setTimeout(renderAdminProducts, 350); },
  ao: el => { UI.aoQ = el.value; clearTimeout(aoTimer); aoTimer = setTimeout(renderAdminOrders, 350); }
});

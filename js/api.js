'use strict';
/* =========================================================
   DATA LAYER — one interface, two sources:
   • DEMO mode     (no Supabase config): the fictional sample catalogue in
                   demo-data.js, wishlist in localStorage. Clearly labelled.
   • SUPABASE mode (config filled in): ONLY Supabase. If a request fails the
                   app shows an error — it never substitutes demo products.
   • ERROR mode    (config present but invalid / secret key detected): the app
                   stops and explains the configuration problem.
   Security is enforced by the database (RLS + functions), not by this file.
   ========================================================= */
addStrings({
  err_network: 'Could not reach the server. Check your internet connection and try again.',
  err_forbidden: 'You do not have permission for this action.', err_not_found: 'Not found.',
  err_server: 'Something went wrong. Please try again.', err_invalid_data: 'Some details are not valid. Please check and try again.',
  err_duplicate: 'This already exists.', err_login_required: 'Please log in to continue.',
  err_product_unavailable: 'An item in your cart is no longer available.', err_product_out_of_stock: 'An item in your cart is out of stock.',
  err_quantity_exceeds_limit: 'The quantity of an item is above its limit.', err_insufficient_stock: 'There is not enough stock for an item.',
  err_duplicate_item: 'An item appears twice in the order.', err_invalid_items: 'The order items are not valid.',
  err_invalid_item_count: 'An order must have between 1 and 20 items.', err_invalid_quantity: 'Quantity must be between 1 and 10.',
  err_invalid_contact_name: 'Enter your name (2–80 letters).', err_invalid_contact_phone: 'Enter a valid 10-digit mobile number.',
  err_note_too_long: 'The note is too long (max 500 characters).', err_too_many_requests: 'Too many order requests. Please try again in an hour.',
  err_not_authenticated: 'Your session has ended. Please log in again.', err_not_authorized: 'Only store staff can do this.',
  err_order_not_found: 'Order not found.', err_order_not_cancellable: 'This order can no longer be cancelled.',
  err_invalid_status_transition: 'That status change is not allowed.', err_missing_idempotency_key: 'Please try again.',
  err_auth_invalid: 'Email or password is incorrect.', err_auth_not_confirmed: 'Please confirm your email address first — check your inbox for the link.',
  err_auth_exists: 'An account with this email already exists. Please log in.', err_auth_weak: 'Password is too weak. Use at least 8 characters.',
  err_auth_rate: 'Too many attempts. Please wait a few minutes and try again.', err_auth_email: 'Enter a valid email address.',
  err_file_type: 'Only JPG, PNG or WebP images are allowed.', err_file_size: 'Image is larger than 5 MB.',
  cfg_config_incomplete: 'Supabase settings in js/config.js are incomplete (both the Project URL and the public anon key are needed).',
  cfg_secret_key: 'A SECRET (service_role) key was found in js/config.js. The app has stopped for safety. Replace it with the public anon/publishable key and rotate the secret key in Supabase.',
  cfg_client_missing: 'The Supabase library (js/vendor/supabase.js) did not load.', configErrorTitle: 'Configuration problem', retry: 'Try again',
  demoModeNote: 'DEMO mode: no database is connected, so the catalogue shows fictional sample products.'
}, {
  err_network: 'Server-ஐ அணுக இயலவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  err_forbidden: 'இந்தச் செயலுக்கு உங்களுக்கு அனுமதி இல்லை.', err_not_found: 'கிடைக்கவில்லை.',
  err_server: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.', err_invalid_data: 'சில விவரங்கள் சரியாக இல்லை. சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  err_duplicate: 'இது ஏற்கெனவே உள்ளது.', err_login_required: 'தொடர உள்நுழையவும்.',
  err_product_unavailable: 'கூடையிலுள்ள ஒரு நகை இப்போது கிடைக்கவில்லை.', err_product_out_of_stock: 'கூடையிலுள்ள ஒரு நகை இருப்பில் இல்லை.',
  err_quantity_exceeds_limit: 'ஒரு நகையின் எண்ணிக்கை அதன் வரம்பை மீறுகிறது.', err_insufficient_stock: 'ஒரு நகைக்குப் போதுமான இருப்பு இல்லை.',
  err_duplicate_item: 'ஒரு நகை ஆர்டரில் இருமுறை உள்ளது.', err_invalid_items: 'ஆர்டர் விவரங்கள் சரியாக இல்லை.',
  err_invalid_item_count: 'ஒரு ஆர்டரில் 1 முதல் 20 நகைகள் இருக்க வேண்டும்.', err_invalid_quantity: 'எண்ணிக்கை 1 முதல் 10 வரை இருக்க வேண்டும்.',
  err_invalid_contact_name: 'உங்கள் பெயரை உள்ளிடவும் (2–80 எழுத்துகள்).', err_invalid_contact_phone: 'சரியான 10 இலக்கக் கைபேசி எண்ணை உள்ளிடவும்.',
  err_note_too_long: 'குறிப்பு மிக நீளமாக உள்ளது (அதிகபட்சம் 500 எழுத்துகள்).', err_too_many_requests: 'அதிகமான ஆர்டர் கோரிக்கைகள். ஒரு மணி நேரம் கழித்து முயற்சிக்கவும்.',
  err_not_authenticated: 'உங்கள் அமர்வு முடிந்தது. மீண்டும் உள்நுழையவும்.', err_not_authorized: 'கடை ஊழியர்கள் மட்டுமே இதைச் செய்ய முடியும்.',
  err_order_not_found: 'ஆர்டர் கிடைக்கவில்லை.', err_order_not_cancellable: 'இந்த ஆர்டரை இனி ரத்து செய்ய இயலாது.',
  err_invalid_status_transition: 'இந்த நிலை மாற்றம் அனுமதிக்கப்படவில்லை.', err_missing_idempotency_key: 'மீண்டும் முயற்சிக்கவும்.',
  err_auth_invalid: 'மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு.', err_auth_not_confirmed: 'முதலில் உங்கள் மின்னஞ்சலை உறுதிசெய்யவும் — inbox-ல் உள்ள இணைப்பைப் பாருங்கள்.',
  err_auth_exists: 'இந்த மின்னஞ்சலில் ஏற்கெனவே கணக்கு உள்ளது. உள்நுழையவும்.', err_auth_weak: 'கடவுச்சொல் பலவீனமாக உள்ளது. குறைந்தது 8 எழுத்துகள் பயன்படுத்தவும்.',
  err_auth_rate: 'அதிகமான முயற்சிகள். சில நிமிடங்கள் கழித்து முயற்சிக்கவும்.', err_auth_email: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
  err_file_type: 'JPG, PNG அல்லது WebP படங்கள் மட்டுமே அனுமதிக்கப்படும்.', err_file_size: 'படம் 5 MB-ஐ விடப் பெரியது.',
  cfg_config_incomplete: 'js/config.js-ல் Supabase அமைப்புகள் முழுமையாக இல்லை (Project URL, public anon key இரண்டும் தேவை).',
  cfg_secret_key: 'js/config.js-ல் ரகசிய (service_role) key கண்டறியப்பட்டது. பாதுகாப்புக்காகச் செயலி நிறுத்தப்பட்டது. அதற்குப் பதில் public anon/publishable key-ஐ வைத்து, Supabase-ல் ரகசிய key-ஐ மாற்றவும்.',
  cfg_client_missing: 'Supabase library (js/vendor/supabase.js) ஏற்றப்படவில்லை.', configErrorTitle: 'அமைப்புப் பிழை', retry: 'மீண்டும் முயற்சி',
  demoModeNote: 'டெமோ நிலை: database இணைக்கப்படவில்லை; எனவே கற்பனையான மாதிரி நகைகள் காட்டப்படுகின்றன.'
});

/* ---------- connection ---------- */
const Backend = (function () {
  const cfg = STORE_CONFIG.supabase || {};
  const url = String(cfg.url || '').trim().replace(/\/+$/, ''), key = String(cfg.anonKey || '').trim();
  const jwtRole = k => { try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch (e) { return null; } };
  let mode = 'demo', configError = null, client = null;
  if (url || key) {
    if (!/^https:\/\/[^\s/]+$/.test(url) || key.length < 20) configError = 'config_incomplete';
    else if (/^sb_secret_/.test(key) || jwtRole(key) === 'service_role') configError = 'secret_key';
    else if (!window.supabase || typeof window.supabase.createClient !== 'function') configError = 'client_missing';
    else {
      mode = 'supabase';
      client = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'stm_auth' }, global: { fetch: timedFetch }, db: { retry: false } });
    }
    if (configError) mode = 'error';
  }
  return { mode, configError, client, url };
}());
const isLive = () => Backend.mode === 'supabase';

/* ---------- errors ---------- */
class ApiError extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail; } }
/* Requests give up after 20 s (photo uploads 90 s) so a weak mobile connection shows
   "could not reach the server" + Retry instead of an endless spinner. A retried order
   request is safe: it reuses the same idempotency key. */
function timedFetch(input, init) {
  init = init || {};
  const ms = /\/storage\/v1\/object/.test(String(input && input.url || input)) && init.method && init.method !== 'GET' ? 90000 : 20000;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error('network timeout')), ms);
  if (init.signal) { if (init.signal.aborted) ctl.abort(init.signal.reason); else init.signal.addEventListener('abort', () => ctl.abort(init.signal.reason), { once: true }); }
  return fetch(input, Object.assign({}, init, { signal: ctl.signal })).finally(() => clearTimeout(timer));
}
function toApiError(error) {
  if (!error) return null;
  if (error instanceof ApiError) return error;
  const msg = String(error.message || error.error_description || error);
  if (/Failed to fetch|NetworkError|fetch failed|Load failed|network/i.test(msg) && !error.code) return new ApiError('network', msg);
  const m = msg.match(/^([a-z_]+)(?::(.*))?$/);                 // codes raised by our database functions
  if (m && I18N.en['err_' + m[1]]) return new ApiError(m[1], m[2]);
  if (error.code === '42501' || /permission denied|row-level security/i.test(msg)) return new ApiError('forbidden', msg);
  if (error.code === 'PGRST116') return new ApiError('not_found', msg);
  if (error.code === '23505') return new ApiError('duplicate', msg);
  if (['23514', '22P02', '23502', '22001', '22023'].includes(error.code)) return new ApiError('invalid_data', msg);
  return new ApiError('server', msg);
}
function authError(error) {
  const msg = String((error && error.message) || error || ''), code = (error && error.code) || '';
  if (/invalid login credentials|invalid_credentials/i.test(msg + code)) return new ApiError('auth_invalid', msg);
  if (/email not confirmed|email_not_confirmed/i.test(msg + code)) return new ApiError('auth_not_confirmed', msg);
  if (/already registered|already exists|user_already_exists/i.test(msg + code)) return new ApiError('auth_exists', msg);
  if (/password/i.test(msg) && /(weak|short|least|characters)/i.test(msg)) return new ApiError('auth_weak', msg);
  if (/rate limit|too many|over_request_rate_limit|over_email_send_rate_limit/i.test(msg + code)) return new ApiError('auth_rate', msg);
  if (/invalid.*email|email.*invalid|validation_failed/i.test(msg + code)) return new ApiError('auth_email', msg);
  return toApiError(error);
}
function errorText(e) { const c = e && e.code; return (c && I18N.en['err_' + c]) ? t('err_' + c) : t('err_server'); }
async function run(builder) { const { data, error, count } = await builder; if (error) throw toApiError(error); return { data, count }; }
function cleanTerm(s) { return String(s || '').normalize('NFC').replace(/[^\p{L}\p{M}\p{N} -]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); }

/* ---------- mapping database rows to the UI's product shape ---------- */
const CATEGORY_ART = { rings: 'ring', chains: 'chain', necklaces: 'necklace', bangles: 'bangle', earrings: 'earring', bridal: 'bridal', thali: 'thali', coins: 'coin', silver: 'silver' };
const PRODUCT_COLS = 'id,sku,category_id,name_en,name_ta,description_en,description_ta,purity,gross_weight_g,net_weight_g,stone_weight_g,making_charge,stone_charge,price_mode,fixed_price,stock_status,stock_qty,max_order_qty,tags,is_published,created_at,product_images(id,storage_path,alt_en,alt_ta,sort_order)';
const num = v => (v == null || v === '') ? null : Number(v);
function publicImageUrl(path) { return Backend.url + '/storage/v1/object/public/product-images/' + String(path).split('/').map(encodeURIComponent).join('/'); }
function mapCategory(r) { return { id: r.id, order: r.sort_order, visible: r.is_visible, art: CATEGORY_ART[r.id] || 'ring', name: { en: r.name_en, ta: r.name_ta } }; }
function mapProduct(r) {
  const imgs = (r.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: r.sku, uuid: r.id, isDemo: /^DEMO-/.test(r.sku), isLive: true, category: r.category_id,
    name: { en: r.name_en, ta: r.name_ta }, desc: { en: r.description_en || '', ta: r.description_ta || '' },
    purity: r.purity, grossWeight: num(r.gross_weight_g), netWeight: num(r.net_weight_g), stoneWeight: num(r.stone_weight_g),
    makingCharge: num(r.making_charge), stoneCharge: num(r.stone_charge),
    price: r.price_mode === 'fixed' ? { mode: 'fixed', amount: Number(r.fixed_price) } : { mode: 'enquiry' },
    stock: r.stock_status, stockQty: r.stock_qty, maxOrderQty: r.max_order_qty, qtySelectable: r.max_order_qty > 1,
    tags: r.tags || [], addedOn: String(r.created_at || '').slice(0, 10), isPublished: r.is_published,
    images: imgs.length ? imgs.map(i => ({ src: publicImageUrl(i.storage_path), id: i.id, path: i.storage_path, alt: { en: i.alt_en || '', ta: i.alt_ta || '' } }))
      : [{ art: CATEGORY_ART[r.category_id] || 'ring', v: 0, noPhoto: true }]
  };
}

/* ---------- catalogue ---------- */
const Catalog = {
  cats: [], products: new Map(),
  remember(list) { list.forEach(p => this.products.set(p.id, p)); return list; },
  async init() {
    if (!isLive()) { this.cats = CATEGORIES.slice(); this.remember(PRODUCTS); return; }
    const { data } = await run(Backend.client.from('categories').select('id,name_en,name_ta,sort_order,is_visible').order('sort_order'));
    this.cats = data.map(mapCategory);
  },
  /* options: { category, tag, q, sort, limit, offset, includeDrafts } → { rows, count } */
  async list(o) {
    const opt = Object.assign({ category: 'all', tag: null, q: '', sort: 'newest', limit: 12, offset: 0, includeDrafts: false }, o);
    if (!isLive()) {
      const term = String(opt.q || '').trim().toLowerCase();
      let rows = PRODUCTS.filter(p => (opt.category === 'all' || p.category === opt.category) && (!opt.tag || p.tags.includes(opt.tag)));
      if (term) rows = rows.filter(p => { const c = getCat(p.category); return [p.id, p.name.en, p.name.ta, c ? c.name.en : '', c ? c.name.ta : '', p.purity].join(' ').toLowerCase().includes(term); });
      rows = sortProducts(rows, opt.sort);
      return { rows: rows.slice(opt.offset, opt.offset + opt.limit), count: rows.length };
    }
    let qb = Backend.client.from('products').select(PRODUCT_COLS, { count: 'exact' });
    if (!opt.includeDrafts) qb = qb.eq('is_published', true);
    if (opt.category !== 'all') qb = qb.eq('category_id', opt.category);
    if (opt.tag) qb = qb.contains('tags', [opt.tag]);
    const term = cleanTerm(opt.q);
    if (term) qb = qb.or('name_en.ilike.*' + term + '*,name_ta.ilike.*' + term + '*,sku.ilike.*' + term + '*');
    if (opt.sort === 'name') qb = qb.order(lang === 'ta' ? 'name_ta' : 'name_en', { ascending: true });
    else if (opt.sort === 'price_asc' || opt.sort === 'price_desc') qb = qb.order('fixed_price', { ascending: opt.sort === 'price_asc', nullsFirst: false });
    else qb = qb.order('created_at', { ascending: false });
    const { data, count } = await run(qb.range(opt.offset, opt.offset + opt.limit - 1));
    return { rows: this.remember(data.map(mapProduct)), count: count || 0 };
  },
  async get(sku) {
    if (!isLive()) return getProduct(sku) || null;
    const { data } = await run(Backend.client.from('products').select(PRODUCT_COLS).eq('sku', String(sku).slice(0, 30)).maybeSingle());
    return data ? this.remember([mapProduct(data)])[0] : null;
  },
  async bySkus(skus) {
    const list = [...new Set(skus)].filter(Boolean).slice(0, 50);
    if (!list.length) return [];
    if (!isLive()) return list.map(getProduct).filter(Boolean);
    const { data } = await run(Backend.client.from('products').select(PRODUCT_COLS).in('sku', list));
    return this.remember(data.map(mapProduct));
  },
  async byUuids(ids) {
    const list = [...new Set(ids)].filter(Boolean).slice(0, 100);
    if (!list.length) return [];
    const { data } = await run(Backend.client.from('products').select(PRODUCT_COLS).in('id', list));
    return this.remember(data.map(mapProduct));
  }
};
function sortProducts(rows, sort) {
  const price = p => (p.price.mode === 'enquiry' ? null : p.price.amount);
  const by = {
    newest: (a, b) => b.addedOn.localeCompare(a.addedOn),
    name: (a, b) => L(a.name).localeCompare(L(b.name), lang === 'ta' ? 'ta' : 'en'),
    price_asc: (a, b) => (price(a) == null) - (price(b) == null) || (price(a) || 0) - (price(b) || 0),
    price_desc: (a, b) => (price(a) == null) - (price(b) == null) || (price(b) || 0) - (price(a) || 0)
  };
  return rows.slice().sort(by[sort] || by.newest);
}

/* ---------- authentication (Supabase Auth: email + password) ---------- */
const Auth = {
  user: null, profile: null, wishlist: new Set(), isAdmin: false, isStaff: false, recovery: false, listeners: [],
  onChange(fn) { this.listeners.push(fn); },
  async init() {
    if (!isLive()) return;
    const { data } = await Backend.client.auth.getSession();
    await this.applySession(data && data.session);
    Backend.client.auth.onAuthStateChange((event, session) => {
      // Supabase advises not to await other Supabase calls inside this callback.
      setTimeout(async () => {
        const before = this.user && this.user.id;
        if (event === 'PASSWORD_RECOVERY') this.recovery = true;
        await this.applySession(session);
        const after = this.user && this.user.id;
        if (before !== after || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') this.listeners.forEach(f => f(event));
      }, 0);
    });
  },
  async applySession(session) {
    this.user = session && session.user ? session.user : null;
    if (!this.user) { this.profile = null; this.wishlist = new Set(); this.isAdmin = false; this.isStaff = false; return; }
    await Promise.all([this.loadProfile(), this.loadWishlist()]).catch(() => { /* shown later as errors where used */ });
  },
  async loadProfile() {
    const { data } = await run(Backend.client.from('profiles').select('full_name,phone,town,preferred_language').eq('id', this.user.id).maybeSingle());
    this.profile = data || null;
  },
  async loadWishlist() {
    const { data } = await run(Backend.client.from('wishlists').select('product_id'));
    this.wishlist = new Set((data || []).map(r => r.product_id));
  },
  async loadRoles() {
    const [a, s] = await Promise.all([run(Backend.client.rpc('is_admin')), run(Backend.client.rpc('is_staff'))]);
    this.isAdmin = a.data === true; this.isStaff = s.data === true;
  },
  redirectUrl(hash) { return location.href.split('#')[0] + (hash || '#/account'); },
  async signUp({ email, password, fullName, phone }) {
    const { data, error } = await Backend.client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, preferred_language: lang }, emailRedirectTo: this.redirectUrl('#/account') }
    });
    if (error) throw authError(error);
    return { needsConfirmation: !data.session };   // true when "Confirm email" is enabled in Supabase
  },
  async signIn(email, password) {
    const { error } = await Backend.client.auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
    const { data } = await Backend.client.auth.getSession();
    await this.applySession(data.session);
  },
  async signOut() { await Backend.client.auth.signOut(); await this.applySession(null); },
  async sendReset(email) {
    const { error } = await Backend.client.auth.resetPasswordForEmail(email, { redirectTo: this.redirectUrl('#/account') });
    if (error) throw authError(error);
  },
  async setNewPassword(password) {
    const { error } = await Backend.client.auth.updateUser({ password });
    if (error) throw authError(error);
    this.recovery = false;
  },
  async updateProfile(fields) {
    const { data } = await run(Backend.client.from('profiles').update(fields).eq('id', this.user.id).select('full_name,phone,town,preferred_language').single());
    this.profile = data;
  }
};

/* ---------- wishlist ---------- */
const Wishlist = {
  has(p) { return isLive() ? Auth.wishlist.has(p.uuid) : getLocalWishlist().includes(p.id); },
  count() { return isLive() ? Auth.wishlist.size : getLocalWishlist().length; },
  async toggle(p) {
    if (!isLive()) { const l = getLocalWishlist(), on = l.includes(p.id); setLocalWishlist(on ? l.filter(x => x !== p.id) : l.concat(p.id)); return !on; }
    if (!Auth.user) throw new ApiError('login_required');
    if (Auth.wishlist.has(p.uuid)) {
      await run(Backend.client.from('wishlists').delete().eq('user_id', Auth.user.id).eq('product_id', p.uuid));
      Auth.wishlist.delete(p.uuid); return false;
    }
    await run(Backend.client.from('wishlists').insert({ user_id: Auth.user.id, product_id: p.uuid }));
    Auth.wishlist.add(p.uuid); return true;
  },
  async products() {
    if (!isLive()) return getLocalWishlist().map(getProduct).filter(Boolean);
    if (!Auth.user) return [];
    await Auth.loadWishlist();
    return Catalog.byUuids([...Auth.wishlist]);
  },
  async clear() {
    if (!isLive()) { setLocalWishlist([]); return; }
    await run(Backend.client.from('wishlists').delete().eq('user_id', Auth.user.id));
    Auth.wishlist = new Set();
  },
  /* after login: move items saved on this device into the account, then clear the device copy */
  async mergeLocal() {
    if (!isLive() || !Auth.user) return 0;
    const skus = getLocalWishlist(); if (!skus.length) return 0;
    const prods = await Catalog.bySkus(skus);
    const rows = prods.filter(p => !Auth.wishlist.has(p.uuid)).map(p => ({ user_id: Auth.user.id, product_id: p.uuid }));
    if (rows.length) await run(Backend.client.from('wishlists').upsert(rows, { onConflict: 'user_id,product_id', ignoreDuplicates: true }));
    setLocalWishlist([]); await Auth.loadWishlist(); return rows.length;
  }
};

/* ---------- order requests ---------- */
const Orders = {
  async create({ items, key, name, phone, note }) {
    // Only product IDs and quantities are sent. Prices and totals are computed by the database.
    const { data } = await run(Backend.client.rpc('create_order_request', {
      p_items: items.map(i => ({ product_id: i.uuid, quantity: i.qty })),
      p_idempotency_key: key, p_contact_name: name, p_contact_phone: phone, p_note: note || null
    }));
    return Array.isArray(data) ? data[0] : data;
  },
  async mine() {
    const { data } = await run(Backend.client.from('orders').select('id,order_number,status,priced_total,has_unpriced_items,items_count,created_at').order('created_at', { ascending: false }).limit(50));
    return data;
  },
  async get(id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
    const { data } = await run(Backend.client.from('orders').select('*,order_items(*),order_events(*)').eq('id', id).maybeSingle());
    return data;
  },
  async cancel(id, reason) { await run(Backend.client.rpc('cancel_my_order', { p_order_id: id, p_reason: reason || null })); },
  async adminList(o) {
    const opt = Object.assign({ status: 'all', q: '', limit: 25, offset: 0 }, o);
    let qb = Backend.client.from('orders').select('id,order_number,status,contact_name,contact_phone,priced_total,has_unpriced_items,items_count,created_at', { count: 'exact' });
    if (opt.status !== 'all') qb = qb.eq('status', opt.status);
    const term = cleanTerm(opt.q);
    if (term) qb = qb.or('order_number.ilike.*' + term + '*,contact_name.ilike.*' + term + '*,contact_phone.ilike.*' + term + '*');
    const { data, count } = await run(qb.order('created_at', { ascending: false }).range(opt.offset, opt.offset + opt.limit - 1));
    return { rows: data, count: count || 0 };
  },
  async setStatus(id, status, note) { await run(Backend.client.rpc('admin_update_order_status', { p_order_id: id, p_status: status, p_note: note || null })); },
  async setNote(id, note) { await run(Backend.client.rpc('admin_set_order_note', { p_order_id: id, p_note: note || null })); }
};

/* ---------- admin catalogue management (database RLS allows admins only) ---------- */
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const IMAGE_MAX = 5 * 1024 * 1024;
const AdminApi = {
  async categoriesAll() { const { data } = await run(Backend.client.from('categories').select('*').order('sort_order')); return data; },
  async saveCategory(id, fields, isNew) {
    if (isNew) await run(Backend.client.from('categories').insert(Object.assign({ id }, fields)));
    else await run(Backend.client.from('categories').update(fields).eq('id', id));
    await Catalog.init();
  },
  async productRow(uuid) {
    const { data } = await run(Backend.client.from('products').select(PRODUCT_COLS).eq('id', uuid).maybeSingle());
    return data;
  },
  async saveProduct(uuid, fields) {
    const q = uuid ? Backend.client.from('products').update(fields).eq('id', uuid) : Backend.client.from('products').insert(fields);
    const { data } = await run(q.select('id').single());
    return data.id;
  },
  async setPublished(uuid, on) { await run(Backend.client.from('products').update({ is_published: !!on }).eq('id', uuid)); },
  validateImage(file) {
    if (!file || !IMAGE_TYPES[file.type]) throw new ApiError('file_type');
    if (file.size > IMAGE_MAX) throw new ApiError('file_size');
  },
  async uploadImage(productUuid, file, sortOrder) {
    this.validateImage(file);
    const rand = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).replace(/-/g, '').slice(0, 12);
    const path = 'products/' + productUuid + '/' + Date.now() + '-' + rand + '.' + IMAGE_TYPES[file.type];
    const up = await Backend.client.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
    if (up.error) throw toApiError(up.error);
    try {
      await run(Backend.client.from('product_images').insert({ product_id: productUuid, storage_path: path, sort_order: Math.min(100, sortOrder || 0) }));
    } catch (e) {
      await Backend.client.storage.from('product-images').remove([path]);   // keep storage and table consistent
      throw e;
    }
  },
  async deleteImage(img) {
    await run(Backend.client.from('product_images').delete().eq('id', img.id));
    await Backend.client.storage.from('product-images').remove([img.path]);
  },
  async storeCounts() {
    const c = Backend.client;
    const head = q => run(q).then(r => r.count || 0);
    const [published, drafts, requested, open] = await Promise.all([
      head(c.from('products').select('id', { count: 'exact', head: true }).eq('is_published', true)),
      head(c.from('products').select('id', { count: 'exact', head: true }).eq('is_published', false)),
      head(c.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'requested')),
      head(c.from('orders').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'ready']))
    ]);
    return { published, drafts, requested, open };
  }
};

/* ---------- small UI helpers shared by both apps ---------- */
function errorBlock(e, retryAction) {
  return '<div class="empty" role="alert">' + ic('alert') + '<h3>' + t('err_server').split('.')[0] + '</h3><p>' + esc(errorText(e)) + '</p>' +
    '<button class="btn btn-outline" data-action="' + (retryAction || 'retry') + '">' + ic('refresh') + t('retry') + '</button></div>';
}
function configErrorPage() {
  return '<main class="main" style="max-width:560px;margin:0 auto;padding-top:48px"><section class="panel"><h1 class="h1">' + t('configErrorTitle') + '</h1>' +
    '<div class="note note--err">' + ic('alert') + '<span>' + t('cfg_' + Backend.configError) + '</span></div></section></main>';
}
/* Fill a container after an async load, ignoring results that arrive after the user has moved on. */
async function fillAsync(sel, token, loader, renderer, retryAction) {
  try {
    const result = await loader();
    if (token !== renderToken) return;
    const el = $(sel); if (el) el.innerHTML = renderer(result);
  } catch (e) {
    if (token !== renderToken) return;
    const el = $(sel); if (el) el.innerHTML = errorBlock(toApiError(e), retryAction);
    if (window.console) console.warn('[data]', e && (e.detail || e.message));
  }
}
ACTIONS.retry = () => render();

/* Login labels shared by the customer and admin apps */
addStrings({
  emailLabel: 'Email address',
  passwordLabel: 'Password',
  loginBtn: 'Log in',
  logoutBtn: 'Log out',
  errEmail: 'Enter a valid email address.',
  errPasswordShort: 'Use at least 8 characters.'
}, {
  emailLabel: 'மின்னஞ்சல் முகவரி',
  passwordLabel: 'கடவுச்சொல்',
  loginBtn: 'உள்நுழை',
  logoutBtn: 'வெளியேறு',
  errEmail: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
  errPasswordShort: 'குறைந்தது 8 எழுத்துகள் பயன்படுத்தவும்.'
});

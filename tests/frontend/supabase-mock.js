/* =====================================================================
   TEST-ONLY stand-in for js/vendor/supabase.js (never deployed).
   The browser tests swap it in to click through the Supabase-mode screens
   without a real project. Data lives in localStorage ("mock_db") so it
   survives page reloads and the jump between index.html and admin.html.
   Row rules here are a SIMPLIFIED imitation of the real RLS — the real
   security is proven by supabase/tests/security_tests.sql.
   ===================================================================== */
(function () {
  const KEY = 'mock_db', SKEY = 'mock_session';
  const now = () => new Date().toISOString();
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  function seed() {
    const cats = [['rings', 'Gold Rings', 'தங்க மோதிரங்கள்', 10, true], ['chains', 'Gold Chains', 'தங்கச் சங்கிலிகள்', 20, true], ['necklaces', 'Necklaces', 'நெக்லஸ்கள்', 30, true], ['silver', 'Silver Jewellery', 'வெள்ளி நகைகள்', 90, true], ['hidden-cat', 'Hidden', 'மறைவு', 99, false]]
      .map(([id, en, ta, o, v]) => ({ id, name_en: en, name_ta: ta, sort_order: o, is_visible: v, created_at: now(), updated_at: now() }));
    const P = (o) => Object.assign({ id: uuid(), description_en: 'Store product.', description_ta: 'கடைப் பொருள்.', stone_weight_g: null, making_charge: null, stone_charge: null, price_mode: 'enquiry', fixed_price: null, stock_status: 'in_stock', stock_qty: 1, max_order_qty: 1, tags: [], is_published: true, created_at: now(), updated_at: now() }, o);
    const products = [
      P({ sku: 'STM-R1001', category_id: 'rings', name_en: 'Peacock Ring', name_ta: 'மயில் மோதிரம்', purity: '22K', gross_weight_g: '4.500', net_weight_g: '4.300', stone_weight_g: '0.200', making_charge: '850.00', tags: ['new', 'featured'] }),
      P({ sku: 'STM-C2001', category_id: 'chains', name_en: 'Box Chain', name_ta: 'பாக்ஸ் சங்கிலி', purity: '22K', gross_weight_g: '8.000', net_weight_g: '8.000', tags: ['popular'] }),
      P({ sku: 'STM-S3001', category_id: 'silver', name_en: 'Silver Anklets', name_ta: 'வெள்ளிக் கொலுசு', purity: '925', gross_weight_g: '40.000', net_weight_g: '40.000', price_mode: 'fixed', fixed_price: '4500.00', stock_qty: 3, max_order_qty: 3, tags: ['popular', 'new'] }),
      P({ sku: 'STM-S3002', category_id: 'silver', name_en: 'Silver Toe Rings', name_ta: 'வெள்ளி மெட்டி', purity: '925', gross_weight_g: '6.000', net_weight_g: '6.000', price_mode: 'fixed', fixed_price: '700.00', stock_qty: 10, max_order_qty: 5 }),
      P({ sku: 'STM-N4001', category_id: 'necklaces', name_en: 'Bridal Necklace', name_ta: 'மணப்பெண் நெக்லஸ்', purity: '22K', gross_weight_g: '40.000', net_weight_g: '37.000', stone_weight_g: '3.000', stock_status: 'out_of_stock', stock_qty: 0, tags: ['bridal'] }),
      P({ sku: 'STM-DRAFT1', category_id: 'rings', name_en: 'Draft Ring', name_ta: 'வரைவு மோதிரம்', purity: '18K', is_published: false }),
      P({ sku: 'STM-HID01', category_id: 'hidden-cat', name_en: 'Hidden Category Item', name_ta: 'மறைவு', purity: '22K' })
    ];
    const users = [
      { id: 'u-admin', email: 'admin@test.local', password: 'AdminPass123', meta: { full_name: 'Store Admin' } },
      { id: 'u-staff', email: 'staff@test.local', password: 'StaffPass123', meta: { full_name: 'Store Staff' } },
      { id: 'u-b', email: 'b@test.local', password: 'CustomerB123', meta: { full_name: 'Customer B', phone: '9123456780' } }
    ];
    const db = { categories: cats, products, product_images: [], wishlists: [], orders: [], order_items: [], order_events: [], users,
      profiles: users.map(u => ({ id: u.id, full_name: u.meta.full_name, phone: u.meta.phone || null, town: null, preferred_language: 'ta', created_at: now(), updated_at: now() })),
      user_roles: [{ user_id: 'u-admin', role: 'admin' }, { user_id: 'u-staff', role: 'staff' }], storage: {}, seq: 1001, fail: {} };
    const bOrder = { id: uuid(), order_number: 'STM-2026-001000', customer_id: 'u-b', status: 'requested', fulfilment: 'store_pickup', contact_name: 'Customer B', contact_phone: '9123456780', customer_note: null, items_count: 1, priced_total: '0.00', has_unpriced_items: true, payment_status: 'unpaid', idempotency_key: uuid(), admin_note: null, created_at: now(), updated_at: now() };
    db.orders.push(bOrder);
    db.order_items.push({ id: uuid(), order_id: bOrder.id, product_id: products[1].id, product_sku: 'STM-C2001', name_en: 'Box Chain', name_ta: 'பாக்ஸ் சங்கிலி', purity: '22K', gross_weight_g: '8.000', net_weight_g: '8.000', price_mode: 'enquiry', unit_price: null, quantity: 1, line_total: null, created_at: now() });
    db.order_events.push({ id: 1, order_id: bOrder.id, from_status: null, to_status: 'requested', note: null, actor_id: 'u-b', actor_role: 'customer', created_at: now() });
    return db;
  }
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { return seed(); } };
  let db = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  save();
  let session = JSON.parse(localStorage.getItem(SKEY) || 'null');
  const listeners = [];
  const uid = () => session && session.user.id;
  const hasRole = r => db.user_roles.some(x => x.user_id === uid() && x.role === r);
  const isAdmin = () => hasRole('admin'), isStaff = () => hasRole('admin') || hasRole('staff');
  const catVisible = id => { const c = db.categories.find(x => x.id === id); return !!(c && c.is_visible); };
  const prodVisible = p => (p.is_published && catVisible(p.category_id)) || isAdmin();
  const orderVisible = o => o && (o.customer_id === uid() || isStaff());
  const canSee = {
    categories: r => r.is_visible || isAdmin(), products: prodVisible,
    product_images: r => { const p = db.products.find(x => x.id === r.product_id); return !!p && prodVisible(p); },
    wishlists: r => !!uid() && r.user_id === uid(), profiles: r => !!uid() && (r.id === uid() || isStaff()),
    orders: r => !!uid() && orderVisible(r), order_items: r => !!uid() && orderVisible(db.orders.find(o => o.id === r.order_id)),
    order_events: r => !!uid() && orderVisible(db.orders.find(o => o.id === r.order_id)), user_roles: r => r.user_id === uid() || isAdmin()
  };
  const denied = () => ({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
  const embed = (table, row, cols) => {
    const r = Object.assign({}, row);
    if (table === 'products' && /product_images\(/.test(cols)) r.product_images = db.product_images.filter(i => i.product_id === row.id);
    if (table === 'orders' && /order_items\(/.test(cols)) r.order_items = db.order_items.filter(i => i.order_id === row.id);
    if (table === 'orders' && /order_events\(/.test(cols)) r.order_events = db.order_events.filter(i => i.order_id === row.id);
    return r;
  };
  class Q {
    constructor(table) { this.t = table; this.op = 'select'; this.f = []; this.cols = '*'; this.opts = {}; this.ord = null; this.rng = null; this.one = null; this.wantRows = false; }
    select(cols, opts) { if (this.op !== 'select') this.wantRows = true; else { this.cols = cols || '*'; this.opts = opts || {}; } return this; }
    eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
    in(c, vals) { this.f.push(r => vals.map(String).includes(String(r[c]))); return this; }
    contains(c, arr) { this.f.push(r => arr.every(x => (r[c] || []).includes(x))); return this; }
    or(expr) {
      const parts = expr.split(',').map(p => p.split('.')).map(([c, op, ...v]) => [c, v.join('.').replace(/\*/g, '').toLowerCase()]);
      this.f.push(r => parts.some(([c, v]) => String(r[c] || '').toLowerCase().includes(v))); return this;
    }
    order(c, o) { this.ord = [c, !o || o.ascending !== false]; return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    limit(n) { this.rng = [0, n - 1]; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    single() { this.one = 'single'; return this; }
    insert(rows) { this.op = 'insert'; this.rows = [].concat(rows); return this; }
    upsert(rows) { this.op = 'upsert'; this.rows = [].concat(rows); return this; }
    update(vals) { this.op = 'update'; this.vals = vals; return this; }
    delete() { this.op = 'delete'; return this; }
    then(res, rej) { return new Promise(r => setTimeout(r, 30)).then(() => this.exec()).then(res, rej); }
    exec() {
      const t = this.t, table = db[t];
      if (db.fail[t]) return { data: null, error: { message: 'Failed to fetch' } };
      if (!table) return { data: null, error: { message: 'relation does not exist' } };
      const see = canSee[t] || (() => true);
      if (this.op === 'select') {
        if (['wishlists', 'orders', 'order_items', 'order_events', 'profiles'].includes(t) && !uid()) return { data: null, error: { code: '42501', message: 'permission denied for table ' + t } };
        let rows = table.filter(see).filter(r => this.f.every(f => f(r)));
        if (this.ord) { const [c, asc] = this.ord; rows.sort((a, b) => { const x = a[c], y = b[c]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; const n = (!isNaN(x) && !isNaN(y)) ? Number(x) - Number(y) : String(x).localeCompare(String(y)); return asc ? n : -n; }); }
        const count = rows.length;
        if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
        rows = rows.map(r => embed(t, r, this.cols));
        if (this.opts.head) return { data: null, count, error: null };
        if (this.one) { if (rows.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } }; if (!rows.length && this.one === 'single') return { data: null, error: { code: 'PGRST116', message: 'no rows' } }; return { data: rows[0] || null, error: null, count }; }
        return { data: rows, count, error: null };
      }
      if (this.op === 'insert' || this.op === 'upsert') {
        const out = [];
        for (const raw of this.rows) {
          const row = Object.assign({}, raw);
          if (t === 'wishlists') {
            const p = db.products.find(x => x.id === row.product_id);
            if (row.user_id !== uid() || !p || !p.is_published) return denied();
            if (db.wishlists.some(w => w.user_id === row.user_id && w.product_id === row.product_id)) { if (this.op === 'upsert') continue; return { data: null, error: { code: '23505', message: 'duplicate key' } }; }
            row.created_at = now();
          } else if (['products', 'categories', 'product_images'].includes(t)) {
            if (!isAdmin()) return denied();
            if (t === 'products') {
              if (db.products.some(x => x.sku === row.sku)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "products_sku_key"' } };
              Object.assign(row, { id: uuid(), created_at: now(), updated_at: now() }, row.id ? {} : {});
            }
            if (t === 'categories' && db.categories.some(x => x.id === row.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
            if (t === 'product_images') row.id = uuid();
          } else return { data: null, error: { code: '42501', message: 'permission denied for table ' + t } };
          table.push(row); out.push(row);
        }
        save();
        return this.one ? { data: out[0] || null, error: null } : { data: this.wantRows ? out : null, error: null };
      }
      if (this.op === 'update') {
        if (t === 'profiles') { const allowed = ['full_name', 'phone', 'town', 'preferred_language']; if (Object.keys(this.vals).some(k => !allowed.includes(k))) return { data: null, error: { code: '42501', message: 'permission denied for table profiles' } }; }
        else if (['products', 'categories', 'product_images'].includes(t)) { if (!isAdmin()) { return this.one ? { data: null, error: { code: 'PGRST116', message: 'no rows' } } : { data: null, error: null }; } }
        else return { data: null, error: { code: '42501', message: 'permission denied for table ' + t } };
        const rows = table.filter(see).filter(r => this.f.every(f => f(r))).filter(r => t !== 'profiles' || r.id === uid());
        rows.forEach(r => Object.assign(r, this.vals, { updated_at: now() }));
        save();
        if (this.one) return rows.length ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
        return { data: null, error: null };
      }
      if (this.op === 'delete') {
        if (['products', 'categories', 'product_images'].includes(t) && !isAdmin()) return { data: null, error: null };
        if (t !== 'wishlists' && !['products', 'categories', 'product_images'].includes(t)) return { data: null, error: { code: '42501', message: 'permission denied for table ' + t } };
        const keep = table.filter(r => !(see(r) && this.f.every(f => f(r))));
        db[t] = keep; save();
        return { data: null, error: null };
      }
    }
  }
  const err = m => ({ data: null, error: { message: m } });
  function createOrder(a) {
    if (!uid()) return err('not_authenticated');
    const dup = db.orders.find(o => o.customer_id === uid() && o.idempotency_key === a.p_idempotency_key);
    if (dup) return { data: [{ order_id: dup.id, order_number: dup.order_number, status: dup.status, priced_total: dup.priced_total, has_unpriced_items: dup.has_unpriced_items, is_duplicate: true }], error: null };
    const phone = String(a.p_contact_phone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) return err('invalid_contact_phone');
    let total = 0, unpriced = false; const lines = [];
    for (const it of a.p_items) {
      const p = db.products.find(x => x.id === it.product_id && x.is_published && catVisible(x.category_id));
      if (!p) return err('product_unavailable:' + it.product_id);
      if (p.stock_status === 'out_of_stock') return err('product_out_of_stock:' + p.sku);
      if (it.quantity > p.max_order_qty) return err('quantity_exceeds_limit:' + p.sku);
      if (p.stock_status === 'in_stock' && it.quantity > p.stock_qty) return err('insufficient_stock:' + p.sku);
      const unit = p.price_mode === 'fixed' ? Number(p.fixed_price) : null;   // price from the "database", never from the request
      if (unit == null) unpriced = true; else total += unit * it.quantity;
      lines.push({ p, q: it.quantity, unit });
    }
    const o = { id: uuid(), order_number: 'STM-2026-' + String(db.seq++).padStart(6, '0'), customer_id: uid(), status: 'requested', fulfilment: 'store_pickup', contact_name: a.p_contact_name, contact_phone: phone, customer_note: a.p_note, items_count: lines.length, priced_total: total.toFixed(2), has_unpriced_items: unpriced, payment_status: 'unpaid', idempotency_key: a.p_idempotency_key, admin_note: null, created_at: now(), updated_at: now() };
    db.orders.push(o);
    lines.forEach(l => db.order_items.push({ id: uuid(), order_id: o.id, product_id: l.p.id, product_sku: l.p.sku, name_en: l.p.name_en, name_ta: l.p.name_ta, purity: l.p.purity, gross_weight_g: l.p.gross_weight_g, net_weight_g: l.p.net_weight_g, price_mode: l.p.price_mode, unit_price: l.unit == null ? null : l.unit.toFixed(2), quantity: l.q, line_total: l.unit == null ? null : (l.unit * l.q).toFixed(2), created_at: now() }));
    db.order_events.push({ id: Date.now(), order_id: o.id, from_status: null, to_status: 'requested', note: null, actor_id: uid(), actor_role: 'customer', created_at: now() });
    save();
    return { data: [{ order_id: o.id, order_number: o.order_number, status: o.status, priced_total: o.priced_total, has_unpriced_items: unpriced, is_duplicate: false }], error: null };
  }
  const NEXT = { requested: ['confirmed', 'rejected', 'cancelled'], confirmed: ['ready', 'cancelled'], ready: ['completed', 'cancelled'] };
  function rpc(name, a) {
    a = a || {};
    if (db.fail.rpc) return err('Failed to fetch');
    if (name === 'is_admin') return { data: isAdmin(), error: null };
    if (name === 'is_staff') return { data: isStaff(), error: null };
    if (name === 'create_order_request') return createOrder(a);
    if (name === 'cancel_my_order') {
      const o = db.orders.find(x => x.id === a.p_order_id && x.customer_id === uid()); if (!o) return err('order_not_found');
      if (o.status !== 'requested') return err('order_not_cancellable');
      db.order_events.push({ id: Date.now(), order_id: o.id, from_status: o.status, to_status: 'cancelled', note: a.p_reason, actor_id: uid(), actor_role: 'customer', created_at: now() });
      o.status = 'cancelled'; save(); return { data: 'cancelled', error: null };
    }
    if (name === 'admin_update_order_status') {
      if (!isStaff()) return err('not_authorized');
      const o = db.orders.find(x => x.id === a.p_order_id); if (!o) return err('order_not_found');
      if (!(NEXT[o.status] || []).includes(a.p_status)) return err('invalid_status_transition:' + o.status + '->' + a.p_status);
      db.order_events.push({ id: Date.now(), order_id: o.id, from_status: o.status, to_status: a.p_status, note: a.p_note, actor_id: uid(), actor_role: isAdmin() ? 'admin' : 'staff', created_at: now() });
      o.status = a.p_status; save(); return { data: a.p_status, error: null };
    }
    if (name === 'admin_set_order_note') { if (!isStaff()) return err('not_authorized'); const o = db.orders.find(x => x.id === a.p_order_id); o.admin_note = a.p_note; save(); return { data: null, error: null }; }
    return err('function not found');
  }
  const emit = (ev) => listeners.forEach(cb => cb(ev, session));
  const setSession = s => { session = s; localStorage.setItem(SKEY, JSON.stringify(s)); };
  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    async signUp({ email, password, options }) {
      await new Promise(r => setTimeout(r, 30));
      if (db.fail.auth) return { data: {}, error: { message: 'Failed to fetch' } };
      if (password.length < 8) return { data: {}, error: { message: 'Password should be at least 8 characters', code: 'weak_password' } };
      if (db.users.some(u => u.email === email)) return { data: {}, error: { message: 'User already registered', code: 'user_already_exists' } };
      const u = { id: uuid(), email, password, meta: (options && options.data) || {} };
      db.users.push(u);
      db.profiles.push({ id: u.id, full_name: u.meta.full_name || null, phone: /^[6-9]\d{9}$/.test(u.meta.phone || '') ? u.meta.phone : null, town: null, preferred_language: u.meta.preferred_language || 'ta', created_at: now(), updated_at: now() });
      save();
      if (db.requireConfirm) return { data: { user: { id: u.id, email }, session: null }, error: null };
      setSession({ user: { id: u.id, email } }); emit('SIGNED_IN');
      return { data: { user: { id: u.id, email }, session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      await new Promise(r => setTimeout(r, 30));
      const u = db.users.find(x => x.email === email && x.password === password);
      if (!u) return { data: {}, error: { message: 'Invalid login credentials', code: 'invalid_credentials' } };
      setSession({ user: { id: u.id, email } }); emit('SIGNED_IN');
      return { data: { session }, error: null };
    },
    async signOut() { setSession(null); emit('SIGNED_OUT'); return { error: null }; },
    async resetPasswordForEmail() { return { data: {}, error: null }; },
    async updateUser({ password }) { const u = db.users.find(x => x.id === uid()); if (u) u.password = password; save(); return { data: {}, error: null }; }
  };
  const storage = {
    from(bucket) {
      return {
        async upload(path, file, o) {
          if (!isAdmin()) return { data: null, error: { message: 'new row violates row-level security policy', statusCode: '403' } };
          if (!/^products\//.test(path)) return { data: null, error: { message: 'new row violates row-level security policy' } };
          db.storage[path] = { type: o.contentType, size: file.size }; save(); return { data: { path }, error: null };
        },
        async remove(paths) { if (!isAdmin()) return { data: null, error: { message: 'denied' } }; paths.forEach(p => delete db.storage[p]); save(); return { data: [], error: null }; }
      };
    }
  };
  window.supabase = { createClient: () => ({ from: t => new Q(t), rpc: (n, a) => new Promise(r => setTimeout(() => r(rpc(n, a)), 30)), auth, storage }) };
  window.__mockDb = () => db;
  window.__mockSet = (k, v) => { db[k] = v; save(); };
}());

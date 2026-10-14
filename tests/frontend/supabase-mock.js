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
      user_roles: [{ user_id: 'u-admin', role: 'admin' }, { user_id: 'u-staff', role: 'staff' }], storage: {}, seq: 1001, fail: {},
      savings_schemes: [['dhanalakshmi', 'Dhanalakshmi Gold Savings Scheme', 'தனலட்சுமி தங்கச் சேமிப்புத் திட்டம்', 10], ['kuber', 'Kuber Lakshmi Gold Savings Scheme', 'குபேர லட்சுமி தங்கச் சேமிப்புத் திட்டம்', 20]]
        .map(([id, en, ta, o]) => ({ id, name_en: en, name_ta: ta, description_en: 'Scheme terms are awaiting the shop owner\'s official approval.', description_ta: 'திட்ட விதிமுறைகள் கடை உரிமையாளரின் அதிகாரப்பூர்வ ஒப்புதலுக்காகக் காத்திருக்கின்றன.',
          contribution_type: null, duration_months: null, min_installment: null, max_installment: null, allowed_fixed_amounts: null, payment_window_start_day: null, payment_window_end_day: null,
          gold_conversion: 'none', conversion_purity: null, redemption_after_months: null, terms_en: null, terms_ta: null, approval_status: 'draft', approval_note: null, approved_by: null, approved_at: null,
          terms_version: 0, enrollment_open: false, sort_order: o, created_at: now(), updated_at: now() })),
      savings_enrollments: [], savings_installments: [], savings_payments: [], savings_redemptions: [], gold_rates: [], audit_logs: [],
      svSeq: { enr: 1001, rc: 100001, rd: 1001, rate: 1, audit: 1 } };
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
    order_events: r => !!uid() && orderVisible(db.orders.find(o => o.id === r.order_id)), user_roles: r => r.user_id === uid() || isAdmin(),
    gold_rates: r => r.status === 'active' || isStaff(),
    savings_enrollments: r => !!uid() && (r.customer_id === uid() || isStaff()), savings_payments: r => !!uid() && (r.customer_id === uid() || isStaff()),
    savings_redemptions: r => !!uid() && (r.customer_id === uid() || isStaff()),
    savings_installments: r => { const e = db.savings_enrollments.find(x => x.id === r.enrollment_id); return !!uid() && !!e && (e.customer_id === uid() || isStaff()); },
    savings_enrollment_totals: r => { const e = db.savings_enrollments.find(x => x.id === r.enrollment_id); return !!uid() && !!e && (e.customer_id === uid() || isStaff()); },
    audit_logs: () => isAdmin()
  };
  const PRIVATE = ['wishlists', 'orders', 'order_items', 'order_events', 'profiles', 'savings_enrollments', 'savings_payments', 'savings_redemptions', 'savings_installments', 'savings_enrollment_totals', 'audit_logs'];
  const pick = (row, cols) => row ? Object.fromEntries(cols.split(',').map(c => c.trim()).map(c => [c, row[c]])) : null;
  const embedOne = (cols, name) => { const m = cols.match(new RegExp(name + '\\(([^)]*)\\)')); return m ? m[1] : null; };
  function totalsRows() {
    return db.savings_enrollments.map(e => {
      const ps = db.savings_payments.filter(p => p.enrollment_id === e.id);
      const ver = ps.filter(p => p.status === 'verified'), pen = ps.filter(p => p.status === 'pending_verification');
      const sum = l => l.reduce((a, p) => a + Number(p.amount), 0);
      const w = ver.filter(p => p.gold_weight_g != null);
      return { enrollment_id: e.id, verified_total: sum(ver).toFixed(2), pending_total: sum(pen).toFixed(2), paid_count: ver.length, pending_count: pen.length,
        gold_weight_g: w.length ? w.reduce((a, p) => a + Number(p.gold_weight_g), 0).toFixed(3) : null };
    });
  }
  const denied = () => ({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
  const embed = (table, row, cols) => {
    const r = Object.assign({}, row);
    if (table === 'products' && /product_images\(/.test(cols)) r.product_images = db.product_images.filter(i => i.product_id === row.id);
    if (table === 'orders' && /order_items\(/.test(cols)) r.order_items = db.order_items.filter(i => i.order_id === row.id);
    if (table === 'orders' && /order_events\(/.test(cols)) r.order_events = db.order_events.filter(i => i.order_id === row.id);
    let c;
    if ((c = embedOne(cols, 'profiles'))) r.profiles = pick(db.profiles.find(p => p.id === row.customer_id), c);
    if ((c = embedOne(cols, 'savings_enrollments'))) r.savings_enrollments = pick(db.savings_enrollments.find(e => e.id === row.enrollment_id), c);
    if ((c = embedOne(cols, 'savings_installments'))) r.savings_installments = pick(db.savings_installments.find(i => i.id === row.installment_id), c);
    return r;
  };
  class Q {
    constructor(table) { this.t = table; this.op = 'select'; this.f = []; this.cols = '*'; this.opts = {}; this.ord = null; this.rng = null; this.one = null; this.wantRows = false; }
    select(cols, opts) { if (this.op !== 'select') this.wantRows = true; else { this.cols = cols || '*'; this.opts = opts || {}; } return this; }
    eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
    in(c, vals) { this.f.push(r => vals.map(String).includes(String(r[c]))); return this; }
    ilike(c, pat) { const v = String(pat).replace(/\*/g, '').toLowerCase(); this.f.push(r => String(r[c] || '').toLowerCase().includes(v)); return this; }
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
      const t = this.t, table = t === 'savings_enrollment_totals' ? totalsRows() : db[t];
      if (db.fail[t]) return { data: null, error: { message: 'Failed to fetch' } };
      if (!table) return { data: null, error: { message: 'relation does not exist' } };
      const see = canSee[t] || (() => true);
      if (this.op === 'select') {
        if (PRIVATE.includes(t) && !uid()) return { data: null, error: { code: '42501', message: 'permission denied for table ' + t } };
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
          } else if (t === 'savings_schemes') {
            if (!isAdmin()) return denied();
            if (db.savings_schemes.some(x => x.id === row.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
            Object.assign(row, { approval_status: 'draft', approved_by: null, approved_at: null, approval_note: null, enrollment_open: false, terms_version: 0, created_at: now(), updated_at: now() });
            svAudit(t, 'INSERT', null, row);
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
        else if (t === 'savings_schemes') {
          if (Object.keys(this.vals).some(k => /^approv|terms_version/.test(k))) return { data: null, error: { code: '42501', message: 'permission denied for table savings_schemes' } };
          if (!isAdmin()) return { data: null, error: null };
          const TERMS = ['contribution_type', 'duration_months', 'min_installment', 'max_installment', 'allowed_fixed_amounts', 'payment_window_start_day', 'payment_window_end_day', 'gold_conversion', 'conversion_purity', 'redemption_after_months', 'terms_en', 'terms_ta', 'name_en', 'name_ta'];
          const rows = table.filter(r => this.f.every(f => f(r)));
          for (const r of rows) {
            const old = Object.assign({}, r), next = Object.assign({}, r, this.vals);
            if (next.enrollment_open && next.approval_status !== 'approved') return { data: null, error: { code: '23514', message: 'new row violates check constraint "savings_schemes_open_needs_approval"' } };
            if (r.approval_status === 'approved' && TERMS.some(k => JSON.stringify(old[k]) !== JSON.stringify(next[k]))) Object.assign(next, { approval_status: 'draft', approved_by: null, approved_at: null, enrollment_open: false, approval_note: 'Terms changed after approval — needs approval again' });
            Object.assign(r, next, { updated_at: now() }); svAudit(t, 'UPDATE', old, r);
          }
          save(); return { data: null, error: null };
        }
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
    const sv = savingsRpc(name, a); if (sv) return sv;
    if (name === 'admin_set_order_note') { if (!isStaff()) return err('not_authorized'); const o = db.orders.find(x => x.id === a.p_order_id); o.admin_note = a.p_note; save(); return { data: null, error: null }; }
    return err('function not found');
  }
  /* ---------- Phase 5 savings (simplified imitation of migration 6) ---------- */
  function svAudit(table, action, oldRow, newRow) {
    db.audit_logs.push({ id: db.svSeq.audit++, actor_id: uid() || null, table_name: table, record_id: String((newRow || oldRow || {}).id || ''), action,
      old_data: oldRow ? JSON.parse(JSON.stringify(oldRow)) : null, new_data: newRow ? JSON.parse(JSON.stringify(newRow)) : null, created_at: now() });
  }
  const istDate = ms => new Date(ms + 330 * 60000).toISOString().slice(0, 10);   // the database works in Asia/Kolkata dates
  const today = () => istDate(Date.now());
  const daysAgo = n => istDate(Date.now() - n * 864e5);
  const ymd = (y, m) => y + '-' + String(m).padStart(2, '0') + '-01';
  const addMonths = (d, n) => { const [y, m] = d.split('-').map(Number); const t = (m - 1) + n; return ymd(y + Math.floor(t / 12), (t % 12) + 1); };
  const year = () => new Date().getFullYear();
  const termsDone = s => s.contribution_type && s.duration_months && (s.contribution_type !== 'fixed' || (s.allowed_fixed_amounts || []).length || s.min_installment != null) && (s.contribution_type !== 'flexible' || s.min_installment != null) && (s.terms_en || '').trim().length >= 20 && (s.terms_ta || '').trim().length >= 20;
  const fixedOk = (s, amt) => { amt = Number(amt); if (!(amt > 0)) return false; const list = (s.allowed_fixed_amounts || []).map(Number);
    return list.length ? list.includes(amt) : (s.min_installment != null && amt >= Number(s.min_installment) && (s.max_installment == null || amt <= Number(s.max_installment))); };
  const amountErr = (e, i, amt) => {
    if (!(amt > 0) || Math.round(amt * 100) !== amt * 100) return 'invalid_amount';
    if (e.contribution_type === 'fixed') return Number(amt) !== Number(i.expected_amount || e.fixed_amount) ? 'amount_mismatch' : null;
    if (e.min_installment != null && amt < Number(e.min_installment)) return 'amount_out_of_range';
    if (e.max_installment != null && amt > Number(e.max_installment)) return 'amount_out_of_range';
    return null;
  };
  function conversion(e, amount, paidOn) {
    if (e.gold_conversion === 'none') return {};
    let pool = db.gold_rates.filter(g => g.purity === e.conversion_purity && g.status === 'active' && g.effective_at <= now());
    if (e.gold_conversion === 'payment_date_rate') {
      const ist = iso => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10);   // IST calendar date
      pool = pool.filter(g => ist(g.effective_at) === paidOn);
    }
    const r = pool.sort((a, b) => b.effective_at.localeCompare(a.effective_at) || b.id - a.id)[0];
    if (!r) return { err: e.gold_conversion === 'payment_date_rate' ? 'gold_rate_missing_for_date' : 'gold_rate_missing' };
    return { gold_rate_id: r.id, gold_purity: r.purity, gold_rate_per_g: r.rate_per_gram, gold_weight_g: (Math.round(amount / Number(r.rate_per_gram) * 1000) / 1000).toFixed(3) };
  }
  const receipt = () => 'STM-RC-' + year() + '-' + String(db.svSeq.rc++).padStart(6, '0');
  const ok = d => { save(); return { data: d === undefined ? null : d, error: null }; };
  function newEnrollment(cid, s, amount, by) {
    const e = { id: uuid(), enrollment_number: 'SV-' + year() + '-' + String(db.svSeq.enr++).padStart(5, '0'), customer_id: cid, scheme_id: s.id, status: 'pending_approval', start_month: null,
      duration_months: s.duration_months, contribution_type: s.contribution_type, fixed_amount: amount == null ? null : Number(amount).toFixed(2), min_installment: s.min_installment, max_installment: s.max_installment,
      gold_conversion: s.gold_conversion, conversion_purity: s.conversion_purity, terms_snapshot: JSON.parse(JSON.stringify(s)), terms_approved_at: s.approved_at, terms_version: s.terms_version,
      requested_by: by, requested_at: now(), decided_by: null, decided_at: null, decision_note: null, created_at: now(), updated_at: now() };
    db.savings_enrollments.push(e); svAudit('savings_enrollments', 'INSERT', null, e); return e;
  }
  function activate(e, start) {
    if (!/^\d{4}-\d{2}-01$/.test(start || '')) return 'invalid_start_month';
    const old = Object.assign({}, e); e.status = 'active'; e.start_month = start; svAudit('savings_enrollments', 'UPDATE', old, e);
    for (let n = 1; n <= e.duration_months; n++) db.savings_installments.push({ id: uuid(), enrollment_id: e.id, installment_no: n, due_month: addMonths(start, n - 1), expected_amount: e.fixed_amount, status: 'pending_payment', created_at: now(), updated_at: now() });
    return null;
  }
  const activePayFor = id => db.savings_payments.find(p => p.installment_id === id && ['pending_verification', 'verified'].includes(p.status));
  const refUsed = ref => db.savings_payments.some(p => p.upi_reference === ref && ['pending_verification', 'verified'].includes(p.status));
  const updPay = (p, vals) => { const old = Object.assign({}, p); Object.assign(p, vals); svAudit('savings_payments', 'UPDATE', old, p); };
  const setInst = (id, st) => { const i = db.savings_installments.find(x => x.id === id); if (i) i.status = st; };
  function savingsRpc(name, a) {
    const need = () => !uid() ? err('not_authenticated') : null;
    const admin = () => need() || (!isAdmin() ? err('forbidden') : null);
    const staff = () => need() || (!isStaff() ? err('forbidden') : null);
    const reason = (v, n) => String(v || '').trim().length >= (n || 5);
    let x;
    switch (name) {
      case 'current_gold_rates': {
        const out = ['22K', '24K'].map(p => db.gold_rates.filter(g => g.purity === p && g.status === 'active' && g.effective_at <= now()).sort((a, b) => b.effective_at.localeCompare(a.effective_at) || b.id - a.id)[0]).filter(Boolean)
          .map(g => ({ id: g.id, purity: g.purity, rate_per_gram: g.rate_per_gram, effective_at: g.effective_at, source_note: g.source_note }));
        return { data: out, error: null };
      }
      case 'admin_approve_scheme': {
        if ((x = admin())) return x;
        const s = db.savings_schemes.find(r => r.id === a.p_scheme_id); if (!s) return err('not_found');
        if (!termsDone(s)) return err('scheme_terms_incomplete');
        if (!reason(a.p_approval_note, 10)) return err('approval_note_required');
        const old = Object.assign({}, s); Object.assign(s, { approval_status: 'approved', approved_by: uid(), approved_at: now(), approval_note: a.p_approval_note.trim(), terms_version: s.terms_version + 1 });
        svAudit('savings_schemes', 'UPDATE', old, s); return ok();
      }
      case 'admin_retire_scheme': {
        if ((x = admin())) return x; if (!reason(a.p_note)) return err('reason_required');
        const s = db.savings_schemes.find(r => r.id === a.p_scheme_id); if (!s) return err('not_found');
        const old = Object.assign({}, s); Object.assign(s, { approval_status: 'retired', enrollment_open: false, approval_note: a.p_note.trim() }); svAudit('savings_schemes', 'UPDATE', old, s); return ok();
      }
      case 'request_enrollment': {
        if ((x = need())) return x;
        const pr = db.profiles.find(p => p.id === uid()); if (!pr || !pr.full_name || !pr.phone) return err('profile_incomplete');
        const s = db.savings_schemes.find(r => r.id === a.p_scheme_id); if (!s || s.approval_status !== 'approved' || !s.enrollment_open) return err('scheme_not_open');
        if (s.contribution_type === 'fixed' ? !fixedOk(s, a.p_fixed_amount) : a.p_fixed_amount != null) return err('invalid_amount');
        if (db.savings_enrollments.some(e => e.customer_id === uid() && e.scheme_id === s.id && e.status === 'pending_approval')) return err('duplicate_request');
        const e = newEnrollment(uid(), s, a.p_fixed_amount, uid());
        return ok([{ enrollment_id: e.id, enrollment_number: e.enrollment_number, status: e.status }]);
      }
      case 'cancel_my_enrollment_request': {
        if ((x = need())) return x;
        const e = db.savings_enrollments.find(r => r.id === a.p_enrollment_id && r.customer_id === uid() && r.status === 'pending_approval'); if (!e) return err('cannot_cancel');
        const old = Object.assign({}, e); e.status = 'cancelled'; svAudit('savings_enrollments', 'UPDATE', old, e); return ok();
      }
      case 'admin_decide_enrollment': {
        if ((x = admin())) return x;
        const e = db.savings_enrollments.find(r => r.id === a.p_enrollment_id); if (!e) return err('not_found');
        if (e.status !== 'pending_approval') return err('invalid_status_transition');
        if (a.p_approve) {
          const s = db.savings_schemes.find(r => r.id === e.scheme_id);
          if (s.approval_status !== 'approved' || s.terms_version !== e.terms_version) return err('scheme_terms_changed');
          Object.assign(e, { decided_by: uid(), decided_at: now(), decision_note: a.p_note || null });
          const bad = activate(e, a.p_start_month); if (bad) return err(bad);
        } else {
          if (!reason(a.p_note)) return err('reason_required');
          const old = Object.assign({}, e); Object.assign(e, { status: 'rejected', decided_by: uid(), decided_at: now(), decision_note: a.p_note.trim() }); svAudit('savings_enrollments', 'UPDATE', old, e);
        }
        return ok();
      }
      case 'admin_create_enrollment': {
        if ((x = admin())) return x;
        if (!db.profiles.some(p => p.id === a.p_customer_id)) return err('customer_not_found');
        const s = db.savings_schemes.find(r => r.id === a.p_scheme_id); if (!s || s.approval_status !== 'approved') return err('scheme_not_open');
        if (s.contribution_type === 'fixed' ? !fixedOk(s, a.p_fixed_amount) : a.p_fixed_amount != null) return err('invalid_amount');
        if (!/^\d{4}-\d{2}-01$/.test(a.p_start_month || '')) return err('invalid_start_month');
        const e = newEnrollment(a.p_customer_id, s, a.p_fixed_amount, uid()); Object.assign(e, { decided_by: uid(), decided_at: now(), decision_note: a.p_note || null });
        activate(e, a.p_start_month);
        return ok([{ enrollment_id: e.id, enrollment_number: e.enrollment_number }]);
      }
      case 'submit_upi_payment': {
        if ((x = need())) return x;
        const i = db.savings_installments.find(r => r.id === a.p_installment_id); const e = i && db.savings_enrollments.find(r => r.id === i.enrollment_id);
        if (!i || !e || e.customer_id !== uid()) return err('installment_not_found');
        if (e.status !== 'active') return err('enrollment_not_active');
        if (i.status !== 'pending_payment') return err('installment_not_payable');
        const ae = amountErr(e, i, Number(a.p_amount)); if (ae) return err(ae);
        const ref = String(a.p_upi_reference || '').toUpperCase().replace(/[\s-]/g, ''); if (!/^[A-Z0-9]{6,35}$/.test(ref)) return err('invalid_reference');
        if (!a.p_paid_on || a.p_paid_on > today() || a.p_paid_on < daysAgo(90)) return err('invalid_payment_date');
        if (refUsed(ref)) return err('duplicate_reference');
        const p = { id: uuid(), receipt_number: null, enrollment_id: e.id, installment_id: i.id, customer_id: uid(), amount: Number(a.p_amount).toFixed(2), channel: 'customer_upi', method: 'upi', upi_reference: ref, store_reference: null,
          paid_on: a.p_paid_on, status: 'pending_verification', submitted_by: uid(), submitted_at: now(), verified_by: null, verified_at: null, rejected_by: null, rejected_at: null, rejection_reason: null,
          voided_by: null, voided_at: null, void_reason: null, gold_rate_id: null, gold_purity: null, gold_rate_per_g: null, gold_weight_g: null, note: null, created_at: now() };
        db.savings_payments.push(p); svAudit('savings_payments', 'INSERT', null, p); i.status = 'pending_verification';
        return ok([{ payment_id: p.id, status: p.status }]);
      }
      case 'admin_verify_upi_payment': {
        if ((x = admin())) return x;
        const p = db.savings_payments.find(r => r.id === a.p_payment_id); if (!p) return err('not_found');
        if (p.status !== 'pending_verification') return err('invalid_status_transition');
        const e = db.savings_enrollments.find(r => r.id === p.enrollment_id); if (e.status !== 'active') return err('enrollment_not_active');
        const c = conversion(e, Number(p.amount), p.paid_on); if (c.err) return err(c.err);
        const rc = receipt(); updPay(p, Object.assign({ status: 'verified', verified_by: uid(), verified_at: now(), receipt_number: rc }, c)); setInst(p.installment_id, 'paid');
        return ok([{ receipt_number: rc, gold_weight_g: c.gold_weight_g || null }]);
      }
      case 'admin_reject_upi_payment': {
        if ((x = admin())) return x; if (!reason(a.p_reason)) return err('reason_required');
        const p = db.savings_payments.find(r => r.id === a.p_payment_id); if (!p) return err('not_found');
        if (p.status !== 'pending_verification') return err('invalid_status_transition');
        updPay(p, { status: 'rejected', rejected_by: uid(), rejected_at: now(), rejection_reason: a.p_reason.trim() }); setInst(p.installment_id, 'pending_payment'); return ok();
      }
      case 'record_instore_payment': {
        if ((x = staff())) return x;
        if (!['cash', 'upi', 'card', 'bank_transfer'].includes(a.p_method)) return err('invalid_method');
        const ref = a.p_upi_reference ? String(a.p_upi_reference).toUpperCase().replace(/[\s-]/g, '') : null;
        if (ref && !/^[A-Z0-9]{6,35}$/.test(ref)) return err('invalid_reference');
        if (!a.p_paid_on || a.p_paid_on > today() || a.p_paid_on < daysAgo(90)) return err('invalid_payment_date');
        const i = db.savings_installments.find(r => r.id === a.p_installment_id); if (!i) return err('installment_not_found');
        const e = db.savings_enrollments.find(r => r.id === i.enrollment_id); if (e.status !== 'active') return err('enrollment_not_active');
        if (i.status === 'pending_verification') return err('payment_pending_verification');
        if (i.status !== 'pending_payment') return err('installment_not_payable');
        const ae = amountErr(e, i, Number(a.p_amount)); if (ae) return err(ae);
        const c = conversion(e, Number(a.p_amount), a.p_paid_on); if (c.err) return err(c.err);
        if (ref && refUsed(ref)) return err('duplicate_reference');
        const p = Object.assign({ id: uuid(), receipt_number: receipt(), enrollment_id: e.id, installment_id: i.id, customer_id: e.customer_id, amount: Number(a.p_amount).toFixed(2), channel: 'in_store', method: a.p_method, upi_reference: ref,
          store_reference: a.p_store_reference || null, paid_on: a.p_paid_on, status: 'verified', submitted_by: uid(), submitted_at: now(), verified_by: uid(), verified_at: now(), rejected_by: null, rejected_at: null, rejection_reason: null,
          voided_by: null, voided_at: null, void_reason: null, gold_rate_id: null, gold_purity: null, gold_rate_per_g: null, gold_weight_g: null, note: a.p_note || null, created_at: now() }, c);
        db.savings_payments.push(p); svAudit('savings_payments', 'INSERT', null, p); i.status = 'paid';
        return ok([{ payment_id: p.id, receipt_number: p.receipt_number, gold_weight_g: p.gold_weight_g }]);
      }
      case 'admin_void_payment': {
        if ((x = admin())) return x; if (!reason(a.p_reason)) return err('reason_required');
        const p = db.savings_payments.find(r => r.id === a.p_payment_id); if (!p) return err('not_found');
        if (p.status !== 'verified') return err('invalid_status_transition');
        if (db.savings_redemptions.some(r => r.enrollment_id === p.enrollment_id && ['approved', 'completed'].includes(r.status))) return err('redemption_in_progress');
        updPay(p, { status: 'voided', voided_by: uid(), voided_at: now(), void_reason: a.p_reason.trim() }); setInst(p.installment_id, 'pending_payment'); return ok();
      }
      case 'admin_add_gold_rates': {
        if ((x = admin())) return x;
        const r22 = a.p_rate_22k, r24 = a.p_rate_24k;
        if (r22 == null && r24 == null) return err('rate_required');
        if ([r22, r24].some(v => v != null && (v < 1000 || v > 100000))) return err('invalid_rate');
        if (r22 != null && r24 != null && r22 >= r24) return err('invalid_rate_order');
        const at = new Date(a.p_effective_at).getTime(); if (!(at <= Date.now() + 7 * 864e5 && at >= Date.now() - 30 * 864e5)) return err('invalid_effective_date');
        if (String(a.p_source_note || '').trim().length < 3) return err('source_required');
        const ids = [];
        [['22K', r22], ['24K', r24]].filter(([, v]) => v != null).forEach(([p, v]) => {
          const g = { id: db.svSeq.rate++, purity: p, rate_per_gram: Number(v).toFixed(2), effective_at: new Date(at).toISOString(), source_note: a.p_source_note.trim(), status: 'active', created_by: uid(), created_at: now(), withdrawn_by: null, withdrawn_at: null, withdraw_reason: null };
          db.gold_rates.push(g); svAudit('gold_rates', 'INSERT', null, g); ids.push(g.id);
        });
        return ok(ids);
      }
      case 'admin_withdraw_gold_rate': {
        if ((x = admin())) return x; if (!reason(a.p_reason)) return err('reason_required');
        const g = db.gold_rates.find(r => r.id === Number(a.p_rate_id) && r.status === 'active'); if (!g) return err('not_found');
        const old = Object.assign({}, g); Object.assign(g, { status: 'withdrawn', withdrawn_by: uid(), withdrawn_at: now(), withdraw_reason: a.p_reason.trim() }); svAudit('gold_rates', 'UPDATE', old, g); return ok();
      }
      case 'request_redemption': {
        if ((x = need())) return x;
        const e = db.savings_enrollments.find(r => r.id === a.p_enrollment_id); if (!e || e.customer_id !== uid()) return err('not_found');
        if (e.status !== 'active') return err('enrollment_not_active');
        if (!['jewellery', 'coin'].includes(a.p_type)) return err('invalid_type');
        if (a.p_visit_date && (a.p_visit_date < today())) return err('invalid_visit_date');
        if (db.savings_redemptions.some(r => r.enrollment_id === e.id && ['pending', 'approved'].includes(r.status))) return err('duplicate_request');
        const tot = totalsRows().find(t => t.enrollment_id === e.id);
        const r = { id: uuid(), request_number: 'RD-' + year() + '-' + String(db.svSeq.rd++).padStart(5, '0'), enrollment_id: e.id, customer_id: uid(), redemption_type: a.p_type, preference: a.p_preference || null,
          preferred_visit_date: a.p_visit_date || null, status: 'pending', verified_total_at_request: tot.verified_total, paid_count_at_request: tot.paid_count, gold_weight_at_request: tot.gold_weight_g,
          requested_at: now(), decided_by: null, decided_at: null, decision_note: null, completed_by: null, completed_at: null, completion_note: null, cancelled_at: null };
        db.savings_redemptions.push(r); svAudit('savings_redemptions', 'INSERT', null, r);
        return ok([{ redemption_id: r.id, request_number: r.request_number }]);
      }
      case 'cancel_my_redemption': {
        if ((x = need())) return x;
        const r = db.savings_redemptions.find(q => q.id === a.p_redemption_id && q.customer_id === uid() && q.status === 'pending'); if (!r) return err('cannot_cancel');
        const old = Object.assign({}, r); Object.assign(r, { status: 'cancelled', cancelled_at: now() }); svAudit('savings_redemptions', 'UPDATE', old, r); return ok();
      }
      case 'admin_decide_redemption': {
        if ((x = admin())) return x;
        const r = db.savings_redemptions.find(q => q.id === a.p_redemption_id); if (!r) return err('not_found');
        if (r.status !== 'pending') return err('invalid_status_transition');
        if (!a.p_approve && !reason(a.p_note)) return err('reason_required');
        const old = Object.assign({}, r); Object.assign(r, { status: a.p_approve ? 'approved' : 'rejected', decided_by: uid(), decided_at: now(), decision_note: a.p_note || null }); svAudit('savings_redemptions', 'UPDATE', old, r); return ok();
      }
      case 'admin_complete_redemption': {
        if ((x = admin())) return x; if (!reason(a.p_note)) return err('reason_required');
        const r = db.savings_redemptions.find(q => q.id === a.p_redemption_id); if (!r) return err('not_found');
        if (r.status !== 'approved') return err('invalid_status_transition');
        if (db.savings_payments.some(p => p.enrollment_id === r.enrollment_id && p.status === 'pending_verification')) return err('payment_pending_verification');
        const old = Object.assign({}, r); Object.assign(r, { status: 'completed', completed_by: uid(), completed_at: now(), completion_note: a.p_note.trim() }); svAudit('savings_redemptions', 'UPDATE', old, r);
        const e = db.savings_enrollments.find(q => q.id === r.enrollment_id); const oe = Object.assign({}, e); e.status = 'redeemed'; svAudit('savings_enrollments', 'UPDATE', oe, e); return ok();
      }
    }
    return null;
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

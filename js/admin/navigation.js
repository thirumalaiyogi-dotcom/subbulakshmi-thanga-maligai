'use strict';
/* =========================================================
   ADMIN · NAVIGATION — sidebar on large screens, slide-in drawer on mobile,
   grouped entries, "Soon" badges for modules not built yet, entry notice
   ========================================================= */
addStrings({
  a_products: 'Products', a_categories: 'Categories', a_orders: 'Orders', a_schemes: 'Savings schemes',
  a_payments: 'Installments & verification', a_goldrate: 'Gold rates',
  g_store: 'Store', g_savings: 'Savings', g_business: 'Business', soonBadge: 'Soon', comingSoon: 'Coming soon',
  openMenu: 'Open menu', closeMenu: 'Close menu', adminNav: 'Admin navigation', backToStoreApp: 'Back to the customer app',
  adminLiveStrip: 'Products, categories and orders are live · Screens marked DEMO show fictional savings data',
  gateTitle: 'Store admin view (prototype)', gateBody: 'This admin view uses fictional DEMO data. It has no login or authentication — a real admin panel must be protected by server-side authentication and roles before launch.'
}, {
  a_products: 'நகைகள்', a_categories: 'வகைகள்', a_orders: 'ஆர்டர்கள்', a_schemes: 'சேமிப்புத் திட்டங்கள்',
  a_payments: 'தவணைகள் & சரிபார்ப்பு', a_goldrate: 'தங்க விலைகள்',
  g_store: 'கடை', g_savings: 'சேமிப்பு', g_business: 'வணிகம்', soonBadge: 'விரைவில்', comingSoon: 'விரைவில் வரும்',
  openMenu: 'பட்டியலைத் திற', closeMenu: 'பட்டியலை மூடு', adminNav: 'நிர்வாக வழிசெலுத்தல்', backToStoreApp: 'வாடிக்கையாளர் செயலிக்குத் திரும்பு',
  adminLiveStrip: 'நகைகள், வகைகள், ஆர்டர்கள் நேரடி database · டெமோ எனக் குறித்த திரைகள் கற்பனைச் சேமிப்புத் தரவைக் காட்டும்',
  gateTitle: 'கடை நிர்வாகப் பார்வை (மாதிரி)', gateBody: 'இந்த நிர்வாகப் பார்வை கற்பனையான டெமோ தரவைப் பயன்படுத்துகிறது. இதில் உள்நுழைவோ அங்கீகாரமோ இல்லை — வெளியீட்டுக்கு முன் உண்மையான நிர்வாகப் பகுதி server-side அங்கீகாரம் மற்றும் பங்குகள் மூலம் பாதுகாக்கப்பட வேண்டும்.'
});

/* [route, icon, group, status] — status 'soon' = module not built yet (honest badge) */
const ADMIN_NAV = [
  ['overview', 'chart', null],
  ['products', 'shop', 'g_store', 'partial'], ['categories', 'grid', 'g_store', 'partial'], ['orders', 'box', 'g_store', 'soon'],
  ['schemes', 'layers', 'g_savings', 'partial'], ['enrollments', 'file', 'g_savings'], ['payments', 'checkCircle', 'g_savings'],
  ['records', 'book', 'g_savings'], ['redemptions', 'gift', 'g_savings'],
  ['customers', 'users', 'g_business'], ['goldrate', 'coins', 'g_business'], ['reports', 'receipt', 'g_business'], ['settings', 'settings', 'g_business']
];
/* In Supabase mode these screens still show the fictional savings data (Phase 5 connects them). */
const ADMIN_DEMO_PAGES = ['schemes', 'enrollments', 'payments', 'records', 'redemptions', 'customers', 'goldrate', 'reports'];
function adminBadge(key) {
  const n = key === 'payments' ? S.transactions.filter(x => x.status === 'pending').length
    : key === 'redemptions' ? S.redemptions.filter(r => r.status !== 'closed').length
    : key === 'enrollments' ? S.enrollments.filter(e => e.status === 'pending').length : 0;
  return n ? '<span class="count" aria-label="' + n + '">' + n + '</span>' : '';
}
function adminShell(active, inner) {
  let group = null, items = '';
  ADMIN_NAV.forEach(([k, i, g, st]) => {
    if (g !== group) { group = g; if (g) items += '<p class="sb-group">' + t(g) + '</p>'; }
    let badge = '';
    if (isLive()) badge = ADMIN_DEMO_PAGES.includes(k) ? '<span class="soon">' + t('demoBadge') + '</span>' : '';
    else badge = st === 'soon' ? '<span class="soon">' + t('soonBadge') + '</span>' : adminBadge(k);
    items += '<button class="sb-item" data-go="' + k + '"' + (active === k ? ' aria-current="page"' : '') + '>' + ic(i) + '<span>' + t('a_' + k) + '</span>' + badge + '</button>';
  });
  return '<div class="shell shell--admin">' +
    '<aside class="sidebar" id="adminDrawer" aria-label="' + t('adminNav') + '">' +
      '<div class="sb-brand">' + emblem('emb') + '<div><strong>' + t('brand') + '</strong><span>' + t('admin') + '</span></div></div>' +
      '<nav class="sb-nav">' + items + '</nav>' +
      '<div class="sb-foot"><a class="sb-switch" href="index.html#/savings">' + ic('swap') + '<span>' + t('backToStoreApp') + '</span></a><p class="sb-note">DEMO · ' + t('prototype') + ' · v0.2</p></div>' +
    '</aside><div class="drawer-backdrop" data-action="drawer-close"></div>' +
    '<header class="topbar"><div class="tb-left"><button class="tb-icon menu-btn" data-action="drawer-open" aria-controls="adminDrawer" aria-expanded="false" aria-label="' + t('openMenu') + '">' + ic('menu') + '</button>' +
      '<button class="tb-brand" data-go="overview">' + emblem('emb') + '<span><strong>' + t('brand') + '</strong><small>' + t('admin') + '</small></span></button></div>' +
      '<div class="tb-actions">' + (isLive() ? '<span class="small muted mono" style="max-width:34vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(Auth.user ? Auth.user.email : '') + '">' + esc(Auth.user ? Auth.user.email : '') + '</span><button class="tb-icon" data-action="admin-logout" aria-label="' + t('logoutBtn') + '">' + ic('logout') + '</button>' : '<span class="demo-pill" title="' + esc(t('demoStrip')) + '">DEMO</span>') + langToggle() + '</div></header>' +
    '<main id="main" class="main" tabindex="-1"><div class="demo-strip" role="note">' + ic('info') + '<span>' + t(isLive() ? 'adminLiveStrip' : 'demoStrip') + '</span></div><div class="view" id="view">' + inner + '</div></main></div>';
}
function adminGate() {
  return '<div class="shell"><main class="main" style="max-width:560px;margin:0 auto;padding-top:48px"><section class="panel">' +
    '<div class="sb-brand" style="padding:0;border:0">' + emblem('emb') + '</div>' +
    '<h1 class="h1">' + t('gateTitle') + '</h1><div class="note note--warn">' + ic('alert') + '<span>' + t('gateBody') + '</span></div>' +
    '<div class="profile-actions"><button class="btn btn-primary" data-action="gate-ok">' + ic('shield') + t('openAdmin') + '</button><a class="btn btn-outline" href="index.html">' + t('backToStoreApp') + '</a></div>' +
    langToggle('wide') + '</section></main></div>';
}
function comingSoon(title, points) {
  return '<section class="soon-panel"><span class="tag-demo">' + t('comingSoon') + '</span><h2 class="h3">' + title + '</h2>' + (points && points.length ? '<ul>' + points.map(p => '<li>' + p + '</li>').join('') + '</ul>' : '') + '</section>';
}

Object.assign(ACTIONS, {
  'drawer-open': b => { const s = $('.shell--admin'); if (!s) return; s.classList.add('drawer-open'); b.setAttribute('aria-expanded', 'true'); const first = $('#adminDrawer .sb-item'); if (first) first.focus(); },
  'drawer-close': () => { const s = $('.shell--admin'); if (s) s.classList.remove('drawer-open'); const b = $('.menu-btn'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } },
  'gate-ok': () => { sstore.set('adminAck', true); route = APP.resolve(parseHash()); render(); }
});

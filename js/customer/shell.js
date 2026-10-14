'use strict';
/* =========================================================
   CUSTOMER · SHELL — top bar, desktop sidebar, mobile bottom navigation
   (Home · Shop · Wishlist · Savings · Account), savings sub-navigation, welcome
   ========================================================= */
addStrings({
  n_home: 'Home', n_shop: 'Shop', n_wishlist: 'Wishlist', n_savings: 'Savings', n_account: 'Account', n_cart: 'Cart',
  sv_overview: 'Overview', storeTagline: 'Jewellery · Gold Savings', cartAria: 'Shopping cart',
  primaryNav: 'Main navigation', savingsNav: 'Savings sections', openAdminPage: 'Store admin view (prototype)',
  enterStore: 'Enter the store',
  liveStrip: 'Savings records come from the store database · Schemes marked NOT APPROVED are not yet official · No online payment gateway'
}, {
  n_home: 'முகப்பு', n_shop: 'நகைகள்', n_wishlist: 'பிடித்தவை', n_savings: 'சேமிப்பு', n_account: 'கணக்கு', n_cart: 'கூடை',
  sv_overview: 'சுருக்கம்', storeTagline: 'நகைகள் · தங்கச் சேமிப்பு', cartAria: 'வாங்கும் கூடை',
  primaryNav: 'முதன்மை வழிசெலுத்தல்', savingsNav: 'சேமிப்புப் பகுதிகள்', openAdminPage: 'கடை நிர்வாகப் பார்வை (மாதிரி)',
  enterStore: 'கடைக்குள் செல்லவும்',
  liveStrip: 'சேமிப்புப் பதிவுகள் கடையின் database-லிருந்து · "ஒப்புதல் இல்லை" எனக் குறித்த திட்டங்கள் இன்னும் அதிகாரப்பூர்வமானவை அல்ல · ஆன்லைன் பணம் செலுத்தும் வசதி இல்லை'
});

const BOTTOM_NAV = [['home', 'home', 'n_home'], ['shop', 'shop', 'n_shop'], ['wishlist', 'heart', 'n_wishlist'], ['savings', 'coins', 'n_savings'], ['account', 'user', 'n_account']];
const SAVINGS_NAV = [['savings', 'sv_overview'], ['schemes', 'schemes'], ['passbook', 'passbook'], ['transactions', 'history'], ['pay', 'payInstallment'], ['redeem', 'redemption']];
const SAVINGS_PAGES = ['savings', 'schemes', 'scheme', 'passbook', 'transactions', 'pay', 'redeem', 'goldrate'];
if (isLive()) SAVINGS_NAV.push(['goldrate', 'goldRateTitle']);

function navOf(page) {
  if (page === 'product') return 'shop';
  if (page === 'checkout') return 'cart';
  if (page === 'orders' || page === 'order') return 'account';
  if (SAVINGS_PAGES.includes(page)) return 'savings';
  return page;
}
function savingsSubOf(page) { return page === 'scheme' ? 'schemes' : page; }

function customerShell(page, inner) {
  const top = navOf(page), sub = savingsSubOf(page), n = cartCount();
  const cur = (k, v) => k === v ? ' aria-current="page"' : '';
  const side = BOTTOM_NAV.map(([k, i, l]) => {
    let html = '<button class="sb-item" data-go="' + k + '"' + cur(k, top === 'savings' ? (sub === 'savings' ? 'savings' : '') : top) + '>' + ic(i) + '<span>' + t(l) + '</span></button>';
    if (k === 'wishlist') html += '<button class="sb-item" data-go="cart"' + cur('cart', top) + '>' + ic('bag') + '<span>' + t('n_cart') + '</span>' + (n ? '<span class="count">' + n + '</span>' : '') + '</button>';
    if (k === 'savings') html += SAVINGS_NAV.slice(1).map(([sk, sl]) => '<button class="sb-item sub" data-go="' + sk + '"' + cur(sk, top === 'savings' ? sub : '') + '>' + t(sl) + '</button>').join('');
    return html;
  }).join('');
  const subnav = top === 'savings' ? '<nav class="subnav" aria-label="' + t('savingsNav') + '">' + SAVINGS_NAV.map(([sk, sl]) => '<button data-go="' + sk + '"' + cur(sk, sub) + '>' + t(sl) + '</button>').join('') + '</nav>' : '';
  return '<div class="shell shell--cust">' +
    '<aside class="sidebar" aria-label="' + t('primaryNav') + '">' +
      '<div class="sb-brand">' + emblem('emb') + '<div><strong>' + t('brand') + '</strong><span>' + t('storeTagline') + '</span></div></div>' +
      '<nav class="sb-nav">' + side + '</nav>' +
      '<div class="sb-foot"><button class="sb-switch" data-action="enter-admin">' + ic('shield') + '<span>' + t('openAdminPage') + '</span></button><p class="sb-note">DEMO · ' + t('prototype') + ' · v0.2</p></div>' +
    '</aside>' +
    '<header class="topbar"><div class="tb-left"><button class="tb-brand" data-go="home">' + emblem('emb') + '<span><strong>' + t('brand') + '</strong><small>' + t('storeTagline') + '</small></span></button></div>' +
      '<div class="tb-actions">' + (isLive() ? '' : '<span class="demo-pill" title="' + esc(t('demoStrip')) + '">DEMO</span>') +
      '<button class="tb-icon" data-go="cart" aria-label="' + t('cartAria') + (n ? ' (' + n + ')' : '') + '">' + ic('bag') + (n ? '<span class="badge">' + n + '</span>' : '') + '</button>' +
      langToggle() + '</div></header>' +
    '<main id="main" class="main" tabindex="-1"><div class="demo-strip" role="note">' + ic('info') + '<span>' + t(isLive() ? 'liveStrip' : 'demoStrip') + '</span></div><div class="view" id="view">' + subnav + inner + '</div></main>' +
    '<nav class="bottom-nav" aria-label="' + t('primaryNav') + '">' + BOTTOM_NAV.map(([k, i, l]) => '<button class="bn-item" data-go="' + k + '"' + cur(k, top) + '>' + ic(i) + '<span>' + t(l) + '</span></button>').join('') + '</nav>' +
    '</div>';
}

function viewWelcome() {
  const brandHTML = lang === 'ta' ? 'சுப்புலட்சுமி<br>தங்க மாளிகை' : 'Subbulakshmi<br>Thanga Maligai';
  return '<section class="welcome" aria-labelledby="wTitle">' +
    '<div class="welcome-bg" aria-hidden="true">' + emblem() + '</div>' +
    '<div class="welcome-top">' + (isLive() ? '<span></span>' : '<span class="demo-pill demo-pill--dark">DEMO · ' + t('prototype') + '</span>') + '' + langToggle('dark') + '</div>' +
    '<div class="welcome-center">' + emblem('welcome-emblem') +
      '<p class="welcome-place">' + t('place') + '</p>' +
      '<h1 class="welcome-brand" id="wTitle">' + brandHTML + '</h1>' +
      '<div class="welcome-rule" aria-hidden="true"><span></span>' + ic('diamond') + '<span></span></div>' +
      '<p class="welcome-line">' + t('homeSub') + '</p>' +
      '<div class="welcome-actions"><button class="btn btn-gold btn-lg" data-action="welcome-continue">' + t('enterStore') + ic('right') + '</button></div>' +
    '</div>' +
    '<p class="welcome-foot">' + t(isLive() ? 'liveStrip' : 'demoStrip') + '</p></section>';
}

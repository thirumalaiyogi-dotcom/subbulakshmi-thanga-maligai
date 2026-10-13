'use strict';
/* =========================================================
   CUSTOMER · HOME — brand banner, search, DEMO gold rate, categories,
   collections (new, popular, bridal, featured), savings promotion,
   store contact, WhatsApp, footer
   ========================================================= */
addStrings({
  homeHeadline: 'Beautiful jewellery, a trusted choice', homeSub: 'Find jewellery that suits your taste.',
  exploreCollection: 'Explore jewellery', goldSavingsCta: 'Gold savings', searchGo: 'Search',
  todaysRate: "Today's gold rate · 22K per gram", rateDemoNote: 'DEMO sample value · not a live market rate · entered',
  otherPurities: '18K, 24K and silver rates: not configured', shopByCategory: 'Shop by category',
  promoTitle: 'Gold savings schemes', promoText: 'Dhanalakshmi and Kuber Lakshmi · 12 months · pay between the 1st and 7th.', viewSchemes: 'View schemes',
  visitStore: 'Contact the store', storeHoursLabel: 'Hours', notAddedYet: 'To be added by the store',
  callStore: 'Call the store', openMap: 'Open in Maps',
  footNote: 'Prototype · fictional demo data · no real payments or orders.', footLinks: 'Quick links'
}, {
  homeHeadline: 'அழகான நகைகள், நம்பிக்கையான தேர்வு', homeSub: 'உங்கள் விருப்பத்திற்கு ஏற்ற நகைகளைத் தேடுங்கள்.',
  exploreCollection: 'நகைகளைப் பார்க்க', goldSavingsCta: 'தங்கச் சேமிப்பு', searchGo: 'தேடு',
  todaysRate: 'இன்றைய தங்க விலை · 22K ஒரு கிராம்', rateDemoNote: 'டெமோ மாதிரி மதிப்பு · நேரடிச் சந்தை விலை அல்ல · பதிவு',
  otherPurities: '18K, 24K, வெள்ளி விலைகள்: அமைக்கப்படவில்லை', shopByCategory: 'வகைவாரியாக நகைகள்',
  promoTitle: 'தங்கச் சேமிப்புத் திட்டங்கள்', promoText: 'தனலட்சுமி, குபேர லட்சுமி · 12 மாதங்கள் · ஒவ்வொரு மாதமும் 1 – 7 தேதிக்குள் செலுத்தலாம்.', viewSchemes: 'திட்டங்களைப் பார்க்க',
  visitStore: 'கடையைத் தொடர்புகொள்ள', storeHoursLabel: 'நேரம்', notAddedYet: 'கடை சேர்க்க வேண்டும்',
  callStore: 'கடையை அழைக்க', openMap: 'வரைபடத்தில் திற',
  footNote: 'மாதிரிப் பதிப்பு · கற்பனையான டெமோ தரவு · உண்மையான பணப்பரிவர்த்தனை, ஆர்டர் இல்லை.', footLinks: 'விரைவு இணைப்புகள்'
});

function railSection(tag) {
  return '<section aria-labelledby="rail-' + tag + '" id="railwrap-' + tag + '"><div class="section-head"><h2 class="h2" id="rail-' + tag + '">' + t('tag_' + tag) + '</h2>' +
    '<button class="link-btn" data-go="shop/all/' + tag + '">' + t('viewAll') + ic('right') + '</button></div>' +
    '<div class="rail" id="railbox-' + tag + '">' + '<div class="skel skel--card"></div>'.repeat(3) + '</div></section>';
}
function fillHomeRails(token) {
  ['new', 'popular', 'bridal', 'featured'].forEach(tag => {
    fillAsync('#railbox-' + tag, token, () => Catalog.list({ tag, limit: 8, sort: 'newest' }), ({ rows }) => {
      if (!rows.length) { const w = $('#railwrap-' + tag); if (w) w.hidden = true; return ''; }
      return rows.map(productCard).join('');
    });
  });
}
function storeContact() {
  const phone = STORE_CONFIG.phone, addr = L(STORE_CONFIG.address), hours = L(STORE_CONFIG.hours);
  const val = v => v ? esc(v) : '<span class="muted">' + t('notAddedYet') + '</span>';
  return '<section class="panel contact-card" aria-labelledby="contactH"><h2 class="h3" id="contactH">' + t('visitStore') + '</h2>' +
    '<p><b>' + t('brand') + '</b><br><span class="muted small">' + L(STORE_CONFIG.town) + '</span></p>' +
    '<ul class="list-rows"><li>' + ic('phone') + '<span>' + t('phone') + ': ' + val(phone) + '</span></li>' +
      '<li>' + ic('pin') + '<span>' + t('address') + ': ' + val(addr) + '</span></li>' +
      '<li>' + ic('clock') + '<span>' + t('storeHoursLabel') + ': ' + val(hours) + '</span></li></ul>' +
    '<div class="contact-actions">' + waButton('general') +
      (phone ? '<a class="btn btn-outline" href="tel:' + esc(phone.replace(/[^\d+]/g, '')) + '">' + ic('phone') + t('callStore') + '</a>' : '') +
      (STORE_CONFIG.mapUrl ? '<a class="btn btn-outline" href="' + esc(STORE_CONFIG.mapUrl) + '" target="_blank" rel="noopener noreferrer">' + ic('pin') + t('openMap') + '</a>' : '') +
    '</div></section>';
}
function siteFooter() {
  const links = [['shop/all', 'n_shop'], ['savings', 'n_savings'], ['wishlist', 'n_wishlist'], ['cart', 'n_cart'], ['account', 'n_account']];
  return '<footer class="site-foot"><nav class="foot-links" aria-label="' + t('footLinks') + '">' + links.map(([to, l]) => '<button data-go="' + to + '">' + t(l) + '</button>').join('') + '</nav>' +
    '<p>© ' + new Date().getFullYear() + ' ' + t('brand') + ' · ' + L(STORE_CONFIG.town) + '</p><p class="small">' + t('footNote') + '</p></footer>';
}
function pageHome() {
  const r = currentRate();
  return '<form class="home-search" data-form="home-search" role="search"><div class="search">' + ic('search') +
      '<input type="search" name="homeQ" placeholder="' + t('searchJewellery') + '" aria-label="' + t('searchJewellery') + '" enterkeyhint="search"></div>' +
      '<button class="btn btn-primary" type="submit">' + t('searchGo') + '</button></form>' +
    '<section class="banner" aria-labelledby="bannerH"><div class="banner-orn">' + emblem() + '</div>' +
      '<div><p class="eyebrow">' + t('brand') + '</p><h1 id="bannerH">' + t('homeHeadline') + '</h1><p>' + t('homeSub') + '</p>' +
      '<div class="banner-actions"><button class="btn btn-gold" data-go="shop/all">' + t('exploreCollection') + ic('right') + '</button>' +
      '<button class="btn btn-outline btn-on-dark" data-go="schemes">' + t('goldSavingsCta') + '</button></div></div>' +
      '<div class="banner-art"><span class="art" style="border-radius:50%;overflow:hidden" aria-hidden="true">' + jewelArt('bridal', 0) + '</span></div></section>' +
    (r && !isLive() ? '<section class="rate-strip" aria-labelledby="rateH"><div><span class="rate-label" id="rateH">' + t('todaysRate') + '</span><b>' + inr(r.rate) + '</b><small>' + t('rateDemoNote') + ' ' + fmtDate(r.date) + '</small><small>' + t('otherPurities') + '</small></div><span class="tag-demo">DEMO</span></section>' : '') +
    '<section aria-labelledby="catH"><div class="section-head"><h2 class="h2" id="catH">' + t('shopByCategory') + '</h2><button class="link-btn" data-go="shop/all">' + t('viewAll') + ic('right') + '</button></div>' +
      '<div class="cat-grid">' + visibleCats().map(c => '<button class="cat-tile" data-go="shop/' + c.id + '">' + catArt(c) + '<span>' + L(c.name) + '</span></button>').join('') + '</div></section>' +
    railSection('new') + railSection('popular') +
    '<section class="promo" aria-labelledby="promoH"><div class="promo-ic">' + ic('coins') + '</div><div><h2 id="promoH">' + t('promoTitle') + '</h2><p>' + t('promoText') + '</p></div>' +
      '<button class="btn btn-primary" data-go="schemes">' + t('viewSchemes') + '</button></section>' +
    railSection('bridal') + railSection('featured') +
    storeContact() + siteFooter();
}

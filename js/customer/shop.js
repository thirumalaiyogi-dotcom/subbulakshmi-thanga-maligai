'use strict';
/* =========================================================
   CUSTOMER · SHOP — reusable product card, category filter, search, sort,
   incremental loading ("Show more"), loading and empty states
   ========================================================= */
addStrings({
  shopTitle: 'All jewellery', shopSub: "Sample catalogue for the prototype — not the store's actual stock.",
  searchJewellery: 'Search jewellery or product ID', allCats: 'All', sortBy: 'Sort',
  sort_newest: 'Newest first', sort_name: 'Name (A–Z)', sort_price_asc: 'Price: low to high', sort_price_desc: 'Price: high to low', shopSubLive: "Browse the store's jewellery collection.", storePriceShort: 'Store price',
  newTag: 'New', noProducts: 'No jewellery found', noProductsHint: 'Try another word or category.', clearFilters: 'Clear filters', showingTag: 'Showing',
  wishAdd: 'Add to wishlist', wishRemove: 'Remove from wishlist', itemsCount: 'items', jewelleryCategories: 'Jewellery categories'
}, {
  shopTitle: 'அனைத்து நகைகள்', shopSub: 'மாதிரிப் பதிப்பிற்கான மாதிரிப் பட்டியல் — கடையின் உண்மையான இருப்பு அல்ல.',
  searchJewellery: 'நகைகளைத் தேடுக', allCats: 'அனைத்தும்', sortBy: 'வரிசை',
  sort_newest: 'புதியவை முதலில்', sort_name: 'பெயர் வரிசை (A–Z)', sort_price_asc: 'விலை: குறைவு முதல்', sort_price_desc: 'விலை: அதிகம் முதல்', shopSubLive: 'கடையின் நகைத் தொகுப்பைப் பாருங்கள்.', storePriceShort: 'கடை விலை',
  newTag: 'புதியது', noProducts: 'நகைகள் எதுவும் கிடைக்கவில்லை', noProductsHint: 'வேறு சொல் அல்லது வகையை முயற்சிக்கவும்.', clearFilters: 'வடிகட்டிகளை நீக்கு', showingTag: 'காட்டப்படுவது',
  wishAdd: 'பிடித்தவையில் சேர்', wishRemove: 'பிடித்தவையிலிருந்து நீக்கு', itemsCount: 'நகைகள்', jewelleryCategories: 'நகை வகைகள்'
});

const SHOP_TAGS = ['new', 'popular', 'bridal', 'featured'];

function priceLabelHTML(p) {
  const pi = priceInfo(p);
  if (pi.sample) return '<p class="pcard-price">' + inr(pi.sample) + '<small>' + (pi.isSample ? t('samplePriceShort') : t('storePriceShort')) + '</small></p>';
  return '<p class="pcard-enq">' + t('priceEnquiry') + '</p>';
}
function stockFlag(p) {
  if (p.stock === 'out_of_stock') return '<span class="pcard-flag pcard-flag--out">' + t('stock_out_of_stock') + '</span>';
  if (p.stock === 'made_to_order') return '<span class="pcard-flag">' + t('stock_made_to_order') + '</span>';
  if (p.tags.includes('new')) return '<span class="pcard-flag">' + t('newTag') + '</span>';
  return '';
}
function wishBtn(p) {
  const on = Wishlist.has(p);
  return '<button type="button" class="wish-btn" data-action="wish" data-id="' + esc(p.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? t('wishRemove') : t('wishAdd')) + ': ' + esc(L(p.name)) + '">' + ic('heart') + '</button>';
}
function productCard(p) {
  const c = getCat(p.category), href = 'product/' + encodeURIComponent(p.id);
  return '<article class="pcard">' + wishBtn(p) +
    '<button type="button" class="pcard-media" data-go="' + href + '" tabindex="-1" aria-hidden="true">' + productImg(p, 0) + stockFlag(p) + '</button>' +
    '<div class="pcard-body"><p class="pcard-cat">' + esc(c ? L(c.name) : p.category) + ' · ' + purityLabel(p) + '</p>' +
      '<h3 class="pcard-name"><button type="button" data-go="' + href + '">' + esc(L(p.name)) + '</button></h3>' +
      '<p class="pcard-meta"><span class="mono">' + esc(p.id) + '</span>' + (p.grossWeight ? ' · ' + grams(p.grossWeight) : '') + '</p>' +
      priceLabelHTML(p) +
      '<button type="button" class="btn btn-outline btn-sm btn-block" data-go="' + href + '">' + t('viewDetails') + '</button></div></article>';
}
function gridSkeleton(n) { return '<div class="skel-grid" aria-busy="true" aria-label="' + t('loading') + '">' + '<div class="skel skel--card"></div>'.repeat(n || 6) + '</div>'; }

function pageShop(arg, r) {
  UI.shopCat = getCat(arg) ? arg : 'all';
  UI.shopTag = SHOP_TAGS.includes(r.arg2) ? r.arg2 : null;
  const key = UI.shopCat + '|' + UI.shopTag;
  if (UI.shopKey !== key) { UI.shopKey = key; UI.shopLimit = 12; }
  if (!['newest', 'name', 'price_asc', 'price_desc'].includes(UI.shopSort)) UI.shopSort = 'newest';
  const cat = getCat(UI.shopCat);
  const chips = '<button class="fchip" data-go="shop/all' + (UI.shopTag ? '/' + UI.shopTag : '') + '" aria-pressed="' + (UI.shopCat === 'all') + '">' + t('allCats') + '</button>' +
    visibleCats().map(c => '<button class="fchip" data-go="shop/' + c.id + (UI.shopTag ? '/' + UI.shopTag : '') + '" aria-pressed="' + (UI.shopCat === c.id) + '">' + esc(L(c.name)) + '</button>').join('');
  return pageHead(cat ? esc(L(cat.name)) : t('shopTitle'), isLive() ? t('shopSubLive') : t('shopSub')) +
    (UI.shopTag ? '<div class="note note--info">' + ic('tag') + '<span>' + t('showingTag') + ': <b>' + t('tag_' + UI.shopTag) + '</b></span><button class="link-btn" style="margin-left:auto" data-go="shop/' + UI.shopCat + '">' + t('clearFilters') + '</button></div>' : '') +
    '<div class="shop-tools">' +
      '<div class="search">' + ic('search') + '<input type="search" placeholder="' + t('searchJewellery') + '" aria-label="' + t('searchJewellery') + '" value="' + esc(UI.shopQ) + '" data-filter="shop" enterkeyhint="search" maxlength="40"></div>' +
      '<div class="chips chips--scroll" role="group" aria-label="' + t('jewelleryCategories') + '">' + chips + '</div>' +
      '<div class="sort-row"><span class="result-count" id="shopCount" aria-live="polite"></span>' +
        '<label class="sr-only" for="shopSort">' + t('sortBy') + '</label><select class="select" id="shopSort" data-change="shop-sort"></select></div>' +
    '</div>' +
    '<div id="shopList">' + gridSkeleton(6) + '</div>';
}
function setSortOptions(pricedAvailable) {
  const sel = $('#shopSort'); if (!sel) return;
  const sorts = ['newest', 'name'].concat(pricedAvailable ? ['price_asc', 'price_desc'] : []);
  if (!sorts.includes(UI.shopSort)) UI.shopSort = 'newest';
  sel.innerHTML = sorts.map(s => '<option value="' + s + '"' + (UI.shopSort === s ? ' selected' : '') + '>' + t('sort_' + s) + '</option>').join('');
}
function renderShopList() {
  const token = renderToken;
  const box = $('#shopList'); if (!box) return;
  if (!box.querySelector('.pgrid')) box.innerHTML = gridSkeleton(6);
  fillAsync('#shopList', token,
    () => Catalog.list({ category: UI.shopCat, tag: UI.shopTag, q: UI.shopQ, sort: UI.shopSort, limit: UI.shopLimit, offset: 0 }),
    ({ rows, count }) => {
      const cnt = $('#shopCount'); if (cnt) cnt.textContent = count + ' ' + t('itemsCount');
      setSortOptions(rows.filter(p => p.price.mode !== 'enquiry').length >= 2);
      if (!rows.length) return emptyState('search', t('noProducts'), t('noProductsHint'), '<button class="btn btn-outline" data-action="shop-clear">' + t('clearFilters') + '</button>');
      return '<div class="pgrid">' + rows.map(productCard).join('') + '</div>' +
        (count > rows.length ? '<div class="load-more"><button class="btn btn-outline" data-action="shop-more">' + t('loadMore') + ' (' + (count - rows.length) + ')</button></div>' : '');
    }, 'shop-retry');
}

let shopSearchTimer = null;
FILTERS.shop = el => { UI.shopQ = el.value; UI.shopLimit = 12; clearTimeout(shopSearchTimer); shopSearchTimer = setTimeout(renderShopList, isLive() ? 350 : 0); };
CHANGES['shop-sort'] = el => { UI.shopSort = el.value; renderShopList(); };
Object.assign(ACTIONS, {
  'shop-more': () => { UI.shopLimit = Math.min(UI.shopLimit + 12, 96); renderShopList(); },
  'shop-retry': () => renderShopList(),
  'shop-clear': () => { UI.shopQ = ''; UI.shopLimit = 12; if (UI.shopCat === 'all' && !UI.shopTag) render(); else go('shop/all'); }
});
FORMS['home-search'] = f => { UI.shopQ = cleanTerm(f.elements.homeQ.value) ; UI.shopLimit = 12; go('shop/all'); };

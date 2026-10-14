'use strict';
/* =========================================================
   CUSTOMER APP — page registry and start-up
   Routes: #/home  #/shop/<category|all>/<tag?>  #/product/<id>  #/wishlist  #/cart
           #/savings  #/schemes  #/scheme/<id>  #/passbook/<enrollment?>  #/transactions
           #/pay  #/redeem  #/goldrate (Supabase mode)  #/account  #/welcome
   ========================================================= */
Object.assign(APP.pages, {
  welcome: viewWelcome, home: pageHome, shop: pageShop, product: pageProduct, wishlist: pageWishlist, cart: pageCart,
  savings: pageSavings, schemes: pageSchemes, scheme: pageScheme, passbook: pagePassbook, transactions: pageTransactions,
  pay: pagePay, redeem: pageRedeem, account: pageAccount,
  checkout: pageCheckout, orders: pageOrders, order: pageOrder
});
if (isLive()) {
  /* Phase 5: gold savings on the real backend (the DEMO screens remain for DEMO mode) */
  Object.assign(APP.pages, { savings: pageSavingsLive, schemes: pageSchemesLive, scheme: pageSchemeLive, passbook: pagePassbookLive,
    transactions: pageTransactionsLive, pay: pagePayLive, redeem: pageRedeemLive, goldrate: pageGoldRateLive });
}
APP.bare.welcome = true;
APP.defaultPage = 'home';
APP.shell = customerShell;
APP.after.transactions = tok => setTimeout(() => { if (tok === renderToken) renderTxList(); }, 450);
APP.after.shop = () => renderShopList();
APP.after.home = tok => fillHomeRails(tok);
APP.after.product = tok => loadProductIfNeeded(tok);
APP.after.wishlist = tok => fillWishlist(tok);
APP.after.cart = tok => { if (getCart().length) fillCart(tok); };
APP.after.checkout = tok => { if (isLive() && Auth.user && getCart().length) fillCheckout(tok); };
APP.after.orders = tok => { if (isLive() && Auth.user) fillOrders(tok); };
APP.after.order = tok => { if (isLive() && Auth.user) fillOrder(tok); };
if (isLive()) Object.assign(APP.after, { savings: fillSavingsLive, schemes: fillSchemesLive, scheme: fillSchemeLive, passbook: fillPassbookLive,
  transactions: fillTransactionsLive, pay: fillPayLive, redeem: fillRedeemLive, goldrate: fillGoldRateLive });
APP.resolve = r => {
  if (!r.page) return Object.assign({}, r, { page: store.get('seenWelcome', false) ? 'home' : 'welcome' });
  if (r.page === 'profile') return Object.assign({}, r, { page: 'account' });   // old route
  return r;
};
const PAGE_TITLE_KEY = { checkout: 'checkoutTitle', orders: 'ordersTitle', order: 'orderTitle', welcome: 'brand', home: 'n_home', shop: 'n_shop', product: 'productDetails', wishlist: 'n_wishlist', cart: 'n_cart', savings: 'n_savings', schemes: 'schemes', scheme: 'schemes', passbook: 'digitalPassbook', transactions: 'history', pay: 'payInstallment', redeem: 'redemption', account: 'n_account', goldrate: 'goldRateTitle' };
APP.titleOf = page => t(PAGE_TITLE_KEY[page] || 'brand') + ' · ' + t('brand');

/* Start-up: load categories and the login session BEFORE the first render.
   If the database cannot be reached, show an error with Retry — never the demo catalogue. */
async function boot() {
  const app = $('#app');
  if (Backend.mode === 'error') { app.innerHTML = configErrorPage(); return; }
  app.innerHTML = '<div class="loading-block" style="min-height:60vh;justify-content:center" aria-busy="true"><span class="spinner spinner--lg" aria-hidden="true"></span><p>' + t('loading') + '</p></div>';
  try {
    await Catalog.init();
    await Auth.init();
  } catch (e) {
    app.innerHTML = '<main class="main" style="max-width:560px;margin:0 auto;padding-top:48px">' + errorBlock(toApiError(e), 'boot-retry') + '</main>';
    return;
  }
  Auth.onChange(() => render());
  startApp();
}
ACTIONS['boot-retry'] = () => boot();
boot();

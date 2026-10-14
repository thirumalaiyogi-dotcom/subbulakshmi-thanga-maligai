'use strict';
/* =========================================================
   ADMIN APP — page registry, filters and start-up
   Routes: #/overview #/products #/categories #/orders #/schemes #/enrollments
           #/payments #/records/<enrollment?> #/redemptions #/customers
           #/goldrate #/reports #/settings
   ========================================================= */
Object.assign(APP.pages, {
  gate: adminGate, overview: aOverview, products: aProducts, categories: aCategories, orders: aOrders, schemes: aSchemes,
  enrollments: aEnrollments, payments: aPayments, records: aRecords, redemptions: aRedemptions,
  customers: aCustomers, goldrate: aGoldrate, reports: aReports, settings: aSettings
});
APP.bare.gate = true;
APP.defaultPage = 'overview';
APP.shell = adminShell;
APP.after.customers = tok => setTimeout(() => { if (tok === renderToken) renderCustList(); }, 350);
APP.after.records = tok => setTimeout(() => { if (tok === renderToken) renderRecList(); }, 350);
APP.after.products = tok => setTimeout(() => { if (tok === renderToken) renderProdList(); }, 250);

if (isLive()) {
  /* Supabase mode: real login, role check by the database, live catalogue and orders */
  Object.assign(APP.pages, {
    login: adminLogin, denied: adminDenied, overview: aOverviewLive, products: aProductsLive, 'product-edit': aProductEdit,
    categories: aCategoriesLive, orders: aOrdersLive, 'admin-order': aAdminOrder
  });
  APP.bare.login = true; APP.bare.denied = true;
  Object.assign(APP.after, {
    overview: fillOverviewLive, products: () => renderAdminProducts(), 'product-edit': fillProductEdit,
    categories: renderAdminCategories, orders: () => renderAdminOrders(), 'admin-order': fillAdminOrder
  });
  /* Phase 5: gold savings on the real backend (reports stay DEMO) */
  Object.assign(APP.pages, {
    schemes: aSchemesLive, 'scheme-edit': aSchemeEdit, enrollments: aEnrollmentsLive, payments: aPaymentsLive, records: aRecordsLive,
    customers: aCustomersLive, redemptions: aRedemptionsLive, goldrate: aGoldrateLive, audit: aAuditLive
  });
  Object.assign(APP.after, {
    schemes: fillSchemesAdmin, 'scheme-edit': fillSchemeEdit, enrollments: fillEnrollmentsAdmin, payments: fillPaymentsAdmin, records: fillRecordsAdmin,
    customers: fillCustomersAdmin, redemptions: fillRedemptionsAdmin, goldrate: fillGoldrateAdmin, audit: fillAuditAdmin
  });
}
APP.resolve = r => {
  if (isLive()) {
    if (!Auth.user) return Object.assign({}, r, { page: 'login' });
    if (!Auth.isAdmin && !Auth.isStaff) return Object.assign({}, r, { page: 'denied' });
    if (!r.page || r.page === 'login' || r.page === 'denied' || r.page === 'gate') return Object.assign({}, r, { page: 'overview' });
    return r;
  }
  if (!sstore.get('adminAck', false)) return Object.assign({}, r, { page: 'gate' });
  if (!r.page || r.page === 'gate') return Object.assign({}, r, { page: 'overview' });
  return r;
};
const ADMIN_TITLES = { login: 'adminLoginTitle', denied: 'deniedTitle', gate: 'gateTitle', 'product-edit': 'editProduct', 'admin-order': 'orderTitle', 'scheme-edit': 'editTerms' };
APP.titleOf = page => t(ADMIN_TITLES[page] || ('a_' + page)) + ' · ' + t('admin');

Object.assign(CHANGES, {
  'enr-scheme': el => { UI.enrScheme = el.value; render(); },
  'enr-status': el => { UI.enrStatus = el.value; render(); },
  'rec-enr': el => go('records/' + encodeURIComponent(el.value)),
  'rec-status': el => { UI.recStatus = el.value; renderRecList(); },
  'notify': el => { prefs.notify = el.checked; store.set('prefs', prefs); toast(t('prefSaved')); }
});
Object.assign(FILTERS, {
  cust: el => { UI.custQ = el.value; renderCustList(); },
  rec: el => { UI.recQ = el.value; renderRecList(); }
});

async function adminBoot() {
  const app = $('#app');
  if (Backend.mode === 'error') { app.innerHTML = configErrorPage(); return; }
  if (isLive()) {
    app.innerHTML = '<div class="loading-block" style="min-height:60vh;justify-content:center" aria-busy="true"><span class="spinner spinner--lg" aria-hidden="true"></span><p>' + t('loading') + '</p></div>';
    try {
      await Auth.init();
      if (Auth.user) await Auth.loadRoles();
      await Catalog.init();
    } catch (e) {
      app.innerHTML = '<main class="main" style="max-width:560px;margin:0 auto;padding-top:48px">' + errorBlock(toApiError(e), 'admin-boot-retry') + '</main>';
      return;
    }
    Auth.onChange(async () => { if (Auth.user) { try { await Auth.loadRoles(); } catch (e) { /* treated as no role */ } } route = APP.resolve(parseHash()); render(); });
  } else {
    Catalog.init();
  }
  startApp();
}
ACTIONS['admin-boot-retry'] = () => adminBoot();
adminBoot();

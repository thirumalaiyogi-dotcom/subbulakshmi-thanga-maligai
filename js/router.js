'use strict';
/* =========================================================
   ROUTER & EVENTS — hash routing (#/page/arg) with browser back/forward,
   plus delegated event registries shared by the customer and admin apps.
   Each app fills APP.pages / APP.after / APP.shell and calls startApp().
   ========================================================= */
const APP = {
  pages: {},        // name -> function(arg, route) returning HTML
  after: {},        // name -> function(token) run after render (deferred lists)
  bare: {},         // pages rendered without the app shell
  defaultPage: 'home',
  shell: (page, inner) => inner,
  titleOf: page => page,
  resolve: r => r   // chance to redirect (e.g. first-visit welcome)
};
const ACTIONS = {}, FORMS = {}, CHANGES = {}, FILTERS = {};
let renderToken = 0;
let navDepth = 0;   // in-app navigations, so Back never leaves the app

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch (e) { return p; } });
  return { page: parts[0] || '', arg: parts[1] || null, arg2: parts[2] || null };
}
let route = parseHash();

function go(path) {
  const target = '#/' + path;
  if (location.hash === target || (path === '' && (location.hash === '' || location.hash === '#/'))) { route = APP.resolve(parseHash()); render(); window.scrollTo(0, 0); }
  else location.hash = '/' + path;
}

function render() {
  renderToken++;
  persistDemo();
  document.documentElement.lang = lang;
  const app = $('#app');
  let page = APP.pages[route.page] ? route.page : APP.defaultPage;
  if (APP.bare[page]) { app.innerHTML = APP.pages[page](route.arg, route); document.title = APP.titleOf(page); return; }
  app.innerHTML = APP.shell(page, APP.pages[page](route.arg, route));
  document.title = APP.titleOf(page);
  const after = APP.after[page];
  if (after) after(renderToken);
}

window.addEventListener('hashchange', () => {
  const prev = route;
  navDepth++;
  route = APP.resolve(parseHash());
  if (route.page !== 'pay') UI.payResult = null;
  if (prev.page !== route.page || prev.arg !== route.arg) UI.galIdx = 0;
  if (modalState) closeModal(true);
  document.querySelectorAll('.shell.drawer-open').forEach(s => s.classList.remove('drawer-open'));
  render();
  window.scrollTo(0, 0);
  if (prev.page !== route.page) { const m = $('#main'); if (m) m.focus({ preventScroll: true }); }
});

/* shared actions */
Object.assign(ACTIONS, {
  'set-lang': b => { setLang(b.dataset.v); render(); const again = document.querySelector('[data-action="set-lang"][data-v="' + lang + '"]'); if (again) again.focus(); },
  'modal-close': () => closeModal()
});

document.addEventListener('click', e => {
  if (e.target.matches && e.target.matches('[data-backdrop]')) { closeModal(); return; }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); if (g.closest('.modal')) closeModal(true); go(g.dataset.go); return; }
  const a = e.target.closest('[data-action]');
  if (a && ACTIONS[a.dataset.action]) { e.preventDefault(); ACTIONS[a.dataset.action](a, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (f && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-filter]');
  if (el && FILTERS[el.dataset.filter]) FILTERS[el.dataset.filter](el);
});
document.addEventListener('keydown', e => {
  const shellOpen = document.querySelector('.shell.drawer-open');
  if (e.key === 'Escape' && shellOpen && !modalState) { shellOpen.classList.remove('drawer-open'); const b = $('.menu-btn'); if (b) b.focus(); return; }
  if (!modalState) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
  if (e.key === 'Tab') {
    const m = $('#modal-root .modal'); if (!m) return;
    const f = Array.from(m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

function startApp() { route = APP.resolve(parseHash()); render(); }

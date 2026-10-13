'use strict';
/* =========================================================
   UTILITIES — DOM, storage, dates, money, icons
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sumBy = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);
const round3 = n => Math.round(n * 1000) / 1000;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* localStorage: long-lived demo preferences on THIS device only (language, wishlist, cart).
   sessionStorage: demo savings records, shared between the customer and admin pages in one tab. */
function makeStore(kind, prefix) {
  const area = () => { try { return window[kind]; } catch (e) { return null; } };
  return {
    get(k, d) { try { const a = area(); const v = a && a.getItem(prefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { const a = area(); if (a) a.setItem(prefix + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { const a = area(); if (a) a.removeItem(prefix + k); } catch (e) { /* ignore */ } }
  };
}
const store = makeStore('localStorage', 'stm_digigold_');
const sstore = makeStore('sessionStorage', 'stm_digigold_');

/* ---------- Dates & formatting (lang is defined in i18n.js) ---------- */
const MON = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ta: ['ஜன.', 'பிப்.', 'மார்ச்', 'ஏப்.', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக.', 'செப்.', 'அக்.', 'நவ.', 'டிச.']
};
function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayISO() { return isoOf(new Date()); }
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }
function curYM() { return todayISO().slice(0, 7); }
function ymAdd(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n; y += Math.floor((m - 1) / 12); m = (((m - 1) % 12) + 12) % 12 + 1;
  return y + '-' + pad(m);
}
function fmtMonth(ym) { const [y, m] = ym.split('-').map(Number); return MON[lang][m - 1] + ' ' + y; }
function fmtDate(iso) { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return d + ' ' + MON[lang][m - 1] + ' ' + y; }
function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function grams(g) { return (Number(g) || 0).toFixed(3) + (lang === 'ta' ? ' கி' : ' g'); }
function windowInfo() {
  const d = new Date(), ym = curYM();
  if (d.getDate() <= 7) return { open: true, start: ym + '-01', end: ym + '-07' };
  const nm = ymAdd(ym, 1);
  return { open: false, start: nm + '-01', end: nm + '-07' };
}

/* ---------- Icons (inline SVG, stroke style) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  shop: '<path d="M12 3 4 9l8 12 8-12-8-6Z"/><path d="M4 9h16"/><path d="m9 9 3 12 3-12"/><path d="m8 4.5 1 4.5M16 4.5 15 9"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.8 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.6 3.3 4.4 6.7C19.5 15.9 12 20.5 12 20.5Z"/>',
  bag: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7h6M9 10.5h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V18a2 2 0 0 0 2 2h14V9H6.5A2.5 2.5 0 0 1 4 7.5Z"/><circle cx="16" cy="14.5" r="1.2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8c-1.5-3.5-6-4-6-1.5S9.5 8 12 8Zm0 0c1.5-3.5 6-4 6-1.5S14.5 8 12 8Z"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4"/><path d="M12 16V8"/><path d="M16 16v-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.8c1.8.7 3 2.4 3.5 5.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  file: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.5"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4"/><path d="M12 17v.5"/>',
  swap: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.5L20 15"/><path d="M20 20v-5h-5"/>',
  diamond: '<path d="M12 3 21 12 12 21 3 12Z"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.9-.4-1.6-1.1-2-2l.8-1-1-2L9 9.5Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  store: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M10 20v-5h4v5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7 7.5 20h9l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>'
};
function ic(name, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>'; }

/* Rosette emblem — the store's jewellery-inspired brand mark */
function emblem(cls) {
  let petals = '', dots = '';
  for (let i = 0; i < 12; i++) petals += '<path d="M50 14C56 25 56 33 50 42C44 33 44 25 50 14Z" transform="rotate(' + (i * 30) + ' 50 50)"/>';
  for (let i = 0; i < 24; i++) { const a = (i * 15 + 7.5) * Math.PI / 180; dots += '<circle cx="' + (50 + 39.5 * Math.cos(a)).toFixed(2) + '" cy="' + (50 + 39.5 * Math.sin(a)).toFixed(2) + '" r=".9" fill="currentColor" stroke="none"/>'; }
  return '<svg class="' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="43.5" stroke-width=".6"/>' + petals + dots + '<circle cx="50" cy="50" r="8"/><circle cx="50" cy="50" r="3" fill="currentColor"/></g></svg>';
}

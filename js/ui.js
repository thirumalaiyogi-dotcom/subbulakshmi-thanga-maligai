'use strict';
/* =========================================================
   UI — shared rendering helpers, toasts, modal and confirmation dialogs
   ========================================================= */
/* ---------- Shared UI pieces ---------- */
const STATUS_TONE = { verified: 'ok', matured: 'ok', ready: 'ok', active: 'info', submitted: 'info', pending: 'warn', pendingEnroll: 'warn', review: 'warn', due: 'warn', rejected: 'err', missed: 'err', upcoming: 'neutral', closed: 'neutral' };
function statusChip(st) { return '<span class="chip chip--' + (STATUS_TONE[st] || 'neutral') + '">' + t('st_' + st) + '</span>'; }
function langToggle(variant) {
  return '<div class="lang ' + (variant ? 'lang--' + variant : '') + '" role="group" aria-label="' + t('language') + '">' +
    '<button type="button" data-action="set-lang" data-v="en" aria-pressed="' + (lang === 'en') + '">EN</button>' +
    '<button type="button" data-action="set-lang" data-v="ta" aria-pressed="' + (lang === 'ta') + '" lang="ta">தமிழ்</button></div>';
}
function pageHead(title, sub, extra) {
  return '<header class="page-head"><div><h1 class="h1">' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra || '') + '</header>';
}
function backBtn(to) { return '<button class="back" data-go="' + to + '">' + ic('left') + t('back') + '</button>'; }
function emptyState(icon, title, hint, action) { return '<div class="empty">' + ic(icon) + '<h3>' + title + '</h3><p>' + hint + '</p>' + (action || '') + '</div>'; }
function skel(n) { return '<div class="skel-list" aria-busy="true" aria-label="' + t('loading') + '">' + '<div class="skel"></div>'.repeat(n) + '</div>'; }
function field(o) {
  const req = o.required !== false;
  return '<div class="field"><label for="' + o.id + '">' + o.label + (req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
    '<input id="' + o.id + '" name="' + o.id + '" type="' + (o.type || 'text') + '" value="' + esc(o.value == null ? '' : o.value) + '" ' + (o.attrs || '') + (req ? ' aria-required="true"' : '') + ' aria-describedby="' + o.id + '-hint ' + o.id + '-err">' +
    (o.hint ? '<p class="hint" id="' + o.id + '-hint">' + o.hint + '</p>' : '') +
    '<p class="err" id="' + o.id + '-err" role="alert"></p></div>';
}
function setErr(form, id, msg) {
  const i = form.querySelector('#' + id), e = form.querySelector('#' + id + '-err');
  if (e) e.textContent = msg || '';
  if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}
function focusFirstInvalid(form) { const el = form.querySelector('[aria-invalid="true"]'); if (el) el.focus(); }
function ring(v, max, label) {
  const r = 34, c = 2 * Math.PI * r, off = c * (1 - Math.min(v, max) / max);
  return '<div class="ring" role="img" aria-label="' + label + ': ' + v + ' / ' + max + '"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="' + r + '" class="ring-bg"/><circle cx="40" cy="40" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg><div class="ring-txt"><b>' + v + '</b><span>/ ' + max + '</span></div></div>';
}
function progressBar(v, max, label) {
  return '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + v + '" aria-label="' + label + '"><span style="width:' + (Math.min(v, max) / max * 100).toFixed(1) + '%"></span></div>';
}
function qrSVG() {
  const N = 25; let s = 20261013, d = '';
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const inFinder = (r, c) => (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!inFinder(r, c) && rnd() < 0.46) d += 'M' + c + ' ' + r + 'h1v1h-1z';
  const finder = (x, y) => '<rect x="' + (x + .5) + '" y="' + (y + .5) + '" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="currentColor"/>';
  return '<svg viewBox="-1 -1 27 27" shape-rendering="crispEdges" aria-hidden="true"><path d="' + d + '" fill="currentColor"/>' + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + '</svg>';
}

/* ---------- Toasts ---------- */
function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast toast--' + (type || 'info');
  el.setAttribute('role', 'status');
  el.innerHTML = ic(type === 'ok' ? 'checkCircle' : type === 'err' ? 'alert' : 'info') + '<span>' + msg + '</span>';
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3600);
}

/* ---------- Modal & confirmation ---------- */
let modalState = null;
function openModal(o) {
  const prevLast = modalState ? modalState.last : null;
  if (modalState) closeModal(true, true);
  const last = prevLast || document.activeElement;
  $('#modal-root').innerHTML = '<div class="modal-backdrop" data-backdrop><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">' +
    '<div class="modal-head"><h2 id="mTitle">' + o.title + '</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="' + t('close') + '">' + ic('x') + '</button></div>' +
    '<div class="modal-body">' + o.body + '</div>' + (o.footer ? '<div class="modal-foot">' + o.footer + '</div>' : '') + '</div></div>';
  document.body.classList.add('no-scroll');
  modalState = { last, onClose: o.onClose };
  const m = $('#modal-root .modal');
  const f = m.querySelector('.modal-body input, .modal-body select, .modal-body textarea') || m.querySelector('.modal-foot .btn-primary, .modal-foot .btn-danger, .modal-foot .btn-ok') || m.querySelector('button');
  setTimeout(() => { if (f) f.focus(); }, 40);
  return m;
}
function closeModal(silent, keepFocusTarget) {
  if (!modalState) return;
  const st = modalState; modalState = null;
  $('#modal-root').innerHTML = '';
  document.body.classList.remove('no-scroll');
  if (!silent && st.onClose) st.onClose();
  if (keepFocusTarget) return;
  if (st.last && st.last.focus && document.contains(st.last)) st.last.focus();
}
function confirmDialog(o) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    openModal({
      title: o.title,
      body: '<p class="modal-text">' + o.message + '</p>',
      footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button>' +
        '<button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" id="mConfirm">' + (o.confirmText || t('confirm')) + '</button>',
      onClose: () => finish(false)
    });
    $('#mConfirm').addEventListener('click', () => { finish(true); closeModal(true); });
  });
}
function showProcessing() {
  openModal({ title: t('processing'), body: '<div class="loading-block" aria-busy="true"><span class="spinner spinner--lg" aria-hidden="true"></span><p>' + t('recording') + '</p></div>' });
}
async function btnLoading(btn, ms) {
  if (!btn) { await wait(ms); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + t('processing') + '</span>';
  await wait(ms);
}

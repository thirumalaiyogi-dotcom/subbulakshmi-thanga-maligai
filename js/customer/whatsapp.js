'use strict';
/* =========================================================
   CUSTOMER · WHATSAPP ENQUIRY & SHARE
   Builds an enquiry message and opens WhatsApp only after the customer taps
   "Open WhatsApp". If the store's number is not configured (js/config.js),
   a setup notice is shown instead of a broken link. Nothing is sent automatically.
   ========================================================= */
addStrings({
  waEnquire: 'Enquire on WhatsApp', waNotSetTitle: 'WhatsApp is not set up yet',
  waNotSetMsg: "The store's WhatsApp number has not been added to this prototype, so this message cannot be opened in WhatsApp. This is the enquiry that would be prepared:",
  waOpenTitle: 'Open WhatsApp?', waOpenMsg: 'WhatsApp will open with this message. Nothing is sent until you press Send inside WhatsApp.',
  openWhatsApp: 'Open WhatsApp', copyMessage: 'Copy message', copied: 'Copied.', copyFailed: 'Could not copy on this device.',
  waHello: 'Vanakkam! I would like to know more about this item:', waGeneral: 'Vanakkam! I would like help choosing jewellery.',
  waSavings: 'Vanakkam! I would like to know about your gold savings schemes.', waCartIntro: 'Vanakkam! I would like to enquire about these items:',
  waDemoNote: '(Sample product shown in the app prototype)', qtyWord: 'Qty',
  share: 'Share', shareDone: 'Link copied to share.', shareTitle: 'Share this item'
}, {
  waEnquire: 'WhatsApp-ல் விசாரிக்க', waNotSetTitle: 'WhatsApp இன்னும் அமைக்கப்படவில்லை',
  waNotSetMsg: 'கடையின் WhatsApp எண் இந்த மாதிரியில் இன்னும் சேர்க்கப்படவில்லை; எனவே இந்தச் செய்தியை WhatsApp-ல் திறக்க இயலாது. அனுப்பப்படவிருக்கும் விசாரணை இதுதான்:',
  waOpenTitle: 'WhatsApp-ஐத் திறக்கவா?', waOpenMsg: 'இந்தச் செய்தியுடன் WhatsApp திறக்கும். WhatsApp-ல் நீங்கள் "அனுப்பு" அழுத்தும் வரை எதுவும் அனுப்பப்படாது.',
  openWhatsApp: 'WhatsApp-ஐத் திற', copyMessage: 'செய்தியை நகலெடு', copied: 'நகலெடுக்கப்பட்டது.', copyFailed: 'இந்தச் சாதனத்தில் நகலெடுக்க இயலவில்லை.',
  waHello: 'வணக்கம்! இந்த நகை பற்றி மேலும் அறிய விரும்புகிறேன்:', waGeneral: 'வணக்கம்! நகை தேர்ந்தெடுக்க உதவி வேண்டும்.',
  waSavings: 'வணக்கம்! உங்கள் தங்கச் சேமிப்புத் திட்டங்கள் பற்றி அறிய விரும்புகிறேன்.', waCartIntro: 'வணக்கம்! இந்த நகைகள் பற்றி விசாரிக்க விரும்புகிறேன்:',
  waDemoNote: '(செயலியின் மாதிரிப் பதிப்பில் காட்டப்பட்ட மாதிரிப் பொருள்)', qtyWord: 'எண்ணிக்கை',
  share: 'பகிர்', shareDone: 'பகிர இணைப்பு நகலெடுக்கப்பட்டது.', shareTitle: 'இந்த நகையைப் பகிர்'
});

function waConfigured() { return /^\d{10,15}$/.test(String(STORE_CONFIG.whatsappNumber || '')); }
function waSign() { return '— ' + L(STORE_CONFIG.name); }
function waMsgProduct(p) {
  const c = getCat(p.category);
  return t('waHello') + '\n\n' + L(p.name) + '\n' + t('productId') + ': ' + p.id + '\n' + t('category') + ': ' + L(c.name) + (p.isDemo ? '\n' + t('waDemoNote') : '') + '\n\n' + waSign();
}
function waMsgCart(items) {
  return t('waCartIntro') + '\n\n' + items.map((i, n) => (n + 1) + '. ' + L(i.p.name) + ' (' + i.p.id + ') × ' + i.qty).join('\n') + (items.some(i => i.p.isDemo) ? '\n' + t('waDemoNote') : '') + '\n\n' + waSign();
}
function waMsgFor(kind, id) {
  if (kind === 'product') { const p = getProduct(id); return p ? waMsgProduct(p) : t('waGeneral'); }
  if (kind === 'cart') return waMsgCart(getCart().map(i => ({ p: getProduct(i.id) || { id: i.id, name: { en: i.id, ta: i.id }, isDemo: false }, qty: i.qty })));
  if (kind === 'savings') return t('waSavings') + '\n\n' + waSign();
  return t('waGeneral') + '\n\n' + waSign();
}
function waButton(kind, id, cls) {
  return '<button type="button" class="btn btn-wa ' + (cls || '') + '" data-action="wa" data-kind="' + kind + '"' + (id ? ' data-id="' + esc(id) + '"' : '') + '>' + ic('whatsapp') + t('waEnquire') + '</button>';
}
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}
function openWhatsAppDialog(text) {
  const preview = '<div class="msg-preview" id="waText">' + esc(text) + '</div>';
  if (!waConfigured()) {
    openModal({
      title: t('waNotSetTitle'),
      body: '<div class="note note--warn">' + ic('alert') + '<span>' + t('waNotSetMsg') + '</span></div>' + preview,
      footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('close') + '</button><button type="button" class="btn btn-primary" data-action="copy-wa">' + ic('copy') + t('copyMessage') + '</button>'
    });
    return;
  }
  const url = 'https://wa.me/' + STORE_CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text);
  openModal({
    title: t('waOpenTitle'),
    body: '<p class="modal-text">' + t('waOpenMsg') + '</p>' + preview,
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><a class="btn btn-wa" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" data-wa-open>' + ic('whatsapp') + t('openWhatsApp') + '</a>'
  });
}
async function shareProduct(p) {
  const url = location.href.split('#')[0] + '#/product/' + encodeURIComponent(p.id);
  const data = { title: L(p.name) + ' · ' + L(STORE_CONFIG.name), text: L(p.name) + ' (' + p.id + ')', url };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  toast((await copyText(url)) ? t('shareDone') : t('copyFailed'), 'info');
}

Object.assign(ACTIONS, {
  'wa': b => openWhatsAppDialog(waMsgFor(b.dataset.kind, b.dataset.id)),
  'copy-wa': async () => { const el = $('#waText'); toast((el && await copyText(el.textContent)) ? t('copied') : t('copyFailed')); },
  'share': b => { const p = getProduct(b.dataset.id); if (p) shareProduct(p); }
});
document.addEventListener('click', e => { if (e.target.closest('[data-wa-open]')) setTimeout(() => closeModal(true), 50); });

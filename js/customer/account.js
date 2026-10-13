'use strict';
/* =========================================================
   CUSTOMER · ACCOUNT
   • Supabase mode: email + password login, registration, password reset,
     profile editing, my orders, logout (js/api.js → Supabase Auth)
   • DEMO mode: the original demo profile (no login exists without a database)
   ========================================================= */
addStrings({
  accountTitle: 'Account', accountSub: 'Demo customer profile — there is no login in this prototype.',
  myShortcuts: 'Shortcuts', storageTitle: 'What is stored on this device',
  storageBody: 'Language, wishlist and cart are kept in this browser (localStorage). Demo savings records are kept only for this browser tab (sessionStorage) and return to the sample data when the tab is closed or reset. Nothing is sent to a server.',
  privacyBody2: 'This prototype stores only your language, reminder preference, wishlist and cart on this device. It does not collect or store real personal or financial information.'
}, {
  accountTitle: 'கணக்கு', accountSub: 'டெமோ வாடிக்கையாளர் சுயவிவரம் — இந்த மாதிரியில் உள்நுழைவு இல்லை.',
  myShortcuts: 'விரைவு இணைப்புகள்', storageTitle: 'இந்தச் சாதனத்தில் சேமிக்கப்படுபவை',
  storageBody: 'மொழி, பிடித்தவை, கூடை ஆகியவை இந்த browser-ல் (localStorage) சேமிக்கப்படுகின்றன. டெமோ சேமிப்புப் பதிவுகள் இந்த browser tab-க்கு மட்டுமே (sessionStorage) வைக்கப்பட்டு, tab-ஐ மூடினால் அல்லது மீட்டமைத்தால் மாதிரித் தரவுக்குத் திரும்பும். எதுவும் server-க்கு அனுப்பப்படுவதில்லை.',
  privacyBody2: 'இந்த மாதிரி உங்கள் மொழி, நினைவூட்டல் விருப்பம், பிடித்தவை, கூடை ஆகியவற்றை மட்டுமே இந்தச் சாதனத்தில் சேமிக்கிறது. உண்மையான தனிப்பட்ட அல்லது நிதித் தகவல்களைச் சேகரிப்பதோ சேமிப்பதோ இல்லை.'
});

function pageAccountDemo() {
  const me = getCust(ME), initials = me.name.split(' ').map(p => p[0]).join('').slice(0, 2);
  const wl = Wishlist.count(), cc = cartCount();
  const link = (to, icon, label, extra) => '<button class="qa" data-go="' + to + '"><span class="qa-ic">' + ic(icon) + '</span>' + t(label) + (extra ? ' (' + extra + ')' : '') + '</button>';
  return pageHead(t('accountTitle'), t('accountSub')) +
    '<section class="profile-card"><div class="avatar" aria-hidden="true">' + initials + '</div><div><h1 class="h1">' + esc(custName(me)) + '</h1><p><span class="mono">' + me.id + '</span> · <span class="tag-demo">DEMO</span></p></div></section>' +
    '<section aria-labelledby="scH"><h2 class="h2 section-head" id="scH">' + t('myShortcuts') + '</h2><div class="acct-links">' +
      link('wishlist', 'heart', 'n_wishlist', wl) + link('cart', 'bag', 'n_cart', cc) + link('passbook', 'book', 'digitalPassbook') + link('transactions', 'clock', 'history') + '</div></section>' +
    '<div class="two-col">' +
      '<section class="panel"><h2 class="h3">' + t('details') + '</h2><dl class="kv"><dt>' + t('customerId') + '</dt><dd class="mono">' + me.id + '</dd><dt>' + t('phone') + '</dt><dd class="mono">' + me.phone + '</dd>' +
        '<dt>' + t('town') + '</dt><dd>' + custTown(me) + '</dd><dt>' + t('branch') + '</dt><dd>' + t('brand') + '</dd><dt>' + t('memberSince') + '</dt><dd>' + fmtDate(me.joined) + '</dd></dl></section>' +
      '<section class="panel"><h2 class="h3">' + t('language') + '</h2><p class="muted small">' + t('languageHint') + '</p>' + langToggle('wide') + '</section>' +
      '<section class="panel"><h2 class="h3">' + t('help') + '</h2><ul class="list-rows"><li>' + ic('phone') + '<span>' + t('phone') + ': ' + (STORE_CONFIG.phone ? esc(STORE_CONFIG.phone) : t('notAddedYet')) + '</span></li><li>' + ic('pin') + '<span>' + t('address') + ': ' + (L(STORE_CONFIG.address) ? esc(L(STORE_CONFIG.address)) : t('notAddedYet')) + '</span></li></ul>' +
        waButton('general', '', 'btn-block') + '<button class="btn btn-outline btn-block" data-action="callback">' + ic('phone') + t('requestCallback') + '</button></section>' +
      '<section class="panel"><h2 class="h3">' + t('privacy') + '</h2><details class="acc"><summary>' + t('termsOfUse') + '</summary><div class="acc-body">' + t('termsOfUseBody') + '</div></details>' +
        '<details class="acc"><summary>' + t('privacyTitle') + '</summary><div class="acc-body">' + t('privacyBody2') + '</div></details>' +
        '<details class="acc"><summary>' + t('storageTitle') + '</summary><div class="acc-body">' + t('storageBody') + '</div></details></section>' +
    '</div>' +
    '<div class="profile-actions"><button class="btn btn-outline" data-action="enter-admin">' + ic('shield') + t('switchAdmin') + '</button><button class="btn btn-ghost" data-action="reset-demo">' + ic('refresh') + t('resetDemo') + '</button><button class="btn btn-ghost" data-action="show-welcome">' + ic('logout') + t('backToWelcome') + '</button></div>';
}

Object.assign(ACTIONS, {
  'enter-admin': async () => { if (await confirmDialog({ title: t('adminConfirmTitle'), message: t('adminConfirmMsg'), confirmText: t('openAdmin') })) { sstore.set('adminAck', true); location.href = 'admin.html'; } },
  'callback': async () => { if (await confirmDialog({ title: t('callbackTitle'), message: t('callbackMsg'), confirmText: t('requestCallback') })) toast(t('callbackDone')); },
  'reset-demo': async () => {
    if (!(await confirmDialog({ title: t('resetTitle'), message: t('resetMsg'), confirmText: t('resetBtn'), danger: true }))) return;
    resetDemo(); Object.assign(UI, { paySel: null, payResult: null, redeemSel: null }); toast(t('resetDone')); render();
  },
  'welcome-continue': () => { store.set('seenWelcome', true); go('home'); },
  'show-welcome': () => go('welcome')
});

/* =========================================================
   Supabase-mode account screens
   ========================================================= */
addStrings({
  loginTab: 'Log in', registerTab: 'Create account', password2Label: 'Confirm password',
  passwordHint: 'At least 8 characters.', registerBtn: 'Create account', forgotLink: 'Forgot password?',
  resetTitle2: 'Reset your password', resetHint: 'Enter your account email. If an account exists, Supabase will email a reset link.', sendResetBtn: 'Send reset link',
  resetSent: 'If an account exists for this email, a password reset link has been sent. Check your inbox.', backToLogin: 'Back to log in',
  newPasswordTitle: 'Set a new password', savePasswordBtn: 'Save new password', passwordSaved: 'Password updated.',
  errPasswordMatch: 'Passwords do not match.', agreeAccount: 'I agree to the terms of use and privacy notice.', errAgree2: 'Please accept to continue.',
  welcomeBackToast: 'You are logged in.', loggedOutToast: 'You have logged out.', logoutConfirmTitle: 'Log out?', logoutConfirmMsg: 'Your cart stays on this device.',
  registeredToast: 'Account created.', confirmEmailTitle: 'Confirm your email', confirmEmailMsg: 'Supabase has sent a confirmation link to {email}. Open it, then log in here.',
  profileTitle2: 'Your details', saveProfileBtn: 'Save details', profileSaved: 'Details saved.', townLabel: 'Town (optional)', loggedInAs: 'Logged in as',
  phoneOptional: 'Mobile number (optional)', wishMerged: 'Items saved on this device were added to your wishlist.',
  accountLiveSub: 'Log in to save your wishlist and send order requests.', savingsDemoNote: 'Gold savings screens are still a DEMO preview and are not linked to your account yet.'
}, {
  loginTab: 'உள்நுழை', registerTab: 'கணக்கு உருவாக்கு', password2Label: 'கடவுச்சொல்லை உறுதிசெய்',
  passwordHint: 'குறைந்தது 8 எழுத்துகள்.', registerBtn: 'கணக்கு உருவாக்கு', forgotLink: 'கடவுச்சொல் மறந்துவிட்டதா?',
  resetTitle2: 'கடவுச்சொல்லை மீட்டமை', resetHint: 'உங்கள் கணக்கு மின்னஞ்சலை உள்ளிடவும். கணக்கு இருந்தால், Supabase மீட்டமைப்பு இணைப்பை மின்னஞ்சலில் அனுப்பும்.', sendResetBtn: 'மீட்டமைப்பு இணைப்பை அனுப்பு',
  resetSent: 'இந்த மின்னஞ்சலுக்குக் கணக்கு இருந்தால், கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டுள்ளது. Inbox-ஐப் பாருங்கள்.', backToLogin: 'உள்நுழைவுக்குத் திரும்பு',
  newPasswordTitle: 'புதிய கடவுச்சொல் அமை', savePasswordBtn: 'புதிய கடவுச்சொல்லைச் சேமி', passwordSaved: 'கடவுச்சொல் மாற்றப்பட்டது.',
  errPasswordMatch: 'கடவுச்சொற்கள் பொருந்தவில்லை.', agreeAccount: 'பயன்பாட்டு விதிமுறைகளையும் தனியுரிமை அறிவிப்பையும் ஏற்கிறேன்.', errAgree2: 'தொடர ஏற்கவும்.',
  welcomeBackToast: 'உள்நுழைந்துவிட்டீர்கள்.', loggedOutToast: 'வெளியேறிவிட்டீர்கள்.', logoutConfirmTitle: 'வெளியேறவா?', logoutConfirmMsg: 'உங்கள் கூடை இந்தச் சாதனத்தில் இருக்கும்.',
  registeredToast: 'கணக்கு உருவாக்கப்பட்டது.', confirmEmailTitle: 'மின்னஞ்சலை உறுதிசெய்யவும்', confirmEmailMsg: 'Supabase உறுதிப்படுத்தல் இணைப்பை {email} முகவரிக்கு அனுப்பியுள்ளது. அதைத் திறந்த பின் இங்கே உள்நுழையவும்.',
  profileTitle2: 'உங்கள் விவரங்கள்', saveProfileBtn: 'விவரங்களைச் சேமி', profileSaved: 'விவரங்கள் சேமிக்கப்பட்டன.', townLabel: 'ஊர் (விரும்பினால்)', loggedInAs: 'உள்நுழைந்தவர்',
  phoneOptional: 'கைபேசி எண் (விரும்பினால்)', wishMerged: 'இந்தச் சாதனத்தில் சேமித்த நகைகள் உங்கள் பிடித்தவையில் சேர்க்கப்பட்டன.',
  accountLiveSub: 'பிடித்தவையைச் சேமிக்கவும் ஆர்டர் கோரிக்கை அனுப்பவும் உள்நுழையவும்.', savingsDemoNote: 'தங்கச் சேமிப்புத் திரைகள் இன்னும் டெமோ முன்னோட்டம் மட்டுமே; உங்கள் கணக்குடன் இணைக்கப்படவில்லை.'
});
UI.authTab = 'login';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function pageAccount() {
  if (!isLive()) return pageAccountDemo();
  if (Auth.recovery && Auth.user) {
    return pageHead(t('newPasswordTitle')) + '<form class="panel" data-form="new-password" novalidate style="max-width:520px">' +
      field({ id: 'npPass', label: t('passwordLabel'), type: 'password', hint: t('passwordHint'), attrs: 'autocomplete="new-password" minlength="8" maxlength="72"' }) +
      field({ id: 'npPass2', label: t('password2Label'), type: 'password', attrs: 'autocomplete="new-password" maxlength="72"' }) +
      '<p class="err" id="authErr" role="alert"></p><button class="btn btn-primary btn-block mt" type="submit">' + t('savePasswordBtn') + '</button></form>';
  }
  if (!Auth.user) return pageHead(t('accountTitle'), t('accountLiveSub')) + authForms();
  const pr = Auth.profile || {}, name = pr.full_name || Auth.user.email;
  const initials = String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const link = (to, icon, label, extra) => '<button class="qa" data-go="' + to + '"><span class="qa-ic">' + ic(icon) + '</span>' + t(label) + (extra ? ' (' + extra + ')' : '') + '</button>';
  return pageHead(t('accountTitle')) +
    '<section class="profile-card"><div class="avatar" aria-hidden="true">' + esc(initials) + '</div><div style="min-width:0"><h1 class="h1">' + esc(name) + '</h1><p>' + t('loggedInAs') + ' <span class="mono">' + esc(Auth.user.email) + '</span></p></div></section>' +
    '<section aria-labelledby="scH"><h2 class="h2 section-head" id="scH">' + t('myShortcuts') + '</h2><div class="acct-links">' +
      link('orders', 'receipt', 'myOrdersLink') + link('wishlist', 'heart', 'n_wishlist', Wishlist.count()) + link('cart', 'bag', 'n_cart', cartCount()) + link('savings', 'coins', 'n_savings') + '</div></section>' +
    '<div class="two-col">' +
      '<form class="panel" data-form="profile" novalidate><h2 class="h3">' + t('profileTitle2') + '</h2>' +
        field({ id: 'pfName', label: t('fullName'), value: pr.full_name || '', attrs: 'autocomplete="name" maxlength="80"' }) +
        field({ id: 'pfPhone', label: t('phoneOptional'), type: 'tel', value: pr.phone || '', required: false, hint: t('phoneHint10'), attrs: 'inputmode="numeric" autocomplete="tel-national" maxlength="14"' }) +
        field({ id: 'pfTown', label: t('townLabel'), value: pr.town || '', required: false, attrs: 'maxlength="60"' }) +
        '<div class="field"><p class="label">' + t('language') + '</p>' + langToggle('wide') + '</div>' +
        '<p class="err" id="pfErr" role="alert"></p><button class="btn btn-primary btn-block mt" type="submit">' + t('saveProfileBtn') + '</button></form>' +
      '<section class="panel"><h2 class="h3">' + t('help') + '</h2><ul class="list-rows"><li>' + ic('phone') + '<span>' + t('phone') + ': ' + (STORE_CONFIG.phone ? esc(STORE_CONFIG.phone) : t('notAddedYet')) + '</span></li><li>' + ic('pin') + '<span>' + t('address') + ': ' + (L(STORE_CONFIG.address) ? esc(L(STORE_CONFIG.address)) : t('notAddedYet')) + '</span></li></ul>' +
        waButton('general', '', 'btn-block') +
        '<details class="acc mt"><summary>' + t('termsOfUse') + '</summary><div class="acc-body">' + t('liveTermsBody') + '</div></details>' +
        '<details class="acc"><summary>' + t('privacyTitle') + '</summary><div class="acc-body">' + t('livePrivacyBody') + '</div></details></section>' +
    '</div>' +
    '<div class="note note--info">' + ic('info') + '<span>' + t('savingsDemoNote') + '</span></div>' +
    '<div class="profile-actions"><button class="btn btn-outline" data-action="logout">' + ic('logout') + t('logoutBtn') + '</button><button class="btn btn-ghost" data-action="enter-admin">' + ic('shield') + t('switchAdmin') + '</button></div>';
}
function authForms() {
  const tab = UI.authTab;
  const tabs = '<div class="chips" role="tablist">' + ['login', 'register'].map(k => '<button class="fchip" role="tab" data-action="auth-tab" data-v="' + k + '" aria-selected="' + (tab === k) + '" aria-pressed="' + (tab === k) + '">' + t(k + 'Tab') + '</button>').join('') + '</div>';
  let form;
  if (tab === 'forgot') {
    form = '<form class="panel" data-form="forgot" novalidate><h2 class="h3">' + t('resetTitle2') + '</h2><p class="muted small">' + t('resetHint') + '</p>' +
      field({ id: 'fgEmail', label: t('emailLabel'), type: 'email', attrs: 'autocomplete="email" maxlength="254"' }) +
      '<p class="err" id="authErr" role="alert"></p><div id="authInfo"></div><button class="btn btn-primary btn-block mt" type="submit">' + t('sendResetBtn') + '</button>' +
      '<button type="button" class="link-btn mt" data-action="auth-tab" data-v="login">' + ic('left') + t('backToLogin') + '</button></form>';
  } else if (tab === 'register') {
    form = '<form class="panel" data-form="register" novalidate>' +
      field({ id: 'rgName', label: t('fullName'), attrs: 'autocomplete="name" maxlength="80"' }) +
      field({ id: 'rgPhone', label: t('phoneOptional'), type: 'tel', required: false, hint: t('phoneHint10'), attrs: 'inputmode="numeric" autocomplete="tel-national" maxlength="14"' }) +
      field({ id: 'rgEmail', label: t('emailLabel'), type: 'email', attrs: 'autocomplete="email" maxlength="254"' }) +
      field({ id: 'rgPass', label: t('passwordLabel'), type: 'password', hint: t('passwordHint'), attrs: 'autocomplete="new-password" maxlength="72"' }) +
      field({ id: 'rgPass2', label: t('password2Label'), type: 'password', attrs: 'autocomplete="new-password" maxlength="72"' }) +
      '<label class="check"><input type="checkbox" id="rgAgree" name="rgAgree" aria-describedby="rgAgree-err"><span>' + t('agreeAccount') + '</span></label><p class="err" id="rgAgree-err" role="alert"></p>' +
      '<p class="err" id="authErr" role="alert"></p><div id="authInfo"></div><button class="btn btn-primary btn-block mt" type="submit">' + t('registerBtn') + '</button></form>';
  } else {
    form = '<form class="panel" data-form="login" novalidate>' +
      field({ id: 'lgEmail', label: t('emailLabel'), type: 'email', attrs: 'autocomplete="email" maxlength="254"' }) +
      field({ id: 'lgPass', label: t('passwordLabel'), type: 'password', attrs: 'autocomplete="current-password" maxlength="72"' }) +
      '<p class="err" id="authErr" role="alert"></p><button class="btn btn-primary btn-block mt" type="submit">' + t('loginBtn') + '</button>' +
      '<button type="button" class="link-btn mt" data-action="auth-tab" data-v="forgot">' + t('forgotLink') + '</button></form>';
  }
  return '<div style="max-width:520px">' + (tab === 'forgot' ? '' : tabs) + '<div class="mt">' + form + '</div></div>';
}
async function withBusy(form, fn) {
  const btn = form.querySelector('button[type="submit"]'), label = btn.innerHTML, err = form.querySelector('#authErr, #pfErr');
  btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + t('processing') + '</span>';
  if (err) err.textContent = '';
  try { await fn(); }
  catch (e) { if (err) err.textContent = errorText(toApiError(e)); }
  finally { if (document.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } }
}
async function afterLogin() {
  try { const n = await Wishlist.mergeLocal(); if (n) toast(t('wishMerged')); } catch (e) { /* the local copy is kept if merging fails */ }
  if (Auth.profile && Auth.profile.preferred_language && Auth.profile.preferred_language !== lang) setLang(Auth.profile.preferred_language);
}
Object.assign(FORMS, {
  login: f => {
    const email = f.elements.lgEmail.value.trim().toLowerCase(), pass = f.elements.lgPass.value;
    let ok = setErr(f, 'lgEmail', EMAIL_RE.test(email) ? '' : t('errEmail'));
    ok = setErr(f, 'lgPass', pass ? '' : t('errPasswordShort')) && ok;
    if (!ok) { focusFirstInvalid(f); return; }
    return withBusy(f, async () => { await Auth.signIn(email, pass); await afterLogin(); toast(t('welcomeBackToast'), 'ok'); render(); });
  },
  register: f => {
    const name = f.elements.rgName.value.trim(), phone = f.elements.rgPhone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const email = f.elements.rgEmail.value.trim().toLowerCase(), pass = f.elements.rgPass.value, pass2 = f.elements.rgPass2.value;
    let ok = setErr(f, 'rgName', (name.length >= 2 && name.length <= 80) ? '' : t('errName'));
    ok = setErr(f, 'rgPhone', (!phone || /^[6-9]\d{9}$/.test(phone)) ? '' : t('errPhone')) && ok;
    ok = setErr(f, 'rgEmail', EMAIL_RE.test(email) ? '' : t('errEmail')) && ok;
    ok = setErr(f, 'rgPass', pass.length >= 8 ? '' : t('errPasswordShort')) && ok;
    ok = setErr(f, 'rgPass2', pass2 === pass ? '' : t('errPasswordMatch')) && ok;
    ok = setErr(f, 'rgAgree', f.elements.rgAgree.checked ? '' : t('errAgree2')) && ok;
    if (!ok) { focusFirstInvalid(f); return; }
    return withBusy(f, async () => {
      const r = await Auth.signUp({ email, password: pass, fullName: name, phone: phone || null });
      if (r.needsConfirmation) {
        const info = $('#authInfo');
        if (info) info.innerHTML = '<div class="result result--info">' + ic('info') + '<div><h3>' + t('confirmEmailTitle') + '</h3><p>' + esc(t('confirmEmailMsg').replace('{email}', email)) + '</p></div></div>';
        f.reset();
      } else { await afterLogin(); toast(t('registeredToast'), 'ok'); render(); }
    });
  },
  forgot: f => {
    const email = f.elements.fgEmail.value.trim().toLowerCase();
    if (!setErr(f, 'fgEmail', EMAIL_RE.test(email) ? '' : t('errEmail'))) { focusFirstInvalid(f); return; }
    return withBusy(f, async () => {
      await Auth.sendReset(email);
      const info = $('#authInfo'); if (info) info.innerHTML = '<div class="note note--info">' + ic('info') + '<span>' + t('resetSent') + '</span></div>';
    });
  },
  'new-password': f => {
    const p1 = f.elements.npPass.value, p2 = f.elements.npPass2.value;
    let ok = setErr(f, 'npPass', p1.length >= 8 ? '' : t('errPasswordShort'));
    ok = setErr(f, 'npPass2', p1 === p2 ? '' : t('errPasswordMatch')) && ok;
    if (!ok) { focusFirstInvalid(f); return; }
    return withBusy(f, async () => { await Auth.setNewPassword(p1); toast(t('passwordSaved'), 'ok'); render(); });
  },
  profile: f => {
    const name = f.elements.pfName.value.trim(), phone = f.elements.pfPhone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''), town = f.elements.pfTown.value.trim();
    let ok = setErr(f, 'pfName', (name.length >= 2 && name.length <= 80) ? '' : t('errName'));
    ok = setErr(f, 'pfPhone', (!phone || /^[6-9]\d{9}$/.test(phone)) ? '' : t('errPhone')) && ok;
    ok = setErr(f, 'pfTown', town.length <= 60 ? '' : t('errName')) && ok;
    if (!ok) { focusFirstInvalid(f); return; }
    return withBusy(f, async () => { await Auth.updateProfile({ full_name: name, phone: phone || null, town: town || null, preferred_language: lang }); toast(t('profileSaved'), 'ok'); });
  }
});
Object.assign(ACTIONS, {
  'auth-tab': b => { UI.authTab = b.dataset.v; render(); const f = $('#view form input'); if (f) f.focus(); },
  'logout': async () => {
    if (!(await confirmDialog({ title: t('logoutConfirmTitle'), message: t('logoutConfirmMsg'), confirmText: t('logoutBtn') }))) return;
    try { await Auth.signOut(); } catch (e) { /* session is cleared locally either way */ }
    toast(t('loggedOutToast')); go('home');
  }
});
addStrings({
  liveTermsBody: 'Order requests are not purchases: the store confirms availability, weight and final price before any sale. Prices shown are the store\'s listed prices; gold-rate-based items are priced at the store.',
  livePrivacyBody: 'Your name, email, mobile number, wishlist and order requests are stored securely in the store\'s database and are visible only to you and authorised store staff. Language and cart are kept on this device.'
}, {
  liveTermsBody: 'ஆர்டர் கோரிக்கைகள் வாங்குதல் அல்ல: விற்பனைக்கு முன் கடை இருப்பு, எடை, இறுதி விலையை உறுதிசெய்யும். காட்டப்படும் விலைகள் கடை குறிப்பிட்ட விலைகள்; தங்க விலை அடிப்படையிலான நகைகளுக்குக் கடையில் விலை நிர்ணயிக்கப்படும்.',
  livePrivacyBody: 'உங்கள் பெயர், மின்னஞ்சல், கைபேசி எண், பிடித்தவை, ஆர்டர் கோரிக்கைகள் கடையின் database-ல் பாதுகாப்பாகச் சேமிக்கப்படுகின்றன; உங்களுக்கும் அனுமதி பெற்ற கடை ஊழியர்களுக்கும் மட்டுமே தெரியும். மொழியும் கூடையும் இந்தச் சாதனத்தில் வைக்கப்படும்.'
});

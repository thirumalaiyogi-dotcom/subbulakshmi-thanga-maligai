'use strict';
/* =========================================================
   CUSTOMER · WISHLIST
   • Supabase mode: stored in the customer's account (wishlists table, RLS: own rows only)
   • DEMO mode / before login: this device only (localStorage), clearly labelled
   ========================================================= */
addStrings({
  wishTitle: 'Wishlist', wishSub: 'Jewellery you have saved.', wishEmpty: 'Your wishlist is empty',
  wishEmptyHint: 'Tap the heart on any item to save it here.', browseJewellery: 'Browse jewellery',
  deviceStorageNote: 'Saved only in this browser on this device. It is not linked to an account and is not stored on a server. Clearing browser data removes it.',
  clearWishlist: 'Clear wishlist', clearWishTitle: 'Clear the wishlist?', clearWishMsg: 'All saved items will be removed.', cleared: 'Cleared.',
  accountWishNote: 'Saved to your account — available when you log in on any device.', wishLoginTitle: 'Log in to save items',
  wishLoginMsg: 'Your wishlist is saved to your account so only you can see it. Please log in or create an account.', loginOrRegister: 'Log in / Register'
}, {
  wishTitle: 'பிடித்தவை', wishSub: 'நீங்கள் சேமித்த நகைகள்.', wishEmpty: 'பிடித்தவை பட்டியல் காலியாக உள்ளது',
  wishEmptyHint: 'எந்த நகையிலும் இதயக் குறியைத் தொட்டு இங்கே சேமிக்கலாம்.', browseJewellery: 'நகைகளைப் பார்க்க',
  deviceStorageNote: 'இந்தச் சாதனத்தின் browser-ல் மட்டுமே சேமிக்கப்படுகிறது. இது கணக்குடன் இணைக்கப்படவில்லை; server-ல் சேமிக்கப்படுவதில்லை. Browser தரவை அழித்தால் இதுவும் அழியும்.',
  clearWishlist: 'பிடித்தவையை அழி', clearWishTitle: 'பிடித்தவை பட்டியலை அழிக்கவா?', clearWishMsg: 'சேமித்த அனைத்து நகைகளும் நீக்கப்படும்.', cleared: 'அழிக்கப்பட்டது.',
  accountWishNote: 'உங்கள் கணக்கில் சேமிக்கப்பட்டது — எந்தச் சாதனத்தில் உள்நுழைந்தாலும் காணலாம்.', wishLoginTitle: 'சேமிக்க உள்நுழையவும்',
  wishLoginMsg: 'பிடித்தவை உங்கள் கணக்கில் சேமிக்கப்படும்; உங்களால் மட்டுமே பார்க்க முடியும். உள்நுழையவும் அல்லது கணக்கு உருவாக்கவும்.', loginOrRegister: 'உள்நுழை / பதிவு செய்'
});

function wishNote() {
  return '<div class="note note--info">' + ic('info') + '<span>' + (isLive() ? t('accountWishNote') : t('deviceStorageNote')) + '</span></div>';
}
function pageWishlist() {
  if (isLive() && !Auth.user) return pageHead(t('wishTitle'), t('wishSub')) + emptyState('heart', t('wishLoginTitle'), t('wishLoginMsg'), '<button class="btn btn-primary" data-go="account">' + t('loginOrRegister') + '</button>');
  return pageHead(t('wishTitle'), t('wishSub'), '<button class="btn btn-ghost btn-sm" data-action="wish-clear" id="wishClearBtn" hidden>' + ic('trash') + t('clearWishlist') + '</button>') +
    '<div id="wishList">' + gridSkeleton(4) + '</div>' + wishNote();
}
function fillWishlist(token) {
  fillAsync('#wishList', token, () => Wishlist.products(), items => {
    const btn = $('#wishClearBtn'); if (btn) btn.hidden = !items.length;
    if (!items.length) return emptyState('heart', t('wishEmpty'), t('wishEmptyHint'), '<button class="btn btn-primary" data-go="shop/all">' + t('browseJewellery') + '</button>');
    return '<p class="result-count">' + items.length + ' ' + t('itemsCount') + '</p><div class="pgrid mt">' + items.map(productCard).join('') + '</div>';
  });
}
function askLogin() {
  openModal({
    title: t('wishLoginTitle'), body: '<p class="modal-text">' + t('wishLoginMsg') + '</p>',
    footer: '<button type="button" class="btn btn-outline" data-action="modal-close">' + t('cancel') + '</button><button type="button" class="btn btn-primary" data-go="account">' + t('loginOrRegister') + '</button>'
  });
}

Object.assign(ACTIONS, {
  'wish': async b => {
    const p = getProduct(b.dataset.id); if (!p) return;
    if (isLive() && !Auth.user) { askLogin(); return; }
    b.disabled = true;
    try {
      const now = await Wishlist.toggle(p);
      toast(now ? (isLive() ? t('wishAddedAccount') : t('wishAdded')) : t('wishRemoved'));
      if (route.page === 'wishlist' || route.page === 'product') { render(); const again = document.querySelector('[data-action="wish"][data-id="' + CSS.escape(p.id) + '"]'); if (again) again.focus(); return; }
      document.querySelectorAll('[data-action="wish"][data-id="' + CSS.escape(p.id) + '"]').forEach(x => { x.setAttribute('aria-pressed', String(now)); if (x.classList.contains('wish-btn')) x.setAttribute('aria-label', (now ? t('wishRemove') : t('wishAdd')) + ': ' + L(p.name)); });
    } catch (e) { toast(errorText(toApiError(e)), 'err'); }
    finally { b.disabled = false; }
  },
  'wish-clear': async () => {
    if (!(await confirmDialog({ title: t('clearWishTitle'), message: t('clearWishMsg'), confirmText: t('clearWishlist'), danger: true }))) return;
    try { await Wishlist.clear(); toast(t('cleared')); render(); } catch (e) { toast(errorText(toApiError(e)), 'err'); }
  }
});
addStrings({ wishAddedAccount: 'Saved to your wishlist.' }, { wishAddedAccount: 'பிடித்தவையில் சேமிக்கப்பட்டது.' });

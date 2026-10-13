"""DEMO-mode regression (no Supabase config). Run from the project root:
    python tests/frontend/demo_mode_test.py
"""
import asyncio, re
from playwright.async_api import async_playwright
import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
C='file://'+ROOT+'/index.html'; A='file://'+ROOT+'/admin.html'
R=[]
import base64, json
_cfg=open(ROOT+'/js/config.js').read()
DEMO_CONFIG=re.sub(r"anonKey: '[^']*'","anonKey: ''",re.sub(r"url: '[^']*',","url: '',",_cfg,count=1),count=1)
def ok(n,c,info=''): R.append((n,bool(c),info))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':800}, accept_downloads=True)
    await ctx.route('**/js/config.js', lambda r: r.fulfill(body=DEMO_CONFIG, content_type='application/javascript'))  # force DEMO mode
    await ctx.route('**/*fonts*/**', lambda r: r.abort())
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_FAILED' not in m.text else None)
    popups=[]; pg.on('popup',lambda p: popups.append(p.url))
    w=lambda ms=450: pg.wait_for_timeout(ms)
    # 1 opens
    await pg.goto(C); await w(); ok('1 app opens (welcome first visit)', await pg.locator('.welcome').count()==1)
    await pg.click('[data-action="welcome-continue"]'); await w()
    ok('1b welcome → home', 'home' in await pg.evaluate('location.hash'))
    # 2 nav
    for k in ['home','shop','wishlist','savings','account']:
      await pg.click(f'.bottom-nav [data-go="{k}"]'); await w()
      cur=await pg.locator(f'.bottom-nav [data-go="{k}"][aria-current="page"]').count()
      ok(f'2 bottom nav {k} active', cur==1)
    await pg.go_back(); await w(); ok('2b browser back works', 'savings' in await pg.evaluate('location.hash'))
    # 3 categories from home
    await pg.goto(C+'#/home'); await w()
    await pg.click('.cat-tile[data-go="shop/earrings"]'); await w(700)
    cats=await pg.evaluate("[...document.querySelectorAll('.pcard-cat')].map(e=>e.textContent)")
    ok('3 home category opens filtered list', len(cats)>0 and all('Earrings' in c for c in cats), str(len(cats)))
    # 4 search
    await pg.goto(C+'#/home'); await w(); await pg.fill('input[name=homeQ]','jhumka'); await pg.click('form[data-form="home-search"] button[type=submit]'); await w(700)
    names=await pg.evaluate("[...document.querySelectorAll('.pcard-name')].map(e=>e.textContent)")
    ok('4 search returns matching demo product', names==['Jhumka Earrings'], str(names))
    await pg.fill('[data-filter="shop"]','zzzz'); await w(200); ok('4b empty results state', await pg.locator('#shopList .empty').count()==1)
    await pg.click('[data-action="shop-clear"]'); await w(700)
    # 5 filter chips + sort
    await pg.click('.fchip[data-go="shop/silver"]'); await w(700)
    n=await pg.locator('.pcard').count(); ok('5 category chip filter', n==4, str(n))
    opts=await pg.evaluate("[...document.querySelectorAll('#shopSort option')].map(o=>o.value)")
    ok('5b price sort offered only with sample prices', 'price_asc' in opts)
    await pg.select_option('#shopSort','price_asc'); await w(200)
    first=await pg.evaluate("document.querySelector('.pcard-name').textContent"); ok('5c sort by sample price asc', 'Toe' in first, first)
    await pg.click('.fchip[data-go="shop/rings"]'); await w(700)
    opts=await pg.evaluate("[...document.querySelectorAll('#shopSort option')].map(o=>o.value)"); ok('5d no price sort without prices', 'price_asc' not in opts)
    # 6 product details
    await pg.click('.pcard-name button >> nth=0'); await w()
    ok('6 product detail opens', await pg.locator('.pd-title').count()==1)
    txt=await pg.evaluate("document.getElementById('app').innerText")
    ok('6b contact-store price + DEMO label', 'Contact store for price' in txt and 'DEMO' in txt)
    await pg.click('.pd-thumb >> nth=1'); await w(200); ok('6c gallery thumb switches', await pg.locator('.pd-thumb[aria-current="true"]').get_attribute('data-i')=='1')
    # 7 wishlist
    await pg.click('.pd-actions [data-action="wish"]'); await w()
    wl=await pg.evaluate("localStorage.getItem('stm_digigold_wishlist')"); ok('7 wishlist add', wl and 'DEMO' in wl, wl)
    await pg.goto(C+'#/wishlist'); await w(); ok('7b wishlist page lists item', await pg.locator('.pcard').count()==1)
    await pg.click('.pcard .wish-btn'); await w(); ok('7c wishlist remove → empty state', await pg.locator('.empty').count()>=1)
    # 8 cart
    await pg.goto(C+'#/product/DEMO-S003'); await w(); await pg.click('[data-action="add-cart"]'); await w()
    await pg.goto(C+'#/product/DEMO-R002'); await w(); await pg.click('[data-action="add-cart"]'); await w()
    await pg.goto(C+'#/product/DEMO-BR02'); await w(); ok('8 out-of-stock cannot be added', await pg.locator('[data-action="add-cart"][disabled]').count()==1)
    await pg.goto(C+'#/cart'); await w(); ok('8b cart shows 2 items', await pg.locator('.cart-item').count()==2)
    await pg.click('[data-action="qty"][data-d="1"]'); await w()
    sub=await pg.evaluate("document.querySelector('.cart-sum').innerText"); ok('8c qty + subtotal of sample prices only', '₹1,300' in sub, sub[:120].replace('\n',' | '))
    ok('8d no checkout available', await pg.locator('.cart-sum button[disabled]').count()==1)
    await pg.click('[data-action="cart-remove"] >> nth=0'); await w(); ok('8e remove item', await pg.locator('.cart-item').count()==1)
    badge=await pg.evaluate("(document.querySelector('.topbar .badge')||{}).textContent"); ok('8f cart badge', badge is not None, str(badge))
    # 9 whatsapp
    await pg.click('.cart-sum [data-action="wa"]'); await w(); mt=await pg.evaluate("document.querySelector('.modal-head h2').textContent")
    ok('9 WhatsApp not configured → setup notice, no link', 'not set up' in mt and await pg.locator('.modal a[href*="wa.me"]').count()==0 and not popups, mt)
    await pg.keyboard.press('Escape'); await w(200)
    # 10 language
    await pg.click('.topbar [data-action="set-lang"][data-v="ta"]'); await w()
    lbl=await pg.evaluate("document.querySelector('.bottom-nav [data-go=\"shop\"]').textContent"); ok('10 Tamil switch', lbl=='நகைகள்', lbl)
    await pg.reload(); await w(); ok('10b language remembered after reload', await pg.evaluate("document.documentElement.lang")=='ta')
    await pg.click('.topbar [data-action="set-lang"][data-v="en"]'); await w()
    # 11 savings preserved: enroll, pay, redeem
    await pg.goto(C+'#/pay'); await w()
    await pg.fill('#payAmt','2500'); await pg.fill('#payRef','UPI99887766'); await pg.click('form[data-form="pay"] button[type=submit]'); await w(200)
    await pg.click('#mConfirm'); await w(1400)
    box=await pg.evaluate("(document.getElementById('payResultBox')||{}).innerText||''")
    ok('11 pay reference → pending, never success', 'Pending verification' in box and 'success' not in box.lower(), box[:60])
    await pg.goto(C+'#/redeem'); await w(); ok('11b redemption form present', await pg.locator('form[data-form="redeem"]').count()==1)
    await pg.goto(C+'#/scheme/kuber'); await w(); await pg.click('.detail-hero [data-action="enroll"]'); await w()
    await pg.fill('#enPhone','9876543210'); await pg.select_option('#enAmount','2000'); await pg.check('#enAgree'); await pg.click('.modal-foot button[type=submit]'); await w(200); await pg.click('#mConfirm'); await w(1300)
    ok('11c enrollment recorded (pending approval)', 'recorded' in (await pg.evaluate("document.querySelector('.modal-head h2').textContent")))
    await pg.keyboard.press('Escape')
    for r in ['savings','schemes','passbook','transactions']:
      await pg.goto(C+'#/'+r); await w(600); ok('11d savings screen '+r, await pg.locator('.subnav [aria-current="page"]').count()==1)
    # 12 admin + shared demo state
    await pg.goto(A); await w(); ok('12 admin shows no-auth notice first', await pg.locator('[data-action="gate-ok"]').count()==1)
    await pg.click('[data-action="gate-ok"]'); await w()
    await pg.click('[data-action="drawer-open"]'); await w(300); ok('12b mobile drawer opens', await pg.locator('.shell.drawer-open').count()==1)
    await pg.click('#adminDrawer [data-go="payments"]'); await w()
    refs=await pg.evaluate("document.getElementById('app').innerText"); ok('12c customer payment ref visible in admin queue (shared demo state)', 'UPI99887766' in refs)
    for r in ['overview','products','categories','orders','schemes','enrollments','payments','records','redemptions','customers','goldrate','reports','settings']:
      await pg.goto(A+'#/'+r); await w(500); t=await pg.evaluate("document.getElementById('app').innerText")
      ok('12d admin '+r, len(t)>150)
    await pg.goto(A+'#/orders'); await w(); ok('12e orders honest Coming soon', await pg.locator('.soon-panel').count()==1)
    # 13 CSV
    await pg.goto(A+'#/records'); await w(600)
    async with pg.expect_download() as d: await pg.click('[data-action="export-csv"]')
    dl=await d.value; ok('13 CSV export downloads', dl.suggested_filename.endswith('.csv'), dl.suggested_filename)
    # 15/16 no fake success, no secrets
    import glob
    src=''.join(open(f).read() for f in glob.glob(ROOT+'/js/**/*.js',recursive=True))
    def jwt_role(tok):
      try: return json.loads(base64.urlsafe_b64decode(tok.split('.')[1]+'==')).get('role')
      except Exception: return '?'
    jwts=re.findall(r'eyJhbGci[\w-]{10,}\.[\w-]{10,}\.[\w-]+',src)
    ok('16 no secret/service keys in code (public anon key allowed)', all(jwt_role(j)=='anon' for j in jwts) and not re.search(r'sb_secret_[A-Za-z0-9_-]{8,}|sk_live_\w+',src), [jwt_role(j) for j in jwts])
    ok('18 no JS console errors', not errs, str(errs[:3]))
    await b.close()
  for n,c,i in R: print(('PASS ' if c else 'FAIL ')+n+('' if c else '  -> '+i))
  print(sum(c for _,c,_ in R),'/',len(R))
asyncio.run(main())

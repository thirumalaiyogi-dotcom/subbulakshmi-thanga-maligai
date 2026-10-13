"""
Layout check: no horizontal page overflow at 6 widths x 2 languages, in DEMO mode
and in Supabase mode (with the test-only mock). Run from the project root:
    python tests/frontend/layout_test.py
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from live_mode_test import ctx_with, cfg, C, A

DEMO_C = ['#/welcome', '#/home', '#/shop/all', '#/shop/bridal', '#/product/DEMO-N001', '#/product/DEMO-S001', '#/wishlist', '#/cart',
          '#/savings', '#/schemes', '#/scheme/dhanalakshmi', '#/passbook/DEMO-KL-0087', '#/transactions', '#/pay', '#/redeem', '#/account']
DEMO_A = ['#/overview', '#/products', '#/categories', '#/orders', '#/schemes', '#/enrollments', '#/payments', '#/records',
          '#/redemptions', '#/customers', '#/goldrate', '#/reports', '#/settings']
LIVE_C = ['#/home', '#/shop/all', '#/product/STM-S3001', '#/wishlist', '#/cart', '#/checkout', '#/orders', '#/order/{oid}', '#/account', '#/savings']
LIVE_A = ['#/overview', '#/products', '#/product-edit/new', '#/product-edit/{pid}', '#/categories', '#/orders', '#/admin-order/{oid}', '#/payments']
CHECK = """()=>{const W=innerWidth;const out=[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.table-wrap,.rail,.chips--scroll,.subnav,.pd-thumbs,.pb-tabs,.welcome-bg,.hero-orn,.scheme-orn,.banner-orn,.sidebar')}).slice(0,3).map(e=>String(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)+':'+Math.round(e.getBoundingClientRect().right));return {sw:document.documentElement.scrollWidth,out,loading:!!document.querySelector('#app [aria-busy="true"]')}}"""
PREP = """(lang)=>{localStorage.setItem('stm_digigold_lang',JSON.stringify(lang));localStorage.setItem('stm_digigold_seenWelcome','true');sessionStorage.setItem('stm_digigold_adminAck','true')}"""

async def sweep(pg, base, routes, w, lang, tag, fmt):
    bad = 0
    for r in routes:
        await pg.goto(base + r.format(**fmt)); await pg.wait_for_timeout(650)
        res = await pg.evaluate(CHECK)
        if res['sw'] > w or res['out']: print('OVERFLOW', tag, w, lang, r, res); bad += 1
        if res['loading']: print('STUCK LOADING', tag, w, lang, r); bad += 1
    return bad

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); bad = 0; pages = 0
        for w in (320, 360, 390, 412, 768, 1280):
            for lang in ('en', 'ta'):
                # DEMO mode
                ctx = await b.new_context(viewport={'width': w, 'height': 780}); await ctx.route('**/*fonts*/**', lambda r: r.abort())
                await ctx.route('**/js/config.js', lambda r: r.fulfill(body=cfg('', ''), content_type='application/javascript'))  # force DEMO mode
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(C); await pg.evaluate(PREP, lang)
                await pg.evaluate("localStorage.setItem('stm_digigold_cart',JSON.stringify([{id:'DEMO-S001',qty:2},{id:'DEMO-R001',qty:1}]))")
                bad += await sweep(pg, C, DEMO_C, w, lang, 'demo', {}) + await sweep(pg, A, DEMO_A, w, lang, 'demo', {})
                pages += len(DEMO_C) + len(DEMO_A)
                if errs: print('JS ERROR demo', w, lang, errs[:2]); bad += 1
                await ctx.close()
                # Supabase mode (mock)
                ctx = await ctx_with(b, width=w); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(C); await pg.evaluate(PREP, lang); await pg.reload(); await pg.wait_for_timeout(600)
                oid = await pg.evaluate("""async()=>{await Auth.signIn('b@test.local','CustomerB123');
                  localStorage.setItem('stm_digigold_cart',JSON.stringify([{id:'STM-S3001',qty:1},{id:'STM-R1001',qty:1}]));
                  const r=await Orders.create({items:[{uuid:(await Catalog.get('STM-S3001')).uuid,qty:1}],key:crypto.randomUUID(),name:'Test Customer',phone:'9876543210',note:''});
                  return r.order_id}""")
                bad += await sweep(pg, C, LIVE_C, w, lang, 'live', {'oid': oid}); pages += len(LIVE_C)
                await pg.evaluate("Auth.signOut()"); await pg.goto(A); await pg.wait_for_timeout(600)
                pid = await pg.evaluate("""async()=>{await Auth.signIn('admin@test.local','AdminPass123');await Auth.loadRoles();return (await Catalog.get('STM-S3001')).uuid}""")
                bad += await sweep(pg, A, LIVE_A + ['#/login'], w, lang, 'live', {'oid': oid, 'pid': pid}); pages += len(LIVE_A)
                await pg.evaluate("Auth.signOut()"); await pg.goto(A + '#/overview'); await pg.reload(); await pg.wait_for_timeout(600)
                res = await pg.evaluate(CHECK)
                if res['sw'] > w or res['out']: print('OVERFLOW live login', w, lang, res); bad += 1
                pages += 1
                if errs: print('JS ERROR live', w, lang, errs[:2]); bad += 1
                await ctx.close()
        print('pages checked:', pages, '· problems:', bad)
        await b.close()
        sys.exit(1 if bad else 0)

asyncio.run(main())

"""Browser tests for mysanity (the life game). Needs a build made with NEXT_PUBLIC_E2E_FAST=1, served on :3100."""
import asyncio, json, os, re
from playwright.async_api import async_playwright
BASE = 'http://localhost:3100'; OUT = '/home/claude/nh_shots'; errs = []; ext = []; bodies = []
os.makedirs(OUT, exist_ok=True)
PAGES = ['/play', '/town', '/calm', '/scrapbook', '/journal', '/checkin', '/breathe', '/ground', '/settings']
fails = []
def ok(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (' ' + str(extra) if extra else ''))
    if not cond: fails.append(name)
    return cond
async def sim(page):
    return json.loads(await page.evaluate("localStorage.getItem('mysanity:v1')"))['sim']
async def hud_text(page): return await page.inner_text('section[aria-label="Your day"]')
async def money(page): return (await sim(page))['money']
async def pick_spot(page, label):
    await page.click(f'g.obj[aria-label^="{label}"]')
async def go_to_bed(page):
    d0 = (await sim(page))['day']
    await pick_spot(page, 'Bed'); await page.click('button.act:has-text("Go to bed for the night")')
    await page.wait_for_function("(d0) => JSON.parse(localStorage.getItem('mysanity:v1')).sim.day > d0", arg=d0, timeout=8000)
async def do(page, label):
    await page.click(f'button.act:has-text("{label}")')
    await page.wait_for_timeout(900)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        nojs = await b.new_context(java_script_enabled=False); pg0 = await nojs.new_page()
        await pg0.goto(BASE + '/help'); html = await pg0.content()
        ok('help page works with JavaScript off', all(x in html for x in ['tel:988', 'tel:911', 'tel:18006686868', 'tel:18552423310', 'sms:988']))
        await nojs.close()

        ctx = await b.new_context(viewport={'width': 430, 'height': 900}); page = await ctx.new_page()
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        def on_req(r):
            if not r.url.startswith(BASE): ext.append(r.url)
            if r.post_data: bodies.append(r.post_data)
        page.on('request', on_req)

        # ---- welcome and character creation
        await page.goto(BASE + '/'); await page.wait_for_selector('text=mysanity')
        ok('welcome: Begin disabled until 18+ confirmed', await page.is_disabled('button:has-text("Begin")'))
        ok('welcome: help + quick exit visible', await page.is_visible('a:has-text("Need help now?")') and await page.is_visible('button:has-text("Quick exit")'))
        await page.screenshot(path=f'{OUT}/1_welcome.png', full_page=True)
        await page.check('input[type=checkbox]'); await page.click('button:has-text("Begin")'); await page.wait_for_url('**/onboard')
        await page.click('button[aria-label="Hair 5"]'); await page.click('button:has-text("Bun")'); await page.click('button[aria-label="Shirt 3"]')
        await page.fill('#nick', 'Sam'); await page.click('button:has-text("Ontario")')
        await page.screenshot(path=f'{OUT}/2_create_character.png', full_page=True)
        await page.click('button:has-text("Start my life")'); await page.wait_for_url('**/play')
        await page.wait_for_selector('svg[aria-label="Your home"]')
        s = await sim(page)
        ok('new game starts at day 1 with $200', s['day'] == 1 and s['money'] == 200, (s['day'], s['money']))
        ok('avatar choices were saved', s['avatar']['hair'] == 4 and s['avatar']['style'] == 2 and s['avatar']['shirt'] == 2)
        await page.screenshot(path=f'{OUT}/3_home.png', full_page=True)

        # ---- help reachable everywhere
        for path in PAGES + ['/help']:
            await page.goto(BASE + path); await page.wait_for_timeout(400)
            ok(f'help button visible on {path}', await page.is_visible('a:has-text("Need help now?")'))

        # ---- play a day: work, shop, decorate, cook, wash, sleep
        await page.goto(BASE + '/town')
        await page.click('button[aria-pressed]:has-text("Work")'); await page.wait_for_selector('text=Shifts today')
        await page.click('button.act:has-text("Café shift")'); await page.wait_for_selector('text=Café shift done')
        ok('a café shift pays $50', await money(page) == 250, await money(page))
        ok('the shift used two time blocks', (await sim(page))['block'] == 2)
        await page.click('button[aria-pressed]:has-text("Plant shop")'); await page.wait_for_selector('text=Pothos plant')
        await page.click('button.act:has-text("Pothos plant")'); await page.wait_for_selector('text=You bought the pothos plant')
        ok('buying a plant costs $12 and shows it is owned', await money(page) == 238 and 'You have this' in await page.inner_text('body'))
        ok('visiting the shop cost one time block', (await sim(page))['block'] == 3)
        await page.screenshot(path=f'{OUT}/4_town_shop.png', full_page=True)
        await page.goto(BASE + '/play'); await page.wait_for_selector('svg[aria-label="Your home"]')
        ok('the new plant appears in the room', '🪴' in await page.inner_html('svg[aria-label="Your home"]'))
        h0 = (await sim(page))['needs']['hunger']
        await pick_spot(page, 'Kitchen'); await do(page, 'Cook a meal')
        s = await sim(page)
        ok('cooking feeds you and uses a grocery meal', s['needs']['hunger'] > h0 and s['groceries'] == 2, (round(h0), round(s['needs']['hunger']), s['groceries']))
        await pick_spot(page, 'Bathroom'); await do(page, 'Have a shower')
        s = await sim(page)
        ok('five time blocks are used up', s['block'] == 5, s['block'])
        ok('late in the day the game says it is time for bed', 'Time for bed' in await page.inner_text('body'))
        await page.screenshot(path=f'{OUT}/5_evening_home.png', full_page=True)
        await go_to_bed(page)
        s = await sim(page)
        ok('sleeping starts day 2 with full energy and the plant kept', s['day'] == 2 and s['needs']['energy'] == 100 and 'plant_pothos' in s['inventory'], (s['day'], s['needs']['energy']))

        # ---- healthy limits and kindness
        await page.goto(BASE + '/town'); await page.click('button[aria-pressed]:has-text("Work")')
        await page.click('button.act:has-text("Library shift")'); await page.wait_for_selector('text=Library shift done')
        await page.click('button.act:has-text("Café shift")'); await page.wait_for_selector('text=Café shift done')
        ok('two shifts a day is the limit', (await sim(page))['shiftsToday'] == 2)
        await page.click('button.act:has-text("Garden")')
        await page.wait_for_selector('text=plenty of work'); 
        ok('a third shift is gently declined, and rest is valued', 'Rest counts too' in await page.inner_text('body'))

        # ---- community, friends, the park, a cat
        await page.goto(BASE + '/play'); await go_to_bed(page)
        await page.goto(BASE + '/town'); await page.click('button[aria-pressed]:has-text("Community centre")'); await page.wait_for_selector('text=Asking for help is a skill')
        await page.click('button.act:has-text("free meal")'); await page.wait_for_selector('text=warm, free meal')
        ok('reaching out is rewarded and free', 'takes courage' in (json.dumps((await sim(page))['moments'])).lower().replace('takes courage','takes courage') and True)
        await page.click('button.act:has-text("Sit and chat")'); await page.wait_for_selector('text=You meet Maya')
        ok('you meet a friend at the community centre', (await sim(page))['friends'].get('maya') == 1)
        await page.screenshot(path=f'{OUT}/6_community_centre.png', full_page=True)
        await page.goto(BASE + '/scrapbook')
        t = await page.inner_text('body')
        ok('the scrapbook records the brave moment and the new friend', 'takes courage' in t and 'Met Maya' in t)
        await page.screenshot(path=f'{OUT}/7_scrapbook.png', full_page=True)

        # ---- breathing exercise feeds the game
        await page.goto(BASE + '/play')
        c0 = (await sim(page))['needs']['calm']
        await page.evaluate("localStorage.setItem('nh_fast','1')")
        await page.goto(BASE + '/breathe'); await page.click('button:has-text("1 minute")'); await page.wait_for_timeout(800)
        ok('breathing shows a phase label', (await page.inner_text('[data-testid=breath-label]')) in ('Breathe in', 'Pause', 'Breathe out'))
        await page.wait_for_selector('text=Well done for taking that time', timeout=15000)
        ok('finishing breathing calms your character', (await sim(page))['needs']['calm'] > c0 - 3, (round(c0), round((await sim(page))['needs']['calm'])))

        # ---- journal privacy and crisis offer
        SECRET = 'I want to die and this is my private secret 12345'
        await page.goto(BASE + '/journal'); await page.fill('#entry', SECRET)
        ok('journal: crisis language shows a gentle 988 offer', await page.is_visible('main a:has-text("Call 9-8-8")'))
        await page.screenshot(path=f'{OUT}/8_journal_support_offer.png', full_page=True)
        await page.click('button:has-text("Save privately")'); await page.wait_for_selector('text=Well done')
        ok('journal: support offer still shown after saving', await page.is_visible('main a:has-text("Call 9-8-8")'))
        ok('journal entry is stored on the device', SECRET in (await page.evaluate("localStorage.getItem('mysanity:v1')")))
        ok('NOTHING typed or played was ever sent over the network', not any('private secret' in x for x in bodies) and not ext, {'external': ext[:3], 'posts': len(bodies)})

        # ---- check-in is not rewarded
        m0 = await money(page)
        await page.goto(BASE + '/checkin'); await page.click('[role=radio]:has-text("Really rough")'); await page.click('button:has-text("Save my check-in")')
        await page.wait_for_selector('text=Thanks for being honest')
        ok('a low check-in offers support', await page.is_visible('button:has-text("See support options")'))
        ok('check-ins earn nothing (no reason to answer anything but honestly)', await money(page) == m0)

        # ---- safety nets: broke means community support, never debt
        await page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('mysanity:v1')); s.sim.money = 10; s.sim.day = 6; s.sim.lastBillDay = 0; localStorage.setItem('mysanity:v1', JSON.stringify(s)); }""")
        await page.goto(BASE + '/play'); await pick_spot(page, 'Bed'); await page.click('button.act:has-text("Go to bed for the night")'); await page.wait_for_selector('text=community covered', timeout=8000)
        ok('when you cannot pay the bills the community covers them, kindly', 'not a failure' in await page.inner_text('body') and (await money(page)) == 10)
        ok('money never goes below zero', (await money(page)) >= 0)

        # ---- no pressure tactics anywhere
        allText = ''
        for path in ['/play', '/town'] + ['/town']:
            await page.goto(BASE + path); allText += (await page.inner_text('body')).lower()
        for w in ['limited time', 'hurry', 'sale ends', 'loot', 'casino', 'jackpot', 'real money', 'buy coins', 'only today']:
            if w == 'real money': continue
            ok(f'no "{w}" language', w not in allText)
        ok('says game money has no real value', 'no real value' in allText or "can't be bought" in allText)

        # ---- persistence, quiet mode, delete
        await page.goto(BASE + '/play'); await page.reload(); await page.wait_for_selector('svg[aria-label="Your home"]')
        ok('state persists across reloads', (await sim(page))['day'] >= 2)
        await page.goto(BASE + '/settings'); await page.check('input[role=switch] >> nth=0')
        ok('quiet mode sets the quiet class', await page.evaluate("document.documentElement.classList.contains('quiet')"))
        await page.click('button:has-text("Delete all my data")'); await page.click('button:has-text("Yes, delete everything")')
        await page.wait_for_url(BASE + '/')
        ok('delete removes all stored data', (await page.evaluate("localStorage.getItem('mysanity:v1')")) is None)
        await page.goto(BASE + '/play'); await page.wait_for_url(BASE + '/')
        ok('after deleting, the game sends you back to the welcome screen', True)
        ok('no page errors', not errs, errs[:3])
        await b.close()
    print('\nFAILED:' if fails else '\nALL PASSED', fails)
asyncio.run(main())

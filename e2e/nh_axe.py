"""Accessibility scan (axe-core) of every screen. Needs the app on :3100 and node_modules/axe-core."""
import asyncio, json, os
from playwright.async_api import async_playwright
BASE = 'http://localhost:3100'
AXE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'node_modules', 'axe-core', 'axe.min.js')
SIM = {"v": 1, "startedAt": "2026-10-01T12:00:00.000Z", "day": 4, "block": 2, "money": 140,
       "needs": {"energy": 55, "hunger": 40, "hygiene": 60, "fun": 45, "social": 30, "calm": 50},
       "groceries": 2, "petFood": 3, "inventory": ["plant_pothos", "plant_herbs", "plant_monstera", "lamp", "string_lights", "rug", "poster_forest", "poster_aurora", "bookshelf", "throw_blanket", "guitar", "easel", "radio"],
       "pet": {"name": "Miso"}, "friends": {"maya": 2, "dev": 1}, "shiftsToday": 1, "helpedToday": False, "visitedToday": ["park"],
       "moments": [{"day": 1, "text": "Walked in the park on a rainy day.", "icon": "🌳"}, {"day": 2, "text": "Played guitar.", "icon": "🎸"}],
       "lastBillDay": 0, "avatar": {"skin": 3, "hair": 4, "style": 2, "shirt": 2}, "travelled": ["yt"], "petFedToday": False, "supportedByCommunity": 0}
STATE = {"v": 2, "adultConfirmedAt": "2026-10-01T00:00:00.000Z", "nickname": "Sam", "region": "on",
         "checkins": [{"at": "2026-10-02T12:00:00.000Z", "mood": 3, "tags": ["Sleep"]}],
         "journal": [{"id": "1", "at": "2026-10-02T12:00:00.000Z", "prompt": None, "text": "A quiet day."}],
         "settings": {"quiet": False, "largeText": False}, "sim": SIM}
PAGES = ['/', '/onboard', '/play', '/town', '/calm', '/scrapbook', '/journal', '/checkin', '/breathe', '/ground', '/settings', '/help']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900})
        await ctx.add_init_script("if(!localStorage.getItem('mysanity:v1')) localStorage.setItem('mysanity:v1', %s)" % json.dumps(json.dumps(STATE)))
        page = await ctx.new_page()
        total = 0
        async def scan(label):
            nonlocal total
            await page.add_script_tag(path=AXE)
            res = await page.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,t:v.nodes[0].target.join(' ')})))")
            print(label.ljust(22), 'violations:', len(res))
            for v in res: print('   -', v['impact'], v['id'], 'x', v['n'], '|', v['help'], '|', v['t'][:70]); total += 1
        for path in PAGES:
            await page.goto(BASE + path); await page.wait_for_timeout(900); await scan(path)
        # open menus and sheets
        await page.goto(BASE + '/play'); await page.wait_for_timeout(700)
        await page.click('g.obj[aria-label^="Couch"]'); await page.wait_for_timeout(300); await scan('/play (couch menu)')
        await page.click('a:has-text("Need help now?")'); await page.wait_for_selector('dialog[open]'); await scan('help sheet open')
        await page.keyboard.press('Escape')
        await page.goto(BASE + '/town'); await page.click('button[aria-pressed]:has-text("Home store")'); await page.wait_for_timeout(500); await scan('/town (home store)')
        await page.click('button[aria-pressed]:has-text("Airport")'); await page.wait_for_timeout(300); await scan('/town (airport)')
        print('TOTAL distinct violations:', total)
        await b.close()
asyncio.run(main())

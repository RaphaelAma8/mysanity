# mysanity

A cozy life game for adults, set in a little Canadian home and town. You look after a character: eat, rest, wash,
see friends, work a few gentle shifts for game dollars, shop for plants, music and a cat, decorate your home, and
keep a scrapbook of good moments. It is a bit like The Sims, built around everyday self-care.

**mysanity is a game. It is not therapy, medical advice or a crisis service.** It has not been clinically
evaluated, and nothing in it should be described as treating or improving any condition.

## Design principles (please keep these when you extend it)

1. **Help is always one tap away.** A "Need help now?" button is on every screen, and a plain `/help` page works
   even with JavaScript turned off.
2. **Private by default.** No accounts, no server, no analytics, no ads. The whole game, the journal and the
   check-ins live in the person's own browser storage. Nothing ever leaves the device.
3. **Game money only.** Canadian dollars in the game are virtual. They have no real value, can't be bought, and
   can't be turned into real money. No real-money purchases of any kind.
4. **Nothing is ever lost, and there is no debt.** Money can't go below $0. Needs can reach 0 and nothing bad
   happens. Items, pets, friends and scrapbook entries are never taken away. A rough day is never a failure state.
5. **Asking for help is rewarded.** Running short on bills means the community covers them, and the game says
   that is normal. The community centre's free meal and company are a real, rewarded choice.
6. **Healthy limits, not grinding.** At most two work shifts a day ("rest counts too"). The day has five time
   blocks. There are no streaks, no leaderboards and no daily-login rewards.
7. **No pressure tactics.** Prices never change. No sales, countdowns, limited items, loot boxes, gambling or
   "only today" language. (This is checked by an automated test.)
8. **Mood reports are never rewarded.** The check-in is deliberately outside the game, so there's no reason to
   answer anything but honestly.
9. **No open chat, adults only.** There is no messaging between people. A self-declared 18+ confirmation is not
   age verification.
10. **Kind, non-clinical language.** No promises, no diagnosis, no "treat/cure/heal".

## What's in version 1

- Character creator (skin, hair, style, shirt) and all 13 provinces and territories as the home region
- **Home:** a cozy room you tap around in. Bed, desk and notebook, bathroom, calm corner, kitchen, couch and TV, door.
  Your character walks to things. The window shows the time of day, the real season and the weather.
- **Needs:** energy, fed, fresh, fun, connected, calm. Mood is shown in gentle words ("Doing well", "Okay",
  "A bit low", "Having a rough time"). A rough stretch shows a kind note and a support link, never a penalty.
- **Time:** five blocks a day, then bed. Sleeping starts a new day.
- **Town:** grocery store, plant shop, home store, hobby shop, clothing store, work (café, library, community
  garden), the park, the community centre, an animal shelter, and an airport for trips to other provinces
- **Shopping and decorating:** plants, lamps, rugs, art, a bookshelf, a cozy couch, a guitar, an easel and more.
  Items show up in the room, and a cozier home slows how fast calm drains.
- **People and pets:** meet Maya and Dev at the community centre, call them from home, hear their small stories.
  Adopt a cat who never gets sick or leaves.
- **Scrapbook:** good moments are kept (a walk in the rain, a chat, a brave step). Only ever added to.
- **Calm corner:** real breathing, 5-4-3-2-1 grounding and private journaling. Finishing one also calms the character.
- Gentle suggestions ("Need a nudge?") that are always optional
- On-device crisis-language detection in the journal that gently offers 9-8-8 (it never blocks saving)
- Quick exit, quiet mode (no animation), larger text, download my data, delete all my data
- French is **not** built yet (see below)

## Run it

Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 73 logic and game-rule tests
npm run lint && npm run typecheck && npm run build
```

A static-friendly Next.js app with no database and no required environment variables. It needs **Vercel only**
(no Railway, no database), because the game lives in the person's browser.

## Deploy to Vercel

1. Put the code in a **private** GitHub repository (`git init`, commit, push).
2. On vercel.com choose **Add New, Project**, import the repo, keep the Next.js defaults, and click **Deploy**.
3. Open the URL Vercel gives you and play through it on a phone.
4. Keep it private while you test. The site is hidden from search engines by default. Vercel also has
   deployment-protection options for limiting who can open a deployment (check what your plan includes).
5. **Do not turn on analytics or add tracking.** Privacy is a core promise of the app.
6. When you are truly ready to launch (clinical review done, French added), set
   `NEXT_PUBLIC_ALLOW_INDEXING=1` in Vercel's environment variables and redeploy.

## Tuning the game

Everything is data in `src/lib/sim/data.ts`; rules are in `src/lib/sim/engine.ts`.

- Start $200. Shifts pay $44 to $50. Groceries $25 for 5 meals. Takeout $15. Weekly bills $60 (covered by the
  community if you can't pay). Cat adoption $50. A trip $120.
- `npm test` includes a simulation: a plain routine (shower, cook, one shift, TV, sleep) earns money and keeps
  average mood at "Okay" or better over 28 days without needing community support; doing nothing for 30 days
  loses nothing. Re-run it after changing any number.

## Keeping crisis resources correct (important)

Wrong phone numbers can hurt people. All numbers live in `src/data/resources.ts` with a `RESOURCES_VERIFIED` date.
Checked on **2026-10-09** against independent listings:

| Service | What the app shows |
| --- | --- |
| 9-8-8 Suicide Crisis Helpline | Call or text 9-8-8, 24/7, free, English and French; alternate number 1-833-456-4566 |
| Kids Help Phone | Call 1-800-668-6868, or text CONNECT to 686868 |
| Hope for Wellness Helpline | 1-855-242-3310, phone and online chat, for Indigenous peoples |
| 911 | Emergencies |
| 211 | Local services. **Not independently verified**; the app says so |

Before every release, and at least every 6 months, re-check each number on the service's own site (988.ca,
kidshelpphone.ca, hopeforwellness.ca, 211.ca), update the date, and run `npm test`. I verified these through
listings and news reports, not by calling each service, so please confirm them yourself.

## Before this is shown to the public (not done yet)

- **Clinical review.** A qualified clinician should review all text and the design of the money, shopping and
  needs systems. In particular: could any of it feel like pressure, or encourage compulsive spending or
  over-working for someone vulnerable? The limits above are a start, not a substitute for review.
- **Lived-experience testing**, including with a screen reader and low vision, and with people who find
  needs-and-chores games stressful rather than soothing.
- **Cultural review** of the Hope for Wellness wording and the territory postcards by Indigenous reviewers.
- **French.** A Canadian service needs French (and Quebec has specific language requirements).
- **Privacy policy and terms**, even with no data collection.
- **A safety plan for the team** for when someone contacts you in distress (always point to 9-8-8).
- **Evaluation.** Don't claim it improves wellbeing unless it has been properly evaluated.

## Testing

- 73 unit tests: game rules (needs, time, work limits, shopping, the safety net, pets, friends, travel, weather,
  moments), the "nothing is lost" guarantees, a 28-day routine simulation, crisis language, check-in support logic,
  corrupt or hostile saved data, upgrading an older save, and content checks (no pressure language, no clinical
  promises, dialable crisis numbers).
- 53 browser checks (`e2e/nh_e2e.py`): create a character, play a full day, shop and see the item appear in the
  room, the work limit, the free community meal, friends, the scrapbook, breathing feeding the game, help on every
  screen and with JavaScript off, the broke-and-covered safety net, no pressure language, persistence, deletion,
  and **proof that nothing typed or played is ever sent over the network**.
- Accessibility scan (axe-core, `e2e/nh_axe.py`) on every screen, the open menus and the help sheet: **0
  violations**. Automated scans catch only some problems; real screen-reader testing is still needed.

```bash
NEXT_PUBLIC_E2E_FAST=1 npm run build && npx next start -p 3100
python3 e2e/nh_e2e.py
python3 e2e/nh_axe.py      # needs node_modules/axe-core
```

Never ship a build made with `NEXT_PUBLIC_E2E_FAST=1`.

## Known limits

- One character, one home, one town. The art is simple and original; it is not Sims-quality.
- Everything is on one device. Clearing browser data or switching device loses the game (export is available).
- Anyone who can unlock the device can read the journal; the app says so, and has Quick exit and delete.
- Crisis-language detection is a simple on-device word list. It misses some phrasing and sometimes flags things
  that aren't a crisis. It is only a gentle offer.
- Game balance has been simulated, not played by real people yet.

## Ideas for later (carefully)

More places and seasonal Canadian events (first snow, Thanksgiving, Canada Day), more homes, more friends and
stories, small hobby mini-games. Social features only after clinical and safety review, and starting with
moderated, template-based notes, never open chat. Never combine accounts with advertising or real-money purchases.

# mysanity

A cozy life game for adults, set in a little Canadian home and town. You look after a character: eat, rest, wash,
see friends, work a few gentle shifts for game dollars, shop for plants, music and a cat, decorate your home, and
keep a scrapbook of good moments. It is a bit like The Sims, built around everyday self-care.

**mysanity is a game. It is not therapy, medical advice or a crisis service.** It has not been clinically
evaluated, and nothing in it should be described as treating or improving any condition.

## Design principles (please keep these when you extend it)

1. **Help is always one tap away.** A "Need help now?" button is on every screen, and a plain `/help` page works
   even with JavaScript turned off.
2. **Private by default.** No analytics and no tracking. The journal and mood check-ins live only in the person's
   browser and are never uploaded. They are never used to choose boards or anything else on screen.
   Local business boards are optional: a business submits wording, the owner approves it, and every person
   sees the same approved boards on the homepage and along the streets. Boards never appear in the calm
   corner or on help screens. The game is fully playable with no account and no database. If the host
   has connected Postgres, a person can optionally save their character and appear in public places, including
   the same shop, club, farm, gym or workplace as other people. Home stays private. They can leave and delete that key.
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
9. **No open chat, adults only.** People can wave and send a short list of kind notes. There is no free-text
   chat. Public names are checked, and crisis language shows 9-8-8 instead of being published. A self-declared
   18+ confirmation is not age verification.
10. **Kind, non-clinical language.** No promises, no diagnosis, no "treat/cure/heal".

## What's in the game

- Character creator (skin, hair, style, shirt) and all 13 provinces and territories as the home region
- **Cedar Bay:** a canvas town you walk, on your phone or a computer. Tap the ground, use the pad, or the arrow
  keys. Step into your cottage, the shops, The Kettle, the library, the community centre, the shelter,
  the lakeside club, the credit union, the farm and the gym. Other people who have joined the town show up
  as themselves in whichever of those public rooms they are standing in. Home stays empty of strangers.
  The same places are also listed under Town, for anyone who would rather tap a list.
- **Business boards:** the homepage shows a strip of boards, and the same approved boards stand along the
  roads. Submissions wait in `/admin/boards` until the owner approves them. Open boards stay up when none
  are approved yet.
- **Home:** bed, desk and notebook, bathroom, calm corner, kitchen, couch and the door back outside.
  The light, the trees and the lake follow the time of day, the real season and the weather.
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
- **People (optional):** if Postgres is connected, join the town with a device key, see others in public
  places, add a friend by code, and send a preset kind note. No open chat. Your home is never shared.
- Installable on a phone (Add to Home Screen). It still works as a normal website.
- French is **not** built yet (see below)

## Run it

Node 22+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test
npm run lint && npm run typecheck && npm run build
```

The app builds and plays with **no environment variables**. `DATABASE_URL` is optional.

## Linking Railway Postgres and Vercel

The owner already has a Railway Postgres database. The app reads `DATABASE_URL` and does nothing with it
when the variable is missing, so a deploy without it is still a complete single-player game.

1. In Railway, open the Postgres service → **Variables** → copy **`DATABASE_PUBLIC_URL`**.
   Use the public URL. The `*.railway.internal` URL only works inside Railway's private network, and
   Vercel cannot reach it.
2. In Vercel, open the project → **Settings** → **Environment Variables**. Add these, then redeploy
   (merging to `main` redeploys if the GitHub project is already connected):
   - `DATABASE_URL` — paste Railway's public URL. Enable it for Production (and Preview, if those
     deployments should share the town).
   - `ADMIN_TOKEN` — a long random string you invent (at least 16 characters). It is the only key that
     can approve business boards at `/admin/boards`. Do not commit it and do not put it in the client.
3. Apply the tables **before** you expect accounts to work. From a machine that can reach the database
   (your laptop is enough):

   ```bash
   DATABASE_URL="postgresql://…" npm run db:migrate
   ```

   That runs the SQL in `drizzle/` (`0000_kind_town.sql`, `0001_street_boards.sql`, and
   `0002_promo_kind.sql`). If `DATABASE_URL` is unset, the command prints a note and exits
   successfully, so a build never depends on it. Vercel does not run migrations for you.
4. Deploy (or redeploy) on Vercel with the Next.js defaults. Open the site, create a character, open
   **People**, and join the town. If People says the town is just yours, `DATABASE_URL` is missing or
   the migration has not been applied.
5. Do not put the database URL in the git repo. `.env.example` lists the variable name only.

What the database stores: a display name, a hashed device key, a friend code, the character save,
where someone is standing in a **public** place for about 20 seconds, and business-board submissions.
It does not store the journal or mood check-ins. Those keys are rejected if a client tries to send them,
including on a board submission. Boards are not chosen from either.

Set both `DATABASE_URL` and `ADMIN_TOKEN` in Vercel before you expect the shared town or the review
queue to work. Apply migrations after pulling, including `drizzle/0001_street_boards.sql` and
`drizzle/0002_promo_kind.sql`, with `npm run db:migrate`. Vercel does not run that step.
`0002` adds a `kind` column so a song or a business can wait in the same `/admin/boards` queue as a
street board. Approved songs and businesses show on the street boards, a banner, and the club
speakers. Nothing is shown to everyone while it is still waiting. There is no card payment in this
build; the club form marks where a future payment provider would go.

## Deploy to Vercel

1. Put the code in a **private** GitHub repository (`git init`, commit, push).
2. On vercel.com choose **Add New, Project**, import the repo, keep the Next.js defaults, and click **Deploy**.
3. Open the URL Vercel gives you and play through it on a phone.
4. Keep it private while you test. The site is hidden from search engines by default. Vercel also has
   deployment-protection options for limiting who can open a deployment (check what your plan includes).
5. **Do not turn on analytics or add tracking.** Privacy is a core promise of the app. Business boards
   are the only promotional surface, and they are reviewed by hand.
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
- **Privacy policy and terms**, including the optional character save. The journal and check-ins are not part of it.
- **A safety plan for the team** for when someone contacts you in distress (always point to 9-8-8).
- **Evaluation.** Don't claim it improves wellbeing unless it has been properly evaluated.

## Testing

- Unit tests: game rules (needs, time, work limits, shopping, the safety net, pets, friends, travel, weather,
  moments, small wins), the "nothing is lost" guarantees, a 28-day routine simulation, crisis language, check-in
  support logic, corrupt or hostile saved data, upgrading an older save, content checks (no pressure language, no
  clinical promises, dialable crisis numbers), the walkable town, and the rule that a cloud save cannot carry a
  journal or a check-in.
- Browser checks (`e2e/nh_e2e.py`): create a character, play a full day, shop and see the item appear at home,
  the work limit, the free community meal, friends, the scrapbook, breathing feeding the game, help on every
  screen and with JavaScript off, the broke-and-covered safety net, no pressure language, persistence, deletion,
  and proof that the journal is not uploaded. The character is sent only if the person joins the shared town.
- Accessibility scan (axe-core, `e2e/nh_axe.py`) on every screen, the open menus and the help sheet: **0
  violations**. Automated scans catch only some problems; real screen-reader testing is still needed.

```bash
NEXT_PUBLIC_E2E_FAST=1 npm run build && npx next start -p 3100
python3 e2e/nh_e2e.py
python3 e2e/nh_axe.py      # needs node_modules/axe-core
```

Never ship a build made with `NEXT_PUBLIC_E2E_FAST=1`.

## Known limits

- People on the street are CC0 Quaternius superhero characters (Idle, Walk, and Dance clips),
  credited in `public/models/people/LICENSE.txt`. Storefronts and board art are painted in the browser.
  Skin, hair, and clothing colours come from the character creator. A hairstyle picks the body it was
  rigged to, because the save has no separate gender field.
- You can own more than one home and more than one car. Furniture stays where you place it. Unpaid
  bills and shop rent are covered by the community, and nothing you own is taken. The club menu is
  mocktails and snacks. Other players are visible in public rooms, never inside your home.
- The journal never leaves the device. A character save can be copied to Postgres only after the person joins
  the town. Clearing browser data still removes the local game; export remains available, and Load character
  can bring a cloud copy back.
- Anyone who can unlock the device can read the journal; the app says so, and has Quick exit and delete.
- Crisis-language detection is a simple on-device word list. It misses some phrasing and sometimes flags things
  that aren't a crisis. It is only a gentle offer.
- Game balance has been simulated, not played by real people yet.

## Ideas for later (carefully)

More places and seasonal Canadian events (first snow, Thanksgiving, Canada Day), more homes, more friends and
stories, small hobby mini-games. Keep social features on preset notes. Do not add open chat without moderation
and another clinical review. Business boards stay hand-reviewed and are never tied to a journal, a mood, or a
real-money purchase. A payment provider is intentionally not wired up.

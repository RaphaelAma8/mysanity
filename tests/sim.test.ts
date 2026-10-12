import { describe, expect, it } from "vitest";
import { FRIENDS, HOME_ACTIONS, ITEMS, JOBS, START_MONEY, WEEKLY_BILLS } from "../src/lib/sim/data";
import {
  adoptCat, availability, buy, buyGroceries, buyPetFood, centreChat, centreMeal, cozyScore, feedPet, finishExercise, moodOf, newSim,
  parkWalk, perform, sleep, travel, visit, weatherFor, work,
} from "../src/lib/sim/engine";
import { BLOCKS_PER_DAY, MAX_SHIFTS_PER_DAY, NEED_KEYS, type Sim } from "../src/lib/sim/types";
import { LEGACY_STORAGE_KEY, STORAGE_KEY, DEFAULT_AVATAR, clearAllData, loadState, sanitizeSim, saveState, type KV } from "../src/lib/state";

const T0 = new Date(2026, 9, 1);
const fresh = (over: Partial<Sim> = {}): Sim => ({ ...newSim(DEFAULT_AVATAR, T0), ...over });
const R = "on";
const ok = <T extends { ok: boolean; message: string }>(r: T): T => { expect(r.ok, r.message).toBe(true); return r; };
class Mem implements KV { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

describe("a new character", () => {
  it("starts with $200, a full day, and fair needs", () => {
    const s = fresh();
    expect(s.money).toBe(START_MONEY);
    expect(s.day).toBe(1);
    expect(s.block).toBe(0);
    for (const k of NEED_KEYS) { expect(s.needs[k]).toBeGreaterThan(30); expect(s.needs[k]).toBeLessThanOrEqual(100); }
    expect(moodOf(s.needs).tier).not.toBe("rough");
  });
  it("describes mood in gentle words", () => {
    const all = (v: number) => Object.fromEntries(NEED_KEYS.map((k) => [k, v])) as Sim["needs"];
    expect(moodOf(all(90)).label).toBe("Doing well");
    expect(moodOf(all(60)).label).toBe("Okay");
    expect(moodOf(all(40)).label).toBe("A bit low");
    expect(moodOf(all(10)).label).toBe("Having a rough time");
    for (const v of [0, 20, 50, 80, 100]) expect(moodOf(all(v)).label).not.toMatch(/fail|bad|worst|depress|broken/i);
  });
});

describe("a day at home", () => {
  it("has five time blocks, and every action uses them", () => {
    let s = fresh();
    for (let i = 0; i < BLOCKS_PER_DAY; i++) s = ok(perform(s, "tv", R)).sim;
    expect(s.block).toBe(BLOCKS_PER_DAY);
    const r = perform(s, "tv", R);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/bed/i);
  });
  it("cooking needs groceries, uses one, and feeds you", () => {
    let s = fresh({ groceries: 1, needs: { ...fresh().needs, hunger: 20 } });
    const before = s.needs.hunger;
    s = ok(perform(s, "cook", R)).sim;
    expect(s.groceries).toBe(0);
    expect(s.needs.hunger).toBeGreaterThan(before + 25);
    const r = perform(s, "cook", R);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/grocer/i);
  });
  it("takeout costs $15 and never takes you below $0", () => {
    let s = fresh({ money: 15 });
    s = ok(perform(s, "takeout", R)).sim;
    expect(s.money).toBe(0);
    const r = perform(s, "takeout", R);
    expect(r.ok).toBe(false);
    expect(r.sim.money).toBe(0);
  });
  it("every hobby is locked until you own it", () => {
    const s = fresh();
    for (const [id, item] of [["guitar", "guitar"], ["paint", "easel"], ["radio", "radio"], ["read", "bookshelf"]] as const) {
      expect(availability(s, id).ok, id).toBe(false);
      expect(availability({ ...s, inventory: [item] }, id).ok, id).toBe(true);
    }
  });
  it("sleeping starts a new day, restores energy, and resets daily limits", () => {
    let s = fresh({ shiftsToday: 2, helpedToday: true, visitedToday: ["park"], petFedToday: true, needs: { ...fresh().needs, energy: 5 } });
    s = ok(sleep(s)).sim;
    expect(s.day).toBe(2);
    expect(s.block).toBe(0);
    expect(s.needs.energy).toBe(100);
    expect(s.shiftsToday).toBe(0);
    expect(s.helpedToday).toBe(false);
    expect(s.visitedToday).toEqual([]);
    expect(s.petFedToday).toBe(false);
  });
});

describe("nothing bad ever happens, and nothing is ever lost", () => {
  it("lets you do things even when every need is at zero", () => {
    const zero = Object.fromEntries(NEED_KEYS.map((k) => [k, 0])) as Sim["needs"];
    const s = fresh({ needs: zero });
    expect(availability(s, "nap").ok).toBe(true);
    expect(availability(s, "shower").ok).toBe(true);
    const r = ok(perform(s, "nap", R));
    for (const k of NEED_KEYS) { expect(r.sim.needs[k]).toBeGreaterThanOrEqual(0); expect(r.sim.needs[k]).toBeLessThanOrEqual(100); }
  });
  it("keeps everything you own through weeks of doing nothing but sleeping", () => {
    let s = fresh({ inventory: ["lamp", "rug"], pet: { name: "Miso" }, friends: { maya: 2 }, money: 100, moments: [{ day: 1, text: "x", icon: "✨" }] });
    for (let i = 0; i < 60; i++) s = sleep(s).sim;
    expect(s.inventory).toEqual(["lamp", "rug"]);
    expect(s.pet?.name).toBe("Miso");
    expect(s.friends.maya).toBe(2);
    expect(s.moments).toHaveLength(1);
    expect(s.money).toBeGreaterThanOrEqual(0);
    for (const k of NEED_KEYS) expect(s.needs[k]).toBeGreaterThanOrEqual(0);
  });
  it("covers the weekly bills with community support when you can't pay, and says it kindly", () => {
    let s = fresh({ day: 6, money: 10 });
    const r = ok(sleep(s));
    s = r.sim;
    expect(s.day).toBe(7);
    expect(s.money).toBe(10);
    expect(s.supportedByCommunity).toBe(1);
    expect(r.message).toMatch(/community covered/i);
    expect(r.message).toMatch(/not a failure/i);
  });
  it("charges weekly bills only when you can afford them", () => {
    const s = ok(sleep(fresh({ day: 6, money: 200 }))).sim;
    expect(s.money).toBe(200 - WEEKLY_BILLS);
    expect(s.supportedByCommunity).toBe(0);
  });
  it("never records the same week's bills twice", () => {
    let s = ok(sleep(fresh({ day: 6, money: 500 }))).sim;
    const after = s.money;
    s = { ...s, day: 7 };
    s = sleep(s).sim;
    expect(s.money).toBe(after);
  });
});

describe("shopping", () => {
  it("costs a block the first time you go somewhere each day, then is free", () => {
    let s = fresh();
    s = ok(visit(s, "homestore")).sim;
    expect(s.block).toBe(1);
    s = ok(visit(s, "homestore")).sim;
    expect(s.block).toBe(1);
    expect(s.visitedToday).toContain("homestore");
  });
  it("won't let you buy without being at the shop, without enough money, or twice", () => {
    let s = fresh({ money: 100 });
    expect(buy(s, "lamp").ok).toBe(false);
    s = ok(visit(s, "homestore")).sim;
    s = ok(buy(s, "lamp")).sim;
    expect(s.money).toBe(75);
    expect(buy(s, "lamp").message).toMatch(/already/i);
    const poor = buy({ ...s, money: 5 }, "rug");
    expect(poor.ok).toBe(false);
    expect(poor.sim.money).toBe(5);
    expect(poor.message).toMatch(/no rush/i);
    expect(buy(s, "cozy_couch").sim.money).toBe(75);
  });
  it("wearing a new outfit changes how your character looks", () => {
    let s = fresh({ money: 100 });
    s = ok(visit(s, "clothes")).sim;
    s = ok(buy(s, "outfit_green")).sim;
    expect(s.avatar.shirt).toBe(2);
    expect(s.inventory).toContain("outfit_green");
  });
  it("sells groceries and pet food only at the grocery store", () => {
    let s = fresh({ money: 100, groceries: 0 });
    expect(buyGroceries(s).ok).toBe(false);
    s = ok(visit(s, "grocery")).sim;
    s = ok(buyGroceries(s)).sim;
    s = ok(buyPetFood(s)).sim;
    expect(s.groceries).toBe(5);
    expect(s.petFood).toBe(5);
    expect(s.money).toBe(65);
  });
  it("has no pressure tactics: fixed prices, no gambling, no urgency language", () => {
    const text = JSON.stringify([ITEMS, HOME_ACTIONS, JOBS, FRIENDS]).toLowerCase();
    for (const bad of ["limited time", "hurry", "last chance", "sale ends", "act now", "loot", "gamble", "lottery", "casino", "jackpot", "spin the", "mystery box", "only today"]) expect(text, bad).not.toContain(bad);
    for (const i of ITEMS) { expect(i.price).toBeGreaterThan(0); expect(i.price).toBeLessThanOrEqual(150); }
  });
  it("makes every home item add something good", () => {
    expect(cozyScore(fresh({ inventory: ["lamp", "rug", "plant_monstera"] }))).toBe(1 + 2 + 2);
  });
  it("a cozier home slows how fast calm drains", () => {
    const bare = perform(fresh(), "tv", R).sim.needs.calm;
    const cozy = perform(fresh({ inventory: ["rug", "string_lights", "cozy_couch", "bookshelf"] }), "tv", R).sim.needs.calm;
    expect(cozy).toBeGreaterThan(bare);
  });
});

describe("work with healthy limits", () => {
  it("pays for a shift, takes two blocks, and costs some energy", () => {
    const s0 = fresh();
    const r = ok(work(s0, "cafe"));
    expect(r.sim.money).toBe(s0.money + 50);
    expect(r.sim.block).toBe(2);
    expect(r.sim.needs.energy).toBeLessThan(s0.needs.energy);
    expect(r.sim.shiftsToday).toBe(1);
  });
  it("gently stops you working more than two shifts in a day", () => {
    let s = fresh();
    for (let i = 0; i < MAX_SHIFTS_PER_DAY; i++) s = ok(work(s, "library")).sim;
    const r = work({ ...s, block: 0 }, "garden");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/plenty of work/i);
    expect(r.message).toMatch(/rest counts/i);
  });
  it("won't start a shift you can't finish", () => {
    const r = work(fresh({ block: 4 }), "cafe");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/enough of the day/i);
  });
});

describe("pets, friends and asking for help", () => {
  it("adopts a cat for $50, once, and never lets it come to harm", () => {
    let s = fresh({ money: 80 });
    expect(adoptCat(s, "Miso").ok).toBe(false); // not at the shelter
    s = ok(visit(s, "shelter")).sim;
    s = ok(adoptCat(s, "  Mochi  ")).sim;
    expect(s.pet?.name).toBe("Mochi");
    expect(s.money).toBe(30);
    expect(adoptCat(s, "Other").ok).toBe(false);
    for (let i = 0; i < 40; i++) s = sleep(s).sim;
    expect(s.pet?.name).toBe("Mochi"); // never leaves, never suffers
  });
  it("lets an unfed pet stay happy: pet food is a bonus, not a duty", () => {
    const s = fresh({ pet: { name: "Miso" }, petFood: 0 });
    expect(feedPet(s).message).toMatch(/happy to see you/i);
    expect(availability(s, "pet_time").ok).toBe(true);
    const fed = ok(feedPet({ ...s, petFood: 2 })).sim;
    expect(fed.petFood).toBe(1);
    expect(feedPet(fed).ok).toBe(false); // once a day
  });
  it("meets friends at the community centre, then you can call them", () => {
    let s = fresh();
    expect(availability(s, "call_friend").ok).toBe(false);
    s = ok(visit(s, "centre")).sim;
    s = ok(centreChat(s)).sim;
    expect(s.friends.maya).toBe(1);
    s = ok(visit({ ...s, block: 0, visitedToday: ["centre"] }, "centre")).sim;
    s = ok(centreChat({ ...s, block: 0 })).sim;
    expect(s.friends.dev).toBe(1);
    expect(availability({ ...s, block: 0 }, "call_friend").ok).toBe(true);
    const before = Object.values(s.friends).reduce((a, b) => a + b, 0);
    const r = ok(perform({ ...s, block: 0 }, "call_friend", R));
    expect(Object.values(r.sim.friends).reduce((a, b) => a + b, 0)).toBe(before + 1);
    expect(r.sim.needs.social).toBeGreaterThan(s.needs.social - 5);
  });
  it("plays through a friend's gentle stories, then keeps chatting warmly", () => {
    let s = fresh({ friends: { maya: 1 } });
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) { const r = ok(perform({ ...s, block: 0 }, "call_friend", R)); seen.push(r.message); s = r.sim; }
    expect(seen[0]).toContain("Maya");
    expect(new Set(seen).size).toBeGreaterThan(2);
    for (const m of seen) expect(m).not.toMatch(/suicid|self.?harm|kill|die\b/i);
  });
  it("rewards reaching out: a free meal at the centre, once a day, recorded as a brave moment", () => {
    let s = fresh({ needs: { ...fresh().needs, hunger: 10 } });
    s = ok(visit(s, "centre")).sim;
    const r = ok(centreMeal(s));
    expect(r.sim.needs.hunger).toBeGreaterThan(s.needs.hunger + 15);
    expect(r.sim.moments.at(-1)?.text).toMatch(/takes courage/i);
    expect(centreMeal({ ...r.sim, block: 0 }).ok).toBe(false);
    expect(r.sim.money).toBe(s.money); // free, always
  });
});

describe("the park, weather, trips and moments", () => {
  it("is deterministic: the same day and place always have the same weather", () => {
    const s = fresh({ day: 12 });
    expect(weatherFor(s, "on")).toBe(weatherFor(s, "on"));
    const kinds = new Set(Array.from({ length: 80 }, (_, i) => weatherFor(fresh({ day: i + 1 }), "mb")));
    expect(kinds.size).toBeGreaterThan(1);
  });
  it("snows in a Canadian winter and not in summer", () => {
    const winter = Array.from({ length: 60 }, (_, i) => weatherFor(newSim(DEFAULT_AVATAR, new Date(2027, 0, 1)), "mb") && weatherFor({ ...newSim(DEFAULT_AVATAR, new Date(2027, 0, 1)), day: i + 1 }, "mb"));
    expect(winter).toContain("snow");
    const summer = Array.from({ length: 60 }, (_, i) => weatherFor({ ...newSim(DEFAULT_AVATAR, new Date(2027, 6, 1)), day: i + 1 }, "mb"));
    expect(summer).not.toContain("snow");
  });
  it("a walk in the park is free, calming, and becomes a good moment", () => {
    let s = fresh({ needs: { ...fresh().needs, calm: 20 } });
    expect(parkWalk(s, R).ok).toBe(false);
    s = ok(visit(s, "park")).sim;
    const r = ok(parkWalk(s, R));
    expect(r.sim.needs.calm).toBeGreaterThan(s.needs.calm + 10);
    expect(r.sim.money).toBe(s.money);
    expect(r.moment?.text).toMatch(/Walked in the park on/);
  });
  it("a trip costs $120 and two blocks, calms and cheers you, and adds a moment", () => {
    const s = fresh({ money: 200 });
    const r = ok(travel(s, "yt", "Yukon"));
    expect(r.sim.money).toBe(80);
    expect(r.sim.block).toBe(2);
    expect(r.sim.travelled).toEqual(["yt"]);
    expect(r.moment?.text).toContain("Yukon");
    expect(travel(fresh({ money: 50 }), "yt", "Yukon").ok).toBe(false);
  });
  it("only ever adds to the scrapbook", () => {
    let s = fresh({ inventory: ["guitar"] });
    let prev = 0;
    for (let d = 0; d < 6; d++) { s = sleep(perform(s, "guitar", R).sim).sim; expect(s.moments.length).toBeGreaterThanOrEqual(prev); prev = s.moments.length; }
    expect(prev).toBe(6);
  });
});

describe("real coping exercises feed the game", () => {
  it("breathing, grounding and journaling raise calm when finished", () => {
    for (const id of ["breathe", "ground", "journal"] as const) {
      const s = fresh({ needs: { ...fresh().needs, calm: 20 } });
      const r = finishExercise(s, id);
      expect(r.sim.needs.calm).toBeGreaterThan(s.needs.calm);
    }
  });
  it("still counts when the day is full, with no penalty", () => {
    const s = fresh({ block: BLOCKS_PER_DAY });
    const r = finishExercise(s, "breathe");
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/still counts/i);
    expect(r.sim).toEqual(s);
  });
});

describe("saved games", () => {
  it("round-trips a full game", () => {
    const kv = new Mem();
    const sim = fresh({ inventory: ["lamp"], pet: { name: "Miso" }, friends: { maya: 3 }, money: 77, moments: [{ day: 2, text: "Played guitar.", icon: "🎸" }] });
    saveState(kv, { ...loadState(kv), adultConfirmedAt: "x", region: "on", sim });
    const back = loadState(kv);
    expect(back.sim).toEqual(sim);
  });
  it("upgrades an old save without losing the journal or check-ins", () => {
    const kv = new Mem();
    kv.setItem(STORAGE_KEY, JSON.stringify({ v: 1, adultConfirmedAt: "x", nickname: "Sam", region: "ns", tickets: 12, activityCount: 9, checkins: [{ at: "2026-10-01T10:00:00Z", mood: 3, tags: [] }], journal: [{ id: "1", at: "2026-10-01T10:00:00Z", prompt: null, text: "kept" }], settings: { quiet: true, largeText: false } }));
    const s = loadState(kv);
    expect(s.v).toBe(2);
    expect(s.journal[0].text).toBe("kept");
    expect(s.checkins).toHaveLength(1);
    expect(s.settings.quiet).toBe(true);
    expect(s.sim).toBeNull();
  });
  it("keeps a game saved under the old app name, and saves under the new name", () => {
    const kv = new Mem();
    const sim = fresh({ money: 123, inventory: ["lamp"] });
    kv.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ v: 2, adultConfirmedAt: "x", nickname: "Sam", region: "on", checkins: [], journal: [], settings: { quiet: false, largeText: false }, sim }));
    const loaded = loadState(kv);
    expect(loaded.sim?.money).toBe(123);
    expect(loaded.nickname).toBe("Sam");
    saveState(kv, loaded);
    expect(kv.getItem(STORAGE_KEY)).not.toBeNull();
    clearAllData(kv);
    expect(kv.getItem(STORAGE_KEY)).toBeNull();
    expect(kv.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
  it("survives hostile or corrupt game data", () => {
    for (const bad of [null, 5, "x", [], { money: "lots" }, { money: -50, day: -3, needs: { energy: 9999, calm: "x" }, inventory: [1, "lamp", null], friends: { maya: "no" }, moments: [{ text: 5 }, { text: "ok", day: 2 }], block: 99, pet: { name: 5 } }]) {
      const s = sanitizeSim(bad);
      if (s === null) continue;
      expect(s.money).toBeGreaterThanOrEqual(0);
      expect(s.day).toBeGreaterThanOrEqual(1);
      expect(s.block).toBeLessThanOrEqual(BLOCKS_PER_DAY);
      for (const k of NEED_KEYS) { expect(s.needs[k]).toBeGreaterThanOrEqual(0); expect(s.needs[k]).toBeLessThanOrEqual(100); }
      expect(s.inventory.every((x) => typeof x === "string")).toBe(true);
      expect(s.pet === null || typeof s.pet.name === "string").toBe(true);
    }
  });
});

describe("is a gentle routine sustainable?", () => {
  /** A reasonable person's day: wash, eat, one shift, something enjoyable, sleep. Buys groceries when out. */
  function routineDay(s: Sim): Sim {
    if (s.groceries < 1) { s = visit(s, "grocery").sim; s = buyGroceries(s).sim; }
    s = perform(s, "shower", R).sim;
    if (s.groceries >= 1) s = perform(s, "cook", R).sim;
    s = work({ ...s }, "library").ok ? work(s, "library").sim : s;
    if (s.block < BLOCKS_PER_DAY - 1) s = perform(s, "tv", R).sim;
    if (s.block < BLOCKS_PER_DAY) s = perform(s, "cook", R).ok ? perform(s, "cook", R).sim : s;
    return sleep(s).sim;
  }
  it("earns more than it spends and keeps mood at least okay on average", () => {
    let s = fresh();
    const moods: number[] = [];
    for (let d = 0; d < 28; d++) { s = routineDay(s); moods.push(moodOf(s.needs).score); }
    expect(s.money).toBeGreaterThan(START_MONEY);
    expect(moods.reduce((a, b) => a + b, 0) / moods.length).toBeGreaterThan(50);
    expect(s.supportedByCommunity).toBe(0);
  });
  it("does nothing terrible when you just rest for a month", () => {
    let s = fresh();
    for (let d = 0; d < 30; d++) s = sleep(s).sim;
    expect(s.money).toBeGreaterThanOrEqual(0);
    expect(s.day).toBe(31);
  });
});

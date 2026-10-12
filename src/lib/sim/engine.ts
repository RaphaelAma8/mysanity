import {
  ADOPT_PRICE, FRIENDS, FRIEND_REPEAT, GROCERY_PACK, HOME_ACTIONS, ITEMS, JOBS, PET_FOOD_PACK, SHOP_ITEMS, START_MONEY, TRAVEL_PRICE,
  WEEKLY_BILLS, actionById, itemById, type Effects,
} from "./data";
import {
  BLOCKS_PER_DAY, MAX_SHIFTS_PER_DAY, NEED_KEYS, NEED_META, type Avatar, type Moment, type Needs, type Result, type Sim,
} from "./types";

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export const newSim = (avatar: Avatar, now: Date): Sim => ({
  v: 1, startedAt: now.toISOString(), day: 1, block: 0, money: START_MONEY,
  needs: { energy: 70, hunger: 70, hygiene: 70, fun: 60, social: 50, calm: 60 },
  groceries: 3, petFood: 0, inventory: [], pet: null, friends: {}, shiftsToday: 0, helpedToday: false,
  visitedToday: [], moments: [], lastBillDay: 0, avatar, travelled: [], petFedToday: false, supportedByCommunity: 0,
  littleWins: [],
});

const WIN_OF: Record<string, string> = {
  cook: "nourish", takeout: "nourish",
  call_friend: "connect", pet_time: "connect",
  breathe: "settle", ground: "settle", journal: "settle", nap: "settle", shower: "settle", tidy: "settle",
};

/** A small win for today. Doing it twice, or not at all, never costs anything. */
export function noteWin(sim: Sim, id: string): Sim {
  if (!id || sim.littleWins.includes(id)) return sim;
  return { ...sim, littleWins: [...sim.littleWins, id].slice(0, 8) };
}

/* ---------- mood: gentle words, never a grade ---------- */
export type MoodTier = "good" | "okay" | "low" | "rough";
export function moodOf(n: Needs): { score: number; label: string; tier: MoodTier; face: string } {
  const score = n.energy * 0.2 + n.hunger * 0.2 + n.hygiene * 0.1 + n.fun * 0.2 + n.social * 0.15 + n.calm * 0.15;
  if (score >= 75) return { score, label: "Doing well", tier: "good", face: "😊" };
  if (score >= 55) return { score, label: "Okay", tier: "okay", face: "🙂" };
  if (score >= 35) return { score, label: "A bit low", tier: "low", face: "😕" };
  return { score, label: "Having a rough time", tier: "rough", face: "😞" };
}

export const cozyScore = (s: Sim) => s.inventory.reduce((n, id) => n + (itemById(id)?.cozy ?? 0), 0);
export const has = (s: Sim, id: string) => s.inventory.includes(id);
const plants = (s: Sim) => s.inventory.filter((id) => itemById(id)?.slot === "plant").length;
const friendsMet = (s: Sim) => Object.entries(s.friends).filter(([, lvl]) => lvl >= 1).map(([id]) => id);

/* ---------- calendar, season, weather (all deterministic) ---------- */
export type Season = "winter" | "spring" | "summer" | "fall";
export type Weather = "sunny" | "cloudy" | "rain" | "snow";
export const dateOf = (s: Sim) => new Date(new Date(s.startedAt).getTime() + (s.day - 1) * 86_400_000);
export function seasonOf(d: Date): Season {
  const m = d.getMonth();
  return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "fall";
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
export function weatherFor(s: Sim, region: string): Weather {
  const r = hash(`${region}:${s.day}:${s.startedAt.slice(0, 10)}`);
  const season = seasonOf(dateOf(s));
  const table: Record<Season, [number, Weather][]> = {
    winter: [[0.45, "snow"], [0.75, "cloudy"], [1, "sunny"]],
    spring: [[0.3, "rain"], [0.6, "cloudy"], [1, "sunny"]],
    summer: [[0.6, "sunny"], [0.8, "cloudy"], [1, "rain"]],
    fall: [[0.3, "rain"], [0.65, "cloudy"], [1, "sunny"]],
  };
  return table[season].find(([p]) => r < p)![1];
}
const weatherPhrase: Record<Weather, string> = { sunny: "a bright, sunny day", cloudy: "a soft grey day", rain: "a rainy day", snow: "a snowy day" };

/* ---------- needs ---------- */
function applyEffects(n: Needs, e: Effects): { needs: Needs; gains: string[] } {
  const needs = { ...n };
  const gains: string[] = [];
  for (const k of NEED_KEYS) {
    const v = e[k];
    if (!v) continue;
    const before = needs[k];
    needs[k] = clamp(before + v);
    const d = Math.round(needs[k] - before);
    if (d !== 0) gains.push(`${d > 0 ? "+" : "−"}${Math.abs(d)} ${NEED_META[k].label}`);
  }
  return { needs, gains };
}
/** Time passing. A cozy home slows how fast calm drains. Needs can reach 0 but nothing bad ever happens at 0. */
function decay(s: Sim, blocks: number): Needs {
  let n = { ...s.needs };
  const calmSave = Math.min(3, cozyScore(s) * 0.35);
  for (let i = 0; i < blocks; i++) {
    n = {
      energy: clamp(n.energy - 5), hunger: clamp(n.hunger - 9), hygiene: clamp(n.hygiene - 3),
      fun: clamp(n.fun - 5), social: clamp(n.social - 3), calm: clamp(n.calm - (4.5 - calmSave * 0.8)),
    };
  }
  return n;
}
const moment = (s: Sim, text: string, icon: string): Moment => ({ day: s.day, text, icon });
const addMoment = (s: Sim, m: Moment): Sim => ({ ...s, moments: [...s.moments, m].slice(-300) });
const blocksLeft = (s: Sim) => BLOCKS_PER_DAY - s.block;
const fail = (sim: Sim, message: string): Result => ({ sim, ok: false, message });

/* ---------- home actions ---------- */
export function availability(s: Sim, id: string): { ok: boolean; reason?: string } {
  const a = actionById(id);
  if (!a) return { ok: false, reason: "Not available." };
  if (blocksLeft(s) < a.blocks) return { ok: false, reason: "The day is winding down. Time for bed." };
  if (a.cost && s.money < a.cost) return { ok: false, reason: `You need $${a.cost}.` };
  switch (a.needs) {
    case "groceries": if (s.groceries < 1) return { ok: false, reason: "You're out of groceries. The grocery store is in town." }; break;
    case "pet": if (!s.pet) return { ok: false, reason: "You don't have a pet yet." }; break;
    case "friend": if (friendsMet(s).length === 0) return { ok: false, reason: "You haven't met anyone to call yet. Try the community centre." }; break;
    case "plant": if (plants(s) === 0) return { ok: false, reason: "You don't have any plants yet." }; break;
    case "guitar": case "easel": case "radio": if (!has(s, a.needs)) return { ok: false, reason: "You don't have that yet." }; break;
    case "bookshelf": if (!has(s, "bookshelf")) return { ok: false, reason: "You need a bookshelf." }; break;
    default: break;
  }
  return { ok: true };
}

export function perform(sim: Sim, id: string, region: string): Result {
  const a = actionById(id);
  if (!a) return fail(sim, "That isn't available.");
  const av = availability(sim, id);
  if (!av.ok) return fail(sim, av.reason ?? "Not right now.");
  let s: Sim = { ...sim, money: sim.money - (a.cost ?? 0) };
  const eff: Effects = { ...a.effects };
  let note = a.label + ".";
  let mom: Moment | undefined;

  if (a.id === "cook") {
    s.groceries -= 1;
    if (has(s, "plant_herbs")) eff.fun = (eff.fun ?? 0) + 3;
    note = "You cooked a proper meal.";
  }
  if (a.id === "call_friend") {
    const met = friendsMet(s);
    const fid = met[(s.day + met.length) % met.length];
    const f = FRIENDS.find((x) => x.id === fid)!;
    const lvl = s.friends[fid] ?? 1;
    const story = f.stories[lvl - 1];
    s = { ...s, friends: { ...s.friends, [fid]: Math.min(10, lvl + 1) } };
    note = story ? `${f.name}: ${story}` : `${f.name}: ${FRIEND_REPEAT[lvl % FRIEND_REPEAT.length]}`;
    if (story) mom = moment(s, `A good chat with ${f.name}.`, "💬");
  }
  if (a.moment && !mom) mom = moment(s, a.moment, a.icon);
  const { needs, gains } = applyEffects(s.needs, eff);
  s = { ...s, needs, block: s.block + a.blocks };
  s = { ...s, needs: decay(s, a.blocks) };
  if (mom) s = addMoment(s, mom);
  if (WIN_OF[a.id]) s = noteWin(s, WIN_OF[a.id]);
  void region;
  return { sim: s, ok: true, message: note, gains, moment: mom };
}

/* ---------- sleep, bills and the safety net ---------- */
export function sleep(sim: Sim): Result {
  const s: Sim = { ...sim };
  const n = s.needs;
  s.needs = { energy: 100, hunger: clamp(n.hunger - 12), hygiene: clamp(n.hygiene - 4), fun: clamp(n.fun - 2), social: clamp(n.social - 2), calm: clamp(n.calm + 12) };
  s.day += 1;
  s.block = 0;
  s.shiftsToday = 0;
  s.helpedToday = false;
  s.visitedToday = [];
  s.petFedToday = false;
  s.littleWins = [];
  let msg = "You slept. A new day is here.";
  if (s.day % 7 === 0 && s.lastBillDay < s.day) {
    s.lastBillDay = s.day;
    if (s.money >= WEEKLY_BILLS) { s.money -= WEEKLY_BILLS; msg += ` Weekly bills: −$${WEEKLY_BILLS}.`; }
    else {
      // Safety net: running out of money never causes a loss. The community covers it, and the game says so kindly.
      s.supportedByCommunity += 1;
      msg += " Money was tight this week, so your community covered the bills. Asking for help is part of life, not a failure.";
    }
  }
  return { sim: s, ok: true, message: msg };
}

/* ---------- town ---------- */
export const shopOf = (itemId: string) => Object.entries(SHOP_ITEMS).find(([, ids]) => ids.includes(itemId))?.[0];

/** Going somewhere takes a block the first time you go each day. Staying and doing more there is free. */
export function visit(sim: Sim, placeId: string): Result {
  if (placeId === "work" || placeId === "travel") return { sim, ok: true, message: "" };
  if (sim.visitedToday.includes(placeId)) return { sim, ok: true, message: "" };
  if (blocksLeft(sim) < 1) return fail(sim, "The day is winding down. Time for bed.");
  const s: Sim = { ...sim, block: sim.block + 1, visitedToday: [...sim.visitedToday, placeId] };
  return { sim: { ...s, needs: decay(s, 1) }, ok: true, message: "You head over." };
}

export function buy(sim: Sim, itemId: string): Result {
  const item = itemById(itemId);
  if (!item) return fail(sim, "That isn't for sale.");
  const shop = shopOf(itemId);
  if (!shop || !sim.visitedToday.includes(shop)) return fail(sim, "You need to be at the shop first.");
  if (sim.inventory.includes(itemId)) return fail(sim, "You already have that.");
  if (sim.money < item.price) return fail(sim, `That costs $${item.price}. No rush, it will be here when you're ready.`);
  let s: Sim = { ...sim, money: sim.money - item.price, inventory: [...sim.inventory, itemId] };
  if (item.shirt !== undefined) s = { ...s, avatar: { ...s.avatar, shirt: item.shirt }, needs: applyEffects(s.needs, { fun: 6 }).needs };
  return { sim: s, ok: true, message: `You bought the ${item.name.toLowerCase()}.`, gains: [`−$${item.price}`] };
}

function buyPack(sim: Sim, shop: string, price: number, field: "groceries" | "petFood", units: number, label: string): Result {
  if (!sim.visitedToday.includes(shop)) return fail(sim, "You need to be at the store first.");
  if (sim.money < price) return fail(sim, `That costs $${price}.`);
  return { sim: { ...sim, money: sim.money - price, [field]: sim[field] + units }, ok: true, message: `You picked up ${label}.`, gains: [`−$${price}`] };
}
export const buyGroceries = (s: Sim) => buyPack(s, "grocery", GROCERY_PACK.price, "groceries", GROCERY_PACK.units, "groceries for the week");
export const buyPetFood = (s: Sim) => buyPack(s, "grocery", PET_FOOD_PACK.price, "petFood", PET_FOOD_PACK.units, "pet food");

export function work(sim: Sim, jobId: string): Result {
  const job = JOBS.find((j) => j.id === jobId);
  if (!job) return fail(sim, "That job isn't available.");
  if (sim.shiftsToday >= MAX_SHIFTS_PER_DAY) return fail(sim, "That's plenty of work for one day. Rest counts too.");
  if (blocksLeft(sim) < job.blocks) return fail(sim, "There isn't enough of the day left for a full shift.");
  const { needs, gains } = applyEffects(sim.needs, job.effects);
  let s: Sim = { ...sim, money: sim.money + job.pay, needs, block: sim.block + job.blocks, shiftsToday: sim.shiftsToday + 1 };
  s = { ...s, needs: decay(s, job.blocks) };
  return { sim: s, ok: true, message: `${job.name} done. Nice work.`, gains: [`+$${job.pay}`, ...gains] };
}

/** A free outing at the club, gym or farm. Same for everyone; nothing is tracked from a journal or a mood. */
export function placeOuting(sim: Sim, placeId: "club" | "gym" | "farm"): Result {
  if (!sim.visitedToday.includes(placeId)) return fail(sim, "Step inside first.");
  if (blocksLeft(sim) < 1) return fail(sim, "The day is winding down. Time for bed.");
  const plan = {
    club: { effects: { social: 18, fun: 8 }, message: "You sat in at the club. Company, and nothing you had to perform.", win: "connect" as const, icon: "🎶", note: "Sat in at the lakeside club." },
    gym: { effects: { fun: 12, calm: 8, energy: -6 }, message: "A gentle bit of movement. Stopping whenever you like is part of it.", win: null, icon: "🤸", note: "Moved a little at the gym." },
    farm: { effects: { calm: 14, fun: 8 }, message: "You walked the rows. The farm is quiet, and nobody timed you.", win: "outside" as const, icon: "🌾", note: "Walked the rows at the farm." },
  }[placeId];
  const { needs, gains } = applyEffects(sim.needs, plan.effects);
  let s: Sim = { ...sim, needs, block: sim.block + 1 };
  s = { ...s, needs: decay(s, 1) };
  const mom = moment(s, plan.note, plan.icon);
  s = addMoment(s, mom);
  if (plan.win) s = noteWin(s, plan.win);
  return { sim: s, ok: true, message: plan.message, gains, moment: mom };
}

export function parkWalk(sim: Sim, region: string): Result {
  if (!sim.visitedToday.includes("park")) return fail(sim, "You need to be at the park first.");
  if (blocksLeft(sim) < 1) return fail(sim, "The day is winding down. Time for bed.");
  const w = weatherFor(sim, region);
  const { needs, gains } = applyEffects(sim.needs, { calm: 20, fun: 10, hygiene: -2 });
  let s: Sim = { ...sim, needs, block: sim.block + 1 };
  s = { ...s, needs: decay(s, 1) };
  const mom = moment(s, `Walked in the park on ${weatherPhrase[w]}.`, "🌳");
  return { sim: noteWin(addMoment(s, mom), "outside"), ok: true, message: `A walk on ${weatherPhrase[w]}. Fresh air helps.`, gains, moment: mom };
}

export function centreMeal(sim: Sim): Result {
  if (!sim.visitedToday.includes("centre")) return fail(sim, "You need to be at the community centre first.");
  if (sim.helpedToday) return fail(sim, "You've already had a meal here today. Come back tomorrow.");
  if (blocksLeft(sim) < 1) return fail(sim, "The day is winding down. Time for bed.");
  const { needs, gains } = applyEffects(sim.needs, { hunger: 35, social: 8, calm: 6 });
  let s: Sim = { ...sim, needs, block: sim.block + 1, helpedToday: true };
  s = { ...s, needs: decay(s, 1) };
  const mom = moment(s, "Went to the community centre and let people help. That takes courage.", "🤝");
  return { sim: noteWin(addMoment(s, mom), "nourish"), ok: true, message: "A warm, free meal, and no questions. Everyone is glad you came.", gains, moment: mom };
}

export function centreChat(sim: Sim): Result {
  if (!sim.visitedToday.includes("centre")) return fail(sim, "You need to be at the community centre first.");
  if (blocksLeft(sim) < 1) return fail(sim, "The day is winding down. Time for bed.");
  const meetNext = FRIENDS.find((f) => !(sim.friends[f.id] >= 1));
  let s: Sim = { ...sim };
  let msg = "You sit and talk with someone for a while.";
  let mom: Moment | undefined;
  if (meetNext) {
    s = { ...s, friends: { ...s.friends, [meetNext.id]: 1 } };
    msg = `You meet ${meetNext.name} from ${meetNext.where}. You can call ${meetNext.name} from home now.`;
    mom = moment(s, `Met ${meetNext.name}.`, "👋");
  }
  const { needs, gains } = applyEffects(s.needs, { social: 22, fun: 5 });
  s = { ...s, needs, block: s.block + 1 };
  s = { ...s, needs: decay(s, 1) };
  if (mom) s = addMoment(s, mom);
  s = noteWin(s, "connect");
  return { sim: s, ok: true, message: msg, gains, moment: mom };
}

export function adoptCat(sim: Sim, name: string): Result {
  if (!sim.visitedToday.includes("shelter")) return fail(sim, "You need to be at the shelter first.");
  if (sim.pet) return fail(sim, `${sim.pet.name} already lives with you.`);
  if (sim.money < ADOPT_PRICE) return fail(sim, `The adoption fee is $${ADOPT_PRICE}.`);
  const clean = name.trim().slice(0, 20) || "Miso";
  const { needs, gains } = applyEffects(sim.needs, { social: 10, calm: 8, fun: 10 });
  let s: Sim = { ...sim, money: sim.money - ADOPT_PRICE, pet: { name: clean }, needs };
  const mom = moment(s, `Brought ${clean} home.`, "🐈");
  s = addMoment(s, mom);
  return { sim: s, ok: true, message: `${clean} curls up on the couch like they've always lived here.`, gains: [`−$${ADOPT_PRICE}`, ...gains], moment: mom };
}

export function feedPet(sim: Sim): Result {
  if (!sim.pet) return fail(sim, "You don't have a pet yet.");
  if (sim.petFedToday) return fail(sim, `${sim.pet.name} has already eaten today.`);
  if (sim.petFood < 1) return fail(sim, `You're out of pet food. ${sim.pet.name} is happy to see you anyway.`);
  const { needs, gains } = applyEffects(sim.needs, { calm: 3 });
  return { sim: { ...sim, petFood: sim.petFood - 1, petFedToday: true, needs }, ok: true, message: `${sim.pet.name} purrs and eats.`, gains };
}

export function travel(sim: Sim, regionId: string, regionName: string): Result {
  if (sim.money < TRAVEL_PRICE) return fail(sim, `A trip costs $${TRAVEL_PRICE}. It'll be there when you're ready.`);
  if (blocksLeft(sim) < 2) return fail(sim, "There isn't enough of the day left for a trip.");
  const { needs, gains } = applyEffects(sim.needs, { calm: 30, fun: 25, social: 5 });
  let s: Sim = { ...sim, money: sim.money - TRAVEL_PRICE, needs, block: sim.block + 2 };
  s = { ...s, needs: decay(s, 2), travelled: sim.travelled.includes(regionId) ? sim.travelled : [...sim.travelled, regionId] };
  const mom = moment(s, `Took a trip to ${regionName}.`, "✈️");
  return { sim: addMoment(s, mom), ok: true, message: `You spent the day in ${regionName}.`, gains: [`−$${TRAVEL_PRICE}`, ...gains], moment: mom };
}

/** Applies the effect of a real coping exercise (breathing, grounding, journaling) after the person finishes it. */
export function finishExercise(sim: Sim, id: "breathe" | "ground" | "journal"): Result {
  if (blocksLeft(sim) < 1) return { sim, ok: true, message: "The day is full, but this still counts for you." };
  return perform(sim, id, "");
}

export const allHomeActions = () => HOME_ACTIONS;
export const allItems = () => ITEMS;

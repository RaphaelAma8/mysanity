import { newSim } from "./sim/engine";
import { FRIENDS, businessById, carById, homeById } from "./sim/data";
import { BLOCKS_PER_DAY, NEED_KEYS, type Avatar, type BusinessBoard, type Moment, type Needs, type Placement, type Sim } from "./sim/types";

/**
 * The journal and mood check-ins live only on this device. They are never included in a cloud save.
 * The character (sim) can optionally be copied to the host's database if the person turns that on.
 */
export const CLOUD_KEY = "mysanity:cloud";

export type Mood = 1 | 2 | 3 | 4 | 5;
export interface Checkin { at: string; mood: Mood; tags: string[] }
export interface JournalEntry { id: string; at: string; prompt: string | null; text: string }

export interface State {
  v: 2;
  adultConfirmedAt: string | null;
  nickname: string;
  region: string | null;
  checkins: Checkin[];
  journal: JournalEntry[];
  settings: { quiet: boolean; largeText: boolean };
  /** The life game. null until the character has been created. */
  sim: Sim | null;
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const emptyState = (): State => ({
  v: 2, adultConfirmedAt: null, nickname: "", region: null, checkins: [], journal: [], settings: { quiet: false, largeText: false }, sim: null,
});
export const DEFAULT_AVATAR: Avatar = { skin: 1, hair: 1, style: 0, shirt: 1 };

export function addCheckin(state: State, mood: Mood, tags: string[], now: Date): State {
  return { ...state, checkins: [...state.checkins, { at: now.toISOString(), mood, tags: tags.slice(0, 7) }].slice(-365) };
}
export function addJournal(state: State, text: string, prompt: string | null, now: Date): State {
  const t = text.trim();
  if (!t) return state;
  const id = `${now.getTime()}-${state.journal.length}`;
  return { ...state, journal: [{ id, at: now.toISOString(), prompt, text: t.slice(0, 5000) }, ...state.journal].slice(0, 500) };
}
export const deleteJournal = (state: State, id: string): State => ({ ...state, journal: state.journal.filter((e) => e.id !== id) });
export function exportJson(state: State): string {
  return JSON.stringify(state, null, 2);
}

/* ---------- on-device storage ---------- */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export const STORAGE_KEY = "mysanity:v1";
/** The key used before the app was renamed. Read once so nobody loses their game. */
export const LEGACY_STORAGE_KEY = "north-haven:v1";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const str = (v: unknown, d: string | null) => (typeof v === "string" ? v : d);
const num = (v: unknown, d: number, min = 0, max = 1e9) => (typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : d);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function sanitizeAvatar(v: unknown): Avatar {
  if (!isObj(v)) return DEFAULT_AVATAR;
  return { skin: num(v.skin, 1, 0, 5), hair: num(v.hair, 1, 0, 5), style: num(v.style, 0, 0, 3), shirt: num(v.shirt, 1, 0, 5) };
}

/** Rebuilds a safe Sim from untrusted saved data. Anything off falls back to a default instead of crashing. */
export function sanitizeSim(p: unknown): Sim | null {
  if (!isObj(p)) return null;
  const parsed = typeof p.startedAt === "string" ? new Date(p.startedAt) : new Date(NaN);
  const start = Number.isFinite(parsed.getTime()) ? parsed : new Date(); // a corrupt date must never crash the game
  const base = newSim(sanitizeAvatar(p.avatar), start);
  const startedAt = start.toISOString();
  const needs = { ...base.needs } as Needs;
  if (isObj(p.needs)) for (const k of NEED_KEYS) needs[k] = num(p.needs[k], base.needs[k], 0, 100);
  const friends: Record<string, number> = {};
  if (isObj(p.friends)) for (const [k, v] of Object.entries(p.friends)) if (typeof v === "number") friends[k.slice(0, 20)] = num(v, 0, 0, 10);
  const moments: Moment[] = Array.isArray(p.moments)
    ? p.moments.filter((m): m is Record<string, unknown> => isObj(m) && typeof m.text === "string").slice(-300).map((m) => ({ day: num(m.day, 1), text: String(m.text).slice(0, 200), icon: typeof m.icon === "string" ? m.icon.slice(0, 4) : "✨" }))
    : [];
  return {
    v: 1, startedAt, day: num(p.day, 1, 1), block: num(p.block, 0, 0, BLOCKS_PER_DAY), money: num(p.money, base.money, 0, 1e7), needs,
    groceries: num(p.groceries, base.groceries, 0, 999), petFood: num(p.petFood, 0, 0, 999), inventory: strArr(p.inventory),
    pet: isObj(p.pet) && typeof p.pet.name === "string" ? { name: p.pet.name.slice(0, 20) } : null,
    friends, shiftsToday: num(p.shiftsToday, 0, 0, 20), helpedToday: p.helpedToday === true, visitedToday: strArr(p.visitedToday),
    moments, lastBillDay: num(p.lastBillDay, 0), avatar: sanitizeAvatar(p.avatar), travelled: strArr(p.travelled),
    petFedToday: p.petFedToday === true, supportedByCommunity: num(p.supportedByCommunity, 0),
    littleWins: strArr(p.littleWins).map((id) => id.slice(0, 24)).slice(0, 8),
    ...ownedLife(p),
  };
}

function ownedLife(p: Record<string, unknown>): Pick<Sim, "cars" | "carId" | "visitor" | "homeId" | "homes" | "placements" | "businesses" | "businessBoard"> {
  const homes = strArr(p.homes).map((id) => id.slice(0, 24)).filter((id) => homeById(id));
  if (!homes.includes("cottage")) homes.unshift("cottage");
  const requested = typeof p.homeId === "string" ? p.homeId : "cottage";
  const placements: Placement[] = Array.isArray(p.placements)
    ? p.placements.filter(isObj).slice(0, 80).map((spot) => ({
      homeId: typeof spot.homeId === "string" ? spot.homeId.slice(0, 24) : "cottage",
      itemId: typeof spot.itemId === "string" ? spot.itemId.slice(0, 40) : "",
      x: num(spot.x, 1, 0, 40),
      y: num(spot.y, 1, 0, 40),
    })).filter((spot) => spot.itemId && homes.includes(spot.homeId))
    : [];
  const businesses = strArr(p.businesses).filter((id) => businessById(id)).slice(0, 6);
  let businessBoard: BusinessBoard | null = null;
  if (isObj(p.businessBoard) && typeof p.businessBoard.name === "string" && typeof p.businessBoard.line === "string") {
    businessBoard = { name: p.businessBoard.name.slice(0, 32), line: p.businessBoard.line.slice(0, 80) };
  }
  const cars = strArr(p.cars).filter((id) => carById(id)).slice(0, 6);
  if (p.car === true && !cars.includes("hatch")) cars.unshift("hatch");
  const requestedCar = typeof p.carId === "string" ? p.carId : cars[0] ?? null;
  const names = new Set(FRIENDS.map((friend) => friend.name).concat("Maya"));
  const visitor = typeof p.visitor === "string" && names.has(p.visitor) ? p.visitor : null;
  return {
    cars,
    carId: requestedCar && cars.includes(requestedCar) ? requestedCar : cars[0] ?? null,
    visitor,
    homeId: homes.includes(requested) ? requested : "cottage",
    homes,
    placements,
    businesses,
    businessBoard,
  };
}

/** Loads saved state (and upgrades the first version). Corrupt or unexpected data is ignored, never fatal. */
export function loadState(kv: KV): State {
  const base = emptyState();
  try {
    const raw = kv.getItem(STORAGE_KEY) ?? kv.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return base;
    const p: unknown = JSON.parse(raw);
    if (!isObj(p) || (p.v !== 1 && p.v !== 2)) return base;
    const settings = isObj(p.settings) ? { quiet: p.settings.quiet === true, largeText: p.settings.largeText === true } : base.settings;
    return {
      v: 2,
      adultConfirmedAt: str(p.adultConfirmedAt, null),
      nickname: (str(p.nickname, "") ?? "").slice(0, 30),
      region: str(p.region, null),
      checkins: Array.isArray(p.checkins) ? p.checkins.filter((x): x is Checkin => isObj(x) && typeof x.at === "string" && [1, 2, 3, 4, 5].includes(x.mood as number) && Array.isArray(x.tags)) : [],
      journal: Array.isArray(p.journal) ? p.journal.filter((x): x is JournalEntry => isObj(x) && typeof x.id === "string" && typeof x.at === "string" && typeof x.text === "string") : [],
      settings,
      sim: p.v === 2 ? sanitizeSim(p.sim) : null,
    };
  } catch {
    return base;
  }
}

export function saveState(kv: KV, state: State): boolean {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // storage full or blocked: the game keeps working for this session
  }
}

export function clearAllData(kv: KV): void {
  try {
    kv.removeItem(STORAGE_KEY);
    kv.removeItem(LEGACY_STORAGE_KEY);
    kv.removeItem(CLOUD_KEY);
  } catch {
    /* nothing to clear */
  }
}

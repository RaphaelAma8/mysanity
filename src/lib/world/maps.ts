/**
 * Cedar Bay: a small walkable Canadian town, plus the rooms you step into.
 * Tiles are data. Drawing lives in draw.ts. Nothing here talks to a server.
 */
import { JOBS, PLACES } from "@/lib/sim/data";

export const TILE_PX = 48;

export const GROUND = {
  grass: 0,
  path: 1,
  water: 2,
  sand: 3,
  floor: 4,
  plank: 5,
  soil: 6,
  stone: 7,
  rug: 8,
} as const;

export interface Spot {
  id: string;
  x: number;
  y: number;
  label: string;
  aria: string;
  kind: "home" | "place" | "exit" | "enter" | "flavor";
  placeId?: string;
  jobId?: string;
  actions?: string[];
  to?: string;
  tx?: number;
  ty?: number;
  line?: string;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  wall: string;
  sign: string;
}

export interface Npc {
  id: string;
  name: string;
  x: number;
  y: number;
  skin: number;
  hair: number;
  style: number;
  shirt: number;
  line?: string;
}

export interface Prop { kind: string; x: number; y: number }

/** A roadside board. The words on it come from approved ads, never from a person's journal or mood. */
export interface BoardSlot { id: string; x: number; y: number }

export interface WorldMap {
  id: string;
  name: string;
  w: number;
  h: number;
  ground: Uint8Array;
  solid: Uint8Array;
  spots: Spot[];
  buildings: Building[];
  trees: { x: number; y: number; kind: "pine" | "maple" }[];
  props: Prop[];
  npcs: Npc[];
  billboards: BoardSlot[];
  spawn: { x: number; y: number };
}

/** Maps where other people may be seen. Home is never one of them. Calm and help are not maps. */
export const PUBLIC_MAPS = new Set([
  "town", "grocery", "plants", "homestore", "hobby", "clothes", "cafe", "library", "centre", "shelter",
  "club", "bank", "farm", "gym",
]);

function create(id: string, name: string, w: number, h: number, fill: number): WorldMap {
  const ground = new Uint8Array(w * h);
  ground.fill(fill);
  return {
    id, name, w, h, ground, solid: new Uint8Array(w * h),
    spots: [], buildings: [], trees: [], props: [], npcs: [], billboards: [], spawn: { x: 2.5, y: 2.5 },
  };
}

function setTile(m: WorldMap, x: number, y: number, g: number, solid: boolean) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = y * m.w + x;
  m.ground[i] = g;
  m.solid[i] = solid ? 1 : 0;
}

function fillRect(m: WorldMap, x: number, y: number, w: number, h: number, g: number, solid: boolean) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setTile(m, xx, yy, g, solid);
}

function vpath(m: WorldMap, x: number, y0: number, y1: number) {
  const a = Math.min(y0, y1);
  const b = Math.max(y0, y1);
  for (let y = a; y <= b; y++) setTile(m, x, y, GROUND.path, false);
}

function tree(m: WorldMap, x: number, y: number, kind: "pine" | "maple") {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = y * m.w + x;
  if (m.ground[i] !== GROUND.grass || m.solid[i]) return;
  m.solid[i] = 1;
  m.trees.push({ x, y, kind });
}

function walls(m: WorldMap) {
  for (let x = 0; x < m.w; x++) {
    setTile(m, x, 0, GROUND.stone, true);
    setTile(m, x, m.h - 1, GROUND.stone, true);
  }
  for (let y = 0; y < m.h; y++) {
    setTile(m, 0, y, GROUND.stone, true);
    setTile(m, m.w - 1, y, GROUND.stone, true);
  }
}

interface DoorSpot {
  mapId: string;
  placeId?: string;
  jobId?: string;
  label: string;
  sign: string;
  roof: string;
  wall: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorY: number;
}

function buildRoom(opts: {
  id: string;
  name: string;
  placeId?: string;
  jobId?: string;
  clerk?: Npc;
  exit: { x: number; y: number };
}): WorldMap {
  const m = create(opts.id, opts.name, 12, 10, GROUND.plank);
  walls(m);
  setTile(m, 6, 9, GROUND.plank, false);
  fillRect(m, 3, 2, 6, 1, GROUND.stone, true);
  m.props.push({ kind: "counter", x: 3, y: 2 }, { kind: "door", x: 6, y: 9 });
  if (opts.clerk) m.npcs.push(opts.clerk);
  m.spots.push({
    id: opts.placeId ?? opts.jobId ?? opts.id,
    x: 5,
    y: 3,
    label: opts.name,
    aria: opts.name,
    kind: "place",
    placeId: opts.placeId,
    jobId: opts.jobId,
  });
  m.spots.push({
    id: "out",
    x: 6,
    y: 8,
    label: "Door",
    aria: "Door: step back outside",
    kind: "exit",
    to: "town",
    tx: opts.exit.x,
    ty: opts.exit.y,
  });
  m.spawn = { x: 6.5, y: 7.5 };
  return m;
}

function buildHome(): WorldMap {
  const m = create("home", "Your home", 16, 13, GROUND.floor);
  walls(m);
  setTile(m, 8, 12, GROUND.plank, false);
  fillRect(m, 5, 7, 6, 3, GROUND.rug, false);
  m.spawn = { x: 8.5, y: 8.8 };
  m.props.push(
    { kind: "bed", x: 2, y: 2 },
    { kind: "desk", x: 5, y: 2 },
    { kind: "bath", x: 10, y: 2 },
    { kind: "cushion", x: 13, y: 4 },
    { kind: "kitchen", x: 2, y: 6 },
    { kind: "couch", x: 8, y: 6 },
    { kind: "window", x: 7, y: 0 },
    { kind: "door", x: 8, y: 12 },
  );
  m.spots.push(
    { id: "bed", x: 2, y: 3, label: "Bed", aria: "Bed: nap or go to sleep", kind: "home", actions: ["nap", "@sleep"] },
    { id: "desk", x: 5, y: 3, label: "Desk", aria: "Desk and notebook: write in your notebook", kind: "home", actions: ["journal"] },
    { id: "bath", x: 10, y: 3, label: "Bathroom", aria: "Bathroom: have a shower or tidy up", kind: "home", actions: ["shower", "tidy"] },
    { id: "cushion", x: 13, y: 5, label: "Calm corner", aria: "Calm corner: breathe or ground yourself", kind: "home", actions: ["breathe", "ground"] },
    { id: "kitchen", x: 3, y: 7, label: "Kitchen", aria: "Kitchen: cook or order takeout", kind: "home", actions: ["cook", "takeout", "@feed"] },
    { id: "couch", x: 8, y: 8, label: "Couch", aria: "Couch: watch something, call a friend, hobbies and your pet", kind: "home", actions: ["tv", "call_friend", "pet_time", "read", "guitar", "paint", "radio", "water_plants"] },
    { id: "door", x: 8, y: 11, label: "Door", aria: "Door: go into town", kind: "exit", to: "town", tx: 4.5, ty: 18.5 },
  );
  return m;
}

function pave(m: WorldMap, x: number, y: number) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = y * m.w + x;
  if (m.ground[i] === GROUND.water) return;
  if (m.solid[i] && m.ground[i] === GROUND.stone) return;
  setTile(m, x, y, GROUND.path, false);
  m.trees = m.trees.filter((t) => !(t.x === x && t.y === y));
}

/** One board on the shoulder of every few road tiles, so every street is lined. */
export function boardsBesideRoads(map: WorldMap): BoardSlot[] {
  const slots: BoardSlot[] = [];
  const used = new Set<string>();
  const open = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    const i = y * map.w + x;
    if (map.solid[i]) return false;
    const g = map.ground[i];
    return g !== GROUND.path && g !== GROUND.water && g !== GROUND.floor && g !== GROUND.plank && g !== GROUND.rug;
  };
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (map.ground[y * map.w + x] !== GROUND.path) continue;
      if ((x + y * 2) % 4 !== 0) continue;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const sx = x + dx;
        const sy = y + dy;
        const key = `${sx},${sy}`;
        if (!open(sx, sy) || used.has(key)) continue;
        used.add(key);
        slots.push({ id: `board-${sx}-${sy}`, x: sx, y: sy });
        break;
      }
    }
  }
  return slots;
}

function buildTown(): WorldMap {
  const m = create("town", "Cedar Bay", 46, 34, GROUND.grass);
  fillRect(m, 0, 0, m.w, 4, GROUND.water, true);
  fillRect(m, 0, 4, m.w, 1, GROUND.sand, false);
  for (let x = 1; x < m.w - 1; x++) {
    setTile(m, x, 16, GROUND.path, false);
    setTile(m, x, 17, GROUND.path, false);
  }
  // A short dock you can actually walk on.
  for (const y of [1, 2, 3]) setTile(m, 6, y, GROUND.plank, false);
  setTile(m, 6, 4, GROUND.plank, false);
  m.props.push({ kind: "canoe", x: 12, y: 2 }, { kind: "loon", x: 20, y: 1 }, { kind: "bench", x: 34, y: 10 }, { kind: "bus", x: 36, y: 16 });

  const buildings: DoorSpot[] = [
    { mapId: "grocery", placeId: "grocery", label: "Grocery store", sign: "Grocery", roof: "#c84b3a", wall: "#f7f1e6", x: 1, y: 9, w: 5, h: 5, doorX: 3, doorY: 14 },
    { mapId: "plants", placeId: "plants", label: "Plant shop", sign: "Plants", roof: "#2f6d4f", wall: "#f7f1e6", x: 7, y: 9, w: 4, h: 5, doorX: 8, doorY: 14 },
    { mapId: "homestore", placeId: "homestore", label: "Home store", sign: "Home", roof: "#3d6e99", wall: "#f4efe4", x: 12, y: 8, w: 5, h: 6, doorX: 14, doorY: 14 },
    { mapId: "hobby", placeId: "hobby", label: "Hobby shop", sign: "Hobby", roof: "#c47b2b", wall: "#f7f1e6", x: 18, y: 9, w: 4, h: 5, doorX: 19, doorY: 14 },
    { mapId: "clothes", placeId: "clothes", label: "Clothing store", sign: "Clothes", roof: "#7a4e86", wall: "#f7f1e6", x: 23, y: 9, w: 4, h: 5, doorX: 24, doorY: 14 },
    { mapId: "cafe", placeId: "work", jobId: "cafe", label: "The Kettle", sign: "Kettle", roof: "#8c3b32", wall: "#f3e2cf", x: 9, y: 19, w: 5, h: 5, doorX: 11, doorY: 18 },
    { mapId: "library", placeId: "work", jobId: "library", label: "Public library", sign: "Library", roof: "#2c4f73", wall: "#f7f1e6", x: 15, y: 19, w: 5, h: 5, doorX: 17, doorY: 18 },
    { mapId: "centre", placeId: "centre", label: "Community centre", sign: "Centre", roof: "#b4532a", wall: "#fff8ee", x: 21, y: 19, w: 6, h: 5, doorX: 23, doorY: 18 },
    { mapId: "shelter", placeId: "shelter", label: "Animal shelter", sign: "Shelter", roof: "#6b4a32", wall: "#f7f1e6", x: 28, y: 19, w: 5, h: 5, doorX: 30, doorY: 18 },
  ];

  // The cottage sits on the south-west corner. Its door is the way home.
  const home: DoorSpot = { mapId: "home", label: "Your home", sign: "Home", roof: "#9c3b32", wall: "#f4e7d4", x: 1, y: 19, w: 7, h: 5, doorX: 4, doorY: 18 };
  for (const b of [home, ...buildings]) {
    fillRect(m, b.x, b.y, b.w, b.h, GROUND.stone, true);
    m.buildings.push({ id: b.mapId, x: b.x, y: b.y, w: b.w, h: b.h, roof: b.roof, wall: b.wall, sign: b.sign });
    setTile(m, b.doorX, b.doorY, GROUND.path, false);
    vpath(m, b.doorX, b.doorY, b.doorY < b.y ? 16 : 17);
  }

  m.spots.push({
    id: "enter-home", x: home.doorX, y: home.doorY, label: "Your home", aria: "Your home: go inside",
    kind: "enter", to: "home", tx: 8.5, ty: 10.5,
  });
  for (const b of buildings) {
    m.spots.push({
      id: `enter-${b.mapId}`, x: b.doorX, y: b.doorY, label: b.label, aria: `${b.label}: go inside`,
      kind: "enter", to: b.mapId, placeId: b.placeId, tx: 6.5, ty: 7.5,
    });
  }

  fillRect(m, 34, 20, 4, 3, GROUND.soil, false);
  vpath(m, 35, 21, 17);
  m.spots.push({
    id: "garden", x: 35, y: 21, label: "Community garden", aria: "Community garden: a gentle shift",
    kind: "place", placeId: "work", jobId: "garden",
  });
  vpath(m, 34, 10, 16);
  m.spots.push({
    id: "park", x: 34, y: 10, label: "The park", aria: "The park: take a walk",
    kind: "place", placeId: "park",
  });
  m.spots.push({
    id: "travel", x: 36, y: 16, label: "The bus stop", aria: "Bus stop: a trip to another province",
    kind: "place", placeId: "travel",
  });

  m.npcs.push(
    { id: "renee", name: "Renée", x: 8.4, y: 16.7, skin: 2, hair: 4, style: 1, shirt: 0, line: "The lake is looking kind today. No rush if you just want to stand here." },
    { id: "omar", name: "Omar", x: 26.4, y: 17.6, skin: 4, hair: 0, style: 0, shirt: 1, line: "I like this street in the evening. The windows go warm, and you can take your time." },
  );
  m.spots.push(
    { id: "renee", x: 8, y: 16, label: "Renée", aria: "Renée: say hello", kind: "flavor", line: m.npcs[0].line },
    { id: "omar", x: 26, y: 17, label: "Omar", aria: "Omar: say hello", kind: "flavor", line: m.npcs[1].line },
  );

  const south: DoorSpot[] = [
    { mapId: "club", placeId: "club", label: "Lakeside club", sign: "Club", roof: "#6b3d6e", wall: "#f7f1e6", x: 10, y: 27, w: 5, h: 4, doorX: 12, doorY: 26 },
    { mapId: "bank", placeId: "bank", label: "Credit union", sign: "Union", roof: "#1e4d3a", wall: "#f4efe4", x: 18, y: 27, w: 5, h: 4, doorX: 20, doorY: 26 },
    { mapId: "farm", placeId: "farm", label: "Bay farm", sign: "Farm", roof: "#8a5a2b", wall: "#f3e6c8", x: 26, y: 27, w: 6, h: 4, doorX: 28, doorY: 26 },
    { mapId: "gym", placeId: "gym", label: "The gym", sign: "Gym", roof: "#2a6f8f", wall: "#f7f1e6", x: 34, y: 27, w: 5, h: 4, doorX: 36, doorY: 26 },
  ];
  for (const b of south) {
    fillRect(m, b.x, b.y, b.w, b.h, GROUND.stone, true);
    m.buildings.push({ id: b.mapId, x: b.x, y: b.y, w: b.w, h: b.h, roof: b.roof, wall: b.wall, sign: b.sign });
    setTile(m, b.doorX, b.doorY, GROUND.path, false);
    m.spots.push({
      id: `enter-${b.mapId}`, x: b.doorX, y: b.doorY, label: b.label, aria: `${b.label}: go inside`,
      kind: "enter", to: b.mapId, placeId: b.placeId, tx: 6.5, ty: 7.5,
    });
  }

  const pines: [number, number][] = [[2, 6], [4, 7], [9, 6], [15, 6], [22, 6], [28, 6], [32, 8], [36, 8], [38, 12], [37, 13], [33, 12], [42, 8], [43, 12], [2, 31], [6, 31], [42, 30], [44, 22]];
  const maples: [number, number][] = [[11, 7], [17, 6], [30, 7], [36, 11], [5, 24], [40, 14], [14, 31], [24, 32]];
  for (const [x, y] of pines) tree(m, x, y, "pine");
  for (const [x, y] of maples) tree(m, x, y, "maple");

  for (let x = 8; x <= 42; x++) pave(m, x, 26);
  for (let y = 18; y <= 26; y++) pave(m, 8, y);

  m.billboards = boardsBesideRoads(m);
  m.spawn = { x: 4.5, y: 18.5 };
  return m;
}

const town = buildTown();

function exitFor(mapId: string) {
  const spot = town.spots.find((s) => s.to === mapId);
  return { x: (spot?.x ?? 4) + 0.5, y: (spot?.y ?? 18) + 0.5 };
}

const clerks: Record<string, Npc> = {
  grocery: { id: "clerk-g", name: "Priya", x: 5.5, y: 1.7, skin: 3, hair: 1, style: 2, shirt: 3, line: "Groceries are the same price every day." },
  plants: { id: "clerk-p", name: "Jules", x: 5.5, y: 1.7, skin: 1, hair: 5, style: 3, shirt: 2 },
  homestore: { id: "clerk-h", name: "Ned", x: 5.5, y: 1.7, skin: 2, hair: 2, style: 0, shirt: 4 },
  hobby: { id: "clerk-y", name: "Asha", x: 5.5, y: 1.7, skin: 5, hair: 0, style: 1, shirt: 5 },
  clothes: { id: "clerk-c", name: "Leah", x: 5.5, y: 1.7, skin: 0, hair: 3, style: 1, shirt: 0 },
  cafe: { id: "clerk-cafe", name: "Sam", x: 5.5, y: 1.7, skin: 1, hair: 1, style: 0, shirt: 1 },
  library: { id: "dev", name: "Dev", x: 5.5, y: 1.7, skin: 3, hair: 0, style: 0, shirt: 4, line: "Dev is shelving quietly. You can say hello from the counter." },
  centre: { id: "maya", name: "Maya", x: 5.5, y: 1.7, skin: 2, hair: 4, style: 1, shirt: 2, line: "Maya looks up and smiles, like she has all the time in the world." },
  shelter: { id: "clerk-s", name: "Robin", x: 5.5, y: 1.7, skin: 4, hair: 2, style: 2, shirt: 3 },
  club: { id: "clerk-club", name: "Noor", x: 5.5, y: 1.7, skin: 5, hair: 4, style: 1, shirt: 5, line: "Pull up a chair. You don't have to talk." },
  bank: { id: "clerk-bank", name: "Helen", x: 5.5, y: 1.7, skin: 1, hair: 2, style: 2, shirt: 1, line: "This window only shows game dollars. Nothing here is a real account." },
  farm: { id: "clerk-farm", name: "Gus", x: 5.5, y: 1.7, skin: 2, hair: 0, style: 0, shirt: 2, line: "The rows are open. Walk as far as you feel like." },
  gym: { id: "clerk-gym", name: "Sasha", x: 5.5, y: 1.7, skin: 3, hair: 1, style: 0, shirt: 4, line: "A little movement is enough. You can stop whenever you like." },
};

const rooms: WorldMap[] = [
  buildRoom({ id: "grocery", name: "Grocery store", placeId: "grocery", clerk: clerks.grocery, exit: exitFor("grocery") }),
  buildRoom({ id: "plants", name: "Plant shop", placeId: "plants", clerk: clerks.plants, exit: exitFor("plants") }),
  buildRoom({ id: "homestore", name: "Home store", placeId: "homestore", clerk: clerks.homestore, exit: exitFor("homestore") }),
  buildRoom({ id: "hobby", name: "Hobby shop", placeId: "hobby", clerk: clerks.hobby, exit: exitFor("hobby") }),
  buildRoom({ id: "clothes", name: "Clothing store", placeId: "clothes", clerk: clerks.clothes, exit: exitFor("clothes") }),
  buildRoom({ id: "cafe", name: "The Kettle", placeId: "work", jobId: "cafe", clerk: clerks.cafe, exit: exitFor("cafe") }),
  buildRoom({ id: "library", name: "Public library", placeId: "work", jobId: "library", clerk: clerks.library, exit: exitFor("library") }),
  buildRoom({ id: "centre", name: "Community centre", placeId: "centre", clerk: clerks.centre, exit: exitFor("centre") }),
  buildRoom({ id: "shelter", name: "Animal shelter", placeId: "shelter", clerk: clerks.shelter, exit: exitFor("shelter") }),
  buildRoom({ id: "club", name: "Lakeside club", placeId: "club", clerk: clerks.club, exit: exitFor("club") }),
  buildRoom({ id: "bank", name: "Credit union", placeId: "bank", clerk: clerks.bank, exit: exitFor("bank") }),
  buildRoom({ id: "farm", name: "Bay farm", placeId: "farm", clerk: clerks.farm, exit: exitFor("farm") }),
  buildRoom({ id: "gym", name: "The gym", placeId: "gym", clerk: clerks.gym, exit: exitFor("gym") }),
];

const MAPS: Record<string, WorldMap> = {
  town,
  home: buildHome(),
};
for (const room of rooms) MAPS[room.id] = room;

export const TOWN = town;
export const HOME = MAPS.home;
export function mapById(id: string): WorldMap {
  return MAPS[id] ?? HOME;
}
export function allMaps(): WorldMap[] {
  return Object.values(MAPS);
}

/** Every town place from the sim has a door or a spot you can walk to. */
export function placesOnFoot(): { id: string; label: string }[] {
  const ids = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const s of town.spots) {
    const id = s.jobId ?? s.placeId ?? s.to ?? s.id;
    if (ids.has(id)) continue;
    ids.add(id);
    out.push({ id, label: s.label });
  }
  return out;
}

export const JOB_IDS = JOBS.map((j) => j.id);
export const PLACE_IDS = PLACES.map((p) => p.id);

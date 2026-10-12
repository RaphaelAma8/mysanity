"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Hud } from "@/components/Hud";
import { PlaceBody } from "@/components/PlaceBody";
import { ResultNote } from "@/components/Result";
import { PeoplePanel } from "@/components/world/PeoplePanel";
import { useHaven } from "@/components/HavenProvider";
import { cloudFetch, loadCloud } from "@/lib/cloud/session";
import { run } from "@/lib/game";
import { actionById, itemById } from "@/lib/sim/data";
import { availability, feedPet, perform, sleep, visit, weatherFor } from "@/lib/sim/engine";
import { isRough } from "@/lib/sim/look";
import { BLOCKS_PER_DAY, LITTLE_WINS, NEED_META, type NeedKey, type Result } from "@/lib/sim/types";
import { assignBoards, type ApprovedAd } from "@/lib/ads/moderate";
import { EMOTES } from "@/lib/social/presets";
import { drawWorld, type Actor } from "@/lib/world/draw";
import { HOME, PUBLIC_MAPS, TILE_PX, TOWN, mapById, type Spot } from "@/lib/world/maps";
import { cameraFor, findPath, nearestSpot, tryMove } from "@/lib/world/move";
import { DEFAULT_AVATAR } from "@/lib/state";

type Sheet =
  | { type: "home"; spot: Spot }
  | { type: "place"; placeId: string; jobId?: string; title: string }
  | { type: "map" }
  | null;

const PAGE: Record<string, string> = { breathe: "/breathe", ground: "/ground", journal: "/journal" };

function chips(id: string) {
  const a = actionById(id);
  if (!a) return "";
  const out = Object.entries(a.effects).map(([k, v]) => `${(v ?? 0) > 0 ? "+" : "−"}${Math.abs(v ?? 0)} ${NEED_META[k as NeedKey].label}`);
  if (a.cost) out.push(`$${a.cost}`);
  return out.join("  ·  ");
}

export function LifeGame() {
  const { state, openHelp, helpOpen } = useHaven();
  const router = useRouter();
  const sim = state.sim;
  const region = state.region ?? "on";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ ...HOME.spawn });
  const path = useRef<{ x: number; y: number }[] | null>(null);
  const keys = useRef(new Set<string>());
  const joy = useRef({ x: 0, y: 0 });
  const facing = useRef<1 | -1>(1);
  const moving = useRef(false);
  const cam = useRef({ x: 0, y: 0 });
  const nearId = useRef<string | null>(null);
  const sheetRef = useRef<Sheet>(null);
  const activateRef = useRef<(spot: Spot) => void>(() => {});
  const [mapId, setMapId] = useState("home");
  const [near, setNear] = useState<Spot | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [people, setPeople] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const [emote, setEmote] = useState<string | null>(null);
  const [others, setOthers] = useState<Actor[]>([]);
  const shown = useRef<Map<string, Actor>>(new Map());
  const [ads, setAds] = useState<ApprovedAd[]>([]);
  const [homeNote, setHomeNote] = useState<Result | null>(null);
  const map = mapById(mapId);

  useEffect(() => {
    if (!emote) return;
    const t = setTimeout(() => setEmote(null), 6000);
    return () => clearTimeout(t);
  }, [emote]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      keys.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "e" && tag !== "BUTTON" && tag !== "A") {
        const spot = nearestSpot(mapById(mapId).spots, pos.current.x, pos.current.y, 0.95);
        if (spot) activateRef.current(spot);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [mapId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sim) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const world = mapById(mapId);
      const quiet = document.documentElement.classList.contains("quiet");
      let ix = 0;
      let iy = 0;
      if (keys.current.has("arrowleft") || keys.current.has("a")) ix -= 1;
      if (keys.current.has("arrowright") || keys.current.has("d")) ix += 1;
      if (keys.current.has("arrowup") || keys.current.has("w")) iy -= 1;
      if (keys.current.has("arrowdown") || keys.current.has("s")) iy += 1;
      if (Math.hypot(joy.current.x, joy.current.y) > 0.2) { ix = joy.current.x; iy = joy.current.y; }
      const pushing = Math.hypot(ix, iy) > 0.12;
      if (pushing) {
        path.current = null;
        const len = Math.hypot(ix, iy) || 1;
        const step = 3.15 * dt;
        pos.current = tryMove(world, pos.current.x, pos.current.y, (ix / len) * step, (iy / len) * step);
        if (Math.abs(ix) > 0.2) facing.current = ix < 0 ? -1 : 1;
      } else if (path.current && path.current.length > 0) {
        const target = path.current[0];
        const tx = target.x + 0.5;
        const ty = target.y + 0.5;
        const dx = tx - pos.current.x;
        const dy = ty - pos.current.y;
        const dist = Math.hypot(dx, dy);
        const step = 3.15 * dt;
        if (dist <= step) {
          pos.current = { x: tx, y: ty };
          path.current.shift();
        } else {
          pos.current = tryMove(world, pos.current.x, pos.current.y, (dx / dist) * step, (dy / dist) * step);
          if (Math.abs(dx) > 0.05) facing.current = dx < 0 ? -1 : 1;
        }
      }
      moving.current = pushing || (path.current?.length ?? 0) > 0;
      const spot = nearestSpot(world.spots, pos.current.x, pos.current.y, 0.95);
      const id = spot?.id ?? null;
      if (id !== nearId.current) { nearId.current = id; setNear(spot); }

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cam.current = cameraFor(world.w * TILE_PX, world.h * TILE_PX, pos.current.x * TILE_PX, pos.current.y * TILE_PX, w, h);
      const font = getComputedStyle(document.body).fontFamily || "sans-serif";
      drawWorld(ctx, {
        map: world, cam: cam.current, viewW: w, viewH: h,
        player: { ...pos.current, avatar: sim.avatar, facing: facing.current, moving: moving.current && !quiet, emote: EMOTES.find((item) => item.id === emote)?.emoji ?? null, self: true, name: state.nickname || undefined },
        others: glideOthers(shown.current, others, dt, quiet), sim, weather: weatherFor(sim, region), time: now / 1000, quiet, font,
        signs: helpOpen || mapId !== "town" ? [] : townSigns(TOWN.billboards, ads),
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mapId, sim, region, emote, others, state.nickname, helpOpen, ads]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const live = loadCloud();
      if (stop) return;
      if (!live?.share || !PUBLIC_MAPS.has(mapId)) { setOthers([]); return; }
      await cloudFetch("/api/presence", live.token, {
        method: "POST",
        body: JSON.stringify({ map: mapId, x: pos.current.x, y: pos.current.y, emote }),
      });
      const got = await cloudFetch(`/api/presence?map=${encodeURIComponent(mapId)}`, live.token);
      if (stop || !Array.isArray(got.data.people)) return;
      const peopleHere = (got.data.people as { id?: string; name: string; x: number; y: number; emote?: string; avatar?: unknown }[]).map((p) => ({
        id: p.id, x: p.x, y: p.y, name: p.name, emote: p.emote, facing: 1 as const, moving: false, avatar: avatarOf(p.avatar),
      }));
      setOthers((prev) => JSON.stringify(prev) === JSON.stringify(peopleHere) ? prev : peopleHere);
    };
    void tick();
    const id = setInterval(() => void tick(), 1500);
    return () => { stop = true; clearInterval(id); };
  }, [mapId, emote]);

  useEffect(() => {
    if (mapId !== "town") return;
    let stop = false;
    void fetch("/api/ads").then((r) => r.json()).then((data: { ads?: ApprovedAd[] }) => {
      if (!stop && Array.isArray(data.ads)) setAds(data.ads);
    }).catch(() => undefined);
    return () => { stop = true; };
  }, [mapId]);

  useEffect(() => {
    const session = loadCloud();
    if (!session?.share || !sim) return;
    const t = setTimeout(() => {
      void cloudFetch("/api/save", session.token, { method: "PUT", body: JSON.stringify({ sim, region }) });
    }, 1200);
    return () => clearTimeout(t);
  }, [sim, region]);

  useEffect(() => {
    sheetRef.current = sheet;
    activateRef.current = activate;
  });

  if (!sim) return null;
  const late = sim.block >= BLOCKS_PER_DAY;
  const rough = isRough(sim);
  const owned = sim.inventory.map((id) => itemById(id)?.name).filter(Boolean);

  function jump(id: string, x: number, y: number) {
    pos.current = { x, y };
    path.current = null;
    nearId.current = null;
    setNear(null);
    setMapId(id);
  }

  function activate(spot: Spot) {
    if (!sim) return;
    if (spot.kind === "flavor") {
      setRes({ sim, ok: true, message: spot.line ?? `${spot.label} is glad you stopped.` });
      return;
    }
    if (spot.kind === "exit" && spot.to) {
      jump(spot.to, spot.tx ?? TOWN.spawn.x, spot.ty ?? TOWN.spawn.y);
      setSheet(null);
      return;
    }
    if (spot.kind === "enter" && spot.to) {
      if (spot.placeId && spot.placeId !== "work") {
        const r = run((s) => visit(s, spot.placeId!));
        if (r && !r.ok) { setRes(r); return; }
        if (r?.message) setRes(r);
      }
      jump(spot.to, spot.tx ?? 6.5, spot.ty ?? 7.5);
      if (spot.placeId) setSheet({ type: "place", placeId: spot.placeId, jobId: spot.jobId, title: spot.label });
      else setSheet(null);
      return;
    }
    if (spot.kind === "home") { setSheet({ type: "home", spot }); return; }
    if (spot.kind === "place" && spot.placeId) {
      if (spot.placeId !== "work" && spot.placeId !== "travel") {
        const r = run((s) => visit(s, spot.placeId!));
        if (r && !r.ok) { setRes(r); return; }
        if (r?.message) setRes(r);
      }
      setSheet({ type: "place", placeId: spot.placeId, jobId: spot.jobId, title: spot.label });
    }
  }

  function walkTo(spot: Spot) {
    let x = pos.current.x;
    let y = pos.current.y;
    if (mapId !== "town") {
      const door = map.spots.find((s) => s.kind === "exit");
      x = door?.tx ?? TOWN.spawn.x;
      y = door?.ty ?? TOWN.spawn.y;
      pos.current = { x, y };
      setMapId("town");
    }
    path.current = findPath(TOWN, x, y, spot.x + 0.5, spot.y + 0.5);
    setSheet(null);
  }

  function onCanvasDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (sheetRef.current || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - rect.left + cam.current.x) / TILE_PX;
    const wy = (e.clientY - rect.top + cam.current.y) / TILE_PX;
    path.current = findPath(map, pos.current.x, pos.current.y, wx, wy);
  }

  async function goToBed() {
    setSleeping(true);
    setSheet(null);
    const quiet = document.documentElement.classList.contains("quiet");
    await new Promise((r) => setTimeout(r, quiet ? 0 : 900));
    setRes(run((s) => sleep(s)));
    setSleeping(false);
  }

  function homeAction(id: string) {
    if (!sim) return;
    if (id === "@sleep") { void goToBed(); return; }
    if (id === "@feed") { const r = run((s) => feedPet(s)); if (r) { setHomeNote(r); setRes(r); } return; }
    if (PAGE[id]) {
      const av = availability(sim, id);
      if (!av.ok) { setHomeNote({ sim, ok: false, message: av.reason ?? "Not right now." }); return; }
      router.push(PAGE[id]);
      return;
    }
    const r = run((s) => perform(s, id, region));
    if (r) { setHomeNote(r); setRes(r); if (r.ok) setSheet(null); }
  }

  const townSpots = TOWN.spots.filter((s) => s.kind === "enter" || s.kind === "place");

  return (
    <div className="game-root fixed inset-0 z-20 bg-[#8ec8ea] text-ink">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Your town" role="img" onPointerDown={onCanvasDown} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-12">
        <div className="pointer-events-auto rounded-2xl bg-surface/92 px-3 py-2 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-display text-base font-semibold leading-none">{map.name}</p>
            <div className="flex gap-1.5">
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setSheet({ type: "map" })}>Map</button>
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setPeople(true)}>People</button>
            </div>
          </div>
          <Hud sim={sim} weather={weatherFor(sim, region)} />
          <ul className="flex gap-1 overflow-x-auto" aria-label="Small things today, only if you want">
            {LITTLE_WINS.map((w) => (
              <li key={w.id} className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${sim.littleWins.includes(w.id) ? "bg-aurora/15 text-ink" : "bg-surface-2 text-muted"}`}>{w.icon} {w.label}</li>
            ))}
          </ul>
          {others.length > 0 && <p className="mt-1 text-xs">{others.length === 1 ? "1 person is here with you." : `${others.length} people are here with you.`}</p>}
          {late && <p className="mt-1 text-sm">The day is winding down. Time for bed.</p>}
          <p className="mt-1 text-[11px] text-muted">Tap the ground to walk. Game dollars have no real value and can&apos;t be bought.</p>
          {res && <ResultNote r={res} />}
          {mapId === "home" && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto" aria-label="At home">
              {HOME.spots.map((s) => (
                <button key={s.id} aria-label={s.aria} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold ring-1 ring-line" onClick={() => activate(s)}>{s.label}</button>
              ))}
            </div>
          )}
          {mapId === "home" && owned.length > 0 && <p className="mt-1 truncate text-xs text-muted">At home: {owned.join(", ")}</p>}
        </div>
        {rough && (
          <div role="note" className="pointer-events-auto mt-2 rounded-2xl border border-softred/50 bg-surface p-3 shadow">
            <p className="font-semibold">It&apos;s a rough stretch. That&apos;s okay.</p>
            <p className="text-sm text-muted">One small thing is enough. If it feels like too much, support is a tap away.</p>
            <button className="btn ghost mt-2" onClick={openHelp}>See support options</button>
          </div>
        )}
      </div>

      <Joystick onChange={(x, y) => { joy.current = { x, y }; }} />
      {near && !sheet && (
        <button className="btn absolute bottom-28 left-1/2 z-20 -translate-x-1/2 shadow-lg" onClick={() => activate(near)}>
          {near.kind === "enter" ? `Go in · ${near.label}` : near.kind === "exit" ? "Step outside" : near.label}
        </button>
      )}

      {sheet && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[72dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-28 shadow-2xl" role="dialog" aria-label={sheet.type === "home" ? sheet.spot.label : sheet.type === "place" ? sheet.title : "Map"}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">{sheet.type === "home" ? sheet.spot.label : sheet.type === "place" ? sheet.title : "Cedar Bay"}</h2>
            <button className="btn ghost" onClick={() => setSheet(null)}>Close</button>
          </div>
          {sheet.type === "map" && (
            <ul className="grid gap-2">
              {townSpots.map((s) => (
                <li key={s.id}><button className="act" onClick={() => walkTo(s)}><span aria-hidden>🚶</span><span><b>{s.label}</b><small>Walk there. You can change your mind on the way.</small></span></button></li>
              ))}
            </ul>
          )}
          {sheet.type === "place" && <PlaceBody placeId={sheet.placeId} onlyJob={sheet.jobId} sim={sim} region={region} />}
          {sheet.type === "home" && (
            <div>
              <ResultNote r={homeNote} />
              <ul className="grid gap-2">
                {sheet.spot.actions?.map((id) => {
                  if (id === "@sleep") return <li key={id}><button className="act" onClick={() => homeAction(id)}><span aria-hidden>🌙</span><span><b>Go to bed for the night</b><small>Start a new day. Energy is fully restored.</small></span></button></li>;
                  if (id === "@feed") return <li key={id}><button className="act" disabled={!sim.pet} onClick={() => homeAction(id)}><span aria-hidden>🐟</span><span><b>Feed your cat</b><small>{sim.pet ? "A small treat. Free, no time needed." : "You don't have a cat yet."}</small></span></button></li>;
                  const a = actionById(id);
                  if (!a) return null;
                  const av = availability(sim, id);
                  return (
                    <li key={id}>
                      <button className="act" disabled={!av.ok} onClick={() => homeAction(id)}>
                        <span aria-hidden>{a.icon}</span>
                        <span><b>{a.label}</b><small>{av.ok ? chips(id) + (PAGE[id] ? "  ·  opens an exercise" : "") : av.reason}</small></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <PeoplePanel open={people} onClose={() => setPeople(false)} region={region} nickname={state.nickname} avatar={sim.avatar} sim={sim} />

      <div className="pointer-events-none absolute bottom-32 left-3 z-20 flex flex-col gap-1">
        {EMOTES.map((e) => (
          <button key={e.id} className="pointer-events-auto h-10 w-10 rounded-full bg-surface text-lg shadow ring-1 ring-line" aria-label={e.label} aria-pressed={emote === e.id} onClick={() => setEmote(e.id)}>{e.emoji}</button>
        ))}
      </div>

      {sleeping && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#142033]/80 text-white">
          <p className="font-display text-4xl">Good night</p>
        </div>
      )}
    </div>
  );
}

function glideOthers(shown: Map<string, Actor>, targets: Actor[], dt: number, quiet: boolean) {
  const live = new Set<string>();
  const out: Actor[] = [];
  for (const person of targets) {
    const key = person.id ?? person.name ?? `${person.x},${person.y}`;
    live.add(key);
    const prev = shown.get(key);
    const start = prev ?? { ...person, y: person.y + 0.85, moving: true };
    const step = quiet ? 1 : Math.min(1, dt * 3.2);
    const x = start.x + (person.x - start.x) * step;
    const y = start.y + (person.y - start.y) * step;
    const actor: Actor = {
      ...person,
      x, y,
      facing: person.x < x - 0.02 ? -1 : person.x > x + 0.02 ? 1 : start.facing,
      moving: Math.hypot(person.x - x, person.y - y) > 0.04,
    };
    shown.set(key, actor);
    out.push(actor);
  }
  for (const key of shown.keys()) if (!live.has(key)) shown.delete(key);
  return out;
}

function townSigns(slots: { id: string; x: number; y: number }[], ads: ApprovedAd[]) {
  return assignBoards(slots, ads).map((board) => ({
    x: board.x,
    y: board.y,
    name: board.ad?.businessName ?? "Open board",
    line: board.ad?.line ?? "Your business",
    accent: board.ad?.accent ?? "#8a6a3a",
  }));
}

function avatarOf(value: unknown) {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR;
  const o = value as Record<string, unknown>;
  const n = (v: unknown, d: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : d);
  return { skin: n(o.skin, 1, 5), hair: n(o.hair, 1, 5), style: n(o.style, 0, 3), shirt: n(o.shirt, 1, 5) };
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const max = r.width / 2 - 18;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, mag);
    dx = (dx / mag) * clamped;
    dy = (dy / mag) * clamped;
    setKnob({ x: dx, y: dy });
    onChange(dx / max, dy / max);
  };
  const end = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId) return;
    id.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };
  return (
    <div
      ref={ref}
      className="absolute bottom-4 left-3 z-20 h-24 w-24 touch-none rounded-full bg-white/80 shadow-lg ring-1 ring-black/10"
      aria-label="Move"
      role="group"
      onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-[#e7a322]" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

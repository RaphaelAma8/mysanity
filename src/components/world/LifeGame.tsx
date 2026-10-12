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
import { REGIONS } from "@/data/regions";
import { actionById, carById, homeById, itemById } from "@/lib/sim/data";
import { availability, entertain, feedPet, moveHome, perform, placeItem, sleep, visit, weatherFor } from "@/lib/sim/engine";
import { isRough } from "@/lib/sim/look";
import { BLOCKS_PER_DAY, LITTLE_WINS, NEED_META, type NeedKey, type Result } from "@/lib/sim/types";
import { assignBoards, type ApprovedAd } from "@/lib/ads/moderate";
import { EMOTES, KIND_PRESETS } from "@/lib/social/presets";
import type { Actor } from "@/lib/world/draw";
import { GROUND, HOME, PUBLIC_MAPS, TOWN, mapById, type Spot } from "@/lib/world/maps";
import { findPath, nearestSpot, tryMove } from "@/lib/world/move";
import type { TownView } from "@/lib/world/view3d";
import { DEFAULT_AVATAR } from "@/lib/state";

type Sheet =
  | { type: "home"; spot: Spot }
  | { type: "place"; placeId: string; jobId?: string; title: string; homeId?: string }
  | { type: "map" }
  | { type: "arrange" }
  | { type: "phone" }
  | { type: "buy" }
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
  const driving = useRef(false);
  const [inCar, setInCar] = useState(false);
  const [boardsOn, setBoardsOn] = useState(true);
  const [around, setAround] = useState<number | null>(null);
  const [database, setDatabase] = useState(false);
  const [here, setHere] = useState({ x: HOME.spawn.x, y: HOME.spawn.y });
  const [hop, setHop] = useState<string | null>(null);
  const [phoneSeen, setPhoneSeen] = useState(0);
  const [mapTab, setMapTab] = useState<"districts" | "cities">("districts");
  const tileAt = useRef("");
  const moving = useRef(false);
  const nearId = useRef<string | null>(null);
  const viewRef = useRef<TownView | null>(null);
  const live = useRef({ sim, others: [] as Actor[], ads: [] as ApprovedAd[], emote: null as string | null, helpOpen, mapId: "home", region, nickname: state.nickname, boardsOn: true });
  useEffect(() => {
    live.current = { sim, others, ads, emote, helpOpen, mapId, region, nickname: state.nickname, boardsOn };
  });
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

  const playing = !!sim;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playing) return;
    let disposed = false;
    let view: TownView | null = null;
    let raf = 0;
    let last = performance.now();
    void import("@/lib/world/view3d").then(({ createTownView }) => {
      if (disposed || !canvas.isConnected) return;
      view = createTownView(canvas);
      viewRef.current = view;
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const liveNow = live.current;
        const current = liveNow.sim;
        if (!current) {
          raf = requestAnimationFrame(loop);
          return;
        }
        const world = mapById(liveNow.mapId);
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
          const step = pace(world, pos.current.x, pos.current.y, driving.current && liveNow.mapId === "town", carById(current.carId ?? "")?.speed ?? 2) * dt;
          pos.current = tryMove(world, pos.current.x, pos.current.y, (ix / len) * step, (iy / len) * step);
          if (Math.abs(ix) > 0.2) facing.current = ix < 0 ? -1 : 1;
        } else if (path.current && path.current.length > 0) {
          const target = path.current[0];
          const tx = target.x + 0.5;
          const ty = target.y + 0.5;
          const dx = tx - pos.current.x;
          const dy = ty - pos.current.y;
          const dist = Math.hypot(dx, dy);
          const step = pace(world, pos.current.x, pos.current.y, driving.current && liveNow.mapId === "town", carById(current.carId ?? "")?.speed ?? 2) * dt;
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
        const tileKey = `${liveNow.mapId}:${Math.floor(pos.current.x)}:${Math.floor(pos.current.y)}`;
        if (tileKey !== tileAt.current) {
          tileAt.current = tileKey;
          setHere({ x: pos.current.x, y: pos.current.y });
        }
        view?.frame({
          map: world,
          player: {
            ...pos.current,
            avatar: current.avatar,
            facing: facing.current,
            moving: moving.current && !quiet,
            emote: EMOTES.find((item) => item.id === liveNow.emote)?.emoji ?? null,
            self: true,
            name: liveNow.nickname || undefined,
          },
          others: glideOthers(shown.current, liveNow.others, dt, quiet),
          sim: current,
          signs: liveNow.helpOpen || liveNow.mapId !== "town" || !liveNow.boardsOn ? [] : townSigns(TOWN.billboards, liveNow.ads),
          quiet,
          time: now / 1000,
          weather: weatherFor(current, liveNow.region),
          driving: driving.current && liveNow.mapId === "town",
          carPaint: carById(current.carId ?? "")?.color,
        });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      view?.dispose();
      viewRef.current = null;
    };
  }, [playing]);

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
    let stop = false;
    const pullAds = () => {
      void fetch("/api/ads").then((r) => r.json()).then((data: { ads?: ApprovedAd[] }) => {
        if (!stop && Array.isArray(data.ads)) setAds(data.ads);
      }).catch(() => undefined);
    };
    const pullTown = () => {
      void fetch("/api/status").then((r) => r.json()).then((data: { database?: boolean; around?: number }) => {
        if (stop) return;
        setDatabase(data.database === true);
        setAround(typeof data.around === "number" ? data.around : 0);
      }).catch(() => undefined);
    };
    pullAds();
    pullTown();
    const id = window.setInterval(pullTown, 8000);
    return () => { stop = true; window.clearInterval(id); };
  }, []);

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
    if (spot.homeId) {
      if (!sim.homes.includes(spot.homeId)) {
        setSheet({ type: "place", placeId: "homes", title: spot.label, homeId: spot.homeId });
        return;
      }
      run((s) => moveHome(s, spot.homeId!));
      if (driving.current) { driving.current = false; setInCar(false); }
      jump("home", 8.5, 8.8);
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

  function travelTo(spot: Spot, byCar: boolean) {
    const owned = !!sim?.carId && sim.cars.includes(sim.carId);
    driving.current = byCar && owned;
    setInCar(driving.current);
    if (byCar && owned) {
      setHop(`On the way to ${spot.label}`);
      window.setTimeout(() => { setHop(null); walkTo(spot); }, 700);
      return;
    }
    walkTo(spot);
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
    const hit = viewRef.current?.groundAt(e.clientX, e.clientY, rect);
    if (!hit) return;
    path.current = findPath(map, pos.current.x, pos.current.y, hit.x, hit.y);
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
  const promos = helpOpen ? [] : ads.filter((ad) => ad.kind === "song" || ad.kind === "business");
  const ownedCar = !!sim.carId && sim.cars.includes(sim.carId);
  const phoneBadge = Math.max(0, others.length - phoneSeen);
  const nearby = townSpots
    .map((spot) => ({ spot, metres: Math.max(8, Math.round(Math.hypot(spot.x + 0.5 - here.x, spot.y + 0.5 - here.y) * 12)) }))
    .sort((a, b) => a.metres - b.metres)
    .slice(0, 6);
  const district = mapId === "home" ? "Private" : "Cedar Bay";

  return (
    <div className="game-root fixed inset-0 z-20 bg-[#8ec8ea] text-ink">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Your town" role="img" onPointerDown={onCanvasDown} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-12">
        {promos[0] && (
          <PromoBanner ad={promos[0]} />
        )}
        <div className="pointer-events-auto rounded-2xl bg-surface/92 px-3 py-2 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-display text-base font-semibold leading-none">{streetName(mapId, here.y)} · {district}</p>
            <div className="flex gap-1.5">
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setSheet({ type: "map" })}>Map</button>
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setPeople(true)}>People</button>
            </div>
          </div>
          <p className="mb-1 text-xs text-muted">{mapId === "home" ? (homeById(sim.homeId)?.name ?? map.name) : map.name} · Visits {sim.visitedToday.length}{database && around !== null ? ` · ${around} online` : ""}</p>
          <Hud sim={sim} weather={weatherFor(sim, region)} />
          <ul className="flex gap-1 overflow-x-auto" aria-label="Small things today, only if you want">
            {LITTLE_WINS.map((w) => (
              <li key={w.id} className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${sim.littleWins.includes(w.id) ? "bg-aurora/15 text-ink" : "bg-surface-2 text-muted"}`}>{w.icon} {w.label}</li>
            ))}
          </ul>
          {others.length > 0 && <p className="mt-1 text-xs">{others.length === 1 ? "1 person is here with you." : `${others.length} people are here with you.`}</p>}
          {late && <p className="mt-1 text-sm">The day is winding down. Time for bed.</p>}
          <p className="mt-1 text-[11px] text-muted">{inCar ? "Driving. Stay on the street and park whenever you like." : "Tap the ground to walk."} Game dollars have no real value and can&apos;t be bought.</p>
          {res && <ResultNote r={res} />}
          {mapId === "home" && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto" aria-label="At home">
              {HOME.spots.map((s) => (
                <button key={s.id} aria-label={s.aria} className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold ring-1 ring-line" onClick={() => activate(s)}>{s.label}</button>
              ))}
            </div>
          )}
          {mapId === "home" && (
            <div className="mt-1 flex gap-1.5">
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => setSheet({ type: "arrange" })}>Arrange</button>
              <button className="btn ghost !min-h-9 !px-3 !py-1 text-sm" onClick={() => { const r = run(entertain); if (r) setRes(r); }}>Entertain</button>
              {sim.visitor && <p className="truncate text-xs text-muted">{sim.visitor} is visiting</p>}
              {owned.length > 0 && <p className="truncate text-xs text-muted">At home: {owned.join(", ")}</p>}
            </div>
          )}
          {mapId === "club" && promos.length > 0 && (
            <p className="mt-1 text-xs">On the speakers: {promos.map((ad) => ad.line).join(" · ")}</p>
          )}
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
      {ownedCar && mapId === "town" && !sheet && (
        <button className="btn ghost absolute bottom-44 left-1/2 z-20 -translate-x-1/2 bg-surface shadow-lg" onClick={() => { driving.current = !driving.current; setInCar(driving.current); }}>
          {inCar ? "Park and walk" : "Get in the car"}
        </button>
      )}
      {near && !sheet && (
        <button className="btn absolute bottom-28 left-1/2 z-20 -translate-x-1/2 shadow-lg" onClick={() => activate(near)}>
          {near.homeId && sim.homes.includes(near.homeId) ? `Look inside · ${near.label}` : near.kind === "enter" ? `Go in · ${near.label}` : near.kind === "exit" ? "Step outside" : near.label}
        </button>
      )}

      {sheet && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[72dvh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-28 shadow-2xl" role="dialog" aria-label={sheet.type === "home" ? sheet.spot.label : sheet.type === "place" ? sheet.title : sheet.type === "arrange" ? "Arrange your home" : sheet.type === "phone" ? "Phone" : sheet.type === "buy" ? "Buy" : "Map"}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">{sheet.type === "home" ? sheet.spot.label : sheet.type === "place" ? sheet.title : sheet.type === "arrange" ? "Arrange your home" : sheet.type === "phone" ? "Phone" : sheet.type === "buy" ? "Buy" : "Cedar Bay"}</h2>
            <button className="btn ghost" onClick={() => setSheet(null)}>Close</button>
          </div>
          {sheet.type === "map" && (
            <div className="grid gap-3">
              <div className="flex gap-2">
                <button type="button" className={`rounded-full px-3 py-1 text-sm ring-1 ${mapTab === "districts" ? "bg-ink text-bg ring-ink" : "bg-surface ring-line"}`} onClick={() => setMapTab("districts")}>Districts</button>
                <button type="button" className={`rounded-full px-3 py-1 text-sm ring-1 ${mapTab === "cities" ? "bg-ink text-bg ring-ink" : "bg-surface ring-line"}`} onClick={() => setMapTab("cities")}>Cities</button>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={boardsOn} onChange={(e) => setBoardsOn(e.target.checked)} /> Street boards</label>
              {mapTab === "districts" ? (
                <ul className="grid gap-2">
                  {townSpots.map((s) => (
                    <li key={s.id}>
                      <button className="act" onClick={() => travelTo(s, false)}><span aria-hidden>🚶</span><span><b>{s.label}</b><small>Walk there. You can change your mind on the way.</small></span></button>
                      {ownedCar && <button className="act mt-1" onClick={() => travelTo(s, true)}><span aria-hidden>🚗</span><span><b>Driver · {s.label}</b><small>Your car, along the street. Park when you arrive.</small></span></button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="grid gap-2">
                  <li className="text-sm text-muted">Flights leave from the airport. Game money only, and you come home the same day.</li>
                  {REGIONS.map((r) => (
                    <li key={r.id}><p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm"><b>{r.name}</b></p></li>
                  ))}
                  <li><button className="btn" onClick={() => { const spot = TOWN.spots.find((s) => s.id === "travel"); if (spot) travelTo(spot, ownedCar); }}>Go to the airport</button></li>
                </ul>
              )}
            </div>
          )}
          {sheet.type === "buy" && (
            <ul className="grid gap-2">
              <li className="text-sm text-muted">Shops keep the same prices. Saving up is fine.</li>
              {townSpots.filter((s) => s.placeId && ["grocery", "plants", "homestore", "hobby", "clothes", "lot", "club"].includes(s.placeId)).map((s) => (
                <li key={s.id}><button className="act" onClick={() => travelTo(s, false)}><span aria-hidden>🚶</span><span><b>{s.label}</b><small>Walk over when you feel like it.</small></span></button></li>
              ))}
            </ul>
          )}
          {sheet.type === "phone" && (
            <div className="grid gap-3">
              <p className="text-sm text-muted">Preset notes only. There is no open chat box.</p>
              <div className="flex flex-wrap gap-2">
                {EMOTES.map((e) => (
                  <button key={e.id} className="rounded-full bg-surface-2 px-3 py-2 text-sm ring-1 ring-line" aria-pressed={emote === e.id} onClick={() => setEmote(e.id)}>{e.emoji} {e.label}</button>
                ))}
              </div>
              <ul className="grid gap-2">
                {KIND_PRESETS.map((preset) => (
                  <li key={preset.id}>
                    <button className="act" onClick={() => { setPeople(true); setRes({ sim, ok: true, message: `${preset.emoji} You can send “${preset.text}” from People. Nothing is typed in the open.` }); }}>
                      <span aria-hidden>{preset.emoji}</span>
                      <span><b>{preset.label}</b><small>{preset.text}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sheet.type === "place" && <PlaceBody placeId={sheet.placeId} onlyJob={sheet.jobId} homeId={sheet.homeId} sim={sim} region={region} onEnterHome={(id) => { run((s) => moveHome(s, id)); jump("home", 8.5, 8.8); setSheet(null); }} />}
          {sheet.type === "arrange" && (
            <ul className="grid gap-2">
              <li className="text-sm text-muted">Stand where you want it, then place it. Moving it later does not lose it. Each home keeps its own arrangement.</li>
              {sim.inventory.map((id) => {
                const item = itemById(id);
                if (!item) return null;
                const here = sim.placements.find((spot) => spot.itemId === id && spot.homeId === sim.homeId);
                return (
                  <li key={id}>
                    <button className="act" onClick={() => { const r = run((s) => placeItem(s, id, pos.current.x, pos.current.y)); if (r) setRes(r); }}>
                      <span aria-hidden>{item.icon}</span>
                      <span><b>{item.name}</b><small>{here ? `In this home at ${here.x}, ${here.y}. Place again to move it.` : "Not placed in this home yet."}</small></span>
                    </button>
                  </li>
                );
              })}
              {sim.inventory.length === 0 && <li>Nothing to place yet. The home store keeps the same prices.</li>}
            </ul>
          )}
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

      {mapId === "town" && !sheet && !near && (
        <div className="absolute bottom-28 left-28 right-3 z-20 flex gap-2 overflow-x-auto pb-1">
          {nearby.map(({ spot, metres }) => (
            <button key={spot.id} className="shrink-0 rounded-2xl bg-surface px-3 py-2 text-left text-sm shadow ring-1 ring-line" onClick={() => travelTo(spot, false)}>
              <b className="block">{spot.label}</b>
              <span className="text-xs text-muted">about {metres} m</span>
            </button>
          ))}
        </div>
      )}
      <nav className="absolute bottom-4 right-3 z-20 flex gap-1 rounded-full bg-surface/95 p-1 shadow-lg ring-1 ring-line" aria-label="Town">
        <button className="rounded-full px-3 py-2 text-sm font-semibold" onClick={() => { driving.current = false; setInCar(false); jump("home", 8.5, 8.8); }}>Home</button>
        <button className="rounded-full px-3 py-2 text-sm font-semibold" onClick={() => setSheet({ type: "buy" })}>Buy</button>
        <button className="rounded-full px-3 py-2 text-sm font-semibold" onClick={() => setSheet({ type: "map" })}>Map</button>
        <button className="rounded-full px-3 py-2 text-sm font-semibold" onClick={() => { setPhoneSeen(others.length); setSheet({ type: "phone" }); }}>Phone{phoneBadge > 0 ? ` ${phoneBadge}` : ""}</button>
      </nav>
      {hop && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#142033]/75 text-white">
          <p className="font-display text-3xl">{hop}</p>
        </div>
      )}
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
    name: board.ad?.businessName ?? "Your business",
    line: board.ad?.line ?? "This street board is open",
    accent: board.ad?.accent ?? "#8a6a3a",
  }));
}

function pace(world: { w: number; ground: Uint8Array }, x: number, y: number, drivingNow: boolean, speed = 2) {
  if (!drivingNow) return 3.15;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const onRoad = tx >= 0 && ty >= 0 && world.ground[ty * world.w + tx] === GROUND.path;
  return onRoad ? 5.4 + speed * 1.2 : 4.2;
}

function streetName(mapId: string, y: number) {
  if (mapId === "home") return "Your home";
  if (mapId !== "town") return "Indoors";
  if (y >= 24) return "South street";
  if (y >= 14 && y <= 19) return "Main street";
  if (y < 8) return "Lakeside path";
  return "Cedar lane";
}

function httpsLink(contact: string) {
  if (!contact.startsWith("https://")) return null;
  try {
    const url = new URL(contact);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function avatarOf(value: unknown) {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR;
  const o = value as Record<string, unknown>;
  const n = (v: unknown, d: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : d);
  return { skin: n(o.skin, 1, 5), hair: n(o.hair, 1, 5), style: n(o.style, 0, 3), shirt: n(o.shirt, 1, 5) };
}

function PromoBanner({ ad }: { ad: ApprovedAd }) {
  const href = httpsLink(ad.contact);
  const label = `${ad.kind === "song" ? "Now playing" : "In town"} · ${ad.businessName} — ${ad.line}`;
  const className = "pointer-events-auto mb-2 block rounded-2xl bg-[#1a1030] px-3 py-2 text-sm text-[#f7e7ff] shadow";
  if (!href) return <p className={className}>{label}</p>;
  return <a className={className} href={href} target="_blank" rel="noreferrer">{label}</a>;
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

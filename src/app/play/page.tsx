"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Hud } from "@/components/Hud";
import { Loading, TopNav } from "@/components/Parts";
import { ResultNote } from "@/components/Result";
import { Room, SPOTS, type Float, type Spot } from "@/components/Room";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { actionById } from "@/lib/sim/data";
import { availability, feedPet, perform, sleep, weatherFor } from "@/lib/sim/engine";
import { isRough, suggestNext } from "@/lib/sim/look";
import { BLOCKS_PER_DAY, NEED_META, type Result } from "@/lib/sim/types";
import { run } from "@/lib/game";

const MENU: Record<Spot, string[]> = {
  bed: ["nap", "@sleep"],
  desk: ["journal"],
  bath: ["shower", "tidy"],
  cushion: ["breathe", "ground"],
  kitchen: ["cook", "takeout", "@feed"],
  couch: ["tv", "call_friend", "pet_time", "read", "guitar", "paint", "radio", "water_plants"],
  door: ["@town"],
};
const SPOT_OF: Record<string, Spot> = Object.fromEntries(Object.entries(MENU).flatMap(([s, ids]) => ids.map((i) => [i, s as Spot])));
const PAGE: Record<string, string> = { breathe: "/breathe", ground: "/ground", journal: "/journal" };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chips = (id: string) => {
  const a = actionById(id);
  if (!a) return [];
  const out = Object.entries(a.effects).map(([k, v]) => `${(v ?? 0) > 0 ? "+" : "−"}${Math.abs(v ?? 0)} ${NEED_META[k as keyof typeof NEED_META].label}`);
  if (a.cost) out.push(`$${a.cost}`);
  return out;
};

export default function Play() {
  const ok = useRequireProfile();
  const { state, openHelp } = useHaven();
  const router = useRouter();
  const [sel, setSel] = useState<Spot | null>(null);
  const [x, setX] = useState(150);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [sleeping, setSleeping] = useState(false);
  const fid = useRef(0);
  const sim = state.sim;
  if (!ok || !sim || !state.region) return <Loading />;
  const region = state.region;
  const weather = weatherFor(sim, region);
  const quiet = () => document.documentElement.classList.contains("quiet");

  const walk = async (spot: Spot) => {
    if (SPOTS[spot].stand !== x) { setX(SPOTS[spot].stand); await wait(quiet() ? 0 : 650); }
  };
  const showFloats = (r: Result, spot: Spot) => {
    (r.gains ?? []).slice(0, 3).forEach((t, i) => {
      const id = ++fid.current;
      setTimeout(() => setFloats((f) => [...f, { id, text: t, x: SPOTS[spot].stand + (i - 1) * 6 }]), i * 160);
      setTimeout(() => setFloats((f) => f.filter((q) => q.id !== id)), 1600 + i * 160);
    });
  };

  const choose = async (id: string, spot: Spot) => {
    if (busy) return;
    setBusy(true);
    try {
      if (id === "@town") { router.push("/town"); return; }
      if (PAGE[id]) {
        const av = availability(sim, id);
        if (!av.ok) { setRes({ sim, ok: false, message: av.reason ?? "Not right now." }); return; }
        await walk(spot);
        router.push(PAGE[id]);
        return;
      }
      await walk(spot);
      if (id === "@sleep") {
        setSleeping(true); setSel(null);
        await wait(quiet() ? 0 : 1500);
        setRes(run((s) => sleep(s)));
        setSleeping(false); setX(150);
        return;
      }
      const r = id === "@feed" ? run((s) => feedPet(s)) : run((s) => perform(s, id, region));
      if (r) { setRes(r); showFloats(r, spot); }
      if (r?.ok) setSel(null);
    } finally { setBusy(false); }
  };

  const tip = suggestNext(sim);
  const rough = isRough(sim);
  const late = sim.block >= BLOCKS_PER_DAY;

  return (
    <div>
      <TopNav />
      <h1 className="mb-2 font-display text-2xl font-semibold">{state.nickname ? `${state.nickname}'s home` : "Your home"}</h1>
      <Hud sim={sim} weather={weather} />
      <Room sim={sim} weather={weather} regionId={region} selected={sel} avatarX={x} onPick={(s) => setSel(sel === s ? null : s)} floats={floats} sleeping={sleeping} />
      <p className="mt-2 text-sm text-muted">Tap something in your home to use it.{late ? " The day is winding down. Time for bed." : ""}</p>

      <div className="mt-3"><ResultNote r={res} /></div>

      {rough && (
        <div role="note" className="mt-3 rounded-2xl border border-softred/50 bg-surface-2 p-4">
          <p className="font-display text-lg font-semibold">It&apos;s a rough stretch. That&apos;s okay.</p>
          <p className="mt-1 text-muted">One small thing is enough today. You don&apos;t have to fix everything. If it feels like too much, support is a tap away.</p>
          <button className="btn ghost mt-3" onClick={openHelp}>See support options</button>
        </div>
      )}

      {sel && (
        <section className="card mt-3" aria-label={`${SPOTS[sel].label} options`}>
          <h2 className="font-display text-xl font-semibold">{SPOTS[sel].label}</h2>
          <ul className="mt-2 grid gap-2">
            {MENU[sel].map((id) => {
              if (id === "@town") return <li key={id}><button className="act" onClick={() => choose(id, sel)}><span aria-hidden>🚪</span><span><b>Go into town</b><small>Shops, work, the park and friends.</small></span></button></li>;
              if (id === "@sleep") return <li key={id}><button className="act" onClick={() => choose(id, sel)}><span aria-hidden>🌙</span><span><b>Go to bed for the night</b><small>Start a new day. Energy is fully restored.</small></span></button></li>;
              if (id === "@feed") return <li key={id}><button className="act" disabled={!sim.pet} onClick={() => choose(id, sel)}><span aria-hidden>🐟</span><span><b>Feed your cat</b><small>{sim.pet ? "A small treat. Free, no time needed." : "You don't have a cat yet."}</small></span></button></li>;
              const a = actionById(id)!;
              const av = availability(sim, id);
              return (
                <li key={id}>
                  <button className="act" disabled={!av.ok} onClick={() => choose(id, SPOT_OF[id] ?? sel)}>
                    <span aria-hidden>{a.icon}</span>
                    <span><b>{a.label}</b><small>{av.ok ? chips(id).join("  ·  ") + (PAGE[id] ? "  ·  opens an exercise" : "") : av.reason}</small></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tip && !sel && (
        <section className="card mt-3" aria-label="A gentle suggestion">
          <p className="text-sm text-muted">Need a nudge? You could…</p>
          <button className="act mt-1" onClick={() => setSel(SPOT_OF[tip.actionId])}>
            <span aria-hidden>{actionById(tip.actionId)?.icon}</span>
            <span><b>{tip.label}</b><small>Your {NEED_META[tip.need].label.toLowerCase()} could use a boost. Completely optional.</small></span>
          </button>
        </section>
      )}

      <p className="mt-6 text-sm text-muted">Game money only: it has no real value and can&apos;t be bought. <Link className="underline" href="/scrapbook">See your scrapbook</Link></p>
    </div>
  );
}

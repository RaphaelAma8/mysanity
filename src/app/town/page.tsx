"use client";

import Link from "next/link";
import { useState } from "react";
import { Hud } from "@/components/Hud";
import { Loading, TopNav } from "@/components/Parts";
import { PlaceBody } from "@/components/PlaceBody";
import { ResultNote } from "@/components/Result";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { PLACES } from "@/lib/sim/data";
import { visit, weatherFor } from "@/lib/sim/engine";
import { BLOCKS_PER_DAY, type Result, type Sim } from "@/lib/sim/types";
import { run } from "@/lib/game";

export default function Town() {
  const ok = useRequireProfile();
  const { state } = useHaven();
  const [at, setAt] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const sim = state.sim;
  if (!ok || !sim || !state.region) return <Loading />;
  const region = state.region;
  const place = PLACES.find((p) => p.id === at) ?? null;
  const late = sim.block >= BLOCKS_PER_DAY;
  const doit = (fn: (s: Sim) => Result) => { const r = run(fn); if (r) setRes(r); return r; };

  const go = (id: string) => {
    const r = doit((s) => visit(s, id));
    if (r?.ok) setAt(id);
  };

  return (
    <div>
      <TopNav />
      <Hud sim={sim} weather={weatherFor(sim, region)} />
      <h1 className="font-display text-3xl font-semibold">Town</h1>
      <p className="mb-3 mt-1 text-muted">This is the same town you can walk. Going somewhere takes one time block the first time each day. Everything here is optional, and the prices never change. <Link className="underline" href="/play">Walk there instead</Link></p>
      <div className="mb-3"><ResultNote r={res} /></div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Places">
        {PLACES.map((p) => (
          <li key={p.id}>
            <button className={`card flex h-full w-full flex-col items-start gap-1 text-left hover:bg-surface-2 ${at === p.id ? "ring-2 ring-lantern" : ""}`} onClick={() => (sim.visitedToday.includes(p.id) || p.kind === "job" || p.id === "travel" ? setAt(p.id) : go(p.id))} aria-pressed={at === p.id}>
              <span className="text-2xl" aria-hidden>{p.icon}</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm text-muted">{p.blurb}</span>
              {!sim.visitedToday.includes(p.id) && p.kind !== "job" && p.id !== "travel" && <span className="text-xs text-lantern">{late ? "Too late today" : "Takes 1 block"}</span>}
            </button>
          </li>
        ))}
      </ul>

      {place && (
        <section className="card mt-4" aria-label={place.name}>
          <h2 className="font-display text-2xl font-semibold"><span aria-hidden>{place.icon}</span> {place.name}</h2>
          <div className="mt-3">
            <PlaceBody placeId={place.id} sim={sim} region={region} />
          </div>
        </section>
      )}
    </div>
  );
}

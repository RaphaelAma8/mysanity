"use client";

import Link from "next/link";
import { Loading, TopNav } from "@/components/Parts";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { FRIENDS } from "@/lib/sim/data";
import { regionById } from "@/data/regions";

export default function Scrapbook() {
  const ok = useRequireProfile();
  const { state } = useHaven();
  const sim = state.sim;
  if (!ok || !sim) return <Loading />;
  const days = [...new Set(sim.moments.map((m) => m.day))].sort((a, b) => b - a);
  const met = FRIENDS.filter((f) => (sim.friends[f.id] ?? 0) >= 1);
  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">Scrapbook</h1>
      <p className="mb-4 mt-1 text-muted">The good moments, kept. Nothing here ever disappears, and nothing is ever taken away.</p>
      <div className="mb-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[["Days lived", sim.day], ["Good moments", sim.moments.length], ["Friends", met.length], ["Places visited", sim.travelled.length]].map(([l, v]) => (
          <div key={l as string} className="card !p-3 text-center"><div className="font-display text-2xl font-semibold">{v}</div><div className="text-muted">{l}</div></div>
        ))}
      </div>
      {sim.moments.length === 0 ? (
        <p className="card text-muted">Nothing here yet, and that&apos;s fine. Try something small and enjoyable. A walk, a song or a chat will show up here. <Link className="underline" href="/play">Go home</Link></p>
      ) : (
        <ol className="grid gap-4">
          {days.map((d) => (
            <li key={d}>
              <h2 className="mb-1 text-sm font-semibold tracking-wide text-aurora">DAY {d}</h2>
              <ul className="grid gap-2">
                {sim.moments.filter((m) => m.day === d).reverse().map((m, i) => (
                  <li key={i} className="card flex items-center gap-3 !p-3"><span aria-hidden className="text-2xl">{m.icon}</span><span>{m.text}</span></li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {sim.travelled.length > 0 && <p className="mt-5 text-sm text-muted">You&apos;ve visited: {sim.travelled.map((id) => regionById(id)?.name).join(", ")}.</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Figure } from "@/components/Figure";
import { Loading } from "@/components/Parts";
import { useHaven } from "@/components/HavenProvider";
import { REGIONS } from "@/data/regions";
import { DEFAULT_AVATAR } from "@/lib/state";
import { HAIR, SHIRT, SKIN, STYLES } from "@/lib/sim/look";
import { newSim } from "@/lib/sim/engine";
import type { Avatar } from "@/lib/sim/types";

export default function Onboard() {
  const { state, ready, update } = useHaven();
  const router = useRouter();
  const [region, setRegion] = useState<string | null>(state.region);
  const [nick, setNick] = useState(state.nickname);
  const [av, setAv] = useState<Avatar>(DEFAULT_AVATAR);
  const blocked = ready && !state.adultConfirmedAt;
  useEffect(() => { if (blocked) router.replace("/"); }, [blocked, router]);
  if (!ready || blocked) return <Loading />;

  const sw = (key: "skin" | "hair" | "shirt", list: string[], label: string) => (
    <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="w-14 text-sm text-muted">{label}</span>
      {list.map((c, i) => <button key={c} type="button" aria-label={`${label} ${i + 1}`} aria-pressed={av[key] === i} onClick={() => setAv({ ...av, [key]: i })} className="h-8 w-8 rounded-full border-2 border-white/80" style={{ background: c, boxShadow: av[key] === i ? "0 0 0 3px #f6c26b" : "none" }} />)}
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold">Create your character</h1>
      <p className="mt-2 text-muted">This is who you&apos;ll look after in the game. You can make them look like you, or like anyone you like.</p>

      <div className="card mt-5 flex items-center gap-5">
        <svg viewBox="-30 -100 60 110" width="110" height="180" aria-label="Your character" role="img"><Figure avatar={av} mood="good" /></svg>
        <div className="flex-1">
          {sw("skin", SKIN, "Skin")}{sw("hair", HAIR, "Hair")}
          <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Hairstyle">
            <span className="w-14 text-sm text-muted">Style</span>
            {STYLES.map((s, i) => <button key={s} type="button" aria-pressed={av.style === i} onClick={() => setAv({ ...av, style: i })} className={`rounded-full px-3 py-1 text-sm ring-1 ${av.style === i ? "bg-ink text-bg ring-ink" : "bg-surface ring-line"}`}>{s}</button>)}
          </div>
          {sw("shirt", SHIRT, "Shirt")}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="nick" className="font-semibold">What should we call you? <span className="font-normal text-muted">(optional)</span></label>
        <input id="nick" value={nick} onChange={(e) => setNick(e.target.value.slice(0, 30))} autoComplete="off" className="mt-2 w-full rounded-2xl border border-line bg-surface p-3 text-lg text-ink" />
      </div>

      <fieldset className="mt-6">
        <legend className="font-semibold">Which province or territory is home?</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REGIONS.map((r) => (
            <button key={r.id} type="button" aria-pressed={region === r.id} onClick={() => setRegion(r.id)} className={`rounded-2xl border p-3 text-left ${region === r.id ? "border-lantern bg-surface-2 ring-2 ring-lantern" : "border-line bg-surface hover:bg-surface-2"}`}>
              <span className="font-semibold">{r.name}</span>
              <span className="block text-sm text-muted">{r.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <button
        className="btn mt-6" disabled={!region}
        onClick={() => { update((s) => ({ ...s, region, nickname: nick.trim(), sim: newSim(av, new Date()) })); router.push("/play"); }}
      >
        Start my life
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading, TopNav } from "@/components/Parts";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { MOODS, MOOD_TAGS } from "@/data/content";
import { addCheckin, type Mood } from "@/lib/state";
import { supportLevel, type SupportLevel } from "@/lib/support";
import { update } from "@/lib/store";

/** Deliberately not part of the game: no reward for any answer, so people have no reason to answer anything but honestly. */
export default function Checkin() {
  const ok = useRequireProfile();
  const { openHelp } = useHaven();
  const [mood, setMood] = useState<Mood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [level, setLevel] = useState<SupportLevel | null>(null);
  if (!ok) return <Loading />;

  if (level !== null) {
    return (
      <div>
        <TopNav />
        <div className="card" role="status">
          <p className="font-display text-2xl font-semibold">Thanks for being honest with yourself.</p>
          {level === "none" && <p className="mt-2 text-muted">Whatever today holds, you checked in. That&apos;s a kind thing to do for yourself.</p>}
          {level === "soft" && <p className="mt-2 text-muted">Low days happen to everyone. Be gentle with yourself today. If it feels heavy, support is easy to reach.</p>}
          {level === "strong" && <p className="mt-2 text-muted">It looks like the last few days have felt low. You don&apos;t have to carry that alone. Talking to someone you trust, your doctor, or a support line can really help.</p>}
          {level !== "none" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn" onClick={openHelp}>See support options</button>
              {level === "strong" && <a className="btn ghost" href="tel:988">Call or text 9-8-8</a>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2"><Link className="btn ghost" href="/play">Back home</Link><button className="btn ghost" onClick={() => { setLevel(null); setMood(null); setTags([]); }}>Check in again</button></div>
        </div>
        <p className="mt-4 text-sm text-muted">Only you can see your check-ins. They stay on this device and are never part of the game. <Link className="underline" href="/settings">Delete them any time</Link>.</p>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">How are you, honestly?</h1>
      <p className="mb-5 mt-2 text-muted">There are no right answers, no scores and no rewards. This is just for you.</p>
      <div role="radiogroup" aria-label="How are you feeling" className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button key={m.value} role="radio" aria-checked={mood === m.value} onClick={() => setMood(m.value)} className={`card flex flex-col items-center gap-1 !p-3 ${mood === m.value ? "bg-surface-2 ring-2 ring-lantern" : ""}`}>
            <span className="text-3xl" aria-hidden>{m.emoji}</span>
            <span className="text-xs">{m.label}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-6 font-semibold">Anything connected to it? <span className="font-normal text-muted">(optional)</span></p>
      <div className="flex flex-wrap gap-2">
        {MOOD_TAGS.map((t) => (
          <button key={t} aria-pressed={tags.includes(t)} onClick={() => setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} className={`rounded-full px-3.5 py-2 text-sm ring-1 ${tags.includes(t) ? "bg-lantern text-lantern-ink ring-lantern" : "bg-surface ring-line"}`}>{t}</button>
        ))}
      </div>
      <button
        className="btn mt-6" disabled={mood === null}
        onClick={() => {
          if (mood === null) return;
          const now = new Date();
          let lvl: SupportLevel = "none";
          update((s) => { const n = addCheckin(s, mood, tags, now); lvl = supportLevel(n.checkins, now); return n; });
          setLevel(lvl);
        }}
      >
        Save my check-in
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { DoneCard, Loading, TopNav } from "@/components/Parts";
import { useRequireProfile } from "@/components/HavenProvider";
import { BREATHING } from "@/data/content";
import { speed, useExercise } from "@/lib/useExercise";

type Phase = "in" | "hold" | "out";

export default function Breathe() {
  const ok = useRequireProfile();
  const { res, finish, reset } = useExercise("breathe");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);
  const { in: tin, hold, out } = BREATHING.pattern;
  const cycle = tin + hold + out;

  useEffect(() => {
    if (minutes === null) return;
    finished.current = false;
    const k = speed();
    const startedAt = performance.now();
    const id = setInterval(() => {
      const e = ((performance.now() - startedAt) / 1000) * k;
      if (e >= minutes * 60) {
        clearInterval(id);
        if (!finished.current) { finished.current = true; finish(); setMinutes(null); setElapsed(0); }
      } else setElapsed(e);
    }, 100);
    return () => clearInterval(id);
  }, [minutes, finish]);

  if (!ok) return <Loading />;
  if (res) return <div><TopNav /><DoneCard res={res} againLabel="Breathe again" onAgain={reset} /></div>;

  if (minutes === null) {
    return (
      <div>
        <TopNav />
        <h1 className="font-display text-3xl font-semibold">Breathe</h1>
        <p className="mb-5 mt-2 text-muted">Breathe in for {tin}, pause for {hold}, breathe out for {out}. A longer breath out can help your body settle. Stop whenever you like.</p>
        <p className="mb-2 font-semibold">How long?</p>
        <div className="flex flex-wrap gap-2">
          {BREATHING.durations.map((m) => <button key={m} className="btn ghost" onClick={() => { setElapsed(0); setMinutes(m); }}>{m} {m === 1 ? "minute" : "minutes"}</button>)}
        </div>
      </div>
    );
  }

  const t = elapsed % cycle;
  const phase: Phase = t < tin ? "in" : t < tin + hold ? "hold" : "out";
  const scale = phase === "in" ? 0.55 + 0.45 * (t / tin) : phase === "hold" ? 1 : 1 - 0.45 * ((t - tin - hold) / out);
  const remaining = Math.max(0, Math.ceil(minutes * 60 - elapsed));
  const label = phase === "in" ? "Breathe in" : phase === "hold" ? "Pause" : "Breathe out";

  return (
    <div className="text-center">
      <TopNav />
      <div className="mx-auto mt-6 grid h-72 w-72 place-items-center" aria-hidden>
        <div className="grid place-items-center rounded-full bg-aurora/80 transition-none" style={{ width: `${scale * 100}%`, height: `${scale * 100}%`, boxShadow: "0 0 60px rgba(94,209,184,.45)" }} />
      </div>
      <p className="mt-6 font-display text-4xl font-semibold" role="status" aria-live="polite" data-testid="breath-label">{label}</p>
      <p className="mt-1 text-muted">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left</p>
      <button className="btn ghost mt-6" onClick={() => { setMinutes(null); setElapsed(0); }}>End early</button>
    </div>
  );
}

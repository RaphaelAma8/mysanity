"use client";

import { useState } from "react";
import { DoneCard, Loading, TopNav } from "@/components/Parts";
import { useRequireProfile } from "@/components/HavenProvider";
import { GROUNDING } from "@/data/content";
import { useExercise } from "@/lib/useExercise";

export default function Ground() {
  const ok = useRequireProfile();
  const { res, finish, reset } = useExercise("ground");
  const [i, setI] = useState(-1);
  if (!ok) return <Loading />;
  if (res) return <div><TopNav /><DoneCard res={res} againLabel="Ground again" onAgain={() => { reset(); setI(-1); }} /></div>;

  if (i < 0) {
    return (
      <div>
        <TopNav />
        <h1 className="font-display text-3xl font-semibold">Ground yourself</h1>
        <p className="mb-5 mt-2 text-muted">This exercise brings your attention to the room around you, one sense at a time. Go at your own pace. Nothing is written down.</p>
        <button className="btn" onClick={() => setI(0)}>Start</button>
      </div>
    );
  }
  const step = GROUNDING[i];
  const last = i === GROUNDING.length - 1;
  return (
    <div>
      <TopNav />
      <p className="text-sm text-muted">Step {i + 1} of {GROUNDING.length}</p>
      <div className="card mt-2 text-center">
        <p className="font-display text-7xl font-semibold text-lantern" aria-hidden>{step.n}</p>
        <p className="mt-2 text-2xl" role="status" aria-live="polite">{step.prompt}</p>
        <p className="mt-2 text-muted">Take your time. You can say them out loud or just think them.</p>
      </div>
      <div className="mt-5 flex gap-2">
        {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}>Back</button>}
        {!last ? <button className="btn" onClick={() => setI(i + 1)}>Next</button> : <button className="btn" onClick={finish}>I&apos;m done</button>}
      </div>
    </div>
  );
}

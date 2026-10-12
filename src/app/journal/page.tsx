"use client";

import { useState } from "react";
import { CrisisNotice, DoneCard, Loading, TopNav } from "@/components/Parts";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { JOURNAL_PROMPTS } from "@/data/content";
import { detectCrisis } from "@/lib/crisis";
import { addJournal, deleteJournal } from "@/lib/state";
import { update } from "@/lib/store";
import { useExercise } from "@/lib/useExercise";

export default function Journal() {
  const ok = useRequireProfile();
  const { state } = useHaven();
  const { res, finish, reset } = useExercise("journal");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [concern, setConcern] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!ok) return <Loading />;

  const save = () => {
    const t = text.trim();
    if (!t) return;
    setConcern(detectCrisis(t));
    update((s) => addJournal(s, t, prompt, new Date()));
    finish();
    setText("");
  };

  return (
    <div>
      <TopNav />
      <h1 className="font-display text-3xl font-semibold">Journal</h1>
      <p className="mt-2 rounded-2xl bg-surface-2 p-3 text-sm text-muted">🔒 Private. What you write is saved only on this device. It is never sent anywhere, and no one else can read it. Anyone who can unlock this device could, so use <strong>Quick exit</strong> or delete entries if you share it.</p>

      {res ? (
        <div className="mt-5">
          {concern && <CrisisNotice />}
          <div className="mt-4"><DoneCard res={res} againLabel="Write another" onAgain={() => { reset(); setConcern(false); }} /></div>
        </div>
      ) : (
        <div className="mt-5">
          <p className="mb-2 font-semibold">Need a place to start? <span className="font-normal text-muted">(optional)</span></p>
          <div className="mb-3 flex flex-wrap gap-2">
            {JOURNAL_PROMPTS.map((p) => (
              <button key={p} aria-pressed={prompt === p} onClick={() => setPrompt(prompt === p ? null : p)} className={`rounded-2xl px-3 py-2 text-left text-sm ring-1 ${prompt === p ? "bg-surface-2 ring-lantern" : "bg-surface ring-line"}`}>{p}</button>
            ))}
          </div>
          {prompt && <p className="mb-2 font-display text-lg">{prompt}</p>}
          <label htmlFor="entry" className="sr-only">Your journal entry</label>
          <textarea id="entry" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={5000} placeholder="Write whatever is on your mind..." className="w-full rounded-2xl border border-line bg-surface p-4 text-lg text-ink" />
          {detectCrisis(text) && <CrisisNotice />}
          <button className="btn mt-4" disabled={!text.trim()} onClick={save}>Save privately</button>
        </div>
      )}

      <section className="mt-10" aria-labelledby="past">
        <h2 id="past" className="font-display text-xl font-semibold">Your entries ({state.journal.length})</h2>
        {state.journal.length === 0 ? <p className="mt-2 text-muted">Nothing yet. That&apos;s fine.</p> : (
          <ul className="mt-3 grid gap-3">
            {state.journal.map((e) => (
              <li key={e.id} className="card">
                <p className="text-sm text-muted">{new Date(e.at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</p>
                {e.prompt && <p className="mt-1 text-sm italic text-muted">{e.prompt}</p>}
                <p className="mt-2 whitespace-pre-wrap">{e.text}</p>
                {confirm === e.id ? (
                  <div className="mt-3 flex gap-2"><button className="btn" onClick={() => { update((s) => deleteJournal(s, e.id)); setConfirm(null); }}>Yes, delete it</button><button className="btn ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
                ) : <button className="btn ghost mt-3" onClick={() => setConfirm(e.id)}>Delete</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

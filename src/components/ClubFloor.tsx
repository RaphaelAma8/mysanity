"use client";

import { useEffect, useState } from "react";
import { CrisisNotice } from "@/components/Parts";
import { DRINKS } from "@/lib/sim/data";
import { clubSpot, orderDrink, placeOuting } from "@/lib/sim/engine";
import type { Result, Sim } from "@/lib/sim/types";

const LINES = [
  "The DJ just dropped a cedar-bay instrumental.",
  "The floor lights shift from teal to amber.",
  "Someone waves from the quiet booth.",
  "A mocktail slides across the bar.",
  "The speakers hum a local song, soft enough to talk over.",
];

/** Club actions, a non-alcoholic menu, and a moderated promo. No card payments. */
export function ClubFloor({ sim, onRun }: { sim: Sim; onRun: (fn: (s: Sim) => Result) => Result | null | undefined }) {
  const [line, setLine] = useState(0);
  const [kind, setKind] = useState<"song" | "business">("song");
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [concern, setConcern] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setLine((n) => (n + 1) % LINES.length), 4200);
    return () => window.clearInterval(id);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setConcern(false);
    setNote(null);
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName: name, line: blurb, detail: "Shared from the lakeside club.", contact: link, kind }),
    });
    const data = await res.json().catch(() => null) as { ok?: boolean; error?: string; status?: string } | null;
    if (!data?.ok) {
      const message = data?.error ?? "That could not be sent.";
      if (/9-8-8/.test(message)) setConcern(true);
      setNote(message === "database_off" ? "The town is just yours until a database is connected. Nothing was charged." : message);
      return;
    }
    setNote("Waiting for review. It will not show for other players until it is approved.");
    setName("");
    setBlurb("");
    setLink("");
  }

  return (
    <div className="grid gap-3">
      <p className="rounded-2xl bg-[#1a1030] px-3 py-2 text-sm text-[#f7e7ff]" aria-live="polite">{LINES[line]}</p>
      <div className="grid gap-2">
        <button className="act" onClick={() => onRun((s) => clubSpot(s, "vip"))}><span aria-hidden>🛋️</span><span><b>VIP booth</b><small>Free · a quiet seat · takes 1 block</small></span></button>
        <button className="act" onClick={() => onRun((s) => placeOuting(s, "club"))}><span aria-hidden>🎶</span><span><b>Dance floor</b><small>Free · stay as long as the song feels good · takes 1 block</small></span></button>
        <button className="act" onClick={() => onRun((s) => clubSpot(s, "dj"))}><span aria-hidden>🎧</span><span><b>DJ booth</b><small>Free · listen in · takes 1 block</small></span></button>
      </div>
      <div>
        <p className="font-semibold">Bar</p>
        <p className="text-sm text-muted">Mocktails and snacks. Game dollars only, and the prices stay put.</p>
        <ul className="mt-2 grid gap-2">
          {DRINKS.map((drink) => (
            <li key={drink.id}>
              <button className="act" disabled={sim.money < drink.price} onClick={() => onRun((s) => orderDrink(s, drink.id))}>
                <span aria-hidden>{drink.icon}</span>
                <span><b>{drink.name} · ${drink.price}</b><small>{drink.blurb}{sim.money < drink.price ? " · saving up is fine" : ""}</small></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form className="grid gap-2 rounded-2xl bg-surface-2 p-3" onSubmit={(e) => void submit(e)}>
        <p className="font-semibold">Promote a song or a business</p>
        <p className="text-sm text-muted">An approved link shows as a banner, on the street boards, and on the club speakers. The same words for everyone. A journal or a mood is never used.</p>
        <div className="flex gap-2">
          <button type="button" className={`rounded-full px-3 py-1 text-sm ring-1 ${kind === "song" ? "bg-ink text-bg ring-ink" : "bg-surface ring-line"}`} onClick={() => setKind("song")}>Song</button>
          <button type="button" className={`rounded-full px-3 py-1 text-sm ring-1 ${kind === "business" ? "bg-ink text-bg ring-ink" : "bg-surface ring-line"}`} onClick={() => setKind("business")}>Business</button>
        </div>
        <label className="text-sm font-semibold" htmlFor="promo-name">{kind === "song" ? "Song or artist" : "Business name"}</label>
        <input id="promo-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} className="rounded-2xl border border-line bg-surface p-3 text-ink" />
        <label className="text-sm font-semibold" htmlFor="promo-line">A short line</label>
        <input id="promo-line" value={blurb} onChange={(e) => setBlurb(e.target.value.slice(0, 80))} className="rounded-2xl border border-line bg-surface p-3 text-ink" />
        <label className="text-sm font-semibold" htmlFor="promo-link">https link</label>
        <input id="promo-link" value={link} onChange={(e) => setLink(e.target.value.slice(0, 120))} placeholder="https://" className="rounded-2xl border border-line bg-surface p-3 text-ink" inputMode="url" />
        <p className="rounded-2xl border border-dashed border-line bg-surface px-3 py-2 text-sm text-muted">Payment provider placeholder. A future checkout can sit here. This build does not charge a card, and game dollars are not real money.</p>
        {concern && <CrisisNotice />}
        {note && <p className="text-sm">{note}</p>}
        <button className="btn" type="submit">Send for review</button>
      </form>
    </div>
  );
}

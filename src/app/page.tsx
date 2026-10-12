"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHaven } from "@/components/HavenProvider";

export default function Welcome() {
  const { state, ready, update } = useHaven();
  const router = useRouter();
  const [adult, setAdult] = useState(false);
  const returning = ready && !!state.adultConfirmedAt && !!state.region && !!state.sim;

  return (
    <div>
      <p className="font-display text-sm tracking-widest text-aurora">WELCOME</p>
      <h1 className="font-display text-5xl font-semibold leading-tight">mysanity</h1>
      <p className="mt-3 text-xl text-muted">A cozy life game about small, good things.</p>

      <ul className="mt-8 grid gap-3">
        {[
          ["🏠", "Look after a character in a little Canadian home. Eat, rest, see friends, and do things that make them happy."],
          ["💵", "Work a few gentle shifts, earn game dollars, and spend them on plants, music, a cat, and a cozy home."],
          ["📸", "Good moments go in your scrapbook. Nothing is ever lost, and a rough day is never a failure."],
          ["🔒", "Everything stays on this device. There are no accounts, no chat, no ads, and no real money."],
        ].map(([icon, text]) => (
          <li key={icon} className="card flex gap-4"><span aria-hidden className="text-2xl">{icon}</span><span>{text}</span></li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
        <p><strong>This is a game, not therapy, medical advice or a crisis service.</strong> It borrows everyday ideas about looking after yourself. If you are struggling, the <strong>Need help now?</strong> button is on every screen.</p>
        <p className="mt-2 text-muted">Under 18? <Link className="underline" href="/help">Kids Help Phone</Link> is there for you any time. This game is for adults.</p>
      </div>

      {returning ? (
        <div className="mt-8 flex flex-wrap gap-3"><Link className="btn" href="/play">Continue my game</Link></div>
      ) : (
        <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (!adult) return; update((s) => ({ ...s, adultConfirmedAt: new Date().toISOString() })); router.push("/onboard"); }}>
          <label className="flex cursor-pointer items-start gap-3 text-lg">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1.5 h-6 w-6 accent-[#f6c26b]" />
            <span>I am 18 or older, and I understand mysanity is a game and not a substitute for professional care.</span>
          </label>
          <button type="submit" className="btn mt-5" disabled={!adult}>Begin</button>
        </form>
      )}
    </div>
  );
}

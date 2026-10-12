"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useHaven } from "@/components/HavenProvider";
import { PLACES } from "@/lib/sim/data";
import type { ApprovedAd } from "@/lib/ads/moderate";

const OPEN_BOARDS = [
  { businessName: "Your shop", line: "This board is open", accent: "#1f6b4a" },
  { businessName: "A local cafe", line: "Ask to be shown on the street", accent: "#8c3b32" },
  { businessName: "Cedar Bay", line: "Same boards for everyone", accent: "#1e4d6b" },
];

export default function Welcome() {
  const { state, ready, update, helpOpen } = useHaven();
  const router = useRouter();
  const [adult, setAdult] = useState(false);
  const [ads, setAds] = useState<ApprovedAd[]>([]);
  const [around, setAround] = useState<number | null>(null);
  const [database, setDatabase] = useState(false);
  const returning = ready && !!state.adultConfirmedAt && !!state.region && !!state.sim;

  useEffect(() => {
    let stop = false;
    void fetch("/api/status").then((r) => r.json()).then((data: { database?: boolean; around?: number }) => {
      if (stop) return;
      setDatabase(!!data.database);
      setAround(typeof data.around === "number" ? data.around : 0);
    }).catch(() => undefined);
    void fetch("/api/ads").then((r) => r.json()).then((data: { ads?: ApprovedAd[] }) => {
      if (!stop && Array.isArray(data.ads)) setAds(data.ads);
    }).catch(() => undefined);
    return () => { stop = true; };
  }, []);

  const boards: { key: string; businessName: string; line: string; accent: string; contact: string }[] = ads.length > 0
    ? ads.map((ad) => ({ key: ad.id, businessName: ad.businessName, line: ad.line, accent: ad.accent, contact: ad.contact }))
    : OPEN_BOARDS.map((ad) => ({ key: ad.businessName, businessName: ad.businessName, line: ad.line, accent: ad.accent, contact: "" }));

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[#142433] text-white">
      <div className="relative min-h-[100dvh]">
        <Dusk />
        <header className="relative z-10 flex items-start justify-between gap-3 px-3 pt-14 sm:px-6">
          <ul className="flex max-w-[68vw] gap-3 overflow-x-auto pb-2" aria-label="Places in Cedar Bay">
            {PLACES.map((p) => (
              <li key={p.id} className="w-16 shrink-0 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/35 text-2xl shadow-lg backdrop-blur-sm">{p.icon}</span>
                <span className="mt-1 block text-[11px] leading-tight text-white/90">{p.name}</span>
              </li>
            ))}
          </ul>
          <div className="shrink-0 text-right">
            {database && around !== null && <p className="text-sm text-white/85">{around} in town</p>}
            <a className="btn mt-2 !min-h-10 !px-4 !py-2" href="#begin">{returning ? "Continue" : "Play"}</a>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-3xl px-5 pb-8 pt-16 text-center sm:pt-24">
          <p className="text-sm font-semibold tracking-[0.28em] text-white/80">CEDAR BAY</p>
          <h1 className="font-display text-6xl font-semibold leading-none sm:text-7xl">mysanity</h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/90">A life you can walk. Small days, a lake town, and people in the same rooms as you.</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/75">For adults living with anxiety, depression and stress. It is a game, not treatment, and help is one tap away.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a className="btn" href="#begin">{returning ? "Continue my game" : "Play free"}</a>
            <a className="btn ghost on-photo" href="#boards">Business boards</a>
          </div>
          {!database && <p className="mt-4 text-xs text-white/70">The town plays on this device until a database is connected. Then people can stand in the same places.</p>}
        </section>

        {!helpOpen && (
          <section id="boards" aria-label="Business boards" className="relative z-10 px-4 pb-10">
            <div className="mx-auto flex max-w-5xl gap-3 overflow-x-auto pb-2">
              {boards.map((ad) => (
                <article key={ad.key} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-[#fffdf8] text-ink shadow-xl">
                  <div className="h-16" style={{ background: `linear-gradient(135deg, ${ad.accent}, #142433)` }} />
                  <div className="p-3">
                    <h2 className="font-display text-lg font-semibold leading-tight">{ad.businessName}</h2>
                    <p className="text-sm text-muted">{ad.line}</p>
                    {ad.contact.startsWith("http") && (
                      <a className="mt-1 block truncate text-xs underline" href={ad.contact} rel="noopener noreferrer">{ad.contact.replace(/^https?:\/\//, "")}</a>
                    )}
                  </div>
                </article>
              ))}
              <a href="#advertise" className="flex w-64 shrink-0 flex-col justify-end rounded-2xl border border-white/30 bg-black/30 p-4 backdrop-blur-sm">
                <p className="font-display text-xl font-semibold">Show your business</p>
                <p className="mt-1 text-sm text-white/80">Submit a board. It goes up on the streets after it is approved.</p>
              </a>
            </div>
            <p className="mx-auto mt-2 max-w-5xl text-xs text-white/70">Boards are the same for everyone. They are never chosen from a journal or a mood, and they are not shown in the calm corner or on help screens.</p>
          </section>
        )}
      </div>

      <section id="begin" className="bg-[#f4efe4] px-4 py-12 text-ink">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-semibold">{returning ? "Your life is saved on this device" : "Begin"}</h2>
          <p className="mt-2 text-muted">Walk your cottage, the shops, the club, the farm, the gym and the credit union. Game dollars have no real value and can&apos;t be bought.</p>
          <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-sm">
            <p><strong>This is a game, not therapy, medical advice or a crisis service.</strong> If you are struggling, the <strong>Need help now?</strong> button is on every screen.</p>
            <p className="mt-2 text-muted">Under 18? <Link className="underline" href="/help">Kids Help Phone</Link> is there for you any time. This game is for adults.</p>
          </div>
          {returning ? (
            <div className="mt-6"><Link className="btn" href="/play">Continue my game</Link></div>
          ) : (
            <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (!adult) return; update((s) => ({ ...s, adultConfirmedAt: new Date().toISOString() })); router.push("/onboard"); }}>
              <label className="flex cursor-pointer items-start gap-3 text-lg">
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1.5 h-6 w-6 accent-[#e7a322]" />
                <span>I am 18 or older, and I understand mysanity is a game and not a substitute for professional care.</span>
              </label>
              <button type="submit" className="btn mt-5" disabled={!adult}>Begin</button>
            </form>
          )}
        </div>
      </section>

      <Advertise />
    </div>
  );
}

function Advertise() {
  const [businessName, setBusinessName] = useState("");
  const [line, setLine] = useState("");
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setCrisis(false);
    setNote(null);
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessName, line, detail, contact }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; crisis?: boolean };
      if (data.crisis) setCrisis(true);
      setNote(data.ok ? "Received. It stays off the street until it is approved." : (data.error ?? "That could not be sent."));
      if (data.ok) { setBusinessName(""); setLine(""); setDetail(""); setContact(""); }
    } catch {
      setNote("The town could not take that just now. You can still play.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="advertise" className="bg-[#fffdf8] px-4 py-12 text-ink">
      <form className="mx-auto grid max-w-xl gap-3" onSubmit={(e) => void submit(e)}>
        <h2 className="font-display text-3xl font-semibold">Put your business on a board</h2>
        <p className="text-muted">A person reads every submission before it appears. There is no open chat on the board, and it is never aimed at someone&apos;s private notes.</p>
        <label className="text-sm font-semibold" htmlFor="biz">Business name</label>
        <input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={32} required className="rounded-2xl border border-line bg-surface p-3 text-lg" />
        <label className="text-sm font-semibold" htmlFor="line">Short line</label>
        <input id="line" value={line} onChange={(e) => setLine(e.target.value)} maxLength={80} required className="rounded-2xl border border-line bg-surface p-3 text-lg" />
        <label className="text-sm font-semibold" htmlFor="detail">A little more <span className="font-normal text-muted">(optional)</span></label>
        <input id="detail" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={140} className="rounded-2xl border border-line bg-surface p-3 text-lg" />
        <label className="text-sm font-semibold" htmlFor="contact">Web address or phone <span className="font-normal text-muted">(optional)</span></label>
        <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} autoComplete="off" className="rounded-2xl border border-line bg-surface p-3 text-lg" />
        {crisis && <p className="rounded-2xl border border-softred/50 bg-surface-2 p-3" role="alert">If you are hurting, call or text <a className="underline" href="tel:988">9-8-8</a>. Please write the board another way.</p>}
        {note && <p className="text-sm">{note}</p>}
        <button className="btn mt-1" disabled={busy || businessName.trim().length < 2 || line.trim().length < 2}>{busy ? "Sending" : "Submit for review"}</button>
        <p className="text-xs text-muted">The owner approves boards from a private page, using a key that lives only in the host&apos;s settings. <Link className="underline" href="/admin/boards">Review queue</Link></p>
      </form>
    </section>
  );
}

function Dusk() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1a3148 0%, #c56a3c 38%, #e7b15a 58%, #2f6a4a 78%, #163024 100%)" }} />
      <svg className="absolute inset-x-0 bottom-0 h-[58%] w-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMax slice">
        <ellipse cx="860" cy="70" rx="46" ry="46" fill="#f3d48a" />
        <path d="M0 210 C180 160 260 230 420 190 C560 156 640 210 820 180 C980 154 1080 200 1200 170 V500 H0Z" fill="#1d4a34" />
        <path d="M0 280 H1200 V500 H0Z" fill="#1a3e4a" />
        <path d="M70 250 L120 150 L170 250Z" fill="#143c28" />
        <path d="M140 250 L190 130 L240 250Z" fill="#1c5236" />
        <path d="M980 230 L1040 120 L1100 230Z" fill="#143c28" />
        <rect x="430" y="168" width="150" height="70" fill="#f4e7d4" />
        <path d="M410 176 L505 96 L600 176Z" fill="#9c3b32" />
        <rect x="488" y="200" width="28" height="38" fill="#6b3a22" />
        <rect x="680" y="190" width="90" height="48" fill="#f7f1e6" />
        <path d="M668 196 L725 146 L782 196Z" fill="#2f6d4f" />
        <rect x="250" y="200" width="70" height="40" rx="4" fill="#f7f1e6" />
        <rect x="250" y="200" width="70" height="10" fill="#1f6b4a" />
      </svg>
    </div>
  );
}

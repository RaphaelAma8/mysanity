"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHaven } from "./HavenProvider";
import type { Result } from "@/lib/sim/types";

const NAV = [
  { href: "/play", label: "Home" },
  { href: "/town", label: "Town" },
  { href: "/calm", label: "Calm corner" },
  { href: "/scrapbook", label: "Scrapbook" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header className="mb-4">
      <nav aria-label="Main" className="flex flex-wrap items-center gap-1.5">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${path === n.href ? "bg-surface-2 text-ink ring-1 ring-line" : "text-muted hover:text-ink"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Loading() {
  return <p role="status" className="py-20 text-center text-muted">Loading...</p>;
}

/** Shown after finishing a real exercise (breathing, grounding, journaling). */
export function DoneCard({ res, onAgain, againLabel = "Do it again" }: { res: Result | null; onAgain?: () => void; againLabel?: string }) {
  return (
    <div className="card text-center" role="status">
      <p className="font-display text-2xl font-semibold">Well done for taking that time.</p>
      <p className="mt-2 text-muted">{res?.message ?? "That counts."}</p>
      {res?.gains && res.gains.length > 0 && <p className="mt-1 text-aurora">{res.gains.join("  ·  ")}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onAgain && <button className="btn ghost" onClick={onAgain}>{againLabel}</button>}
        <Link className="btn" href="/play">Back home</Link>
      </div>
    </div>
  );
}

/** Gentle, non-blocking offer of support, shown when writing suggests someone may be struggling. */
export function CrisisNotice() {
  const { openHelp } = useHaven();
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-softred/60 bg-surface-2 p-4">
      <p className="font-display text-lg font-semibold">It sounds like things may be really heavy right now.</p>
      <p className="mt-1 text-muted">Thank you for putting it into words. You deserve support from a real person, and you don&apos;t have to wait until it gets worse.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn" href="tel:988">Call 9-8-8</a>
        <a className="btn ghost" href="sms:988">Text 9-8-8</a>
        <button className="btn ghost" onClick={openHelp}>More support options</button>
      </div>
      <p className="mt-2 text-sm text-muted">If you are in immediate danger, call 911.</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useHaven } from "./HavenProvider";
import { ResourceList } from "./Resources";

/** Visible on every screen. Falls back to the plain /help page if scripts are unavailable. */
export function HelpButton() {
  const { openHelp } = useHaven();
  return (
    <Link
      href="/help"
      onClick={(e) => { e.preventDefault(); openHelp(); }}
      className="btn fixed bottom-4 right-4 z-40 shadow-lg shadow-black/40"
      aria-haspopup="dialog"
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2 0 3.3 1 4 2.2C10.700 6 12 5 14 5c3.400 0 5.100 3.400 3.600 6.800C19.500 16.400 12 21 12 21z" /></svg>
      Need help now?
    </Link>
  );
}

export function CrisisSheet() {
  const { helpOpen, closeHelp } = useHaven();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (helpOpen && !d.open) d.showModal();
    if (!helpOpen && d.open) d.close();
  }, [helpOpen]);
  return (
    <dialog
      ref={ref}
      onClose={closeHelp}
      onClick={(e) => { if (e.target === ref.current) closeHelp(); }}
      aria-labelledby="help-title"
      className="m-auto max-h-[92dvh] w-[min(40rem,94vw)] overflow-y-auto rounded-3xl border border-line bg-surface p-5 text-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="help-title" className="font-display text-2xl font-semibold">You are not alone</h2>
        <button className="btn ghost" onClick={closeHelp} autoFocus>Close</button>
      </div>
      <p className="mb-4 mt-1 text-muted">Support is a call or a text away. You don&apos;t have to be sure you&apos;re in crisis to reach out.</p>
      <ResourceList />
    </dialog>
  );
}

export function QuickExit() {
  return (
    <button
      type="button"
      onClick={() => window.location.replace("https://weather.gc.ca/")}
      className="fixed left-3 top-3 z-40 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line"
      title="Leave this site immediately"
    >
      Quick exit
    </button>
  );
}

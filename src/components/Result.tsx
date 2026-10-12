import type { Result } from "@/lib/sim/types";

/** What just happened, in plain words. Refusals are phrased kindly and shown the same way. */
export function ResultNote({ r }: { r: Result | null }) {
  return (
    <div aria-live="polite" className="min-h-[3.2rem]">
      {r && (
        <div className={`rounded-2xl border px-4 py-2.5 ${r.ok ? "border-aurora/50 bg-surface-2" : "border-line bg-surface"}`}>
          <p>{r.message}</p>
          {r.gains && r.gains.length > 0 && <p className="mt-1 text-sm text-aurora">{r.gains.join("  ·  ")}</p>}
          {r.moment && <p className="mt-1 text-sm text-lantern">📸 Added to your scrapbook: {r.moment.text}</p>}
        </div>
      )}
    </div>
  );
}

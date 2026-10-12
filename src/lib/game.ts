"use client";

import { getSnapshot, update } from "./store";
import type { Result, Sim } from "./sim/types";

/**
 * Runs one game action against the saved character and, if it worked, saves the new state.
 * Always returns the result so the screen can show what happened (including kind refusals).
 */
export function run(fn: (sim: Sim) => Result): Result | null {
  const sim = getSnapshot().sim;
  if (!sim) return null;
  const r = fn(sim);
  if (r.ok && r.sim !== sim) update((s) => ({ ...s, sim: r.sim }));
  return r;
}

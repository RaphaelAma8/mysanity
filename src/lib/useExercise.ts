"use client";

import { useCallback, useState } from "react";
import { run } from "./game";
import { finishExercise } from "./sim/engine";
import type { Result } from "./sim/types";

/** Applies the in-game effect of a real coping exercise once it's finished. */
export function useExercise(id: "breathe" | "ground" | "journal") {
  const [res, setRes] = useState<Result | null>(null);
  const finish = useCallback(() => {
    const r = run((s) => finishExercise(s, id));
    setRes(r ?? { sim: null as never, ok: true, message: "That counts." });
  }, [id]);
  const reset = useCallback(() => setRes(null), []);
  return { res, finish, reset };
}

/**
 * Test-only speed-up so browser tests don't wait minutes. It only exists in builds made with
 * NEXT_PUBLIC_E2E_FAST=1 (never a normal production build).
 */
export function speed(): number {
  if (process.env.NEXT_PUBLIC_E2E_FAST === "1") {
    try {
      if (window.localStorage.getItem("nh_fast") === "1") return 40;
    } catch {
      /* ignore */
    }
  }
  return 1;
}

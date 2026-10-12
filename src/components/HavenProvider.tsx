"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getServerSnapshot, getSnapshot, resetAll, subscribe, update } from "@/lib/store";
import type { State } from "@/lib/state";

interface Ctx {
  state: State;
  ready: boolean;
  update: (fn: (s: State) => State) => void;
  reset: () => void;
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}
const HavenCtx = createContext<Ctx | null>(null);
const noopSubscribe = () => () => {};

export function HavenProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // false on the server and during hydration, true afterwards
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("quiet", state.settings.quiet);
    document.documentElement.classList.toggle("large-text", state.settings.largeText);
  }, [state.settings.quiet, state.settings.largeText]);

  const value = useMemo<Ctx>(
    () => ({ state, ready, update, reset: resetAll, helpOpen, openHelp: () => setHelpOpen(true), closeHelp: () => setHelpOpen(false) }),
    [state, ready, helpOpen],
  );
  return <HavenCtx.Provider value={value}>{children}</HavenCtx.Provider>;
}

export function useHaven(): Ctx {
  const c = useContext(HavenCtx);
  if (!c) throw new Error("useHaven must be used inside HavenProvider");
  return c;
}

/** Sends people to the welcome or setup screen if they haven't completed it. */
export function useRequireProfile() {
  const { state, ready } = useHaven();
  const router = useRouter();
  const path = usePathname();
  const needsWelcome = ready && !state.adultConfirmedAt;
  const needsRegion = ready && !!state.adultConfirmedAt && (!state.region || !state.sim);
  useEffect(() => {
    if (needsWelcome) router.replace("/");
    else if (needsRegion) router.replace("/onboard");
  }, [needsWelcome, needsRegion, router, path]);
  return ready && !needsWelcome && !needsRegion;
}

export function useNow(): Date {
  const [now] = useState(() => new Date());
  return now;
}
export const useCallbackNow = () => useCallback(() => new Date(), []);

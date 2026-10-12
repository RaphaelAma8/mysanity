import { emptyState, loadState, saveState, type State } from "./state";

/**
 * A tiny external store over on-device storage, for useSyncExternalStore.
 * State is read from localStorage on the client only; the server always sees an empty, un-hydrated state.
 */
const SERVER: State = emptyState();
let cache: State | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
const memory = new Map<string, string>();
const kv = () => storage() ?? { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) };

export const getSnapshot = (): State => (cache ??= loadState(kv()));
export const getServerSnapshot = (): State => SERVER;
export function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key.startsWith("mysanity") || e.key.startsWith("north-haven")) { cache = null; cb(); } };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); if (typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
}
export function update(fn: (s: State) => State) {
  cache = fn(getSnapshot());
  saveState(kv(), cache);
  listeners.forEach((l) => l());
}
export function replace(next: State) {
  update(() => next);
}
export function resetAll() {
  const s = storage();
  try { s?.removeItem("mysanity:v1"); s?.removeItem("north-haven:v1"); } catch { /* ignore */ }
  memory.clear();
  cache = emptyState();
  listeners.forEach((l) => l());
}

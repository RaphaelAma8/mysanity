import { CLOUD_KEY } from "@/lib/state";

export interface CloudSession {
  token: string;
  id: string;
  friendCode: string;
  displayName: string;
  share: boolean;
}

export function loadCloud(): CloudSession | null {
  try {
    const raw = localStorage.getItem(CLOUD_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CloudSession>;
    if (!p || typeof p.token !== "string" || typeof p.id !== "string") return null;
    return {
      token: p.token,
      id: p.id,
      friendCode: String(p.friendCode ?? ""),
      displayName: String(p.displayName ?? ""),
      share: p.share === true,
    };
  } catch {
    return null;
  }
}

export function saveCloud(session: CloudSession | null) {
  try {
    if (!session) localStorage.removeItem(CLOUD_KEY);
    else localStorage.setItem(CLOUD_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked: the town stays single-player */
  }
}

export async function cloudFetch(path: string, token: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({ ok: false, error: "The town could not answer." }));
  return { status: res.status, ok: res.ok, data: data as { ok?: boolean; error?: string; crisis?: boolean; [key: string]: unknown } };
}

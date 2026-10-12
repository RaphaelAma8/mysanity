import { detectCrisis } from "@/lib/crisis";
import { sanitizeSim } from "@/lib/state";
import type { Sim } from "@/lib/sim/types";

const PRIVATE_KEYS = new Set(["journal", "checkins", "checkin", "entry"]);

/** True when a payload tries to carry the journal or a mood check-in. Those stay on the device. */
export function containsPrivateFields(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object" || depth > 6) return false;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(key)) return true;
    if (child && typeof child === "object" && containsPrivateFields(child, depth + 1)) return true;
  }
  return false;
}

/** The only thing a cloud save is allowed to hold. */
export function cloudSim(value: unknown): Sim | null {
  if (containsPrivateFields(value)) return null;
  return sanitizeSim(value);
}

const HOSTILE = /\b(nigger|faggot|retard|kike|spic|chink|tranny)\b/i;

export interface NameOk { ok: true; name: string }
export interface NameNo { ok: false; crisis: boolean; reason: string }

/** Public names (the shared town). Letters and spaces, no crisis language. */
export function moderatePublicName(raw: string): NameOk | NameNo {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  if (name.length < 2) return { ok: false, crisis: false, reason: "Please use at least 2 characters." };
  if (!/^[\p{L}\p{N} '\-]+$/u.test(name)) return { ok: false, crisis: false, reason: "Use letters, numbers and spaces." };
  if (detectCrisis(name)) return { ok: false, crisis: true, reason: "That name sounds really heavy. If you are hurting, 9-8-8 is there. Please pick a different name for the town." };
  if (HOSTILE.test(name)) return { ok: false, crisis: false, reason: "Please choose a different name." };
  return { ok: true, name };
}

export function moderatePetName(raw: string): NameOk | NameNo {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!name) return { ok: true, name: "Miso" };
  if (detectCrisis(name)) return { ok: false, crisis: true, reason: "That name sounds really heavy. If you are hurting, 9-8-8 is there. You can still bring a cat home under another name." };
  return { ok: true, name };
}

export function databaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const url = env.DATABASE_URL ?? "";
  return /^postgres(ql)?:\/\//.test(url);
}

import { detectCrisis } from "@/lib/crisis";
import { containsPrivateFields } from "@/lib/social/guard";

/** Fixed paint colours. Callers cannot pass a style string. */
export const AD_ACCENTS = ["#1f6b4a", "#8c3b32", "#1e4d6b", "#6b4a32", "#3d4a6b"] as const;

const PRESSURE = /\b(hurry|limited time|last chance|act now|only today|sale ends|loot|streak|leaderboard)\b/i;
const HOSTILE = /\b(nigger|faggot|retard|kike|spic|chink|tranny)\b/i;

export interface AdDraft {
  businessName: string;
  line: string;
  detail: string;
  contact: string;
  accent: string;
}

export type AdVerdict =
  | { ok: true; ad: AdDraft }
  | { ok: false; crisis: boolean; reason: string };

function words(raw: unknown, max: number) {
  return String(raw ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function accentFor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % AD_ACCENTS.length;
  return AD_ACCENTS[n];
}

function contactOf(raw: unknown): { ok: true; contact: string } | { ok: false; reason: string } {
  const c = words(raw, 120);
  if (!c) return { ok: true, contact: "" };
  if (/^https?:\/\//i.test(c)) {
    try {
      const url = new URL(c);
      if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "Use an https web address." };
      return { ok: true, contact: url.toString().slice(0, 120) };
    } catch {
      return { ok: false, reason: "That web address could not be read." };
    }
  }
  if (/^[\d\s()+-]{7,22}$/.test(c)) return { ok: true, contact: c };
  return { ok: false, reason: "Add an https web address or a phone number, or leave contact blank." };
}

/**
 * Review a business submission. The same rules apply to every board.
 * Journal text, mood, and check-ins are refused and never stored.
 */
export function moderateAd(body: unknown): AdVerdict {
  if (containsPrivateFields(body)) {
    return { ok: false, crisis: false, reason: "Boards can't include a journal or a mood check-in." };
  }
  const src = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if ("mood" in src || "score" in src) {
    return { ok: false, crisis: false, reason: "Boards are the same for everyone. They are not chosen from a mood." };
  }
  const businessName = words(src.businessName, 32);
  const line = words(src.line, 80);
  const detail = words(src.detail, 140);
  if (businessName.length < 2) return { ok: false, crisis: false, reason: "Add the business name." };
  if (line.length < 2) return { ok: false, crisis: false, reason: "Add a short line for the board." };
  const blob = `${businessName} ${line} ${detail}`;
  if (detectCrisis(blob)) {
    return { ok: false, crisis: true, reason: "That wording sounds really heavy. If you are hurting, 9-8-8 is there. Please write the board another way." };
  }
  if (HOSTILE.test(blob) || PRESSURE.test(blob)) {
    return { ok: false, crisis: false, reason: "Please rewrite that without pressure or unkind language. Boards stay up, and prices in town never change." };
  }
  const contact = contactOf(src.contact);
  if (!contact.ok) return { ok: false, crisis: false, reason: contact.reason };
  return { ok: true, ad: { businessName, line, detail, contact: contact.contact, accent: accentFor(businessName) } };
}

export interface ApprovedAd {
  id: string;
  businessName: string;
  line: string;
  accent: string;
  contact: string;
}

export interface PaintedBoard {
  id: string;
  x: number;
  y: number;
  ad: ApprovedAd | null;
}

/** Same boards for every person. Sorting is by id, never by anything about the viewer. */
export function assignBoards<T extends { id: string; x: number; y: number }>(slots: T[], ads: ApprovedAd[]): PaintedBoard[] {
  const ordered = [...ads].sort((a, b) => a.id.localeCompare(b.id));
  return slots.map((slot, i) => ({
    id: slot.id,
    x: slot.x,
    y: slot.y,
    ad: ordered.length ? ordered[i % ordered.length] : null,
  }));
}

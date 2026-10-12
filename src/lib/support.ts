import type { Checkin, Mood } from "./state";
import { dayKey } from "./state";

export type SupportLevel = "none" | "soft" | "strong";

/** Latest mood per calendar day for the last `days` days, most recent first. */
function dailyMoods(checkins: Checkin[], now: Date, days = 7): Mood[] {
  const cutoff = now.getTime() - days * 86_400_000;
  const byDay = new Map<string, Checkin>();
  for (const c of checkins) {
    const t = new Date(c.at).getTime();
    if (t < cutoff) continue;
    const k = dayKey(new Date(c.at));
    const cur = byDay.get(k);
    if (!cur || cur.at < c.at) byDay.set(k, c);
  }
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, c]) => c.mood);
}

/**
 * How strongly to offer support after a check-in. No scores and no judgement:
 * - "soft": today felt low, so make support easy to find
 * - "strong": several recent days in a row felt low, so gently suggest talking to someone
 */
export function supportLevel(checkins: Checkin[], now: Date): SupportLevel {
  const days = dailyMoods(checkins, now);
  if (days.length >= 3 && days.slice(0, 3).every((m) => m <= 2)) return "strong";
  if (days.length >= 1 && days[0] <= 2) return "soft";
  return "none";
}

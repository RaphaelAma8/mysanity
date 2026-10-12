import { actionById } from "./data";
import { availability, moodOf } from "./engine";
import { NEED_KEYS, type NeedKey, type Sim } from "./types";

export const SKIN = ["#F8D9C0", "#EBC09A", "#D2A173", "#B27B52", "#8A5A3C", "#5E3B27"];
export const HAIR = ["#2B2118", "#5A3A22", "#A9672E", "#D8B45A", "#B33A2E", "#7C8A99"];
export const SHIRT = ["#D7261E", "#1F6B9B", "#1E6B52", "#F0B23E", "#6B4FA3", "#2B2F36"];
export const STYLES = ["Short", "Long", "Bun", "Curly"];

/** Which actions best help each need, in order of preference. */
const HELPERS: Record<NeedKey, string[]> = {
  energy: ["nap"],
  hunger: ["cook", "takeout"],
  hygiene: ["shower"],
  fun: ["guitar", "paint", "radio", "read", "tv"],
  social: ["call_friend", "pet_time"],
  calm: ["breathe", "ground", "pet_time", "water_plants", "tidy"],
};

/** A gentle nudge, never an order: the thing most likely to help right now. */
export function suggestNext(s: Sim): { actionId: string; label: string; need: NeedKey } | null {
  const lowest = [...NEED_KEYS].sort((a, b) => s.needs[a] - s.needs[b])[0];
  for (const need of [lowest, ...NEED_KEYS.filter((k) => k !== lowest).sort((a, b) => s.needs[a] - s.needs[b])]) {
    for (const id of HELPERS[need]) {
      if (availability(s, id).ok) return { actionId: id, label: actionById(id)!.label, need };
    }
  }
  return null;
}

export const isRough = (s: Sim) => moodOf(s.needs).tier === "rough";

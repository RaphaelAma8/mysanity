/** Preset kind notes and emotes. There is no open chat box. */
export const KIND_PRESETS = [
  { id: "wave", label: "Wave", emoji: "👋", text: "waves hello" },
  { id: "glad", label: "Glad you're here", emoji: "💛", text: "is glad you're here" },
  { id: "showed-up", label: "You showed up", emoji: "🌱", text: "notices that you showed up today" },
  { id: "rest", label: "Rest counts", emoji: "🛋️", text: "reminds you that rest counts" },
  { id: "breathe", label: "A slow breath", emoji: "🌬️", text: "offers a slow breath, if you want one" },
  { id: "company", label: "No rush", emoji: "🍵", text: "says there is no rush" },
] as const;

export const EMOTES = [
  { id: "wave", emoji: "👋", label: "Wave" },
  { id: "heart", emoji: "💛", label: "Warmth" },
  { id: "tea", emoji: "🍵", label: "Tea" },
  { id: "leaf", emoji: "🍃", label: "Calm" },
  { id: "star", emoji: "✨", label: "A small good thing" },
] as const;

export type PresetId = (typeof KIND_PRESETS)[number]["id"];
export type EmoteId = (typeof EMOTES)[number]["id"];

export const presetById = (id: string) => KIND_PRESETS.find((p) => p.id === id) ?? null;
export const emoteById = (id: string) => EMOTES.find((p) => p.id === id) ?? null;

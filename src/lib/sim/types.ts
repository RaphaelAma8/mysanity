export type NeedKey = "energy" | "hunger" | "hygiene" | "fun" | "social" | "calm";
export type Needs = Record<NeedKey, number>;
export const NEED_KEYS: NeedKey[] = ["energy", "hunger", "hygiene", "fun", "social", "calm"];
export const NEED_META: Record<NeedKey, { label: string; icon: string; color: string }> = {
  energy: { label: "Energy", icon: "⚡", color: "#F0B23E" },
  hunger: { label: "Fed", icon: "🍲", color: "#E0742B" },
  hygiene: { label: "Fresh", icon: "🚿", color: "#2FA3A0" },
  fun: { label: "Fun", icon: "🎈", color: "#B455D6" },
  social: { label: "Connected", icon: "💬", color: "#3C7DA6" },
  calm: { label: "Calm", icon: "🍃", color: "#5ED1B8" },
};

export const BLOCKS_PER_DAY = 5;
export const BLOCK_NAMES = ["Morning", "Midday", "Afternoon", "Evening", "Night"];
export const MAX_SHIFTS_PER_DAY = 2;

export interface Avatar { skin: number; hair: number; style: number; shirt: number }
export interface Moment { day: number; text: string; icon: string }

/** Everything about the player's character and home. Saved only on the device. */
export interface Sim {
  v: 1;
  startedAt: string;
  day: number;
  block: number;
  money: number;
  needs: Needs;
  groceries: number;
  petFood: number;
  inventory: string[];
  pet: { name: string } | null;
  friends: Record<string, number>;
  shiftsToday: number;
  helpedToday: boolean;
  visitedToday: string[];
  moments: Moment[];
  lastBillDay: number;
  avatar: Avatar;
  travelled: string[];
  petFedToday: boolean;
  supportedByCommunity: number;
}

export interface Result {
  sim: Sim;
  ok: boolean;
  message: string;
  /** Short list of effects for floating text, e.g. "+45 Fed" */
  gains?: string[];
  moment?: Moment;
}

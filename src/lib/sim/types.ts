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
export interface Placement { homeId: string; itemId: string; x: number; y: number }
export interface BusinessBoard { name: string; line: string }

/** The character and home. Kept on the device. A cloud copy, if the person asks for one, is this object only. */
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
  /** Optional small things done today. Cleared at bedtime. Missing one changes nothing. */
  littleWins: string[];
  /** Cars you can drive. Optional, and never taken away. */
  cars: string[];
  /** Which owned car is on the street. Null when you are walking. */
  carId: string | null;
  /** A friend invited into the home. Other players are never drawn here. */
  visitor: string | null;
  /** Which owned home you are in. The cottage is always included. */
  homeId: string;
  homes: string[];
  /** Where furniture sits inside a home. The item itself stays in inventory. */
  placements: Placement[];
  /** Shops the player owns. Unpaid weekly rent is covered; the shop is never lost. */
  businesses: string[];
  businessBoard: BusinessBoard | null;
}

export const LITTLE_WINS: { id: string; label: string; icon: string }[] = [
  { id: "outside", label: "Step outside", icon: "🌲" },
  { id: "nourish", label: "Eat something", icon: "🍲" },
  { id: "connect", label: "Be with someone", icon: "💛" },
  { id: "settle", label: "Settle for a moment", icon: "🍃" },
];

export interface Result {
  sim: Sim;
  ok: boolean;
  message: string;
  /** Short list of effects for floating text, e.g. "+45 Fed" */
  gains?: string[];
  moment?: Moment;
}

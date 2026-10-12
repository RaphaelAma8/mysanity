import { HAIR, SHIRT, SKIN } from "@/lib/sim/look";
import type { Avatar } from "@/lib/sim/types";

/** A small cartoon person. Origin is at the feet, about 80 units tall. */
export function Figure({ avatar, mood = "okay" }: { avatar: Avatar; mood?: "good" | "okay" | "low" | "rough" }) {
  const skin = SKIN[avatar.skin], hair = HAIR[avatar.hair], shirt = SHIRT[avatar.shirt], st = avatar.style;
  const mouth = mood === "good" ? "M-4 -62 Q0 -57 4 -62" : mood === "okay" ? "M-3 -60 H3" : "M-4 -57 Q0 -62 4 -57";
  return (
    <g>
      {st === 1 && <path d="M-12 -72 Q-17 -50 -11 -42 L11 -42 Q17 -50 12 -72Z" fill={hair} />}
      {st === 3 && <circle cx="0" cy="-70" r="17" fill={hair} />}
      <rect x="-8" y="-28" width="7" height="26" rx="3" fill="#2F4156" />
      <rect x="1" y="-28" width="7" height="26" rx="3" fill="#2F4156" />
      <ellipse cx="-5" cy="-2" rx="6" ry="3" fill="#1d2530" />
      <ellipse cx="5" cy="-2" rx="6" ry="3" fill="#1d2530" />
      <rect x="-11" y="-54" width="22" height="30" rx="7" fill={shirt} />
      <rect x="-17" y="-52" width="7" height="22" rx="3.5" fill={shirt} />
      <rect x="10" y="-52" width="7" height="22" rx="3.5" fill={shirt} />
      <circle cx="-13.500" cy="-30" r="3.500" fill={skin} />
      <circle cx="13.500" cy="-30" r="3.500" fill={skin} />
      <rect x="-3" y="-58" width="6" height="5" fill={skin} />
      <circle cx="0" cy="-67" r="12" fill={skin} />
      <path d="M-12.500 -68 C-14 -86 14 -86 12.500 -68 C7 -75 -7 -75 -12.500 -68Z" fill={hair} />
      {st === 2 && <circle cx="0" cy="-88" r="5.500" fill={hair} />}
      <circle cx="-4.200" cy="-68" r="1.600" fill="#3b2418" />
      <circle cx="4.200" cy="-68" r="1.600" fill="#3b2418" />
      <path d={mouth} stroke="#3b2418" fill="none" strokeWidth="1.600" strokeLinecap="round" />
    </g>
  );
}

import { HAIR, SHIRT, SKIN } from "@/lib/sim/look";
import type { Avatar } from "@/lib/sim/types";

/** Character preview. Feet at the origin, head near -70. Matches the person you walk as. */
export function Figure({ avatar, mood = "okay" }: { avatar: Avatar; mood?: "good" | "okay" | "low" | "rough" }) {
  const skin = SKIN[avatar.skin];
  const hair = HAIR[avatar.hair];
  const shirt = SHIRT[avatar.shirt];
  const st = avatar.style;
  const mouth = mood === "good" ? "M-3.2 -50 Q0 -46.6 3.2 -50" : mood === "rough" ? "M-3.2 -46.2 Q0 -49.4 3.2 -46.2" : mood === "low" ? "M-3 -48.2 Q0 -47.2 3 -48.8" : "M-2.6 -48.4 H2.6";
  return (
    <g>
      <ellipse cx="0" cy="-2" rx="12" ry="4" fill="rgba(24,18,12,0.18)" />
      <rect x="-7.2" y="-24" width="6" height="20" rx="3" fill="#2a3544" />
      <rect x="1.2" y="-24" width="6" height="20" rx="3" fill="#2a3544" />
      <ellipse cx="-4.2" cy="-3.2" rx="4.2" ry="2.2" fill="#1c2430" />
      <ellipse cx="4.2" cy="-3.2" rx="4.2" ry="2.2" fill="#1c2430" />
      <path d="M-10 -52 C-12 -30 -8 -24 -7 -24 L7 -24 C8 -24 12 -30 10 -52 Z" fill={shirt} />
      <path d="M-6 -50 Q0 -42 6 -50 L4 -38 Q0 -42 -4 -38 Z" fill="#fff" opacity="0.18" />
      <rect x="-16" y="-50" width="6" height="16" rx="3" fill={shirt} />
      <rect x="10" y="-50" width="6" height="16" rx="3" fill={shirt} />
      <ellipse cx="-13" cy="-32" rx="2.6" ry="3" fill={skin} />
      <ellipse cx="13" cy="-32" rx="2.6" ry="3" fill={skin} />
      <rect x="-2.4" y="-56" width="4.8" height="6" rx="2" fill={skin} />
      <ellipse cx="0" cy="-66" rx="11" ry="12.4" fill={skin} />
      <ellipse cx="-10" cy="-64" rx="2.2" ry="3" fill={skin} opacity="0.85" />
      <ellipse cx="10" cy="-64" rx="2.2" ry="3" fill={skin} opacity="0.85" />
      {st === 1 && <path d="M-12 -70 Q-16 -48 -11 -42 L11 -42 Q16 -48 12 -70 Q6 -78 -12 -70Z" fill={hair} />}
      {st === 2 && <g><path d="M-11 -68 Q0 -84 11 -68 Q6 -76 -6 -76Z" fill={hair} /><circle cx="0" cy="-82" r="5" fill={hair} /></g>}
      {st === 3 && <g><circle cx="-7" cy="-76" r="5" fill={hair} /><circle cx="7" cy="-76" r="5" fill={hair} /><circle cx="0" cy="-80" r="5.5" fill={hair} /><path d="M-11 -70 C-13 -84 13 -84 11 -70 C5 -76 -5 -76 -11 -70Z" fill={hair} /></g>}
      {st === 0 && <path d="M-11 -68 C-12 -82 12 -82 11 -68 C6 -74 -6 -74 -11 -68Z" fill={hair} />}
      <ellipse cx="-4" cy="-66" rx="2" ry="1.3" fill="#f7f4ef" />
      <ellipse cx="4" cy="-66" rx="2" ry="1.3" fill="#f7f4ef" />
      <circle cx="-3.7" cy="-66" r="0.9" fill="#3a2a22" />
      <circle cx="4.3" cy="-66" r="0.9" fill="#3a2a22" />
      <path d="M0 -64.5 V-62" stroke={skin} strokeWidth="1.2" />
      <path d={mouth} stroke="#4a3024" fill="none" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

"use client";

import { Figure } from "./Figure";
import { has } from "@/lib/sim/engine";
import { moodOf, type Weather } from "@/lib/sim/engine";
import type { Sim } from "@/lib/sim/types";
import { regionById } from "@/data/regions";

export type Spot = "bed" | "desk" | "bath" | "cushion" | "kitchen" | "couch" | "door";
export const SPOTS: Record<Spot, { stand: number; label: string; aria: string }> = {
  bed: { stand: 58, label: "Bed", aria: "Bed: nap or go to sleep" },
  desk: { stand: 150, label: "Desk", aria: "Desk and notebook: write in your notebook" },
  bath: { stand: 210, label: "Bathroom", aria: "Bathroom: have a shower or tidy up" },
  cushion: { stand: 257, label: "Calm corner", aria: "Calm corner: breathe or ground yourself" },
  kitchen: { stand: 321, label: "Kitchen", aria: "Kitchen: cook or order takeout" },
  couch: { stand: 395, label: "Couch", aria: "Couch: watch something, call a friend, hobbies and your pet" },
  door: { stand: 457, label: "Door", aria: "Door: go into town" },
};
const SKY = ["#F6C9A8", "#9ED2F2", "#B9D6F0", "#F2A06B", "#16213B"];
const BLOCK_X_PET = [395, 60, 240, 395, 60];

export interface Float { id: number; text: string; x: number }

export function Room({ sim, weather, regionId, selected, avatarX, onPick, floats, sleeping }: {
  sim: Sim; weather: Weather; regionId: string; selected: Spot | null; avatarX: number; onPick: (s: Spot) => void; floats: Float[]; sleeping: boolean;
}) {
  const t = regionById(regionId)?.theme;
  const block = Math.min(4, sim.block);
  const night = sleeping ? 1 : block === 4 ? 0.45 : block === 3 ? 0.14 : 0;
  const cozy = sim.inventory.length;
  const wall = cozy >= 6 ? "#E6D6C2" : cozy >= 3 ? "#DCD6CC" : "#D3D9DF";
  const mood = moodOf(sim.needs).tier;
  const sky = sleeping ? SKY[4] : SKY[block];
  const hot = (key: Spot, x: number, y: number, w: number, h: number) => (
    <g key={key} className={`obj ${selected === key ? "sel" : ""}`} role="button" tabIndex={0} aria-label={SPOTS[key].aria}
       onClick={() => onPick(key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(key); } }}>
      <rect className="hl" x={x} y={y} width={w} height={h} rx="8" />
      <rect x={x} y={y} width={w} height={h} fill="transparent" />
    </g>
  );
  const plantsOwned = sim.inventory.filter((i) => i.startsWith("plant_"));
  return (
    <svg viewBox="0 0 480 300" role="group" aria-label="Your home" className="w-full rounded-3xl border border-line">
      <defs><radialGradient id="lampglow"><stop offset="0" stopColor="#FFE9A8" stopOpacity=".85" /><stop offset="1" stopColor="#FFE9A8" stopOpacity="0" /></radialGradient></defs>
      <rect width="480" height="212" fill={wall} />
      <rect y="196" width="480" height="16" fill="#000" opacity=".06" />
      <rect y="212" width="480" height="88" fill="#B58B5E" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M0 ${230 + i * 19} H480`} stroke="#000" opacity=".07" strokeWidth="2" />)}
      {has(sim, "rug") && <><ellipse cx="240" cy="266" rx="118" ry="14" fill="#7E9BB5" opacity=".6" /><ellipse cx="240" cy="266" rx="92" ry="9" fill="#D7261E" opacity=".25" /></>}

      {/* window */}
      <rect x="128" y="36" width="84" height="88" rx="3" fill={sky} />
      <clipPath id="winclip"><rect x="128" y="36" width="84" height="88" rx="3" /></clipPath>
      <g clipPath="url(#winclip)">
        {weather === "sunny" && block < 4 && !sleeping && <circle cx={150 + block * 14} cy={60} r="9" fill="#FFD96B" />}
        {(block === 4 || sleeping) && <><circle cx="190" cy="56" r="7" fill="#E8EEF6" />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={138 + i * 16} cy={48 + (i * 13) % 30} r="1" fill="#fff" />)}</>}
        {weather === "cloudy" && <><ellipse cx="160" cy="62" rx="20" ry="8" fill="#fff" opacity=".8" /><ellipse cx="190" cy="74" rx="18" ry="7" fill="#fff" opacity=".7" /></>}
        {weather === "rain" && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${136 + i * 10} ${48 + (i * 17) % 40} l-3 9`} stroke="#fff" strokeOpacity=".7" />)}
        {weather === "snow" && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <circle key={i} className="twinkle" cx={134 + i * 8} cy={44 + (i * 23) % 62} r="1.8" fill="#fff" />)}
        <path d="M128 112 C150 98 175 108 212 100 V124 H128Z" fill={t?.ground ?? "#41704F"} opacity=".9" />
        {weather === "snow" && <path d="M128 116 C150 106 175 114 212 108 V124 H128Z" fill="#F4F8FA" />}
      </g>
      <rect x="128" y="36" width="84" height="88" rx="3" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M170 36 V124 M128 80 H212" stroke="#fff" strokeWidth="3" />

      {has(sim, "string_lights") && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => <circle key={i} cx={14 + i * 24.500} cy={20 + Math.sin(i * 0.9) * 4} r="3" fill={["#FFD27A", "#FF8F8F", "#8FD0FF"][i % 3]} className="twinkle" style={{ animationDelay: `${(i % 4) * 0.5}s` }} />)}
      {has(sim, "poster_forest") && <g><rect x="232" y="46" width="34" height="46" rx="2" fill="#fff" stroke="#6B4A32" strokeWidth="3" /><text x="249" y="76" fontSize="22" textAnchor="middle" aria-hidden>🌲</text></g>}
      {has(sim, "poster_aurora") && <g><rect x="276" y="46" width="34" height="46" rx="2" fill="#fff" stroke="#6B4A32" strokeWidth="3" /><text x="293" y="76" fontSize="22" textAnchor="middle" aria-hidden>🌌</text></g>}
      <g aria-hidden><rect x="364" y="78" width="78" height="5" rx="1" fill="#6B4A32" />
        {has(sim, "bookshelf") && <text x="372" y="74" fontSize="16">📚</text>}{has(sim, "guitar") && <text x="396" y="74" fontSize="16">🎸</text>}{has(sim, "easel") && <text x="418" y="74" fontSize="16">🎨</text>}</g>

      {/* bed */}
      <g aria-hidden><rect x="8" y="150" width="10" height="62" rx="3" fill="#6B4A32" /><rect x="8" y="198" width="100" height="14" rx="3" fill="#6B4A32" /><rect x="18" y="176" width="90" height="24" rx="6" fill="#F4F1EA" />
        <rect x="46" y="172" width="62" height="28" rx="6" fill="#5C7C99" /><rect x="22" y="166" width="26" height="14" rx="7" fill="#fff" /></g>
      {/* desk */}
      <g aria-hidden><rect x="116" y="170" width="72" height="7" rx="2" fill="#8A6B4E" /><rect x="120" y="177" width="5" height="35" fill="#6B4F37" /><rect x="179" y="177" width="5" height="35" fill="#6B4F37" />
        <rect x="132" y="162" width="26" height="9" rx="1" fill="#F4F1EA" stroke="#8A6B4E" /><path d="M145 162 V171" stroke="#8A6B4E" />{has(sim, "radio") && <text x="162" y="168" fontSize="15">📻</text>}</g>
      {/* bathroom door */}
      <g aria-hidden><rect x="194" y="126" width="32" height="86" rx="2" fill="#F4F1EA" /><rect x="198" y="130" width="24" height="78" rx="2" fill="#9DC4D6" /><circle cx="217" cy="170" r="2.500" fill="#E9C46A" /><text x="210" y="156" fontSize="14" textAnchor="middle">🚿</text></g>
      {/* calm cushion */}
      <g aria-hidden><ellipse cx="257" cy="248" rx="25" ry="11" fill="#3FA28F" /><ellipse cx="257" cy="244" rx="20" ry="8" fill="#5ED1B8" /></g>
      {/* kitchen */}
      <g aria-hidden><rect x="290" y="128" width="28" height="84" rx="3" fill="#E9EEF1" /><rect x="290" y="158" width="28" height="2.500" fill="#B8C4CC" /><rect x="312" y="140" width="2.500" height="12" fill="#8794A0" />
        <rect x="318" y="170" width="36" height="42" fill="#8C9AA8" /><rect x="316" y="166" width="40" height="6" rx="2" fill="#D6DEE4" /></g>
      {/* couch + TV */}
      <g aria-hidden>
        <rect x="372" y="100" width="46" height="30" rx="3" fill="#161e29" /><rect x="375" y="103" width="40" height="24" fill="#EAF6FF" /><rect x="394" y="103" width="2" height="24" fill="#D7261E" />
        {has(sim, "cozy_couch")
          ? <><rect x="352" y="160" width="84" height="28" rx="9" fill="#7F5A7A" /><rect x="346" y="172" width="96" height="40" rx="9" fill="#9A6F94" /><rect x="342" y="170" width="16" height="42" rx="7" fill="#6E4C69" /><rect x="430" y="170" width="16" height="42" rx="7" fill="#6E4C69" /></>
          : <><rect x="360" y="164" width="70" height="26" rx="8" fill="#53708C" /><rect x="356" y="174" width="78" height="38" rx="8" fill="#6483A1" /><rect x="352" y="176" width="14" height="36" rx="6" fill="#4A647D" /><rect x="424" y="176" width="14" height="36" rx="6" fill="#4A647D" /></>}
        {has(sim, "throw_blanket") && <rect x="382" y="176" width="40" height="16" rx="5" fill="#D7261E" opacity=".9" />}
      </g>
      {has(sim, "lamp") && <g aria-hidden><rect x="340" y="132" width="4" height="80" fill="#2b3036" /><circle cx="342" cy="128" r="9" fill="#FFE9A8" />{block >= 3 && <circle cx="342" cy="128" r="46" fill="url(#lampglow)" />}</g>}
      {/* plants (up to three) */}
      {plantsOwned[0] && <text x="156" y="166" fontSize="20" aria-hidden>🪴</text>}
      {plantsOwned[1] && <text x="124" y="214" fontSize="22" aria-hidden>🌱</text>}
      {plantsOwned[2] && <text x="327" y="164" fontSize="18" aria-hidden>🌿</text>}
      {/* door */}
      <g aria-hidden><rect x="436" y="100" width="42" height="112" rx="2" fill="#F4F1EA" /><rect x="440" y="104" width="34" height="104" rx="2" fill="#7A4B2E" /><rect x="445" y="112" width="24" height="24" rx="2" fill="#BFD7E6" /><circle cx="468" cy="160" r="3" fill="#E9C46A" /><rect x="432" y="208" width="50" height="6" rx="2" fill="#D7261E" /></g>

      {/* pet */}
      {sim.pet && <g aria-hidden transform={`translate(${BLOCK_X_PET[block]} ${block === 1 || block === 4 ? 192 : block === 2 ? 270 : 206})`}><ellipse cx="0" cy="0" rx="13" ry="8" fill="#E0A96B" /><circle cx="12" cy="-6" r="7" fill="#E0A96B" /><path d="M8 -12 L10 -18 L13 -12Z M13 -12 L16 -18 L18 -11Z" fill="#E0A96B" /><path d="M-12 0 C-22 -4 -22 -14 -14 -14" stroke="#E0A96B" strokeWidth="4" fill="none" strokeLinecap="round" /><circle cx="14" cy="-7" r="1" fill="#222" /></g>}

      {/* hotspots */}
      {hot("bed", 6, 146, 106, 68)}
      {hot("desk", 114, 150, 76, 66)}
      {hot("bath", 192, 124, 36, 90)}
      {hot("cushion", 228, 230, 58, 32)}
      {hot("kitchen", 288, 126, 70, 88)}
      {hot("couch", 340, 96, 104, 120)}
      {hot("door", 434, 98, 46, 116)}

      {/* labels */}
      {(Object.keys(SPOTS) as Spot[]).map((k) => (
        <g key={k} aria-hidden><rect x={SPOTS[k].stand - 30} y="284" width="60" height="14" rx="7" fill="#0F2230" opacity=".78" /><text x={SPOTS[k].stand} y="294" textAnchor="middle" fontSize="8.500" fill="#fff">{SPOTS[k].label}</text></g>
      ))}

      {/* you */}
      {!sleeping && (
        <g style={{ transform: `translate(${avatarX}px, 272px)`, transition: "transform .6s ease-in-out" }} className="avatar-g">
          <ellipse cx="0" cy="1" rx="14" ry="4" fill="#000" opacity=".18" />
          <g transform="scale(.95)"><Figure avatar={sim.avatar} mood={mood} /></g>
        </g>
      )}
      {sleeping && <g aria-hidden><text className="zzz" x="60" y="172" fontSize="16" fill="#0F2230">z</text><text className="zzz z2" x="72" y="160" fontSize="20" fill="#0F2230">Z</text></g>}
      {floats.map((f) => <text key={f.id} className="fx" x={f.x} y="170" textAnchor="middle" fontSize="14">{f.text}</text>)}
      <rect width="480" height="300" fill="#0B1A2B" opacity={night} pointerEvents="none" />
    </svg>
  );
}

import { HAIR, SHIRT, SKIN } from "@/lib/sim/look";
import { moodOf, seasonOf, dateOf, type Season, type Weather } from "@/lib/sim/engine";
import type { Avatar, Sim } from "@/lib/sim/types";
import { GROUND, TILE_PX, type Building, type Prop, type WorldMap } from "./maps";

export interface Actor {
  id?: string;
  x: number;
  y: number;
  name?: string;
  avatar: Avatar;
  facing: 1 | -1;
  moving: boolean;
  emote?: string | null;
  self?: boolean;
}

export interface Sign {
  x: number;
  y: number;
  name: string;
  line: string;
  accent: string;
}

export interface DrawInput {
  map: WorldMap;
  cam: { x: number; y: number };
  viewW: number;
  viewH: number;
  player: Actor;
  others: Actor[];
  sim: Sim;
  weather: Weather;
  time: number;
  quiet: boolean;
  font: string;
  signs?: Sign[];
}

const round = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (c: number) => Math.max(0, Math.min(255, c + amt));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

function drawTile(ctx: CanvasRenderingContext2D, map: WorldMap, x: number, y: number, season: Season, weather: Weather) {
  const g = map.ground[y * map.w + x];
  const px = x * TILE_PX;
  const py = y * TILE_PX;
  const snow = season === "winter" && weather !== "rain";
  if (g === GROUND.water) {
    ctx.fillStyle = "#2f86b0";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(px, py + 10, TILE_PX, 3);
    ctx.fillRect(px, py + 28, TILE_PX, 2);
    return;
  }
  if (g === GROUND.sand) {
    ctx.fillStyle = snow ? "#e7eef2" : "#f0d7a4";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    return;
  }
  if (g === GROUND.path) {
    ctx.fillStyle = snow ? "#e4edf2" : "#e6d3ae";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    ctx.strokeStyle = snow ? "rgba(255,255,255,0.45)" : "rgba(120,90,50,0.18)";
    ctx.strokeRect(px + 6, py + 6, TILE_PX - 12, TILE_PX - 12);
    return;
  }
  if (g === GROUND.floor || g === GROUND.plank) {
    ctx.fillStyle = g === GROUND.plank ? "#c8956a" : "#d7b48a";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    ctx.strokeStyle = "rgba(90,55,30,0.18)";
    ctx.beginPath();
    ctx.moveTo(px, py + TILE_PX / 2);
    ctx.lineTo(px + TILE_PX, py + TILE_PX / 2);
    ctx.stroke();
    return;
  }
  if (g === GROUND.rug) {
    ctx.fillStyle = "#d7b48a";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    ctx.fillStyle = "#9a3b3b";
    ctx.fillRect(px + 4, py + 4, TILE_PX - 8, TILE_PX - 8);
    ctx.fillStyle = "#e6c36a";
    ctx.fillRect(px + 8, py + 8, TILE_PX - 16, TILE_PX - 16);
    return;
  }
  if (g === GROUND.soil) {
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    ctx.fillStyle = "#6e9a45";
    ctx.fillRect(px + 10, py + 16, 6, 16);
    ctx.fillRect(px + 24, py + 12, 6, 20);
    return;
  }
  if (g === GROUND.stone) {
    ctx.fillStyle = "#c8bfb2";
    ctx.fillRect(px, py, TILE_PX, TILE_PX);
    return;
  }
  // grass
  ctx.fillStyle = snow ? "#eef3f6" : ((x + y) % 2 === 0 ? "#7dbe62" : "#71b356");
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  if (!snow && (x * 13 + y * 7) % 5 === 0) {
    ctx.fillStyle = "#f2d56b";
    ctx.beginPath();
    ctx.arc(px + 16, py + 20, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, kind: "pine" | "maple", season: Season, weather: Weather) {
  const px = x * TILE_PX + TILE_PX / 2;
  const py = y * TILE_PX + TILE_PX - 4;
  const snow = season === "winter" && weather !== "rain";
  ctx.fillStyle = "rgba(40,30,10,0.15)";
  ctx.beginPath();
  ctx.ellipse(px, py, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(px - 3, py - 26, 6, 26);
  if (kind === "pine") {
    const tri = (cy: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(px, cy - h);
      ctx.lineTo(px + w, cy);
      ctx.lineTo(px - w, cy);
      ctx.closePath();
      ctx.fill();
    };
    tri(py - 8, 16, 16, snow ? "#d5e3dc" : "#1d6a40");
    tri(py - 20, 13, 14, snow ? "#e7f0ea" : "#228652");
    tri(py - 30, 9, 12, snow ? "#f4faf6" : "#2f9a5e");
  } else {
    const leaf = season === "fall" ? "#e25b2a" : season === "spring" ? "#8fd06a" : snow ? "#d5ddd8" : "#2f8f4e";
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(px, py - 30, 16, 0, Math.PI * 2);
    ctx.arc(px - 10, py - 22, 10, 0, Math.PI * 2);
    ctx.arc(px + 10, py - 22, 10, 0, Math.PI * 2);
    ctx.fill();
    if (season === "fall") {
      ctx.fillStyle = "#f0b23e";
      ctx.beginPath();
      ctx.arc(px + 4, py - 34, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, night: boolean, font: string) {
  const x = b.x * TILE_PX;
  const y = b.y * TILE_PX;
  const w = b.w * TILE_PX;
  const h = b.h * TILE_PX;
  ctx.fillStyle = "rgba(40,30,20,0.16)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 2, w * 0.42, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = b.wall;
  round(ctx, x + 6, y + 16, w - 12, h - 20, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,40,20,0.25)";
  ctx.stroke();
  ctx.fillStyle = b.roof;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 26);
  ctx.lineTo(x + w / 2, y - 16);
  ctx.lineTo(x + w + 2, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(b.roof, -28);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 16);
  ctx.lineTo(x + w + 2, y + 26);
  ctx.lineTo(x + w / 2, y + 26);
  ctx.closePath();
  ctx.fill();
  // door
  const dx = x + w / 2 - 9;
  const dy = y + h - 36;
  ctx.fillStyle = "#6b3a22";
  round(ctx, dx, dy, 18, 26, 2);
  ctx.fill();
  ctx.fillStyle = "#e7c56a";
  ctx.beginPath();
  ctx.arc(dx + 13, dy + 14, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // windows
  const win = night ? "#ffe29a" : "#b9dff3";
  ctx.fillStyle = win;
  ctx.fillRect(x + 16, y + h * 0.42, 14, 12);
  ctx.fillRect(x + w - 32, y + h * 0.42, 14, 12);
  if (night) {
    ctx.fillStyle = "rgba(255,214,120,0.28)";
    ctx.beginPath();
    ctx.arc(x + 23, y + h * 0.42 + 6, 18, 0, Math.PI * 2);
    ctx.arc(x + w - 25, y + h * 0.42 + 6, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fffaf3";
  round(ctx, x + 10, y + 30, w - 20, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#1e1a16";
  ctx.font = `700 11px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.sign, x + w / 2, y + 38, w - 28);
}

function drawPerson(ctx: CanvasRenderingContext2D, a: Actor, time: number, mood: "good" | "okay" | "low" | "rough", font: string) {
  const bob = a.moving ? Math.sin(time * 9) * 1.4 : 0;
  const stride = a.moving ? Math.sin(time * 9) : 0;
  const px = a.x * TILE_PX;
  const py = a.y * TILE_PX + bob;
  const skin = SKIN[a.avatar.skin] ?? SKIN[0];
  const hair = HAIR[a.avatar.hair] ?? HAIR[0];
  const shirt = SHIRT[a.avatar.shirt] ?? SHIRT[0];
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(a.facing * 1.15, 1.15);

  ctx.fillStyle = "rgba(24, 18, 12, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const leg = (side: number) => {
    ctx.save();
    ctx.translate(side * 3.2, -20);
    ctx.rotate(stride * side * 0.45);
    ctx.fillStyle = "#2a3544";
    round(ctx, -3.1, 0, 6.2, 16, 2.4);
    ctx.fill();
    ctx.fillStyle = shade("#2a3544", 18);
    ctx.fillRect(-3.1, 0, 2, 16);
    ctx.fillStyle = "#1c2430";
    round(ctx, -3.4, 13.5, 7.4, 4.2, 1.6);
    ctx.fill();
    ctx.restore();
  };
  leg(-1);
  leg(1);

  const arm = (side: number) => {
    ctx.save();
    ctx.translate(side * 8, -40);
    ctx.rotate(-stride * side * 0.55);
    ctx.fillStyle = shirt;
    round(ctx, -2.6, 0, 5.2, 14, 2.2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 15, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-2.2, 1, 1.4, 8);
    ctx.restore();
  };

  ctx.fillStyle = shirt;
  round(ctx, -9, -44, 18, 26, 7);
  ctx.fill();
  ctx.fillStyle = shade(shirt, 28);
  ctx.beginPath();
  ctx.moveTo(-6, -44);
  ctx.quadraticCurveTo(0, -36, 6, -44);
  ctx.lineTo(4, -30);
  ctx.quadraticCurveTo(0, -34, -4, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  round(ctx, -7, -42, 4, 14, 2);
  ctx.fill();

  arm(-1);
  arm(1);

  ctx.fillStyle = skin;
  round(ctx, -2.4, -48, 4.8, 6, 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -58, 9.2, 10.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(skin, -18);
  ctx.beginPath();
  ctx.ellipse(-8.2, -57, 2.1, 2.8, 0, 0, Math.PI * 2);
  ctx.ellipse(8.2, -57, 2.1, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hair;
  if (a.avatar.style === 1) {
    ctx.beginPath();
    ctx.ellipse(0, -62, 10, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-10.2, -62, 3.4, 18);
    ctx.fillRect(6.8, -62, 3.4, 18);
  } else if (a.avatar.style === 2) {
    ctx.beginPath();
    ctx.ellipse(0, -64, 10, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -72, 4.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.avatar.style === 3) {
    ctx.beginPath();
    ctx.ellipse(0, -60, 11.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -63, 9.6, 7.4, 0, Math.PI * 1.05, -0.05);
    ctx.fill();
  }

  ctx.fillStyle = "#f7f4ef";
  ctx.beginPath();
  ctx.ellipse(-3.3, -59, 1.7, 1.15, 0, 0, Math.PI * 2);
  ctx.ellipse(3.3, -59, 1.7, 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2a22";
  ctx.beginPath();
  ctx.arc(-3.1, -59, 0.85, 0, Math.PI * 2);
  ctx.arc(3.5, -59, 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-2.8, -59.3, 0.28, 0, Math.PI * 2);
  ctx.arc(3.8, -59.3, 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = shade(hair, -20);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5.2, -63);
  ctx.quadraticCurveTo(-3.3, -64.4, -1.6, -63);
  ctx.moveTo(1.6, -63);
  ctx.quadraticCurveTo(3.3, -64.4, 5.2, -63);
  ctx.stroke();

  ctx.strokeStyle = shade(skin, -28);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(0, -55.4);
  ctx.stroke();

  ctx.strokeStyle = "#4a3024";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (mood === "good") ctx.arc(0, -54.2, 2.6, 0.2, Math.PI - 0.2);
  else if (mood === "rough") ctx.arc(0, -51.2, 2.6, Math.PI + 0.25, -0.25, true);
  else if (mood === "low") { ctx.moveTo(-2.4, -53.2); ctx.quadraticCurveTo(0, -52.2, 2.4, -53.6); }
  else { ctx.moveTo(-2.2, -53.4); ctx.lineTo(2.2, -53.4); }
  ctx.stroke();
  ctx.restore();

  if (a.name && !a.self) {
    ctx.font = `700 11px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const tw = Math.min(120, ctx.measureText(a.name).width + 12);
    ctx.fillStyle = "rgba(255,250,243,0.94)";
    round(ctx, px - tw / 2, py - 108, tw, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#1e1a16";
    ctx.fillText(a.name, px, py - 95, tw - 8);
  }
  if (a.emote) {
    ctx.font = "18px serif";
    ctx.textAlign = "center";
    ctx.fillText(a.emote, px + 16, py - 102);
  }
}

function drawSign(ctx: CanvasRenderingContext2D, sign: Sign, font: string) {
  const x = sign.x * TILE_PX + 6;
  const y = sign.y * TILE_PX + 4;
  ctx.fillStyle = "#6b4a2c";
  ctx.fillRect(x + 16, y + 28, 4, 18);
  ctx.fillStyle = "#f7f1e6";
  round(ctx, x, y, 40, 30, 3);
  ctx.fill();
  ctx.fillStyle = sign.accent;
  ctx.fillRect(x, y, 40, 6);
  ctx.strokeStyle = "rgba(40,30,20,0.35)";
  ctx.stroke();
  ctx.fillStyle = "#1e1a16";
  ctx.font = `700 8px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sign.name, x + 20, y + 14, 36);
  ctx.font = `11px ${font}`;
  ctx.fillStyle = "#5c5348";
  ctx.fillText(sign.line, x + 20, y + 23, 36);
}

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, sim: Sim, night: boolean) {
  const x = p.x * TILE_PX;
  const y = p.y * TILE_PX;
  if (p.kind === "bed") {
    ctx.fillStyle = "#6b4a32";
    ctx.fillRect(x, y, 44, 36);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(x + 4, y + 8, 36, 22);
    ctx.fillStyle = "#5c7c99";
    ctx.fillRect(x + 16, y + 6, 24, 24);
  } else if (p.kind === "desk") {
    ctx.fillStyle = "#8a6b4e";
    ctx.fillRect(x, y + 16, 40, 8);
    ctx.fillRect(x + 4, y + 24, 4, 16);
    ctx.fillRect(x + 32, y + 24, 4, 16);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 8, y + 8, 16, 10);
  } else if (p.kind === "bath") {
    ctx.fillStyle = "#d5e7ef";
    round(ctx, x, y, 36, 40, 4);
    ctx.fill();
    ctx.font = "16px serif";
    ctx.fillText("🚿", x + 8, y + 26);
  } else if (p.kind === "cushion") {
    ctx.fillStyle = "#1f8f7a";
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 16, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === "kitchen") {
    ctx.fillStyle = "#e7eef1";
    ctx.fillRect(x, y, 28, 44);
    ctx.fillStyle = "#8c9aa8";
    ctx.fillRect(x + 30, y + 16, 20, 28);
  } else if (p.kind === "couch") {
    const cozy = sim.inventory.includes("cozy_couch");
    ctx.fillStyle = cozy ? "#9a6f94" : "#6483a1";
    round(ctx, x, y + 10, 70, 28, 8);
    ctx.fill();
    if (sim.inventory.includes("throw_blanket")) {
      ctx.fillStyle = "#d7261e";
      ctx.fillRect(x + 28, y + 16, 24, 12);
    }
  } else if (p.kind === "counter") {
    ctx.fillStyle = "#8a6b4e";
    ctx.fillRect(x, y, 6 * TILE_PX, 10);
    ctx.fillStyle = "#f7f1e6";
    ctx.fillRect(x, y - 28, 6 * TILE_PX, 28);
  } else if (p.kind === "door") {
    ctx.fillStyle = "#7a4b2e";
    ctx.fillRect(x, y, TILE_PX, 10);
  } else if (p.kind === "window") {
    ctx.fillStyle = "#9ed2f2";
    ctx.fillRect(x, y - 6, 70, 8);
  } else if (p.kind === "canoe") {
    ctx.strokeStyle = "#8c3b32";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 16, 22, 8, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.kind === "loon") {
    ctx.fillStyle = "#1e1a16";
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 12, y + 8, 6, 3);
  } else if (p.kind === "bench") {
    ctx.fillStyle = "#6b4423";
    ctx.fillRect(x + 4, y + 16, 36, 6);
    ctx.fillRect(x + 8, y + 22, 4, 10);
    ctx.fillRect(x + 32, y + 22, 4, 10);
  } else if (p.kind === "bus") {
    ctx.fillStyle = "#f0b23e";
    round(ctx, x + 4, y + 8, 40, 22, 4);
    ctx.fill();
    ctx.fillStyle = "#1e1a16";
    ctx.fillRect(x + 10, y + 12, 10, 8);
    ctx.fillRect(x + 24, y + 12, 10, 8);
  }
  if (night && p.kind === "couch" && sim.inventory.includes("lamp")) {
    ctx.fillStyle = "rgba(255,220,140,0.35)";
    ctx.beginPath();
    ctx.arc(x + 20, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ownedDecor(ctx: CanvasRenderingContext2D, sim: Sim, map: WorldMap) {
  if (map.id !== "home") return;
  const plants = sim.inventory.filter((id) => id.startsWith("plant_"));
  ctx.font = "20px serif";
  plants.forEach((id, i) => {
    const glyph = id === "plant_herbs" ? "🌿" : id === "plant_monstera" ? "🌱" : "🪴";
    ctx.fillText(glyph, 70 + i * 36, 150);
  });
  if (sim.inventory.includes("string_lights")) {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = ["#ffd27a", "#ff8f8f", "#8fd0ff"][i % 3];
      ctx.beginPath();
      ctx.arc(40 + i * 28, 28 + Math.sin(i) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (sim.pet) {
    ctx.fillStyle = "#e0a96b";
    ctx.beginPath();
    ctx.ellipse(280, 250, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(292, 244, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, input: DrawInput) {
  const { map, cam, viewW, viewH, sim, weather, time, quiet, font } = input;
  const season = seasonOf(dateOf(sim));
  const block = Math.min(4, sim.block);
  const night = block >= 4;
  const mood = moodOf(sim.needs).tier;
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.fillStyle = night ? "#142033" : "#8ec8ea";
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const x0 = Math.max(0, Math.floor(cam.x / TILE_PX) - 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE_PX) - 1);
  const x1 = Math.min(map.w - 1, Math.ceil((cam.x + viewW) / TILE_PX) + 1);
  const y1 = Math.min(map.h - 1, Math.ceil((cam.y + viewH) / TILE_PX) + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(ctx, map, x, y, season, weather);

  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const t of map.trees) items.push({ y: (t.y + 1) * TILE_PX, draw: () => drawTree(ctx, t.x, t.y, t.kind, season, weather) });
  for (const b of map.buildings) items.push({ y: (b.y + b.h) * TILE_PX, draw: () => drawBuilding(ctx, b, night, font) });
  for (const p of map.props) items.push({ y: (p.y + 1) * TILE_PX, draw: () => drawProp(ctx, p, sim, night) });
  for (const sign of input.signs ?? []) items.push({ y: (sign.y + 1) * TILE_PX, draw: () => drawSign(ctx, sign, font) });
  for (const n of map.npcs) {
    const actor: Actor = { x: n.x, y: n.y, name: n.name, avatar: { skin: n.skin, hair: n.hair, style: n.style, shirt: n.shirt }, facing: 1, moving: !quiet && Math.sin(time + n.x) > 0.2 };
    items.push({ y: n.y * TILE_PX, draw: () => drawPerson(ctx, actor, quiet ? 0 : time, "okay", font) });
  }
  for (const o of input.others) items.push({ y: o.y * TILE_PX, draw: () => drawPerson(ctx, o, quiet ? 0 : time, "okay", font) });
  items.push({ y: input.player.y * TILE_PX, draw: () => drawPerson(ctx, input.player, quiet ? 0 : time, mood, font) });
  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();
  ownedDecor(ctx, sim, map);
  ctx.restore();

  if (!quiet && (weather === "rain" || weather === "snow")) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 48; i++) {
      const x = (i * 97 + (weather === "rain" ? time * 180 : time * 28)) % viewW;
      const y = (i * 53 + time * (weather === "rain" ? 220 : 36)) % viewH;
      if (weather === "rain") {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 10);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (night) {
    ctx.fillStyle = "rgba(8,16,32,0.38)";
    ctx.fillRect(0, 0, viewW, viewH);
    if (!quiet && season === "winter") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#7dcea0";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= viewW; x += 20) {
        const y = 30 + Math.sin(x / 80 + time * 0.4) * 16;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(viewW, 0);
      ctx.fill();
      ctx.restore();
    }
  } else if (block === 3) {
    ctx.fillStyle = "rgba(242,140,60,0.12)";
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

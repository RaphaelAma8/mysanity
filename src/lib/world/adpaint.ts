/** Original painted creatives for billboard image slots. No third-party photos. */

export function paintCreative(ctx: CanvasRenderingContext2D, w: number, h: number, kind: number, accent: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const skies = ["#f2c9a0", "#d7e6f2", "#f6d7a8", "#c9e2c2", "#e7dcc8", "#d5e4ef"];
  g.addColorStop(0, skies[kind % skies.length]);
  g.addColorStop(1, "#f7f1e6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (kind % 6 === 0) produce(ctx, w, h, accent);
  else if (kind % 6 === 1) cafe(ctx, w, h, accent);
  else if (kind % 6 === 2) lake(ctx, w, h);
  else if (kind % 6 === 3) plants(ctx, w, h, accent);
  else if (kind % 6 === 4) books(ctx, w, h, accent);
  else mats(ctx, w, h, accent);

  const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(20,16,12,0.28)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function produce(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = "#c9844a";
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = "#a86b38";
  for (let i = 0; i < 8; i++) ctx.fillRect(i * (w / 8), h * 0.62, 2, h * 0.38);
  const crate = (x: number, y: number) => {
    ctx.fillStyle = "#8a5a32";
    round(ctx, x, y, w * 0.22, h * 0.28, 8);
    ctx.fill();
    ctx.strokeStyle = "#6b4423";
    ctx.stroke();
  };
  crate(w * 0.08, h * 0.48);
  crate(w * 0.34, h * 0.52);
  crate(w * 0.62, h * 0.46);
  const fruit = (x: number, y: number, color: string) => {
    const rad = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 18);
    rad.addColorStop(0, "#fff6e8");
    rad.addColorStop(0.35, color);
    rad.addColorStop(1, "#5a2a16");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 5; i++) fruit(w * 0.14 + (i % 3) * 22, h * 0.5 + Math.floor(i / 3) * 20, i % 2 ? "#de3b2f" : "#f0b429");
  for (let i = 0; i < 4; i++) fruit(w * 0.7 + (i % 2) * 24, h * 0.5 + Math.floor(i / 2) * 22, "#7dba4a");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 10, h);
}

function cafe(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = "#5c3b2e";
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = "#f4e1c4";
  round(ctx, w * 0.28, h * 0.28, w * 0.28, h * 0.42, 18);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h * 0.3, w * 0.1, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.22);
  ctx.quadraticCurveTo(w * 0.42, h * 0.08, w * 0.48, h * 0.2);
  ctx.stroke();
  ctx.fillStyle = accent;
  round(ctx, w * 0.62, h * 0.38, w * 0.22, h * 0.34, 8);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(w * 0.66, h * 0.44, w * 0.14, h * 0.08);
}

function lake(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, "#f0b07a");
  sky.addColorStop(0.45, "#f6d7b0");
  sky.addColorStop(1, "#8ec4ea");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.62);
  ctx.fillStyle = "#f2d48a";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.22, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e6b40";
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.62);
  ctx.lineTo(w * 0.2, h * 0.28);
  ctx.lineTo(w * 0.28, h * 0.62);
  ctx.fill();
  ctx.fillStyle = "#f4e7d4";
  ctx.fillRect(w * 0.42, h * 0.4, w * 0.18, h * 0.22);
  ctx.fillStyle = "#9c3b32";
  ctx.beginPath();
  ctx.moveTo(w * 0.39, h * 0.42);
  ctx.lineTo(w * 0.51, h * 0.26);
  ctx.lineTo(w * 0.63, h * 0.42);
  ctx.fill();
  ctx.fillStyle = "#2f86b0";
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 5; i++) ctx.fillRect(0, h * 0.68 + i * 18, w, 3);
}

function plants(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = "#efe6d6";
  ctx.fillRect(0, h * 0.7, w, h);
  const pot = (x: number, leaf: string) => {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.78);
    ctx.lineTo(x + 36, h * 0.78);
    ctx.lineTo(x + 30, h * 0.98);
    ctx.lineTo(x + 6, h * 0.98);
    ctx.fill();
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.ellipse(x + 18, h * 0.58, 26, 34, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 2, h * 0.66, 16, 22, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 36, h * 0.66, 16, 22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  pot(w * 0.12, "#2f8f4e");
  pot(w * 0.38, "#1f6b40");
  pot(w * 0.64, "#67a85a");
}

function books(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = "#6b4a32";
  round(ctx, w * 0.12, h * 0.28, w * 0.76, h * 0.6, 6);
  ctx.fill();
  const colors = [accent, "#f0b23e", "#1f6b9b", "#f4efe4", "#9c3b32", "#2f6d4f"];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(w * 0.18 + i * (w * 0.08), h * 0.36, w * 0.06, h * 0.42);
  }
}

function mats(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = "#d7e2ea";
  ctx.fillRect(0, 0, w, h * 0.7);
  ctx.fillStyle = "#e7eef2";
  round(ctx, w * 0.18, h * 0.42, w * 0.64, h * 0.18, 12);
  ctx.fill();
  ctx.fillStyle = accent;
  round(ctx, w * 0.22, h * 0.46, w * 0.22, h * 0.1, 8);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.28, 26, 0, Math.PI * 2);
  ctx.fill();
}

export function paintBillboard(name: string, line: string, accent: string, kind: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  paintCreative(ctx, 1024, 380, kind, accent);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 380, 1024, 196);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 380, 1024, 8);
  ctx.fillStyle = "#1e1a16";
  ctx.font = "700 72px Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 36, 455, 950);
  ctx.font = "400 40px Georgia, serif";
  ctx.fillStyle = "#5c5348";
  ctx.fillText(line, 36, 525, 950);
  return canvas;
}

export function paintStorefront(title: string, wall: string, accent: string, motif: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 768, 512);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(60,40,20,${0.03 + (i % 5) * 0.01})`;
    ctx.fillRect((i * 47) % 768, (i * 19) % 512, 3, 2);
  }
  ctx.fillStyle = "#d9d0c4";
  ctx.fillRect(0, 430, 768, 82);
  ctx.fillStyle = accent;
  round(ctx, 36, 28, 696, 64, 8);
  ctx.fill();
  ctx.fillStyle = "#fffdf8";
  ctx.font = "700 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 384, 60, 640);

  const windowAt = (x: number) => {
    ctx.fillStyle = "#243044";
    round(ctx, x, 140, 150, 150, 6);
    ctx.fill();
    const glass = ctx.createLinearGradient(x, 140, x + 150, 290);
    glass.addColorStop(0, "rgba(186,220,242,0.95)");
    glass.addColorStop(1, "rgba(90,140,170,0.8)");
    ctx.fillStyle = glass;
    ctx.fillRect(x + 8, 148, 134, 134);
    ctx.fillStyle = "rgba(255,214,140,0.45)";
    ctx.fillRect(x + 18, 200, 50, 70);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.strokeRect(x + 8, 148, 134, 134);
  };
  windowAt(70);
  windowAt(548);
  ctx.drawImage(offscreenMotif(motif, accent), 250, 150, 270, 150);

  ctx.fillStyle = "#5c3a28";
  round(ctx, 314, 250, 140, 200, 6);
  ctx.fill();
  ctx.fillStyle = "#e7c56a";
  ctx.beginPath();
  ctx.arc(430, 350, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(40, 300, 250, 16);
  ctx.fillRect(478, 300, 250, 16);
  return canvas;
}

function offscreenMotif(motif: number, accent: string) {
  const c = document.createElement("canvas");
  c.width = 270;
  c.height = 160;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  paintCreative(ctx, 270, 160, motif, accent);
  return c;
}

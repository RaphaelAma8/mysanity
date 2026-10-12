import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function icon(x, y, size, pad) {
  const u = size;
  const nx = x / u;
  const ny = y / u;
  const inset = pad ? 0.1 : 0;
  if (nx < inset || ny < inset || nx > 1 - inset || ny > 1 - inset) return [0, 0, 0, 0];
  const sky = ny < 0.62;
  let r = sky ? 142 : 125;
  let g = sky ? 200 : 170;
  let b = sky ? 234 : 98;
  if (!sky) { r = 90; g = 160; b = 78; }
  // sun
  const sx = 0.78, sy = 0.22, sr = 0.08;
  if ((nx - sx) ** 2 + (ny - sy) ** 2 < sr * sr) return [240, 196, 70, 255];
  // roof
  const roofTop = 0.34;
  const roofBot = 0.52;
  const cx = 0.5;
  if (ny > roofTop && ny < roofBot) {
    const half = ((ny - roofTop) / (roofBot - roofTop)) * 0.28;
    if (Math.abs(nx - cx) < half) return [180, 60, 48, 255];
  }
  // walls
  if (ny >= 0.52 && ny < 0.78 && nx > 0.28 && nx < 0.72) return [247, 241, 230, 255];
  // door
  if (ny >= 0.60 && ny < 0.78 && nx > 0.44 && nx < 0.56) return [107, 58, 34, 255];
  // pine
  if (nx > 0.12 && nx < 0.28 && ny > 0.48 && ny < 0.78) {
    const t = (ny - 0.48) / 0.3;
    if (Math.abs(nx - 0.2) < t * 0.1) return [31, 107, 64, 255];
  }
  // water
  if (ny > 0.82) return [47, 134, 176, 255];
  return [r, g, b, 255];
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, (x, y, s) => icon(x, y, s, false)));
writeFileSync("public/icons/icon-512.png", png(512, (x, y, s) => icon(x, y, s, false)));
writeFileSync("public/icons/maskable-192.png", png(192, (x, y, s) => icon(x, y, s, true)));
writeFileSync("public/icons/maskable-512.png", png(512, (x, y, s) => icon(x, y, s, true)));
writeFileSync("public/apple-touch-icon.png", png(180, (x, y, s) => icon(x, y, s, false)));
console.log("icons written");

/** Grid movement for the town. Pure functions so the walking rules can be tested without a canvas. */

export interface Grid {
  w: number;
  h: number;
  solid: Uint8Array;
}

export interface TilePoint { x: number; y: number }

const DIRS: TilePoint[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

export const tileOf = (v: number) => Math.floor(v);
const at = (g: Grid, x: number, y: number) => y * g.w + x;

export function inBounds(g: Grid, x: number, y: number) {
  return x >= 0 && y >= 0 && x < g.w && y < g.h;
}

export function isWalkable(g: Grid, x: number, y: number) {
  return inBounds(g, x, y) && g.solid[at(g, x, y)] === 0;
}

export function nearestWalkable(g: Grid, x: number, y: number, radius = 4): TilePoint | null {
  if (isWalkable(g, x, y)) return { x, y };
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isWalkable(g, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

/** 4-direction path of tile indexes, including the start tile. Null when there is no way through. */
export function findPath(g: Grid, fromX: number, fromY: number, toX: number, toY: number): TilePoint[] | null {
  const start = { x: tileOf(fromX), y: tileOf(fromY) };
  const rawGoal = { x: tileOf(toX), y: tileOf(toY) };
  if (!isWalkable(g, start.x, start.y)) return null;
  const goal = nearestWalkable(g, rawGoal.x, rawGoal.y, 3);
  if (!goal) return null;
  if (start.x === goal.x && start.y === goal.y) return [start];

  const startI = at(g, start.x, start.y);
  const goalI = at(g, goal.x, goal.y);
  const prev = new Int32Array(g.w * g.h).fill(-1);
  const seen = new Uint8Array(g.w * g.h);
  const q: number[] = [startI];
  seen[startI] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    if (cur === goalI) break;
    const x = cur % g.w;
    const y = (cur - x) / g.w;
    for (const d of DIRS) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (!isWalkable(g, nx, ny)) continue;
      const ni = at(g, nx, ny);
      if (seen[ni]) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (!seen[goalI]) return null;
  const path: TilePoint[] = [];
  for (let cur = goalI; cur !== -1; cur = prev[cur]) {
    path.push({ x: cur % g.w, y: Math.floor(cur / g.w) });
    if (cur === startI) break;
  }
  path.reverse();
  return path;
}

function blocked(g: Grid, x: number, y: number, radius: number) {
  const samples: [number, number][] = [[x - radius, y], [x + radius, y], [x, y - radius], [x, y + radius]];
  return samples.some(([px, py]) => !isWalkable(g, tileOf(px), tileOf(py)));
}

/** Slide along walls. Radius is in tiles. */
export function tryMove(g: Grid, x: number, y: number, dx: number, dy: number, radius = 0.28) {
  const nx = x + dx;
  const ny = y + dy;
  if (!blocked(g, nx, ny, radius)) return { x: nx, y: ny };
  if (!blocked(g, nx, y, radius)) return { x: nx, y };
  if (!blocked(g, x, ny, radius)) return { x, y: ny };
  return { x, y };
}

export function nearestSpot<T extends { x: number; y: number }>(spots: T[], x: number, y: number, max = 0.95): T | null {
  let best: T | null = null;
  let bestD = max;
  for (const s of spots) {
    const d = Math.hypot(s.x + 0.5 - x, s.y + 0.5 - y);
    if (d <= bestD) { best = s; bestD = d; }
  }
  return best;
}

export function cameraFor(mapW: number, mapH: number, focusX: number, focusY: number, viewW: number, viewH: number) {
  const maxX = mapW - viewW;
  const maxY = mapH - viewH;
  const x = maxX <= 0 ? maxX / 2 : Math.max(0, Math.min(maxX, focusX - viewW / 2));
  const y = maxY <= 0 ? maxY / 2 : Math.max(0, Math.min(maxY, focusY - viewH / 2));
  return { x, y };
}

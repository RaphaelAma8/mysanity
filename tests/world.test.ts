import { describe, expect, it } from "vitest";
import { JOBS, PLACES } from "../src/lib/sim/data";
import { allMaps, boardsBesideRoads, GROUND, HOME, mapById, PUBLIC_MAPS, TOWN } from "../src/lib/world/maps";
import { cameraFor, findPath, isWalkable, tileOf, tryMove } from "../src/lib/world/move";

describe("Cedar Bay can be walked", () => {
  it("can follow the path to the club without getting stuck", () => {
    const found = findPath(TOWN, 4.5, 18.5, 12.5, 26.5);
    expect(found).not.toBeNull();
    const steps = found!;
    let x = 4.5;
    let y = 18.5;
    let guard = 0;
    while (steps.length && guard < 800) {
      guard += 1;
      const tx = steps[0].x + 0.5;
      const ty = steps[0].y + 0.5;
      const dx = tx - x;
      const dy = ty - y;
      const dist = Math.hypot(dx, dy);
      const step = 3.15 * 0.016;
      if (dist <= step) { x = tx; y = ty; steps.shift(); continue; }
      const next = tryMove(TOWN, x, y, (dx / dist) * step, (dy / dist) * step);
      expect(next, `stuck at ${x},${y} going to ${steps[0].x},${steps[0].y}`).not.toEqual({ x, y });
      x = next.x;
      y = next.y;
    }
    expect(Math.hypot(x - 12.5, y - 26.5)).toBeLessThan(1.2);
  });

  it("reaches every door and spot from where you step outside", () => {
    for (const spot of TOWN.spots) {
      const path = findPath(TOWN, TOWN.spawn.x, TOWN.spawn.y, spot.x + 0.5, spot.y + 0.5);
      expect(path, spot.label).not.toBeNull();
    }
  });

  it("keeps every room's spots on walkable floor", () => {
    for (const map of allMaps()) {
      expect(isWalkable(map, tileOf(map.spawn.x), tileOf(map.spawn.y)), map.id).toBe(true);
      for (const spot of map.spots) {
        const path = findPath(map, map.spawn.x, map.spawn.y, spot.x + 0.5, spot.y + 0.5);
        expect(path, `${map.id}:${spot.label}`).not.toBeNull();
      }
    }
  });

  it("does not let you walk on the lake or through a shop", () => {
    expect(isWalkable(TOWN, 2, 1)).toBe(false);
    expect(findPath(TOWN, TOWN.spawn.x, TOWN.spawn.y, 2.5, 0.2)).toBeNull();
    const moved = tryMove(TOWN, 3.5, 14.5, 0, -1);
    expect(moved.y).toBeGreaterThan(13.8);
  });

  it("covers every town place and job", () => {
    const covered = new Set(TOWN.spots.flatMap((s) => [s.placeId, s.jobId, s.to].filter(Boolean)));
    for (const place of PLACES) {
      if (place.id === "work") expect(JOBS.every((j) => covered.has(j.id))).toBe(true);
      else expect(covered.has(place.id), place.id).toBe(true);
    }
    expect(covered.has("home")).toBe(true);
  });

  it("keeps home private and the shared rooms public", () => {
    expect(PUBLIC_MAPS.has("home")).toBe(false);
    expect(PUBLIC_MAPS.has("town")).toBe(true);
    for (const id of ["grocery", "cafe", "club", "bank", "farm", "gym"]) expect(PUBLIC_MAPS.has(id), id).toBe(true);
    expect(mapById("missing").id).toBe(HOME.id);
    expect(HOME.billboards).toEqual([]);
    for (const map of allMaps()) {
      if (map.id !== "town") expect(map.billboards, map.id).toEqual([]);
    }
  });

  it("lines every street with billboards that are not on the road", () => {
    expect(TOWN.billboards.length).toBeGreaterThan(8);
    const beside = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= TOWN.w || ny >= TOWN.h) return false;
      return TOWN.ground[ny * TOWN.w + nx] === GROUND.path;
    });
    for (const board of TOWN.billboards) {
      const i = board.y * TOWN.w + board.x;
      expect(TOWN.solid[i], board.id).toBe(0);
      expect(TOWN.ground[i]).not.toBe(GROUND.path);
      expect(beside(board.x, board.y), board.id).toBe(true);
    }
    expect(boardsBesideRoads(HOME)).toEqual([]);
  });

  it("keeps the camera inside the map", () => {
    const cam = cameraFor(2000, 1400, 20, 20, 400, 800);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    const far = cameraFor(2000, 1400, 5000, 5000, 400, 800);
    expect(far.x).toBe(1600);
    expect(far.y).toBe(600);
  });
});

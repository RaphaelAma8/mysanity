/**
 * Lit town view. Original meshes and painted textures — no downloaded models.
 * Tile (x, y) maps to world (x, 0, z).
 */
import * as THREE from "three";
import { seasonOf, type Season, type Weather } from "@/lib/sim/engine";
import type { Sim } from "@/lib/sim/types";
import { paintBillboard, paintStorefront } from "./adpaint";
import type { Actor, Sign } from "./draw";
import { createHuman, poseHuman, type HumanRig } from "./human3d";
import { GROUND, type Building, type BoardSlot, type Prop, type WorldMap } from "./maps";

export interface TownFrame {
  map: WorldMap;
  player: Actor;
  others: Actor[];
  sim: Sim;
  signs: Sign[];
  quiet: boolean;
  time: number;
  weather: Weather;
}

export interface TownView {
  frame(state: TownFrame): void;
  groundAt(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } | null;
  dispose(): void;
}

const MOTIF: Record<string, number> = {
  grocery: 0, plants: 3, homestore: 5, hobby: 4, clothes: 1,
  cafe: 1, library: 4, centre: 2, shelter: 3, home: 2,
  club: 1, bank: 4, farm: 0, gym: 5,
};

const CAR_COLORS = ["#c4473a", "#1e4d78", "#f4f1ea", "#2a2e33", "#1e6b52", "#d4922a", "#6b4fa3"];

export function createTownView(canvas: HTMLCanvasElement): TownView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor("#9fd0ee");

  const scene = new THREE.Scene();
  const fog = new THREE.Fog("#c5dff0", 14, 36);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.08, 90);
  const hemi = new THREE.HemisphereLight("#d7ecff", "#6d8f58", 0.75);
  const sun = new THREE.DirectionalLight("#fff2dd", 2.2);
  sun.position.set(16, 28, 10);
  const fill = new THREE.DirectionalLight("#ffd8b8", 0.4);
  fill.position.set(-10, 8, -4);
  scene.add(hemi, sun, fill);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  let staticRoot: THREE.Group | null = null;
  let staticKey = "";
  const people = new Map<string, { rig: HumanRig; look: string }>();
  const badges = new Map<string, THREE.Sprite>();
  const dynamic = new THREE.Group();
  scene.add(dynamic);

  let signRoot: THREE.Group | null = null;
  let signKey = "";
  let weatherBits: THREE.Points | null = null;
  let weatherKind = "";

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.floor(w * dpr);
    const ph = Math.floor(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }
    if (camera.aspect !== w / h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function frame(state: TownFrame) {
    resize();
    const night = state.sim.block >= 4;
    const season = seasonOf(new Date());
    const indoors = state.map.id !== "town";
    applySky(night, state.weather, indoors);
    const key = `${state.map.id}:${night ? 1 : 0}:${season}`;
    if (key !== staticKey) rebuild(state.map, night, season);
    syncSigns(state.map, state.signs);
    syncPeople(state);
    syncWeather(state);
    placeCamera(state, indoors);
    renderer.render(scene, camera);
  }

  function applySky(night: boolean, weather: Weather, indoors: boolean) {
    const overcast = weather === "rain" || weather === "cloudy" || weather === "snow";
    hemi.intensity = night ? 0.32 : overcast ? 0.62 : 0.78;
    hemi.color.set(night ? "#9eb4d4" : "#d7ecff");
    hemi.groundColor.set(night ? "#243028" : "#6d8f58");
    sun.intensity = night ? 0.22 : overcast ? 1.35 : 2.25;
    sun.color.set(night ? "#b7c8e4" : "#fff2dd");
    const sky = night ? "#1a2740" : weather === "snow" ? "#d5e2ee" : weather === "rain" ? "#8ea4b6" : "#9fd0ee";
    renderer.setClearColor(sky);
    fog.color.set(indoors ? "#f3ecdf" : sky);
    fog.near = indoors ? 8 : 12;
    fog.far = indoors ? 22 : night ? 28 : 36;
  }

  function rebuild(map: WorldMap, night: boolean, season: Season) {
    if (staticRoot) {
      scene.remove(staticRoot);
      disposeTree(staticRoot);
    }
    staticRoot = new THREE.Group();
    staticRoot.add(groundMesh(map));
    for (const building of map.buildings) staticRoot.add(buildingMesh(building, night));
    for (const tree of map.trees) staticRoot.add(treeMesh(tree, season));
    for (const prop of map.props) staticRoot.add(propMesh(prop));
    if (map.id === "town") addCars(staticRoot, map);
    else furnish(staticRoot, map);
    scene.add(staticRoot);
    staticKey = `${map.id}:${night ? 1 : 0}:${season}`;
  }

  function groundAt(clientX: number, clientY: number, rect: DOMRect) {
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return null;
    return { x: hitPoint.x, y: hitPoint.z };
  }

  function dispose() {
    if (staticRoot) disposeTree(staticRoot);
    if (signRoot) disposeTree(signRoot);
    if (weatherBits) disposeTree(weatherBits);
    for (const entry of people.values()) disposeTree(entry.rig.root);
    for (const badge of badges.values()) disposeTree(badge);
    renderer.dispose();
  }

  function syncPeople(state: TownFrame) {
    const actors: Actor[] = [
      state.player,
      ...state.map.npcs.map((npc) => ({
        id: npc.id,
        x: npc.x,
        y: npc.y,
        name: npc.name,
        avatar: { skin: npc.skin, hair: npc.hair, style: npc.style, shirt: npc.shirt },
        facing: (npc.x < state.player.x ? 1 : -1) as 1 | -1,
        moving: false,
      })),
      ...state.others,
    ];
    const seen = new Set<string>();
    actors.forEach((actor, index) => {
      const id = actor.self ? "self" : actor.id ?? actor.name ?? `p-${index}`;
      const look = `${actor.avatar.skin}.${actor.avatar.hair}.${actor.avatar.style}.${actor.avatar.shirt}`;
      let entry = people.get(id);
      if (!entry || entry.look !== look) {
        if (entry) {
          dynamic.remove(entry.rig.root);
          disposeTree(entry.rig.root);
        }
        const rig = createHuman(actor.avatar);
        dynamic.add(rig.root);
        entry = { rig, look };
        people.set(id, entry);
      }
      const sway = state.quiet || actor.self ? 0 : Math.sin(state.time * 0.7 + index) * 0.05;
      entry.rig.root.position.set(actor.x + sway, 0, actor.y);
      entry.rig.root.rotation.y = actor.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
      poseHuman(entry.rig, state.time + index * 0.4, actor.moving, state.quiet);
      seen.add(id);
      syncBadge(id, actor, entry.rig.root.position);
    });
    for (const [id, entry] of people) {
      if (seen.has(id)) continue;
      dynamic.remove(entry.rig.root);
      disposeTree(entry.rig.root);
      people.delete(id);
      const badge = badges.get(id);
      if (badge) {
        dynamic.remove(badge);
        disposeTree(badge);
        badges.delete(id);
      }
    }
  }

  function syncBadge(id: string, actor: Actor, at: THREE.Vector3) {
    const label = actor.self ? actor.emote ?? "" : [actor.name, actor.emote].filter(Boolean).join("  ");
    const key = `${id}:${label}`;
    let sprite = badges.get(id);
    if (!label) {
      if (sprite) sprite.visible = false;
      return;
    }
    if (!sprite || sprite.name !== key) {
      if (sprite) {
        dynamic.remove(sprite);
        disposeTree(sprite);
      }
      sprite = labelSprite(label);
      sprite.name = key;
      dynamic.add(sprite);
      badges.set(id, sprite);
    }
    sprite.visible = true;
    sprite.position.set(at.x, 2.05, at.z);
  }

  function syncSigns(map: WorldMap, signs: Sign[]) {
    if (map.id !== "town") {
      if (signRoot) {
        scene.remove(signRoot);
        disposeTree(signRoot);
        signRoot = null;
        signKey = "";
      }
      return;
    }
    const spaced = spaceSigns(signs);
    const key = spaced.map((s) => `${s.x},${s.y},${s.name},${s.line},${s.accent}`).join("|");
    if (key === signKey && signRoot) return;
    if (signRoot) {
      scene.remove(signRoot);
      disposeTree(signRoot);
    }
    signRoot = new THREE.Group();
    spaced.forEach((sign, index) => signRoot!.add(billboardMesh(map, sign, index)));
    scene.add(signRoot);
    signKey = key;
  }

  function syncWeather(state: TownFrame) {
    const kind = state.quiet ? "" : state.weather === "rain" || state.weather === "snow" ? state.weather : "";
    if (kind !== weatherKind) {
      if (weatherBits) {
        scene.remove(weatherBits);
        disposeTree(weatherBits);
        weatherBits = null;
      }
      weatherKind = kind;
      if (kind) weatherBits = makeWeather(kind);
      if (weatherBits) scene.add(weatherBits);
    }
    if (!weatherBits) return;
    const pos = weatherBits.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - (kind === "snow" ? 0.03 : 0.18);
      if (y < 0) y = 8 + Math.random() * 3;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    weatherBits.position.set(state.player.x, 0, state.player.y);
  }

  function placeCamera(state: TownFrame, indoors: boolean) {
    const px = state.player.x;
    const pz = state.player.y;
    const map = state.map;
    if (indoors) {
      camera.position.set(map.w / 2, 4.2, map.h - 0.2);
      camera.lookAt(map.w / 2, 1.05, map.h * 0.42);
      return;
    }
    const aim = roadAim(map, px, pz);
    const ahead = spaceBoards(map.billboards)
      .map((slot) => ({
        slot,
        along: (slot.x + 0.5 - aim.x) * aim.dx + (slot.y + 0.5 - aim.z) * aim.dz,
      }))
      .filter((item) => item.along > 1.5)
      .sort((a, b) => a.along - b.along)[0];
    if (ahead) {
      const sx = ahead.slot.x + 0.5;
      const sz = ahead.slot.y + 0.5;
      const spots: [number, number][] = [
        [sx - aim.dx * 4.4 + aim.dz * 1.8, sz - aim.dz * 4.4 - aim.dx * 1.8],
        [sx - aim.dx * 4.4 - aim.dz * 1.8, sz - aim.dz * 4.4 + aim.dx * 1.8],
        [sx - aim.dx * 3.2, sz - aim.dz * 3.2],
      ];
      let cx = spots[0][0];
      let cz = spots[0][1];
      for (const [x, z] of spots) {
        if (openGround(map, x, z)) { cx = x; cz = z; break; }
      }
      camera.position.set(cx, 2.2, cz);
      camera.lookAt(sx, 1.8, sz);
      return;
    }
    camera.position.set(aim.x - aim.dx * 3, 2.4, aim.z - aim.dz * 3);
    camera.lookAt(aim.x + aim.dx * 6, 1.4, aim.z + aim.dz * 6);
  }

  return { frame, groundAt, dispose };
}

function spaceSigns(signs: Sign[]) {
  const kept: Sign[] = [];
  for (const sign of signs) {
    if (kept.some((other) => Math.hypot(other.x - sign.x, other.y - sign.y) < 5)) continue;
    kept.push(sign);
  }
  return kept;
}

function groundMesh(map: WorldMap) {
  const px = 18;
  const canvas = document.createElement("canvas");
  canvas.width = map.w * px;
  canvas.height = map.h * px;
  const ctx = canvas.getContext("2d");
  if (ctx) paintGround(ctx, map, px);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(map.w, map.h),
    new THREE.MeshStandardMaterial({ map: canvasTexture(canvas), roughness: 0.94, metalness: 0 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(map.w / 2, 0, map.h / 2);
  return mesh;
}

function paintGround(ctx: CanvasRenderingContext2D, map: WorldMap, px: number) {
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const g = map.ground[y * map.w + x];
      const left = x * px;
      const top = y * px;
      if (g === GROUND.water) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#2f86b5" : "#27779f";
        ctx.fillRect(left, top, px, px);
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(left, top + 4, px, 2);
      } else if (g === GROUND.sand) {
        ctx.fillStyle = "#e4c98a";
        ctx.fillRect(left, top, px, px);
        ctx.fillStyle = "rgba(180,140,70,0.25)";
        ctx.fillRect(left + (x % 5), top + (y % 4), 4, 2);
      } else if (g === GROUND.path) {
        ctx.fillStyle = "#3e4450";
        ctx.fillRect(left, top, px, px);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 3) * 0.03})`;
          ctx.fillRect(left + ((x * 3 + i * 7) % px), top + ((y * 5 + i * 4) % px), 3, 2);
        }
        paintCurb(ctx, map, x, y, left, top, px);
        if (tile(map, x, y + 1) === GROUND.path && tile(map, x, y - 1) !== GROUND.path) {
          ctx.fillStyle = "#e6c84a";
          for (let d = 2; d < px; d += 8) ctx.fillRect(left + d, top + px - 2, 4, 2);
        }
      } else if (g === GROUND.floor || g === GROUND.plank) {
        ctx.fillStyle = g === GROUND.plank ? "#8a623c" : "#c4a37a";
        ctx.fillRect(left, top, px, px);
        ctx.strokeStyle = "rgba(90,60,30,0.35)";
        ctx.strokeRect(left + 1, top + 1, px - 2, px / 2);
        ctx.strokeRect(left + 1, top + px / 2, px - 2, px / 2 - 1);
      } else if (g === GROUND.rug) {
        ctx.fillStyle = "#8d3d45";
        ctx.fillRect(left, top, px, px);
        ctx.strokeStyle = "#e7c56a";
        ctx.strokeRect(left + 3, top + 3, px - 6, px - 6);
      } else if (g === GROUND.soil) {
        ctx.fillStyle = "#6b4428";
        ctx.fillRect(left, top, px, px);
      } else if (g === GROUND.stone) {
        ctx.fillStyle = "#b7b1a8";
        ctx.fillRect(left, top, px, px);
      } else {
        const shade = ((x * 13 + y * 7) % 5) * 6;
        ctx.fillStyle = `rgb(${78 + shade},${132 + shade},${58})`;
        ctx.fillRect(left, top, px, px);
        ctx.strokeStyle = "rgba(30,80,30,0.35)";
        ctx.beginPath();
        ctx.moveTo(left + 4, top + 12);
        ctx.lineTo(left + 6, top + 4);
        ctx.moveTo(left + 12, top + 14);
        ctx.lineTo(left + 13, top + 6);
        ctx.stroke();
        if ((x * 3 + y) % 11 === 0) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#f2d36b" : "#f4f7fb";
          ctx.beginPath();
          ctx.arc(left + px / 2, top + px / 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function paintCurb(ctx: CanvasRenderingContext2D, map: WorldMap, x: number, y: number, left: number, top: number, px: number) {
  ctx.fillStyle = "#d9d3c8";
  const band = 3;
  if (tile(map, x, y - 1) === GROUND.grass) ctx.fillRect(left, top, px, band);
  if (tile(map, x, y + 1) === GROUND.grass) ctx.fillRect(left, top + px - band, px, band);
  if (tile(map, x - 1, y) === GROUND.grass) ctx.fillRect(left, top, band, px);
  if (tile(map, x + 1, y) === GROUND.grass) ctx.fillRect(left + px - band, top, band, px);
}

function tile(map: WorldMap, x: number, y: number) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return -1;
  return map.ground[y * map.w + x];
}

function buildingMesh(b: Building, night: boolean) {
  const group = new THREE.Group();
  const width = Math.max(1.4, b.w * 0.94);
  const depth = Math.max(1.4, b.h * 0.94);
  const height = b.id === "bank" || b.id === "library" || b.id === "centre" ? 3.15 : b.id === "home" ? 2.45 : 2.75;
  const cx = b.x + b.w / 2;
  const cz = b.y + b.h / 2;
  const faceSouth = cz < 16;
  const front = canvasTexture(paintStorefront(b.sign, b.wall, b.roof, MOTIF[b.id] ?? 2));
  const siding = canvasTexture(sidingCanvas(b.wall));
  siding.wrapS = THREE.RepeatWrapping;
  siding.wrapT = THREE.RepeatWrapping;
  siding.repeat.set(width / 2, height / 2);
  const sideMat = new THREE.MeshStandardMaterial({ map: siding, roughness: 0.84 });
  const frontMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.62 });
  const materials = [
    sideMat,
    sideMat.clone(),
    new THREE.MeshStandardMaterial({ color: "#6e675f", roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: "#6e675f", roughness: 1 }),
    faceSouth ? frontMat : sideMat.clone(),
    faceSouth ? sideMat.clone() : frontMat,
  ];
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials);
  body.position.set(cx, height / 2, cz);
  group.add(body);

  const roof = pitchedRoof(width + 0.35, depth + 0.28, b.roof);
  roof.position.set(cx, height, cz);
  group.add(roof);

  if (b.id === "home") {
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.7, 0.28),
      new THREE.MeshStandardMaterial({ color: "#8d4b3a", roughness: 0.8 }),
    );
    chimney.position.set(cx + width * 0.28, height + 0.55, cz);
    group.add(chimney);
  }
  if (b.id === "farm") {
    const silo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, height + 0.8, 12),
      new THREE.MeshStandardMaterial({ color: "#d9d3c6", roughness: 0.55, metalness: 0.08 }),
    );
    silo.position.set(cx + width / 2 + 0.35, (height + 0.8) / 2, cz);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8),
      new THREE.MeshStandardMaterial({ color: "#9c3b32", roughness: 0.6 }),
    );
    cap.scale.y = 0.6;
    cap.position.set(silo.position.x, height + 0.7, cz);
    group.add(silo, cap);
  }
  if (b.id === "bank") {
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, height * 0.92, 10),
        new THREE.MeshStandardMaterial({ color: "#f7f3ea", roughness: 0.4 }),
      );
      const z = faceSouth ? cz + depth / 2 + 0.12 : cz - depth / 2 - 0.12;
      column.position.set(cx + side * width * 0.32, height * 0.46, z);
      group.add(column);
    }
  }

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, 0.05, 0.55),
    new THREE.MeshStandardMaterial({ color: b.roof, roughness: 0.55 }),
  );
  awning.position.set(cx, height * 0.58, faceSouth ? cz + depth / 2 + 0.2 : cz - depth / 2 - 0.2);
  awning.rotation.x = faceSouth ? 0.25 : -0.25;
  group.add(awning);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.55, height * 0.28),
    new THREE.MeshStandardMaterial({
      color: "#ffd7a1",
      emissive: "#ffb15a",
      emissiveIntensity: night ? 1.4 : 0.28,
      roughness: 0.4,
    }),
  );
  glow.position.set(cx, height * 0.48, faceSouth ? cz + depth / 2 + 0.03 : cz - depth / 2 - 0.03);
  if (!faceSouth) glow.rotation.y = Math.PI;
  group.add(glow);

  if (night) {
    const lamp = new THREE.PointLight("#ffb56a", 0.55, 6, 1.6);
    lamp.position.set(cx, height * 0.5, faceSouth ? cz + depth / 2 + 0.4 : cz - depth / 2 - 0.4);
    group.add(lamp);
  }
  return group;
}

function pitchedRoof(width: number, depth: number, color: string) {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0);
  shape.lineTo(0, 0.85);
  shape.lineTo(depth / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  const canvas = shingleCanvas(color);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: canvasTexture(canvas), color, roughness: 0.78 }),
  );
  return mesh;
}

function treeMesh(tree: { x: number; y: number; kind: "pine" | "maple" }, season: Season) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6),
    new THREE.MeshStandardMaterial({ color: "#6a4630", roughness: 0.9 }),
  );
  trunk.position.y = 0.35;
  group.add(trunk);
  const leaf = season === "winter"
    ? "#e7eef2"
    : season === "fall"
      ? tree.kind === "maple" ? "#c45c28" : "#3d6244"
      : season === "spring"
        ? "#8fbf6a"
        : tree.kind === "pine" ? "#1d5a36" : "#2e7a42";
  const mat = new THREE.MeshStandardMaterial({ color: leaf, roughness: 0.82 });
  if (tree.kind === "pine") {
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62 - i * 0.14, 0.78, 8), mat);
      cone.position.y = 0.9 + i * 0.46;
      group.add(cone);
    }
  } else {
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), mat);
    canopy.scale.set(1.2, 0.85, 1.15);
    canopy.position.y = 1.2;
    group.add(canopy);
    if (season !== "winter") {
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 8),
        new THREE.MeshStandardMaterial({ color: season === "fall" ? "#e0893a" : "#3e9454", roughness: 0.7 }),
      );
      highlight.position.set(0.2, 1.35, 0.2);
      group.add(highlight);
    }
  }
  group.position.set(tree.x + 0.5, 0, tree.y + 0.5);
  return group;
}

function propMesh(prop: Prop) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#8a5a32", roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: "#c4473a", roughness: 0.7 });
  const put = (mesh: THREE.Object3D, y: number) => {
    mesh.position.y = y;
    group.add(mesh);
  };
  if (prop.kind === "bed") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 2.1), new THREE.MeshStandardMaterial({ color: "#f4f7fb", roughness: 0.6 })), 0.32);
    put(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.18), wood), 0.5);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.5 }));
    pillow.position.set(0, 0.52, -0.75);
    group.add(pillow);
  } else if (prop.kind === "desk") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.7), wood), 0.72);
    put(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.7), wood), 0.35);
  } else if (prop.kind === "bath") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.7), new THREE.MeshStandardMaterial({ color: "#f7f7f4", roughness: 0.25 })), 0.28);
  } else if (prop.kind === "cushion") {
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: "#e7a322", roughness: 0.6 }));
    cushion.scale.y = 0.45;
    put(cushion, 0.16);
  } else if (prop.kind === "kitchen") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: "#f7f1e6", roughness: 0.5 })), 0.45);
    put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.3, metalness: 0.4 })), 0.92);
  } else if (prop.kind === "couch") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.7), new THREE.MeshStandardMaterial({ color: "#3d6e99", roughness: 0.7 })), 0.32);
    put(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.16), new THREE.MeshStandardMaterial({ color: "#2f587c", roughness: 0.7 })), 0.62);
  } else if (prop.kind === "counter") {
    put(new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: "#f4efe4", roughness: 0.45 })), 0.5);
    put(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: "#6b4a32", roughness: 0.4 })), 0.98);
  } else if (prop.kind === "canoe") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.45), cloth);
    hull.position.y = 0.16;
    group.add(hull);
  } else if (prop.kind === "bench") {
    put(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), wood), 0.42);
  } else if (prop.kind === "bus") {
    put(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.7, 0.15), new THREE.MeshStandardMaterial({ color: "#5c5348" })), 0.85);
    put(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: "#1e4d6b" })), 1.7);
  } else if (prop.kind === "door") {
    put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: "#6b3a22", roughness: 0.6 })), 0.7);
  } else if (prop.kind === "window") {
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.8),
      new THREE.MeshStandardMaterial({ color: "#c5e4f5", emissive: "#ffd7a1", emissiveIntensity: 0.35, roughness: 0.15 }),
    );
    glass.position.y = 1.3;
    group.add(glass);
  } else if (prop.kind === "loon") {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: "#1c2430" }));
    body.scale.set(1.6, 0.7, 0.8);
    body.position.y = 0.1;
    group.add(body);
  }
  group.position.set(prop.x + 0.5, 0, prop.y + 0.5);
  return group;
}

function roadAim(map: WorldMap, x: number, z: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(z);
  for (const dy of [0, -1, 1, -2, 2, -3, 3]) {
    const y = ty + dy;
    if (tile(map, tx, y) === GROUND.path && (tile(map, tx + 1, y) === GROUND.path || tile(map, tx - 1, y) === GROUND.path)) {
      return { x: tx + 0.5, z: y + 0.5, dx: 1, dz: 0 };
    }
  }
  for (const dx of [0, -1, 1, -2, 2]) {
    const xx = tx + dx;
    if (tile(map, xx, ty) === GROUND.path && (tile(map, xx, ty - 1) === GROUND.path || tile(map, xx, ty + 1) === GROUND.path)) {
      return { x: xx + 0.5, z: ty + 0.5, dx: 0, dz: -1 };
    }
  }
  return { x, z, dx: 1, dz: 0 };
}

function openGround(map: WorldMap, x: number, z: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(z);
  if (tx < 1 || ty < 1 || tx >= map.w - 1 || ty >= map.h - 1) return false;
  if (map.solid[ty * map.w + tx]) return false;
  const g = map.ground[ty * map.w + tx];
  return g === GROUND.path || g === GROUND.grass || g === GROUND.sand || g === GROUND.plank;
}

function furnish(group: THREE.Group, map: WorldMap) {
  const mat = new THREE.MeshStandardMaterial({ color: map.id === "home" ? "#f4e7d4" : "#f7f1e6", roughness: 0.8 });
  const height = 1.05;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const border = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
      if (!border || !map.solid[y * map.w + x]) continue;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1), mat);
      wall.position.set(x + 0.5, height / 2, y + 0.5);
      group.add(wall);
    }
  }
  const lamp = new THREE.PointLight("#ffd2a1", 1.6, 14, 1.4);
  lamp.position.set(map.w / 2, 2.6, map.h / 2);
  group.add(lamp);
  if (map.id !== "home") {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.3, 0.35),
      new THREE.MeshStandardMaterial({ color: "#6b4a32", roughness: 0.6 }),
    );
    shelf.position.set(map.w / 2, 1.7, 1.15);
    group.add(shelf);
    const crateMat = new THREE.MeshStandardMaterial({ color: "#8a5a32", roughness: 0.75 });
    for (const [cx, cz] of [[3.2, 4.6], [4.4, 4.8], [8.2, 4.4], [7.2, 6.2]] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.55), crateMat);
      crate.position.set(cx, 0.28, cz);
      group.add(crate);
    }
  }
}

function addCars(group: THREE.Group, map: WorldMap) {
  const kept = spaceBoards(map.billboards);
  const parked: BoardSlot[] = [];
  for (const slot of map.billboards) {
    if (kept.some((board) => Math.hypot(board.x - slot.x, board.y - slot.y) < 2.4)) continue;
    if (parked.some((car) => Math.hypot(car.x - slot.x, car.y - slot.y) < 6)) continue;
    parked.push(slot);
    if (parked.length >= 8) break;
  }
  parked.forEach((slot, index) => {
    const car = carMesh(CAR_COLORS[index % CAR_COLORS.length]);
    const alongX = tile(map, slot.x, slot.y - 1) === GROUND.path || tile(map, slot.x, slot.y + 1) === GROUND.path;
    car.rotation.y = alongX ? 0 : Math.PI / 2;
    car.position.set(slot.x + 0.5, 0, slot.y + 0.5);
    group.add(car);
  });
}

function spaceBoards(slots: BoardSlot[]) {
  const kept: BoardSlot[] = [];
  for (const slot of slots) {
    if (kept.some((other) => Math.hypot(other.x - slot.x, other.y - slot.y) < 5)) continue;
    kept.push(slot);
  }
  return kept;
}

function carMesh(color: string) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.38, 0.82), paint);
  body.position.y = 0.4;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.34, 0.74),
    new THREE.MeshStandardMaterial({ color: "#b9d7ea", roughness: 0.12, metalness: 0.05 }),
  );
  cabin.position.set(-0.08, 0.72, 0);
  group.add(body, cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.85 });
  for (const [x, z] of [[0.55, 0.4], [0.55, -0.4], [-0.55, 0.4], [-0.55, -0.4]] as const) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.16, z);
    group.add(wheel);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: "#fff6d8", emissive: "#fff1c2", emissiveIntensity: 0.7 });
  for (const z of [0.24, -0.24]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.14), lampMat);
    lamp.position.set(0.92, 0.42, z);
    group.add(lamp);
  }
  return group;
}

function billboardMesh(map: WorldMap, sign: Sign, index: number) {
  const group = new THREE.Group();
  const face = roadFacing(map, sign.x, sign.y);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.9),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(paintBillboard(sign.name, sign.line, sign.accent, index % 6)),
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  board.position.y = 1.9;
  // Turn each board toward people walking the street, not only the shoulder.
  board.rotation.y = face + (index % 2 === 0 ? 0.7 : -0.7);
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 1.15, 8),
    new THREE.MeshStandardMaterial({ color: "#5c5348", roughness: 0.7, metalness: 0.2 }),
  );
  post.position.y = 0.58;
  group.add(board, post);
  group.position.set(sign.x + 0.5, 0, sign.y + 0.5);
  return group;
}

function roadFacing(map: WorldMap, x: number, y: number) {
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (tile(map, tx, ty + 1) === GROUND.path) return 0;
  if (tile(map, tx, ty - 1) === GROUND.path) return Math.PI;
  if (tile(map, tx + 1, ty) === GROUND.path) return Math.PI / 2;
  return -Math.PI / 2;
}

function labelSprite(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(255,253,248,0.94)";
    roundRect(ctx, 8, 10, 368, 60, 16);
    ctx.fill();
    ctx.fillStyle = "#1e1a16";
    ctx.font = "600 32px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 192, 42, 340);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(1.35, 0.28, 1);
  return sprite;
}

function makeWeather(kind: "rain" | "snow") {
  const count = 380;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: kind === "snow" ? "#ffffff" : "#d5e6f2", size: kind === "snow" ? 0.07 : 0.035 }),
  );
}

function sidingCanvas(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(40,30,20,0.08)";
  for (let y = 0; y < 128; y += 16) ctx.fillRect(0, y, 128, 2);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + (i % 4) * 0.02})`;
    ctx.fillRect((i * 17) % 128, (i * 29) % 128, 8, 3);
  }
  return canvas;
}

function shingleCanvas(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  for (let y = 8; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
    for (let x = (y / 16) % 2 === 0 ? 0 : 10; x < 128; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 16);
      ctx.stroke();
    }
  }
  return canvas;
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disposeTree(obj: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const item of Array.isArray(material) ? material : [material]) {
      if (materials.has(item)) continue;
      materials.add(item);
      const mapped = item as THREE.MeshStandardMaterial;
      if (mapped.map && !textures.has(mapped.map)) {
        textures.add(mapped.map);
        mapped.map.dispose();
      }
      item.dispose();
    }
  });
}

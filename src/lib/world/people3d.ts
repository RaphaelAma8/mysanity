import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { HAIR, SHIRT, SKIN } from "@/lib/sim/look";
import type { Avatar } from "@/lib/sim/types";

/** A rigged person. Walk and idle come from the CC0 animation clips. */
export interface HumanRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  idle: THREE.AnimationAction;
  walk: THREE.AnimationAction;
  dance: THREE.AnimationAction;
  mode: "idle" | "walk" | "dance";
  last: number;
  dispose: () => void;
}

const LOOKS = [
  { body: "male", hair: "buzzed" },
  { body: "female", hair: "long" },
  { body: "female", hair: "buns" },
  { body: "male", hair: "parted" },
] as const;

interface BodyAssets {
  scene: THREE.Group;
  cloth: THREE.BufferGeometry;
}

interface Library {
  bodies: Record<"female" | "male", BodyAssets>;
  hair: Record<string, { geometry: THREE.BufferGeometry; material: THREE.Material }>;
  idle: THREE.AnimationClip;
  walk: THREE.AnimationClip;
  dance: THREE.AnimationClip;
}

let library: Library | null = null;
let loading: Promise<Library> | null = null;
const tinted = new Map<string, THREE.CanvasTexture>();

export function peopleReady() {
  return library !== null;
}

export function loadPeople(): Promise<Library> {
  if (library) return Promise.resolve(library);
  if (loading) return loading;
  loading = fetchPeople().then((lib) => {
    library = lib;
    return lib;
  });
  return loading;
}

async function fetchPeople(): Promise<Library> {
  const loader = new GLTFLoader();
  const files = ["female", "male", "anim", "buzzed", "long", "buns", "parted"] as const;
  const loaded = await Promise.all(files.map((name) => loader.loadAsync(`/models/people/${name === "anim" ? "anim.glb" : `${name}.gltf`}`)));
  const [female, male, anim, buzzed, long, buns, parted] = loaded;
  const idle = THREE.AnimationClip.findByName(anim.animations, "Idle_Loop");
  const walk = THREE.AnimationClip.findByName(anim.animations, "Walk_Loop");
  const dance = THREE.AnimationClip.findByName(anim.animations, "Dance_Loop");
  if (!idle || !walk || !dance) throw new Error("Missing idle, walk, or dance clip");
  const hairOf = (gltf: (typeof loaded)[number]) => {
    const mesh = findSkinned(gltf.scene);
    if (!mesh) throw new Error("Hair mesh missing");
    gltf.scene.updateMatrixWorld(true);
    return { geometry: bakeToHead(mesh), material: mesh.material as THREE.Material };
  };
  return {
    bodies: { female: prepareBody(female.scene), male: prepareBody(male.scene) },
    hair: { buzzed: hairOf(buzzed), long: hairOf(long), buns: hairOf(buns), parted: hairOf(parted) },
    idle,
    walk,
    dance,
  };
}

function findSkinned(root: THREE.Object3D, namePrefix?: string): THREE.SkinnedMesh | null {
  const box: { mesh: THREE.SkinnedMesh | null } = { mesh: null };
  root.traverse((node) => {
    if (!(node instanceof THREE.SkinnedMesh)) return;
    if (namePrefix) {
      const material = node.material as THREE.Material;
      if (!material.name.startsWith(namePrefix)) return;
    }
    const current = box.mesh;
    if (!current || node.geometry.getAttribute("position").count > current.geometry.getAttribute("position").count) box.mesh = node;
  });
  return box.mesh;
}

function prepareBody(scene: THREE.Group): BodyAssets {
  scene.updateMatrixWorld(true);
  const body = findSkinned(scene, "MI_Superhero");
  if (!body) throw new Error("Body mesh missing");
  const cloth = body.geometry.clone();
  cloth.setAttribute("aCloth", new THREE.BufferAttribute(clothMask(body), 1));
  return { scene, cloth };
}

function clothMask(mesh: THREE.SkinnedMesh) {
  const index = mesh.geometry.getAttribute("skinIndex");
  const weight = mesh.geometry.getAttribute("skinWeight");
  const names = mesh.skeleton.bones.map((bone) => bone.name);
  const mask = new Float32Array(index.count);
  for (let i = 0; i < index.count; i++) {
    const weights = [weight.getX(i), weight.getY(i), weight.getZ(i), weight.getW(i)];
    const joints = [index.getX(i), index.getY(i), index.getZ(i), index.getW(i)];
    let best = 0;
    for (let k = 1; k < 4; k++) if (weights[k] > weights[best]) best = k;
    const name = names[Math.round(joints[best])] ?? "";
    if (/^(spine_|clavicle_|upperarm_|lowerarm_)/.test(name)) mask[i] = 1;
    else if (/^(pelvis|thigh_|calf_)/.test(name)) mask[i] = 2;
  }
  return mask;
}

function bakeToHead(mesh: THREE.SkinnedMesh) {
  const head = mesh.skeleton.bones.find((bone) => bone.name === "Head");
  if (!head) throw new Error("Head bone missing");
  const headIndex = mesh.skeleton.bones.indexOf(head);
  const boneMat = new THREE.Matrix4().multiplyMatrices(head.matrixWorld, mesh.skeleton.boneInverses[headIndex]);
  const headInv = head.matrixWorld.clone().invert();
  const geo = mesh.geometry.clone();
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const norm = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const vertex = new THREE.Vector3();
  const normalMat = new THREE.Matrix3().getNormalMatrix(boneMat);
  const headNormal = new THREE.Matrix3().getNormalMatrix(headInv);
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(boneMat).applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(headInv);
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
    if (norm) {
      vertex.fromBufferAttribute(norm, i).applyMatrix3(normalMat).applyMatrix3(headNormal).normalize();
      norm.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  geo.deleteAttribute("skinIndex");
  geo.deleteAttribute("skinWeight");
  geo.computeBoundingSphere();
  return geo;
}

function tintTexture(source: THREE.Texture, hex: string) {
  const key = `${source.uuid}:${hex}`;
  const cached = tinted.get(key);
  if (cached) return cached;
  const image = source.image as CanvasImageSource | undefined;
  const canvas = document.createElement("canvas");
  const width = 512;
  const height = 512;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !image) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    fallback.flipY = false;
    tinted.set(key, fallback);
    return fallback;
  }
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    count += 1;
  }
  const average = sum / Math.max(1, count);
  const color = new THREE.Color(hex);
  for (let i = 0; i < data.length; i += 4) {
    const shade = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / average;
    const lit = Math.min(1.85, shade);
    data[i] = Math.min(255, lit * color.r * 255);
    data[i + 1] = Math.min(255, lit * color.g * 255);
    data[i + 2] = Math.min(255, lit * color.b * 255);
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  tinted.set(key, texture);
  return texture;
}

function clothMaterial(shirt: string) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  const shirtColor = new THREE.Color(shirt);
  const pantsColor = new THREE.Color("#243044");
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShirt = { value: shirtColor };
    shader.uniforms.uPants = { value: pantsColor };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aCloth;\nvarying float vCloth;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3( position ) + normal * 0.012;\nvCloth = aCloth;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCloth;\nuniform vec3 uShirt;\nuniform vec3 uPants;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n if (vCloth < 0.5) discard;\n diffuseColor.rgb = vCloth < 1.5 ? uShirt : uPants;");
  };
  material.customProgramCacheKey = () => `cloth-${shirt}`;
  return material;
}

/** Clone a customized person. Call only after loadPeople resolves. */
export function createHuman(avatar: Avatar): HumanRig {
  if (!library) throw new Error("People are still loading");
  const look = LOOKS[avatar.style] ?? LOOKS[0];
  const assets = library.bodies[look.body];
  const model = cloneSkeleton(assets.scene) as THREE.Group;
  const owned: THREE.Material[] = [];
  const skin = SKIN[avatar.skin] ?? SKIN[1];
  const hair = HAIR[avatar.hair] ?? HAIR[0];
  const shirt = SHIRT[avatar.shirt] ?? SHIRT[0];
  model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.name.startsWith("MI_Superhero") && material.map) {
      const next = material.clone();
      next.map = tintTexture(material.map, skin);
      mesh.material = next;
      owned.push(next);
    } else if (material.name.startsWith("MI_Hair") && material.map) {
      const next = material.clone();
      next.map = tintTexture(material.map, hair);
      mesh.material = next;
      owned.push(next);
    }
  });
  const body = findSkinned(model, "MI_Superhero");
  if (body) {
    const cloth = new THREE.SkinnedMesh(assets.cloth, clothMaterial(shirt));
    cloth.bind(body.skeleton, body.bindMatrix);
    cloth.frustumCulled = false;
    body.parent?.add(cloth);
    owned.push(cloth.material as THREE.Material);
  }
  const style = library.hair[look.hair];
  const head = model.getObjectByName("Head");
  if (style && head) {
    const source = style.material as THREE.MeshStandardMaterial;
    const material = source.clone();
    if (source.map) material.map = tintTexture(source.map, hair);
    const hairMesh = new THREE.Mesh(style.geometry, material);
    hairMesh.frustumCulled = false;
    head.add(hairMesh);
    owned.push(material);
  }
  const root = new THREE.Group();
  root.add(model);
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (size.y < size.z * 0.75) {
    model.rotation.x = Math.PI / 2;
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    size = box.getSize(new THREE.Vector3());
  }
  const target = 1.72;
  if (size.y > 0.2) model.scale.multiplyScalar(target / size.y);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  model.position.y -= box.min.y;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 16),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);
  const mixer = new THREE.AnimationMixer(model);
  const idle = mixer.clipAction(library.idle);
  const walk = mixer.clipAction(library.walk);
  const dance = mixer.clipAction(library.dance);
  idle.play();
  return {
    root,
    mixer,
    idle,
    walk,
    dance,
    mode: "idle",
    last: -1,
    dispose: () => {
      mixer.stopAllAction();
      for (const material of owned) material.dispose();
    },
  };
}

export function poseHuman(rig: HumanRig, time: number, moving: boolean, quiet: boolean, dance = false) {
  if (quiet) return;
  const delta = rig.last < 0 ? 0 : Math.min(0.05, Math.max(0, time - rig.last));
  rig.last = time;
  const next = moving ? "walk" : dance ? "dance" : "idle";
  if (rig.mode !== next) {
    const actions = { idle: rig.idle, walk: rig.walk, dance: rig.dance };
    actions[rig.mode].fadeOut(0.2);
    rig.mode = next;
    actions[next].reset().fadeIn(0.2).play();
  }
  rig.mixer.update(delta);
}

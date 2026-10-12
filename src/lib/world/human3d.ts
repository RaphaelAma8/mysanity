import * as THREE from "three";
import { HAIR, SHIRT, SKIN } from "@/lib/sim/look";
import type { Avatar } from "@/lib/sim/types";

export interface HumanRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  chest: THREE.Object3D;
  lids: THREE.Mesh[];
}

const skinMat = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.46, metalness: 0.02 });
const cloth = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.78, metalness: 0 });
const hairMat = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38, metalness: 0.08 });

function cast(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function capsule(r: number, len: number, material: THREE.Material) {
  return cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.02, len), 5, 10), material));
}

/** A proportioned person, about 1.7 units tall, with a walk cycle. Original geometry, not a downloaded model. */
export function createHuman(avatar: Avatar): HumanRig {
  const skin = skinMat(SKIN[avatar.skin] ?? SKIN[1]);
  const shirt = cloth(SHIRT[avatar.shirt] ?? SHIRT[0]);
  const hair = hairMat(HAIR[avatar.hair] ?? HAIR[0]);
  const pants = cloth("#2a3544");
  const shoe = new THREE.MeshStandardMaterial({ color: "#1c2430", roughness: 0.5, metalness: 0.15 });
  const root = new THREE.Group();

  const leg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.94, 0);
    const thigh = capsule(0.062, 0.36, pants);
    thigh.position.y = -0.24;
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    const shin = capsule(0.052, 0.34, pants);
    shin.position.y = -0.22;
    const foot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), shoe));
    foot.position.set(0, -0.42, 0.04);
    knee.add(shin, foot);
    hip.add(thigh, knee);
    return { hip, knee };
  };
  const left = leg(-1);
  const right = leg(1);

  const chest = new THREE.Group();
  chest.position.y = 1.02;
  const torso = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.48, 16), shirt));
  torso.position.y = 0.2;
  const collar = cast(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), skin));
  collar.scale.set(1, 0.7, 1);
  collar.position.y = 0.46;
  const pelvis = cast(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), pants));
  pelvis.scale.set(1.25, 0.72, 0.9);
  pelvis.position.y = 0.98;

  const arm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 0.36, 0);
    const upper = capsule(0.046, 0.28, shirt);
    upper.position.y = -0.2;
    const fore = capsule(0.04, 0.24, skin);
    fore.position.y = -0.48;
    const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), skin));
    hand.position.y = -0.64;
    shoulder.add(upper, fore, hand);
    return shoulder;
  };
  const leftArm = arm(-1);
  const rightArm = arm(1);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.56;
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 16), skin));
  skull.scale.set(0.96, 1.08, 0.98);
  const ear = (side: number) => {
    const e = cast(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skin));
    e.position.set(side * 0.14, 0, 0);
    e.scale.set(0.6, 1, 0.7);
    return e;
  };
  const eyeWhite = new THREE.MeshStandardMaterial({ color: "#f7f4ef", roughness: 0.25 });
  const iris = new THREE.MeshStandardMaterial({ color: "#3a2a22", roughness: 0.3 });
  const eye = (side: number) => {
    const g = new THREE.Group();
    const white = cast(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeWhite));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), iris);
    pupil.position.z = 0.02;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    glint.position.set(0.008, 0.008, 0.03);
    g.add(white, pupil, glint);
    g.position.set(side * 0.048, 0.03, 0.11);
    return g;
  };
  const lidMat = skinMat(SKIN[avatar.skin] ?? SKIN[1]);
  const lid = (side: number) => {
    const m = cast(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), lidMat));
    m.position.set(side * 0.048, 0.05, 0.125);
    return m;
  };
  const lids = [lid(-1), lid(1)];
  const brow = (side: number) => {
    const m = cast(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.012), hair));
    m.position.set(side * 0.05, 0.075, 0.125);
    m.rotation.z = side * -0.25;
    return m;
  };
  const nose = cast(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), skin));
  nose.scale.set(0.7, 0.85, 1.1);
  nose.position.set(0, -0.01, 0.13);
  const lip = new THREE.MeshStandardMaterial({ color: "#c4847a", roughness: 0.45 });
  const mouth = cast(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.015), lip));
  mouth.position.set(0, -0.055, 0.125);
  mouth.name = "mouth";

  const hairGroup = new THREE.Group();
  const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), hair));
  cap.scale.set(1.02, 0.72, 1.02);
  cap.position.y = 0.06;
  hairGroup.add(cap);
  if (avatar.style === 1) {
    const sideHair = (s: number) => {
      const h = capsule(0.04, 0.22, hair);
      h.position.set(s * 0.12, -0.12, 0);
      return h;
    };
    hairGroup.add(sideHair(-1), sideHair(1));
  } else if (avatar.style === 2) {
    const bun = cast(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), hair));
    bun.position.y = 0.18;
    hairGroup.add(bun);
  } else if (avatar.style === 3) {
    for (const [x, y, z] of [[-0.08, 0.12, 0.02], [0.08, 0.12, 0.02], [0, 0.18, 0], [-0.05, 0.08, 0.08], [0.05, 0.08, -0.04]] as const) {
      const curl = cast(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hair));
      curl.position.set(x, y, z);
      hairGroup.add(curl);
    }
  }

  headPivot.add(skull, ear(-1), ear(1), eye(-1), eye(1), ...lids, brow(-1), brow(1), nose, mouth, hairGroup);
  chest.add(torso, collar, leftArm, rightArm, headPivot);
  root.add(left.hip, right.hip, pelvis, chest);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 16),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  return {
    root, leftLeg: left.hip, rightLeg: right.hip, leftKnee: left.knee, rightKnee: right.knee,
    leftArm, rightArm, chest, lids,
  };
}

export function poseHuman(rig: HumanRig, time: number, moving: boolean, quiet: boolean) {
  const t = quiet ? 0 : time;
  if (!moving || quiet) {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftKnee.rotation.x = 0;
    rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0.08;
    rig.rightArm.rotation.x = 0.08;
    rig.chest.position.y = 1.02 + Math.sin(t * 1.6) * 0.008;
  } else {
    const s = Math.sin(t * 8);
    rig.leftLeg.rotation.x = s * 0.7;
    rig.rightLeg.rotation.x = -s * 0.7;
    rig.leftKnee.rotation.x = Math.max(0, -s) * 0.8;
    rig.rightKnee.rotation.x = Math.max(0, s) * 0.8;
    rig.leftArm.rotation.x = -s * 0.55;
    rig.rightArm.rotation.x = s * 0.55;
    rig.chest.position.y = 1.02 + Math.abs(Math.sin(t * 16)) * 0.02;
  }
  const blink = !quiet && Math.sin(t * 0.7) > 0.97;
  for (const lid of rig.lids) lid.scale.y = blink ? 4 : 1;
}

"use client";

import { useEffect, useRef } from "react";
import type { Avatar } from "@/lib/sim/types";

/** Studio preview of the same 3D person used on the street. */
export function AvatarView({ avatar }: { avatar: Avatar }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = `${avatar.skin}.${avatar.hair}.${avatar.style}.${avatar.shirt}`;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dead = false;
    let raf = 0;
    let cleanup = () => {};
    void (async () => {
      const THREE = await import("three");
      const { createHuman, poseHuman } = await import("@/lib/world/human3d");
      if (dead || !canvas.isConnected) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0.55, 1.15, 2.15);
      camera.lookAt(0, 0.98, 0);
      const backdrop = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 40),
        new THREE.MeshStandardMaterial({ color: "#efe4d4", roughness: 0.9 }),
      );
      backdrop.position.set(0, 0.95, -0.55);
      scene.add(backdrop);
      scene.add(new THREE.HemisphereLight("#fff6ee", "#c9b59a", 0.9));
      const key = new THREE.DirectionalLight("#fff8ef", 2.2);
      key.position.set(2.2, 4, 3);
      const rim = new THREE.DirectionalLight("#d7e6f2", 0.6);
      rim.position.set(-2, 2, -1);
      scene.add(key, rim);
      const rig = createHuman(avatar);
      scene.add(rig.root);
      let sized = "";
      const loop = (now: number) => {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const next = `${w}x${h}@${dpr}`;
        if (next !== sized) {
          sized = next;
          renderer.setPixelRatio(dpr);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        poseHuman(rig, now / 1000, false, false);
        rig.root.rotation.y = Math.sin(now / 1800) * 0.35;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      cleanup = () => {
        cancelAnimationFrame(raf);
        renderer.dispose();
      };
      if (dead) {
        cleanup();
        return;
      }
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [look, avatar]);

  return <canvas ref={ref} className="h-72 w-44" aria-label="Your character" role="img" />;
}

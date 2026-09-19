"use client";

import * as THREE from "three";
import { COLORS } from "./palette";

export interface MaisonLayout {
  root: THREE.Group;
  houseRoot: THREE.Group;
  windowMaterials: THREE.MeshPhysicalMaterial[];
  ringMaterials: THREE.MeshBasicMaterial[];
  door: THREE.Mesh | null;
  doorPivot: THREE.Group;
  doorRing: THREE.Mesh | null;
  houseInfo: THREE.Object3D | null;
}

export function buildMaison(): MaisonLayout {
  const root = new THREE.Group();
  const houseRoot = new THREE.Group();
  root.add(houseRoot);

  const windowMaterials: THREE.MeshPhysicalMaterial[] = [];
  const ringMaterials: THREE.MeshBasicMaterial[] = [];

  // ================= PLATEFORME =================
  const platMat = new THREE.MeshStandardMaterial({
    color: 0x1b1440,
    roughness: 0.55,
    metalness: 0.2,
    emissive: 0x0c0822,
    emissiveIntensity: 0.5,
  });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 20.5, 1.1, 16), platMat);
  plat.position.y = -0.55;
  root.add(plat);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x101034,
    roughness: 0.45,
    metalness: 0.35,
    emissive: 0x05070f,
    emissiveIntensity: 0.4,
  });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(20.7, 20.5, 0.5, 32), rimMat);
  rim.position.y = -1.4;
  root.add(rim);

  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0x1d1445,
    roughness: 0.5,
    metalness: 0.3,
    emissive: 0x0d0830,
    emissiveIntensity: 0.6,
  });
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(18.4, 0.28, 10, 48), ring2Mat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -2.15;
  root.add(ring2);

  const ring3Mat = new THREE.MeshStandardMaterial({
    color: 0x241a58,
    roughness: 0.5,
    metalness: 0.3,
    emissive: 0x140c3c,
    emissiveIntensity: 0.7,
  });
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(14.9, 0.35, 10, 48), ring3Mat);
  ring3.rotation.x = Math.PI / 2;
  ring3.position.y = -2.75;
  root.add(ring3);

  const ring4Mat = new THREE.MeshStandardMaterial({
    color: 0x2d1f6e,
    roughness: 0.5,
    metalness: 0.3,
    emissive: 0x1a1050,
    emissiveIntensity: 0.8,
  });
  const ring4 = new THREE.Mesh(new THREE.TorusGeometry(10.7, 0.45, 10, 48), ring4Mat);
  ring4.rotation.x = Math.PI / 2;
  ring4.position.y = -3.3;
  root.add(ring4);

  const ring5Mat = new THREE.MeshStandardMaterial({
    color: 0x36227e,
    roughness: 0.5,
    metalness: 0.3,
    emissive: 0x241260,
    emissiveIntensity: 0.9,
  });
  const ring5 = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.55, 10, 48), ring5Mat);
  ring5.rotation.x = Math.PI / 2;
  ring5.position.y = -3.8;
  root.add(ring5);

  const ring6Mat = new THREE.MeshStandardMaterial({
    color: 0x3d2a94,
    roughness: 0.5,
    metalness: 0.3,
    emissive: 0x2c1a70,
    emissiveIntensity: 1.0,
  });
  const ring6 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.65, 10, 48), ring6Mat);
  ring6.rotation.x = Math.PI / 2;
  ring6.position.y = -4.2;
  root.add(ring6);

  // Ventre lumineux sous la plateforme
  const bellyMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.6, 5.4, 24, 1, true), bellyMat);
  belly.position.y = -7.6;
  root.add(belly);

  // ================= SOL INTÉRIEUR =================
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0e0b22,
    roughness: 0.7,
    metalness: 0.15,
    emissive: 0x05030c,
    emissiveIntensity: 0.6,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(22.9, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  root.add(floor);

  // Lignes lumineuses circulaires gravées dans le sol
  const innerRingsMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const radius of [6, 11.5, 17, 22]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.07, radius + 0.07, 48), innerRingsMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    root.add(ring);
  }

  // ================= COQUE DE LA MAISON =================
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.darkShell,
    roughness: 0.38,
    metalness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.3,
    emissive: 0x070512,
    emissiveIntensity: 0.4,
  });

  // Segment avant
  const shellA = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 5, 32, 1, false, 0, Math.PI), shellMat);
  shellA.position.set(0, 2.5, -16);
  root.add(shellA);

  // Segment arrière
  const shellB = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 5, 32, 1, false, Math.PI, Math.PI), shellMat);
  shellB.position.set(0, 2.5, -16);
  root.add(shellB);

  // Toit — deux demi-ellipses low-poly
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1338,
    roughness: 0.4,
    metalness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.35,
    emissive: 0x090614,
    emissiveIntensity: 0.5,
  });
  const roofA = new THREE.Mesh(new THREE.SphereGeometry(16, 22, 10, 0, Math.PI, 0, Math.PI / 2), roofMat);
  roofA.position.set(0, 5, -16);
  root.add(roofA);

  // Anneau faîtier lumineux
  const crestMat = new THREE.MeshBasicMaterial({
    color: COLORS.violet,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const crest = new THREE.Mesh(new THREE.TorusGeometry(16.15, 0.16, 8, 40), crestMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 5.05, -16);
  root.add(crest);

  // ================= FENÊTRES (bandeaux qui respirent) =================
  const windowGroups: { cx: number; cz: number; ry: number }[] = [
    { cx: -9.5, cz: -3.75, ry: 0 },
    { cx: 9.5, cz: -3.75, ry: 0 },
    { cx: -9.5, cz: -28.25, ry: Math.PI },
    { cx: 9.5, cz: -28.25, ry: Math.PI },
    { cx: -16.85, cz: -11.5, ry: Math.PI / 2 },
    { cx: -16.85, cz: -20.5, ry: Math.PI / 2 },
    { cx: 16.85, cz: -11.5, ry: -Math.PI / 2 },
    { cx: 16.85, cz: -20.5, ry: -Math.PI / 2 },
  ];

  for (const wg of windowGroups) {
    const winMat = new THREE.MeshPhysicalMaterial({
      color: COLORS.darkGlass,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
      transmission: 0.85,
      thickness: 0.4,
    });
    windowMaterials.push(winMat);
    const band = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.1, 0.15), winMat);
    band.position.set(wg.cx, 3.1, wg.cz);
    band.rotation.y = wg.ry;
    root.add(band);
  }

  // Oculi frontaux
  const frontMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.darkGlass,
    emissive: COLORS.violet,
    emissiveIntensity: 1.1,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
    transmission: 0.8,
    thickness: 0.4,
  });
  windowMaterials.push(frontMat);
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), frontMat);
  oculus.position.set(0, 4.3, -0.02);
  root.add(oculus);

  // ================= PORCHE + CHEMIN =================
  const porchMat = new THREE.MeshStandardMaterial({
    color: 0x191238,
    roughness: 0.45,
    metalness: 0.3,
    emissive: 0x08051a,
    emissiveIntensity: 0.6,
  });
  const porch = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.45, 16), porchMat);
  porch.position.set(0, 0.22, 4.8);
  root.add(porch);

  const archMat = new THREE.MeshStandardMaterial({
    color: 0x1d1450,
    roughness: 0.4,
    metalness: 0.35,
    emissive: 0x0d0630,
    emissiveIntensity: 0.8,
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.2, 10, 24, Math.PI), archMat);
  arch.position.set(0, 0.45, 4.8);
  root.add(arch);

  // Chemin lumineux d'entrée
  const pavers: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.path,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.4 + t * 0.6,
      roughness: 0.6,
      metalness: 0.1,
    });
    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 12), mat);
    step.position.set(0, 0.06, 9.6 + i * 1.7);
    root.add(step);
    pavers.push(step);
  }
  const trailMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 13.8), trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(0, 0.045, 15.6);
  root.add(trail);

  // Bordures de porte
  const doorEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x0a1428,
    emissive: COLORS.cyan,
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.4,
  });
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.3), doorEdgeMat);
  doorFrame.position.set(0, 0.42, 0.05);
  root.add(doorFrame);

  // ================= PORTE (s'ouvre au clic, pivot sur charnière) =================
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.3, 0, 0.02);
  root.add(doorPivot);

  const doorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1428,
    emissive: COLORS.violet,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
    clearcoat: 0.6,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.6, 0.16), doorMat);
  door.position.set(1.3, 2.3, 0);
  doorPivot.add(door);

  const doorRingMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ringMaterials.push(doorRingMat);
  const doorRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 8, 32, Math.PI), doorRingMat);
  doorRing.position.set(0, 0.45, 0.05);
  root.add(doorRing);

  // Panneau holographique « Maison d'Origin » au-dessus de la porte
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sctx = signCanvas.getContext("2d");
  if (sctx) {
    sctx.fillStyle = "rgba(5,6,15,0.0)";
    sctx.fillRect(0, 0, 512, 128);
    sctx.font = "600 44px Orbitron, sans-serif";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.shadowColor = "#00e5ff";
    sctx.shadowBlur = 18;
    sctx.fillStyle = "#9feaff";
    sctx.fillText("MAISON D'ORIGIN", 256, 64);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.MeshBasicMaterial({
    map: signTex,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), signMat);
  sign.position.set(0, 6.4, -0.05);
  root.add(sign);

  const houseInfo = new THREE.Object3D();
  houseInfo.position.set(0, 0, 0);
  root.add(houseInfo);

  return {
    root,
    houseRoot,
    windowMaterials,
    ringMaterials,
    door,
    doorPivot,
    doorRing,
    houseInfo,
  };
}

export interface HouseAnimation {
  update(t: number, cameraPos: THREE.Vector3): void;
}

export function createHouseAnimation(
  layout: MaisonLayout,
  doorOpen: { current: boolean }
): HouseAnimation {
  const breathe = (t: number) => 0.5 + 0.5 * Math.sin(t * 0.8);
  return {
    update(t: number, cameraPos: THREE.Vector3) {
      const b = breathe(t);
      for (const mat of layout.windowMaterials) {
        mat.emissiveIntensity = 0.7 + b * 0.55;
      }
      for (const mat of layout.ringMaterials) {
        mat.opacity = 0.3 + b * 0.25;
      }

      // Ouverture de la porte (pivot sur charnière gauche)
      const targetAngle = doorOpen.current ? -1.9 : 0;
      layout.doorPivot.rotation.y += (targetAngle - layout.doorPivot.rotation.y) * 0.06;

      // La maison "regarde" légèrement le visiteur (parallaxe douce)
      const dx = cameraPos.x;
      const dz = cameraPos.z + 16;
      const dist = Math.max(Math.sqrt(dx * dx + dz * dz), 1);
      layout.root.rotation.y = (dx / dist) * 0.06;
    },
  };
}

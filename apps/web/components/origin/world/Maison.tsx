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
  breathers: { mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial; base: number; amp: number; speed: number; phase: number }[];
  windows: THREE.Mesh[];
}

/** Texture de bruit procédurale réutilisable (canvas). */
function makeNoiseTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 128 + (Math.random() - 0.5) * 160;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildMaison(): MaisonLayout {
  const root = new THREE.Group();
  const houseRoot = new THREE.Group();
  root.add(houseRoot);

  const windowMaterials: THREE.MeshPhysicalMaterial[] = [];
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const breathers: MaisonLayout["breathers"] = [];
  const windows: THREE.Mesh[] = [];

  // ================= PLATEFORME =================
  const noiseTex = makeNoiseTexture(128);
  noiseTex.repeat.set(6, 2);

  const platMat = new THREE.MeshStandardMaterial({
    color: 0x1b1440,
    roughness: 0.5,
    metalness: 0.25,
    emissive: 0x0c0822,
    emissiveIntensity: 0.5,
    normalMap: noiseTex,
    normalScale: new THREE.Vector2(0.35, 0.35),
  });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 20.5, 1.1, 48, 1), platMat);
  plat.position.y = -0.55;
  root.add(plat);

  // Bord lumineux cyan de la plateforme (strip LED)
  const edgeMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const edge = new THREE.Mesh(new THREE.TorusGeometry(23.45, 0.09, 10, 96), edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = -0.02;
  root.add(edge);
  breathers.push({ mat: edgeMat as unknown as THREE.MeshStandardMaterial, base: 0.35, amp: 0.25, speed: 0.8, phase: 0 });

  // ================= ANNEAUX SUSPENDUS (superstructure) =================
  const ringDefs = [
    { r: 18.4, y: -2.15, t: 0.28, color: 0x1d1445, em: 0x0d0830, ei: 0.6 },
    { r: 14.9, y: -2.75, t: 0.35, color: 0x241a58, em: 0x140c3c, ei: 0.7 },
    { r: 10.7, y: -3.3, t: 0.45, color: 0x2d1f6e, em: 0x1a1050, ei: 0.8 },
    { r: 6.4, y: -3.8, t: 0.55, color: 0x36227e, em: 0x241260, ei: 0.9 },
    { r: 2.5, y: -4.2, t: 0.65, color: 0x3d2a94, em: 0x2c1a70, ei: 1.0 },
  ];
  for (const rd of ringDefs) {
    const mat = new THREE.MeshStandardMaterial({
      color: rd.color,
      roughness: 0.45,
      metalness: 0.35,
      emissive: rd.em,
      emissiveIntensity: rd.ei,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rd.r, rd.t, 12, 72), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = rd.y;
    root.add(ring);

    // Halo lumineux fin sous chaque anneau
    const glowMat = new THREE.MeshBasicMaterial({
      color: rd.r > 12 ? 0x00e5ff : 0x7c4dff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(new THREE.TorusGeometry(rd.r + rd.t * 0.6, 0.045, 8, 96), glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = rd.y - rd.t * 0.8;
    root.add(glow);
    breathers.push({ mat: glowMat as unknown as THREE.MeshStandardMaterial, base: 0.08, amp: 0.08, speed: 0.5, phase: rd.r });
  }

  // Connecteurs verticaux lumineux entre anneaux (faisceaux)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), beamMat);
    beam.position.set(Math.cos(a) * 16.5, -2.5, Math.sin(a) * 16.5);
    root.add(beam);
    breathers.push({ mat: beamMat as unknown as THREE.MeshStandardMaterial, base: 0.06, amp: 0.06, speed: 0.9, phase: i * 1.3 });
  }

  // Ventre lumineux sous la plateforme (réacteur)
  const bellyMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.6, 5.4, 32, 1, true), bellyMat);
  belly.position.y = -7.6;
  root.add(belly);
  breathers.push({ mat: bellyMat as unknown as THREE.MeshStandardMaterial, base: 0.04, amp: 0.03, speed: 1.2, phase: 2 });

  // Lueur au sol projetée par le réacteur (fausse AO)
  const underGlow = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.03,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.y = -9.5;
  root.add(underGlow);

  // ================= SOL INTÉRIEUR (shader holographique) =================
  const floorMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0x00e5ff) },
      uColorB: { value: new THREE.Color(0x7c4dff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        float r = length(c) * 2.0;
        float angle = atan(c.y, c.x);
        // anneaux concentriques avec ondulation
        float rings = sin(r * 34.0 - uTime * 1.4) * 0.5 + 0.5;
        rings = smoothstep(0.75, 1.0, rings);
        // rayons discrets
        float rays = sin(angle * 12.0 + uTime * 0.5) * 0.5 + 0.5;
        rays = smoothstep(0.85, 1.0, rays);
        // masque : plus dense vers le centre
        float mask = smoothstep(1.0, 0.15, r);
        // scintillement doux
        float sparkle = hash(floor(vUv * 90.0));
        float pulse = 0.5 + 0.5 * sin(uTime * 0.9 - r * 5.0);
        vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(angle * 2.0 + r * 3.0 - uTime * 0.4));
        float alpha = (rings * 0.5 + rays * 0.3) * mask * (0.45 + pulse * 0.4) + sparkle * 0.02 * mask;
        gl_FragColor = vec4(col * 1.6, alpha * 0.5);
      }
    `,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(22.9, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  root.add(floor);

  // Sol physique sous le shader (pour la profondeur)
  const solidFloorMat = new THREE.MeshStandardMaterial({
    color: 0x0e0b22,
    roughness: 0.65,
    metalness: 0.25,
    emissive: 0x05030c,
    emissiveIntensity: 0.6,
    normalMap: noiseTex,
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
  const solidFloor = new THREE.Mesh(new THREE.CircleGeometry(23, 64), solidFloorMat);
  solidFloor.rotation.x = -Math.PI / 2;
  solidFloor.position.y = 0.005;
  root.add(solidFloor);

  // ================= COQUE DE LA MAISON =================
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.darkShell,
    roughness: 0.32,
    metalness: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.25,
    emissive: 0x070512,
    emissiveIntensity: 0.4,
    normalMap: noiseTex,
    normalScale: new THREE.Vector2(0.25, 0.25),
  });

  const shellA = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 5, 48, 1, false, 0, Math.PI), shellMat);
  shellA.position.set(0, 2.5, -16);
  root.add(shellA);

  const shellB = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 5, 48, 1, false, Math.PI, Math.PI), shellMat);
  shellB.position.set(0, 2.5, -16);
  root.add(shellB);

  // Toit dôme
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1338,
    roughness: 0.35,
    metalness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.3,
    emissive: 0x090614,
    emissiveIntensity: 0.5,
    normalMap: noiseTex,
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
  const roofA = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 14, 0, Math.PI, 0, Math.PI / 2), roofMat);
  roofA.position.set(0, 5, -16);
  root.add(roofA);

  // Nervures de coque (arcs verticaux lumineux sur le dôme)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ribMat = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0x7c4dff : 0x00e5ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rib = new THREE.Mesh(new THREE.TorusGeometry(16.1, 0.035, 6, 48, Math.PI / 2), ribMat);
    rib.position.set(0, 5, -16);
    rib.rotation.y = a;
    rib.rotation.z = Math.PI / 2;
    rib.renderOrder = 2;
    root.add(rib);
    breathers.push({ mat: ribMat as unknown as THREE.MeshStandardMaterial, base: 0.2, amp: 0.15, speed: 0.7, phase: i * 0.7 });
  }

  // Anneau faîtier
  const crestMat = new THREE.MeshBasicMaterial({
    color: COLORS.violet,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const crest = new THREE.Mesh(new THREE.TorusGeometry(16.15, 0.14, 10, 96), crestMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 5.05, -16);
  root.add(crest);
  breathers.push({ mat: crestMat as unknown as THREE.MeshStandardMaterial, base: 0.3, amp: 0.2, speed: 0.6, phase: 1 });

  // Flèche/antenne au sommet avec lumière clignotante
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x2a1f5e,
    roughness: 0.4,
    metalness: 0.5,
    emissive: 0x140c3a,
    emissiveIntensity: 0.8,
  });
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 3.4, 8), spireMat);
  spire.position.set(0, 21.2, -16);
  root.add(spire);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), beaconMat);
  beacon.position.set(0, 22.9, -16);
  root.add(beacon);
  breathers.push({ mat: beaconMat as unknown as THREE.MeshStandardMaterial, base: 0.4, amp: 0.5, speed: 2.2, phase: 0 });
  const beaconLight = new THREE.PointLight(0xff6b9d, 1.4, 12, 2);
  beaconLight.position.set(0, 22.9, -16);
  root.add(beaconLight);
  root.userData.beaconLight = beaconLight;

  // ================= FENÊTRES (bandeaux qui respirent) =================
  const windowGroups: { cx: number; cz: number; ry: number; w: number }[] = [
    { cx: -9.5, cz: -3.75, ry: 0, w: 7.6 },
    { cx: 9.5, cz: -3.75, ry: 0, w: 7.6 },
    { cx: -9.5, cz: -28.25, ry: Math.PI, w: 7.6 },
    { cx: 9.5, cz: -28.25, ry: Math.PI, w: 7.6 },
    { cx: -16.85, cz: -11.5, ry: Math.PI / 2, w: 6.6 },
    { cx: -16.85, cz: -20.5, ry: Math.PI / 2, w: 6.6 },
    { cx: 16.85, cz: -11.5, ry: -Math.PI / 2, w: 6.6 },
    { cx: 16.85, cz: -20.5, ry: -Math.PI / 2, w: 6.6 },
  ];

  const windowGlassTex = makeWindowTexture();
  for (const wg of windowGroups) {
    const winMat = new THREE.MeshPhysicalMaterial({
      color: COLORS.darkGlass,
      emissive: COLORS.cyan,
      emissiveIntensity: 1.1,
      emissiveMap: windowGlassTex,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.72,
      transmission: 0.9,
      thickness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    windowMaterials.push(winMat);
    const band = new THREE.Mesh(new THREE.BoxGeometry(wg.w, 2.1, 0.15), winMat);
    band.position.set(wg.cx, 3.1, wg.cz);
    band.rotation.y = wg.ry;
    root.add(band);
    windows.push(band);

    // Cadres de fenêtre (meneaux)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1f1b3d,
      roughness: 0.4,
      metalness: 0.45,
      emissive: 0x0a0620,
      emissiveIntensity: 0.5,
    });
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.18), frameMat);
    mullionV.position.set(wg.cx + Math.cos(wg.ry) * 1.9 * (wg.cx > 0 ? 1 : -1), 3.1, wg.cz + (wg.ry === 0 ? 0 : 0));
    mullionV.rotation.y = wg.ry;
    root.add(mullionV);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(wg.w + 0.4, 0.16, 0.2), frameMat);
    lintel.position.set(wg.cx, 4.25, wg.cz);
    lintel.rotation.y = wg.ry;
    root.add(lintel);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wg.w + 0.4, 0.16, 0.2), frameMat);
    sill.position.set(wg.cx, 1.95, wg.cz);
    sill.rotation.y = wg.ry;
    root.add(sill);
  }

  // Oculi frontal violet
  const frontMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.darkGlass,
    emissive: COLORS.violet,
    emissiveIntensity: 1.3,
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
    opacity: 0.62,
    transmission: 0.85,
    thickness: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  windowMaterials.push(frontMat);
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), frontMat);
  oculus.position.set(0, 4.3, -0.02);
  root.add(oculus);
  windows.push(oculus);

  // Halo derrière l'oculus (glow projeté)
  const oculusGlowMat = new THREE.MeshBasicMaterial({
    color: COLORS.violet,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const oculusGlow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), oculusGlowMat);
  oculusGlow.position.set(0, 4.3, 0.12);
  root.add(oculusGlow);
  breathers.push({ mat: oculusGlowMat as unknown as THREE.MeshStandardMaterial, base: 0.12, amp: 0.1, speed: 0.9, phase: 3 });

  // ================= PORCHE =================
  const porchMat = new THREE.MeshStandardMaterial({
    color: 0x191238,
    roughness: 0.4,
    metalness: 0.35,
    emissive: 0x08051a,
    emissiveIntensity: 0.6,
    normalMap: noiseTex,
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
  const porch = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.45, 24), porchMat);
  porch.position.set(0, 0.22, 4.8);
  root.add(porch);

  // Bordure lumineuse du porche
  const porchEdgeMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const porchEdge = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.05, 8, 64), porchEdgeMat);
  porchEdge.rotation.x = Math.PI / 2;
  porchEdge.position.set(0, 0.45, 4.8);
  root.add(porchEdge);
  breathers.push({ mat: porchEdgeMat as unknown as THREE.MeshStandardMaterial, base: 0.35, amp: 0.25, speed: 1.0, phase: 4 });

  // Arche du porche renforcée
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x1d1450,
    roughness: 0.35,
    metalness: 0.4,
    emissive: 0x0d0630,
    emissiveIntensity: 0.9,
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.22, 12, 32, Math.PI), archMat);
  arch.position.set(0, 0.45, 4.8);
  root.add(arch);

  // Deux colonnes du porche
  for (const sx of [-2.7, 2.7]) {
    const colMat = new THREE.MeshStandardMaterial({
      color: 0x221848,
      roughness: 0.4,
      metalness: 0.35,
      emissive: 0x0f0a30,
      emissiveIntensity: 0.7,
    });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.6, 10), colMat);
    col.position.set(sx, 2.3, 4.8);
    root.add(col);
    // Anneau lumineux sur la colonne
    const colRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const colRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), colRingMat);
    colRing.rotation.x = Math.PI / 2;
    colRing.position.set(sx, 1.4, 4.8);
    root.add(colRing);
    breathers.push({ mat: colRingMat as unknown as THREE.MeshStandardMaterial, base: 0.3, amp: 0.2, speed: 1.1, phase: sx });
  }

  // Chemin lumineux d'entrée — dalles + flux de particules visuel
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.path,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.4 + t * 0.7,
      roughness: 0.5,
      metalness: 0.15,
    });
    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 16), mat);
    step.position.set(0, 0.06, 9.6 + i * 1.7);
    root.add(step);

    // Point lumineux au centre de chaque dalle
    const dotMat = new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), dotMat);
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(0, 0.13, 9.6 + i * 1.7);
    root.add(dot);
    breathers.push({ mat: dotMat as unknown as THREE.MeshStandardMaterial, base: 0.3, amp: 0.35, speed: 1.5, phase: i * 0.8 });
  }
  const trailMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 13.8), trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(0, 0.045, 15.6);
  root.add(trail);

  // Bornes lumineuses le long du chemin
  for (const sx of [-2.0, 2.0]) {
    for (let i = 0; i < 5; i++) {
      const bollardMat = new THREE.MeshStandardMaterial({
        color: 0x1a1240,
        roughness: 0.45,
        metalness: 0.3,
        emissive: COLORS.violet,
        emissiveIntensity: 0.9,
      });
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.85, 8), bollardMat);
      bollard.position.set(sx, 0.42, 10.5 + i * 2.6);
      root.add(bollard);
    }
  }

  // ================= PORTE =================
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.3, 0, 0.02);
  root.add(doorPivot);

  const doorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1428,
    emissive: COLORS.violet,
    emissiveIntensity: 1.1,
    roughness: 0.25,
    metalness: 0.25,
    transparent: true,
    opacity: 0.93,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.6, 0.16), doorMat);
  door.position.set(1.3, 2.3, 0);
  doorPivot.add(door);

  // Motif lumineux sur la porte (circuit)
  const circuitTex = makeCircuitTexture();
  const doorDecalMat = new THREE.MeshBasicMaterial({
    map: circuitTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const doorDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.6), doorDecalMat);
  doorDecal.position.set(1.3, 2.3, 0.1);
  doorPivot.add(doorDecal);

  const doorRingMat = new THREE.MeshBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ringMaterials.push(doorRingMat);
  const doorRing = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 10, 48, Math.PI), doorRingMat);
  doorRing.position.set(0, 0.45, 0.05);
  root.add(doorRing);
  breathers.push({ mat: doorRingMat as unknown as THREE.MeshStandardMaterial, base: 0.4, amp: 0.25, speed: 1.3, phase: 5 });

  // Lueur au sol devant la porte
  const doorGlowMat = new THREE.MeshBasicMaterial({
    color: COLORS.violet,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const doorGlow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), doorGlowMat);
  doorGlow.rotation.x = -Math.PI / 2;
  doorGlow.position.set(0, 0.06, 1.6);
  root.add(doorGlow);
  breathers.push({ mat: doorGlowMat as unknown as THREE.MeshStandardMaterial, base: 0.1, amp: 0.08, speed: 1.1, phase: 6 });

  // ================= ENSEIGNE =================
  const signTex = makeSignTexture("MAISON D'ORIGIN");
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
  breathers.push({ mat: signMat as unknown as THREE.MeshStandardMaterial, base: 0.85, amp: 0.15, speed: 0.5, phase: 0 });

  const houseInfo = new THREE.Object3D();
  houseInfo.position.set(0, 0, 0);
  root.add(houseInfo);

  // Nettoyage du bruit tex partagé à la mort de la scène (récupéré par le traverse dispose)
  return {
    root,
    houseRoot,
    windowMaterials,
    ringMaterials,
    door,
    doorPivot,
    doorRing,
    houseInfo,
    breathers,
    windows,
  };
}

/** Texture émissive pour les fenêtres : quadrillage lumineux style hublot. */
function makeWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 256, 128);
    // Grille de panneaux
    for (let x = 0; x < 256; x += 64) {
      for (let y = 0; y < 128; y += 64) {
        const v = 40 + Math.random() * 120;
        ctx.fillStyle = `rgb(${Math.floor(v * 0.4)}, ${Math.floor(v)}, ${Math.floor(v * 1.1)})`;
        ctx.fillRect(x + 3, y + 3, 58, 58);
      }
    }
    // Lignes de séparation lumineuses
    ctx.strokeStyle = "rgba(0,229,255,0.9)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    for (let y = 0; y <= 128; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Texture circuit imprimé pour la porte. */
function makeCircuitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = "rgba(124,77,255,0.95)";
    ctx.lineWidth = 2;
    let x = 64;
    let y = 250;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y > 10) {
      y -= 18 + Math.random() * 22;
      const dir = Math.random();
      if (dir < 0.35) x -= 22;
      else if (dir < 0.7) x += 22;
      x = Math.max(10, Math.min(118, x));
      ctx.lineTo(x, y);
      if (Math.random() < 0.4) {
        ctx.moveTo(x, y);
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Enseigne avec glow et sous-titre. */
function makeSignTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "600 40px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#9feaff";
    ctx.fillText(text, 256, 60);
    ctx.shadowColor = "#7c4dff";
    ctx.shadowBlur = 14;
    ctx.font = "400 16px Inter, sans-serif";
    ctx.fillStyle = "#cbb8ff";
    ctx.fillText("le cocon d'une intelligence locale", 256, 112);
  }
  return new THREE.CanvasTexture(canvas);
}

export interface HouseAnimation {
  update(t: number, cameraPos: THREE.Vector3): void;
}

export function createHouseAnimation(
  layout: MaisonLayout,
  doorOpen: { current: boolean }
): HouseAnimation {
  return {
    update(t: number, cameraPos: THREE.Vector3) {
      // Respiration des matériaux (fenêtres, halos, LED)
      for (const b of layout.breathers) {
        if ("opacity" in b.mat && b.mat.opacity !== undefined) {
          const target = b.base + b.amp * (0.5 + 0.5 * Math.sin(t * b.speed + b.phase));
          b.mat.opacity = target;
        }
      }
      for (const wm of layout.windowMaterials) {
        wm.emissiveIntensity = 0.85 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.8));
      }
      for (const rm of layout.ringMaterials) {
        rm.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8 + 1));
      }

      // Shader du sol
      const floor = layout.root.children.find((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).material instanceof THREE.ShaderMaterial);
      if (floor) {
        const mat = (floor as THREE.Mesh).material as THREE.ShaderMaterial;
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = t;
      }

      // Balise clignotante
      const beaconLight = layout.root.userData.beaconLight as THREE.PointLight | undefined;
      if (beaconLight) {
        beaconLight.intensity = 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 2.2));
      }

      // Porte
      const targetAngle = doorOpen.current ? -1.9 : 0;
      layout.doorPivot.rotation.y += (targetAngle - layout.doorPivot.rotation.y) * 0.06;

      // Parallaxe douce
      const dx = cameraPos.x;
      const dz = cameraPos.z + 16;
      const dist = Math.max(Math.hypot(dx, dz), 1);
      layout.root.rotation.y = (dx / dist) * 0.05;
    },
  };
}

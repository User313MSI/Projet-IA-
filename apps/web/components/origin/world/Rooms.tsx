"use client";

import * as THREE from "three";
import { COLORS } from "./palette";

export interface PickRoomFn {
  room: string | null;
  item: string | null;
  data: unknown;
}

export interface RoomsLayout {
  root: THREE.Group;
  pickables: THREE.Object3D[];
  roomMeshes: Record<string, THREE.Mesh>;
  floorGlow: Record<string, THREE.MeshBasicMaterial | null>;
  brain: {
    root: THREE.Group;
    brainMesh: THREE.Mesh;
    neurons: THREE.Points;
    pulses: THREE.Mesh[];
    pulseMat: THREE.MeshBasicMaterial;
  } | null;
  library: {
    roots: THREE.Group[];
    bookMats: THREE.MeshStandardMaterial[];
    newGlow: THREE.MeshBasicMaterial | null;
  } | null;
  interview: {
    seat: THREE.Group | null;
    mats: THREE.MeshBasicMaterial[];
    seatMesh: THREE.Mesh | null;
  } | null;
  salon: {
    panel: THREE.Mesh;
    panelMat: THREE.MeshBasicMaterial;
  } | null;
  chambre: {
    mirror: THREE.Mesh;
    mirrorMat: THREE.MeshBasicMaterial;
    orbs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; color: number; phase: number }[];
  } | null;
  jardin: {
    plants: {
      group: THREE.Group;
      baseScale: number;
      baseY: number;
      mat: THREE.MeshStandardMaterial;
      light: THREE.PointLight;
    }[];
  } | null;
}

function makeLabelTexture(text: string, color: string, size = 42): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = `600 ${size}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 48);
  }
  return new THREE.CanvasTexture(canvas);
}

function addRoomLabel(
  parent: THREE.Object3D,
  text: string,
  colorCss: string,
  x: number,
  y: number,
  z: number,
  ry: number
): void {
  const tex = makeLabelTexture(text.toUpperCase(), colorCss);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.9), mat);
  label.position.set(x, y, z);
  label.rotation.y = ry;
  parent.add(label);
}

function glowDisc(parent: THREE.Object3D, color: number, x: number, z: number, radius: number): THREE.MeshBasicMaterial | null {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(x, 0.05, z);
  parent.add(disc);
  return mat;
}

export function buildRooms(): RoomsLayout {
  const root = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const roomMeshes: Record<string, THREE.Mesh> = {};
  const floorGlow: Record<string, THREE.MeshBasicMaterial | null> = {};

  const furnitureMat = new THREE.MeshStandardMaterial({
    color: 0x1c1436,
    roughness: 0.45,
    metalness: 0.25,
    emissive: 0x0a0520,
    emissiveIntensity: 0.5,
  });

  // ============ SALLE DU CERVEAU ============
  const brainRoot = new THREE.Group();
  const brainPos = { x: -13.5, z: -6 };
  let brainMesh: THREE.Mesh;
  let neurons: THREE.Points;
  const pulses: THREE.Mesh[] = [];
  let pulseMat: THREE.MeshBasicMaterial;
  {
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 14), furnitureMat);
    pedestal.position.set(brainPos.x, 0.25, brainPos.z);
    brainRoot.add(pedestal);

    const brainMat = new THREE.MeshStandardMaterial({
      color: 0x7c4dff,
      emissive: 0x5b2fd6,
      emissiveIntensity: 0.6,
      roughness: 0.5,
      metalness: 0.1,
    });
    brainMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 3), brainMat);
    brainMesh.position.set(brainPos.x, 2.35, brainPos.z);
    brainRoot.add(brainMesh);

    const memMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1428,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
      clearcoat: 0.8,
    });
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(1.65, 24, 20), memMat);
    membrane.position.copy(brainMesh.position);
    brainRoot.add(membrane);

    const N = 70;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(1.5 + Math.random() * 0.45);
      positions[i * 3] = brainPos.x + v.x;
      positions[i * 3 + 1] = 2.35 + v.y;
      positions[i * 3 + 2] = brainPos.z + v.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const ptsMat = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.07,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    neurons = new THREE.Points(geom, ptsMat);
    brainRoot.add(neurons);

    pulseMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 7; i++) {
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pulseMat);
      pulse.userData.seed = i * 1.37;
      pulses.push(pulse);
      brainRoot.add(pulse);
    }

    const brainRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.05, 8, 40),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    brainRing.rotation.x = Math.PI / 2;
    brainRing.position.set(brainPos.x, 0.55, brainPos.z);
    brainRoot.add(brainRing);

    const ring2 = brainRing.clone();
    ring2.scale.setScalar(1.25);
    brainRoot.add(ring2);

    addRoomLabel(brainRoot, "Salle du Cerveau", "#00e5ff", brainPos.x, 4.4, brainPos.z + 3.1, 0);
  }
  roomMeshes.brain = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10));
  roomMeshes.brain.position.set(brainPos.x, 2.3, brainPos.z);
  roomMeshes.brain.userData.pick = { room: "brain", item: null, data: null } as PickRoomFn;
  pickables.push(roomMeshes.brain);
  brainRoot.add(roomMeshes.brain);
  floorGlow.brain = glowDisc(root, 0x7c4dff, brainPos.x, brainPos.z, 3.4);
  root.add(brainRoot);

  // ============ BIBLIOTHÈQUE ============
  const libPos = { x: -4.5, z: -14 };
  const libRoots: THREE.Group[] = [];
  const bookMats: THREE.MeshStandardMaterial[] = [];
  {
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x241a4a,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x0e0a26,
      emissiveIntensity: 0.6,
    });
    const configs = [
      { x: libPos.x - 3.2, z: libPos.z, ry: Math.PI / 2 },
      { x: libPos.x + 3.2, z: libPos.z, ry: Math.PI / 2 },
      { x: libPos.x, z: libPos.z - 3.2, ry: 0 },
    ];
    for (const cfg of configs) {
      const shelfGroup = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.2, 0.55), shelfMat);
      frame.position.set(cfg.x, 2.1, cfg.z);
      frame.rotation.y = cfg.ry;
      shelfGroup.add(frame);
      libRoots.push(shelfGroup);
      root.add(shelfGroup);
    }

    addRoomLabel(root, "Bibliothèque", "#00ff9d", libPos.x, 4.4, libPos.z + 3.1, 0);
  }
  const newGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00ff9d,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  roomMeshes.library = new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.6, 7.4));
  roomMeshes.library.position.set(libPos.x, 2.2, libPos.z);
  roomMeshes.library.userData.pick = { room: "library", item: null, data: null } as PickRoomFn;
  pickables.push(roomMeshes.library);
  root.add(roomMeshes.library);
  floorGlow.library = glowDisc(root, 0x00ff9d, libPos.x, libPos.z, 3.4);

  // ============ SALLE D'INTERVIEW ============
  const intPos = { x: 13.5, z: -6 };
  const seatMats: THREE.MeshBasicMaterial[] = [];
  let seatMesh: THREE.Mesh | null = null;
  const seatGroup = new THREE.Group();
  {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 12), furnitureMat);
    base.position.set(intPos.x, 0.18, intPos.z);
    seatGroup.add(base);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x2a1c5e,
      roughness: 0.55,
      metalness: 0.15,
      emissive: 0x140a3a,
      emissiveIntensity: 0.7,
    });
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cushionMat);
    cushion.position.set(intPos.x, 0.35, intPos.z);
    seatGroup.add(cushion);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 0.3), cushionMat);
    back.position.set(intPos.x, 1.05, intPos.z + 1.0);
    seatGroup.add(back);

    seatMesh = cushion;
    seatMesh.userData.pick = { room: "interview", item: null, data: null } as PickRoomFn;
    pickables.push(seatMesh);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.05, 8, 36),
      new THREE.MeshBasicMaterial({
        color: 0xff6b9d,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(intPos.x, 0.5, intPos.z);
    seatGroup.add(ring);

    addRoomLabel(root, "Salle d'Interview", "#ff6b9d", intPos.x, 4.4, intPos.z + 3.1, 0);
  }
  root.add(seatGroup);
  roomMeshes.interview = seatGroup.children[0] as THREE.Mesh;
  floorGlow.interview = glowDisc(root, 0xff6b9d, intPos.x, intPos.z, 3.4);

  // ============ SALON ============
  const salonPos = { x: 4.5, z: -14 };
  let panel: THREE.Mesh;
  let panelMat: THREE.MeshBasicMaterial;
  {
    const sofaMat = new THREE.MeshStandardMaterial({
      color: 0x3a2470,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x1a0e42,
      emissiveIntensity: 0.6,
    });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 1.1), sofaMat);
    seat.position.set(salonPos.x, 0.35, salonPos.z + 1.6);
    root.add(seat);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.35), sofaMat);
    backrest.position.set(salonPos.x, 1.0, salonPos.z + 2.15);
    root.add(backrest);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 1.1), sofaMat);
    armL.position.set(salonPos.x - 1.45, 0.55, salonPos.z + 1.6);
    root.add(armL);
    const armR = armL.clone();
    armR.position.x = salonPos.x + 1.45;
    root.add(armR);

    const tableMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d2233,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x031018,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 18), tableMat);
    table.position.set(salonPos.x, 0.55, salonPos.z - 0.4);
    root.add(table);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), tableMat);
    pole.position.set(salonPos.x, 0.28, salonPos.z - 0.4);
    root.add(pole);

    panelMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), panelMat);
    panel.position.set(salonPos.x, 2.2, salonPos.z - 1.2);
    root.add(panel);

    const sofaMesh = seat;
    sofaMesh.userData.pick = { room: "salon", item: null, data: null } as PickRoomFn;
    pickables.push(sofaMesh);
    roomMeshes.salon = sofaMesh;

    addRoomLabel(root, "Salon", "#00e5ff", salonPos.x, 4.4, salonPos.z + 3.1, 0);
  }
  floorGlow.salon = glowDisc(root, 0x00e5ff, salonPos.x, salonPos.z, 3.4);

  // ============ CHAMBRE ============
  const bedPos = { x: -4.5, z: -21.5 };
  let mirror: THREE.Mesh;
  let mirrorMat: THREE.MeshBasicMaterial;
  const traitOrbs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; color: number; phase: number }[] = [];
  {
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a52,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x120a30,
      emissiveIntensity: 0.6,
    });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.4), bedMat);
    mattress.position.set(bedPos.x - 1.8, 0.35, bedPos.z);
    root.add(mattress);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 1.4), bedMat);
    headboard.position.set(bedPos.x - 3.15, 0.8, bedPos.z);
    root.add(headboard);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x14204a,
      roughness: 0.35,
      metalness: 0.45,
      emissive: 0x081020,
      emissiveIntensity: 0.7,
    });
    mirrorMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    mirror = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), mirrorMat);
    mirror.position.set(bedPos.x + 1.2, 1.9, bedPos.z - 2.8);
    root.add(mirror);

    const mirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 10, 32), frameMat);
    mirrorFrame.position.copy(mirror.position);
    root.add(mirrorFrame);

    const orbColors = [0xff6b9d, 0xffb300, 0x00ff9d, 0x7c4dff, 0x00e5ff, 0x00ff9d, 0xffb300];
    for (let i = 0; i < 7; i++) {
      const color = orbColors[i] ?? 0x00e5ff;
      const orbMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), orbMat);
      const angle = (i / 7) * Math.PI * 2;
      orb.position.set(
        bedPos.x + 1.2 + Math.cos(angle) * 1.5,
        1.9 + Math.sin(angle * 2) * 0.35,
        bedPos.z - 2.8 + Math.sin(angle) * 1.5
      );
      root.add(orb);
      traitOrbs.push({ mesh: orb, mat: orbMat, color, phase: i * 0.9 });
    }

    const bedMesh = mattress;
    bedMesh.userData.pick = { room: "chambre", item: null, data: null } as PickRoomFn;
    pickables.push(bedMesh);
    roomMeshes.chambre = bedMesh;

    addRoomLabel(root, "Chambre", "#ff6b9d", bedPos.x, 4.4, bedPos.z + 3.1, 0);
  }
  floorGlow.chambre = glowDisc(root, 0xff6b9d, bedPos.x, bedPos.z, 3.4);

  // ============ JARDIN ============
  const gPos = { x: 4.5, z: -21.5 };
  const plants: {
    group: THREE.Group;
    baseScale: number;
    baseY: number;
    mat: THREE.MeshStandardMaterial;
    light: THREE.PointLight;
  }[] = [];
  {
    const soilMat = new THREE.MeshStandardMaterial({
      color: COLORS.soil,
      roughness: 0.8,
      metalness: 0.05,
      emissive: 0x060410,
      emissiveIntensity: 0.5,
    });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.35, 16), soilMat);
    soil.position.set(gPos.x, 0.18, gPos.z);
    root.add(soil);

    const spots = [
      { x: gPos.x - 1.6, z: gPos.z - 1.2 },
      { x: gPos.x + 1.4, z: gPos.z - 1.5 },
      { x: gPos.x - 0.4, z: gPos.z + 1.4 },
      { x: gPos.x + 1.8, z: gPos.z + 0.9 },
      { x: gPos.x - 1.9, z: gPos.z + 0.6 },
      { x: gPos.x + 0.4, z: gPos.z - 2.0 },
    ];
    for (const sp of spots) {
      const pg = new THREE.Group();
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0x00b894,
        emissive: 0x005f3a,
        emissiveIntensity: 0.8,
        roughness: 0.55,
        metalness: 0.1,
      });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 6), stemMat);
      stem.position.y = 0.5;
      pg.add(stem);
      for (let l = 0; l < 3; l++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), stemMat);
        leaf.scale.set(1.3, 0.35, 0.8);
        const la = l * 2.1;
        leaf.position.set(Math.cos(la) * 0.25, 0.45 + l * 0.22, Math.sin(la) * 0.25);
        leaf.rotation.y = la;
        pg.add(leaf);
      }
      const light = new THREE.PointLight(0x00ff9d, 0.5, 3.5, 2);
      light.position.y = 1.0;
      pg.add(light);
      pg.position.set(sp.x, 0.35, sp.z);
      pg.scale.setScalar(0.35);
      root.add(pg);
      plants.push({ group: pg, baseScale: 0.35, baseY: 0.35, mat: stemMat, light });
    }

    const soilMesh = soil;
    soilMesh.userData.pick = { room: "jardin", item: null, data: null } as PickRoomFn;
    pickables.push(soilMesh);
    roomMeshes.jardin = soilMesh;

    addRoomLabel(root, "Jardin", "#00ff9d", gPos.x, 4.4, gPos.z + 3.1, 0);
  }
  floorGlow.jardin = glowDisc(root, 0x00ff9d, gPos.x, gPos.z, 3.4);

  return {
    root,
    pickables,
    roomMeshes,
    floorGlow,
    brain: {
      root: brainRoot,
      brainMesh,
      neurons,
      pulses,
      pulseMat,
    },
    library: { roots: libRoots, bookMats, newGlow: newGlowMat },
    interview: { seat: seatGroup, mats: seatMats, seatMesh },
    salon: { panel, panelMat },
    chambre: { mirror, mirrorMat, orbs: traitOrbs },
    jardin: { plants },
  };
}

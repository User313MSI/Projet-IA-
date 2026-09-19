import * as THREE from "three";
import { ROOM_POS } from "./palette";
import {
  MAT,
  box,
  boxOnFloor,
  makeSofa,
  makeArmchair,
  makeCoffeeTable,
  makeBookshelf,
  makeBed,
  makeNightstand,
  makeFloorLamp,
  makePottedPlant,
  makeRug,
  makeWallMirror,
  makePainting,
  makeHoloScreen,
  makeRadiator,
} from "./kit";

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
    roots: THREE.Object3D[];
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

// Pièce invisible cliquable (zone de sélection, pas de mesh visible)
function makePickZone(room: string, w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  const zone = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  zone.position.set(x, y, z);
  zone.userData.pick = { room, item: null, data: null } as PickRoomFn;
  zone.visible = false;
  return zone;
}

export function buildRooms(): RoomsLayout {
  const root = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const roomMeshes: Record<string, THREE.Mesh> = {};
  const floorGlow: Record<string, THREE.MeshBasicMaterial | null> = {};
  const H = 3.2; // hauteur sous plafond (cohérente avec la maison)

  // ================= SALLE DU CERVEAU (pièce studieuse) =================
  const brainPos = ROOM_POS.brain!;
  const brainRoot = new THREE.Group();
  let brainMesh: THREE.Mesh;
  let neurons: THREE.Points;
  const pulses: THREE.Mesh[] = [];
  let pulseMat: THREE.MeshBasicMaterial;
  {
    // Le cerveau flotte au-dessus d'un bureau en bois, présenté comme un objet précieux
    const desk = boxOnFloor(1.4, 0.75, 0.7, MAT.wood, brainPos.x, 0, brainPos.z);
    brainRoot.add(desk);
    const deskLeg = boxOnFloor(1.2, 0.72, 0.5, MAT.darkWood, brainPos.x, 0, brainPos.z);
    deskLeg.visible = false;
    brainRoot.add(deskLeg);

    const brainMat = new THREE.MeshStandardMaterial({
      color: 0xd8c8e8,
      emissive: 0x9a6be8,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.05,
    });
    brainMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 3), brainMat);
    brainMesh.position.set(brainPos.x, 1.35, brainPos.z);
    brainRoot.add(brainMesh);

    const memMat = new THREE.MeshPhysicalMaterial({
      color: 0xd0e4f2,
      emissive: 0x9ac8e8,
      emissiveIntensity: 0.15,
      roughness: 0.15,
      transparent: true,
      opacity: 0.16,
      clearcoat: 0.8,
    });
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), memMat);
    membrane.position.copy(brainMesh.position);
    brainRoot.add(membrane);

    // Neurones : petits points discrets autour du cerveau
    const N = 42;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.55 + Math.random() * 0.12);
      positions[i * 3] = brainPos.x + v.x;
      positions[i * 3 + 1] = 1.35 + v.y;
      positions[i * 3 + 2] = brainPos.z + v.z;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    neurons = new THREE.Points(geom, new THREE.PointsMaterial({
      color: 0xc8a8f0,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    brainRoot.add(neurons);

    pulseMat = new THREE.MeshBasicMaterial({
      color: 0xb090e8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 5; i++) {
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), pulseMat);
      pulse.userData.seed = i * 1.37;
      pulses.push(pulse);
      brainRoot.add(pulse);
    }

    // Bibliothèque d'appoint + fauteuil de lecture : la pièce vit
    const cornerShelf = makeBookshelf();
    cornerShelf.group.position.set(brainPos.x + 2.6, 0, brainPos.z + 2.4);
    cornerShelf.group.rotation.y = -Math.PI / 4;
    brainRoot.add(cornerShelf.group);

    const reading = makeArmchair();
    reading.position.set(brainPos.x + 2.8, 0, brainPos.z - 2.2);
    brainRoot.add(reading);

    const pickZone = makePickZone("brain", 5, H, 5, brainPos.x, H / 2, brainPos.z);
    brainRoot.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.brain = pickZone;
    root.add(brainRoot);
  }

  // ================= BIBLIOTHÈQUE (salle de lecture chaleureuse) =================
  const libPos = ROOM_POS.library!;
  const libShelfGroups: THREE.Object3D[] = [];
  const bookMats: THREE.MeshStandardMaterial[] = [];
  {
    // 3 bibliothèques adossées aux murs + table de lecture + lampes
    const shelfSpecs: { x: number; z: number; ry: number }[] = [
      { x: libPos.x - 2.5, z: libPos.z - 2.6, ry: 0 },
      { x: libPos.x + 2.5, z: libPos.z - 2.6, ry: 0 },
      { x: libPos.x - 3.4, z: libPos.z + 0.6, ry: Math.PI / 2 },
    ];
    for (const spec of shelfSpecs) {
      const sh = makeBookshelf();
      sh.group.position.set(spec.x, 0, spec.z);
      sh.group.rotation.y = spec.ry;
      root.add(sh.group);
      libShelfGroups.push(...sh.shelves);
    }

    // Table de lecture + 2 chaises + lampe
    const table = boxOnFloor(1.1, 0.75, 0.7, MAT.wood, libPos.x, 0, libPos.z + 1.2);
    root.add(table);
    for (const dx of [-0.75, 0.75]) {
      const chairSeat = boxOnFloor(0.42, 0.45, 0.42, MAT.wood, libPos.x + dx, 0, libPos.z + 1.2);
      root.add(chairSeat);
      const chairBack = boxOnFloor(0.42, 0.45, 0.08, MAT.wood, libPos.x + dx, 0.45, libPos.z + 1.44);
      root.add(chairBack);
    }
    const lamp = makeFloorLamp();
    lamp.group.position.set(libPos.x + 2.0, 0, libPos.z + 1.6);
    root.add(lamp.group);

    const pickZone = makePickZone("library", 5.6, H, 5, libPos.x, H / 2, libPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.library = pickZone;
  }

  // ================= SALLE D'INTERVIEW (deux fauteuils face à face) =================
  const intPos = ROOM_POS.interview!;
  const seatMats: THREE.MeshBasicMaterial[] = [];
  const seatGroup = new THREE.Group();
  let seatMesh: THREE.Mesh | null = null;
  {
    // Deux vrais fauteuils face à face + table basse entre eux
    const chairA = makeArmchair(MAT.fabricRed);
    chairA.position.set(intPos.x - 1.1, 0, intPos.z);
    chairA.rotation.y = Math.PI / 2;
    seatGroup.add(chairA);
    const chairB = makeArmchair(MAT.fabricRed);
    chairB.position.set(intPos.x + 1.1, 0, intPos.z);
    chairB.rotation.y = -Math.PI / 2;
    seatGroup.add(chairB);
    const lowTable = makeCoffeeTable();
    lowTable.position.set(intPos.x, 0, intPos.z);
    seatGroup.add(lowTable);
    const rug = makeRug(1.6, 0x7a5c48);
    rug.position.set(intPos.x, 0.02, intPos.z);
    seatGroup.add(rug);

    const chairSeat = chairA.children[0] as THREE.Mesh;
    chairSeat.userData.pick = { room: "interview", item: null, data: null } as PickRoomFn;
    pickables.push(chairSeat);
    seatMesh = chairSeat;

    const pickZone = makePickZone("interview", 5, H, 5, intPos.x, H / 2, intPos.z);
    seatGroup.add(pickZone);
    roomMeshes.interview = pickZone;
    root.add(seatGroup);
  }

  // ================= SALON (coin TV chaleureux) =================
  const salonPos = ROOM_POS.salon!;
  let panel: THREE.Mesh;
  let panelMat: THREE.MeshBasicMaterial;
  {
    // Canapé + 2 fauteuils autour d'une table basse, tapis, lampe
    const sofa = makeSofa();
    sofa.position.set(salonPos.x, 0, salonPos.z + 1.4);
    sofa.rotation.y = Math.PI;
    root.add(sofa);
    const arm1 = makeArmchair();
    arm1.position.set(salonPos.x - 2.0, 0, salonPos.z - 0.6);
    arm1.rotation.y = Math.PI / 3;
    root.add(arm1);
    const arm2 = makeArmchair();
    arm2.position.set(salonPos.x + 2.0, 0, salonPos.z - 0.6);
    arm2.rotation.y = -Math.PI / 3;
    root.add(arm2);
    const coffee = makeCoffeeTable();
    coffee.position.set(salonPos.x, 0, salonPos.z - 0.1);
    root.add(coffee);
    const rug = makeRug(2.0, 0x8a6a54);
    rug.position.set(salonPos.x, 0.02, salonPos.z + 0.2);
    root.add(rug);
    const lamp = makeFloorLamp();
    lamp.group.position.set(salonPos.x + 2.4, 0, salonPos.z + 1.8);
    root.add(lamp.group);

    // Écran holographique discret au-dessus de la table, orienté vers le canapé
    const holo = makeHoloScreen(1.7, 1.05);
    panel = holo.mesh;
    panelMat = holo.mat;
    panel.position.set(salonPos.x, 1.75, salonPos.z - 1.6);
    root.add(panel);

    const sofaSeat = sofa.children[0] as THREE.Mesh;
    sofaSeat.userData.pick = { room: "salon", item: null, data: null } as PickRoomFn;
    pickables.push(sofaSeat);
    roomMeshes.salon = sofaSeat;

    const pickZone = makePickZone("salon", 6, H, 6, salonPos.x, H / 2, salonPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
  }

  // ================= CHAMBRE (lit tête au mur nord, sobre) =================
  const bedPos = ROOM_POS.chambre!;
  let mirror: THREE.Mesh;
  let mirrorMat: THREE.MeshBasicMaterial;
  const traitOrbs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; color: number; phase: number }[] = [];
  {
    const bed = makeBed();
    bed.position.set(bedPos.x - 0.5, 0, bedPos.z - 0.9);
    root.add(bed);
    const nightstand = makeNightstand();
    nightstand.position.set(bedPos.x - 2.2, 0, bedPos.z - 1.3);
    root.add(nightstand);
    const lamp = makeFloorLamp();
    lamp.group.position.set(bedPos.x + 1.6, 0, bedPos.z - 2.0);
    root.add(lamp.group);

    // Miroir mural
    const wm = makeWallMirror(0.5);
    mirror = wm.mirror;
    mirrorMat = wm.mat;
    mirror.position.set(bedPos.x + 1.6, 1.7, bedPos.z - 2.2);
    mirror.rotation.y = 0;
    root.add(mirror);
    const mirrorFrame = wm.frame;
    mirrorFrame.position.copy(mirror.position);
    root.add(mirrorFrame);

    // Orbes de traits : petites sphères lumineuses discrètes près du miroir
    const orbColors = [0xffb3a0, 0xffd28a, 0xa8e8b0, 0xc8a8f0, 0x9ad8e8];
    for (let i = 0; i < 5; i++) {
      const color = orbColors[i] ?? 0xffb3a0;
      const orbMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), orbMat);
      const a = (i / 5) * Math.PI * 1.4 + 0.4;
      orb.position.set(
        bedPos.x + 1.6 + Math.cos(a) * 0.75,
        1.75 + Math.sin(a * 1.3) * 0.3,
        bedPos.z - 2.2 + Math.sin(a) * 0.3
      );
      root.add(orb);
      traitOrbs.push({ mesh: orb, mat: orbMat, color, phase: i * 0.9 });
    }

    const pickZone = makePickZone("chambre", 5, H, 5, bedPos.x, H / 2, bedPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.chambre = pickZone;
  }

  // ================= JARDIN / SERRE (derrière la maison) =================
  const gPos = ROOM_POS.jardin!;
  const plants: {
    group: THREE.Group; baseScale: number; baseY: number;
    mat: THREE.MeshStandardMaterial; light: THREE.PointLight;
  }[] = [];
  {
    // Planche de culture + plantes en pots sur étagère
    const bed = boxOnFloor(3.2, 0.3, 1.6, MAT.wood, gPos.x, 0, gPos.z - 0.5);
    root.add(bed);
    const soil = boxOnFloor(3.0, 0.06, 1.4, MAT.soil, gPos.x, 0.3, gPos.z - 0.5);
    root.add(soil);

    const spots = [
      { x: gPos.x - 1.2, z: gPos.z - 0.9 },
      { x: gPos.x - 0.4, z: gPos.z - 0.3 },
      { x: gPos.x + 0.4, z: gPos.z - 0.8 },
      { x: gPos.x + 1.2, z: gPos.z - 0.2 },
    ];
    for (const sp of spots) {
      const p = makePottedPlant(1.1);
      p.group.position.set(sp.x, 0.33, sp.z);
      root.add(p.group);
      plants.push({ group: p.group, baseScale: 1.1, baseY: 0.33, mat: p.mat, light: p.light });
    }

    // Étagère à pots sur le mur du fond
    const potShelf = boxOnFloor(2.2, 0.05, 0.35, MAT.wood, gPos.x, 0.9, gPos.z - 2.6);
    root.add(potShelf);
    for (const dx of [-0.7, 0, 0.7]) {
      const p = makePottedPlant(0.8);
      p.group.position.set(gPos.x + dx, 0.95, gPos.z - 2.6);
      root.add(p.group);
      plants.push({ group: p.group, baseScale: 0.8, baseY: 0.95, mat: p.mat, light: p.light });
    }

    const pickZone = makePickZone("jardin", 6, H, 5, gPos.x, H / 2, gPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.jardin = pickZone;
  }

  return {
    root,
    pickables,
    roomMeshes,
    floorGlow,
    brain: { root: brainRoot, brainMesh, neurons, pulses, pulseMat },
    library: { roots: libShelfGroups, bookMats, newGlow: null },
    interview: { seat: seatGroup, mats: seatMats, seatMesh },
    salon: { panel, panelMat },
    chambre: { mirror, mirrorMat, orbs: traitOrbs },
    jardin: { plants },
  };
}

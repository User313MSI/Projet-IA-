import * as THREE from "three";
import { ROOM_POS } from "./palette";
import { MAT, boxOnFloor, makeSofa, makeArmchair, makeCoffeeTable, makeBookshelf, makeBed, makeNightstand, makeFloorLamp, makePottedPlant, makeRug, makeWallMirror, makeHoloScreen } from "./kit";
import { loadFurnitureKit, type FurnitureKit, BOOKSHELF_SLOTS } from "./models";

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
    plants: { group: THREE.Group; baseScale: number; baseY: number; mat: THREE.MeshStandardMaterial; light: THREE.PointLight }[];
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

export async function buildRooms(): Promise<RoomsLayout> {
  let kit: FurnitureKit | null = null;
  try {
    kit = await loadFurnitureKit();
  } catch {
    kit = null;
  }

  const root = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const roomMeshes: Record<string, THREE.Mesh> = {};
  const floorGlow: Record<string, THREE.MeshBasicMaterial | null> = {};
  const H = 3.2;

  // Place un modèle GLB réel ; retombe sur le mobilier procédural si absent
  const model = (name: Parameters<FurnitureKit["get"]>[0]): THREE.Group | null => kit?.get(name) ?? null;

  // ================= SALLE DU CERVEAU =================
  const brainPos = ROOM_POS.brain!;
  const brainRoot = new THREE.Group();
  let brainMesh: THREE.Mesh;
  let neurons: THREE.Points;
  const pulses: THREE.Mesh[] = [];
  let pulseMat: THREE.MeshBasicMaterial;
  {
    brainRoot.add(boxOnFloor(1.4, 0.75, 0.7, MAT.wood, brainPos.x, 0, brainPos.z));
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

    // Coin lecture : bibliothèque + fauteuil réels, calés sans clipper la cloison (X=-4.5)
    const cornerShelf = model("bookshelf");
    if (cornerShelf) {
      cornerShelf.position.set(brainPos.x + 1.6, 0, brainPos.z + 2.6);
      cornerShelf.rotation.y = -Math.PI / 4;
      brainRoot.add(cornerShelf);
    }
    const reading = model("armchair") ?? makeArmchair();
    reading.position.set(brainPos.x + 1.8, 0, brainPos.z - 2.2);
    reading.rotation.y = Math.PI / 3;
    brainRoot.add(reading);
    const lampD = model("lampSmall");
    if (lampD) {
      lampD.position.set(brainPos.x + 1.8, 0, brainPos.z - 3.0);
      brainRoot.add(lampD);
    }

    const pickZone = makePickZone("brain", 5, H, 5, brainPos.x, H / 2, brainPos.z);
    brainRoot.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.brain = pickZone;
    root.add(brainRoot);
  }

  // ================= BIBLIOTHÈQUE =================
  const libPos = ROOM_POS.library!;
  const libShelfGroups: THREE.Object3D[] = [];
  const bookMats: THREE.MeshStandardMaterial[] = [];
  {
    // 3 bibliothèques GLB adossées aux murs ; chaque niveau = un groupe à livres
    const shelfSpecs: { x: number; z: number; ry: number }[] = [
      { x: libPos.x - 2.5, z: libPos.z - 2.1, ry: 0 },
      { x: libPos.x + 2.5, z: libPos.z - 2.1, ry: 0 },
      { x: libPos.x - 3.4, z: libPos.z + 0.6, ry: Math.PI / 2 },
    ];
    for (const spec of shelfSpecs) {
      const sh = model("bookshelf");
      if (sh) {
        sh.position.set(spec.x, 0, spec.z);
        sh.rotation.y = spec.ry;
        root.add(sh);
        // Groupes de niveaux, calés sur les étagères mesurées du modèle
        for (const slotY of BOOKSHELF_SLOTS) {
          const level = new THREE.Group();
          level.position.set(0, slotY + 0.01, 0);
          level.userData.shelfWidth = 0.92;
          sh.add(level);
          libShelfGroups.push(level);
        }
      } else {
        // Fallback procédural
        const proc = makeBookshelf();
        proc.group.position.set(spec.x, 0, spec.z);
        proc.group.rotation.y = spec.ry;
        root.add(proc.group);
        for (const lvl of proc.shelves) {
          lvl.userData.shelfWidth = 1.0;
          libShelfGroups.push(lvl);
        }
      }
    }

    // Table de lecture réelle + 2 chaises + lampe
    const table = model("tableDining") ?? boxOnFloor(1.1, 0.75, 0.7, MAT.wood, 0, 0, 0);
    table.position.set(libPos.x, 0, libPos.z + 1.0);
    root.add(table);
    for (const dx of [-0.75, 0.75]) {
      const chair = model("chair") ?? boxOnFloor(0.42, 0.85, 0.42, MAT.wood, 0, 0, 0);
      chair.position.set(libPos.x + dx, 0, libPos.z + 1.8);
      chair.rotation.y = Math.PI;
      root.add(chair);
    }
    const lamp = model("lampStand");
    if (lamp) {
      lamp.position.set(libPos.x + 2.0, 0, libPos.z + 1.6);
      root.add(lamp);
    } else {
      const l = makeFloorLamp();
      l.group.position.set(libPos.x + 2.0, 0, libPos.z + 1.6);
      root.add(l.group);
    }
    const rug = model("rugRound") ?? makeRug(1.4);
    rug.position.set(libPos.x, 0.01, libPos.z + 1.0);
    root.add(rug);

    const pickZone = makePickZone("library", 5.6, H, 5, libPos.x, H / 2, libPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.library = pickZone;
  }

  // ================= SALLE D'INTERVIEW =================
  const intPos = ROOM_POS.interview!;
  const seatMats: THREE.MeshBasicMaterial[] = [];
  const seatGroup = new THREE.Group();
  seatGroup.position.set(intPos.x, 0, intPos.z);
  let seatMesh: THREE.Mesh | null = null;
  {
    const chairA = model("armchair") ?? makeArmchair(MAT.fabricRed);
    chairA.position.set(-1.1, 0, 0);
    chairA.rotation.y = Math.PI / 2;
    chairA.userData.pick = { room: "interview", item: null, data: null } as PickRoomFn;
    seatGroup.add(chairA);
    const chairB = model("armchair") ?? makeArmchair(MAT.fabricRed);
    chairB.position.set(1.1, 0, 0);
    chairB.rotation.y = -Math.PI / 2;
    seatGroup.add(chairB);

    const lowTable = model("tableLow") ?? makeCoffeeTable();
    lowTable.position.set(0, 0, 0);
    seatGroup.add(lowTable);

    const rug = model("rugRound") ?? makeRug(1.6, 0x7a5c48);
    rug.position.set(0, 0.01, 0);
    seatGroup.add(rug);

    pickables.push(chairA);
    seatMesh = chairA instanceof THREE.Mesh ? chairA : null;

    const pickZone = makePickZone("interview", 5, H, 5, intPos.x, H / 2, intPos.z);
    seatGroup.add(pickZone);
    roomMeshes.interview = pickZone;
    root.add(seatGroup);
  }

  // ================= SALON =================
  const salonPos = ROOM_POS.salon!;
  let panel: THREE.Mesh;
  let panelMat: THREE.MeshBasicMaterial;
  {
    // Canapé réel près de la façade, face à l'écran holographique au fond du salon
    const sofa = model("couch") ?? makeSofa();
    sofa.position.set(salonPos.x, 0, salonPos.z + 1.4);
    sofa.rotation.y = Math.PI;
    sofa.userData.pick = { room: "salon", item: null, data: null } as PickRoomFn;
    root.add(sofa);
    pickables.push(sofa);

    const arm1 = model("armchair") ?? makeArmchair();
    arm1.position.set(salonPos.x - 2.0, 0, salonPos.z - 0.6);
    arm1.rotation.y = Math.PI / 3;
    root.add(arm1);
    const arm2 = model("armchair") ?? makeArmchair();
    arm2.position.set(salonPos.x + 2.0, 0, salonPos.z - 0.6);
    arm2.rotation.y = -Math.PI / 3;
    root.add(arm2);

    const coffee = model("tableOvalLow") ?? makeCoffeeTable();
    coffee.position.set(salonPos.x, 0, salonPos.z - 0.1);
    root.add(coffee);

    const rug = model("rugRect") ?? makeRug(2.0, 0x8a6a54);
    rug.position.set(salonPos.x, 0.01, salonPos.z + 0.2);
    root.add(rug);

    const lamp = model("lampStand");
    if (lamp) {
      lamp.position.set(salonPos.x + 2.6, 0, salonPos.z + 1.6);
      root.add(lamp);
    } else {
      const l = makeFloorLamp();
      l.group.position.set(salonPos.x + 2.6, 0, salonPos.z + 1.6);
      root.add(l.group);
    }

    const plant = model("plantMedium");
    if (plant) {
      plant.position.set(salonPos.x - 3.6, 0, salonPos.z + 1.4);
      root.add(plant);
    }

    // Écran holographique au fond du salon, face au canapé
    const holo = makeHoloScreen(1.7, 1.05);
    panel = holo.mesh;
    panelMat = holo.mat;
    panel.position.set(salonPos.x, 1.75, salonPos.z - 1.6);
    root.add(panel);

    // Lustre au plafond du salon
    const chand = model("chandelier");
    if (chand) {
      chand.position.set(salonPos.x, H, salonPos.z + 0.3);
      root.add(chand);
    }

    roomMeshes.salon = sofa instanceof THREE.Mesh ? sofa : (sofa.children[0] as THREE.Mesh);
    const pickZone = makePickZone("salon", 6, H, 6, salonPos.x, H / 2, salonPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
  }

  // ================= CHAMBRE =================
  const bedPos = ROOM_POS.chambre!;
  let mirror: THREE.Mesh;
  let mirrorMat: THREE.MeshBasicMaterial;
  const traitOrbs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; color: number; phase: number }[] = [];
  {
    // Lit réel, tête au mur arrière (la tête du modèle GLB est en -Z)
    const bed = model("bed") ?? makeBed();
    bed.position.set(bedPos.x - 0.5, 0, bedPos.z - 0.9);
    bed.rotation.y = 0;
    root.add(bed);

    const nightstand = model("nightstand") ?? makeNightstand();
    nightstand.position.set(bedPos.x - 1.6, 0, bedPos.z - 1.3);
    root.add(nightstand);
    const lampD = model("lampSmall");
    if (lampD) {
      lampD.position.set(bedPos.x - 1.6, 0, bedPos.z - 1.3);
      root.add(lampD);
    }

    const dresser = model("dresser") ?? boxOnFloor(1.4, 0.8, 0.5, MAT.wood, 0, 0, 0);
    dresser.position.set(bedPos.x + 1.5, 0, bedPos.z - 2.05);
    dresser.rotation.y = 0;
    root.add(dresser);

    const plant = model("plantTall");
    if (plant) {
      plant.position.set(bedPos.x + 2.6, 0, bedPos.z + 0.8);
      root.add(plant);
    }

    // Miroir magique (reflet de la personnalité) au-dessus de la commode
    const wm = makeWallMirror(0.5);
    mirror = wm.mirror;
    mirrorMat = wm.mat;
    mirror.position.set(bedPos.x + 1.5, 1.7, bedPos.z - 2.28);
    root.add(mirror);
    const mirrorFrame = wm.frame;
    mirrorFrame.position.copy(mirror.position);
    root.add(mirrorFrame);

    // Orbes de traits près du miroir
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
        bedPos.x + 1.5 + Math.cos(a) * 0.75,
        1.75 + Math.sin(a * 1.3) * 0.3,
        bedPos.z - 2.28 + Math.sin(a) * 0.3
      );
      root.add(orb);
      traitOrbs.push({ mesh: orb, mat: orbMat, color, phase: i * 0.9 });
    }

    const pickZone = makePickZone("chambre", 5, H, 5, bedPos.x, H / 2, bedPos.z);
    root.add(pickZone);
    pickables.push(pickZone);
    roomMeshes.chambre = pickZone;
  }

  // ================= JARDIN / SERRE =================
  const gPos = ROOM_POS.jardin!;
  const plants: {
    group: THREE.Group; baseScale: number; baseY: number;
    mat: THREE.MeshStandardMaterial; light: THREE.PointLight;
  }[] = [];
  {
    root.add(boxOnFloor(3.2, 0.3, 1.6, MAT.wood, gPos.x, 0, gPos.z - 0.5));
    root.add(boxOnFloor(3.0, 0.06, 1.4, MAT.soil, gPos.x, 0.3, gPos.z - 0.5));
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
    root.add(boxOnFloor(2.2, 0.05, 0.35, MAT.wood, gPos.x, 0.9, gPos.z - 2.6));
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

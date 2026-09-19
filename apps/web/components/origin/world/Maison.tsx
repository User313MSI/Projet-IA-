import * as THREE from "three";
import { MAT, box, boxOnFloor } from "./kit";

export interface MaisonLayout {
  root: THREE.Group;
  houseRoot: THREE.Group;
  windowMaterials: THREE.MeshPhysicalMaterial[];
  ringMaterials: THREE.MeshBasicMaterial[];
  door: THREE.Mesh | null;
  doorPivot: THREE.Group;
  doorRing: THREE.Mesh | null;
  houseInfo: THREE.Object3D | null;
  breathers: { mat: THREE.Material; base: number; amp: number; speed: number; phase: number }[];
  windows: THREE.Mesh[];
}

// Maison compacte à échelle humaine : 18 × 13 m, plafond 3.2 m
const W = 18;    // largeur (X) : intérieur -9 → 9
const D = 13;    // profondeur (Z) : intérieur -6.5 → 6.5
const H = 3.2;   // hauteur sous plafond
const T = 0.3;   // épaisseur murs

const X_MIN = -W / 2;
const X_MAX = W / 2;
const Z_MIN = -D / 2;
const Z_MAX = D / 2;

export function buildMaison(): MaisonLayout {
  const root = new THREE.Group();
  const houseRoot = new THREE.Group();
  root.add(houseRoot);

  const windowMaterials: THREE.MeshPhysicalMaterial[] = [];
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const breathers: MaisonLayout["breathers"] = [];
  const windows: THREE.Mesh[] = [];

  // ---------- Murs ----------
  const wall = (x1: number, z1: number, x2: number, z2: number, mat = MAT.wall, h = H, thickness = T) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, len + thickness), mat);
    mesh.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
    mesh.rotation.y = angle - Math.PI / 2;
    return mesh;
  };

  // Façade avant : porte centrale de 1.1 m (largeur standard)
  const DOOR_W = 1.1;
  houseRoot.add(wall(X_MIN, Z_MAX, -DOOR_W / 2, Z_MAX));
  houseRoot.add(wall(DOOR_W / 2, Z_MAX, X_MAX, Z_MAX));
  // Linteau au-dessus de la porte
  houseRoot.add(box(DOOR_W + 0.2, H - 2.15, T, MAT.wall, 0, 2.15 + (H - 2.15) / 2, Z_MAX));

  // Mur arrière avec baie vitrée centrale de 3 m vers la serre
  houseRoot.add(wall(X_MIN, Z_MIN, -1.5, Z_MIN));
  houseRoot.add(wall(1.5, Z_MIN, X_MAX, Z_MIN));
  houseRoot.add(box(3.2, H - 2.4, T, MAT.wall, 0, 2.4 + (H - 2.4) / 2, Z_MIN));

  // Murs latéraux
  houseRoot.add(wall(X_MIN, Z_MIN, X_MIN, Z_MAX));
  houseRoot.add(wall(X_MAX, Z_MIN, X_MAX, Z_MAX));

  // ---------- Sol : parquet bois ----------
  const floor = box(W, 0.1, D, MAT.woodFloor, 0, -0.05, 0);
  houseRoot.add(floor);

  // ---------- Plafond ----------
  const ceiling = box(W, 0.15, D, MAT.partition, 0, H + 0.075, 0);
  houseRoot.add(ceiling);

  // ---------- Cloisons intérieures (plan épuré : 2 cloisons, 3 portes) ----------
  // Cloison transversale Z = -1.5 (sépare l'avant des 2 pièces arrière),
  // 2 portes de 0.95 m : x = -4.5 (vers bibliothèque) et x = 4.5 (vers chambre)
  const PW = 0.95; // largeur porte intérieure
  houseRoot.add(wall(X_MIN, -1.5, -4.5 - PW / 2, -1.5, MAT.partition, H, 0.16));
  houseRoot.add(wall(-4.5 + PW / 2, -1.5, 4.5 - PW / 2, -1.5, MAT.partition, H, 0.16));
  houseRoot.add(wall(4.5 + PW / 2, -1.5, X_MAX, -1.5, MAT.partition, H, 0.16));

  // Cloisons longitudinales X = ±4.5 sur la zone avant, porte près de la façade
  houseRoot.add(wall(-4.5, Z_MAX, -4.5, 2.2, MAT.partition, H, 0.16));
  houseRoot.add(wall(-4.5, 1.0, -4.5, -1.5, MAT.partition, H, 0.16));
  houseRoot.add(wall(4.5, Z_MAX, 4.5, 2.2, MAT.partition, H, 0.16));
  houseRoot.add(wall(4.5, 1.0, 4.5, -1.5, MAT.partition, H, 0.16));

  // Cloison centrale arrière X = 0 (bibliothèque | chambre), pleine
  houseRoot.add(wall(0, -1.5, 0, Z_MIN, MAT.partition, H, 0.16));

  // ---------- Encadrements de portes intérieures ----------
  const doorTrim = (x: number, z: number, ry: number) => {
    for (const dx of [-PW / 2 - 0.04, PW / 2 + 0.04]) {
      const trim = boxOnFloor(0.08, 2.15, 0.2, MAT.white, x + (ry === 0 ? dx : 0), 0, z + (ry === 0 ? 0 : dx));
      if (ry !== 0) trim.rotation.y = ry;
      houseRoot.add(trim);
    }
    const top = boxOnFloor(PW + 0.16, 0.08, 0.2, MAT.white, x, 2.07, z);
    if (ry !== 0) top.rotation.y = ry;
    houseRoot.add(top);
  };
  doorTrim(-4.5, -1.5, 0);
  doorTrim(4.5, -1.5, 0);
  doorTrim(-4.5, 1.6, Math.PI / 2);
  doorTrim(4.5, 1.6, Math.PI / 2);

  // ---------- Toit à deux pentes (faîte le long de Z) ----------
  const overhang = 0.6;
  const ridgeH = 1.9;
  const roofLen = D + 2 * overhang + 0.4;
  const run = W / 2 + overhang;
  const slopeLen = Math.hypot(run, ridgeH);
  const angle = Math.atan2(ridgeH, run);

  for (const side of [1, -1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.16, roofLen), MAT.roof);
    slope.rotation.z = side * angle;
    slope.position.set(side * (run / 2) * Math.cos(angle), H + ridgeH / 2, 0);
    houseRoot.add(slope);
    // Gouttière
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, roofLen), MAT.metal);
    gutter.rotation.z = side * angle;
    gutter.position.set(side * run * 0.96, H + 0.02, 0);
    houseRoot.add(gutter);
  }
  // Faîtière
  houseRoot.add(box(0.26, 0.14, roofLen, MAT.roof, 0, H + ridgeH + 0.04, 0));

  // Pignons (extrémités du toit)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(X_MIN, 0);
  gableShape.lineTo(X_MAX, 0);
  gableShape.lineTo(0, ridgeH);
  gableShape.lineTo(X_MIN, 0);
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 0.14, bevelEnabled: false });
  for (const zz of [Z_MIN - 0.16, Z_MAX + 0.02]) {
    const gable = new THREE.Mesh(gableGeom, MAT.wall);
    gable.position.set(0, H, zz);
    houseRoot.add(gable);
  }

  // ---------- Cheminée ----------
  houseRoot.add(boxOnFloor(0.9, 1.5, 0.9, MAT.brick, W / 2 - 3, H + 0.4, -0.5));
  houseRoot.add(box(1.1, 0.14, 1.1, MAT.stone, W / 2 - 3, H + 1.95, -0.5));

  // ---------- Fenêtres ----------
  const addWindow = (x: number, z: number, ry: number, w: number, h = 1.25, y = 1.65) => {
    const glass = MAT.glass.clone();
    windowMaterials.push(glass);
    // Encadrement + croisillons
    houseRoot.add(box(w + 0.2, h + 0.2, 0.1, MAT.white, x, y, z, ry));
    houseRoot.add(box(0.06, h, 0.12, MAT.white, x, y, z, ry));
    houseRoot.add(box(w, 0.06, 0.12, MAT.white, x, y, z, ry));
    const pane = box(w, h, 0.04, glass, x, y, z, ry);
    houseRoot.add(pane);
    windows.push(pane);
  };

  // Façade avant : 2 fenêtres de chaque côté de la porte
  addWindow(-6.4, Z_MAX + 0.05, 0, 1.5);
  addWindow(6.4, Z_MAX + 0.05, 0, 1.5);
  // Fenêtres latérales (2 par côté)
  addWindow(X_MIN - 0.05, 3.2, Math.PI / 2, 1.5);
  addWindow(X_MIN - 0.05, -3.4, Math.PI / 2, 1.5);
  addWindow(X_MAX + 0.05, 3.2, Math.PI / 2, 1.5);
  addWindow(X_MAX + 0.05, -3.4, Math.PI / 2, 1.5);
  // Baie vitrée arrière (vers la serre)
  addWindow(0, Z_MIN - 0.05, 0, 3.0, 2.3, 1.2);

  // ---------- Porte d'entrée ----------
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-DOOR_W / 2, 0, Z_MAX + 0.02);
  houseRoot.add(doorPivot);
  const door = boxOnFloor(DOOR_W, 2.15, 0.08, MAT.wood, DOOR_W / 2, 0, 0);
  doorPivot.add(door);
  // Vitrage haut + poignée laiton
  const doorGlass = MAT.glass.clone();
  windowMaterials.push(doorGlass);
  doorPivot.add(box(0.7, 0.5, 0.06, doorGlass, DOOR_W / 2, 1.75, 0.05));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), MAT.brass);
  knob.position.set(DOOR_W - 0.14, 1.05, 0.1);
  doorPivot.add(knob);
  // Encadrement blanc
  houseRoot.add(boxOnFloor(0.1, 2.3, 0.22, MAT.white, -DOOR_W / 2 - 0.05, 0, Z_MAX + 0.06));
  houseRoot.add(boxOnFloor(0.1, 2.3, 0.22, MAT.white, DOOR_W / 2 + 0.05, 0, Z_MAX + 0.06));
  houseRoot.add(box(DOOR_W + 0.2, 0.1, 0.22, MAT.white, 0, 2.2, Z_MAX + 0.06));

  // Applique au-dessus de la porte
  const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), MAT.lampWarm);
  porchBulb.position.set(0, 2.6, Z_MAX + 0.25);
  houseRoot.add(porchBulb);
  const porchPoint = new THREE.PointLight(0xffd9a0, 1.2, 6, 2);
  porchPoint.position.set(0, 2.6, Z_MAX + 0.35);
  houseRoot.add(porchPoint);
  root.userData.porchLight = porchPoint;

  // ---------- Terrain ----------
  const ground = box(W + 16, 0.6, D + 22, MAT.grass, 0, -0.32, -2.5);
  root.add(ground);
  // Terrasse en pierre devant
  root.add(box(W + 4, 0.1, 3.4, MAT.stone, 0, 0.03, Z_MAX + 2.0));
  // Chemin en dalles
  for (let i = 0; i < 5; i++) {
    root.add(boxOnFloor(1.3, 0.07, 0.75, MAT.stone, 0, 0.04, Z_MAX + 3.6 + i * 1.15));
  }

  // ---------- Serre (jardin) derrière ----------
  const GH_W = 4.6;   // demi-largeur... non : largeur totale
  const GH_Z1 = Z_MIN;      // accolée à la maison
  const GH_Z2 = Z_MIN - 5.5; // profondeur
  {
    const ghGlass = MAT.glass.clone();
    ghGlass.emissiveIntensity = 0.15;
    windowMaterials.push(ghGlass);
    const gw = GH_W / 2;

    // Soubassement
    root.add(boxOnFloor(GH_W, 0.3, 0.12, MAT.stone, 0, 0, GH_Z2));
    root.add(boxOnFloor(0.12, 0.3, 5.5, MAT.stone, -gw, 0, (GH_Z1 + GH_Z2) / 2));
    root.add(boxOnFloor(0.12, 0.3, 5.5, MAT.stone, gw, 0, (GH_Z1 + GH_Z2) / 2));

    // Panneaux vitrés
    root.add(box(GH_W, 2.2, 0.04, ghGlass, 0, 1.4, GH_Z2, 0));
    root.add(box(0.04, 2.2, 5.5, ghGlass, -gw, 1.4, (GH_Z1 + GH_Z2) / 2, 0));
    root.add(box(0.04, 2.2, 5.5, ghGlass, gw, 1.4, (GH_Z1 + GH_Z2) / 2, 0));

    // Montants
    for (const sx of [-gw, 0, gw]) {
      root.add(boxOnFloor(0.1, 2.5, 0.1, MAT.white, sx, 0, GH_Z2));
    }
    for (let i = 0; i <= 3; i++) {
      const z = GH_Z2 + (i * 5.5) / 3;
      root.add(boxOnFloor(0.08, 2.2, 0.08, MAT.white, -gw, 0, z));
      root.add(boxOnFloor(0.08, 2.2, 0.08, MAT.white, gw, 0, z));
    }

    // Toit de serre : une pente douce vers l'arrière
    const ghAngle = Math.atan2(0.9, 5.5);
    const ghRoofLen = Math.hypot(5.5, 0.9);
    const ghRoof = new THREE.Mesh(new THREE.BoxGeometry(GH_W + 0.3, 0.06, ghRoofLen), ghGlass);
    ghRoof.rotation.x = -ghAngle;
    ghRoof.position.set(0, 2.5 + 0.45, (GH_Z1 + GH_Z2) / 2);
    root.add(ghRoof);

    // Sol : terre + allée centrale en dalles
    root.add(box(GH_W, 0.08, 5.5, MAT.soil, 0, 0.02, (GH_Z1 + GH_Z2) / 2));
    for (let i = 0; i < 4; i++) {
      root.add(boxOnFloor(0.7, 0.05, 0.7, MAT.stone, 0, 0.05, GH_Z1 - 1.0 - i * 1.3));
    }
  }

  // ---------- Plaque « Maison d'Origin » ----------
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 96;
  const sctx = signCanvas.getContext("2d");
  if (sctx) {
    sctx.fillStyle = "#3a2e24";
    sctx.fillRect(0, 0, 512, 96);
    sctx.font = "500 38px Georgia, serif";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillStyle = "#e8d9b8";
    sctx.fillText("Maison d'Origin", 256, 50);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.34),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.85 })
  );
  sign.position.set(0, 2.55, Z_MAX + 0.22);
  houseRoot.add(sign);

  const houseInfo = new THREE.Object3D();
  root.add(houseInfo);

  return {
    root,
    houseRoot,
    windowMaterials,
    ringMaterials,
    door,
    doorPivot,
    doorRing: null,
    houseInfo,
    breathers,
    windows,
  };
}

export interface HouseAnimation {
  update(t: number, cameraPos: THREE.Vector3): void;
}

export function createHouseAnimation(
  layout: MaisonLayout,
  doorOpen: { current: boolean }
): HouseAnimation {
  return {
    update(t: number, _cameraPos: THREE.Vector3) {
      void _cameraPos;
      // Lueur des fenêtres : douce pulsation chaude (maison habitée)
      for (const wm of layout.windowMaterials) {
        wm.emissiveIntensity = 0.26 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.7));
      }
      // Porte : pivot charnière gauche
      const targetAngle = doorOpen.current ? -1.5 : 0;
      layout.doorPivot.rotation.y += (targetAngle - layout.doorPivot.rotation.y) * 0.08;
      // Applique de porche
      const porch = layout.root.userData.porchLight as THREE.PointLight | undefined;
      if (porch) porch.intensity = 1.05 + 0.2 * Math.sin(t * 0.8);
      void t;
    },
  };
}

import * as THREE from "three";

// ============ KIT DE CONSTRUCTION ============
// Toutes les dimensions sont en mètres, à l'échelle humaine.
// Règle : chaque meuble a les proportions d'un vrai meuble.

// ---------- Palette de matériaux (une seule source de vérité) ----------
export const MAT = {
  wall: new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.95 }),
  partition: new THREE.MeshStandardMaterial({ color: 0xefe9df, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x8a4232, roughness: 0.9 }),
  woodFloor: new THREE.MeshStandardMaterial({ color: 0xa07850, roughness: 0.65 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.55, metalness: 0.05 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.7 }),
  brick: new THREE.MeshStandardMaterial({ color: 0x9c5240, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xb0a89c, roughness: 0.95 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x52703e, roughness: 1.0 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1.0 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 0.45, metalness: 0.75 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.85 }),
  fabricGreen: new THREE.MeshStandardMaterial({ color: 0x6b7a5c, roughness: 1.0 }),
  fabricRed: new THREE.MeshStandardMaterial({ color: 0xa8564a, roughness: 1.0 }),
  fabricCream: new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 1.0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3e7a46, roughness: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xc8d8dc,
    emissive: 0xffc98a,
    emissiveIntensity: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.5,
    transmission: 0.7,
    thickness: 0.1,
  }),
  lampWarm: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
} as const;

// ---------- Primitives ----------
// Boîte positionnée par son CENTRE au sol (y = hauteur du centre)
export function box(
  w: number, h: number, d: number,
  mat: THREE.Material,
  x: number, y: number, z: number,
  ry = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  return m;
}

// Boîte posée au sol (y = hauteur du BAS)
export function boxOnFloor(
  w: number, h: number, d: number,
  mat: THREE.Material,
  x: number, y: number, z: number,
  ry = 0
): THREE.Mesh {
  return box(w, h, d, mat, x, y + h / 2, z, ry);
}

// ---------- Meubles à l'échelle réelle (dimensions marché) ----------

// Canapé 2 places : 1.80 × 0.85 m, assise 42 cm
export function makeSofa(mat: THREE.Material = MAT.fabricGreen): THREE.Group {
  const g = new THREE.Group();
  g.add(boxOnFloor(1.8, 0.42, 0.85, mat, 0, 0, 0));
  g.add(boxOnFloor(1.8, 0.45, 0.22, mat, 0, 0.42, -0.31));
  g.add(boxOnFloor(0.22, 0.62, 0.85, mat, -0.79, 0, 0));
  g.add(boxOnFloor(0.22, 0.62, 0.85, mat, 0.79, 0, 0));
  return g;
}

// Fauteuil : 0.85 × 0.85 m
export function makeArmchair(mat: THREE.Material = MAT.fabricRed): THREE.Group {
  const g = new THREE.Group();
  g.add(boxOnFloor(0.85, 0.42, 0.85, mat, 0, 0, 0));
  g.add(boxOnFloor(0.85, 0.5, 0.2, mat, 0, 0.42, -0.32));
  g.add(boxOnFloor(0.18, 0.6, 0.85, mat, -0.33, 0, 0));
  g.add(boxOnFloor(0.18, 0.6, 0.85, mat, 0.33, 0, 0));
  return g;
}

// Table basse : Ø 0.9 × H 0.42 m
export function makeCoffeeTable(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), MAT.wood);
  top.position.set(0, 0.4, 0);
  g.add(top);
  g.add(boxOnFloor(0.08, 0.38, 0.08, MAT.darkWood, -0.28, 0, -0.28));
  g.add(boxOnFloor(0.08, 0.38, 0.08, MAT.darkWood, 0.28, 0, -0.28));
  g.add(boxOnFloor(0.08, 0.38, 0.08, MAT.darkWood, -0.28, 0, 0.28));
  g.add(boxOnFloor(0.08, 0.38, 0.08, MAT.darkWood, 0.28, 0, 0.28));
  return g;
}

// Bibliothèque : 1.2 large × 2.0 haut × 0.3 profond, 4 étagères
export function makeBookshelf(): { group: THREE.Group; shelves: THREE.Object3D[] } {
  const g = new THREE.Group();
  const shelves: THREE.Object3D[] = [];
  g.add(boxOnFloor(0.06, 2.0, 0.3, MAT.wood, -0.6, 0, 0));
  g.add(boxOnFloor(0.06, 2.0, 0.3, MAT.wood, 0.6, 0, 0));
  g.add(boxOnFloor(1.2, 0.06, 0.3, MAT.wood, 0, 1.98, 0));
  g.add(boxOnFloor(1.14, 0.05, 0.05, MAT.wood, 0, 0.3, -0.12));
  for (let i = 0; i < 4; i++) {
    const y = 0.15 + i * 0.46;
    g.add(boxOnFloor(1.14, 0.045, 0.28, MAT.wood, 0, y, 0));
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(0, y + 0.05, 0);
    g.add(shelfGroup);
    shelves.push(shelfGroup);
  }
  return { group: g, shelves };
}

// Lit double : 2.0 long (X ici en largeur locale) × 1.6 × matelas 0.5
export function makeBed(): THREE.Group {
  const g = new THREE.Group();
  g.add(boxOnFloor(1.7, 0.28, 2.0, MAT.darkWood, 0, 0, 0));
  g.add(boxOnFloor(1.7, 0.65, 0.12, MAT.darkWood, 0, 0, -1.0));
  g.add(boxOnFloor(1.66, 0.2, 1.96, MAT.fabricCream, 0, 0.26, 0));
  g.add(boxOnFloor(1.66, 0.12, 0.7, MAT.fabricGreen, 0, 0.46, -0.6));
  g.add(boxOnFloor(0.62, 0.14, 0.38, MAT.white, -0.42, 0.46, -0.78));
  g.add(boxOnFloor(0.62, 0.14, 0.38, MAT.white, 0.42, 0.46, -0.78));
  return g;
}

// Chevet : 0.45 × 0.55 × 0.4
export function makeNightstand(): THREE.Group {
  const g = new THREE.Group();
  g.add(boxOnFloor(0.45, 0.5, 0.4, MAT.wood, 0, 0, 0));
  g.add(boxOnFloor(0.37, 0.06, 0.06, MAT.darkWood, 0, 0.3, 0.17));
  return g;
}

// Lampe d'appoint (abat-jour chaud, avec vraie lumière)
export function makeFloorLamp(withLight = true): { group: THREE.Group; light: THREE.PointLight } {
  const g = new THREE.Group();
  g.add(boxOnFloor(0.3, 0.04, 0.3, MAT.metal, 0, 0, 0));
  g.add(boxOnFloor(0.05, 1.45, 0.05, MAT.metal, 0, 0.04, 0));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.26, 14, 1, true), MAT.lampWarm);
  shade.position.set(0, 1.55, 0);
  g.add(shade);
  const light = new THREE.PointLight(0xffd9a0, withLight ? 0.9 : 0, 5, 2);
  light.position.set(0, 1.5, 0);
  g.add(light);
  return { group: g, light };
}

// Plante en pot (naturelle, sobre)
export function makePottedPlant(scale = 1): { group: THREE.Group; mat: THREE.MeshStandardMaterial; light: THREE.PointLight } {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.12 * scale, 0.24 * scale, 10), MAT.brick);
  pot.position.set(0, 0.12 * scale, 0);
  g.add(pot);
  const stemMat = MAT.leaf;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 0.5 * scale, 6), stemMat);
  stem.position.set(0, 0.45 * scale, 0);
  g.add(stem);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 6), stemMat);
    leaf.scale.set(1.4, 0.3, 0.8);
    const a = (i / 5) * Math.PI * 2;
    const r = 0.3 * scale;
    leaf.position.set(Math.cos(a) * r, (0.55 + (i % 2) * 0.18) * scale, Math.sin(a) * r);
    leaf.rotation.y = a;
    g.add(leaf);
  }
  const light = new THREE.PointLight(0xbfe8c0, 0.2, 2.5, 2);
  light.position.set(0, 0.8 * scale, 0);
  g.add(light);
  return { group: g, mat: stemMat, light };
}

// Tapis (disque plat sobre)
export function makeRug(radius: number, color = 0x8a7a62): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1.0 });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), mat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.02;
  return rug;
}

// Miroir mural avec cadre doré
export function makeWallMirror(radius = 0.45): { mirror: THREE.Mesh; frame: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xbfe4f2,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), mat);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.045, 0.035, 10, 32), MAT.brass);
  return { mirror, frame, mat };
}

// Tableau accroché au mur (cadre simple)
export function makePainting(w = 0.8, h = 0.6): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w + 0.08, h + 0.08, 0.05, MAT.darkWood, 0, 0, 0));
  const canvas = box(w, h, 0.03, MAT.fabricCream, 0, 0, 0.02);
  g.add(canvas);
  return g;
}

// Écran holographique (le seul élément « IA » du salon)
export function makeHoloScreen(w = 1.6, h = 1.0): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4dd8e8,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return { mesh, mat };
}

// Radiateur / plinthe chauffage (détail réaliste)
export function makeRadiator(w = 1.0): THREE.Group {
  const g = new THREE.Group();
  g.add(boxOnFloor(w, 0.5, 0.12, MAT.white, 0, 0, 0));
  for (let i = 0; i < Math.floor(w / 0.12); i++) {
    g.add(boxOnFloor(0.05, 0.42, 0.14, MAT.metal, -w / 2 + 0.08 + i * 0.12, 0.04, 0));
  }
  return g;
}

"use client";

import * as THREE from "three";

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

// Dimensions du plan de la maison (une vraie maison rectangulaire)
const W = 26;   // largeur intérieure (X)
const D = 20;   // profondeur intérieure (Z)
const H = 3.6;  // hauteur des murs
const T = 0.4;  // épaisseur des murs

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

  // ============ MATÉRIAUX DE LA MAISON (style maison réelle) ============
  // Murs extérieurs : enduit chaud crème/beige, mat
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xcfc4b0,
    roughness: 0.92,
    metalness: 0.0,
  });
  // Cloisons intérieures : peinture claire mate
  const partitionMat = new THREE.MeshStandardMaterial({
    color: 0xe9e3d8,
    roughness: 0.95,
    metalness: 0.0,
  });
  // Plinthes : liseré LED chaud très discret (guide nocturne, pas néon)
  const skirtMat = new THREE.MeshBasicMaterial({
    color: 0xffb86b,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  // Menuiseries : blanc cassé (fenêtres, encadrements)
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xf2eee6,
    roughness: 0.6,
    metalness: 0.05,
  });
  // Bois chaleureux (poutres, mobilier fixe)
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8a6244,
    roughness: 0.7,
    metalness: 0.0,
  });

  const wall = (x1: number, z1: number, x2: number, z2: number, h = H, thickness = T, y = 0) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, len + thickness), wallMat);
    mesh.position.set((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2);
    mesh.rotation.y = angle - Math.PI / 2;
    return mesh;
  };

  const partition = (x1: number, z1: number, x2: number, z2: number, h = H, thickness = T, y = 0) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, h, len + thickness), partitionMat);
    mesh.position.set((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2);
    mesh.rotation.y = angle - Math.PI / 2;
    return mesh;
  };

  // ============ PLATEFORME (terrain : herbe + terrasse en pierre) ============
  const platMat = new THREE.MeshStandardMaterial({
    color: 0x4a6b3a,
    roughness: 1.0,
    metalness: 0.0,
  });
  const plat = new THREE.Mesh(new THREE.BoxGeometry(W + 7, 1.0, D + 14), platMat);
  plat.position.set(0, -0.5, -1);
  root.add(plat);

  // Terrasse en pierre claire autour de la maison
  const terraceMat = new THREE.MeshStandardMaterial({
    color: 0xa8a094,
    roughness: 0.95,
    metalness: 0.0,
  });
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(W + 5, 0.08, D + 6), terraceMat);
  terrace.position.set(0, 0.02, -1);
  root.add(terrace);

  // Chemin d'entrée en dalles de pierre (devant la porte, vers la caméra)
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x9c948a,
    roughness: 0.9,
    metalness: 0.0,
  });
  const path = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 8), pathMat);
  path.position.set(0, 0.05, D / 2 + 4);
  root.add(path);
  // Dalles individuelles du chemin (rythme réel)
  for (let i = 0; i < 6; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.9), pathMat);
    slab.position.set(0, 0.06, D / 2 + 1.4 + i * 1.35);
    root.add(slab);
  }

  // Bordure chaude très discrète du chemin (éclairage architectural bas)
  for (const sx of [-1.6, 1.6]) {
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0xffb86b,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 8), stripMat);
    strip.position.set(sx, 0.1, D / 2 + 4);
    root.add(strip);
    breathers.push({ mat: stripMat, base: 0.1, amp: 0.06, speed: 0.9, phase: sx });
  }

  // Bord du terrain discret (pierre, pas de LED)
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x8d867c,
    roughness: 0.95,
    metalness: 0.0,
  });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(W + 7.2, 0.08, D + 14.2), edgeMat);
  edge.position.set(0, 0.02, -1);
  root.add(edge);
  breathers.push({ mat: edgeMat, base: 0.3, amp: 0.2, speed: 0.8, phase: 0 });

  // ============ MURS EXTÉRIEURS ============
  // Façade avant (Z_MAX) : porte centrale de 1.6 + linteau
  {
    const doorHalf = 0.8;
    houseRoot.add(wall(X_MIN, Z_MAX, -doorHalf, Z_MAX));
    houseRoot.add(wall(doorHalf, Z_MAX, X_MAX, Z_MAX));
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.8, H - 2.5, T), wallMat);
    lintel.position.set(0, 2.5 + (H - 2.5) / 2, Z_MAX);
    houseRoot.add(lintel);
  }

  // Mur arrière (Z_MIN) : porte vitrée centrale de 4 vers la serre + linteau
  houseRoot.add(wall(X_MIN, Z_MIN, -2, Z_MIN));
  houseRoot.add(wall(2, Z_MIN, X_MAX, Z_MIN));
  {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, H - 2.5, T), wallMat);
    lintel.position.set(0, 2.5 + (H - 2.5) / 2, Z_MIN);
    houseRoot.add(lintel);
  }

  // Murs latéraux (X_MIN et X_MAX)
  houseRoot.add(wall(X_MIN, Z_MIN, X_MIN, Z_MAX));
  houseRoot.add(wall(X_MAX, Z_MIN, X_MAX, Z_MAX));

  // ============ TOIT À DEUX PENTES ============
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1a1338,
    roughness: 0.55,
    metalness: 0.2,
    emissive: 0x090614,
    emissiveIntensity: 0.5,
  });
  const overhang = 1.0;
  const ridgeH = 2.6;
  const roofLen = D + 2 + overhang * 2;

  const makeSlope = (side: 1 | -1) => {
    const run = W / 2 + overhang;
    const slopeLen = Math.hypot(run, ridgeH);
    const geo = new THREE.BoxGeometry(slopeLen, 0.25, roofLen);
    const mesh = new THREE.Mesh(geo, roofMat);
    const angle = Math.atan2(ridgeH, run);
    mesh.rotation.z = side * angle;
    const cx = side * (run / 2) * Math.cos(angle) * 0.98;
    const cy = H + (ridgeH / 2);
    mesh.position.set(cx, cy, -1);
    houseRoot.add(mesh);

    // Gouttière le long du bord du toit (métal sombre, réaliste)
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x6b6560,
      roughness: 0.4,
      metalness: 0.7,
    });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, roofLen), trimMat);
    trim.position.set(side * run * 0.96, H + 0.02, -1);
    trim.rotation.z = side * angle;
    houseRoot.add(trim);
  };
  makeSlope(1);
  makeSlope(-1);

  // Pignons (triangles aux extrémités Z pour fermer le toit) — shape XY, extrudée en Z, posée droite
  const gableShape = new THREE.Shape();
  gableShape.moveTo(X_MIN, 0);
  gableShape.lineTo(X_MAX, 0);
  gableShape.lineTo(0, ridgeH);
  gableShape.lineTo(X_MIN, 0);
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 0.02, bevelEnabled: false });
  for (const zz of [Z_MIN - 0.21, Z_MAX - 0.21]) {
    const gable = new THREE.Mesh(gableGeom, wallMat);
    gable.position.set(0, H, zz);
    houseRoot.add(gable);
  }

  // Faîtière en tuiles (arête du toit)
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x8a4029,
    roughness: 0.85,
    metalness: 0.0,
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, D + 2), ridgeMat);
  ridge.position.set(0, H + ridgeH + 0.04, -1);
  houseRoot.add(ridge);

  // Cheminée en brique avec chapeau en pierre
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x8f4a38,
    roughness: 0.9,
    metalness: 0.0,
  });
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 1.1), brickMat);
  chimney.position.set(W / 2 - 4, 4.6, -1);
  houseRoot.add(chimney);
  const chimneyCapMat = new THREE.MeshStandardMaterial({
    color: 0xb8b0a4,
    roughness: 0.9,
    metalness: 0.0,
  });
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 1.3), chimneyCapMat);
  chimneyCap.position.set(W / 2 - 4, 5.48, -1);
  houseRoot.add(chimneyCap);

  // ============ FENÊTRES (menuiserie bois blanc, vitrage clair) ============
  // De nuit, les vitres laissent passer la lueur chaude de l'intérieur
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbfd2d8,
    emissive: 0xffc98a,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
    transmission: 0.75,
    thickness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const addWindow = (x: number, z: number, ry: number, w: number, h = 1.5, y = 1.8) => {
    const glass = windowGlassMat.clone();
    windowMaterials.push(glass);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, h + 0.34, 0.14), beamMat);
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    houseRoot.add(frame);
    // Croisillon (meneau) central : deux carreaux comme une vraie fenêtre
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.16), beamMat);
    mullion.position.set(x, y, z);
    mullion.rotation.y = ry;
    houseRoot.add(mullion);
    const transom = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.16), beamMat);
    transom.position.set(x, y, z);
    transom.rotation.y = ry;
    houseRoot.add(transom);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), glass);
    pane.position.set(x, y, z + (ry === 0 ? 0.05 : 0));
    pane.rotation.y = ry;
    houseRoot.add(pane);
    windows.push(pane);
  };

  // Fenêtres de la façade avant (2 de chaque côté de la porte)
  addWindow(-6, Z_MAX + 0.02, 0, 2.2);
  addWindow(6, Z_MAX + 0.02, 0, 2.2);
  // Fenêtres latérales
  addWindow(X_MIN - 0.02, 3, Math.PI / 2, 2.2);
  addWindow(X_MIN - 0.02, -7, Math.PI / 2, 2.2);
  addWindow(X_MAX + 0.02, 3, Math.PI / 2, 2.2);
  addWindow(X_MAX + 0.02, -7, Math.PI / 2, 2.2);
  // Baie vitrée arrière (porte vitrée vers la serre, largeur 4)
  addWindow(0, Z_MIN - 0.02, 0, 4, 2.4, 1.25);

  // ============ PORTE D'ENTRÉE (s'ouvre au clic) ============
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.8, 0, Z_MAX + 0.05);
  houseRoot.add(doorPivot);

  // Porte en bois massif avec petits carreaux vitrés en haut
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x6b4226,
    roughness: 0.55,
    metalness: 0.05,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 0.14), doorMat);
  door.position.set(0.8, 1.25, 0);
  doorPivot.add(door);
  // Vitrage haut de la porte (lueur chaude)
  const doorGlassMat = windowGlassMat.clone();
  windowMaterials.push(doorGlassMat);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.05), doorGlassMat);
  doorGlass.position.set(0.8, 1.9, 0.08);
  doorPivot.add(doorGlass);
  // Petit croisillon du vitrage
  const doorMullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.06), beamMat);
  doorMullion.position.set(0.8, 1.9, 0.1);
  doorPivot.add(doorMullion);

  // Poignée laiton
  const knobMat = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    roughness: 0.3,
    metalness: 0.9,
  });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), knobMat);
  knob.position.set(1.35, 1.15, 0.12);
  doorPivot.add(knob);

  // Encadrement de porte en bois blanc (comme les fenêtres)
  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf2eee6,
    roughness: 0.6,
    metalness: 0.05,
  });
  const doorFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.2), doorFrameMat);
  doorFrameLeft.position.set(-0.85, 1.35, Z_MAX + 0.1);
  houseRoot.add(doorFrameLeft);
  const doorFrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.2), doorFrameMat);
  doorFrameRight.position.set(0.85, 1.35, Z_MAX + 0.1);
  houseRoot.add(doorFrameRight);
  const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.14, 0.2), doorFrameMat);
  doorFrameTop.position.set(0, 2.72, Z_MAX + 0.1);
  houseRoot.add(doorFrameTop);

  // Applique au-dessus de la porte (lanterne chaude réaliste)
  const porchLightMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const porchLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), porchLightMat);
  porchLight.position.set(0, 2.95, Z_MAX + 0.3);
  houseRoot.add(porchLight);
  const porchPoint = new THREE.PointLight(0xffd9a0, 1.4, 7, 2);
  porchPoint.position.set(0, 3.0, Z_MAX + 0.45);
  houseRoot.add(porchPoint);
  root.userData.porchLight = porchPoint;

  // ============ CLOISONS INTÉRIEURES ============
  // Plan : porte d'entrée → SALON (centre-avant). Cloison Z=-3 avec 2 portes (x=±4.8),
  // chacune donne dans une pièce arrière. Avant : cerveau et interview à gauche/droite
  // du salon (cloisons X=±6.5, porte près de la façade). Arrière : bibliothèque (gauche)
  // et chambre (droite), séparées par la cloison X=0. Serre/jardin accessible par la
  // porte vitrée arrière.

  // Cloison traversante Z = -3, avec 2 portes (x=-4.8 et 4.8, largeur 1.6)
  houseRoot.add(partition(X_MIN, -3, -5.6, -3));
  houseRoot.add(partition(-4, -3, 4, -3));
  houseRoot.add(partition(5.6, -3, X_MAX, -3));

  // Cloison centrale arrière X = 0 (sépare bibliothèque et chambre), pleine
  houseRoot.add(partition(0, -3, 0, Z_MIN));

  // Cloisons avant X = ±6.5, porte près de la façade (couloir d'entrée dans chaque pièce)
  houseRoot.add(partition(6.5, 9, 6.5, 5.6));
  houseRoot.add(partition(6.5, 4, 6.5, -3));
  houseRoot.add(partition(-6.5, 9, -6.5, 5.6));
  houseRoot.add(partition(-6.5, 4, -6.5, -3));

  // ============ SOL INTÉRIEUR : PARQUET BOIS (planches le long de X) ============
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x9c7350,
    roughness: 0.7,
    metalness: 0.0,
  });
  for (let i = 0; i < 17; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.06, (D - 0.6) / 17), floorMat);
    plank.position.set(0, 0.03, Z_MIN + 0.3 + 0.3 + i * ((D - 0.6) / 17));
    // léger nuance de teinte planche par planche
    plank.material = floorMat.clone();
    (plank.material as THREE.MeshStandardMaterial).color.offsetHSL(0, 0, (i % 3) * 0.008 - 0.008);
    houseRoot.add(plank);
  }

  // ============ PLAFOND INTÉRIEUR (invisible de l'extérieur grâce au toit) ============
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf3efe7,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), ceilMat);
  ceiling.position.set(0, H + 0.1, -1);
  houseRoot.add(ceiling);

  // Poutres apparentes du plafond (bois chaud)
  for (let i = 0; i < 6; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.22, 0.28), woodMat);
    beam.position.set(0, H - 0.05, Z_MIN + 1 + i * (D - 2) / 5);
    houseRoot.add(beam);
  }

  // Plinthes lumineuses le long des cloisons intérieures (repères dans la pénombre)
  const addSkirt = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(x2 - x1, z2 - z1);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), skirtMat);
    strip.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2);
    strip.rotation.y = angle - Math.PI / 2;
    houseRoot.add(strip);
  };
  addSkirt(X_MIN + 0.3, -3, -5.6, -3);
  addSkirt(-4, -3, 4, -3);
  addSkirt(5.6, -3, X_MAX - 0.3, -3);
  addSkirt(0, -3, 0, Z_MIN + 0.3);
  addSkirt(6.5, Z_MAX - 0.5, 6.5, 5.6);
  addSkirt(6.5, 4, 6.5, -3);
  addSkirt(-6.5, Z_MAX - 0.5, -6.5, 5.6);
  addSkirt(-6.5, 4, -6.5, -3);
  addSkirt(-12.6, Z_MAX - 0.5, 12.6, Z_MAX - 0.5);
  addSkirt(X_MIN + 0.3, Z_MAX - 0.5, X_MIN + 0.3, Z_MIN + 0.5);
  addSkirt(X_MAX - 0.3, Z_MAX - 0.5, X_MAX - 0.3, Z_MIN + 0.5);

  // ============ SERRE / JARDIN (derrière la maison, z de -11 à -17) ============
  // Structure vitrée réelle : murs bas + panneaux vitrés + toit à deux pentes vitré
  {
    const GH_X = 5;        // demi-largeur
    const GH_Z1 = -11;     // accolle à la maison
    const GH_Z2 = -17;     // fond de la serre
    const GH_H = 3.0;      // hauteur des murs vitrés
    const GH_RIDGE = 1.6;  // hauteur du faîte du toit vitré
    const glassMat = windowGlassMat.clone();
    glassMat.emissiveIntensity = 0.5;
    windowMaterials.push(glassMat);
    const frameMatG = new THREE.MeshStandardMaterial({
      color: 0xe8e2d6,
      roughness: 0.6,
      metalness: 0.05,
    });

    // Soubassement bas (0.35) sur tout le périmètre, sauf côté maison
    const ghBase = (x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const isX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
      const geo = new THREE.BoxGeometry(isX ? len : 0.12, 0.35, isX ? 0.12 : len);
      const m = new THREE.Mesh(geo, frameMatG);
      m.position.set((x1 + x2) / 2, 0.175, (z1 + z2) / 2);
      root.add(m);
    };
    ghBase(-GH_X, GH_Z2, GH_X, GH_Z2);
    ghBase(-GH_X, GH_Z2, -GH_X, GH_Z1);
    ghBase(GH_X, GH_Z2, GH_X, GH_Z1);

    // Panneaux vitrés : gauche, droite, fond (entier, la porte vient de la maison)
    const ghPane = (w: number, h: number, px: number, py: number, pz: number, ry: number) => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
      pane.position.set(px, py, pz);
      pane.rotation.y = ry;
      root.add(pane);
    };
    ghPane(GH_Z1 - GH_Z2, GH_H - 0.35, -GH_X, 0.35 + (GH_H - 0.35) / 2, (GH_Z1 + GH_Z2) / 2, Math.PI / 2);
    ghPane(GH_Z1 - GH_Z2, GH_H - 0.35, GH_X, 0.35 + (GH_H - 0.35) / 2, (GH_Z1 + GH_Z2) / 2, -Math.PI / 2);
    ghPane(GH_X * 2, GH_H - 0.35, 0, 0.35 + (GH_H - 0.35) / 2, GH_Z2, 0);

    // Montants verticaux des panneaux vitrés
    for (let i = 0; i <= 4; i++) {
      const z = GH_Z2 + (i * (GH_Z1 - GH_Z2)) / 4;
      for (const sx of [-GH_X, GH_X]) {
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.1, GH_H - 0.35, 0.1), frameMatG);
        mull.position.set(sx, 0.35 + (GH_H - 0.35) / 2, z);
        root.add(mull);
      }
    }
    for (const z of [GH_Z2, (GH_Z1 + GH_Z2) / 2, GH_Z1]) {
      for (const sx of [-GH_X / 2, 0, GH_X / 2]) {
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.1, GH_H - 0.35, 0.1), frameMatG);
        mull.position.set(sx, 0.35 + (GH_H - 0.35) / 2, z);
        root.add(mull);
      }
    }

    // Toit vitré à deux pentes (faîte le long de X, pente vers Z)
    const ghRun = GH_X;
    const ghSlopeLen = Math.hypot(ghRun, GH_RIDGE);
    const ghAngle = Math.atan2(GH_RIDGE, ghRun);
    for (const side of [1, -1]) {
      const slope = new THREE.Mesh(new THREE.BoxGeometry(ghSlopeLen, 0.08, (GH_Z1 - GH_Z2) + 0.6), glassMat);
      slope.rotation.z = side * ghAngle;
      slope.position.set(side * (ghRun / 2), GH_H + GH_RIDGE / 2 - 0.1, (GH_Z1 + GH_Z2) / 2);
      root.add(slope);
    }
    // Pignons vitrés (avant/arrière du toit de serre)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-GH_X, 0);
    gableShape.lineTo(GH_X, 0);
    gableShape.lineTo(0, GH_RIDGE);
    gableShape.lineTo(-GH_X, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.02, bevelEnabled: false });
    for (const gz of [GH_Z2 - 0.29, GH_Z1 + 0.29]) {
      const gable = new THREE.Mesh(gableGeo, glassMat);
      gable.rotation.x = gz > 0 ? 0 : 0;
      gable.position.set(0, GH_H - 0.1, gz);
      root.add(gable);
    }

    // Sol de la serre : terre de jardin + allée centrale en dalles
    const ghFloor = new THREE.Mesh(new THREE.BoxGeometry(GH_X * 2, 0.1, GH_Z1 - GH_Z2), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1.0 }));
    ghFloor.position.set(0, -0.05, (GH_Z1 + GH_Z2) / 2);
    root.add(ghFloor);
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: 0x9c948a, roughness: 0.9 }));
      step.position.set(0, 0.03, GH_Z1 - 1.1 - i * 1.3);
      root.add(step);
    }
    const ghPath = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, GH_Z1 - GH_Z2 - 0.6), skirtMat);
    ghPath.position.set(0, 0.02, (GH_Z1 + GH_Z2) / 2 - 0.2);
    root.add(ghPath);

    // Montants blancs de l'entrée de la serre (côté maison)
    for (const sx of [-2.2, 2.2]) {
      const archSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, GH_H - 0.35, 0.14), frameMatG);
      archSide.position.set(sx, (GH_H - 0.35) / 2 + 0.35, GH_Z1);
      root.add(archSide);
    }
  }

  // ============ PLAQUE DE MAISON (gravée, discrète, au-dessus de la porte) ============
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 96;
  const sctx = signCanvas.getContext("2d");
  if (sctx) {
    sctx.fillStyle = "#3a2e24";
    sctx.fillRect(0, 0, 512, 96);
    sctx.font = "500 40px Georgia, serif";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillStyle = "#e8d9b8";
    sctx.fillText("Maison d'Origin", 256, 50);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.8,
    metalness: 0.0,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), signMat);
  sign.position.set(0, 3.15, Z_MAX + 0.22);
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
    update(t: number, cameraPos: THREE.Vector3) {
      // Respiration des matériaux lumineux
      for (const b of layout.breathers) {
        if ("opacity" in b.mat && b.mat.opacity !== undefined) {
          b.mat.opacity = b.base + b.amp * (0.5 + 0.5 * Math.sin(t * b.speed + b.phase));
        }
      }
      for (const wm of layout.windowMaterials) {
        wm.emissiveIntensity = 0.85 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.8));
      }

      // Porte : ouverture pivot sur charnière gauche
      const targetAngle = doorOpen.current ? -1.7 : 0;
      layout.doorPivot.rotation.y += (targetAngle - layout.doorPivot.rotation.y) * 0.07;

      // Lampe de porche
      const porch = layout.root.userData.porchLight as THREE.PointLight | undefined;
      if (porch) porch.intensity = 0.85 + 0.3 * Math.sin(t * 0.9);
    },
  };
}

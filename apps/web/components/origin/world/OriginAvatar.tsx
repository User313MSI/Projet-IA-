"use client";

import * as THREE from "three";

export interface OriginAvatar {
  root: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  halo2Mat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  core: THREE.Mesh;
  inner: THREE.Mesh;
  halo: THREE.Mesh;
  halo2: THREE.Mesh;
  rings: THREE.Mesh[];
  light: THREE.PointLight;
  sparks: THREE.Points;
  sparkMat: THREE.PointsMaterial;
  pulse: { current: number };
  position: THREE.Vector3;
  target: THREE.Vector3;
  currentRoom: { current: string };
  speakUntil: { current: number };
  viaDoor: THREE.Vector3 | null;
}

const WAYPOINTS = [
  { room: "salon", pos: new THREE.Vector3(0, 1.75, 2) },
  { room: "salon", pos: new THREE.Vector3(-3, 1.75, 5) },
  { room: "brain", pos: new THREE.Vector3(-9.8, 1.75, 4.5) },
  { room: "interview", pos: new THREE.Vector3(9.8, 2.0, 4.5) },
  { room: "library", pos: new THREE.Vector3(-6.5, 1.75, -5.5) },
  { room: "chambre", pos: new THREE.Vector3(6.5, 1.75, -5.5) },
  { room: "jardin", pos: new THREE.Vector3(0, 1.9, -13) },
];

// Segments de cloisons à éviter (même plan que la navigation caméra)
const AVATAR_WALLS: { x1: number; z1: number; x2: number; z2: number }[] = [
  { x1: -13.4, z1: -3.3, x2: -5.6, z2: -2.7 },
  { x1: -4, z1: -3.3, x2: 4, z2: -2.7 },
  { x1: 5.6, z1: -3.3, x2: 13.4, z2: -2.7 },
  { x1: 6.2, z1: -3, x2: 6.8, z2: 4 },
  { x1: 6.2, z1: 5.6, x2: 6.8, z2: 9 },
  { x1: -6.8, z1: -3, x2: -6.2, z2: 4 },
  { x1: -6.8, z1: 5.6, x2: -6.2, z2: 9 },
  { x1: -0.25, z1: -11, x2: 0.25, z2: -3 },
];
// Nœuds-portes : salon ↔ pièces arrière (x=±4.8), salon ↔ pièces avant,
// maison ↔ serre (porte vitrée)
const DOOR_NODES = [
  new THREE.Vector3(-4.8, 1.75, -3),
  new THREE.Vector3(4.8, 1.75, -3),
  new THREE.Vector3(-6.5, 1.75, 4.8),
  new THREE.Vector3(6.5, 1.75, 4.8),
  new THREE.Vector3(0, 1.75, -10.4),
];

export function createOriginAvatar(scene: THREE.Scene): OriginAvatar {
  const root = new THREE.Group();

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xbdfcff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), coreMat);
  root.add(core);

  // Noyau intérieur brillant
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), innerMat);
  root.add(inner);

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 24), haloMat);
  root.add(halo);

  // Second halo externe, plus large et plus faible
  const halo2Mat = new THREE.MeshBasicMaterial({
    color: 0x7c4dff,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const halo2 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 20), halo2Mat);
  root.add(halo2);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7c4dff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.13, 0.018, 8, 48), ringMat);
    ring.rotation.x = i === 0 ? Math.PI / 2 : 0.5 + i * 0.5;
    root.add(ring);
    rings.push(ring);
  }

  const light = new THREE.PointLight(0x00e5ff, 1.2, 7, 2);
  root.add(light);

  // Particules orbitales autour de l'orbe (poussière d'énergie)
  const sparkCount = 14;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    const a = (i / sparkCount) * Math.PI * 2;
    sparkPos[i * 3] = Math.cos(a) * 0.55;
    sparkPos[i * 3 + 1] = Math.sin(a * 2) * 0.18;
    sparkPos[i * 3 + 2] = Math.sin(a) * 0.55;
  }
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    color: 0x9fe8ff,
    size: 0.08,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  root.add(sparks);

  const start = WAYPOINTS[0]?.pos ?? new THREE.Vector3(4.5, 1.75, -12.2);
  root.position.copy(start);
  scene.add(root);

  return {
    root,
    coreMat,
    haloMat,
    halo2Mat,
    ringMat,
    core,
    inner,
    halo,
    halo2,
    rings,
    light,
    sparks,
    sparkMat,
    pulse: { current: 0 },
    position: root.position.clone(),
    target: start.clone(),
    currentRoom: { current: "salon" },
    speakUntil: { current: 0 },
    viaDoor: null,
  };
}

export interface AvatarWorld {
  roomCenters: Record<string, THREE.Vector3>;
  gardenCenter: THREE.Vector3;
}

export function createAvatarAnimation(
  avatar: OriginAvatar,
  world: AvatarWorld,
  cameraPosRef: { current: THREE.Vector3 }
): { update: (t: number, dt: number) => void } {
  let wanderTimer = 4;
  let wanderIndex = 0;
  const speed = 1.35;

  return {
    update(t: number, dt: number) {
      // Pulsion de base (respiration) + pics quand Origin parle
      const base = 0.5 + 0.5 * Math.sin(t * 2.2);
      const speaking = performance.now() < avatar.speakUntil.current;
      const pulse = speaking ? 0.5 + 0.5 * Math.sin(t * 14) : base;
      avatar.pulse.current = pulse;

      const coreScale = 1 + pulse * (speaking ? 0.5 : 0.14);
      avatar.core.scale.setScalar(coreScale);
      avatar.inner.scale.setScalar(0.8 + pulse * 0.5);
      avatar.halo.scale.setScalar(1 + pulse * 0.3);
      avatar.halo2.scale.setScalar(1.1 + pulse * 0.25);
      avatar.haloMat.opacity = 0.16 + pulse * 0.14;
      avatar.halo2Mat.opacity = 0.08 + pulse * 0.08;
      avatar.coreMat.opacity = 0.85 + pulse * 0.15;
      avatar.light.intensity = 0.9 + pulse * 0.9 + (speaking ? 0.8 : 0);
      avatar.sparks.rotation.y = t * 0.8;
      avatar.sparks.rotation.x = Math.sin(t * 0.5) * 0.2;
      avatar.sparkMat.opacity = 0.5 + pulse * 0.4;

      const roomKey = avatar.currentRoom.current;
      const roomTint = roomKey === "library" || roomKey === "jardin" ? 0x00ff9d : roomKey === "chambre" || roomKey === "interview" ? 0xff9ecd : 0x00e5ff;
      avatar.haloMat.color.lerp(new THREE.Color(roomTint), 0.04);
      avatar.light.color.lerp(new THREE.Color(roomTint), 0.04);

      avatar.rings[0]!.rotation.z = t * 0.9;
      avatar.rings[1]!.rotation.y = t * -0.7;
      avatar.rings[2]!.rotation.x = t * 0.5;

      // Errance de pièce en pièce, en contournant les cloisons par les portes
      const pos = avatar.root.position;
      const toTarget = avatar.target.clone().sub(pos);
      const dist = toTarget.length();
      if (dist > 0.08) {
        // Si la ligne directe coupe un mur, passer par le nœud-porte le plus proche
        let dirTarget = toTarget.clone().normalize();
        const posFlat = new THREE.Vector3(pos.x, 0, pos.z);
        const tgtFlat = new THREE.Vector3(avatar.target.x, 0, avatar.target.z);
        if (!avatar.viaDoor) {
          for (const wSeg of AVATAR_WALLS) {
            if (segmentHitsRect(posFlat, tgtFlat, wSeg)) {
              const mid = posFlat.clone().lerp(tgtFlat, 0.5);
              let bestNode: THREE.Vector3 | null = null;
              let bestD = Infinity;
              for (const node of DOOR_NODES) {
                const d = mid.distanceToSquared(new THREE.Vector3(node.x, 0, node.z));
                if (d < bestD) {
                  bestD = d;
                  bestNode = node;
                }
              }
              if (bestNode) avatar.viaDoor = bestNode.clone();
              break;
            }
          }
        }
        if (avatar.viaDoor) {
          const toDoor = avatar.viaDoor.clone().sub(pos);
          if (toDoor.length() < 0.35) {
            avatar.viaDoor = null;
          } else {
            dirTarget = toDoor.normalize();
          }
        }
        const step = Math.min(speed * dt, dist);
        pos.addScaledVector(dirTarget, step);
        avatar.currentRoom.current = nearestRoom(pos, world.roomCenters);
      } else {
        wanderTimer -= dt;
        if (wanderTimer <= 0) {
          wanderTimer = 6 + Math.random() * 7;
          wanderIndex = (wanderIndex + 1 + Math.floor(Math.random() * 2)) % WAYPOINTS.length;
          const wp = WAYPOINTS[wanderIndex];
          if (wp) {
            avatar.target.copy(wp.pos);
            avatar.viaDoor = null;
          }
        }
      }

      // Flottement organique
      pos.y = avatar.target.y + Math.sin(t * 1.6) * 0.22;
      avatar.position.copy(pos);

      // Origin "suit du regard" : les anneaux s'orientent vers la caméra
      const look = new THREE.Vector3().subVectors(cameraPosRef.current, pos);
      if (look.lengthSq() > 0.001) {
        look.normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), look);
        avatar.rings[1]!.quaternion.slerp(q, 0.08);
      }
    },
  };
}

function nearestRoom(pos: THREE.Vector3, centers: Record<string, THREE.Vector3>): string {
  let best = "salon";
  let bestDist = Infinity;
  for (const [key, center] of Object.entries(centers)) {
    const d = pos.distanceToSquared(center);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

function segmentHitsRect(
  a: THREE.Vector3,
  b: THREE.Vector3,
  rect: { x1: number; z1: number; x2: number; z2: number }
): boolean {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minZ = Math.min(rect.z1, rect.z2);
  const maxZ = Math.max(rect.z1, rect.z2);
  const inside = (p: THREE.Vector3) => p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ;
  if (inside(a) || inside(b)) return true;
  const segIntersect = (
    p1x: number, p1z: number, p2x: number, p2z: number,
    q1x: number, q1z: number, q2x: number, q2z: number
  ): boolean => {
    const d1 = (p2x - p1x) * (q1z - p1z) - (p2z - p1z) * (q1x - p1x);
    const d2 = (p2x - p1x) * (q2z - p1z) - (p2z - p1z) * (q2x - p1x);
    const d3 = (q2x - q1x) * (p1z - q1z) - (q2z - q1z) * (p1x - q1x);
    const d4 = (q2x - q1x) * (p2z - q1z) - (q2z - q1z) * (p2x - q1x);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  return (
    segIntersect(a.x, a.z, b.x, b.z, minX, minZ, maxX, minZ) ||
    segIntersect(a.x, a.z, b.x, b.z, minX, maxZ, maxX, maxZ) ||
    segIntersect(a.x, a.z, b.x, b.z, minX, minZ, minX, maxZ) ||
    segIntersect(a.x, a.z, b.x, b.z, maxX, minZ, maxX, maxZ)
  );
}

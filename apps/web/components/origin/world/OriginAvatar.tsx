"use client";

import * as THREE from "three";

export interface OriginAvatar {
  root: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  core: THREE.Mesh;
  halo: THREE.Mesh;
  rings: THREE.Mesh[];
  light: THREE.PointLight;
  pulse: { current: number };
  position: THREE.Vector3;
  target: THREE.Vector3;
  currentRoom: { current: string };
  speakUntil: { current: number };
}

const WAYPOINTS = [
  { room: "salon", pos: new THREE.Vector3(4.5, 1.75, -12.2) },
  { room: "library", pos: new THREE.Vector3(-4.5, 1.75, -12.2) },
  { room: "brain", pos: new THREE.Vector3(-13.5, 1.75, -6) },
  { room: "jardin", pos: new THREE.Vector3(4.5, 1.9, -21.5) },
  { room: "interview", pos: new THREE.Vector3(13.5, 2.2, -7.5) },
  { room: "chambre", pos: new THREE.Vector3(-4.5, 1.75, -19.5) },
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

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7c4dff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.15, 0.02, 8, 40), ringMat);
    ring.rotation.x = i === 0 ? Math.PI / 2 : 0.6;
    root.add(ring);
    rings.push(ring);
  }

  const light = new THREE.PointLight(0x00e5ff, 1.2, 7, 2);
  root.add(light);

  const start = WAYPOINTS[0]?.pos ?? new THREE.Vector3(4.5, 1.75, -12.2);
  root.position.copy(start);
  scene.add(root);

  return {
    root,
    coreMat,
    haloMat,
    ringMat,
    core,
    halo,
    rings,
    light,
    pulse: { current: 0 },
    position: root.position.clone(),
    target: start.clone(),
    currentRoom: { current: "salon" },
    speakUntil: { current: 0 },
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
      avatar.halo.scale.setScalar(1 + pulse * 0.3);
      avatar.haloMat.opacity = 0.16 + pulse * 0.14;
      avatar.coreMat.opacity = 0.85 + pulse * 0.15;
      avatar.light.intensity = 0.9 + pulse * 0.9 + (speaking ? 0.8 : 0);

      const roomKey = avatar.currentRoom.current;
      const roomTint = roomKey === "library" || roomKey === "jardin" ? 0x00ff9d : roomKey === "chambre" || roomKey === "interview" ? 0xff9ecd : 0x00e5ff;
      avatar.haloMat.color.lerp(new THREE.Color(roomTint), 0.04);
      avatar.light.color.lerp(new THREE.Color(roomTint), 0.04);

      avatar.rings[0]!.rotation.z = t * 0.9;
      avatar.rings[1]!.rotation.y = t * -0.7;

      // Errance de pièce en pièce
      const pos = avatar.root.position;
      const toTarget = avatar.target.clone().sub(pos);
      const dist = toTarget.length();
      if (dist > 0.08) {
        const dir = toTarget.normalize();
        const step = Math.min(speed * dt, dist);
        pos.addScaledVector(dir, step);
        avatar.currentRoom.current = nearestRoom(pos, world.roomCenters);
      } else {
        wanderTimer -= dt;
        if (wanderTimer <= 0) {
          wanderTimer = 6 + Math.random() * 7;
          wanderIndex = (wanderIndex + 1 + Math.floor(Math.random() * 2)) % WAYPOINTS.length;
          const wp = WAYPOINTS[wanderIndex];
          if (wp) {
            avatar.target.copy(wp.pos);
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

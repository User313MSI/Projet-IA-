"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Personality, InterviewQuestion } from "@ia-app/personality-core/client";
import { pendingQuestions } from "@ia-app/personality-core/client";
import type { Document, KnowledgeStats } from "@ia-app/knowledge-core/client";
import { buildMaison, createHouseAnimation } from "./Maison";
import { buildRooms, type RoomsLayout } from "./Rooms";
import { createOriginAvatar, createAvatarAnimation } from "./OriginAvatar";
import { CATEGORY_INFO, DOC_TYPE_INFO, traitInfo, ROOM_POS } from "./palette";

export interface WorldData {
  personality: Personality | null;
  questions: InterviewQuestion[];
  documents: Document[];
  stats: KnowledgeStats | null;
  knowledgeChunks: number;
  sessions: number;
  growth: number;
}

export interface SelectionState {
  room: string;
  title: string;
  body: string;
}

const VIEW_EXTERIOR: { pos: [number, number, number]; look: [number, number, number] } = {
  pos: [0, 4.2, 24],
  look: [0, 2.8, 0],
};
const VIEW_INTERIOR: { pos: [number, number, number]; look: [number, number, number] } = {
  pos: [0, 2.6, 5],
  look: [0, 2.2, -8],
};

interface RoomView {
  camPos: [number, number, number];
  lookAt: [number, number, number];
}

const ROOM_VIEWS: Record<string, RoomView> = {
  salon: { camPos: [0, 2.2, 7], lookAt: [0, 1.6, 1] },
  brain: { camPos: [-6.2, 2.2, 6], lookAt: [-9.8, 1.8, 3] },
  interview: { camPos: [6.2, 2.2, 6], lookAt: [9.8, 1.4, 3] },
  library: { camPos: [-3.2, 2.2, -4.6], lookAt: [-6.5, 1.8, -7] },
  chambre: { camPos: [3.2, 2.2, -4.6], lookAt: [6.5, 1.6, -7] },
  jardin: { camPos: [0, 2.3, -12.2], lookAt: [0, 1.0, -14.5] },
};

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export default function OriginWorld({ data, onSelection }: { data: WorldData; onSelection?: (s: SelectionState | null) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string>("Clique sur la porte pour entrer chez Origin");
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const insideRef = useRef(false);
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let animationId = 0;
    let disposed = false;
    const disposables: Array<{ dispose: () => void }> = [];

    try {
      const width = mount.clientWidth;
      const height = mount.clientHeight || 600;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05060f, 0.011);
      const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 400);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.cursor = "pointer";
      renderer.domElement.style.display = "block";

      // ---------- Lumières ----------
      scene.add(new THREE.AmbientLight(0x503a8f, 0.55));
      const hemi = new THREE.HemisphereLight(0x2a2470, 0x0a0518, 0.5);
      scene.add(hemi);
      const moon = new THREE.DirectionalLight(0x9fd8ff, 0.85);
      moon.position.set(14, 26, 18);
      scene.add(moon);
      const moon2 = new THREE.DirectionalLight(0x7c4dff, 0.35);
      moon2.position.set(-18, 14, -24);
      scene.add(moon2);
      const interior = new THREE.PointLight(0x7c4dff, 1.0, 42, 1.6);
      interior.position.set(0, 5.2, -1);
      scene.add(interior);
      const warmCorner = new THREE.PointLight(0xff6b9d, 0.6, 16, 2);
      warmCorner.position.set(6.5, 3.2, -7);
      scene.add(warmCorner);
      const gardenLight = new THREE.PointLight(0x00ff9d, 0.7, 14, 2);
      gardenLight.position.set(0, 3.0, -14);
      scene.add(gardenLight);
      const brainLight = new THREE.PointLight(0x7c4dff, 0.8, 12, 2);
      brainLight.position.set(-9.8, 3.4, 3);
      scene.add(brainLight);

      // ---------- Ciel étoilé ----------
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1600;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(150 + Math.random() * 60);
        v.y = Math.abs(v.y) + 8;
        starPos[i * 3] = v.x; starPos[i * 3 + 1] = v.y; starPos[i * 3 + 2] = v.z;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false });
      scene.add(new THREE.Points(starGeo, starMat));
      disposables.push(starGeo, starMat);

      // Grandes étoiles colorées qui scintillent
      const bigStarCount = 90;
      const bigStarGeo = new THREE.BufferGeometry();
      const bigStarPos = new Float32Array(bigStarCount * 3);
      const bigStarPhase = new Float32Array(bigStarCount);
      for (let i = 0; i < bigStarCount; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(140 + Math.random() * 60);
        v.y = Math.abs(v.y) + 12;
        bigStarPos[i * 3] = v.x; bigStarPos[i * 3 + 1] = v.y; bigStarPos[i * 3 + 2] = v.z;
        bigStarPhase[i] = Math.random() * Math.PI * 2;
      }
      bigStarGeo.setAttribute("position", new THREE.BufferAttribute(bigStarPos, 3));
      const bigStarMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Points(bigStarGeo, bigStarMat));
      disposables.push(bigStarGeo, bigStarMat);

      // Nébuleuse lointaine (billboard dégradé procédural)
      const nebCanvas = document.createElement("canvas");
      nebCanvas.width = 256; nebCanvas.height = 256;
      const nctx = nebCanvas.getContext("2d");
      if (nctx) {
        const grad = nctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        grad.addColorStop(0, "rgba(124,77,255,0.55)");
        grad.addColorStop(0.5, "rgba(0,229,255,0.16)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        nctx.fillStyle = grad;
        nctx.fillRect(0, 0, 256, 256);
      }
      const nebTex = new THREE.CanvasTexture(nebCanvas);
      const nebMat = new THREE.MeshBasicMaterial({ map: nebTex, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const nebula = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), nebMat);
      nebula.position.set(-70, 55, -160);
      nebula.lookAt(0, 4, 0);
      scene.add(nebula);
      const nebula2 = nebula.clone();
      nebula2.position.set(85, 40, -150);
      scene.add(nebula2);
      disposables.push(nebTex, nebMat);

      // ---------- Particules flottantes ----------
      const partCount = 260;
      const partGeo = new THREE.BufferGeometry();
      const partPos = new Float32Array(partCount * 3);
      const partSpeed = new Float32Array(partCount);
      for (let i = 0; i < partCount; i++) {
        partPos[i * 3] = (Math.random() - 0.5) * 52;
        partPos[i * 3 + 1] = Math.random() * 16;
        partPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
        partSpeed[i] = 0.1 + Math.random() * 0.3;
      }
      partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
      const partMat = new THREE.PointsMaterial({ color: 0x8fe8ff, size: 0.14, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(partGeo, partMat));
      disposables.push(partGeo, partMat);

      // Lucioles proches de la maison (dérive lente, scintillement)
      const fireflyCount = 60;
      const ffGeo = new THREE.BufferGeometry();
      const ffPos = new Float32Array(fireflyCount * 3);
      const ffSeed = new Float32Array(fireflyCount * 3);
      for (let i = 0; i < fireflyCount; i++) {
        ffPos[i * 3] = (Math.random() - 0.5) * 40;
        ffPos[i * 3 + 1] = 0.5 + Math.random() * 5;
        ffPos[i * 3 + 2] = (Math.random() - 0.5) * 44 - 4;
        ffSeed[i * 3] = Math.random() * Math.PI * 2;
        ffSeed[i * 3 + 1] = 0.2 + Math.random() * 0.5;
        ffSeed[i * 3 + 2] = 0.3 + Math.random() * 0.7;
      }
      ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos, 3));
      const ffMat = new THREE.PointsMaterial({
        color: 0x00ff9d,
        size: 0.22,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Points(ffGeo, ffMat));
      disposables.push(ffGeo, ffMat);

      // ---------- Maison + pièces ----------
      const doorOpenRef = { current: false };
      const layout = buildMaison();
      scene.add(layout.root);
      const houseAnim = createHouseAnimation(layout, doorOpenRef);
      const rooms = buildRooms();
      scene.add(rooms.root);
      applyLibraryData(rooms, dataRef.current.documents);
      applyInterviewData(rooms, dataRef.current.questions);
      applyGardenData(rooms, dataRef.current.growth);
      applyChambreData(rooms, dataRef.current.personality);
      applyBrainData(rooms, dataRef.current.questions);

      // ---------- Avatar d'Origin ----------
      const avatar = createOriginAvatar(scene);
      const avatarWorld = {
        roomCenters: Object.fromEntries(Object.entries(ROOM_POS).map(([k, p]) => [k, new THREE.Vector3(p.x, 1.8, p.z)])),
        gardenCenter: new THREE.Vector3(0, 1.4, -14),
      };
      const cameraPosRef = { current: new THREE.Vector3(...VIEW_EXTERIOR.pos) };
      const avatarAnim = createAvatarAnimation(avatar, avatarWorld, cameraPosRef);

      // ---------- Contrôles caméra ----------
      const view = {
        pos: new THREE.Vector3(...VIEW_EXTERIOR.pos),
        look: new THREE.Vector3(...VIEW_EXTERIOR.look),
      };
      let yaw = Math.PI;
      let pitch = -0.05;
      const keyState: Record<string, boolean> = {};
      const moveSpeed = 6;

      const onKeyDown = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        keyState[k] = true;
        if (["w", "a", "s", "d", "q", "z", " "].includes(k)) e.preventDefault();
      };
      const onKeyUp = (e: KeyboardEvent) => { keyState[e.key.toLowerCase()] = false; };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      let dragging = false;
      let lastX = 0; let lastY = 0;
      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        dragging = true;
        pointerMoved = false;
        lastX = e.clientX; lastY = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 4) pointerMoved = true;
        yaw -= (e.clientX - lastX) * 0.0042;
        pitch -= (e.clientY - lastY) * 0.0042;
        pitch = Math.max(-1.2, Math.min(0.9, pitch));
        lastX = e.clientX; lastY = e.clientY;
      };
      const onPointerUp = () => { dragging = false; };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      // ---------- Sélection / raycast ----------
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerMoved = false;

      function setSelection(sel: SelectionState | null) {
        onSelection?.(sel);
      }

      function pickRoomObject(obj: THREE.Object3D | null): string | null {
        let cur: THREE.Object3D | null = obj;
        while (cur) {
          if (cur.userData.pick) return (cur.userData.pick as { room: string }).room;
          cur = cur.parent;
        }
        return null;
      }

      const onCanvasClick = (e: MouseEvent) => {
        if (pointerMoved) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects([layout.door!, ...rooms.pickables], true);
        if (hits.length > 0) {
          const first = hits[0]!.object;
          if (first === layout.door) {
            doorOpenRef.current = !doorOpenRef.current;
            if (doorOpenRef.current && !insideRef.current) {
              enterHouse();
            }
            return;
          }
          const room = pickRoomObject(first);
          if (room && insideRef.current) {
            focusRoom(room);
          } else if (room && !insideRef.current) {
            enterHouse();
            setTimeout(() => focusRoom(room), 1100);
          }
        }
      };
      renderer.domElement.addEventListener("click", onCanvasClick);

      function enterHouse() {
        insideRef.current = true;
        doorOpenRef.current = true;
        view.pos.set(...VIEW_INTERIOR.pos);
        view.look.set(...VIEW_INTERIOR.look);
        yaw = Math.PI;
        pitch = -0.02;
        setHint("Explore : WASD/ZQSD pour marcher, clic sur un lieu pour l'approcher");
        setSelection(null);
      }

      function focusRoom(room: string) {
        const rv = ROOM_VIEWS[room];
        if (!rv) return;
        activeRoomRef.current = room;
        view.pos.set(...rv.camPos);
        view.look.set(...rv.lookAt);
        yaw = Math.atan2(rv.lookAt[0] - rv.camPos[0], rv.lookAt[2] - rv.camPos[2]) + Math.PI;
        pitch = -0.08;
        setHint(roomHint(room));
        setSelection(roomSelection(room, dataRef.current));
        avatar.target.set(ROOM_POS[room]?.x ?? 0, avatar.target.y, ROOM_POS[room]?.z ?? 0);
      }

      function roomHint(room: string): string {
        switch (room) {
          case "brain": return "Le cerveau d'Origin pulse de son activité";
          case "library": return "Chaque livre est un document indexé";
          case "interview": return "Les questions en attente flottent au-dessus du siège";
          case "salon": return "Le salon : discute avec Origin";
          case "chambre": return "La chambre : la personnalité d'Origin";
          case "jardin": return "Le jardin pousse avec les connaissances d'Origin";
          default: return "";
        }
      }

      function roomSelection(room: string, d: WorldData): SelectionState {
        switch (room) {
          case "brain": {
            const pending = pendingQuestions(d.questions);
            const answered = d.questions.length - pending.length;
            return {
              room,
              title: "Salle du Cerveau",
              body: `Activité : ${answered}/${d.questions.length} questions répondues · ${d.knowledgeChunks} passages connus`,
            };
          }
          case "library": {
            const lines = d.documents.slice(0, 8).map((doc) => `· ${doc.title} (${doc.type})`).join("\n");
            return { room, title: "Bibliothèque", body: lines || "Aucun document indexé pour l'instant" };
          }
          case "interview": {
            const pending = pendingQuestions(d.questions).slice(0, 3);
            const qtext = pending.map((q) => `· ${shorten(q.question, 90)}`).join("\n");
            return { room, title: "Salle d'Interview", body: qtext || "Aucune question en attente. Origin est à jour !" };
          }
          case "salon":
            return { room, title: "Salon", body: "Assieds-toi face à l'écran holographique : c'est ici qu'Origin discute." };
          case "chambre": {
            const traits = (d.personality?.traits ?? []).slice(0, 5).map((t) => `${t.label} ${Math.round(t.value * 100)}%`).join(" · ");
            return { room, title: "Chambre", body: traits || "Personnalité en construction" };
          }
          case "jardin":
            return { room, title: "Jardin", body: `Croissance : ${d.documents.length} documents · ${d.sessions} sessions d'interview` };
          default:
            return { room, title: "", body: "" };
        }
      }

      // ---------- Post-processing : bloom néon ----------
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.55, // strength
        0.6,  // radius
        0.62  // threshold
      );
      composer.addPass(bloom);
      composer.setSize(width, height);

      // ---------- Boucle ----------
      const clock = new THREE.Clock();
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      const animate = () => {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        // Déplacement libre (relatif au regard)
        const dir = new THREE.Vector3();
        forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(-Math.sin(yaw - Math.PI / 2), 0, -Math.cos(yaw - Math.PI / 2));
        if (keyState["w"] || keyState["z"] || keyState["arrowup"]) dir.add(forward);
        if (keyState["s"] || keyState["arrowdown"]) dir.sub(forward);
        if (keyState["a"] || keyState["q"] || keyState["arrowleft"]) dir.add(right);
        if (keyState["d"] || keyState["arrowright"]) dir.sub(right);
        if (dir.lengthSq() > 0) {
          activeRoomRef.current = null;
          dir.normalize().multiplyScalar(moveSpeed * dt);
          view.pos.add(dir);
        }

        // Limites du terrain : plateforme rectangulaire 33 x 34 centrée sur la maison
        view.pos.x = Math.max(-16.5, Math.min(16.5, view.pos.x));
        view.pos.z = Math.max(-18, Math.min(15.5, view.pos.z));
        if (view.pos.y < 1.2) view.pos.y = 1.2;
        if (view.pos.y > 14) view.pos.y = 14;

        // Murs de la maison : collision simple par segments bloquants
        // Chaque segment = rectangle (x1..x2, z1..z2) ; la caméra est repoussée si elle y entre
        const walls: { x1: number; z1: number; x2: number; z2: number }[] = insideRef.current
          ? [
              // cloison transversale Z=-3, 2 portes (x=-4.8 et 4.8, largeur 1.6)
              { x1: -13.4, z1: -3.35, x2: -5.6, z2: -2.65 },
              { x1: -4, z1: -3.35, x2: 4, z2: -2.65 },
              { x1: 5.6, z1: -3.35, x2: 13.4, z2: -2.65 },
              // cloisons longitudinales avant X=±6.5, porte près de la façade (Z 4→5.6)
              { x1: 6.15, z1: -3, x2: 6.85, z2: 4 },
              { x1: 6.15, z1: 5.6, x2: 6.85, z2: 9 },
              { x1: -6.85, z1: -3, x2: -6.15, z2: 4 },
              { x1: -6.85, z1: 5.6, x2: -6.15, z2: 9 },
              // cloison centrale arrière X=0, pleine
              { x1: -0.2, z1: -11, x2: 0.2, z2: -3 },
              // mur arrière avec porte vitrée vers la serre (x∈[-2,2])
              { x1: -13.4, z1: -11.4, x2: -2, z2: -10.65 },
              { x1: 2, z1: -11.4, x2: 13.4, z2: -10.65 },
            ]
          : [
              // dehors : murs extérieurs solides (sauf porte d'entrée et porte vitrée de la serre)
              { x1: -13.4, z1: 9.05, x2: -0.85, z2: 9.4 },
              { x1: 0.85, z1: 9.05, x2: 13.4, z2: 9.4 },
              { x1: -13.4, z1: -11.4, x2: -12.8, z2: 9.4 },
              { x1: 12.8, z1: -11.4, x2: 13.4, z2: 9.4 },
              { x1: -13.4, z1: -11.4, x2: -2, z2: -10.6 },
              { x1: 2, z1: -11.4, x2: 13.4, z2: -10.6 },
              // serre : murs vitrés
              { x1: -5.2, z1: -17.4, x2: -4.8, z2: -10.6 },
              { x1: 4.8, z1: -17.4, x2: 5.2, z2: -10.6 },
              { x1: -5.2, z1: -17.4, x2: 5.2, z2: -16.9 },
            ];
        for (const wSeg of walls) {
          if (
            view.pos.x > wSeg.x1 - 0.25 && view.pos.x < wSeg.x2 + 0.25 &&
            view.pos.z > wSeg.z1 - 0.25 && view.pos.z < wSeg.z2 + 0.25
          ) {
            // repousser hors du segment par l'axe le plus proche
            const dxMin = Math.min(
              Math.abs(view.pos.x - (wSeg.x1 - 0.25)),
              Math.abs(view.pos.x - (wSeg.x2 + 0.25))
            );
            const dzMin = Math.min(
              Math.abs(view.pos.z - (wSeg.z1 - 0.25)),
              Math.abs(view.pos.z - (wSeg.z2 + 0.25))
            );
            if (dxMin < dzMin) {
              view.pos.x = view.pos.x < (wSeg.x1 + wSeg.x2) / 2 ? wSeg.x1 - 0.26 : wSeg.x2 + 0.26;
            } else {
              view.pos.z = view.pos.z < (wSeg.z1 + wSeg.z2) / 2 ? wSeg.z1 - 0.26 : wSeg.z2 + 0.26;
            }
          }
        }

        // Une fois à l'intérieur, on reste à l'intérieur (les murs ext bloquent aussi)
        // La serre (jardin) derrière la maison est incluse dans la zone
        if (insideRef.current) {
          view.pos.x = Math.max(-12.8, Math.min(12.8, view.pos.x));
          const inGreenhouse = view.pos.z < -10.2 && Math.abs(view.pos.x) < 5;
          view.pos.z = Math.max(inGreenhouse ? -16.5 : -10.6, Math.min(8.6, view.pos.z));
          if (view.pos.z < -10.2 && Math.abs(view.pos.x) >= 5) view.pos.z = -10.2;
        }

        // Look
        const lookDir = new THREE.Vector3(
          Math.cos(pitch) * -Math.sin(yaw),
          Math.sin(pitch),
          Math.cos(pitch) * -Math.cos(yaw)
        );
        const lookPoint = view.pos.clone().add(lookDir.multiplyScalar(6));
        camera.position.lerp(view.pos, 0.16);
        cameraPosRef.current.copy(camera.position);
        camera.lookAt(lookPoint);

        // Animations
        houseAnim.update(t, camera.position);
        avatarAnim.update(t, dt);

        // Cerveau : rotation + impulsions orbitales
        if (rooms.brain) {
          rooms.brain.brainMesh.rotation.y = t * 0.25;
          rooms.brain.brainMesh.rotation.z = Math.sin(t * 0.4) * 0.1;
          rooms.brain.neurons.rotation.y = -t * 0.1;
          for (let i = 0; i < rooms.brain.pulses.length; i++) {
            const pulse = rooms.brain.pulses[i]!;
            const seed = (pulse.userData.seed as number) ?? i;
            const a = t * 0.8 + seed * 2.39;
            const radius = 1.55 + Math.sin(t * 1.7 + seed) * 0.18;
            pulse.position.set(
              rooms.brain.brainMesh.position.x + Math.cos(a) * radius,
              rooms.brain.brainMesh.position.y + Math.sin(a * 0.8) * 0.5,
              rooms.brain.brainMesh.position.z + Math.sin(a) * radius
            );
            pulse.scale.setScalar(0.6 + 0.4 * Math.abs(Math.sin(t * 3 + seed)));
          }
        }

        // Salon : l'écran holographique respire
        if (rooms.salon) {
          rooms.salon.panelMat.opacity = 0.14 + 0.1 * Math.sin(t * 1.4);
          rooms.salon.panel.rotation.z = Math.sin(t * 0.6) * 0.03;
        }

        // Chambre : miroir + orbes de traits
        if (rooms.chambre) {
          rooms.chambre.mirrorMat.opacity = 0.14 + 0.08 * Math.sin(t * 1.1);
          for (const orb of rooms.chambre.orbs) {
            const p = 0.6 + 0.4 * Math.sin(t * 1.8 + orb.phase);
            orb.mat.opacity = 0.35 + p * 0.5;
            orb.mesh.scale.setScalar(0.8 + p * 0.5);
          }
        }

        // Jardin : les plantes ondulent doucement
        if (rooms.jardin) {
          rooms.jardin.plants.forEach((plant, i) => {
            plant.group.rotation.z = Math.sin(t * 0.9 + i) * 0.06;
          });
        }

        // Disques lumineux des pièces actives
        for (const [room, mat] of Object.entries(rooms.floorGlow)) {
          if (!mat) continue;
          const active = activeRoomRef.current === room;
          const target = active ? 0.16 + 0.06 * Math.sin(t * 2) : 0.05;
          mat.opacity += (target - mat.opacity) * 0.06;
        }

        // Particules : montée lente
        const posArr = partGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < partCount; i++) {
          let y = posArr.getY(i) + partSpeed[i]! * dt;
          if (y > 16) y = 0;
          posArr.setY(i, y);
        }
        posArr.needsUpdate = true;

        // Grandes étoiles : scintillement
        bigStarMat.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.7));
        bigStarMat.size = 1.8 + 0.9 * Math.sin(t * 1.3);

        // Lucioles : dérive sinusoïdale + scintillement
        const ffArr = ffGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < fireflyCount; i++) {
          const ph = ffSeed[i * 3]!;
          const sp = ffSeed[i * 3 + 1]!;
          const amp = ffSeed[i * 3 + 2]!;
          ffArr.setXYZ(
            i,
            ffArr.getX(i) + Math.sin(t * sp + ph) * 0.35 * dt * amp * 10,
            0.9 + Math.sin(t * sp * 0.8 + ph * 2) * 0.8 * amp,
            ffArr.getZ(i) + Math.cos(t * sp * 0.9 + ph) * 0.35 * dt * amp * 10
          );
        }
        ffArr.needsUpdate = true;
        ffMat.opacity = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.9));

        composer.render();
      };
      animate();

      const onResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight || 600;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloom.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      return () => {
        disposed = true;
        cancelAnimationFrame(animationId);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("click", onCanvasClick);
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose?.();
            const mat = mesh.material as THREE.Material | THREE.Material[];
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose?.();
          }
        });
        for (const d of disposables) d.dispose();
        composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [onSelection]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {hint && !error && (
        <div style={{
          position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
          padding: "10px 22px", borderRadius: 999, background: "rgba(10,12,30,0.75)",
          border: "1px solid rgba(124,77,255,0.35)", backdropFilter: "blur(8px)",
          color: "#cfd4ff", fontSize: 13, letterSpacing: 0.4, whiteSpace: "nowrap",
          fontFamily: "var(--display)", pointerEvents: "none",
        }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          color: "#ff6b9d", fontSize: 14, fontFamily: "var(--display)",
        }}>
          WebGL indisponible : {error}
        </div>
      )}
    </div>
  );
}

// ================= Application des données aux pièces =================

export function applyLibraryData(rooms: RoomsLayout, documents: Document[]): void {
  // Nettoie les anciens livres
  for (const g of rooms.library!.roots) {
    for (let i = g.children.length - 1; i >= 0; i--) {
      const child = g.children[i]!;
      if (child.userData.bookId) {
        g.remove(child);
      }
    }
  }
  rooms.library!.bookMats.length = 0;

  const shelfConfigs = [
    { face: "left", count: 0, max: 14 },
    { face: "right", count: 0, max: 14 },
    { face: "back", count: 0, max: 14 },
  ];

  documents.slice(0, 42).forEach((doc, idx) => {
    const typeInfo = DOC_TYPE_INFO[doc.type] ?? DOC_TYPE_INFO.note!;
    const shelf = shelfConfigs[idx % 3]!;
    if (shelf.count >= shelf.max) return;
    shelf.count++;

    const isNew = Date.now() - doc.addedAt < 5 * 60 * 1000;
    const mat = new THREE.MeshStandardMaterial({
      color: typeInfo.color,
      emissive: typeInfo.color,
      emissiveIntensity: isNew ? 1.4 : 0.55,
      roughness: 0.5,
      metalness: 0.1,
    });
    rooms.library!.bookMats.push(mat);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.16), mat);
    const slot = shelf.count - 1;
    const row = Math.floor(slot / 7);
    const col = slot % 7;

    let lx = 0; let ly = 0; let lz = 0; let shelfIndex = idx % 3;
    if (shelfIndex === 0) { lx = -2.1 + col * 0.5; ly = 1.0 + row * 1.25; lz = 0.38; }
    else if (shelfIndex === 1) { lx = 2.1 - col * 0.5; ly = 1.0 + row * 1.25; lz = 0.38; }
    else { lx = -2.1 + col * 0.5; ly = 1.0 + row * 1.25; lz = 0.38; }

    const group = rooms.library!.roots[shelfIndex]!;
    book.position.set(lx, ly, lz);
    book.userData.bookId = doc.id;
    book.userData.doc = doc;
    book.userData.pick = { room: "library", item: doc.id, data: doc } as never;
    group.add(book);
  });
}

export function applyInterviewData(rooms: RoomsLayout, questions: InterviewQuestion[]): void {
  const seat = rooms.interview!.seat!;
  // Nettoie les anciennes bulles
  for (let i = seat.children.length - 1; i >= 0; i--) {
    const child = seat.children[i]!;
    if (child.userData.questionBubble) seat.remove(child);
  }
  rooms.interview!.mats.length = 0;

  const pending = pendingQuestions(questions);
  pending.slice(0, 3).forEach((q, i) => {
    const info = CATEGORY_INFO[q.category] ?? CATEGORY_INFO.identite!;
    const mat = new THREE.MeshBasicMaterial({
      color: info.color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    rooms.interview!.mats.push(mat);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.3 + i * 0.12, 14, 14), mat);
    bubble.position.set(0.6 + i * 0.5, 2.3 + i * 0.45, 0);
    bubble.userData.questionBubble = true;
    bubble.userData.pick = { room: "interview", item: q.id, data: q } as never;
    seat.add(bubble);
  });
}

export function applyGardenData(rooms: RoomsLayout, growth: number): void {
  const scale = Math.min(1, 0.35 + growth);
  rooms.jardin!.plants.forEach((plant, i) => {
    const jitter = 0.85 + ((i * 37) % 10) / 30;
    const target = plant.baseScale * scale * jitter;
    plant.group.scale.setScalar(target);
    plant.light.intensity = 0.3 + scale * 0.5;
    plant.mat.emissiveIntensity = 0.5 + scale * 0.8;
  });
}

export function applyChambreData(rooms: RoomsLayout, personality: Personality | null): void {
  if (!personality) return;
  const traits = personality.traits;
  rooms.chambre!.orbs.forEach((orb, i) => {
    const trait = traits[i % Math.max(traits.length, 1)];
    if (!trait) return;
    const info = traitInfo(trait.key);
    orb.color = info.color;
    orb.mat.color.set(info.color);
    const strength = 0.3 + trait.value * 0.7;
    orb.mat.opacity = 0.35 + strength * 0.5;
    orb.mesh.scale.setScalar(0.7 + trait.value * 0.9);
  });
}

export function applyBrainData(rooms: RoomsLayout, questions: InterviewQuestion[]): void {
  const answered = questions.filter((q) => q.status === "answered").length;
  const ratio = questions.length > 0 ? answered / questions.length : 0.3;
  const brainMesh = rooms.brain!.brainMesh;
  const mat = brainMesh.material as THREE.MeshStandardMaterial;
  mat.emissiveIntensity = 0.4 + ratio * 0.9;
  brainMesh.scale.setScalar(0.85 + ratio * 0.4);
}

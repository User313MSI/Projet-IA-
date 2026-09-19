"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Personality, InterviewQuestion } from "@ia-app/personality-core/client";
import { pendingQuestions } from "@ia-app/personality-core/client";
import type { Document, KnowledgeStats } from "@ia-app/knowledge-core/client";

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

// ---------- Palette (cohérente avec /origin) ----------
const VIOLET = 0x7c4dff;
const CYAN = 0x00e5ff;
const GREEN = 0x00ff9d;
const PINK = 0xff6b9d;
const GOLD = 0xffb300;

// ---------- Points de vue (navigation souris : clic sur un module = approche) ----------
interface ViewSpec {
  pos: [number, number, number];
  look: [number, number, number];
}

const VIEW_DEFAULT: ViewSpec = { pos: [0, 2.1, 14.5], look: [0, 2.1, 0] };
const VIEW_TANK: ViewSpec = { pos: [0, 2.0, 6.2], look: [0, 2.2, 0] };

const MODULE_VIEWS: Record<string, ViewSpec> = {
  tank: VIEW_TANK,
  // Panneaux en arc de cercle derrière la cuve, tous visibles depuis le point par défaut
  status: { pos: [0, 2.3, 8.2], look: [-7.4, 2.5, -4.2] },
  memory: { pos: [-2.2, 2.2, 9.4], look: [-9.2, 2.3, -1.4] },
  questions: { pos: [2.2, 2.2, 9.4], look: [9.2, 2.3, -1.4] },
  personality: { pos: [-3.4, 2.2, 7.2], look: [-10.6, 2.4, 2.6] },
  growth: { pos: [3.4, 2.2, 7.2], look: [10.6, 2.4, 2.6] },
};

const MODULE_TITLES: Record<string, string> = {
  tank: "Cœur d'Origin",
  status: "État du système",
  memory: "Mémoire / Connaissances",
  questions: "Questions en attente",
  personality: "Personnalité",
  growth: "Croissance",
};

interface Pickable {
  module: string;
  title: string;
  body: string;
  view: ViewSpec;
}

function makeHologramPanel(
  width: number,
  height: number,
  color: number,
  position: [number, number, number],
  rotationY: number
): { group: THREE.Group; screen: THREE.Mesh; glowMat: THREE.MeshBasicMaterial } {
  const group = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glowMat);
  group.add(screen);
  // Cadre néon discret
  const frameMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const frameT = 0.025;
  const fh = frameMat;
  const mk = (w: number, h: number, x: number, y: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.PlaneGeometry(w, h), fh);
  const top = mk(width, frameT, 0, height / 2);
  const bottom = mk(width, frameT, 0, -height / 2);
  const left = mk(frameT, height, -width / 2, 0);
  const right = mk(frameT, height, width / 2, 0);
  for (const bar of [top, bottom, left, right]) group.add(bar);
  group.position.set(...position);
  group.rotation.y = rotationY;
  return { group, screen, glowMat };
}

function makeLabelTexture(lines: { text: string; color: string; size: number; weight?: number }[], widthPx = 512, heightPx = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, widthPx, heightPx);
    let y = 0;
    for (const line of lines) {
      ctx.font = `${line.weight ?? 500} ${line.size}px Inter, Orbitron, sans-serif`;
      ctx.fillStyle = line.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(line.text, 24, y);
      y += line.size * 1.5;
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export default function OriginWorld({ data, onSelection }: { data: WorldData; onSelection?: (s: SelectionState | null) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string>("Bienvenue dans le laboratoire d'Origin — clique sur un module pour l'approcher");
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const activeModuleRef = useRef<string | null>(null);

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
      scene.fog = new THREE.FogExp2(0x05060f, 0.016);
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 300);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.cursor = "pointer";

      // ---------- Lumières (labo : froid dehors, chaud autour de la cuve) ----------
      scene.add(new THREE.AmbientLight(0x2a3050, 0.9));
      const hemi = new THREE.HemisphereLight(0x33415c, 0x0a0e1a, 0.5);
      scene.add(hemi);
      const tankLight = new THREE.PointLight(CYAN, 1.6, 12, 1.8);
      tankLight.position.set(0, 2.4, 0);
      scene.add(tankLight);
      const rimA = new THREE.DirectionalLight(0x8fb0e8, 0.35);
      rimA.position.set(10, 12, 14);
      scene.add(rimA);
      const rimB = new THREE.DirectionalLight(VIOLET, 0.3);
      rimB.position.set(-12, 8, -10);
      scene.add(rimB);

      // ---------- Salle : sol hexagonal sombre + anneaux néon ----------
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0e1e, roughness: 0.4, metalness: 0.6 });
      const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 6), floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);
      disposables.push(floorMat);

      // Anneaux lumineux au sol (concentriques autour de la cuve)
      const ringMats: THREE.MeshBasicMaterial[] = [];
      for (let i = 0; i < 3; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: i === 1 ? VIOLET : CYAN,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        ringMats.push(mat);
        const ring = new THREE.Mesh(new THREE.RingGeometry(2.6 + i * 0.9, 2.66 + i * 0.9, 96), mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.012 + i * 0.001;
        scene.add(ring);
        disposables.push(mat);
      }

      // Dalle centrale sous la cuve
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x161a30, roughness: 0.35, metalness: 0.75 });
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 0.22, 48), plateMat);
      plate.position.y = 0.11;
      scene.add(plate);
      disposables.push(plateMat);
      const plateGlowMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const plateGlow = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.3, 64), plateGlowMat);
      plateGlow.rotation.x = -Math.PI / 2;
      plateGlow.position.y = 0.235;
      scene.add(plateGlow);
      disposables.push(plateGlowMat);

      // ---------- La cuve de confinement d'Origin ----------
      const tank = new THREE.Group();

      // Base / socle mécanique
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1f38, roughness: 0.3, metalness: 0.85 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, 0.5, 32), baseMat);
      base.position.y = 0.25;
      tank.add(base);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x2c3358, roughness: 0.25, metalness: 0.9 });
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.12, 32), collarMat);
      collar.position.y = 0.56;
      tank.add(collar);
      disposables.push(baseMat, collarMat);

      // Enveloppe de verre (cylindre transparent, transmission)
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbfd8e8,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.14,
        transmission: 0.85,
        thickness: 0.35,
        ior: 1.4,
        clearcoat: 1,
      });
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 2.9, 48, 1, true), glassMat);
      glass.position.y = 0.5 + 1.45;
      tank.add(glass);
      disposables.push(glassMat);

      // Liquide lumineux (le "fluide neural" où baigne Origin)
      const fluidMat = new THREE.MeshPhysicalMaterial({
        color: 0x0a2a3a,
        emissive: 0x0a6a8a,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 2.6, 48), fluidMat);
      fluid.position.y = 0.62 + 1.3;
      tank.add(fluid);
      disposables.push(fluidMat);

      // Surface du liquide (disque animé)
      const surfMat = new THREE.MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.30,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const surface = new THREE.Mesh(new THREE.CircleGeometry(1.22, 48), surfMat);
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = 3.26;
      tank.add(surface);
      disposables.push(surfMat);

      // Couvercle / anneau supérieur
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x2c3358, roughness: 0.25, metalness: 0.9 });
      const lid = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 16, 48), lidMat);
      lid.rotation.x = Math.PI / 2;
      lid.position.y = 3.4;
      tank.add(lid);
      const lidGlowMat = new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
      const lidGlow = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.028, 8, 48), lidGlowMat);
      lidGlow.rotation.x = Math.PI /2;
      lidGlow.position.y = 3.4;
      tank.add(lidGlow);
      disposables.push(lidMat, lidGlowMat);

      // Origin dans la cuve : orbe énergie cyan/violet avec anneaux
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xbdfcff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), coreMat);
      core.position.y = 2.2;
      tank.add(core);
      const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), innerMat);
      inner.position.y = 2.2;
      tank.add(inner);
      disposables.push(coreMat, innerMat);

      const haloMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), haloMat);
      halo.position.y = 2.2;
      tank.add(halo);
      disposables.push(haloMat);

      const ringMat = new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const orbRings: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.14, 0.016, 8, 48), ringMat);
        ring.position.y = 2.2;
        ring.rotation.x = i === 0 ? Math.PI / 2 : 0.5 + i * 0.45;
        tank.add(ring);
        orbRings.push(ring);
      }
      disposables.push(ringMat);

      // Particules flottantes dans la cuve (poussière d'énergie)
      const sparkCount = 48;
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPos = new Float32Array(sparkCount * 3);
      const sparkSeed = new Float32Array(sparkCount);
      for (let i = 0; i < sparkCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * 0.6;
        sparkPos[i * 3] = Math.cos(a) * r;
        sparkPos[i * 3 + 1] = 0.8 + Math.random() * 2.4;
        sparkPos[i * 3 + 2] = Math.sin(a) * r;
        sparkSeed[i] = Math.random() * Math.PI * 2;
      }
      sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.07, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const sparks = new THREE.Points(sparkGeo, sparkMat);
      tank.add(sparks);
      disposables.push(sparkGeo, sparkMat);

      // Câbles / conduites vers la cuve
      const cableMat = new THREE.MeshStandardMaterial({ color: 0x232a48, roughness: 0.6, metalness: 0.4 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), cableMat);
        cable.position.set(Math.cos(a) * 1.9, 0.5, Math.sin(a) * 1.9);
        cable.rotation.z = Math.cos(a) * 0.55;
        cable.rotation.x = -Math.sin(a) * 0.55;
        tank.add(cable);
      }
      disposables.push(cableMat);

      // ---------- Anneaux de lecture (fixes autour de la cuve, tournent lentement) ----------
      const scanMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const scanRings: THREE.Mesh[] = [];
      for (let i = 0; i < 2; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.45 + i * 0.3, 0.014, 8, 72), scanMat);
        r.rotation.x = Math.PI / 2;
        r.position.y = 1.2 + i * 1.1;
        tank.add(r);
        scanRings.push(r);
      }
      disposables.push(scanMat);

      scene.add(tank);

      // Zone cliquable de la cuve
      const tankPick = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.8, 16));
      tankPick.userData.pick = {
        module: "tank",
        title: MODULE_TITLES.tank!,
        body: "Origin dans sa cuve de confinement.",
        view: MODULE_VIEWS.tank,
      } as Pickable;
      tankPick.visible = false;
      tank.add(tankPick);

      // ---------- Panneaux holographiques (arc de cercle autour de la cuve, face caméra) ----------
      const pickables: THREE.Object3D[] = [tankPick];
      const panels: { screen: THREE.Mesh; glowMat: THREE.MeshBasicMaterial; labelTex: THREE.CanvasTexture | null }[] = [];

      const panelSpecs: {
        module: string;
        color: number;
        pos: [number, number, number];
        ry: number;
        w: number;
        h: number;
      }[] = [
        // Étage 1 : 3 panneaux principaux, orientés vers la caméra
        { module: "status", color: CYAN, pos: [-5.2, 2.5, -3.0], ry: Math.PI / 5, w: 3.4, h: 1.9 },
        { module: "memory", color: GREEN, pos: [5.2, 2.5, -3.0], ry: -Math.PI / 5, w: 3.4, h: 1.9 },
        { module: "questions", color: PINK, pos: [0, 2.5, -5.6], ry: 0, w: 3.6, h: 1.9 },
        // Étage 2 : 2 panneaux latéraux plus hauts
        { module: "personality", color: VIOLET, pos: [-8.2, 3.6, 1.2], ry: Math.PI / 2.6, w: 3.2, h: 1.6 },
        { module: "growth", color: GOLD, pos: [8.2, 3.6, 1.2], ry: -Math.PI / 2.6, w: 3.2, h: 1.6 },
      ];

      const panelInfo = buildPanelBodies(dataRef.current);
      for (const spec of panelSpecs) {
        const info = panelInfo[spec.module]!;
        const { group, screen, glowMat } = makeHologramPanel(spec.w, spec.h, spec.color, spec.pos, spec.ry);
        // Étiquette holographique (texte canvas → texture)
        const labelTex = makeLabelTexture([
          { text: info.title, color: hexToCss(spec.color), size: 30, weight: 700 },
          { text: info.line1, color: "#cfd4ff", size: 22 },
          { text: info.line2, color: "#8f96c9", size: 20 },
        ]);
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.92, depthWrite: false });
        const label = new THREE.Mesh(new THREE.PlaneGeometry(spec.w - 0.3, (spec.h - 0.3) * (256 / 512)), labelMat);
        label.position.set(0, 0, 0.01);
        group.add(label);
        disposables.push(labelMat);

        // Zone cliquable du panneau
        const pick = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h));
        pick.userData.pick = {
          module: spec.module,
          title: info.title,
          body: info.body,
          view: MODULE_VIEWS[spec.module]!,
        } as Pickable;
        pick.visible = false;
        group.add(pick);
        pickables.push(pick);

        screen.userData.pick = pick.userData.pick;
        panels.push({ screen, glowMat, labelTex });
        scene.add(group);
      }

      // ---------- Ciel étoilé (ambiance nuit spatiale) ----------
      const starGeo = new THREE.BufferGeometry();
      const starCount = 1200;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(120 + Math.random() * 50);
        v.y = Math.abs(v.y) + 6;
        starPos[i * 3] = v.x; starPos[i * 3 + 1] = v.y; starPos[i * 3 + 2] = v.z;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.8, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false });
      scene.add(new THREE.Points(starGeo, starMat));
      disposables.push(starGeo, starMat);

      // ---------- Contrôles souris uniquement ----------
      const view = {
        pos: new THREE.Vector3(...VIEW_DEFAULT.pos),
        look: new THREE.Vector3(...VIEW_DEFAULT.look),
      };
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerMoved = false;
      let lastX = 0; let lastY = 0;
      let dragging = false;

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        dragging = true;
        pointerMoved = false;
        lastX = e.clientX; lastY = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 4) pointerMoved = true;
        lastX = e.clientX; lastY = e.clientY;
      };
      const onPointerUp = () => { dragging = false; };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      const onCanvasClick = (e: MouseEvent) => {
        if (pointerMoved) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickables, false);
        if (hits.length > 0) {
          const pick = hits[0]!.object.userData.pick as Pickable;
          view.pos.set(...pick.view.pos);
          view.look.set(...pick.view.look);
          activeModuleRef.current = pick.module;
          setHint(`${pick.title} — clic sur la cuve, un module, ou le fond pour revenir`);
          onSelection?.({ room: pick.module, title: pick.title, body: pick.body });
        } else if (activeModuleRef.current !== null) {
          view.pos.set(...VIEW_DEFAULT.pos);
          view.look.set(...VIEW_DEFAULT.look);
          activeModuleRef.current = null;
          setHint("Vue d'ensemble — clic sur la cuve ou un panneau pour approcher");
          onSelection?.(null);
        }
      };
      renderer.domElement.addEventListener("click", onCanvasClick);

      // ---------- Post-processing ----------
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.42, 0.55, 0.68);
      composer.addPass(bloom);
      composer.setSize(width, height);

      // ---------- Boucle ----------
      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        const d = dataRef.current;

        // Caméra : interpolation douce vers le point de vue courant (souris uniquement)
        camera.position.lerp(view.pos, 1 - Math.pow(0.0016, dt));
        const lookTarget = view.look;
        camera.lookAt(lookTarget);

        // Origin dans la cuve : pulsation (respiration) + réactivité aux données
        const answered = d.questions.filter((q) => q.status === "answered").length;
        const ratio = d.questions.length > 0 ? answered / d.questions.length : 0.3;
        const breath = 0.5 + 0.5 * Math.sin(t * 2.1);
        const coreScale = 1 + breath * 0.13 + ratio * 0.15;
        core.scale.setScalar(coreScale);
        inner.scale.setScalar(0.8 + breath * 0.45);
        halo.scale.setScalar(1 + breath * 0.25);
        haloMat.opacity = 0.14 + breath * 0.12;
        coreMat.opacity = 0.85 + breath * 0.15;
        tankLight.intensity = 1.3 + breath * 0.7;
        fluidMat.emissiveIntensity = 0.4 + breath * 0.25 + ratio * 0.3;
        surfMat.opacity = 0.22 + breath * 0.14;

        // Anneaux de l'orbe : rotations lentes
        orbRings[0]!.rotation.z = t * 0.9;
        orbRings[1]!.rotation.y = t * -0.6;
        orbRings[2]!.rotation.x = t * 0.45;

        // Anneaux de lecture de la cuve : montée/descente lente
        scanRings.forEach((r, i) => {
          r.position.y = 1.2 + i * 1.1 + Math.sin(t * 0.5 + i) * 0.25;
        });

        // Particules de la cuve : dérive lente verticale
        const spArr = sparkGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < sparkCount; i++) {
          const seed = sparkSeed[i]!;
          let y = spArr.getY(i) + dt * (0.08 + (i % 5) * 0.02);
          if (y > 3.2) y = 0.8;
          spArr.setY(i, y);
          spArr.setX(i, spArr.getX(i) + Math.sin(t * 0.7 + seed) * 0.0016);
        }
        spArr.needsUpdate = true;
        sparkMat.opacity = 0.55 + breath * 0.35;

        // Anneaux du sol : respiration discrète
        ringMats.forEach((mat, i) => {
          mat.opacity = 0.12 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.9));
        });

        // Panneaux : légère pulsation
        panels.forEach((p, i) => {
          p.glowMat.opacity = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.7));
        });

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
        for (const dd of disposables) dd.dispose();
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

// ================= Contenus des panneaux (données réelles d'Origin) =================

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function buildPanelBodies(d: WorldData): Record<string, { title: string; line1: string; line2: string; body: string }> {
  const pending = pendingQuestions(d.questions);
  const answered = d.questions.length - pending.length;
  const traits = (d.personality?.traits ?? []).slice(0, 5);
  const docs = d.documents;
  const result: Record<string, { title: string; line1: string; line2: string; body: string }> = {};

  result.status = {
    title: MODULE_TITLES.status!,
    line1: `${answered}/${d.questions.length} questions traitées`,
    line2: `${d.knowledgeChunks} passages en mémoire · ${d.sessions} sessions`,
    body: `Activité : ${answered}/${d.questions.length} questions répondues\nMémoire : ${d.knowledgeChunks} passages indexés\nSessions d'interview : ${d.sessions}`,
  };
  result.memory = {
    title: MODULE_TITLES.memory!,
    line1: `${docs.length} documents indexés`,
    line2: docs.length > 0 ? `Dernier : ${shorten(docs[0]!.title, 34)}` : "Aucun document",
    body: docs.slice(0, 8).map((doc) => `· ${doc.title} (${doc.type})`).join("\n") || "Aucun document indexé pour l'instant",
  };
  result.questions = {
    title: MODULE_TITLES.questions!,
    line1: `${pending.length} question(s) en attente`,
    line2: pending.length > 0 ? shorten(pending[0]!.question, 44) : "Origin est à jour !",
    body: pending.slice(0, 4).map((q) => `· ${shorten(q.question, 90)}`).join("\n") || "Aucune question en attente. Origin est à jour !",
  };
  result.personality = {
    title: MODULE_TITLES.personality!,
    line1: traits.length > 0 ? `${traits[0]!.label} ${Math.round(traits[0]!.value * 100)}%` : "En construction",
    line2: traits.length > 1 ? `${traits[1]!.label} ${Math.round(traits[1]!.value * 100)}% · ${traits[2]?.label ?? ""} ${Math.round((traits[2]?.value ?? 0) * 100)}%` : "",
    body: traits.map((tr) => `${tr.label} : ${Math.round(tr.value * 100)}%`).join("\n") || "Personnalité en construction",
  };
  result.growth = {
    title: MODULE_TITLES.growth!,
    line1: `Croissance : ${Math.round(d.growth * 100)}%`,
    line2: `${d.documents.length} docs · ${d.sessions} sessions`,
    body: `Croissance globale : ${Math.round(d.growth * 100)}%\nDocuments : ${d.documents.length}\nSessions d'interview : ${d.sessions}`,
  };
  return result;
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

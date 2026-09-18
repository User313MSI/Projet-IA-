"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export interface BrainProps {
  activity: number;
  knowledgeCount: number;
  pendingQuestions: number;
  questionsAnswered: number;
  totalQuestions: number;
}

interface Neuron {
  mesh: THREE.Mesh;
  basePos: THREE.Vector3;
  phase: number;
  category: number;
}

interface Synapse {
  line: THREE.Line;
  from: number;
  to: number;
  baseOpacity: number;
  phase: number;
}

interface Pulse {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  speed: number;
  along: number;
  synapse: Synapse;
  from: THREE.Vector3;
  to: THREE.Vector3;
}

// Bruit simple 3D déterministe pour déformer la surface du cerveau (sulci/gyri)
function noise3D(x: number, y: number, z: number): number {
  const a = Math.sin(x * 1.3 + y * 0.7 + z * 0.9) * 0.5;
  const b = Math.sin(x * 2.7 - y * 1.9 + z * 1.1 + 5.2) * 0.25;
  const c = Math.sin(x * 4.1 + y * 3.3 - z * 2.7 + 9.8) * 0.13;
  const d = Math.sin(x * 7.5 + y * 6.1 + z * 5.3 + 17.3) * 0.06;
  return a + b + c + d;
}

export default function Brain3D({
  activity,
  knowledgeCount,
  pendingQuestions,
  questionsAnswered,
  totalQuestions,
}: BrainProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let animationId: number;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;

    try {
      const width = mount.clientWidth;
      const height = mount.clientHeight || 560;

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05060f, 0.025);

      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 2, 26);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);

      // --- Éclairage cinématique ---
      scene.add(new THREE.AmbientLight(0x303060, 0.35));
      const key = new THREE.PointLight(0x7c4dff, 3.5, 80);
      key.position.set(12, 8, 12);
      scene.add(key);
      const fill = new THREE.PointLight(0x00e5ff, 2.2, 80);
      fill.position.set(-12, -4, 10);
      scene.add(fill);
      const rim = new THREE.PointLight(0x00ff9d, 1.4, 60);
      rim.position.set(0, 14, -8);
      scene.add(rim);
      const accent = new THREE.PointLight(0xff6b9d, 1.0, 50);
      accent.position.set(0, -10, 6);
      scene.add(accent);

      const brainGroup = new THREE.Group();
      scene.add(brainGroup);

      // --- Cerveau anatomique : icosaèdre subdivisé déformé par bruit ---
      const brainRadius = 6.2;
      const baseGeo = new THREE.IcosahedronGeometry(brainRadius, 4);
      const posAttr = baseGeo.attributes.position as THREE.BufferAttribute;
      const vertexCount = posAttr.count;
      const deformation = new Float32Array(vertexCount);

      for (let i = 0; i < vertexCount; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const nx = x / len;
        const ny = y / len;
        const nz = z / len;

        // Aplatir légèrement (cerveau plus large que haut)
        const flat = 0.85;
        const py = ny * flat;

        // Sulci/gyri : cannelures profondes via bruit haute fréquence
        const groove = noise3D(nx * 3.2, py * 3.2, nz * 3.2);
        const ridge = Math.abs(noise3D(nx * 6.0 + 2, py * 6.0 - 1, nz * 6.0 + 4));
        const detail = groove * 0.35 - ridge * 0.18;

        const deform = 1 + detail;
        deformation[i] = deform;

        posAttr.setXYZ(
          i,
          nx * brainRadius * deform,
          py * brainRadius * deform,
          nz * brainRadius * deform
        );
      }
      baseGeo.computeVertexNormals();
      baseGeo.setAttribute("aDeform", new THREE.BufferAttribute(deformation, 1));

      // Matériau cerveau : gradient selon la déformation (sulci sombres, gyri clairs)
      const brainMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uActivity: { value: activity },
          uPending: { value: pendingQuestions > 0 ? 1 : 0 },
          uColorA: { value: new THREE.Color(0x6a3cff) },
          uColorB: { value: new THREE.Color(0x00e5ff) },
          uColorHot: { value: new THREE.Color(0xff6b9d) },
        },
        vertexShader: `
          attribute float aDeform;
          varying float vDeform;
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            vDeform = aDeform;
            vNormal = normalize(normalMatrix * normal);
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uActivity;
          uniform float uPending;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorHot;
          varying float vDeform;
          varying vec3 vNormal;
          varying vec3 vPos;
          void main() {
            float depth = clamp((vDeform - 0.82) * 5.0, 0.0, 1.0);
            vec3 base = mix(uColorA, uColorB, depth);
            // Pulsation "pensée" qui parcourt le cerveau
            float wave = sin(uTime * 1.2 + vPos.y * 0.6 + vPos.x * 0.3) * 0.5 + 0.5;
            vec3 hot = mix(base, uColorHot, wave * (0.15 + uActivity * 0.35));
            // Clignotement d'alerte si questions en attente
            hot = mix(hot, uColorHot, uPending * wave * 0.5);
            // Fresnel : lueur sur les bords
            float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
            hot += fres * uColorB * 0.5;
            gl_FragColor = vec4(hot, 0.55);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const brainMesh = new THREE.Mesh(baseGeo, brainMat);
      brainGroup.add(brainMesh);

      // --- Coquille wireframe externe (halo) ---
      const shellGeo = new THREE.IcosahedronGeometry(brainRadius * 1.12, 2);
      const shellMat = new THREE.MeshBasicMaterial({
        color: 0x7c4dff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      brainGroup.add(shell);

      // --- Halo sphérique interne (lueur centrale) ---
      const haloGeo = new THREE.SphereGeometry(brainRadius * 0.4, 32, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.08,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      brainGroup.add(halo);

      // --- Neurones (points lumineux) ---
      const neuronCount = Math.min(260, 140 + knowledgeCount * 6 + questionsAnswered * 3);
      const neurons: Neuron[] = [];
      const neuronGeo = new THREE.SphereGeometry(0.11, 10, 10);
      const catColors = [0x7c4dff, 0x00e5ff, 0x00ff9d, 0xff6b9d, 0xffb300, 0xff4d4d];

      for (let i = 0; i < neuronCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = brainRadius * (0.55 + Math.random() * 0.5);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) * 0.88;
        const z = r * Math.cos(phi) * 0.85;
        const category = Math.floor(Math.random() * catColors.length);
        const color = new THREE.Color(catColors[category]!);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 });
        const mesh = new THREE.Mesh(neuronGeo, mat);
        mesh.position.set(x, y, z);
        brainGroup.add(mesh);
        neurons.push({ mesh, basePos: new THREE.Vector3(x, y, z), phase: Math.random() * Math.PI * 2, category });
      }

      // --- Synapses (connexions) ---
      const synapses: Synapse[] = [];
      const connGeoCache = new Map<string, THREE.BufferGeometry>();

      for (let i = 0; i < neurons.length; i++) {
        const ni = neurons[i]!;
        let connected = 0;
        for (let j = i + 1; j < neurons.length && connected < 3; j++) {
          const nj = neurons[j]!;
          if (ni.category === nj.category && Math.random() < 0.08) {
            const a = ni.basePos;
            const b = nj.basePos;
            const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
            const line = new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: catColors[ni.category]!,
                transparent: true,
                opacity: 0.12,
              })
            );
            brainGroup.add(line);
            synapses.push({
              line,
              from: i,
              to: j,
              baseOpacity: 0.06 + Math.random() * 0.12,
              phase: Math.random() * Math.PI * 2,
            });
            connected++;
          }
        }
      }

      // --- Impulsions qui voyagent le long des synapses ---
      const pulseGeo = new THREE.SphereGeometry(0.14, 8, 8);
      const pulses: Pulse[] = [];
      function spawnPulse() {
        if (!synapses.length) return;
        const syn = synapses[Math.floor(Math.random() * synapses.length)]!;
        const fromNeuron = neurons[syn.from];
        const toNeuron = neurons[syn.to];
        const from = fromNeuron?.basePos;
        const to = toNeuron?.basePos;
        if (!from || !to) return;
        const color = new THREE.Color(catColors[fromNeuron?.category ?? 0]!);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(pulseGeo, mat);
        mesh.position.copy(from);
        brainGroup.add(mesh);
        pulses.push({
          mesh,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.6,
          speed: 1,
          along: 0,
          synapse: syn,
          from: from.clone(),
          to: to.clone(),
        });
      }

      // --- Étoiles flottantes ---
      const starCount = 350;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 80;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0x4060ff, size: 0.09, transparent: true, opacity: 0.45,
      }));
      scene.add(stars);

      // --- Contrôles orbit (rotation + zoom) ---
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;
      let targetRotX = 0.1;
      let targetRotY = 0;
      let curRotX = 0.1;
      let curRotY = 0;
      let autoRot = true;

      function onDown(e: PointerEvent) {
        isDragging = true;
        autoRot = false;
        lastX = e.clientX;
        lastY = e.clientY;
      }
      function onMove(e: PointerEvent) {
        if (isDragging) {
          targetRotY += (e.clientX - lastX) * 0.008;
          targetRotX += (e.clientY - lastY) * 0.008;
          targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
          lastX = e.clientX;
          lastY = e.clientY;
        }
      }
      function onUp() {
        isDragging = false;
        setTimeout(() => { autoRot = true; }, 2500);
      }
      function onWheel(e: WheelEvent) {
        e.preventDefault();
        camera.position.z = Math.max(12, Math.min(42, camera.position.z + e.deltaY * 0.02));
      }
      renderer.domElement.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      let lastPulse = 0;
      const pulseInterval = Math.max(120, 900 - activity * 450);

      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const t = time * 0.001;
        brainMat.uniforms.uTime!.value = t;
        brainMat.uniforms.uActivity!.value = activity;
        brainMat.uniforms.uPending!.value = pendingQuestions > 0 ? 1 : 0;

        if (autoRot) {
          targetRotY += 0.0025;
          targetRotX = 0.1 + Math.sin(t * 0.3) * 0.08;
        }
        curRotX += (targetRotX - curRotX) * 0.06;
        curRotY += (targetRotY - curRotY) * 0.06;
        brainGroup.rotation.x = curRotX;
        brainGroup.rotation.y = curRotY;
        shell.rotation.y -= 0.001;
        halo.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04);

        for (const n of neurons) {
          const p = Math.sin(t * 2 + n.phase) * 0.5 + 0.5;
          (n.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + p * 0.5;
          n.mesh.scale.setScalar(1 + p * 0.4 * (0.5 + activity));
        }
        for (const s of synapses) {
          const p = Math.sin(t * 1.2 + s.phase) * 0.5 + 0.5;
          (s.line.material as THREE.LineBasicMaterial).opacity = s.baseOpacity * (0.3 + p * 0.7);
        }
        if (time - lastPulse > pulseInterval) {
          spawnPulse();
          lastPulse = time;
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const pl = pulses[i]!;
          pl.along += 0.02 * pl.speed;
          pl.life += 0.016;
          if (pl.along >= 1) {
            brainGroup.remove(pl.mesh);
            (pl.mesh.material as THREE.Material).dispose();
            pulses.splice(i, 1);
            continue;
          }
          pl.mesh.position.lerpVectors(pl.from, pl.to, pl.along);
          (pl.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - pl.along);
          pl.mesh.scale.setScalar(1 + pl.along * 0.5);
        }
        stars.rotation.y += 0.0002;
        renderer.render(scene, camera);
      }
      animate(0);

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight || 560;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("wheel", onWheel);
        mount?.removeChild(renderer.domElement);
        renderer.dispose();
        baseGeo.dispose();
        brainMat.dispose();
        shellGeo.dispose();
        shellMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        neuronGeo.dispose();
        pulseGeo.dispose();
        starGeo.dispose();
        connGeoCache.forEach((g) => g.dispose());
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [activity, knowledgeCount, pendingQuestions, questionsAnswered, totalQuestions]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "560px",
        borderRadius: "20px",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 40%, #0d0d3e 0%, #07081a 55%, #05060f 100%)",
        cursor: "grab",
        border: "1px solid rgba(124,77,255,0.15)",
        boxShadow: "0 0 60px rgba(124,77,255,0.12), inset 0 0 40px rgba(0,229,255,0.04)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 12, left: 14, fontSize: 11, color: "rgba(180,180,220,0.5)", letterSpacing: "1px", textTransform: "uppercase", pointerEvents: "none", zIndex: 2 }}>
        Cliquez et faites glisser pour explorer • molette pour zoomer
      </div>
      {error && (
        <div style={{ padding: 20, color: "var(--text)", textAlign: "center", position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          Erreur 3D : {error}
        </div>
      )}
    </div>
  );
}

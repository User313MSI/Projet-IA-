"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export interface BrainProps {
  activity: number;
  knowledgeCount: number;
  pendingQuestions: number;
  questionsAnswered: number;
  totalQuestions: number;
  pendingQuestionsList?: string[];
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

interface VesselSegment {
  line: THREE.Line;
  color: number;
  baseOpacity: number;
}

// Bruit 3D amélioré pour des détails anatomiques plus réalistes
function noise3D(x: number, y: number, z: number): number {
  const a = Math.sin(x * 1.3 + y * 0.7 + z * 0.9) * 0.5;
  const b = Math.sin(x * 2.7 - y * 1.9 + z * 1.1 + 5.2) * 0.25;
  const c = Math.sin(x * 4.1 + y * 3.3 - z * 2.7 + 9.8) * 0.13;
  const d = Math.sin(x * 7.5 + y * 6.1 + z * 5.3 + 17.3) * 0.06;
  const e = Math.sin(x * 11.2 - y * 8.3 + z * 7.1 + 23.5) * 0.03;
  return a + b + c + d + e;
}

// Génération de courbes pour les vaisseaux sanguins
function createVesselPath(
  brainRadius: number,
  seed: number,
  complexity: number = 5
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segments = 20 + Math.floor(Math.random() * complexity);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = (t * Math.PI * 2 + seed * 137) % (Math.PI * 2);
    const phiRaw = 2 * ((t + seed * 0.37) % 2) - 1;
    const phi = Math.acos(Math.max(-1, Math.min(1, phiRaw)));
    const radius = brainRadius * (0.7 + Math.sin(t * Math.PI * 2 + seed) * 0.2);
    
    // Ajout de variations pour un trajet plus organique
    const variation = noise3D(
      Math.cos(theta) * 3 + seed,
      Math.sin(phi) * 3 + seed * 2,
      t * 10 + seed * 3
    ) * 0.15;
    
    const x = (radius + variation) * Math.sin(phi) * Math.cos(theta);
    const y = (radius + variation) * Math.sin(phi) * Math.sin(theta) * 0.88;
    const z = (radius + variation) * Math.cos(phi) * 0.85;
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

// Composant pour afficher les bulles de pensée (style BD futuriste)
function ThoughtBubble({
  text,
  index,
  position,
  onRemove,
}: {
  text: string;
  index: number;
  position: { x: string; y: string };
  onRemove: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onRemove, 350);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const accents = ["#7c4dff", "#00e5ff", "#00ff9d", "#ff6b9d", "#ffb300", "#ff4d4d"];
  const accent = accents[index % accents.length] ?? accents[0]!;

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%) scale(1)",
        opacity: leaving ? 0 : 1,
        background: "rgba(10, 13, 26, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "14px",
        padding: "9px 14px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#e6f0ff",
        border: `1px solid ${accent}66`,
        boxShadow: `0 4px 24px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
        animation: `bubblePopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), bubbleFloat 3.2s ease-in-out ${index * 0.4}s infinite`,
        zIndex: 10,
        maxWidth: "280px",
        cursor: "pointer",
        transition: "opacity 0.35s ease, transform 0.35s ease, box-shadow 0.25s ease",
      }}
      onClick={onRemove}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 36px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 24px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.08)`;
      }}
    >
      {text}
      {/* Queue de bulle (style BD) */}
      <div
        style={{
          position: "absolute",
          left: "26px",
          bottom: "-5px",
          width: "10px",
          height: "10px",
          background: "rgba(10, 13, 26, 0.55)",
          borderRight: `1px solid ${accent}66`,
          borderBottom: `1px solid ${accent}66`,
          transform: "rotate(45deg)",
        }}
      />
      <style jsx>{`
        @keyframes bubblePopIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.5);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1.08);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
        }
        @keyframes bubbleFloat {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -6px;
          }
        }
      `}</style>
    </div>
  );
}

export default function Brain3D({
  activity,
  knowledgeCount,
  pendingQuestions,
  questionsAnswered,
  totalQuestions,
  pendingQuestionsList = [],
}: BrainProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [thoughtBubbles, setThoughtBubbles] = useState<string[]>([]);

  // Position des bulles de pensée : répartition autour du cerveau
  const getBubblePosition = (index: number) => {
    const angle = (-160 + index * 47) * (Math.PI / 180);
    const radiusX = 150 + (index % 2) * 40;
    const radiusY = 110 + (index % 3) * 30;
    return {
      x: `calc(50% + ${Math.cos(angle) * radiusX}px)`,
      y: `calc(38% + ${Math.sin(angle) * radiusY}px)`,
    };
  };

  const pendingListRef = useRef(pendingQuestionsList);
  useEffect(() => {
    pendingListRef.current = pendingQuestionsList;
  }, [pendingQuestionsList]);

  useEffect(() => {
    // Mettre à jour les bulles de pensée uniquement si le contenu a réellement changé
    setThoughtBubbles((prev) => {
      const next = pendingQuestionsList.slice(0, 5);
      if (prev.length === next.length && prev.every((q, i) => q === next[i])) {
        return prev;
      }
      return next;
    });
  }, [pendingQuestionsList]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let animationId: number;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let camera: THREE.PerspectiveCamera;
    let raycaster: THREE.Raycaster;
    let mouse: THREE.Vector2;

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
      renderer.toneMappingExposure = 1.2;
      mount.appendChild(renderer.domElement);

      // Raycaster pour les effets hover
      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();

      // --- Éclairage cinématique amélioré ---
      scene.add(new THREE.AmbientLight(0x303060, 0.35));
      const hemi = new THREE.HemisphereLight(0x7c4dff, 0x05060f, 0.5);
      scene.add(hemi);
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
      
      // Projecteur pour le relief des sulci/gyri
      const spot = new THREE.SpotLight(0xb8c4ff, 2.0, 120, Math.PI / 5, 0.6, 1.2);
      spot.position.set(0, 22, 18);
      spot.target.position.set(0, 0, 0);
      scene.add(spot);
      scene.add(spot.target);
      
      // Lumière directionnelle pour plus de profondeur
      const directional = new THREE.DirectionalLight(0xffffff, 0.2);
      directional.position.set(5, 10, 5);
      scene.add(directional);

      const brainGroup = new THREE.Group();
      scene.add(brainGroup);

      // --- Cerveau anatomique amélioré ---
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

        // Sulci/gyri : cannelures profondes avec plus de détails
        const groove = noise3D(nx * 3.2, py * 3.2, nz * 3.2);
        const ridge = Math.abs(noise3D(nx * 6.0 + 2, py * 6.0 - 1, nz * 6.0 + 4));
        const fineDetail = noise3D(nx * 12.0 + 5, py * 12.0 - 3, nz * 12.0 + 7) * 0.05;
        const detail = groove * 0.35 - ridge * 0.18 + fineDetail;

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

      // Matériau cerveau : shader amélioré avec effets de lumière
      const brainMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uActivity: { value: activity },
          uPending: { value: pendingQuestions > 0 ? 1 : 0 },
          uHoverPos: { value: new THREE.Vector3(0, 0, 0) },
          uHoverActive: { value: 0 },
          uColorA: { value: new THREE.Color(0x6a3cff) },
          uColorB: { value: new THREE.Color(0x00e5ff) },
          uColorHot: { value: new THREE.Color(0xff6b9d) },
          uColorVein: { value: new THREE.Color(0xff4757) },
          uColorArtery: { value: new THREE.Color(0x2ed573) },
        },
        vertexShader: `
          attribute float aDeform;
          varying float vDeform;
          varying vec3 vNormal;
          varying vec3 vPos;
          varying vec3 vWorldPos;
          
          void main() {
            vDeform = aDeform;
            vNormal = normalize(normalMatrix * normal);
            vPos = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uActivity;
          uniform float uPending;
          uniform vec3 uHoverPos;
          uniform float uHoverActive;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorHot;
          uniform vec3 uColorVein;
          uniform vec3 uColorArtery;
          
          varying float vDeform;
          varying vec3 vNormal;
          varying vec3 vPos;
          varying vec3 vWorldPos;
          
          void main() {
            // Relief : sulci sombres et profondes, gyri lumineux et lisses
            float depth = clamp((vDeform - 0.80) * 4.5, 0.0, 1.0);
            float crease = 1.0 - smoothstep(0.0, 0.45, depth);
            vec3 base = mix(uColorA, uColorB, depth);
            
            // Assombrissement doux au fond des sillons (profondeur anatomique)
            base *= 0.55 + depth * 0.45;
            
            // Pulsation "pensée" qui parcourt le cerveau (double onde croisée)
            float wave = sin(uTime * 1.2 + vPos.y * 0.6 + vPos.x * 0.3) * 0.5 + 0.5;
            float wave2 = sin(uTime * 0.8 - vPos.z * 0.5 + vPos.x * 0.4) * 0.5 + 0.5;
            float think = max(wave, wave2) * (0.15 + uActivity * 0.35);
            vec3 hot = mix(base, uColorHot, think);
            
            // Clignotement d'alerte si questions en attente
            hot = mix(hot, uColorHot, uPending * wave * 0.5);
            
            // Effet hover : lueur cyan organique sous la souris
            float hoverDist = length(vWorldPos - uHoverPos);
            float hoverEffect = smoothstep(3.5, 0.8, hoverDist) * uHoverActive;
            hot += uColorB * hoverEffect * 0.7;
            
            // Fresnel : lueur sur les bords, renforcée sur les crêtes
            float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
            hot += fres * uColorB * (0.4 + depth * 0.35);
            
            // Micro-scintillement des crêtes (gyri qui "réfléchissent")
            float sparkle = pow(depth, 3.0) * (0.5 + 0.5 * sin(uTime * 2.0 + vPos.x * 2.0 + vPos.z * 2.0));
            hot += uColorB * sparkle * 0.08;
            
            gl_FragColor = vec4(hot, 0.55 + hoverEffect * 0.2);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const brainMesh = new THREE.Mesh(baseGeo, brainMat);
      brainGroup.add(brainMesh);

      // --- Membrane externe translucide (réalisme organique) ---
      const membraneGeo = new THREE.IcosahedronGeometry(brainRadius * 1.03, 3);
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: 0x7c4dff,
        transparent: true,
        opacity: 0.07,
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.FrontSide,
        depthWrite: false,
        clearcoat: 1.0,
        clearcoatRoughness: 0.4,
      });
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      brainGroup.add(membrane);

      // --- Vaisseaux sanguins (veines et artères) ---
      const vesselSegments: VesselSegment[] = [];
      const vesselCount = 8;
      
      for (let i = 0; i < vesselCount; i++) {
        const isArtery = i % 2 === 0;
        const color = isArtery ? 0x2ed573 : 0xff4757;
        const points = createVesselPath(brainRadius, i * 13, 8);
        
        const vesselGeo = new THREE.BufferGeometry().setFromPoints(points);
        const vesselMat = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.6 + Math.random() * 0.2,
          linewidth: 1.5,
        });
        
        const vesselLine = new THREE.Line(vesselGeo, vesselMat);
        brainGroup.add(vesselLine);
        
        vesselSegments.push({ line: vesselLine, color, baseOpacity: vesselMat.opacity });
      }

      // --- Coquille wireframe externe (halo) ---
      const shellGeo = new THREE.IcosahedronGeometry(brainRadius * 1.12, 2);
      const shellMat = new THREE.MeshBasicMaterial({
        color: 0x7c4dff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      brainGroup.add(shell);

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
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
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
                blending: THREE.AdditiveBlending,
                depthWrite: false,
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
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(pulseGeo, mat);
        mesh.position.copy(from);
        brainGroup.add(mesh);
        pulses.push({
          mesh,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.6,
          speed: 1 + activity * 0.5,
          along: 0,
          synapse: syn,
          from: from.clone(),
          to: to.clone(),
        });
      }

      // --- Particules flottantes améliorées ---
      const particleCount = 500;
      const particleGeo = new THREE.BufferGeometry();
      const particlePos = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      const particleColorsArray = [
        { r: 124/255, g: 77/255, b: 255/255 },
        { r: 0/255, g: 229/255, b: 255/255 },
        { r: 0/255, g: 255/255, b: 157/255 },
        { r: 255/255, g: 107/255, b: 157/255 },
      ];
      
      for (let i = 0; i < particleCount; i++) {
        particlePos[i * 3] = (Math.random() - 0.5) * 80;
        particlePos[i * 3 + 1] = (Math.random() - 0.5) * 80;
        particlePos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
        
        const colorIdx = Math.floor(Math.random() * particleColorsArray.length);
        particleColors[i * 3] = particleColorsArray[colorIdx]!.r;
        particleColors[i * 3 + 1] = particleColorsArray[colorIdx]!.g;
        particleColors[i * 3 + 2] = particleColorsArray[colorIdx]!.b;
        
        particleSizes[i] = 0.05 + Math.random() * 0.15;
      }
      
      particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
      particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
      particleGeo.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));
      
      const particles = new THREE.Points(
        particleGeo,
        new THREE.PointsMaterial({
          size: 0.09,
          vertexColors: true,
          transparent: true,
          opacity: 0.6,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      scene.add(particles);

      // --- Contrôles orbit (rotation + zoom) + hover ---
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
        
        // Calcul du hover pour les effets 3D
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(brainMesh);
        
        if (intersects.length > 0) {
          const point = intersects[0]!.point;
          (brainMat.uniforms.uHoverPos as THREE.Uniform).value = point;
          (brainMat.uniforms.uHoverActive as THREE.Uniform).value = 1;
          renderer.domElement.style.cursor = "pointer";
        } else {
          (brainMat.uniforms.uHoverActive as THREE.Uniform).value = 0;
          renderer.domElement.style.cursor = "grab";
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
      
      function onDoubleClick() {
        // Réinitialiser la vue
        targetRotX = 0.1;
        targetRotY = 0;
        camera.position.set(0, 2, 26);
        camera.lookAt(0, 0, 0);
      }
      
      renderer.domElement.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      renderer.domElement.addEventListener("dblclick", onDoubleClick);

      let lastPulse = 0;
      const pulseInterval = Math.max(120, 900 - activity * 450);

      function animate(time: number) {
        animationId = requestAnimationFrame(animate);
        const t = time * 0.001;
        brainMat.uniforms.uTime!.value = t;
        brainMat.uniforms.uActivity!.value = activity;
        brainMat.uniforms.uPending!.value = pendingQuestions > 0 ? 1 : 0;

        // Rotation automatique plus lente et élégante
        if (autoRot) {
          targetRotY += 0.0016;
          targetRotX = 0.1 + Math.sin(t * 0.3) * 0.08;
        }
        curRotX += (targetRotX - curRotX) * 0.06;
        curRotY += (targetRotY - curRotY) * 0.06;
        brainGroup.rotation.x = curRotX;
        brainGroup.rotation.y = curRotY;
        
        // Effet de respiration organique (double harmonique, sans à-coups)
        const breath =
          1 +
          Math.sin(t * 0.45) * 0.016 +
          Math.sin(t * 0.9 + 1.3) * 0.006;
        brainGroup.scale.setScalar(breath);
        
        shell.rotation.y -= 0.001;
        membrane.rotation.y += 0.0006;
        membrane.material.opacity = 0.07 + Math.sin(t * 1.5) * 0.015;

        // Animation des vaisseaux sanguins (pulsation cardiaque fluide, sans flicker)
        for (let i = 0; i < vesselSegments.length; i++) {
          const vessel = vesselSegments[i]!;
          const pulse = Math.sin(t * 2 + i * 0.7) * 0.5 + 0.5;
          (vessel.line.material as THREE.LineBasicMaterial).opacity =
            vessel.baseOpacity * (0.65 + pulse * 0.35);
        }

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
        
        // Animation des particules
        const particleAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          particleAttr.setY(i3 + 1, particleAttr.getY(i3 + 1) + Math.sin(t * 0.5 + i) * 0.003);
        }
        particleAttr.needsUpdate = true;
        particles.rotation.y += 0.0002;
        
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
        renderer.domElement.removeEventListener("dblclick", onDoubleClick);
        mount?.removeChild(renderer.domElement);
        renderer.dispose();
        baseGeo.dispose();
        brainMat.dispose();
        membraneGeo.dispose();
        membraneMat.dispose();
        shellGeo.dispose();
        shellMat.dispose();
        neuronGeo.dispose();
        pulseGeo.dispose();
        particleGeo.dispose();
        vesselSegments.forEach(v => {
          v.line.geometry.dispose();
          (v.line.material as THREE.Material).dispose();
        });
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
      {/* Instructions */}
      <div style={{
        position: "absolute", 
        top: 12, 
        left: 14, 
        fontSize: 11, 
        color: "rgba(180,180,220,0.5)", 
        letterSpacing: "1px", 
        textTransform: "uppercase", 
        pointerEvents: "none", 
        zIndex: 2 
      }}>
        Cliquez et faites glisser pour explorer • molette pour zoomer • double-clic pour réinitialiser
      </div>
      
      {/* Bulles de pensée */}
      {thoughtBubbles.map((question, index) => {
        const pos = getBubblePosition(index);
        return (
          <ThoughtBubble
            key={`${index}-${question}`}
            text={question}
            index={index}
            position={pos}
            onRemove={() => {
              setThoughtBubbles(prev => prev.filter((_, i) => i !== index));
            }}
          />
        );
      })}
      
      {/* Indicateur de questions en attente */}
      {pendingQuestions > 0 && (
        <div style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(255, 71, 87, 0.9)",
          borderRadius: "50%",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "bold",
          color: "white",
          border: "2px solid #ff4757",
          boxShadow: "0 0 15px rgba(255, 71, 87, 0.6)",
          animation: "pendingPulse 1.5s ease-in-out infinite",
          zIndex: 10,
        }}>
          {pendingQuestions}
          <style jsx>{`
            @keyframes pendingPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 71, 87, 0.6); }
              50% { transform: scale(1.1); box-shadow: 0 0 24px rgba(255, 71, 87, 0.9); }
            }
          `}</style>
        </div>
      )}
      
      {error && (
        <div style={{
          padding: 20, 
          color: "var(--text)", 
          textAlign: "center", 
          position: "absolute", 
          inset: 0, 
          display: "grid", 
          placeItems: "center",
          zIndex: 20
        }}>
          Erreur 3D : {error}
        </div>
      )}
    </div>
  );
}

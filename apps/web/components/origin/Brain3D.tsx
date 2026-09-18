"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

interface BrainProps {
  activity: number;
  knowledgeCount: number;
  pendingQuestions: number;
}

export default function Brain3D({ activity, knowledgeCount, pendingQuestions }: BrainProps) {
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
      const height = mount.clientHeight || 500;

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05060f, 0.04);

      camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(0, 0, 18);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0x4060ff, 0.3));
      const light1 = new THREE.PointLight(0x7c4dff, 2, 50);
      light1.position.set(8, 5, 8);
      scene.add(light1);
      const light2 = new THREE.PointLight(0x00e5ff, 1.5, 50);
      light2.position.set(-8, -5, 8);
      scene.add(light2);
      const light3 = new THREE.PointLight(0x00ff9d, 1, 30);
      light3.position.set(0, 10, -5);
      scene.add(light3);

      const brainGroup = new THREE.Group();
      scene.add(brainGroup);

      const hemiGeo = new THREE.SphereGeometry(5, 64, 64);
      const hemiMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a3e,
        emissive: 0x7c4dff,
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 0.12,
        wireframe: false,
        side: THREE.DoubleSide,
      });

      const leftHemi = new THREE.Mesh(hemiGeo, hemiMat);
      leftHemi.position.x = -2.5;
      leftHemi.scale.x = 0.9;
      brainGroup.add(leftHemi);

      const rightHemi = new THREE.Mesh(hemiGeo, hemiMat);
      rightHemi.position.x = 2.5;
      rightHemi.scale.x = 0.9;
      brainGroup.add(rightHemi);

      const wireGeo = new THREE.SphereGeometry(5, 32, 32);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x7c4dff,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      });
      const leftWire = new THREE.Mesh(wireGeo, wireMat);
      leftWire.position.x = -2.5;
      leftWire.scale.x = 0.9;
      brainGroup.add(leftWire);
      const rightWire = new THREE.Mesh(wireGeo, wireMat);
      rightWire.position.x = 2.5;
      rightWire.scale.x = 0.9;
      brainGroup.add(rightWire);

      const sulciCount = 40;
      const sulciMat = new THREE.LineBasicMaterial({
        color: 0x4a4a8e,
        transparent: true,
        opacity: 0.3,
      });
      for (let i = 0; i < sulciCount; i++) {
        const points: THREE.Vector3[] = [];
        const startAngle = (i / sulciCount) * Math.PI * 2;
        for (let j = 0; j < 20; j++) {
          const t = j / 20;
          const angle = startAngle + t * 0.8;
          const r = 5 + Math.sin(t * 12) * 0.15;
          const y = Math.sin(angle) * r;
          const x = Math.cos(angle) * r * 0.9 + (i % 2 === 0 ? -2.5 : 2.5);
          const z = Math.sin(t * Math.PI) * 3;
          points.push(new THREE.Vector3(x, y, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, sulciMat);
        brainGroup.add(line);
      }

      const neuronCount = 120 + knowledgeCount * 5;
      const neurons: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number }[] = [];
      const neuronGeo = new THREE.SphereGeometry(0.08, 8, 8);

      for (let i = 0; i < neuronCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 3;
        const x = r * Math.sin(phi) * Math.cos(theta) + (Math.random() < 0.5 ? -2.5 : 2.5);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi) * 0.7;

        const color = new THREE.Color();
        const hue = 0.6 + Math.random() * 0.2;
        color.setHSL(hue, 0.8, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
        const mesh = new THREE.Mesh(neuronGeo, mat);
        mesh.position.set(x, y, z);
        brainGroup.add(mesh);
        neurons.push({ mesh, basePos: new THREE.Vector3(x, y, z), phase: Math.random() * Math.PI * 2 });
      }

      const connections: { line: THREE.Line; opacity: number; phase: number }[] = [];
      const connMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.15,
      });
      for (let i = 0; i < neurons.length; i++) {
        const maxConn = 3;
        let connected = 0;
        for (let j = i + 1; j < neurons.length && connected < maxConn; j++) {
          if (Math.random() < 0.05) {
            const points = [
              neurons[i]!.basePos.clone(),
              neurons[j]!.basePos.clone(),
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, connMat.clone());
            brainGroup.add(line);
            connections.push({
              line,
              opacity: 0.05 + Math.random() * 0.1,
              phase: Math.random() * Math.PI * 2,
            });
            connected++;
          }
        }
      }

      const pulseRingGeo = new THREE.RingGeometry(0.3, 0.5, 32);
      const pulseRings: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

      function spawnPulse() {
        const color = new THREE.Color();
        const colors = [0x7c4dff, 0x00e5ff, 0x00ff9d, 0xff6b9d];
        color.setHex(colors[Math.floor(Math.random() * colors.length)]!);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(pulseRingGeo, mat);
        const neuron = neurons[Math.floor(Math.random() * neurons.length)];
        if (neuron) {
          mesh.position.copy(neuron.basePos);
        }
        mesh.lookAt(0, 0, 0);
        brainGroup.add(mesh);
        pulseRings.push({ mesh, life: 0, maxLife: 1.5 });
      }

      const starsGeo = new THREE.BufferGeometry();
      const starCount = 200;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 60;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 20;
      }
      starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0x4060ff,
        size: 0.08,
        transparent: true,
        opacity: 0.5,
      });
      const stars = new THREE.Points(starStarsGeo(), starsMat);
      scene.add(stars);

      function starStarsGeo(): THREE.BufferGeometry {
        return starsGeo;
      }

      let mouseX = 0;
      let mouseY = 0;
      let targetRotX = 0;
      let targetRotY = 0;
      let currentRotX = 0;
      let currentRotY = 0;
      let isDragging = false;
      let lastMouseX = 0;
      let lastMouseY = 0;

      function onMouseMove(e: MouseEvent) {
        const rect = mount!.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        if (isDragging) {
          targetRotY += (e.clientX - lastMouseX) * 0.01;
          targetRotX += (e.clientY - lastMouseY) * 0.01;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      }
      function onMouseDown(e: MouseEvent) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
      function onMouseUp() {
        isDragging = false;
      }
      function onWheel(e: WheelEvent) {
        e.preventDefault();
        camera.position.z = Math.max(8, Math.min(30, camera.position.z + e.deltaY * 0.02));
      }

      renderer.domElement.addEventListener("mousemove", onMouseMove);
      renderer.domElement.addEventListener("mousedown", onMouseDown);
      renderer.domElement.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      let lastPulse = 0;
      const pulseInterval = Math.max(100, 1000 - activity * 500);

      function animate(time: number) {
        animationId = requestAnimationFrame(animate);

        if (!isDragging) {
          targetRotY += 0.003;
          targetRotX = Math.sin(time * 0.0003) * 0.1;
        }
        currentRotX += (targetRotX - currentRotX) * 0.05;
        currentRotY += (targetRotY - currentRotY) * 0.05;
        brainGroup.rotation.x = currentRotX;
        brainGroup.rotation.y = currentRotY;

        for (const n of neurons) {
          const pulse = Math.sin(time * 0.002 + n.phase) * 0.5 + 0.5;
          const mat = n.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.3 + pulse * 0.5;
          const scale = 1 + pulse * 0.3 * (0.5 + activity);
          n.mesh.scale.setScalar(scale);
        }

        for (const c of connections) {
          const pulse = Math.sin(time * 0.001 + c.phase) * 0.5 + 0.5;
          const mat = c.line.material as THREE.LineBasicMaterial;
          mat.opacity = c.opacity * (0.3 + pulse * 0.7);
        }

        if (time - lastPulse > pulseInterval) {
          spawnPulse();
          lastPulse = time;
        }
        for (let i = pulseRings.length - 1; i >= 0; i--) {
          const ring = pulseRings[i]!;
          ring.life += 0.016;
          const t = ring.life / ring.maxLife;
          ring.mesh.scale.setScalar(1 + t * 4);
          (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
          if (t >= 1) {
            brainGroup.remove(ring.mesh);
            (ring.mesh.material as THREE.Material).dispose();
            pulseRings.splice(i, 1);
          }
        }

        if (pendingQuestions > 0) {
          const flash = Math.sin(time * 0.005) * 0.5 + 0.5;
          (leftHemi.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.08 + flash * 0.15;
          (rightHemi.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.08 + flash * 0.15;
        }

        stars.rotation.y += 0.0002;

        renderer.render(scene, camera);
      }
      animate(0);

      function onResize() {
        const w = mount!.clientWidth;
        const h = mount!.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("mousemove", onMouseMove);
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        mount?.removeChild(renderer.domElement);
        renderer.dispose();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [activity, knowledgeCount, pendingQuestions]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "600px",
        borderRadius: "16px",
        overflow: "hidden",
        background: "radial-gradient(ellipse at center, #0a0a2e 0%, #05060f 70%)",
        cursor: "grab",
      }}
    >
      {error && (
        <div style={{ padding: "20px", color: "var(--text)", textAlign: "center" }}>
          Erreur 3D : {error}
        </div>
      )}
    </div>
  );
}

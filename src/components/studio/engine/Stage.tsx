"use client";
import * as THREE from "three";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { ProceduralAvatar } from "./Avatar";
import { HumanAvatar, type Pose } from "./HumanAvatar";
import type { AvatarConfig } from "./body";
import type { GarmentSpec, FitReport } from "./garments";
import type { Measurements } from "./human";

/**
 * Avatar providers.
 * - "realistic" (default): CC0 MakeHuman body with morph targets, real skin textures, fitted hair/eyes, skeleton + poses.
 * - "procedural": lightweight parametric body (fallback if realistic assets fail to load).
 * - "gltf": a rigged GLB body uploaded by an admin.
 */
export type AvatarProviderId = "realistic" | "procedural" | "gltf";
export const PROVIDERS: Record<AvatarProviderId, { label: string; skeleton: string; supportsMeasurements: boolean }> = {
  realistic: { label: "VESTRA realistic body", skeleton: "vestra-f1", supportsMeasurements: true },
  procedural: { label: "VESTRA parametric body", skeleton: "vestra-f1", supportsMeasurements: true },
  gltf: { label: "Rigged GLB body", skeleton: "vestra-f1-rig", supportsMeasurements: false },
};

export type View = "front" | "side" | "back" | "free";
export type Framing = "full" | "upper" | "face";
export type Lighting = "studio" | "daylight" | "golden" | "evening";
const AZ: Record<Exclude<View, "free">, number> = { front: 0, side: Math.PI / 2, back: Math.PI };

const LIGHTS: Record<Lighting, { hemi: [string, string, number]; key: [string, number]; fill: [string, number]; rim: [string, number]; env: number; bg: string }> = {
  studio: { hemi: ["#fff7f0", "#3a3030", 0.5], key: ["#ffffff", 1.7], fill: ["#d9c9ff", 0.6], rim: ["#ffe2cf", 6], env: 1, bg: "" },
  daylight: { hemi: ["#eaf3ff", "#6b6456", 0.75], key: ["#fff6e8", 2.1], fill: ["#cfe0ff", 0.7], rim: ["#ffffff", 3], env: 1.2, bg: "" },
  golden: { hemi: ["#ffd9a8", "#4a2e20", 0.55], key: ["#ffb36b", 2.2], fill: ["#a58cff", 0.45], rim: ["#ff9a5a", 8], env: 0.8, bg: "" },
  evening: { hemi: ["#8a8cff", "#1a1020", 0.35], key: ["#ffd2b0", 1.3], fill: ["#6c5cff", 0.8], rim: ["#ff6fa8", 9], env: 0.5, bg: "" },
};

export function Stage({ config, garments, provider = "realistic", modelUrl, view = "free", viewNonce = 0, autoRotate = false, zoomable = true, onFit, onMeasure, background = "transparent", pose = "relaxed", framing = "full", lighting = "studio" }: {
  config: AvatarConfig; garments: (GarmentSpec & { fit?: string })[]; provider?: AvatarProviderId; modelUrl?: string | null; view?: View; viewNonce?: number;
  autoRotate?: boolean; zoomable?: boolean; onFit?: (r: Record<string, FitReport | null>) => void; onMeasure?: (m: Measurements) => void; background?: string;
  pose?: Pose; framing?: Framing; lighting?: Lighting;
}) {
  const H = config.heightCm / 100;
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const L = LIGHTS[lighting];
  const useReal = provider === "realistic" && !failed;
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, H * 0.56, 3.7], fov: 30, near: 0.05, far: 40 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} style={{ background }}>
      <Suspense fallback={null}>
        <hemisphereLight args={L.hemi} />
        <directionalLight position={[2.2, 4, 3]} color={L.key[0]} intensity={L.key[1]} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.02} />
        <directionalLight position={[-3, 2.5, 1.5]} color={L.fill[0]} intensity={L.fill[1]} />
        <spotLight position={[0, 3, -3]} intensity={L.rim[1]} color={L.rim[0]} angle={0.6} penumbra={1} />
        <Environment resolution={256} environmentIntensity={L.env}>
          <Lightformer form="rect" intensity={2.2} position={[0, 3, 2]} scale={[4, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#f3d6c8" position={[-3, 1.5, 0]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#d6cff3" position={[3, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
          <Lightformer form="ring" intensity={0.8} position={[0, 1, -4]} scale={2} />
        </Environment>
        {provider === "gltf" && modelUrl ? <GltfAvatar url={modelUrl} config={config} />
          : useReal ? <HumanAvatar config={config} garments={garments} pose={pose} onFit={onFit} onMeasure={onMeasure} onError={onError} />
          : <ProceduralAvatar config={config} garments={garments} onFit={onFit} />}
        <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={3} blur={2.2} far={2} resolution={512} color="#1a1212" />
        <CameraRig view={view} nonce={viewNonce} height={H} autoRotate={autoRotate} zoomable={zoomable} framing={framing} />
      </Suspense>
    </Canvas>
  );
}

const FRAME: Record<Framing, { target: number; dist: number }> = { full: { target: 0.53, dist: 3.7 }, upper: { target: 0.74, dist: 1.75 }, face: { target: 0.92, dist: 0.72 } };

function CameraRig({ view, nonce, height, autoRotate, zoomable, framing }: { view: View; nonce: number; height: number; autoRotate: boolean; zoomable: boolean; framing: Framing }) {
  const controls = useRef<OrbitImpl>(null);
  const az = useRef<number | null>(null);
  const goal = useRef<{ target: THREE.Vector3; dist: number } | null>(null);
  const { camera } = useThree();
  useEffect(() => { if (view !== "free") az.current = AZ[view]; }, [view, nonce]);
  useEffect(() => { const f = FRAME[framing]; goal.current = { target: new THREE.Vector3(0, height * f.target, 0), dist: f.dist }; }, [framing, height]);
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (goal.current) {
      // glide target + distance to the chosen framing
      c.target.lerp(goal.current.target, 0.12);
      const off = camera.position.clone().sub(c.target);
      const len = off.length();
      off.setLength(len + (goal.current.dist - len) * 0.12);
      camera.position.copy(c.target).add(off);
      if (c.target.distanceTo(goal.current.target) < 0.002 && Math.abs(len - goal.current.dist) < 0.005) goal.current = null;
      c.update();
    }
    if (az.current !== null) {
      let d = az.current - c.getAzimuthalAngle();
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.002) { az.current = null; return; }
      const off = camera.position.clone().sub(c.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), d * 0.12);
      camera.position.copy(c.target).add(off);
      c.update();
    }
  });
  return (
    <OrbitControls ref={controls} makeDefault target={[0, height * 0.53, 0]} enablePan={false} enableZoom={zoomable}
      minDistance={0.45} maxDistance={4.5} minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.58}
      enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.8} />
  );
}

function GltfAvatar({ url, config }: { url: string; config: AvatarConfig }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y || 1;
    scene.scale.setScalar(config.heightCm / 100 / h);
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && /skin|body/i.test(m.name)) m.color.set(config.skinTone);
      o.castShadow = true;
    });
  }, [scene, config.heightCm, config.skinTone]);
  return <primitive object={scene} />;
}

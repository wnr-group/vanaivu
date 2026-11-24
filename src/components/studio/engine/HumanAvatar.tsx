"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  loadHuman, morph, measure, fitProxy, writeSplit, createSkeleton, rebindSkeleton, skinFor, modestyUVs,
  type HumanData, type Measurements,
} from "./human";
import { buildHumanGarment } from "./humanGarments";
import { fabricMaterial, type GarmentSpec, type FitReport } from "./garments";
import type { AvatarConfig } from "./body";

export type Pose = "relaxed" | "a-pose" | "hand-on-hip" | "walk" | "hands-clasped";

const texCache = new Map<string, THREE.Texture>();
function tex(d: HumanData, key: string) {
  const url = d.m.textures[key];
  if (!url) return null;
  let t = texCache.get(url);
  if (!t) {
    t = new THREE.TextureLoader().load("/avatar/" + url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(url, t);
  }
  return t;
}

/**
 * Skin textures are cleaned before use: the areola areas are painted over with the surrounding skin colour
 * (soft-edged), so no anatomical detail is ever visible on the avatar.
 */
function skinTexture(d: HumanData, key: string) {
  const url = d.m.textures[key];
  if (!url) return null;
  const cacheKey = "clean:" + url;
  const t = texCache.get(cacheKey);
  if (t) return t;
  const canvas = document.createElement("canvas");
  const ct = new THREE.CanvasTexture(canvas);
  ct.colorSpace = THREE.SRGBColorSpace;
  ct.anisotropy = 8;
  texCache.set(cacheKey, ct);
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width; canvas.height = img.height;
    const x = canvas.getContext("2d")!;
    x.drawImage(img, 0, 0);
    for (const a of modestyUVs(d)) {
      const cx = a.u * img.width, cy = (1 - a.v) * img.height, r = a.r * img.width;
      // sample the surrounding skin on a ring just outside the area
      let R = 0, G = 0, B = 0, n = 0;
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * Math.PI * 2, px = Math.round(cx + Math.cos(ang) * r * 2.2), py = Math.round(cy + Math.sin(ang) * r * 2.2);
        const p = x.getImageData(px, py, 1, 1).data; R += p[0]; G += p[1]; B += p[2]; n++;
      }
      const rgb = `${Math.round(R / n)},${Math.round(G / n)},${Math.round(B / n)}`;
      const grad = x.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
      grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.7, `rgba(${rgb},1)`); grad.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = grad;
      x.beginPath(); x.arc(cx, cy, r * 2, 0, Math.PI * 2); x.fill();
    }
    ct.needsUpdate = true;
  };
  img.src = "/avatar/" + url;
  return ct;
}

export function HumanAvatar(props: { config: AvatarConfig; garments: (GarmentSpec & { fit?: string })[]; pose?: Pose; onFit?: (r: Record<string, FitReport | null>) => void; onMeasure?: (m: Measurements) => void; onReady?: () => void; onError?: () => void }) {
  const [d, setD] = useState<HumanData | null>(null);
  const { onError } = props;
  useEffect(() => { let live = true; loadHuman().then((x) => live && setD(x)).catch(() => onError?.()); return () => { live = false; }; }, [onError]);
  if (!d) return null;
  return <HumanInner d={d} {...props} />;
}

function HumanInner({ d, config, garments, pose = "relaxed", onFit, onMeasure, onReady }: { d: HumanData; config: AvatarConfig; garments: (GarmentSpec & { fit?: string })[]; pose?: Pose; onFit?: (r: Record<string, FitReport | null>) => void; onMeasure?: (m: Measurements) => void; onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const sk = useMemo(() => createSkeleton(d), [d]);
  const headBone = useMemo(() => d.m.bones.findIndex((b) => b.name === "head"), [d]);

  // ── body geometry (render vertices = unique position/uv pairs) ──
  const body = useMemo(() => {
    const split = d.u32("bodySplit");
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(split.length * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(split.length * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(d.f32("bodyUv")), 2));
    const si = d.u16("skinIndex"), sw = d.f32("skinWeight");
    const sI = new Uint16Array(split.length * 4), sW = new Float32Array(split.length * 4);
    for (let i = 0; i < split.length; i++) for (let k = 0; k < 4; k++) { sI[i * 4 + k] = si[split[i] * 4 + k]; sW[i * 4 + k] = sw[split[i] * 4 + k]; }
    g.setAttribute("skinIndex", new THREE.BufferAttribute(sI, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(sW, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(d.u32("bodyIndex")), 1));
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.58, metalness: 0, sheen: 0.35, sheenRoughness: 0.65, sheenColor: new THREE.Color("#ffcbb4"), clearcoat: 0.06, clearcoatRoughness: 0.6 });
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.name = "body";
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.bind(sk.skeleton, new THREE.Matrix4());
    return { mesh, split };
  }, [d, sk]);

  // ── proxy meshes (eyes, brows, lashes, hair) skinned rigidly to the head ──
  const proxy = useMemo(() => {
    const make = (key: string, mat: THREE.Material) => {
      const split = d.u32(`p:${key}:split`);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(split.length * 3), 3));
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(d.f32(`p:${key}:uv`)), 2));
      g.setAttribute("skinIndex", new THREE.BufferAttribute(new Uint16Array(split.length * 4).map((_, i) => (i % 4 === 0 ? headBone : 0)), 4));
      g.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(split.length * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(d.u32(`p:${key}:index`)), 1));
      const mesh = new THREE.SkinnedMesh(g, mat);
      mesh.name = "proxy:" + key;
      mesh.frustumCulled = false;
      mesh.bind(sk.skeleton, new THREE.Matrix4());
      return { key, mesh, split };
    };
    return { make };
  }, [d, headBone, sk]);

  const eyes = useMemo(() => proxy.make("eyes", new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.1, alphaTest: 0.5, envMapIntensity: 0.6 })), [proxy]);
  const brows = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.08, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
    return proxy.make(config.eyebrows in d.m.proxies ? config.eyebrows : "eyebrow001", m);
  }, [proxy, d, config.eyebrows]);
  const lashes = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.1, depthWrite: false, side: THREE.DoubleSide, color: "#1a1412" });
    const key = config.eyelashes in d.m.proxies ? config.eyelashes : "eyelashes01";
    m.map = tex(d, key);
    return proxy.make(key, m);
  }, [proxy, d, config.eyelashes]);
  const hair = useMemo(() => {
    if (config.hairStyle === "none" || !(config.hairStyle in d.m.proxies)) return null;
    const m = new THREE.MeshPhysicalMaterial({ alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.5, sheen: 1, sheenRoughness: 0.35 });
    m.map = tex(d, config.hairStyle);
    return proxy.make(config.hairStyle, m);
  }, [proxy, d, config.hairStyle]);

  // ── shape (morph) ──
  const shapeKey = JSON.stringify([config.heightCm, config.weight, config.muscle, config.bust, config.cup, config.firmness, config.underbust, config.waist, config.hips, config.belly, config.glutes, config.shoulders, config.arms, config.thighs, config.calves, config.neck, config.legLength, config.african, config.asian, config.european, config.headShape, config.headShapeAmount, config.faceFullness, config.noseWidth, config.noseLength, config.lipsWidth, config.lipsFullness, config.eyeSize]);
  const M = useMemo(() => morph(d, config), [d, shapeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ms = useMemo(() => measure(d, M, config.heightCm), [d, M, config.heightCm]);
  useEffect(() => { onMeasure?.(ms); }, [ms, onMeasure]);

  // apply morph to body + proxies + skeleton
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    const pos = body.mesh.geometry.attributes.position as THREE.BufferAttribute, nor = body.mesh.geometry.attributes.normal as THREE.BufferAttribute;
    writeSplit(body.split, M.pos, pos.array as Float32Array);
    writeSplit(body.split, M.bodyNormals, nor.array as Float32Array);
    pos.needsUpdate = nor.needsUpdate = true;
    body.mesh.geometry.computeBoundingSphere();
    for (const p of [eyes, brows, lashes, hair]) {
      if (!p) continue;
      const fitted = fitProxy(d, p.key, M.pos);
      const a = p.mesh.geometry.attributes.position as THREE.BufferAttribute;
      writeSplit(p.split, fitted, a.array as Float32Array);
      a.needsUpdate = true;
      p.mesh.geometry.computeVertexNormals();
    }
    rebindSkeleton(d, M, sk, g);
    for (const mesh of [body.mesh, eyes.mesh, brows.mesh, lashes.mesh, hair?.mesh]) mesh?.bind(sk.skeleton, new THREE.Matrix4());
    onReady?.();
  }, [d, M, body, eyes, brows, lashes, hair, sk, onReady]);

  // ── materials that depend on colour choices ──
  useEffect(() => {
    const { texture, tint } = skinFor(config.skinTone);
    const mat = body.mesh.material as THREE.MeshPhysicalMaterial;
    mat.map = skinTexture(d, texture); mat.color.copy(tint); mat.needsUpdate = true;
    const em = eyes.mesh.material as THREE.MeshPhysicalMaterial;
    em.map = tex(d, "eye:" + config.eyeColor) ?? tex(d, "eye:brown"); em.needsUpdate = true;
    const bm = brows.mesh.material as THREE.MeshStandardMaterial;
    bm.map = tex(d, brows.key); bm.color.set(config.hairColor).multiplyScalar(0.55); bm.needsUpdate = true;
    if (hair) { const hm = hair.mesh.material as THREE.MeshPhysicalMaterial; hm.color.set(config.hairColor).multiplyScalar(1.6); hm.sheenColor.set(config.hairColor).lerp(new THREE.Color("#ffffff"), 0.4); hm.needsUpdate = true; }
  }, [d, config.skinTone, config.eyeColor, config.hairColor, body, eyes, brows, hair]);

  // ── garments ──
  const allGarments = useMemo<(GarmentSpec & { fit?: string; tuck?: boolean })[]>(() => [
    {
      productId: "__base", slot: "ACCESSORY", silhouette: "base-layer", lengthRatio: 0, ease: 1, fabric: "jersey", pattern: "Solid", colorHex: "#2e2624", size: "", measurements: null,
      // the seamless base layer is only worn where nothing else covers the body
      sleeve: garments.some((g) => g.slot === "TOP" || g.slot === "FULL" || g.slot === "OUTER") ? "no-top" : "",
      neckline: garments.some((g) => g.slot === "BOTTOM" || g.slot === "FULL") ? "no-bottom" : "",
    },
    // tops worn with a bottom are styled tucked in at the waistband
    ...garments.map((g) => (g.slot === "TOP" && garments.some((x) => x.slot === "BOTTOM") ? { ...g, tuck: true } : g)),
  ], [garments]);
  const built = useMemo(() => allGarments.map((spec) => {
    const r = buildHumanGarment(spec, d, M, ms, spec.fit ?? "Regular");
    const meshes = r.pieces.map((p) => {
      const m = new THREE.SkinnedMesh(p.geometry, fabricMaterial(spec, p.role));
      m.name = `garment:${spec.productId}:${p.key}`;
      m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.bind(sk.skeleton, new THREE.Matrix4());
      return { mesh: m, sway: p.sway, base: p.sway ? Float32Array.from((p.geometry.attributes.position as THREE.BufferAttribute).array) : null };
    });
    return { spec, fit: r.fit, meshes };
  }), [allGarments, d, M, ms, sk]);
  useEffect(() => { onFit?.(Object.fromEntries(built.filter((b) => b.spec.productId !== "__base").map((b) => [b.spec.productId, b.fit]))); }, [built, onFit]);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const b of built) for (const { mesh } of b.meshes) { g.add(mesh); mesh.bind(sk.skeleton, new THREE.Matrix4()); }
    return () => { for (const b of built) for (const { mesh } of b.meshes) { g.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } };
  }, [built, sk]);

  // ── poses ──
  const restArm = useMemo(() => {
    const s = M.joints("upperarm01.L____head"), e = M.joints("lowerarm01.L____head");
    return Math.atan2(e.x - s.x, s.y - e.y); // angle from vertical
  }, [M]);
  useFrame(({ clock, scene }) => {
    // guard: any skinned mesh rendered before it was bound would crash the renderer
    scene.traverse((o) => {
      const s = o as THREE.SkinnedMesh;
      if (s.isSkinnedMesh && !s.skeleton) { console.warn("[avatar] unbound skinned mesh", s.name); s.bind(sk.skeleton, new THREE.Matrix4()); }
    });
    const t = clock.elapsedTime;
    const B = sk.byName;
    for (const b of sk.bones) b.quaternion.identity();
    const rootBone = sk.bones[0];
    if (rootBone && !d.m.bones[0].parent) rootBone.position.copy(M.joints(d.m.bones[0].head));
    const rot = (name: string, x: number, y: number, z: number) => { const b = B.get(name); if (b) b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ"))); };
    const breath = Math.sin(t * 1.3) * 0.012;
    rot("spine03", breath, 0, 0);
    const arms = (outL: number, outR: number) => { rot("upperarm01.L", 0, 0, -(restArm - outL)); rot("upperarm01.R", 0, 0, restArm - outR); };
    switch (pose) {
      case "a-pose": break;
      case "relaxed":
        arms(0.1, 0.1); rot("lowerarm01.L", -0.18, 0, 0); rot("lowerarm01.R", -0.18, 0, 0);
        rot("head", 0, Math.sin(t * 0.4) * 0.05, 0);
        break;
      case "hand-on-hip":
        arms(0.1, 0.62); rot("upperarm01.R", 0.45, 0, 0); rot("lowerarm01.R", 0, 0.1, 1.3); rot("wrist.R", 0, 0, -0.3);
        rot("lowerarm01.L", -0.15, 0, 0); rot("spine05", 0, 0, -0.04); rot("pelvis.R", 0, 0, 0.03); rot("head", 0.04, -0.15, 0.04);
        rot("upperleg01.L", -0.05, 0, 0.05); rot("lowerleg01.L", 0.1, 0, 0);
        break;
      case "hands-clasped":
        arms(0.32, 0.32); rot("upperarm01.L", -0.35, 0, 0); rot("upperarm01.R", -0.35, 0, 0);
        rot("lowerarm01.L", -0.9, 0, -0.6); rot("lowerarm01.R", -0.9, 0, 0.6);
        break;
      case "walk": {
        const ph = t * 3.2, s = Math.sin(ph), c = Math.cos(ph);
        arms(0.12, 0.12);
        rot("upperarm01.L", -s * 0.28, 0, 0); rot("upperarm01.R", s * 0.28, 0, 0);
        rot("lowerarm01.L", -0.2 - Math.max(0, -s) * 0.25, 0, 0); rot("lowerarm01.R", -0.2 - Math.max(0, s) * 0.25, 0, 0);
        rot("upperleg01.L", s * 0.36, 0, 0); rot("upperleg01.R", -s * 0.36, 0, 0);
        rot("lowerleg01.L", Math.max(0, -c) * 0.55, 0, 0); rot("lowerleg01.R", Math.max(0, c) * 0.55, 0, 0);
        rot("foot.L", -Math.max(0, s) * 0.2, 0, 0); rot("foot.R", -Math.max(0, -s) * 0.2, 0, 0);
        rot("spine05", 0, s * 0.07, s * 0.035); rot("spine01", 0, -s * 0.06, 0);
        if (rootBone) rootBone.position.y += Math.abs(c) * 0.012;
        break;
      }
    }
    // procedural drape motion for flared hems (visual only)
    for (const b of built) for (const { mesh, sway, base } of b.meshes) {
      if (!sway || !base) continue;
      const p = mesh.geometry.attributes.position as THREE.BufferAttribute;
      const amp = pose === "walk" ? 2.2 : 1;
      for (let i = 0; i < p.count; i++) {
        const y = base[i * 3 + 1], dd = sway.fromY - y;
        if (dd <= 0) continue;
        const x = base[i * 3], z = base[i * 3 + 2], ang = Math.atan2(x, z);
        const k = dd * dd * sway.amount * 0.15 * amp;
        const w = Math.sin(t * (pose === "walk" ? 3.2 : 1.3) + ang * 2 + y * 6) * k;
        p.setXYZ(i, x + Math.sin(ang) * w, y, z + Math.cos(ang) * w);
      }
      p.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      {sk.roots.map((r) => <primitive key={r.uuid} object={r} />)}
      <primitive object={body.mesh} />
      <primitive object={eyes.mesh} />
      <primitive object={brows.mesh} />
      <primitive object={lashes.mesh} />
      {hair && <primitive object={hair.mesh} />}
    </group>
  );
}

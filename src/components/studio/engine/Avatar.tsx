"use client";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { buildBodyModel, loft, type AvatarConfig, type BodyModel } from "./body";
import { buildGarment, fabricMaterial, type GarmentSpec, type FitReport } from "./garments";

/** Procedural avatar provider: body, hair, face details and fitted garments. */
export function ProceduralAvatar({ config, garments, onFit }: { config: AvatarConfig; garments: GarmentSpec[]; onFit?: (r: Record<string, FitReport | null>) => void }) {
  const body = useMemo(() => buildBodyModel(config), [config]);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    // idle: gentle breathing
    group.current.scale.y = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.0015;
  });
  return (
    <group ref={group} position={[0, 0, 0]}>
      <Body body={body} skin={config.skinTone} />
      <Hair body={body} style={config.hairStyle} color={config.hairColor} />
      <Face body={body} config={config} />
      <Garments body={body} config={config} garments={garments} onFit={onFit} />
    </group>
  );
}

function useSkin(hex: string) {
  const m = useMemo(() => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.58, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffd9c4"), clearcoat: 0.04 }), [hex]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

function Body({ body, skin }: { body: BodyModel; skin: string }) {
  const mat = useSkin(skin);
  const geo = useMemo(() => {
    const torso = loft(body.torso, { capTop: true, capBottom: true, steps: 5 });
    const legs = ([1, -1] as const).map((s) => {
      const g = loft(body.leg.map((r) => ({ ...r, cx: s * body.legX })), { capBottom: true, steps: 5 });
      return g;
    });
    const arms = ([1, -1] as const).map((s) => {
      const g = loft(body.arm, { capTop: true, capBottom: true, steps: 5, seg: 36 });
      g.rotateZ(s * body.armAngle);
      g.translate(s * body.armPivot.x, body.armPivot.y, body.armPivot.z);
      return g;
    });
    const hands = ([1, -1] as const).map((s) => {
      const g = new THREE.SphereGeometry(1, 24, 16);
      g.scale(body.upperR * 0.62, body.H * 0.05, body.upperR * 1.05);
      g.translate(0, body.arm[body.arm.length - 1].y - body.H * 0.045, 0);
      g.rotateZ(s * body.armAngle);
      g.translate(s * body.armPivot.x, body.armPivot.y, body.armPivot.z);
      return g;
    });
    const feet = ([1, -1] as const).map((s) => {
      const g = new THREE.SphereGeometry(1, 24, 16);
      g.scale(0.036, 0.03, body.H * 0.075);
      g.translate(s * body.legX * 1.02, 0.028, 0.045);
      return g;
    });
    const head = new THREE.SphereGeometry(1, 48, 36);
    // gently taper the jaw
    const p = head.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0) { const k = 1 - Math.pow(-y, 1.6) * 0.32; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (1 - Math.pow(-y, 2) * 0.12)); }
    }
    head.computeVertexNormals();
    head.scale(body.head.rx, body.head.ry, body.head.rz);
    head.translate(body.head.center.x, body.head.center.y, body.head.center.z);
    const nose = new THREE.SphereGeometry(1, 16, 12);
    nose.scale(body.head.rx * 0.12, body.head.ry * 0.16, body.head.rz * 0.16);
    nose.translate(0, body.head.center.y - body.head.ry * 0.12, body.head.center.z + body.head.rz * 0.92);
    const ears = ([1, -1] as const).map((s) => {
      const g = new THREE.SphereGeometry(1, 12, 10);
      g.scale(body.head.rx * 0.1, body.head.ry * 0.2, body.head.rz * 0.16);
      g.translate(s * body.head.rx * 0.98, body.head.center.y - body.head.ry * 0.05, body.head.center.z - body.head.rz * 0.05);
      return g;
    });
    return [torso, ...legs, ...arms, ...hands, ...feet, head, nose, ...ears];
  }, [body]);
  useEffect(() => () => geo.forEach((g) => g.dispose()), [geo]);
  return <>{geo.map((g, i) => <mesh key={i} geometry={g} material={mat} castShadow receiveShadow />)}</>;
}

function Face({ body, config }: { body: BodyModel; config: AvatarConfig }) {
  const { head } = body;
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1210", roughness: 0.4 }), []);
  const lip = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(config.skinTone).lerp(new THREE.Color("#8c3a3a"), 0.45), roughness: 0.5 }), [config.skinTone]);
  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d6ad60", metalness: 1, roughness: 0.25 }), []);
  const y = head.center.y, z = head.center.z;
  return (
    <group>
      {[1, -1].map((s) => (
        <mesh key={s} material={dark} position={[s * head.rx * 0.36, y + head.ry * 0.08, z + head.rz * 0.86]} scale={[head.rx * 0.085, head.ry * 0.022, head.rz * 0.04]}>
          <sphereGeometry args={[1, 16, 10]} />
        </mesh>
      ))}
      <mesh material={lip} position={[0, y - head.ry * 0.42, z + head.rz * 0.84]} scale={[head.rx * 0.24, head.ry * 0.05, head.rz * 0.08]}><sphereGeometry args={[1, 18, 10]} /></mesh>
      {config.accessories.includes("earrings") && [1, -1].map((s) => (
        <mesh key={s} material={gold} position={[s * head.rx * 1.0, y - head.ry * 0.3, z - head.rz * 0.02]}><torusGeometry args={[0.011, 0.0022, 8, 24]} /></mesh>
      ))}
      {config.accessories.includes("glasses") && (
        <group position={[0, y + head.ry * 0.08, z + head.rz * 0.98]}>
          {[1, -1].map((s) => <mesh key={s} material={dark} position={[s * head.rx * 0.36, 0, 0]}><torusGeometry args={[head.rx * 0.24, 0.0024, 8, 32]} /></mesh>)}
          <mesh material={dark}><boxGeometry args={[head.rx * 0.25, 0.003, 0.003]} /></mesh>
        </group>
      )}
      {config.accessories.includes("necklace") && (
        <mesh material={gold} position={[0, body.Y(0.818), 0.012]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
          <torusGeometry args={[body.neckR * 1.7, 0.0018, 8, 48]} />
        </mesh>
      )}
    </group>
  );
}

function Hair({ body, style, color }: { body: BodyModel; style: AvatarConfig["hairStyle"]; color: string }) {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.35), sheenRoughness: 0.4, side: THREE.DoubleSide }), [color]);
  const { head } = body;
  const geos = useMemo(() => {
    const c = head.center;
    const out: THREE.BufferGeometry[] = [];
    // cap shell over the skull
    const cap = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, style === "pixie" ? Math.PI * 0.5 : Math.PI * 0.52);
    cap.scale(head.rx * 1.07, head.ry * 1.06, head.rz * 1.08);
    cap.rotateX(-0.42);
    cap.translate(c.x, c.y + head.ry * 0.04, c.z - head.rz * 0.04);
    out.push(cap);
    if (style === "long" || style === "bob" || style === "curly") {
      const len = style === "long" ? body.H * 0.2 : style === "bob" ? head.ry * 0.9 : body.H * 0.11;
      const w = style === "curly" ? 1.35 : 1.12;
      const rings = [
        { y: c.y + head.ry * 0.4, rx: head.rx * 1.08 * w * 0.95, rz: head.rz * 1.0, cz: -head.rz * 0.08 },
        { y: c.y, rx: head.rx * 1.12 * w, rz: head.rz * 1.06, cz: -head.rz * 0.14 },
        { y: c.y - head.ry * 0.7, rx: head.rx * 1.12 * w, rz: head.rz * 0.9, cz: -head.rz * 0.3 },
        { y: c.y - len, rx: head.rx * (style === "long" ? 1.5 : 1.1) * w, rz: head.rz * (style === "long" ? 0.45 : 0.75), cz: -head.rz * (style === "long" ? 0.75 : 0.35) },
      ];
      // open at the front: use a partial loft by building then cutting faces with z>front
      const g = loft(rings, { seg: 48, steps: 4, phase: Math.PI });
      const pos = g.attributes.position as THREE.BufferAttribute;
      const idx = g.index!;
      const keep: number[] = [];
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i), b = idx.getX(i + 1), d = idx.getX(i + 2);
        const fz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(d)) / 3 - c.z;
        const fy = (pos.getY(a) + pos.getY(b) + pos.getY(d)) / 3;
        if (fz > head.rz * (fy > c.y + head.ry * 0.25 ? 0.75 : 0.35)) continue; // keep the face clear
        keep.push(a, b, d);
      }
      g.setIndex(keep);
      out.push(g);
      if (style === "curly") {
        for (let i = 0; i < 26; i++) {
          const s = new THREE.SphereGeometry(head.rx * 0.32, 12, 10);
          const a = (i / 26) * Math.PI * 2;
          const yy = c.y + head.ry * (0.6 - (i % 5) * 0.32);
          if (Math.cos(a) > 0.55 && yy < c.y + head.ry * 0.5) continue;
          s.translate(c.x + Math.sin(a) * head.rx * 1.25, yy, c.z + Math.cos(a) * head.rz * 1.15 - head.rz * 0.15);
          out.push(s);
        }
      }
    }
    if (style === "bun") {
      const s = new THREE.SphereGeometry(head.rx * 0.48, 24, 18);
      s.translate(c.x, c.y + head.ry * 0.7, c.z - head.rz * 0.72);
      out.push(s);
    }
    if (style === "ponytail") {
      const g = loft([
        { y: c.y + head.ry * 0.35, rx: head.rx * 0.24, rz: head.rx * 0.24, cz: -head.rz * 1.0 },
        { y: c.y - head.ry * 0.2, rx: head.rx * 0.3, rz: head.rx * 0.26, cz: -head.rz * 1.18 },
        { y: c.y - body.H * 0.13, rx: head.rx * 0.12, rz: head.rx * 0.12, cz: -head.rz * 1.05 },
      ], { seg: 20, steps: 5, capBottom: true });
      out.push(g);
    }
    return out;
  }, [body, head, style]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return <>{geos.map((g, i) => <mesh key={i} geometry={g} material={mat} castShadow />)}</>;
}

function Garments({ body, config, garments, onFit }: { body: BodyModel; config: AvatarConfig; garments: GarmentSpec[]; onFit?: (r: Record<string, FitReport | null>) => void }) {
  const built = useMemo(() => garments.map((g) => ({ spec: g, ...buildGarment(g, body, config) })), [garments, body, config]);
  useEffect(() => { onFit?.(Object.fromEntries(built.map((b) => [b.spec.productId, b.fit]))); }, [built, onFit]);
  useEffect(() => () => built.forEach((b) => b.pieces.forEach((p) => p.geometry.dispose())), [built]);
  return (
    <>
      {built.map((b) => b.pieces.map((p) => <GarmentPiece key={b.spec.productId + p.key} spec={b.spec} piece={p} />))}
    </>
  );
}

function GarmentPiece({ spec, piece }: { spec: GarmentSpec; piece: ReturnType<typeof buildGarment>["pieces"][number] }) {
  const mat = useMemo(() => fabricMaterial(spec, piece.role), [spec, piece.role]);
  useEffect(() => () => mat.dispose(), [mat]);
  const base = useMemo(() => (piece.sway ? Float32Array.from((piece.geometry.attributes.position as THREE.BufferAttribute).array) : null), [piece]);
  useFrame(({ clock }) => {
    // procedural drape motion for flared hems (visual only; not a physical cloth simulation)
    if (!piece.sway || !base) return;
    const pos = piece.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const y = base[i * 3 + 1];
      const d = piece.sway.fromY - y;
      if (d <= 0) continue;
      const x = base[i * 3], z = base[i * 3 + 2];
      const ang = Math.atan2(x, z);
      const k = d * d * piece.sway.amount * 0.18;
      const w = Math.sin(t * 1.3 + ang * 3 + y * 6) * k;
      pos.setXYZ(i, x + Math.sin(ang) * w, y, z + Math.cos(ang) * w + Math.sin(t * 0.9) * k * 0.3);
    }
    pos.needsUpdate = true;
  });
  return <mesh geometry={piece.geometry} material={mat} castShadow receiveShadow />;
}

import * as THREE from "three";

/**
 * Parametric female body model (provider "procedural", skeleton tag "vestra-f1").
 * All lengths are metres. Vertical landmarks are fractions of height.
 * The body is built from lofted elliptical rings, so the same functions that
 * shape the body are used to fit garments around it (single source of truth).
 */

import type { HumanShape } from "./human";

export type AvatarConfig = HumanShape & {
  skinTone: string;
  bodyType: "SLIM" | "ATHLETIC" | "AVERAGE" | "CURVY" | "PLUS";
  heightCm: number; bustCm: number; waistCm: number; hipCm: number; shoulderCm: number; // tape measurements (kept in sync with the realistic mesh)
  hairStyle: string; hairColor: string;
  eyebrows: string; eyelashes: string; eyeColor: string;
  faceShape: "oval" | "round" | "heart" | "long";
  accessories: string[];
};

type ShapeKeys = "weight" | "muscle" | "bust" | "cup" | "waist" | "hips" | "belly" | "glutes" | "shoulders" | "arms" | "thighs";
export const BODY_PRESETS: Record<AvatarConfig["bodyType"], Pick<AvatarConfig, "bustCm" | "waistCm" | "hipCm" | "shoulderCm" | ShapeKeys>> = {
  SLIM: { bustCm: 80, waistCm: 62, hipCm: 86, shoulderCm: 36, weight: 0.2, muscle: 0.45, bust: -0.15, cup: -0.15, waist: -0.3, hips: -0.25, belly: -0.2, glutes: -0.1, shoulders: -0.1, arms: -0.25, thighs: -0.25 },
  ATHLETIC: { bustCm: 86, waistCm: 68, hipCm: 92, shoulderCm: 40, weight: 0.4, muscle: 0.8, bust: 0, cup: 0, waist: -0.2, hips: 0, belly: -0.2, glutes: 0.1, shoulders: 0.2, arms: 0.05, thighs: 0.1 },
  AVERAGE: { bustCm: 90, waistCm: 74, hipCm: 98, shoulderCm: 38, weight: 0.5, muscle: 0.5, bust: 0, cup: 0, waist: 0, hips: 0, belly: 0, glutes: 0, shoulders: 0, arms: 0, thighs: 0 },
  CURVY: { bustCm: 96, waistCm: 74, hipCm: 106, shoulderCm: 38, weight: 0.58, muscle: 0.45, bust: 0.15, cup: 0.1, waist: -0.2, hips: 0.35, belly: 0, glutes: 0.15, shoulders: 0, arms: 0.05, thighs: 0.2 },
  PLUS: { bustCm: 108, waistCm: 94, hipCm: 118, shoulderCm: 41, weight: 0.85, muscle: 0.4, bust: 0.15, cup: 0.1, waist: 0.3, hips: 0.35, belly: 0.15, glutes: 0.15, shoulders: 0.1, arms: 0.25, thighs: 0.3 },
};

export const SKIN_TONES = [
  { name: "Porcelain", hex: "#F6DDCC" }, { name: "Fair", hex: "#EFCDB4" }, { name: "Light", hex: "#E6BC9C" }, { name: "Light Beige", hex: "#DDB08A" },
  { name: "Wheatish", hex: "#D2A27A" }, { name: "Golden", hex: "#C69068" }, { name: "Olive", hex: "#B8875E" }, { name: "Honey", hex: "#AA7650" },
  { name: "Tan", hex: "#9A6744" }, { name: "Caramel", hex: "#8A5A3A" }, { name: "Brown", hex: "#784B30" }, { name: "Chestnut", hex: "#663E28" },
  { name: "Espresso", hex: "#523220" }, { name: "Deep", hex: "#422819" }, { name: "Ebony", hex: "#321E13" },
];
export const HAIR_COLOURS = [
  { name: "Jet Black", hex: "#0e0c0c" }, { name: "Soft Black", hex: "#1c1714" }, { name: "Dark Brown", hex: "#33221a" }, { name: "Chestnut", hex: "#5a3420" },
  { name: "Auburn", hex: "#7c3320" }, { name: "Copper", hex: "#a5532c" }, { name: "Caramel", hex: "#9a6a3e" }, { name: "Honey Blonde", hex: "#b88d55" },
  { name: "Ash Blonde", hex: "#b7a588" }, { name: "Platinum", hex: "#ddd3c2" }, { name: "Silver", hex: "#a9a7a4" }, { name: "Burgundy", hex: "#5b1a26" },
];
export const HAIR_STYLES = [
  { key: "long01", name: "Long" }, { key: "bob01", name: "Bob" }, { key: "bob02", name: "Lob" }, { key: "ponytail01", name: "Ponytail" },
  { key: "braid01", name: "Braid" }, { key: "afro01", name: "Afro" }, { key: "short02", name: "Pixie" }, { key: "short04", name: "Crop" }, { key: "none", name: "None" },
];
export const EYE_COLOURS = [
  { key: "brown", hex: "#4a2c1a" }, { key: "brownlight", hex: "#7a5230" }, { key: "green", hex: "#5c7a4a" }, { key: "bluegreen", hex: "#4f7f80" },
  { key: "blue", hex: "#4b6f9e" }, { key: "lightblue", hex: "#86a8c8" }, { key: "deepblue", hex: "#2f4f86" }, { key: "grey", hex: "#7f8a90" }, { key: "ice", hex: "#b8cbd6" },
];
export const BROWS = ["eyebrow001", "eyebrow002", "eyebrow006", "eyebrow009"];
export const LASHES = ["eyelashes01", "eyelashes02"];

export const SHAPE_DEFAULT: HumanShape = {
  heightCm: 165, weight: 0.5, muscle: 0.5, bust: 0, cup: 0, firmness: 0.2, underbust: 0, waist: 0, hips: 0, belly: 0, glutes: 0,
  shoulders: 0, arms: 0, thighs: 0, calves: 0, neck: 0, legLength: 0, african: 0.2, asian: 0.3, european: 0.5,
  headShape: "oval", headShapeAmount: 0.4, faceFullness: 0, noseWidth: 0, noseLength: 0, lipsWidth: 0, lipsFullness: 0.2, eyeSize: 0,
};

export const DEFAULT_AVATAR: AvatarConfig = {
  ...SHAPE_DEFAULT,
  skinTone: "#B8875E", bodyType: "AVERAGE", bustCm: 88, waistCm: 70, hipCm: 96, shoulderCm: 38,
  hairStyle: "long01", hairColor: "#1c1714", eyebrows: "eyebrow001", eyelashes: "eyelashes02", eyeColor: "brown", faceShape: "oval", accessories: [],
};

/** Fills fields missing from older saved avatars. */
export const normalizeAvatar = (c: Partial<AvatarConfig>): AvatarConfig => {
  const merged = { ...DEFAULT_AVATAR, ...c } as AvatarConfig;
  if (!HAIR_STYLES.some((h) => h.key === merged.hairStyle)) merged.hairStyle = DEFAULT_AVATAR.hairStyle;
  return merged;
};

const P = (o: Partial<AvatarConfig>): AvatarConfig => ({ ...DEFAULT_AVATAR, ...o });
export const AVATAR_PRESETS: { name: string; config: AvatarConfig }[] = [
  { name: "Ira", config: P({ skinTone: "#AA7650", african: 0.15, asian: 0.45, european: 0.4, hairStyle: "long01", hairColor: "#1c1714" }) },
  { name: "Maya", config: P({ skinTone: "#523220", bodyType: "CURVY", ...BODY_PRESETS.CURVY, heightCm: 168, african: 0.9, asian: 0, european: 0.1, hairStyle: "afro01", hairColor: "#1c1714", lipsFullness: 0.3, noseWidth: 0.2 }) },
  { name: "Elena", config: P({ skinTone: "#EFCDB4", bodyType: "SLIM", ...BODY_PRESETS.SLIM, heightCm: 176, african: 0, asian: 0, european: 1, hairStyle: "bob01", hairColor: "#b88d55", eyeColor: "blue", headShape: "heart" }) },
  { name: "Mei", config: P({ skinTone: "#E6BC9C", heightCm: 158, african: 0, asian: 1, european: 0, hairStyle: "long01", hairColor: "#0e0c0c", eyebrows: "eyebrow006", weight: 0.4, headShape: "round" }) },
  { name: "Noor", config: P({ skinTone: "#C69068", bodyType: "ATHLETIC", ...BODY_PRESETS.ATHLETIC, heightCm: 170, african: 0.1, asian: 0.2, european: 0.7, hairStyle: "ponytail01", hairColor: "#33221a", eyeColor: "green" }) },
  { name: "Asha", config: P({ skinTone: "#784B30", bodyType: "PLUS", ...BODY_PRESETS.PLUS, heightCm: 160, african: 0.3, asian: 0.5, european: 0.2, hairStyle: "braid01", hairColor: "#1c1714", faceFullness: 0.4 }) },
];

// ── ellipse helpers ─────────────────────────────────────────────
/** Ellipse semi-axes (m) for a circumference (cm) and depth/width ratio k (Ramanujan). */
export function ellipse(circCm: number, k: number) {
  const C = circCm / 100;
  const a = C / (Math.PI * (3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))));
  return { rx: a, rz: a * k };
}
export const circOf = (rx: number, rz: number) =>
  Math.PI * (3 * (rx + rz) - Math.sqrt((3 * rx + rz) * (rx + 3 * rz))) * 100;

export type Ring = { y: number; rx: number; rz: number; cx?: number; cz?: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
/** Catmull-Rom interpolation of ring i→i+1 at parameter t (continuous curvature, no plateaus at key rings). */
function crRing(rings: Ring[], i: number, t: number, y: number): Ring {
  const p0 = rings[Math.max(0, i - 1)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(rings.length - 1, i + 2)];
  const f = (k: 'rx' | 'rz' | 'cx' | 'cz') => cr(p0[k] ?? 0, p1[k] ?? 0, p2[k] ?? 0, p3[k] ?? 0, t);
  return { y, rx: Math.max(0.001, f('rx')), rz: Math.max(0.001, f('rz')), cx: f('cx'), cz: f('cz') };
}

/** Interpolates a ring list (sorted top→bottom by y) at height y. */
export function sampleRings(rings: Ring[], y: number): Ring {
  if (y >= rings[0].y) return { ...rings[0], y };
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i], b = rings[i + 1];
    if (y <= a.y && y >= b.y) {
      return crRing(rings, i, (a.y - y) / (a.y - b.y || 1), y);
    }
  }
  return { ...rings[rings.length - 1], y };
}

export type BodyModel = ReturnType<typeof buildBodyModel>;

export function buildBodyModel(c: AvatarConfig) {
  const H = c.heightCm / 100;
  const Y = (f: number) => f * H;
  const curvy = c.bodyType === "CURVY" ? 1 : c.bodyType === "PLUS" ? 0.6 : 0;
  const soft = c.bodyType === "PLUS" ? 1 : c.bodyType === "AVERAGE" ? 0.35 : 0;
  const athletic = c.bodyType === "ATHLETIC" ? 1 : 0;

  const bust = ellipse(c.bustCm, 0.74);
  const under = ellipse(c.waistCm + (c.bustCm - c.waistCm) * 0.55, 0.72);
  const waist = ellipse(c.waistCm, 0.74 + soft * 0.08);
  const hip = ellipse(c.hipCm, 0.7);
  const highHip = ellipse((c.waistCm + c.hipCm) / 2 + soft * 3, 0.72);
  const shoulderHalf = c.shoulderCm / 200;
  const neckR = 0.047 + (c.bustCm - 88) * 0.00025;

  // Torso, top → bottom. cz pushes the bust forward slightly.
  const torso: Ring[] = [
    { y: Y(0.868), rx: neckR, rz: neckR * 0.95, cz: -0.006 },
    { y: Y(0.84), rx: neckR * 1.15, rz: neckR * 1.05, cz: -0.008 },
    { y: Y(0.826), rx: shoulderHalf * 0.68, rz: bust.rz * 0.6, cz: -0.01 },
    { y: Y(0.806), rx: shoulderHalf * 0.96, rz: bust.rz * 0.72, cz: -0.008 },
    { y: Y(0.775), rx: Math.max(bust.rx * 1.02, shoulderHalf * 0.92), rz: bust.rz * 0.86, cz: 0.0 },
    { y: Y(0.735), rx: bust.rx, rz: bust.rz, cz: 0.012 + curvy * 0.006 },
    { y: Y(0.695), rx: under.rx, rz: under.rz * 0.92, cz: 0.004 },
    { y: Y(0.63), rx: waist.rx, rz: waist.rz, cz: soft * 0.008 },
    { y: Y(0.58), rx: highHip.rx, rz: highHip.rz, cz: soft * 0.01 },
    { y: Y(0.53), rx: hip.rx, rz: hip.rz, cz: -0.006 - curvy * 0.006 },
    { y: Y(0.495), rx: hip.rx * 0.93, rz: hip.rz * 0.9, cz: -0.006 },
    { y: Y(0.468), rx: hip.rx * 0.62, rz: hip.rz * 0.55, cz: 0 },
  ];

  // Legs (per side). Thigh circumference scales with hip.
  const thighC = c.hipCm * (0.56 + curvy * 0.03 + soft * 0.02 - athletic * 0.01);
  const thigh = ellipse(thighC, 0.95);
  const legX = Math.max(hip.rx * 0.48, thigh.rx * 0.98);
  const kneeR = 0.05 + soft * 0.006;
  const leg: Ring[] = [
    { y: Y(0.505), rx: thigh.rx * 1.02, rz: thigh.rz * 1.02 },
    { y: Y(0.44), rx: thigh.rx, rz: thigh.rz },
    { y: Y(0.36), rx: thigh.rx * 0.82, rz: thigh.rz * 0.84 },
    { y: Y(0.285), rx: kneeR, rz: kneeR * 1.04, cz: 0.004 },
    { y: Y(0.215), rx: kneeR * 1.02, rz: kneeR * 1.14, cz: -0.006 },
    { y: Y(0.12), rx: kneeR * 0.72, rz: kneeR * 0.76 },
    { y: Y(0.055), rx: 0.03, rz: 0.032 },
    { y: Y(0.035), rx: 0.031, rz: 0.036 },
  ];

  // Arms (local space: shoulder joint at origin, hanging along −y).
  const armScale = Math.sqrt(c.bustCm / 88);
  const upperR = 0.043 * armScale + soft * 0.006;
  const arm: Ring[] = [
    { y: 0.02, rx: upperR * 0.9, rz: upperR * 0.9 },
    { y: -0.03, rx: upperR * 1.08, rz: upperR * 1.02 },
    { y: -Y(0.1), rx: upperR, rz: upperR * 0.96 },
    { y: -Y(0.185), rx: upperR * 0.72, rz: upperR * 0.72 },
    { y: -Y(0.235), rx: upperR * 0.74, rz: upperR * 0.7 },
    { y: -Y(0.325), rx: upperR * 0.5, rz: upperR * 0.42 },
    { y: -Y(0.335), rx: upperR * 0.48, rz: upperR * 0.38 },
  ];
  const armPivot = new THREE.Vector3(shoulderHalf * 0.86, Y(0.8), -0.008);
  const armAngle = 0.16 + (c.bustCm - 80) * 0.0016 + soft * 0.06; // A-pose, wider for fuller figures

  const headH = H * 0.128;
  const face = { oval: [1, 1], round: [1.08, 0.95], heart: [1.03, 1], long: [0.95, 1.08] }[c.faceShape];

  return {
    H, Y, torso, leg, legX, arm, armPivot, armAngle, upperR, neckR, shoulderHalf,
    head: { center: new THREE.Vector3(0, Y(0.932), 0.006), rx: headH * 0.39 * face[0], ry: headH * 0.52 * face[1], rz: headH * 0.47 },
    torsoAt: (y: number) => sampleRings(torso, y),
    legAt: (y: number) => sampleRings(leg, y),
    armAt: (y: number) => sampleRings(arm, y),
    /** world-space wrist position (for bracelets / bags) */
    wrist(side: 1 | -1) {
      const p = new THREE.Vector3(0, arm[arm.length - 2].y, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), side * armAngle);
      return p.add(new THREE.Vector3(side * armPivot.x, armPivot.y, armPivot.z));
    },
  };
}

// ── geometry ─────────────────────────────────────────────
/** Lofts a sequence of elliptical rings into a smooth tube. Optional caps. */
export function loft(rings: Ring[], opts: { seg?: number; steps?: number; capTop?: boolean; capBottom?: boolean; phase?: number } = {}) {
  const seg = opts.seg ?? 56;
  const steps = opts.steps ?? 4;
  // densify between key rings
  const dense: Ring[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push(crRing(rings, i, t, lerp(rings[i].y, rings[i + 1].y, t)));
    }
  }
  dense.push(rings[rings.length - 1]);

  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const totalLen = dense.reduce((s, r, i) => (i ? s + Math.abs(dense[i - 1].y - r.y) : 0), 0) || 1;
  let acc = 0;
  dense.forEach((r, i) => {
    if (i) acc += Math.abs(dense[i - 1].y - r.y);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2 + (opts.phase ?? 0);
      pos.push((r.cx ?? 0) + r.rx * Math.sin(th), r.y, (r.cz ?? 0) + r.rz * Math.cos(th));
      uv.push(j / seg, 1 - acc / totalLen);
    }
  });
  const row = seg + 1;
  for (let i = 0; i < dense.length - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const addCap = (ringIdx: number, top: boolean) => {
    const r = dense[ringIdx];
    const center = pos.length / 3;
    pos.push(r.cx ?? 0, r.y, r.cz ?? 0);
    uv.push(0.5, top ? 1 : 0);
    for (let j = 0; j < seg; j++) {
      const a = ringIdx * row + j, b = a + 1;
      if (top) idx.push(center, a, b); else idx.push(center, b, a);
    }
  };
  if (opts.capTop) addCap(0, true);
  if (opts.capBottom) addCap(dense.length - 1, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld seam normals
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < dense.length; i++) {
    const a = i * row, b = i * row + seg;
    const nx = (n.getX(a) + n.getX(b)) / 2, ny = (n.getY(a) + n.getY(b)) / 2, nz = (n.getZ(a) + n.getZ(b)) / 2;
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l); n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

/** Ribbon along a curve, oriented to face away from the body's vertical axis (used for saree pallu, straps). */
export function ribbon(points: THREE.Vector3[], width: number, segments = 60) {
  const curve = new THREE.CatmullRomCurve3(points);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    const side = new THREE.Vector3().crossVectors(tan, out).normalize().multiplyScalar(width / 2);
    pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
    uv.push(0, t, 1, t);
    if (i < segments) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

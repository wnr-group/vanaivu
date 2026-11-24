import * as THREE from "three";
import { loft, ribbon, type Ring } from "./body";
import type { GarmentSpec, FitReport } from "./garments";
import { vertexRegions, type HumanData, type Morphed, type Measurements, type Region } from "./human";

/**
 * Garments for the realistic avatar. Fitted parts are cut from the customer's own morphed body surface
 * and pushed out along the surface normal by the garment's ease for the chosen size, so the cloth follows
 * her real shape. Flared parts (skirts, gowns, coat skirts) are lofted around the legs from measured slices.
 * Every vertex carries skin weights, so garments move with the avatar's poses.
 */
export type HumanPiece = { key: string; geometry: THREE.BufferGeometry; role: "fabric" | "trim" | "metal" | "leather"; sway?: { fromY: number; amount: number } };

const LAYER = { BOTTOM: 0.004, TOP: 0.007, FULL: 0.006, OUTER: 0.016, ACCESSORY: 0 } as const;
const FIT_EASE: Record<string, number> = { slim: 0.003, regular: 0.007, relaxed: 0.013, oversized: 0.022 };

let trisCache: Uint32Array | null = null;
function origTris(d: HumanData) {
  if (trisCache) return trisCache;
  const split = d.u32("bodySplit"), idx = d.u32("bodyIndex");
  const t = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) t[i] = split[idx[i]];
  return (trisCache = t);
}

function boneIndex(d: HumanData, name: string) { return Math.max(0, d.m.bones.findIndex((b) => b.name === name)); }

export function buildHumanGarment(spec: GarmentSpec & { tuck?: boolean }, d: HumanData, M: Morphed, ms: Measurements, fitHint: string): { pieces: HumanPiece[]; fit: FitReport | null } {
  const { regions } = vertexRegions(d);
  const P = M.pos, N = M.bodyNormals, L = ms.levels;
  const si = d.u16("skinIndex"), sw = d.f32("skinWeight");
  const layer = LAYER[spec.slot];
  const limbEase = FIT_EASE[fitHint.toLowerCase()] ?? 0.007;

  // ── size fit: ease = garment circumference − body circumference
  const m = spec.measurements;
  const ease = m ? { bust: m.bust - ms.bustCm, waist: m.waist - ms.waistCm, hip: m.hip - ms.hipCm } : null;
  const fit: FitReport | null = ease ? (() => {
    const rel = spec.slot === "BOTTOM" ? [ease.waist, ease.hip] : spec.slot === "TOP" ? [ease.bust, ease.waist] : [ease.bust, ease.waist, ease.hip];
    const lo = Math.min(...rel), hi = Math.max(...rel);
    return { ...ease, status: lo < 0 ? "tight" : lo < 4 ? "close" : hi > 16 ? "loose" : "comfortable" };
  })() : null;
  const radial = (cm: number) => Math.max(0.0015, (cm / (2 * Math.PI)) / 100);
  const torsoEase = (y: number) => {
    if (!ease) return limbEase;
    const b = radial(ease.bust), w = radial(ease.waist), h = radial(ease.hip);
    if (y >= L.bust) return b;
    if (y >= L.waist) return w + (b - w) * ((y - L.waist) / (L.bust - L.waist));
    if (y >= L.hip) return h + (w - h) * ((y - L.hip) / (L.waist - L.hip));
    return h;
  };

  const pieces: HumanPiece[] = [];
  const shoulderJ = { L: M.joints("upperarm01.L____head"), R: M.joints("upperarm01.R____head") };
  const armDist = (i: number) => {
    const x = P[i * 3], s = x > 0 ? shoulderJ.L : shoulderJ.R;
    return Math.hypot(x - s.x, P[i * 3 + 1] - s.y, P[i * 3 + 2] - s.z);
  };
  const armLen = shoulderJ.L.distanceTo(M.joints("wrist.L____head"));

  /**
   * Builds a skinned shell from body vertices that pass `keep`.
   * The body surface under the garment is first smoothed (Taubin) so fabric doesn't reveal fine anatomy,
   * then the front of the torso is bridged with a convex envelope so cloth spans concavities (cleavage, navel)
   * the way real fabric does, and finally pushed out along the normal by the garment's ease.
   */
  const shell = (key: string, keep: (i: number, r: Region) => boolean, extra: (i: number, r: Region) => number, sway?: HumanPiece["sway"], role: HumanPiece["role"] = "fabric", opts: { smooth?: number; bridge?: boolean; cuts?: number[] } = {}) => {
    const tris = origTris(d);
    const map = new Map<number, number>();
    const verts: number[] = [], index: number[] = [];
    const sel = new Uint8Array(d.m.vertexCount);
    for (let i = 0; i < sel.length; i++) sel[i] = keep(i, regions[i]) ? 1 : 0;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t], b = tris[t + 1], c = tris[t + 2];
      if (sel[a] + sel[b] + sel[c] < 2) continue; // 2-of-3 keeps edges from notching
      for (const v of [a, b, c]) {
        let k = map.get(v);
        if (k === undefined) { k = map.size; map.set(v, k); verts.push(v); }
        index.push(k);
      }
    }
    if (!index.length) return;
    const n = verts.length;
    // adjacency + boundary detection
    const nb: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
    const edgeCount = new Map<string, number>();
    for (let t = 0; t < index.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = index[t + e], b = index[t + ((e + 1) % 3)];
        nb[a].add(b); nb[b].add(a);
        const k = a < b ? `${a}_${b}` : `${b}_${a}`;
        edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
      }
    }
    const boundary = new Uint8Array(n);
    for (const [k, cnt] of edgeCount) if (cnt === 1) { const [a, b] = k.split("_").map(Number); boundary[a] = boundary[b] = 1; }
    let B = new Float32Array(n * 3);
    verts.forEach((v, k) => { B[k * 3] = P[v * 3]; B[k * 3 + 1] = P[v * 3 + 1]; B[k * 3 + 2] = P[v * 3 + 2]; });
    // snap edge vertices onto horizontal cut lines (hems, bands) for clean straight edges
    for (const cut of opts.cuts ?? []) for (let k = 0; k < n; k++) if (boundary[k] && Math.abs(B[k * 3 + 1] - cut) < 0.05) B[k * 3 + 1] = cut;
    const iters = opts.smooth ?? 10;
    for (let it = 0; it < iters * 2; it++) {
      const f = it % 2 === 0 ? 0.5 : -0.53;
      const nxt = new Float32Array(B);
      for (let k = 0; k < n; k++) {
        if (boundary[k] || !nb[k].size) continue;
        let x = 0, y = 0, z = 0;
        for (const j of nb[k]) { x += B[j * 3]; y += B[j * 3 + 1]; z += B[j * 3 + 2]; }
        const s = nb[k].size;
        nxt[k * 3] += f * (x / s - B[k * 3]); nxt[k * 3 + 1] += f * (y / s - B[k * 3 + 1]); nxt[k * 3 + 2] += f * (z / s - B[k * 3 + 2]);
      }
      B = nxt;
    }
    if (opts.bridge !== false) {
      // convex front envelope per 1 cm band across the torso: fabric bridges the cleavage and navel
      const bands = new Map<number, number[]>();
      verts.forEach((v, k) => {
        const r = regions[v];
        if (!(r === "torso" || r === "pelvis") || B[k * 3 + 2] <= 0 || B[k * 3 + 1] > L.bust - 0.08) return;
        const bnd = Math.round(B[k * 3 + 1] * 100);
        if (!bands.has(bnd)) bands.set(bnd, []);
        bands.get(bnd)!.push(k);
      });
      for (const ks of bands.values()) {
        const pts = ks.map((k) => [B[k * 3], B[k * 3 + 2]] as [number, number]).sort((a, b) => a[0] - b[0]);
        const hull: [number, number][] = [];
        for (const p of pts) {
          while (hull.length >= 2) {
            const [o, a] = [hull[hull.length - 2], hull[hull.length - 1]];
            if ((a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]) >= 0) hull.pop(); else break;
          }
          hull.push(p);
        }
        for (const k of ks) {
          const x = B[k * 3];
          for (let h = 0; h < hull.length - 1; h++) {
            const [a, b] = [hull[h], hull[h + 1]];
            if (x >= a[0] && x <= b[0]) {
              const zH = a[1] + ((b[1] - a[1]) * (x - a[0])) / ((b[0] - a[0]) || 1);
              if (zH > B[k * 3 + 2]) B[k * 3 + 2] = zH;
              break;
            }
          }
        }
      }
    }
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], sIdx: number[] = [], sWt: number[] = [];
    verts.forEach((v, k) => {
      const off = layer + extra(v, regions[v]);
      // never inside the body: keep at least the intended offset outside the real skin surface
      const out = (B[k * 3] - P[v * 3]) * N[v * 3] + (B[k * 3 + 1] - P[v * 3 + 1]) * N[v * 3 + 1] + (B[k * 3 + 2] - P[v * 3 + 2]) * N[v * 3 + 2];
      if (out < 0) { B[k * 3] -= N[v * 3] * out; B[k * 3 + 1] -= N[v * 3 + 1] * out; B[k * 3 + 2] -= N[v * 3 + 2] * out; }
      pos.push(B[k * 3] + N[v * 3] * off, B[k * 3 + 1] + N[v * 3 + 1] * off, B[k * 3 + 2] + N[v * 3 + 2] * off);
      nor.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
      uv.push(Math.atan2(P[v * 3], P[v * 3 + 2]) / (2 * Math.PI) + 0.5, P[v * 3 + 1] * 2);
      for (let q = 0; q < 4; q++) { sIdx.push(si[v * 4 + q]); sWt.push(sw[v * 4 + q]); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(sIdx, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sWt, 4));
    g.setIndex(index);
    g.computeVertexNormals();
    pieces.push({ key, geometry: g, role, sway });
  };

  /** Skins arbitrary geometry rigidly (or blended by side) to named bones. */
  const rig = (g: THREE.BufferGeometry, boneFor: (x: number, y: number) => [string, number][]) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    const sI: number[] = [], sW: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const bw = boneFor(p.getX(i), p.getY(i)).slice(0, 4);
      while (bw.length < 4) bw.push(["root", 0]);
      for (const [b, w] of bw) { sI.push(boneIndex(d, b)); sW.push(w); }
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(sI, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sW, 4));
    return g;
  };

  /** Horizontal slice extents of the body (torso + legs) used to loft skirts that enclose both legs. */
  const legSlice = (y: number) => {
    let maxX = 0, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < d.m.vertexCount; i++) {
      const r = regions[i];
      if (!(r === "pelvis" || r === "thigh" || r === "shin" || r === "torso")) continue;
      if (Math.abs(P[i * 3 + 1] - y) > 0.012) continue;
      maxX = Math.max(maxX, Math.abs(P[i * 3])); minZ = Math.min(minZ, P[i * 3 + 2]); maxZ = Math.max(maxZ, P[i * 3 + 2]);
    }
    if (!isFinite(minZ)) return { rx: 0.05, rz: 0.05, cz: 0 };
    return { rx: maxX, rz: (maxZ - minZ) / 2, cz: (maxZ + minZ) / 2 };
  };

  // ── skirts: lofted from the body's real cross-sections ──
  const tris = origTris(d);
  const sliceHull = (y: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let t = 0; t < tris.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const i0 = tris[t + e], i1 = tris[t + ((e + 1) % 3)];
        const r0 = regions[i0], r1 = regions[i1];
        const ok = (r: Region) => r === "torso" || r === "pelvis" || r === "thigh" || r === "shin" || r === "breast";
        if (!ok(r0) || !ok(r1)) continue;
        const y0 = P[i0 * 3 + 1], y1 = P[i1 * 3 + 1];
        if ((y0 - y) * (y1 - y) >= 0) continue;
        const f = (y - y0) / (y1 - y0);
        pts.push([P[i0 * 3] + (P[i1 * 3] - P[i0 * 3]) * f, P[i0 * 3 + 2] + (P[i1 * 3 + 2] - P[i0 * 3 + 2]) * f]);
      }
    }
    if (pts.length < 3) return pts;
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo: [number, number][] = [], up: [number, number][] = [];
    for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  /** Distance from (cx,cz) to the hull boundary along angle th (x = sin, z = cos). */
  const rayHull = (hull: [number, number][], cx: number, cz: number, th: number) => {
    const dx = Math.sin(th), dz = Math.cos(th);
    let best = 0;
    for (let i = 0; i < hull.length; i++) {
      const [ax, az] = hull[i], [bx, bz] = hull[(i + 1) % hull.length];
      const ex = bx - ax, ez = bz - az;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - cx) * ez - (az - cz) * ex) / den;
      const u = ((ax - cx) * dz - (az - cz) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
    }
    return best;
  };

  const skirt = (key: string, fromY: number, hemY: number, flare: number, extra = 0, seg = 72) => {
    const n = 18;
    const topHull = sliceHull(fromY);
    if (topHull.length < 3) return;
    const cx = 0, cz = topHull.reduce((s, q) => s + q[1], 0) / topHull.length;
    const gap = layer + extra + (ease ? radial(Math.max(ease.hip, 0)) : limbEase) + 0.004;
    const taper = flare < 0.1 ? 0.1 : 0.02;
    const R: number[][] = [], Ys: number[] = [];
    let lastHull = topHull;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1), y = fromY + (hemY - fromY) * t, drop = fromY - y;
      const h = k === 0 ? topHull : sliceHull(y);
      if (h.length >= 3) lastHull = h;
      const row: number[] = [];
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const rTop = rayHull(topHull, cx, cz, th) + gap;
        const rBody = rayHull(lastHull, cx, cz, th) + gap;
        const folds = Math.sin(th * 9 + k * 0.35) * flare * drop * 0.05;
        row.push(Math.max(rBody, rTop * (1 - taper * t) + flare * drop * 0.55 + folds));
      }
      R.push(row); Ys.push(y);
    }
    // vertical smoothing so the fabric falls in one clean line (top ring stays on the body)
    for (let pass = 0; pass < 3; pass++)
      for (let k = 1; k < n - 1; k++) for (let j = 0; j <= seg; j++) R[k][j] = R[k][j] * 0.5 + (R[k - 1][j] + R[k + 1][j]) * 0.25;
    for (let k = 0; k < n; k++) R[k][seg] = R[k][0];
    const pos: number[] = [], idx: number[] = [], uv: number[] = [];
    for (let k = 0; k < n; k++) for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      pos.push(cx + R[k][j] * Math.sin(th), Ys[k], cz + R[k][j] * Math.cos(th));
      uv.push(j / seg, Ys[k] * 2);
    }
    const row = seg + 1;
    for (let k = 0; k < n - 1; k++) for (let j = 0; j < seg; j++) { const a = k * row + j, b = a + 1, c2 = a + row, d2 = c2 + 1; idx.push(a, c2, b, b, c2, d2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const span = fromY - hemY;
    rig(g, (x, y) => {
      const t = Math.min(1, Math.max(0, (fromY - y) / (span || 1)));
      const leg = x >= 0 ? "upperleg01.L" : "upperleg01.R";
      return [["root", 1 - t * 0.3], [leg, t * 0.3]];
    });
    pieces.push({ key, geometry: g, role: "fabric", sway: flare > 0.12 ? { fromY: fromY - 0.05, amount: 0.5 * flare } : undefined });
  };

  // ── shape helpers
  const neckOK = (i: number, r: Region, kind: string) => {
    if (r === "head" || r === "neck") return false;
    const y = P[i * 3 + 1], x = Math.abs(P[i * 3]), z = P[i * 3 + 2];
    if (kind === "V-neck" && z > 0 && y > L.bust + 0.03 + x * 1.6) return false;
    if (kind === "Square" && z > 0 && y > L.bust + 0.07 && x < 0.085) return false;
    if (kind === "Off-shoulder" && y > L.bust + 0.085) return false;
    if (kind === "Halter" && (y > L.bust + 0.06 && x > 0.05)) return false;
    if (kind === "Boat" && y > L.shoulder + 0.012) return false;
    return true;
  };
  const sleeveOK = (i: number, r: Region, sleeve: string) => {
    if (r === "hand") return false;
    if (r !== "arm" && r !== "forearm") return true;
    const dist = armDist(i) / armLen;
    if (sleeve === "Sleeveless" || sleeve === "NA") return false;
    if (sleeve === "Short") return dist < 0.3;
    if (sleeve === "Three-quarter") return dist < 0.72;
    return dist < 0.96;
  };
  const sleevelessCut = (i: number, r: Region) => {
    // armholes for sleeveless tops: drop the shoulder cap and side above the armpit
    const y = P[i * 3 + 1], x = Math.abs(P[i * 3]);
    return !(y > L.shoulder - 0.06 && x > 0.09);
  };
  const isLeg = (r: Region) => r === "thigh" || r === "shin" || r === "foot";

  const top = (key: string, hemIn: number, sleeve: string, neckline: string, extra = 0) => {
    const hemY = Math.max(hemIn, L.crotch + 0.035); // fitted parts end above the crotch; anything longer is lofted
    shell(key, (i, r) => {
      const yy = P[i * 3 + 1];
      if (yy < hemY || r === "shin" || r === "foot") return false;
      if (!neckOK(i, r, neckline)) return false;
      if (!sleeveOK(i, r, sleeve)) return false;
      if ((sleeve === "Sleeveless" || neckline === "Halter") && neckline !== "Off-shoulder" && !sleevelessCut(i, r)) return false;
      return true;
    }, (i, r) => extra + (r === "arm" || r === "forearm" ? limbEase : torsoEase(P[i * 3 + 1])), undefined, "fabric", { cuts: [hemY] });
  };
  const trousers = (key: string, waistY: number, hemY: number, style: string, extra = 0) => {
    shell(key, (i, r) => {
      const y = P[i * 3 + 1];
      if (r === "foot" || y < hemY || y > waistY) return false;
      return r === "pelvis" || r === "torso" || r === "thigh" || r === "shin";
    }, (i, r) => {
      const y = P[i * 3 + 1];
      let e = extra + (r === "torso" || r === "pelvis" ? torsoEase(y) : limbEase);
      if (style === "wide-leg" || style === "jumpsuit") e += Math.max(0, L.crotch - y) * 0.13;
      if (style === "straight" || style === "suit") e += Math.max(0, L.knee - y) * 0.05;
      if (style === "leggings") e = 0.004;
      return e;
    }, style === "wide-leg" ? { fromY: L.knee, amount: 0.2 } : undefined, "fabric", { cuts: [waistY, hemY], bridge: false });
  };
  const collar = (extra = 0) => {
    const nb = M.joints("neck01____head");
    const r = M.joints("neck02____head").distanceTo(nb) * 0.9 + 0.04 + extra;
    const g = loft([{ y: nb.y + 0.035, rx: r * 0.92, rz: r * 0.9, cz: nb.z }, { y: nb.y - 0.012, rx: r * 1.22, rz: r * 1.25, cz: nb.z }], { steps: 2, seg: 48 });
    pieces.push({ key: "collar", geometry: rig(g, () => [["neck01", 1]]), role: "trim" });
  };
  const hemFor = (Lr: number) => L.crotch - Math.max(0, Math.min(1, (Lr - 0.4) / 0.6)) * (L.crotch - 0.015);
  const topHem = (Lr: number) => Math.min(L.waist + 0.02, L.shoulder - Lr * (L.shoulder - 0.0) * 1.0);

  const sil = spec.silhouette;
  if (spec.silhouette === "base-layer") {
    // modest base outfit (crew-neck tee + knee-length leggings) worn wherever nothing else covers the body
    if (spec.sleeve !== "no-top") top("baseTop", L.hip - 0.02, "Short", "Crew", 0.004);
    if (spec.neckline !== "no-bottom") trousers("baseBottom", L.waist + 0.01, L.knee + 0.06, "leggings");
    return { pieces, fit: null };
  }
  switch (spec.slot) {
    case "TOP": {
      if (sil === "poncho") { top("poncho", L.hip, "Three-quarter", "V-neck", 0.03); break; }
      const hem = spec.tuck ? L.waist + 0.005 : Math.max(L.hip - 0.02, topHem(spec.lengthRatio));
      top("top", hem, spec.sleeve, spec.neckline, sil === "sweater" ? 0.01 : 0);
      if (spec.neckline === "Collared") collar();
      break;
    }
    case "BOTTOM": {
      if (["skater", "pencil", "pleated"].includes(sil)) {
        const hem = L.crotch - Math.max(0, (spec.lengthRatio - 0.35) / 0.65) * (L.crotch - 0.03);
        const fromY = L.hip + 0.01;
        shell("waistband", (i, r) => { const y = P[i * 3 + 1]; return (r === "torso" || r === "pelvis" || r === "thigh") && y <= L.waist + 0.01 && y >= fromY - 0.02; }, (i) => torsoEase(P[i * 3 + 1]));
        skirt("skirt", fromY, Math.min(hem, fromY - 0.08), sil === "skater" ? 0.75 : sil === "pleated" ? 0.3 : 0.02, 0, sil === "pleated" ? 120 : 72);
      } else {
        const hem = 0.03 + (1 - spec.lengthRatio) * (L.knee - 0.03) * 1.4;
        trousers("trousers", L.waist + 0.015, Math.max(L.ankle - 0.02, hem), sil);
      }
      break;
    }
    case "FULL": {
      if (["jumpsuit", "suit", "tracksuit", "active-set", "romper"].includes(sil)) {
        const legHem = sil === "romper" ? L.crotch - 0.12 : L.ankle - 0.01;
        if (sil === "active-set") {
          top("bra", L.bust - 0.07, "Sleeveless", "Square");
          trousers("leggings", L.waist - 0.01, legHem, "leggings");
        } else {
          top("top", L.hip, sil === "suit" || sil === "tracksuit" ? "Long" : spec.sleeve, sil === "suit" ? "V-neck" : spec.neckline, sil === "suit" ? 0.008 : 0);
          trousers("trousers", L.waist + 0.02, legHem, sil === "suit" ? "straight" : sil === "tracksuit" ? "jogger" : "jumpsuit");
          if (sil === "suit") collar(0.008);
        }
        break;
      }
      if (sil === "two-piece") {
        top("crop", L.waist + 0.06, "Short", "Off-shoulder");
        skirt("skirt", L.hip + 0.01, L.crotch - 0.06, 0.08);
        shell("band", (i, r) => { const y = P[i * 3 + 1]; return (r === "torso" || r === "pelvis") && y <= L.waist - 0.01 && y >= L.hip - 0.01; }, (i) => torsoEase(P[i * 3 + 1]));
        break;
      }
      if (sil === "saree") {
        top("blouse", L.bust - 0.08, "Short", "Boat");
        shell("waist", (i, r) => { const y = P[i * 3 + 1]; return (r === "torso" || r === "pelvis") && y <= L.waist + 0.01 && y >= L.hip; }, (i) => torsoEase(P[i * 3 + 1]) + 0.004);
        skirt("skirt", L.hip + 0.005, 0.01, 0.1, 0.004);
        const f = (y: number, front: number, x: number) => { const s = legSlice(y); return new THREE.Vector3(x, y, s.cz + front * (s.rz + 0.03)); };
        const pallu = ribbon([
          f(L.hip + 0.03, 1, 0.12), f(L.waist, 1, 0.05), f(L.bust, 1, -0.05),
          new THREE.Vector3(shoulderJ.R.x * 0.85, L.shoulder + 0.05, shoulderJ.R.z),
          f(L.bust, -1, -0.1), f(L.waist, -1, -0.12), f(L.crotch, -1, -0.13),
        ], 0.22, 90);
        pieces.push({ key: "pallu", geometry: rig(pallu, (x, y) => [[y > L.bust ? "spine01" : "spine03", 1]]), role: "fabric", sway: { fromY: L.waist, amount: 0.08 } });
        break;
      }
      // dresses and gowns: fitted bodice from the body, flared skirt below
      const flare = sil === "ball-gown" ? 1.2 : sil === "anarkali" ? 0.9 : sil === "gown" ? 0.6 : sil === "a-line" ? 0.42 : sil === "shirt-dress" ? 0.3 : sil === "slip" ? 0.16 : sil === "column" ? 0.06 : 0.02;
      const split = sil === "ball-gown" || sil === "anarkali" ? L.waist + 0.02 : L.hip;
      top("bodice", split - 0.06, spec.neckline === "Off-shoulder" ? "Sleeveless" : spec.sleeve, spec.neckline);
      skirt("skirt", split + 0.02, Math.min(hemFor(spec.lengthRatio), split - 0.1), flare);
      if (spec.neckline === "Collared") collar();
      break;
    }
    case "OUTER": {
      const hem = L.shoulder - spec.lengthRatio * L.shoulder * 1.05;
      const extra = sil === "puffer" ? 0.03 : 0.012;
      top("coat", Math.max(hem, L.hip - 0.02), "Long", sil === "blazer" ? "V-neck" : "Crew", extra);
      if (hem < L.hip - 0.04) skirt("coatSkirt", L.hip, hem, sil === "trench" || sil === "coat" ? 0.22 : 0.08, extra + 0.006);
      collar(extra + 0.01);
      break;
    }
    case "ACCESSORY": {
      if (sil === "bag") {
        // carried in the left hand, which hangs naturally in every pose
        const w = M.joints("wrist.L____head"), e = M.joints("lowerarm02.L____head");
        const along = new THREE.Vector3().subVectors(w, e).normalize();
        const hand = w.clone().addScaledVector(along, 0.06);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), along);
        const g = new THREE.BoxGeometry(0.24, 0.18, 0.09, 4, 4, 2); g.translate(0, -0.15, 0); g.applyQuaternion(q); g.translate(hand.x, hand.y, hand.z);
        const h = new THREE.TorusGeometry(0.06, 0.007, 10, 32, Math.PI); h.translate(0, -0.06, 0); h.applyQuaternion(q); h.translate(hand.x, hand.y, hand.z);
        pieces.push({ key: "bag", geometry: rig(g, () => [["wrist.L", 1]]), role: "leather" });
        pieces.push({ key: "handle", geometry: rig(h, () => [["wrist.L", 1]]), role: "leather" });
      } else if (sil === "jewellery") {
        for (const side of ["L", "R"] as const) {
          const w = M.joints(`wrist.${side}____head`), e = M.joints(`lowerarm02.${side}____head`);
          const dir = new THREE.Vector3().subVectors(w, e).normalize();
          const g = new THREE.TorusGeometry(0.032, 0.004, 10, 40);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
          const at = w.clone().addScaledVector(dir, -0.02); g.translate(at.x, at.y, at.z);
          pieces.push({ key: `bracelet${side}`, geometry: rig(g, () => [[`lowerarm02.${side}`, 1]]), role: "metal" });
        }
      }
      break;
    }
  }
  return { pieces, fit };
}

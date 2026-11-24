import * as THREE from "three";
import { loft, ribbon, type BodyModel, type Ring, type AvatarConfig } from "./body";

/** Data the engine needs about a catalogue garment (from GarmentConfiguration + variant). */
export type GarmentSpec = {
  productId: string;
  slot: "TOP" | "BOTTOM" | "FULL" | "OUTER" | "ACCESSORY";
  silhouette: string;
  lengthRatio: number;
  ease: number;
  fabric: string;
  sleeve: string;
  neckline: string;
  pattern: string;
  colorHex: string;
  size: string;
  measurements?: { bust: number; waist: number; hip: number; length: number } | null;
};

export type Piece = { key: string; geometry: THREE.BufferGeometry; role: "fabric" | "trim" | "metal" | "leather"; sway?: { fromY: number; amount: number } };
export type FitReport = { bust: number; waist: number; hip: number; status: "tight" | "close" | "comfortable" | "loose" }; // ease in cm

const LAYER = { BOTTOM: 0.006, TOP: 0.011, FULL: 0.009, OUTER: 0.026, ACCESSORY: 0 } as const;

/** Builds all mesh pieces for one garment fitted to the body. */
export function buildGarment(spec: GarmentSpec, body: BodyModel, cfg: AvatarConfig): { pieces: Piece[]; fit: FitReport | null } {
  const { Y } = body;
  const layer = LAYER[spec.slot];
  // ── measurement-driven fit: garment circumference vs body circumference per region
  const m = spec.measurements;
  const ratio = (garm: number | undefined, bodyC: number) => (garm ? Math.max(1.004, garm / bodyC) : spec.ease);
  const rB = ratio(m?.bust, cfg.bustCm), rW = ratio(m?.waist, cfg.waistCm), rH = ratio(m?.hip, cfg.hipCm);
  const fit: FitReport | null = m
    ? (() => {
        const e = { bust: m.bust - cfg.bustCm, waist: m.waist - cfg.waistCm, hip: m.hip - cfg.hipCm };
        const relevant = spec.slot === "BOTTOM" ? [e.waist, e.hip] : spec.slot === "TOP" ? [e.bust, e.waist] : [e.bust, e.waist, e.hip];
        const min = Math.min(...relevant), max = Math.max(...relevant);
        return { ...e, status: min < 0 ? "tight" : min < 4 ? "close" : max > 16 ? "loose" : "comfortable" };
      })()
    : null;

  const regionRatio = (y: number) => {
    const yb = Y(0.735), yw = Y(0.63), yh = Y(0.53);
    if (y >= yb) return rB;
    if (y >= yw) return rB + (rW - rB) * ((yb - y) / (yb - yw));
    if (y >= yh) return rW + (rH - rW) * ((yw - y) / (yw - yh));
    return rH;
  };
  const torsoRing = (y: number, extra = 0): Ring => {
    const r = body.torsoAt(y);
    const k = regionRatio(y);
    return { y, rx: r.rx * k + layer + extra, rz: r.rz * k + layer + extra, cx: 0, cz: r.cz };
  };
  const torsoRings = (top: number, bottom: number, n = 14, extra = 0) =>
    Array.from({ length: n }, (_, i) => torsoRing(top + ((bottom - top) * i) / (n - 1), extra));

  /** Skirt rings below the hip that enclose both legs and flare toward the hem. */
  const skirtRings = (fromY: number, hemY: number, flare: number, n = 12, extra = 0): Ring[] => {
    const start = torsoRing(fromY, extra);
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const y = fromY + (hemY - fromY) * t;
      const leg = body.legAt(y);
      const minRx = body.legX + leg.rx + 0.012 + layer + extra;
      const minRz = leg.rz + 0.02 + layer + extra;
      const drop = fromY - y;
      const rx = Math.max(minRx, start.rx * (1 - 0.06 * t) + flare * drop * 0.55);
      const rz = Math.max(minRz, start.rz * (1 - 0.1 * t) + flare * drop * 0.5);
      return { y, rx, rz, cz: start.cz! * (1 - t) };
    });
  };

  const dressHem = (L: number) => Y(0.47 - Math.max(0, Math.min(1, (L - 0.4) / 0.6)) * 0.45);
  const topHem = (L: number) => Y(0.81 - L * 0.79);

  const pieces: Piece[] = [];
  const add = (key: string, geometry: THREE.BufferGeometry, role: Piece["role"] = "fabric", sway?: Piece["sway"]) => pieces.push({ key, geometry, role, sway });

  // ── reusable parts
  const bodice = (topY: number, bottomY: number, extra = 0) => add("bodice", loft(torsoRings(topY, bottomY, 16, extra), { capTop: false }));
  const neckTop = () => {
    switch (spec.neckline) {
      case "Off-shoulder": return Y(0.77);
      case "Halter": case "Square": case "V-neck": return Y(0.79);
      default: return Y(0.835);
    }
  };
  const shoulderStraps = (topY: number) => {
    for (const s of [1, -1] as const) {
      const pts = [
        new THREE.Vector3(s * body.shoulderHalf * 0.55, topY, body.torsoAt(topY).rz + layer + 0.004),
        new THREE.Vector3(s * body.shoulderHalf * 0.6, Y(0.826), 0.02),
        new THREE.Vector3(s * body.shoulderHalf * 0.58, Y(0.828), -0.03),
        new THREE.Vector3(s * body.shoulderHalf * 0.55, topY + 0.01, -(body.torsoAt(topY).rz + layer)),
      ];
      add(`strap${s}`, ribbon(pts, spec.neckline === "Halter" ? 0.03 : 0.018, 24));
    }
  };
  const offShoulderBand = () => {
    const y = Y(0.772);
    const r = { rx: body.armPivot.x + body.upperR + 0.012 + layer, rz: body.torsoAt(y).rz + layer + 0.012 };
    add("band", loft([{ y: y + 0.035, ...r }, { y, ...r }, { y: y - 0.02, rx: r.rx * 0.98, rz: r.rz }], { steps: 3 }));
  };
  const sleeves = (kind: string, extra = 0, puff = 0) => {
    if (kind === "Sleeveless" || kind === "NA") return;
    const end = kind === "Short" ? -body.H * 0.09 : kind === "Three-quarter" ? -body.H * 0.25 : -body.H * 0.322;
    for (const s of [1, -1] as const) {
      const rings: Ring[] = [];
      const n = 10;
      for (let i = 0; i < n; i++) {
        const y = -0.012 + (end + 0.012) * (i / (n - 1));
        const a = body.armAt(y);
        const bulge = puff * Math.sin(Math.PI * Math.min(1, i / (n - 1) * 1.2));
        const ease = (1.16 + extra * 5) * (i === 0 ? 0.9 : 1);
        rings.push({ y, rx: a.rx * ease + 0.004 + extra + bulge, rz: a.rz * ease + 0.004 + extra + bulge });
      }
      const g = loft(rings, { steps: 3 });
      g.rotateZ(s * body.armAngle);
      g.translate(s * body.armPivot.x, body.armPivot.y, body.armPivot.z);
      add(`sleeve${s}`, g);
    }
  };
  const collar = (extra = 0) => {
    const y = Y(0.84);
    const n = body.torsoAt(y);
    add("collar", loft([
      { y: y + 0.035, rx: n.rx * 1.25 + extra, rz: n.rz * 1.25 + extra, cz: n.cz },
      { y: y - 0.005, rx: n.rx * 1.55 + extra + 0.01, rz: n.rz * 1.6 + extra + 0.01, cz: n.cz },
    ], { steps: 2 }), "trim");
  };
  const trousers = (hemY: number, style: string, extra = 0) => {
    const waistY = Y(0.635);
    add("seat", loft(torsoRings(waistY, Y(0.475), 12, extra), {}));
    for (const s of [1, -1] as const) {
      const rings: Ring[] = [];
      const n = 14;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = Y(0.515) + (hemY - Y(0.515)) * t;
        const l = body.legAt(y);
        const base = { rx: l.rx * regionRatio(Y(0.53)) * 0.98 + layer + extra, rz: l.rz * regionRatio(Y(0.53)) * 0.98 + layer + extra };
        let rx = base.rx, rz = base.rz;
        if (style === "wide-leg") { rx = Math.max(base.rx, 0.075 + t * 0.06); rz = Math.max(base.rz, 0.08 + t * 0.055); }
        else if (style === "straight" || style === "suit" || style === "jumpsuit") { rx = Math.max(base.rx, 0.072 + (style === "jumpsuit" ? t * 0.05 : 0)); rz = Math.max(base.rz, 0.075 + (style === "jumpsuit" ? t * 0.045 : 0)); }
        else if (style === "jogger" || style === "tracksuit") { rx = Math.max(base.rx * 1.1, t > 0.92 ? base.rx : 0.068); rz = Math.max(base.rz * 1.1, t > 0.92 ? base.rz : 0.07); }
        else if (style === "leggings") { rx = l.rx * 1.01 + 0.003; rz = l.rz * 1.01 + 0.003; }
        rings.push({ y, rx, rz, cx: s * body.legX * (1 - 0.06 * t), cz: l.cz ?? 0 });
      }
      add(`leg${s}`, loft(rings, { steps: 3 }), "fabric", style === "wide-leg" || style === "jumpsuit" ? { fromY: Y(0.4), amount: 0.25 } : undefined);
    }
  };

  const sil = spec.silhouette;
  switch (spec.slot) {
    case "FULL": {
      const hem = dressHem(spec.lengthRatio);
      if (sil === "jumpsuit" || sil === "suit" || sil === "tracksuit" || sil === "active-set" || sil === "romper") {
        const legStyle = sil === "suit" ? "straight" : sil === "tracksuit" ? "jogger" : sil === "active-set" ? "leggings" : sil === "romper" ? "straight" : "jumpsuit";
        const legHem = sil === "romper" ? Y(0.4) : Y(0.045);
        if (sil === "active-set") {
          bodice(Y(0.775), Y(0.69), -0.004);
          shoulderStraps(Y(0.775));
        } else if (sil === "suit" || sil === "tracksuit") {
          bodice(neckTop(), Y(0.52), sil === "suit" ? 0.012 : 0.01);
          sleeves("Long", 0.006);
          if (sil === "suit") collar(0.012);
        } else {
          bodice(spec.neckline === "Off-shoulder" ? Y(0.77) : Y(0.79), Y(0.6));
          if (spec.neckline === "Halter") shoulderStraps(Y(0.79));
          sleeves(spec.sleeve, 0, 0);
        }
        trousers(legHem, legStyle);
        break;
      }
      if (sil === "two-piece") {
        bodice(Y(0.77), Y(0.665));
        offShoulderBand();
        add("skirt", loft([...torsoRings(Y(0.625), Y(0.53), 6), ...skirtRings(Y(0.52), Y(0.4), 0.05).slice(1)], {}));
        break;
      }
      if (sil === "saree") {
        // blouse
        bodice(Y(0.8), Y(0.685), -0.002);
        sleeves("Short", -0.004);
        // pleated skirt to floor
        add("skirt", loft([...torsoRings(Y(0.625), Y(0.53), 6, 0.004), ...skirtRings(Y(0.52), Y(0.012), 0.12, 14, 0.004).slice(1)], { seg: 72 }), "fabric", { fromY: Y(0.45), amount: 0.12 });
        // pallu: draped from right hip across the chest, over the left shoulder, down the back
        const f = (y: number, z = 1, x = 0) => { const r = body.torsoAt(y); return new THREE.Vector3(x, y, z * (r.rz + 0.03) + (r.cz ?? 0)); };
        add("pallu", ribbon([
          f(Y(0.56), 1, body.torsoAt(Y(0.56)).rx * 0.7), f(Y(0.66), 1, 0.05), f(Y(0.75), 1, -0.06),
          new THREE.Vector3(-body.shoulderHalf * 0.62, Y(0.832), 0.0),
          f(Y(0.74), -1, -0.09), f(Y(0.55), -1, -0.12), f(Y(0.36), -1, -0.13),
        ], 0.22, 90), "fabric", { fromY: Y(0.7), amount: 0.08 });
        break;
      }
      // dresses & gowns
      const top = spec.neckline === "Off-shoulder" ? Y(0.77) : spec.sleeve === "Sleeveless" ? Y(0.785) : neckTop();
      const flare = sil === "ball-gown" ? 1.25 : sil === "anarkali" ? 0.9 : sil === "gown" ? 0.6 : sil === "a-line" ? 0.42 : sil === "shirt-dress" ? 0.3 : sil === "slip" ? 0.16 : sil === "column" ? 0.08 : 0.02;
      const flareFrom = sil === "ball-gown" ? Y(0.63) : sil === "anarkali" ? Y(0.69) : Y(0.52);
      const bodyRings = torsoRings(top, flareFrom, 14);
      const skirt = skirtRings(flareFrom, hem, flare, 16);
      add("dress", loft([...bodyRings, ...skirt.slice(1)], { seg: 72 }), "fabric", flare > 0.15 ? { fromY: Y(0.5), amount: 0.6 * flare } : undefined);
      if (spec.neckline === "Off-shoulder") offShoulderBand();
      else if (spec.sleeve === "Sleeveless") shoulderStraps(top);
      sleeves(spec.neckline === "Off-shoulder" ? "Sleeveless" : spec.sleeve, 0, sil === "a-line" && spec.sleeve === "Short" ? 0.012 : 0);
      if (spec.neckline === "Collared") collar(0.004);
      break;
    }
    case "TOP": {
      const hem = Math.min(topHem(spec.lengthRatio), Y(0.6));
      const ext = sil === "sweater" ? 0.012 : sil === "poncho" ? 0.0 : 0;
      if (sil === "poncho") {
        const y0 = Y(0.835), y1 = Y(0.5);
        const rings: Ring[] = Array.from({ length: 10 }, (_, i) => {
          const t = i / 9, y = y0 + (y1 - y0) * t;
          const tr = body.torsoAt(y);
          const w = Math.max(tr.rx + 0.02, body.armPivot.x + body.upperR + 0.04) * Math.min(1, 0.45 + t * 1.6);
          return { y, rx: Math.max(tr.rx + 0.015, w + t * 0.04), rz: tr.rz + 0.03 + t * 0.03, cz: tr.cz };
        });
        add("poncho", loft(rings, { seg: 64 }), "fabric", { fromY: Y(0.75), amount: 0.15 });
        break;
      }
      const top = spec.sleeve === "Sleeveless" ? Y(0.785) : neckTop();
      bodice(top, hem, ext);
      if (spec.sleeve === "Sleeveless") shoulderStraps(top);
      sleeves(spec.sleeve, ext, sil === "blouse" ? 0.02 : 0);
      if (spec.neckline === "Collared") collar(ext);
      break;
    }
    case "BOTTOM": {
      if (["skater", "pencil", "pleated"].includes(sil)) {
        const hem = Y(0.47 - Math.max(0, (spec.lengthRatio - 0.35) / 0.65) * 0.45);
        const flare = sil === "skater" ? 0.75 : sil === "pleated" ? 0.32 : 0.0;
        add("skirt", loft([...torsoRings(Y(0.64), Y(0.53), 6), ...skirtRings(Y(0.52), hem, flare, 12).slice(1)], { seg: sil === "pleated" ? 96 : 64 }), "fabric", flare ? { fromY: Y(0.5), amount: flare } : undefined);
      } else {
        const hem = Y(0.03 + (1 - spec.lengthRatio) * 0.4);
        trousers(hem, sil);
      }
      break;
    }
    case "OUTER": {
      const hem = topHem(spec.lengthRatio);
      const extra = sil === "puffer" ? 0.03 : 0.008;
      const flare = sil === "trench" || sil === "coat" ? 0.22 : 0.05;
      const rings = hem < Y(0.52) ? [...torsoRings(Y(0.836), Y(0.53), 14, extra), ...skirtRings(Y(0.52), hem, flare, 10, extra + 0.012).slice(1)] : torsoRings(Y(0.836), hem, 16, extra);
      add("coat", loft(rings, { seg: 64 }), "fabric", hem < Y(0.4) ? { fromY: Y(0.45), amount: 0.15 } : undefined);
      sleeves("Long", extra + 0.008, sil === "puffer" ? 0.012 : 0);
      collar(extra + 0.01);
      break;
    }
    case "ACCESSORY": {
      if (sil === "bag") {
        const w = body.wrist(1);
        const g = new THREE.BoxGeometry(0.26, 0.19, 0.1, 4, 4, 2);
        g.translate(w.x + 0.06, w.y - 0.16, w.z + 0.02);
        add("bag", g, "leather");
        const h = new THREE.TorusGeometry(0.065, 0.007, 10, 32, Math.PI);
        h.translate(w.x + 0.06, w.y - 0.065, w.z + 0.02);
        add("handle", h, "leather");
      } else if (sil === "jewellery") {
        for (const s of [1, -1] as const) {
          const w = body.wrist(s);
          const g = new THREE.TorusGeometry(body.upperR * 0.62, 0.0045, 10, 40);
          g.rotateX(Math.PI / 2);
          g.rotateZ(s * body.armAngle);
          g.translate(w.x, w.y + 0.02, w.z);
          add(`bracelet${s}`, g, "metal");
        }
      }
      break;
    }
  }
  return { pieces, fit };
}

// ── materials ─────────────────────────────────────────────
const texCache = new Map<string, THREE.Texture>();

function patternTexture(pattern: string, hex: string, fabric: string) {
  const key = `${pattern}|${hex}|${fabric}`;
  if (texCache.has(key)) return texCache.get(key)!;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = hex; x.fillRect(0, 0, 256, 256);
  const light = "rgba(255,255,255,0.85)", dark = "rgba(10,10,20,0.55)";
  let rep: [number, number] = [6, 6];
  switch (pattern) {
    case "Polka": x.fillStyle = light; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(32 + i * 64 + (j % 2) * 32, 32 + j * 64, 9, 0, 7); x.fill(); } rep = [8, 10]; break;
    case "Striped": x.fillStyle = "rgba(245,245,240,0.92)"; for (let i = 0; i < 8; i++) x.fillRect(0, i * 32, 256, 12); rep = [1, 14]; break;
    case "Check": for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if ((i + j) % 2) { x.fillStyle = (i % 4 < 2) ? dark : "rgba(240,240,240,0.6)"; x.fillRect(i * 16, j * 16, 16, 16); } rep = [6, 8]; break;
    case "Floral": {
      const cols = ["#C76E7A", "#E7A9A0", "#7E8F5F", "#F3E3C7"];
      for (let i = 0; i < 26; i++) { const px = (i * 97) % 256, py = (i * 61) % 256; x.fillStyle = cols[i % 4]; for (let p = 0; p < 5; p++) { x.beginPath(); x.ellipse(px + Math.cos(p * 1.26) * 7, py + Math.sin(p * 1.26) * 7, 6, 4, p, 0, 7); x.fill(); } }
      rep = [4, 6]; break;
    }
    case "Embroidered": x.strokeStyle = "rgba(214,175,96,0.9)"; x.lineWidth = 2; for (let i = 0; i < 18; i++) { const px = (i * 83) % 256, py = (i * 47) % 256; x.beginPath(); x.arc(px, py, 7, 0, 7); x.stroke(); x.beginPath(); x.moveTo(px - 12, py); x.lineTo(px + 12, py); x.stroke(); } rep = [5, 8]; break;
    case "Printed": x.fillStyle = light; x.font = "bold 80px serif"; x.fillText("V", 90, 160); rep = [1, 1]; break;
    default: {
      // subtle fabric grain
      const img = x.getImageData(0, 0, 256, 256);
      const amt = fabric === "denim" ? 26 : fabric === "knit" || fabric === "wool" ? 18 : fabric === "linen" ? 14 : 6;
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * amt + (fabric === "denim" && (i / 4) % 3 === 0 ? -10 : 0);
        img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      }
      x.putImageData(img, 0, 0);
      rep = fabric === "denim" ? [10, 18] : [8, 12];
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

export function fabricMaterial(spec: Pick<GarmentSpec, "fabric" | "pattern" | "colorHex">, role: Piece["role"]) {
  if (role === "metal") return new THREE.MeshPhysicalMaterial({ color: spec.colorHex, metalness: 1, roughness: 0.22 });
  if (role === "leather") return new THREE.MeshPhysicalMaterial({ color: spec.colorHex, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  const f = spec.fabric;
  const shiny = ["satin", "silk", "nylon", "pvc"].includes(f);
  const fuzzy = ["knit", "wool", "fleece", "suede", "tulle"].includes(f);
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    map: patternTexture(spec.pattern, spec.colorHex, f),
    roughness: shiny ? 0.32 : f === "denim" ? 0.92 : fuzzy ? 0.95 : f === "leather" ? 0.45 : 0.8,
    sheen: shiny ? 0.6 : fuzzy ? 1 : 0.3,
    sheenRoughness: shiny ? 0.25 : 0.8,
    sheenColor: new THREE.Color(spec.colorHex).lerp(new THREE.Color("#ffffff"), 0.5),
    clearcoat: f === "pvc" ? 0.8 : 0,
    side: THREE.DoubleSide,
    transparent: f === "tulle" || f === "organza" || f === "lace",
    opacity: f === "tulle" || f === "organza" ? 0.93 : f === "lace" ? 0.96 : 1,
  });
  return mat;
}

"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarConfig } from "./engine/body";
import type { GarmentSpec } from "./engine/garments";
import type { StudioProduct } from "@/lib/studio";
import type { View, Framing, Lighting } from "./engine/Stage";
import type { Pose } from "./engine/HumanAvatar";

export type Slot = "TOP" | "BOTTOM" | "FULL" | "OUTER" | "ACCESSORY";
export type Worn = { product: StudioProduct; color: string; size: string };
export type Step = "fetch" | "verify" | "fit" | "done" | "error";

type StudioState = {
  avatar: AvatarConfig; avatarId: string | null; avatarName: string;
  outfit: Partial<Record<Slot, Worn>>; outfitId: string | null; outfitName: string;
  view: View; viewNonce: number; pose: Pose; framing: Framing; lighting: Lighting;
  setPose: (p: Pose) => void; setFraming: (f: Framing) => void; setLighting: (l: Lighting) => void;
  pipeline: { name: string; step: Step; message?: string } | null;
  setAvatar: (p: Partial<AvatarConfig>) => void;
  loadAvatar: (id: string | null, name: string, cfg: AvatarConfig) => void;
  wear: (product: StudioProduct, color?: string, size?: string) => void;
  remove: (slot: Slot) => void;
  setColor: (slot: Slot, color: string) => void;
  setSize: (slot: Slot, size: string) => void;
  clearOutfit: () => void;
  loadOutfit: (id: string | null, name: string, items: Worn[]) => void;
  setOutfitMeta: (id: string | null, name: string) => void;
  setView: (v: View) => void;
  setPipeline: (p: StudioState["pipeline"]) => void;
};

export const SLOT_LABEL: Record<Slot, string> = { FULL: "Dress / set", TOP: "Top", BOTTOM: "Bottom", OUTER: "Layer", ACCESSORY: "Accessory" };
export const SLOT_ORDER: Slot[] = ["OUTER", "FULL", "TOP", "BOTTOM", "ACCESSORY"];

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      avatar: DEFAULT_AVATAR, avatarId: null, avatarName: "My avatar",
      outfit: {}, outfitId: null, outfitName: "",
      view: "free", viewNonce: 0, pipeline: null, pose: "relaxed", framing: "full", lighting: "studio",
      setPose: (pose) => set({ pose }), setFraming: (framing) => set({ framing }), setLighting: (lighting) => set({ lighting }),
      setAvatar: (p) => set((s) => ({ avatar: { ...s.avatar, ...p } })),
      loadAvatar: (id, name, cfg) => set({ avatarId: id, avatarName: name, avatar: normalizeAvatar(cfg) }),
      wear: (product, color, size) => set((s) => {
        const slot = product.garment.slot as Slot;
        const next = { ...s.outfit };
        // mix & match rules: a dress/set replaces top + bottom and vice versa; layers and accessories stack
        if (slot === "FULL") { delete next.TOP; delete next.BOTTOM; }
        if (slot === "TOP" || slot === "BOTTOM") delete next.FULL;
        const c = color && product.colours.some((x) => x.name === color) ? color : product.colours[0]?.name ?? "";
        const sizes = product.variants.filter((v) => v.color === c);
        const sz = size && sizes.some((v) => v.size === size) ? size : (sizes.find((v) => v.size === "M" && v.available > 0) ?? sizes.find((v) => v.available > 0) ?? sizes[0])?.size ?? "M";
        next[slot] = { product, color: c, size: sz };
        return { outfit: next };
      }),
      remove: (slot) => set((s) => { const n = { ...s.outfit }; delete n[slot]; return { outfit: n }; }),
      setColor: (slot, color) => set((s) => {
        const w = s.outfit[slot]; if (!w) return {};
        const has = w.product.variants.some((v) => v.color === color && v.size === w.size);
        return { outfit: { ...s.outfit, [slot]: { ...w, color, size: has ? w.size : w.product.variants.find((v) => v.color === color)?.size ?? w.size } } };
      }),
      setSize: (slot, size) => set((s) => { const w = s.outfit[slot]; return w ? { outfit: { ...s.outfit, [slot]: { ...w, size } } } : {}; }),
      clearOutfit: () => set({ outfit: {}, outfitId: null, outfitName: "" }),
      loadOutfit: (id, name, items) => set(() => {
        const o: Partial<Record<Slot, Worn>> = {};
        for (const i of items) o[i.product.garment.slot as Slot] = i;
        return { outfit: o, outfitId: id, outfitName: name };
      }),
      setOutfitMeta: (id, name) => set({ outfitId: id, outfitName: name }),
      setView: (v) => set((s) => ({ view: v, viewNonce: s.viewNonce + 1 })),
      setPipeline: (p) => set({ pipeline: p }),
    }),
    {
      name: "vestra-studio",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persisted, current) => { const p = (persisted ?? {}) as Partial<StudioState>; return { ...current, ...p, avatar: normalizeAvatar(p.avatar ?? {}) }; },
      partialize: (s) => ({ pose: s.pose, lighting: s.lighting, avatar: s.avatar, avatarId: s.avatarId, avatarName: s.avatarName, outfit: s.outfit, outfitId: s.outfitId, outfitName: s.outfitName }),
    }
  )
);

export function toSpec(w: Worn): GarmentSpec & { fit: string } {
  const v = w.product.variants.find((x) => x.color === w.color && x.size === w.size);
  void v;
  return {
    productId: w.product.id, slot: w.product.garment.slot as Slot, silhouette: w.product.garment.silhouette,
    lengthRatio: w.product.garment.lengthRatio, ease: w.product.garment.ease, fabric: w.product.garment.fabric,
    sleeve: w.product.sleeve, neckline: w.product.neckline, pattern: w.product.pattern,
    colorHex: w.product.colours.find((c) => c.name === w.color)?.hex ?? "#888888",
    size: w.size, measurements: w.product.measurements[w.size] ?? null, fit: w.product.fit,
  };
}

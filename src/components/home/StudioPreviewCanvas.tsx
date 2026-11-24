"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AVATAR_PRESETS } from "@/components/studio/engine/body";
import type { GarmentSpec } from "@/components/studio/engine/garments";

const Stage = dynamic(() => import("@/components/studio/engine/Stage").then((m) => m.Stage), { ssr: false });

// A styled look from the catalogue (Classic Trench over the Noir Column Midi).
const LOOK: GarmentSpec[] = [
  { productId: "preview-dress", slot: "FULL", silhouette: "column", lengthRatio: 0.85, ease: 1.05, fabric: "crepe", sleeve: "Long", neckline: "Crew", pattern: "Solid", colorHex: "#141212", size: "M", measurements: null },
  { productId: "preview-coat", slot: "OUTER", silhouette: "trench", lengthRatio: 0.8, ease: 1.05, fabric: "gabardine", sleeve: "Long", neckline: "Collared", pattern: "Solid", colorHex: "#B08C62", size: "M", measurements: null },
];

/** Lazily mounts the live 3D avatar when the section scrolls into view. */
export function StudioPreviewCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="absolute inset-0">
      {visible && <Stage config={AVATAR_PRESETS[0].config} garments={LOOK} autoRotate zoomable={false} />}
    </div>
  );
}

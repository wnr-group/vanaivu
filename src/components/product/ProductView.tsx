"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import type { PdpData } from "@/lib/pdp";
import type { Body } from "@/lib/fit";
import { imgUrl } from "@/lib/format";
import { BuyBox } from "./BuyBox";

export function ProductView({ p, initialColour, wishlisted, body, details }: { p: PdpData; initialColour: string; wishlisted: boolean; body: Body | null; details: React.ReactNode }) {
  const [colour, setColour] = useState(initialColour);
  const [zoom, setZoom] = useState<number | null>(null);
  const images = p.images.filter((i) => !i.color || i.color === colour);
  const shown = images.length ? images : p.images;

  const changeColour = (c: string) => {
    setColour(c);
    const u = new URL(window.location.href);
    u.searchParams.set("color", c);
    window.history.replaceState(null, "", u);
  };

  return (
    <div className="container-x pt-6 grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-16 items-start">
      <div>
        {/* mobile: swipe carousel; desktop: editorial grid */}
        <div className="flex lg:grid lg:grid-cols-2 gap-1 lg:gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 sm:mx-0">
          {shown.map((im, i) => (
            <button key={im.url + i} onClick={() => setZoom(i)} aria-label={`Zoom image ${i + 1}`}
              className={`group relative bg-mist shrink-0 w-[88vw] sm:w-[60vw] lg:w-auto snap-center cursor-zoom-in ${i === 0 && shown.length % 2 === 1 ? "lg:col-span-2 aspect-[3/4] lg:aspect-[4/5]" : "aspect-[3/4]"}`}>
              <Image src={imgUrl(im.url, 1200)} alt={im.alt} fill priority={i === 0} sizes="(min-width:1024px) 40vw, 88vw" className="object-cover" />
              <span className="absolute bottom-3 left-3 bg-paper/85 px-2 py-1 text-[10px] tracking-[0.14em] uppercase">{im.kind === "FRONT" ? "Front" : im.kind === "LIFESTYLE" ? "Lifestyle" : im.kind === "BACK" ? "Back" : "Detail"}</span>
              <ZoomIn size={18} strokeWidth={1.4} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-paper drop-shadow" />
            </button>
          ))}
        </div>
        <div className="hidden lg:block mt-14">{details}</div>
      </div>
      <div className="lg:sticky lg:top-[136px] pb-6">
        <BuyBox p={p} colour={colour} onColour={changeColour} wishlisted={wishlisted} body={body} />
        <div className="lg:hidden mt-12">{details}</div>
      </div>
      {zoom !== null && <Lightbox images={shown} start={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

function Lightbox({ images, start, onClose }: { images: PdpData["images"]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => (x + 1) % images.length);
      if (e.key === "ArrowLeft") setI((x) => (x - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [images.length, onClose]);
  const im = images[i];
  return (
    <div className="fixed inset-0 z-[60] bg-paper flex" role="dialog" aria-modal="true" aria-label="Image zoom">
      <div className="hidden sm:flex flex-col gap-2 p-4 overflow-y-auto">
        {images.map((x, j) => (
          <button key={x.url + j} onClick={() => setI(j)} className={`relative w-16 aspect-[3/4] bg-mist ${j === i ? "ring-1 ring-ink" : "opacity-60"}`}><Image src={imgUrl(x.url, 160)} alt="" fill sizes="64px" className="object-cover" /></button>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden cursor-zoom-in"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }}
        onMouseLeave={() => setOrigin(null)}>
        <Image src={imgUrl(im.url, 2000)} alt={im.alt} fill sizes="100vw" className="object-contain transition-transform duration-300" style={origin ? { transform: "scale(2)", transformOrigin: origin } : undefined} />
      </div>
      <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-paper/90" aria-label="Close zoom"><X size={20} /></button>
    </div>
  );
}

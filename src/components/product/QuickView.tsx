"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useUI } from "@/lib/ui-store";
import type { PdpData } from "@/lib/pdp";
import { imgUrl } from "@/lib/format";
import { BuyBox } from "./BuyBox";

export function QuickView() {
  const { quickView, setQuickView } = useUI();
  const [data, setData] = useState<PdpData | null>(null);
  const [error, setError] = useState(false);
  const [colour, setColour] = useState("");

  useEffect(() => {
    if (!quickView) { setData(null); setError(false); return; }
    fetch(`/api/products/${quickView}`).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PdpData) => { setData(d); setColour(d.colours[0]?.name ?? ""); })
      .catch(() => setError(true));
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setQuickView(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [quickView, setQuickView]);

  if (!quickView) return null;
  const imgs = data ? data.images.filter((i) => !i.color || i.color === colour) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Quick view">
      <div className="absolute inset-0 bg-ink/45 animate-fade" onClick={() => setQuickView(null)} />
      <div className="relative bg-paper w-full max-w-5xl max-h-[92dvh] overflow-y-auto animate-fade-up grid sm:grid-cols-2">
        <button onClick={() => setQuickView(null)} className="absolute top-3 right-3 z-10 p-2 bg-paper/80" aria-label="Close quick view"><X size={18} /></button>
        {!data && !error && <div className="col-span-2 h-[60vh] flex items-center justify-center text-stone text-sm">Loading…</div>}
        {error && <div className="col-span-2 h-[40vh] flex items-center justify-center text-stone text-sm">This piece could not be loaded.</div>}
        {data && (
          <>
            <div className="flex sm:block overflow-x-auto snap-x no-scrollbar bg-mist">
              {imgs.map((im) => (
                <div key={im.url} className="relative aspect-[3/4] min-w-full snap-start"><Image src={imgUrl(im.url, 900)} alt={im.alt} fill sizes="50vw" className="object-cover" /></div>
              ))}
            </div>
            <div className="p-6 sm:p-10">
              <p className="eyebrow text-stone">{data.category.name}</p>
              <h2 className="font-serif text-3xl mt-2 mb-5">{data.name}</h2>
              <BuyBox key={data.id} p={data} colour={colour} onColour={setColour} wishlisted={false} compact />
              <Link href={`/product/${data.slug}`} onClick={() => setQuickView(null)} className="block mt-6 text-[12px] uppercase tracking-[0.16em] link-u">View full details</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

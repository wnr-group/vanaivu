"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Plus, Eye, Sparkles } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatINR, discountPct, imgUrl } from "@/lib/format";
import { useUI } from "@/lib/ui-store";
import { addToBagAction } from "@/app/actions/cart";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ p, wishlisted = false, priority = false, sizes = "(min-width:1024px) 25vw, 50vw" }: { p: Card; wishlisted?: boolean; priority?: boolean; sizes?: string }) {
  const [colour, setColour] = useState(0);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [pending, start] = useTransition();
  const { openBag, toast, setQuickView } = useUI();
  const off = discountPct(p.price, p.compareAtPrice);
  const main = colour === 0 ? p.image : p.colours[colour]?.image ?? p.image;
  const hover = colour === 0 ? p.hoverImage : null;

  const quickAdd = (variantId: string) =>
    start(async () => {
      const r = await addToBagAction(variantId);
      setSizesOpen(false);
      if (r.ok) openBag();
      else toast(r.error, { tone: "error" });
    });

  return (
    <article className="group relative" onMouseLeave={() => setSizesOpen(false)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-mist">
        <Link href={`/product/${p.slug}${colour ? `?color=${encodeURIComponent(p.colours[colour].name)}` : ""}`} aria-label={p.name} className="absolute inset-0">
          <Image src={imgUrl(main, 700)} alt={p.name} fill sizes={sizes} priority={priority}
            className={`object-cover transition-all duration-[1.1s] ease-[var(--ease-lux)] ${hover ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} />
          {hover && <Image src={imgUrl(hover, 700)} alt="" fill sizes={sizes} className="object-cover opacity-0 scale-[1.03] transition-all duration-[1.1s] ease-[var(--ease-lux)] group-hover:opacity-100 group-hover:scale-100" />}
        </Link>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {p.isNew && <span className="bg-paper/90 px-2 py-1 text-[10px] tracking-[0.16em] uppercase">New</span>}
          {off > 0 && <span className="bg-terracotta text-paper px-2 py-1 text-[10px] tracking-[0.12em] uppercase">−{off}%</span>}
          {!p.inStock && <span className="bg-ink text-paper px-2 py-1 text-[10px] tracking-[0.12em] uppercase">Sold out</span>}
        </div>
        <WishlistButton productId={p.id} initial={wishlisted} className="absolute top-2 right-2" />

        {/* hover actions */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition-all duration-500 ease-[var(--ease-lux)] max-lg:hidden">
          {sizesOpen ? (
            <div className="flex-1 bg-paper/95 backdrop-blur px-2 py-2 flex flex-wrap gap-1 justify-center" role="group" aria-label="Choose size">
              {p.quickAdd.length ? p.quickAdd.map((v) => (
                <button key={v.variantId} disabled={pending} onClick={() => quickAdd(v.variantId)} className="min-w-9 h-8 px-2 text-[11px] border border-ink/15 hover:bg-ink hover:text-paper transition-colors">{v.size === "ONE" ? "Add" : v.size}</button>
              )) : <span className="text-[11px] py-1.5">Sold out</span>}
            </div>
          ) : (
            <>
              <button onClick={() => (p.quickAdd.length === 1 ? quickAdd(p.quickAdd[0].variantId) : setSizesOpen(true))} disabled={!p.inStock || pending}
                className="flex-1 h-10 bg-paper/95 hover:bg-ink hover:text-paper text-[11px] tracking-[0.14em] uppercase flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                <Plus size={13} /> Quick add
              </button>
              <button onClick={() => setQuickView(p.slug)} className="h-10 w-10 bg-paper/95 hover:bg-ink hover:text-paper flex items-center justify-center transition-colors" aria-label={`Quick view ${p.name}`}><Eye size={15} strokeWidth={1.5} /></button>
              {p.tryOnEnabled && (
                <Link href={`/studio?product=${p.slug}`} className="h-10 w-10 bg-paper/95 hover:bg-lavender hover:text-paper flex items-center justify-center transition-colors" aria-label={`Try on ${p.name}`} title="Try on in the Virtual Studio"><Sparkles size={15} strokeWidth={1.5} /></Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className="pt-3.5 pb-1">
        <div className="flex justify-between gap-3 items-start">
          <h3 className="text-[13.5px] leading-snug"><Link href={`/product/${p.slug}`} className="hover:underline underline-offset-4 decoration-ink/30">{p.name}</Link></h3>
          <button onClick={() => setQuickView(p.slug)} className="lg:hidden text-stone p-1 -m-1" aria-label={`Quick view ${p.name}`}><Plus size={16} /></button>
        </div>
        <p className="text-[13px] mt-1 flex gap-2 items-baseline">
          <span className={off ? "text-terracotta" : ""}>{formatINR(p.price)}</span>
          {off > 0 && <span className="text-stone line-through text-[12px]">{formatINR(p.compareAtPrice!)}</span>}
        </p>
        {p.colours.length > 0 && (
          <div className="flex gap-1.5 mt-2.5 items-center">
            {p.colours.map((c, i) => (
              <button key={c.name} onMouseEnter={() => setColour(i)} onFocus={() => setColour(i)} onClick={() => setColour(i)}
                aria-label={`${c.name}${i === colour ? " (shown)" : ""}`} title={c.name}
                className={`w-3.5 h-3.5 rounded-full ring-offset-2 ring-offset-paper transition-all ${i === colour ? "ring-1 ring-ink" : "ring-1 ring-ink/10"}`}
                style={{ background: c.hex }} />
            ))}
            {p.colours.length > 1 && <span className="text-[11px] text-stone ml-1">{p.colours.length} colours</span>}
          </div>
        )}
      </div>
    </article>
  );
}

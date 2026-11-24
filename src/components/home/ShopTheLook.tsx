"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { ProductCard } from "@/lib/catalog";
import { formatINR, imgUrl } from "@/lib/format";
import { addOutfitAction } from "@/app/actions/cart";
import { useUI } from "@/lib/ui-store";

export type Look = { name: string; image: string; items: ProductCard[]; total: number };

/** A curated outfit: choose a size per piece, then add everything to the bag. */
export function ShopTheLook({ look }: { look: Look }) {
  const [sel, setSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(look.items.map((i) => [i.id, i.quickAdd.length === 1 ? i.quickAdd[0].variantId : ""]))
  );
  const [include, setInclude] = useState<Record<string, boolean>>(() => Object.fromEntries(look.items.map((i) => [i.id, true])));
  const [pending, start] = useTransition();
  const { openBag, toast } = useUI();
  const chosen = look.items.filter((i) => include[i.id]);
  const total = chosen.reduce((s, i) => s + i.price, 0);
  const missing = chosen.filter((i) => !sel[i.id]);

  const addAll = () => start(async () => {
    if (missing.length) { toast(`Choose a size for ${missing.map((m) => m.name).join(", ")}`, { tone: "error" }); return; }
    const r = await addOutfitAction(chosen.map((i) => sel[i.id]), look.name);
    if (r.errors.length) toast(r.errors[0], { tone: "error" });
    if (r.added) openBag();
  });

  return (
    <article className="grid sm:grid-cols-[1fr_1.1fr] gap-6">
      <div className="relative aspect-[3/4] bg-mist overflow-hidden">
        <Image src={imgUrl(look.image, 900)} alt={look.name} fill sizes="(min-width:1024px) 25vw, 100vw" className="object-cover" />
        <p className="absolute top-4 left-4 bg-paper/90 px-3 py-1.5 eyebrow">{look.items.length} pieces</p>
      </div>
      <div className="flex flex-col">
        <h3 className="font-serif text-3xl">{look.name}</h3>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {look.items.map((i) => (
            <li key={i.id} className="py-3 flex gap-3 items-center">
              <input type="checkbox" checked={include[i.id]} onChange={(e) => setInclude((s) => ({ ...s, [i.id]: e.target.checked }))} aria-label={`Include ${i.name}`} className="accent-ink w-4 h-4 shrink-0" />
              <Link href={`/product/${i.slug}`} className="relative w-12 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(i.image, 120)} alt="" fill sizes="48px" className="object-cover" /></Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${i.slug}`} className="text-[13px] leading-tight block truncate hover:underline">{i.name}</Link>
                <p className="text-[12px] text-stone">{formatINR(i.price)}</p>
              </div>
              <select value={sel[i.id]} onChange={(e) => setSel((s) => ({ ...s, [i.id]: e.target.value }))} aria-label={`Size for ${i.name}`}
                className="h-9 border border-ink/15 text-[12px] px-2 w-20 shrink-0" disabled={!include[i.id]}>
                <option value="">Size</option>
                {i.quickAdd.map((v) => <option key={v.variantId} value={v.variantId}>{v.size === "ONE" ? "One" : v.size}</option>)}
              </select>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.14em] text-stone">Look total</span>
          <span className="text-xl">{formatINR(total)}</span>
        </div>
        <div className="mt-4 grid gap-2">
          <button onClick={addAll} disabled={pending || chosen.length === 0} className="btn-dark">{pending ? "Adding…" : `Add ${chosen.length} pieces to bag`}</button>
          <Link href={`/studio?products=${look.items.map((i) => i.slug).join(",")}`} className="btn-outline"><Sparkles size={14} strokeWidth={1.5} /> Try the look on</Link>
        </div>
      </div>
    </article>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Sparkles, Star, Truck, Ruler, Check } from "lucide-react";
import type { PdpData } from "@/lib/pdp";
import { formatINR, discountPct } from "@/lib/format";
import { useUI } from "@/lib/ui-store";
import { addToBagAction } from "@/app/actions/cart";
import { WishlistButton } from "./WishlistButton";
import { SizeGuide } from "./SizeGuide";
import { suggestSize, type Body } from "@/lib/fit";

export function BuyBox({ p, colour, onColour, wishlisted, body, compact = false }: {
  p: PdpData; colour: string; onColour: (c: string) => void; wishlisted: boolean; body?: Body | null; compact?: boolean;
}) {
  const sizes = p.variants.filter((v) => v.color === colour);
  const firstAvailable = sizes.find((s) => s.available > 0)?.size ?? null;
  const oneSize = sizes.length === 1;
  const [size, setSize] = useState<string | null>(oneSize ? sizes[0].size : null);
  const [qty, setQty] = useState(1);
  const [guide, setGuide] = useState(false);
  const [pin, setPin] = useState("");
  const [eta, setEta] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { openBag, toast } = useUI();
  const router = useRouter();

  const variant = sizes.find((s) => s.size === size) ?? null;
  const price = variant?.price ?? p.price;
  const compare = p.compareAtPrice ? p.compareAtPrice + (price - p.price) : null;
  const off = discountPct(price, compare);
  const fit = useMemo(() => (body ? suggestSize(body, p.measurements, p.fit) : null), [body, p.measurements, p.fit]);

  const add = (buyNow: boolean) => {
    setErr(null);
    if (!variant) { setErr("Please select a size."); return; }
    start(async () => {
      const r = await addToBagAction(variant.id, qty);
      if (!r.ok) { setErr(r.error); return; }
      if (buyNow) router.push("/checkout");
      else { openBag(); toast(`${p.name} added to your bag`); }
    });
  };

  const checkPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { setEta("Enter a valid 6-digit PIN code."); return; }
    const metro = /^(11|40|56|60|70|50)/.test(pin);
    const d = new Date(Date.now() + (metro ? 2 : 4) * 86400000);
    setEta(`Delivery by ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · Express available${metro ? " (next day)" : ""}`);
  };

  return (
    <div className="space-y-6">
      {!compact && (
        <div>
          <Link href={`/shop/${p.category.slug}`} className="eyebrow text-stone hover:text-ink">{p.category.name}</Link>
          <h1 className="font-serif text-[34px] lg:text-[42px] leading-[1.05] mt-3">{p.name}</h1>
        </div>
      )}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-xl ${off ? "text-terracotta" : ""}`}>{formatINR(price)}</span>
        {off > 0 && <><span className="text-stone line-through">{formatINR(compare!)}</span><span className="text-[12px] tracking-[0.1em] uppercase text-terracotta">{off}% off</span></>}
        <span className="text-[12px] text-stone w-full">Inclusive of all taxes</span>
      </div>
      {p.ratingCount > 0 && (
        <a href="#reviews" className="flex items-center gap-2 text-[13px]">
          <span className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= Math.round(p.rating) ? "fill-ink" : "fill-none stroke-ink/30"} strokeWidth={1.2} />)}</span>
          <span>{p.rating.toFixed(1)}</span><span className="text-stone link-u">{p.ratingCount} reviews</span>
        </a>
      )}

      <div>
        <p className="text-[12px] uppercase tracking-[0.14em] mb-3">Colour: <span className="text-stone normal-case tracking-normal text-[13px]">{colour}</span></p>
        <div className="flex gap-2.5">
          {p.colours.map((c) => (
            <button key={c.name} onClick={() => { onColour(c.name); setErr(null); if (!oneSize) setSize(null); }}
              aria-label={c.name} aria-pressed={c.name === colour} title={c.name}
              className={`w-9 h-9 rounded-full ring-offset-[3px] ring-offset-paper transition-all ${c.name === colour ? "ring-1 ring-ink" : "ring-1 ring-ink/10 hover:ring-ink/40"}`} style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      {!oneSize && (
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <p className="text-[12px] uppercase tracking-[0.14em]">Size{size && <span className="text-stone normal-case tracking-normal text-[13px]">: {size}</span>}</p>
            <button onClick={() => setGuide(true)} className="text-[12px] link-u flex items-center gap-1.5"><Ruler size={13} strokeWidth={1.4} /> Size guide</button>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Size">
            {sizes.map((s) => (
              <button key={s.size} role="radio" aria-checked={size === s.size} disabled={s.available <= 0}
                onClick={() => { setSize(s.size); setErr(null); setQty(1); }}
                className={`relative h-11 text-[13px] border transition-colors ${size === s.size ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"} disabled:text-stone/50 disabled:hover:border-ink/15 disabled:cursor-not-allowed`}>
                {s.size}
                {s.available <= 0 && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-[70%] h-px bg-stone/40 rotate-[-20deg]" /></span>}
              </button>
            ))}
          </div>
          {fit && (
            <p className="mt-3 text-[13px] flex items-center gap-2 text-lavender">
              <Sparkles size={14} /> Based on your measurements we suggest <button className="underline underline-offset-4 font-medium" onClick={() => setSize(fit.size)}>{fit.size}</button>
              <span className="text-stone">· {fit.note}</span>
            </p>
          )}
          {!fit && !compact && (
            <p className="mt-3 text-[12px] text-stone">
              <Link href="/account/profile#measurements" className="link-u">Add your measurements</Link> for a personal size suggestion.
            </p>
          )}
        </div>
      )}

      <div className="text-[13px] min-h-5" aria-live="polite">
        {variant ? (
          variant.available <= 0 ? <span className="text-terracotta">Out of stock in this size</span>
            : variant.available <= 3 ? <span className="text-terracotta">Only {variant.available} left in {variant.size}</span>
            : <span className="flex items-center gap-1.5 text-stone"><Check size={14} /> In stock, ready to ship</span>
        ) : !firstAvailable ? <span className="text-terracotta">Sold out in {colour}</span> : null}
      </div>

      <div className="flex gap-2">
        <div className="flex items-center border border-ink/20 h-12" aria-label="Quantity">
          <button className="w-10 h-full flex items-center justify-center disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
          <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
          <button className="w-10 h-full flex items-center justify-center disabled:opacity-30" onClick={() => setQty((q) => Math.min(variant?.available ?? 10, 10, q + 1))} disabled={!!variant && qty >= Math.min(variant.available, 10)} aria-label="Increase quantity"><Plus size={14} /></button>
        </div>
        <button onClick={() => add(false)} disabled={pending || !firstAvailable} className="btn-dark flex-1">{pending ? "Adding…" : "Add to bag"}</button>
      </div>
      {err && <p className="text-[13px] text-terracotta -mt-3" role="alert">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => add(true)} disabled={pending || !firstAvailable} className="btn-outline">Buy now</button>
        <WishlistButton productId={p.id} initial={wishlisted} variant="button" />
      </div>
      {p.tryOnEnabled && (
        <Link href={`/studio?product=${p.slug}&color=${encodeURIComponent(colour)}${size ? `&size=${size}` : ""}`}
          className="group flex items-center justify-between gap-4 bg-ink text-paper px-5 py-4 hover:bg-cocoa transition-colors">
          <span className="flex items-center gap-3">
            <Sparkles size={18} strokeWidth={1.4} className="text-mauve" />
            <span><span className="block text-[12px] tracking-[0.16em] uppercase">Try on in the Virtual Studio</span><span className="block text-[12px] text-paper/60 mt-0.5">See it on your avatar in 3D before you buy</span></span>
          </span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}

      {!compact && (
        <form onSubmit={checkPin} className="border-t border-line pt-5">
          <label htmlFor="pin" className="text-[12px] uppercase tracking-[0.14em] flex items-center gap-2"><Truck size={15} strokeWidth={1.4} /> Delivery</label>
          <div className="flex mt-2 border-b border-ink/25 focus-within:border-ink">
            <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Enter PIN code" className="flex-1 h-10 outline-none text-sm" />
            <button className="eyebrow">Check</button>
          </div>
          <p className="text-[12px] text-stone mt-2">{eta ?? "Free standard shipping above ₹2,499 · Free 15-day returns"}</p>
        </form>
      )}
      <SizeGuide open={guide} onClose={() => setGuide(false)} measurements={p.measurements} fit={p.fit} suggested={fit?.size} />
    </div>
  );
}

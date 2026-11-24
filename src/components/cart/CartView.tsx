"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Tag, X } from "lucide-react";
import type { CartSummary } from "@/lib/cart";
import { formatINR, imgUrl } from "@/lib/format";
import { applyCouponAction, changeVariantAction, getCartAction, removeCouponAction, updateQuantityAction } from "@/app/actions/cart";
import { toggleWishlistAction } from "@/app/actions/wishlist";
import { useUI } from "@/lib/ui-store";

export function CartView({ initial }: { initial: CartSummary }) {
  const [cart, setCart] = useState(initial);
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const { toast } = useUI();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string | null } | void>) => start(async () => {
    const r = await fn();
    if (r && !r.ok && r.error) toast(r.error, { tone: "error" });
    setCart(await getCartAction());
    router.refresh();
  });

  if (!cart.lines.length)
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-3xl">Your bag is empty</p>
        <p className="text-stone mt-3">Pieces you add will wait here for you.</p>
        <div className="flex gap-2 justify-center mt-8"><Link href="/shop/new-in" className="btn-dark">Shop new in</Link><Link href="/account/wishlist" className="btn-outline">View wishlist</Link></div>
      </div>
    );

  return (
    <div className={`grid lg:grid-cols-[1fr_400px] gap-12 mt-10 ${pending ? "opacity-70 pointer-events-none" : ""}`}>
      <ul className="border-t border-ink divide-y divide-line">
        {cart.lines.map((l) => (
          <li key={l.id} className="py-7 grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] gap-5">
            <Link href={`/product/${l.slug}?color=${encodeURIComponent(l.color)}`} className="relative aspect-[3/4] bg-mist"><Image src={imgUrl(l.image, 300)} alt={l.name} fill sizes="140px" className="object-cover" /></Link>
            <div className="flex flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/product/${l.slug}`} className="font-serif text-xl hover:underline underline-offset-4">{l.name}</Link>
                  {l.outfitRef && <p className="text-[11px] text-lavender mt-1 uppercase tracking-[0.12em]">From look: {l.outfitRef}</p>}
                </div>
                <div className="text-right">
                  <p>{formatINR(l.unitPrice * l.quantity)}</p>
                  {l.compareAt && <p className="text-[12px] text-stone line-through">{formatINR(l.compareAt * l.quantity)}</p>}
                  {l.quantity > 1 && <p className="text-[12px] text-stone">{formatINR(l.unitPrice)} each</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4 text-[13px]">
                {l.options.colors.length > 1 ? (
                  <label className="flex items-center gap-2"><span className="text-stone">Colour</span>
                    <select value={l.color} onChange={(e) => run(() => changeVariantAction(l.id, e.target.value, l.size))} className="border border-ink/15 h-9 px-2">
                      {l.options.colors.map((c) => <option key={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                ) : <span className="text-stone flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: l.colorHex }} />{l.color}</span>}
                {l.size !== "ONE" && (
                  <label className="flex items-center gap-2"><span className="text-stone">Size</span>
                    <select value={l.size} onChange={(e) => run(() => changeVariantAction(l.id, l.color, e.target.value))} className="border border-ink/15 h-9 px-2">
                      {l.options.sizes.map((s) => <option key={s.size} value={s.size} disabled={s.available <= 0}>{s.size}{s.available <= 0 ? " (sold out)" : ""}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {l.issue ? <p className="text-[13px] text-terracotta mt-3">{l.issue}. Please adjust the quantity or choose another size.</p>
                : l.available <= 3 ? <p className="text-[12px] text-terracotta mt-3">Only {l.available} left</p> : null}
              <div className="mt-auto pt-5 flex items-center justify-between">
                <div className="flex items-center border border-ink/20 h-10">
                  <button onClick={() => run(() => updateQuantityAction(l.id, l.quantity - 1))} className="w-10 h-full flex items-center justify-center" aria-label={`Decrease quantity of ${l.name}`}><Minus size={13} /></button>
                  <span className="w-8 text-center text-sm">{l.quantity}</span>
                  <button onClick={() => run(() => updateQuantityAction(l.id, l.quantity + 1))} disabled={l.quantity >= Math.min(10, l.available)} className="w-10 h-full flex items-center justify-center disabled:opacity-30" aria-label={`Increase quantity of ${l.name}`}><Plus size={13} /></button>
                </div>
                <div className="flex gap-5 text-[12px]">
                  <button className="link-u" onClick={() => run(async () => {
                    const r = await toggleWishlistAction(l.productId);
                    if (!r.ok) return { ok: false, error: r.needsLogin ? "Sign in to use your wishlist." : "Could not save." };
                    return updateQuantityAction(l.id, 0);
                  })}>Move to wishlist</button>
                  <button className="link-u text-stone" onClick={() => run(() => updateQuantityAction(l.id, 0))}>Remove</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-[136px] self-start bg-mist/60 p-6 lg:p-8">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <div className="mt-6">
          {cart.couponCode ? (
            <div className="flex items-center justify-between bg-paper px-4 py-3 text-[13px]">
              <span className="flex items-center gap-2"><Tag size={14} /> <strong className="font-medium">{cart.couponCode}</strong> <span className="text-stone">{cart.couponDescription}</span></span>
              <button onClick={() => run(removeCouponAction)} aria-label="Remove coupon"><X size={14} /></button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!code.trim()) return; start(async () => { const r = await applyCouponAction(code); setCouponMsg(r.error ?? null); setCart(await getCartAction()); }); }} className="flex border-b border-ink/30 focus-within:border-ink">
              <label htmlFor="coupon" className="sr-only">Coupon code</label>
              <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 h-11 outline-none text-[14px] uppercase" />
              <button className="eyebrow">Apply</button>
            </form>
          )}
          {(couponMsg || cart.couponError) && <p className="text-[12px] text-terracotta mt-2">{couponMsg ?? cart.couponError}</p>}
          {!cart.couponCode && <p className="text-[11px] text-stone mt-2">Try WELCOME10 on your first order.</p>}
        </div>
        <dl className="mt-6 space-y-3 text-[14px]">
          <div className="flex justify-between"><dt>Subtotal ({cart.count} items)</dt><dd>{formatINR(cart.subtotal)}</dd></div>
          {cart.savings > 0 && <div className="flex justify-between text-stone"><dt>You save on sale items</dt><dd>{formatINR(cart.savings)}</dd></div>}
          {cart.discount > 0 && <div className="flex justify-between text-terracotta"><dt>Coupon discount</dt><dd>−{formatINR(cart.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{cart.shippingFee === 0 ? "Complimentary" : formatINR(cart.shippingFee)}</dd></div>
          {cart.freeShippingRemaining > 0 && <p className="text-[12px] text-stone">Add {formatINR(cart.freeShippingRemaining)} more for complimentary shipping.</p>}
          <div className="flex justify-between border-t border-ink pt-4 text-[16px]"><dt>Total</dt><dd>{formatINR(cart.total)}</dd></div>
          <p className="text-[11px] text-stone">Inclusive of GST. Express shipping can be chosen at checkout.</p>
        </dl>
        <Link href="/checkout" aria-disabled={cart.hasIssues} className={`btn-dark w-full mt-6 ${cart.hasIssues ? "pointer-events-none opacity-40" : ""}`}>Proceed to checkout</Link>
        {cart.hasIssues && <p className="text-[12px] text-terracotta mt-2">Resolve the highlighted items to continue.</p>}
        <p className="text-[12px] text-stone mt-4 text-center">Secure payments via Razorpay · UPI · Cards · Netbanking · COD</p>
      </aside>
    </div>
  );
}

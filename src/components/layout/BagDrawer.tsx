"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Minus, Plus } from "lucide-react";
import { useUI } from "@/lib/ui-store";
import { getCartAction, updateQuantityAction } from "@/app/actions/cart";
import { formatINR, imgUrl } from "@/lib/format";
import type { CartSummary } from "@/lib/cart";

export function BagDrawer() {
  const { bagOpen, closeBag, bagVersion, toast } = useUI();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!bagOpen) return;
    getCartAction().then(setCart);
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeBag(); };
    window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [bagOpen, bagVersion, closeBag]);

  const setQty = (id: string, q: number) => start(async () => {
    const r = await updateQuantityAction(id, q);
    if (!r.ok) toast(r.error, { tone: "error" });
    setCart(await getCartAction());
    router.refresh();
  });

  if (!bagOpen) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-ink/40 animate-fade" onClick={closeBag} />
      <aside className="absolute inset-y-0 right-0 w-full max-w-md bg-paper flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line">
          <p className="font-serif text-2xl">Your bag {cart && cart.count > 0 && <span className="text-stone text-base">({cart.count})</span>}</p>
          <button onClick={closeBag} aria-label="Close bag" className="p-2 -mr-2"><X size={20} strokeWidth={1.4} /></button>
        </div>
        {!cart ? <div className="flex-1 flex items-center justify-center text-stone text-sm">Loading…</div>
        : cart.lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="font-serif text-3xl">Your bag is empty</p>
            <p className="text-stone text-sm mt-3">Discover the new season, or style a look in the Virtual Studio.</p>
            <div className="flex gap-2 mt-8"><Link href="/shop/new-in" onClick={closeBag} className="btn-dark">Shop new in</Link><Link href="/studio" onClick={closeBag} className="btn-outline">Studio</Link></div>
          </div>
        ) : (
          <>
            {cart.freeShippingRemaining > 0 ? (
              <div className="px-6 py-3 bg-mist text-[12px]">
                Add <strong className="font-medium">{formatINR(cart.freeShippingRemaining)}</strong> more for complimentary shipping
                <div className="h-0.5 bg-ink/10 mt-2"><div className="h-full bg-ink transition-all" style={{ width: `${Math.min(100, (1 - cart.freeShippingRemaining / 2499) * 100)}%` }} /></div>
              </div>
            ) : <div className="px-6 py-3 bg-mist text-[12px]">You have unlocked complimentary shipping.</div>}
            <ul className={`flex-1 overflow-y-auto divide-y divide-line px-6 ${pending ? "opacity-60" : ""}`}>
              {cart.lines.map((l) => (
                <li key={l.id} className="py-5 flex gap-4">
                  <Link href={`/product/${l.slug}`} onClick={closeBag} className="relative w-24 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(l.image, 240)} alt="" fill sizes="96px" className="object-cover" /></Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-3"><p className="text-[14px] leading-snug">{l.name}</p><p className="text-[14px]">{formatINR(l.unitPrice * l.quantity)}</p></div>
                    <p className="text-[12px] text-stone mt-1">{l.color} · {l.size === "ONE" ? "One size" : l.size}</p>
                    {l.outfitRef && <p className="text-[11px] text-lavender mt-1">From look: {l.outfitRef}</p>}
                    {l.issue && <p className="text-[12px] text-terracotta mt-1">{l.issue}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-ink/15 h-8">
                        <button onClick={() => setQty(l.id, l.quantity - 1)} className="w-8 h-full flex items-center justify-center" aria-label="Decrease"><Minus size={12} /></button>
                        <span className="w-6 text-center text-[13px]">{l.quantity}</span>
                        <button onClick={() => setQty(l.id, l.quantity + 1)} disabled={l.quantity >= l.available} className="w-8 h-full flex items-center justify-center disabled:opacity-30" aria-label="Increase"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => setQty(l.id, 0)} className="text-[12px] text-stone link-u">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-6 py-5 space-y-3">
              <div className="flex justify-between text-[14px]"><span>Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
              {cart.discount > 0 && <div className="flex justify-between text-[13px] text-terracotta"><span>Discount ({cart.couponCode})</span><span>−{formatINR(cart.discount)}</span></div>}
              <p className="text-[12px] text-stone">Shipping and coupons are calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/cart" onClick={closeBag} className="btn-outline">View bag</Link>
                <Link href="/checkout" onClick={closeBag} aria-disabled={cart.hasIssues} className={`btn-dark ${cart.hasIssues ? "pointer-events-none opacity-40" : ""}`}>Checkout</Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

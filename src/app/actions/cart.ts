"use server";
import { revalidatePath } from "next/cache";
import { addToCart, changeItemVariant, currentCart, setItemQuantity, evaluateCoupon, summarize } from "@/lib/cart";
import { db } from "@/lib/db";

const done = <T,>(r: T) => { revalidatePath("/", "layout"); return r; };

export async function addToBagAction(variantId: string, quantity = 1) {
  return done(await addToCart(variantId, quantity));
}

/** Adds several variants (a complete outfit). Stops at the first failure and reports it. */
export async function addOutfitAction(variantIds: string[], outfitName?: string) {
  const errors: string[] = [];
  for (const id of variantIds) {
    const r = await addToCart(id, 1, outfitName);
    if (!r.ok) errors.push(r.error);
  }
  revalidatePath("/", "layout");
  return { ok: errors.length === 0, added: variantIds.length - errors.length, errors };
}

export async function updateQuantityAction(itemId: string, quantity: number) {
  return done(await setItemQuantity(itemId, quantity));
}

export async function changeVariantAction(itemId: string, color: string, size: string) {
  return done(await changeItemVariant(itemId, color, size));
}

export async function applyCouponAction(code: string) {
  const cart = await currentCart(true);
  const s = await summarize(cart);
  const r = await evaluateCoupon(code.trim(), s.subtotal);
  if (r.error && !r.coupon) return { ok: false, error: r.error };
  await db.cart.update({ where: { id: cart!.id }, data: { couponCode: code.trim().toUpperCase() } });
  return done({ ok: !r.error, error: r.error });
}

export async function removeCouponAction() {
  const cart = await currentCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return done({ ok: true });
}

export async function getCartAction() {
  return summarize(await currentCart());
}

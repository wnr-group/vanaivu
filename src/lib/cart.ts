import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "./db";
import { getSession } from "./auth";

const GUEST = "vestra_cart";
export const FREE_SHIPPING_THRESHOLD = 2499;
export const SHIPPING = { STANDARD: { label: "Standard (3–5 days)", fee: 149, days: [3, 5] }, EXPRESS: { label: "Express (1–2 days)", fee: 249, days: [1, 2] } } as const;
export type ShippingMethod = keyof typeof SHIPPING;
export const MAX_QTY = 10;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: { include: { images: { orderBy: { sortOrder: "asc" as const } }, variants: { include: { inventory: true } } } },
        },
      },
    },
  },
};

/** Finds the current cart (user or guest). Creates one when `create` is true. */
export async function currentCart(create = false) {
  const session = await getSession();
  const jar = await cookies();
  if (session) {
    let cart = await db.cart.findUnique({ where: { userId: session.userId }, include: cartInclude });
    if (!cart && create) cart = await db.cart.create({ data: { userId: session.userId }, include: cartInclude });
    return cart;
  }
  const key = jar.get(GUEST)?.value;
  if (key) {
    const cart = await db.cart.findUnique({ where: { guestKey: key }, include: cartInclude });
    if (cart || !create) return cart;
  }
  if (!create) return null;
  const guestKey = randomBytes(18).toString("base64url");
  jar.set(GUEST, guestKey, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60, secure: process.env.NODE_ENV === "production" });
  return db.cart.create({ data: { guestKey }, include: cartInclude });
}
export type CartFull = NonNullable<Awaited<ReturnType<typeof currentCart>>>;

/** Called after login/registration: moves guest items into the user's cart. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const key = jar.get(GUEST)?.value;
  if (!key) return;
  const guest = await db.cart.findUnique({ where: { guestKey: key }, include: { items: true } });
  if (guest) {
    const userCart = (await db.cart.findUnique({ where: { userId } })) ?? (await db.cart.create({ data: { userId } }));
    for (const it of guest.items) {
      await db.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: it.variantId } },
        create: { cartId: userCart.id, variantId: it.variantId, quantity: it.quantity, outfitRef: it.outfitRef },
        update: { quantity: { increment: it.quantity } },
      });
    }
    await db.cart.delete({ where: { id: guest.id } });
  }
  jar.delete(GUEST);
}

export const available = (inv?: { quantity: number; reserved: number } | null) => Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved ?? 0));

export async function addToCart(variantId: string, quantity = 1, outfitRef?: string) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true, product: true } });
  if (!variant || !variant.product.published) return { ok: false as const, error: "This item is no longer available." };
  const cart = (await currentCart(true))!;
  const existing = cart.items.find((i) => i.variantId === variantId);
  const want = Math.min(MAX_QTY, (existing?.quantity ?? 0) + quantity);
  const stock = available(variant.inventory);
  if (stock <= 0) return { ok: false as const, error: `${variant.product.name} in ${variant.color} / ${variant.size} is out of stock.` };
  if (want > stock) return { ok: false as const, error: `Only ${stock} left in ${variant.size}.` };
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: want, outfitRef },
    update: { quantity: want, ...(outfitRef ? { outfitRef } : {}) },
  });
  return { ok: true as const };
}

export async function setItemQuantity(itemId: string, quantity: number) {
  const cart = await currentCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) return { ok: false as const, error: "Item not found." };
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return { ok: true as const };
  }
  const stock = available(item.variant.inventory);
  const q = Math.min(quantity, MAX_QTY, stock);
  if (q <= 0) return { ok: false as const, error: "That size is now out of stock." };
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: q } });
  return q < quantity ? { ok: false as const, error: `Only ${stock} available.` } : { ok: true as const };
}

/** Swap an item to a different colour/size of the same product. */
export async function changeItemVariant(itemId: string, color: string, size: string) {
  const cart = await currentCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) return { ok: false as const, error: "Item not found." };
  const target = item.variant.product.variants.find((v) => v.color === color && v.size === size);
  if (!target) return { ok: false as const, error: "That combination doesn't exist." };
  if (target.id === item.variantId) return { ok: true as const };
  const stock = available(target.inventory);
  if (stock <= 0) return { ok: false as const, error: `${color} / ${size} is out of stock.` };
  const clash = cart.items.find((i) => i.variantId === target.id);
  await db.$transaction(async (tx) => {
    await tx.cartItem.delete({ where: { id: item.id } });
    if (clash) await tx.cartItem.update({ where: { id: clash.id }, data: { quantity: Math.min(stock, clash.quantity + item.quantity, MAX_QTY) } });
    else await tx.cartItem.create({ data: { cartId: cart.id, variantId: target.id, quantity: Math.min(stock, item.quantity), outfitRef: item.outfitRef } });
  });
  return { ok: true as const };
}

export async function evaluateCoupon(code: string | null | undefined, subtotal: number) {
  if (!code) return { discount: 0, coupon: null, error: null as string | null };
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date()))
    return { discount: 0, coupon: null, error: "This code isn't valid." };
  if (subtotal < coupon.minSubtotal)
    return { discount: 0, coupon, error: `Add ₹${(coupon.minSubtotal - subtotal).toLocaleString("en-IN")} more to use ${coupon.code}.` };
  let d = coupon.kind === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return { discount: Math.min(d, subtotal), coupon, error: null };
}

export type CartLine = {
  id: string; variantId: string; productId: string; slug: string; name: string; image: string;
  color: string; colorHex: string; size: string; unitPrice: number; compareAt: number | null; quantity: number;
  available: number; outfitRef: string | null; issue: string | null;
  options: { colors: { name: string; hex: string }[]; sizes: { size: string; available: number }[] };
};

export async function summarize(cart: CartFull | null, method: ShippingMethod = "STANDARD") {
  const lines: CartLine[] = (cart?.items ?? []).map((i) => {
    const v = i.variant;
    const p = v.product;
    const img = p.images.find((im) => im.color === v.color) ?? p.images[0];
    const avail = available(v.inventory);
    const colors = [...new Map(p.variants.map((x) => [x.color, { name: x.color, hex: x.colorHex }])).values()];
    return {
      id: i.id, variantId: v.id, productId: p.id, slug: p.slug, name: p.name, image: img?.url ?? "",
      color: v.color, colorHex: v.colorHex, size: v.size, unitPrice: p.price + v.priceDelta,
      compareAt: p.compareAtPrice ? p.compareAtPrice + v.priceDelta : null, quantity: i.quantity, available: avail,
      outfitRef: i.outfitRef,
      issue: !p.published ? "No longer available" : avail <= 0 ? "Out of stock" : i.quantity > avail ? `Only ${avail} left` : null,
      options: {
        colors,
        sizes: p.variants.filter((x) => x.color === v.color).map((x) => ({ size: x.size, available: available(x.inventory) })),
      },
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const savings = lines.reduce((s, l) => s + (l.compareAt ? (l.compareAt - l.unitPrice) * l.quantity : 0), 0);
  const { discount, coupon, error: couponError } = await evaluateCoupon(cart?.couponCode, subtotal);
  const afterDiscount = subtotal - discount;
  const shippingFee = lines.length === 0 ? 0 : method === "EXPRESS" ? SHIPPING.EXPRESS.fee : afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING.STANDARD.fee;
  return {
    lines, count: lines.reduce((s, l) => s + l.quantity, 0), subtotal, savings, discount,
    couponCode: coupon && !couponError ? coupon.code : null, couponError: cart?.couponCode ? couponError : null,
    couponDescription: coupon?.description ?? null,
    shippingMethod: method, shippingFee, total: afterDiscount + shippingFee,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    hasIssues: lines.some((l) => l.issue),
  };
}
export type CartSummary = Awaited<ReturnType<typeof summarize>>;

export async function cartCount() {
  const cart = await currentCart();
  return cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
}

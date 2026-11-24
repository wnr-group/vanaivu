"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function toggleWishlistAction(productId: string) {
  const s = await getSession();
  if (!s) return { ok: false as const, needsLogin: true as const };
  const wl = await db.wishlist.upsert({ where: { userId: s.userId }, create: { userId: s.userId }, update: {} });
  const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    const p = await db.product.findUnique({ where: { id: productId }, select: { price: true } });
    if (!p) return { ok: false as const, needsLogin: false as const };
    await db.wishlistItem.create({ data: { wishlistId: wl.id, productId, priceAtAdd: p.price } });
  }
  revalidatePath("/", "layout");
  return { ok: true as const, saved: !existing };
}

export async function setStockAlertAction(itemId: string, notify: boolean) {
  const s = await getSession();
  if (!s) return { ok: false };
  await db.wishlistItem.updateMany({ where: { id: itemId, wishlist: { userId: s.userId } }, data: { notifyStock: notify } });
  revalidatePath("/account/wishlist");
  return { ok: true };
}

export async function getWishlistIds() {
  const s = await getSession();
  if (!s) return [] as string[];
  const items = await db.wishlistItem.findMany({ where: { wishlist: { userId: s.userId } }, select: { productId: true } });
  return items.map((i) => i.productId);
}

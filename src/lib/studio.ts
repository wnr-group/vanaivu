import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { available } from "./cart";
import { sizeMeasurements } from "./catalog";

export const studioInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  variants: { include: { inventory: true } },
  garment: true,
  assets: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ProductInclude;

type Row = Prisma.ProductGetPayload<{ include: typeof studioInclude }>;

const ORDER = ["XS", "S", "M", "L", "XL", "XXL", "ONE"];

export type StudioProduct = {
  id: string; slug: string; name: string; price: number; compareAtPrice: number | null; image: string; category: string; categorySlug: string;
  sleeve: string; neckline: string; pattern: string; fit: string;
  garment: { slot: string; silhouette: string; lengthRatio: number; ease: number; fabric: string; skeleton: string; clothSim: boolean };
  assets: { color: string | null; format: string; url: string | null }[];
  colours: { name: string; hex: string; image: string }[];
  variants: { id: string; color: string; size: string; price: number; available: number }[];
  measurements: Record<string, { bust: number; waist: number; hip: number; length: number }>;
};

export function toStudioProduct(p: Row): StudioProduct | null {
  if (!p.garment) return null;
  const colours = [...new Map(p.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({
    name, hex, image: (p.images.find((i) => i.color === name) ?? p.images[0])?.url ?? "",
  }));
  return {
    id: p.id, slug: p.slug, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, image: p.images[0]?.url ?? "",
    category: p.category.name, categorySlug: p.category.slug, sleeve: p.sleeve, neckline: p.neckline, pattern: p.pattern, fit: p.fit,
    garment: { slot: p.garment.slot, silhouette: p.garment.silhouette, lengthRatio: p.garment.lengthRatio, ease: p.garment.ease, fabric: p.garment.fabric, skeleton: p.garment.skeleton, clothSim: p.garment.clothSim },
    assets: p.assets.map((a) => ({ color: a.color, format: a.format, url: a.url })),
    colours,
    variants: p.variants.map((v) => ({ id: v.id, color: v.color, size: v.size, price: p.price + v.priceDelta, available: available(v.inventory) }))
      .sort((a, b) => ORDER.indexOf(a.size) - ORDER.indexOf(b.size)),
    measurements: sizeMeasurements(p),
  };
}

export async function studioCatalog(opts: { slot?: string; q?: string; slugs?: string[] }) {
  const rows = await db.product.findMany({
    where: {
      published: true, tryOnEnabled: true,
      ...(opts.slugs ? { slug: { in: opts.slugs } } : {}),
      ...(opts.slot ? { garment: { slot: opts.slot } } : {}),
      ...(opts.q ? { OR: [{ name: { contains: opts.q } }, { category: { name: { contains: opts.q } } }] } : {}),
    },
    include: studioInclude,
    orderBy: [{ isTrending: "desc" }, { popularity: "desc" }],
    take: 80,
  });
  return rows.map(toStudioProduct).filter((x): x is StudioProduct => !!x);
}

import type { ProductFull } from "./catalog";
import { sizeMeasurements } from "./catalog";
import { available } from "./cart";

export type PdpData = {
  id: string; slug: string; name: string; description: string; price: number; compareAtPrice: number | null;
  rating: number; ratingCount: number; category: { slug: string; name: string }; brand: string;
  material: string; composition: string; care: string; fit: string; occasion: string; modelInfo: string | null;
  tryOnEnabled: boolean; aiTryOnEnabled: boolean; slot: string | null;
  images: { url: string; alt: string; color: string | null; kind: string }[];
  colours: { name: string; hex: string }[];
  variants: { id: string; color: string; size: string; price: number; available: number; sku: string }[];
  measurements: Record<string, { bust: number; waist: number; hip: number; length: number }>;
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "ONE"];

export function toPdp(p: ProductFull): PdpData {
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description, price: p.price, compareAtPrice: p.compareAtPrice,
    rating: p.rating, ratingCount: p.ratingCount, category: { slug: p.category.slug, name: p.category.name }, brand: p.brand.name,
    material: p.material, composition: p.composition, care: p.care, fit: p.fit, occasion: p.occasion, modelInfo: p.modelInfo,
    tryOnEnabled: p.tryOnEnabled, aiTryOnEnabled: p.aiTryOnEnabled, slot: p.garment?.slot ?? null,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color, kind: i.kind })),
    colours: [...new Map(p.variants.map((v) => [v.color, { name: v.color, hex: v.colorHex }])).values()],
    variants: p.variants
      .map((v) => ({ id: v.id, color: v.color, size: v.size, price: p.price + v.priceDelta, available: available(v.inventory), sku: v.sku }))
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)),
    measurements: sizeMeasurements(p),
  };
}

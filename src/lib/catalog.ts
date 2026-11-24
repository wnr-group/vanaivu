import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { parseJSON } from "./format";

// ───────── Scopes (virtual categories used by navigation) ─────────
export const SCOPES: Record<string, { title: string; blurb: string; where: Prisma.ProductWhereInput }> = {
  "new-in": { title: "New In", blurb: "The latest arrivals from the VESTRA studio.", where: { isNew: true } },
  clothing: { title: "Clothing", blurb: "The full VESTRA wardrobe, from everyday essentials to occasion wear.", where: { category: { slug: { not: "accessories" } } } },
  bottoms: { title: "Bottoms", blurb: "Jeans, trousers and skirts.", where: { category: { slug: { in: ["jeans-trousers", "skirts"] } } } },
  sale: { title: "Sale", blurb: "Selected pieces, now reduced.", where: { compareAtPrice: { not: null } } },
  trending: { title: "Trending Now", blurb: "What everyone is adding to their bag this week.", where: { isTrending: true } },
};

export async function resolveScope(slug: string) {
  if (SCOPES[slug]) return { slug, ...SCOPES[slug], categorySlug: null as string | null };
  const cat = await db.productCategory.findUnique({ where: { slug } });
  if (!cat) return null;
  return { slug, title: cat.name, blurb: cat.description ?? "", where: { categoryId: cat.id } as Prisma.ProductWhereInput, categorySlug: cat.slug };
}

// ───────── Filters ─────────
export const FILTER_KEYS = ["category", "size", "color", "brand", "material", "occasion", "style", "fit", "sleeve", "neckline", "pattern"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Partial<Record<FilterKey, string[]>> & {
  minPrice?: number; maxPrice?: number; inStock?: boolean; onSale?: boolean; q?: string; sort?: string;
};

export const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Best rated" },
];

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const list = (k: string) => {
    const v = sp[k];
    if (!v) return undefined;
    const arr = (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  };
  const num = (k: string) => {
    const v = Number(sp[k]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const f: Filters = {};
  for (const k of FILTER_KEYS) f[k] = list(k);
  f.minPrice = num("min");
  f.maxPrice = num("max");
  f.inStock = sp.stock === "1";
  f.onSale = sp.sale === "1";
  f.q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : undefined;
  f.sort = typeof sp.sort === "string" ? sp.sort : "recommended";
  return f;
}

function searchWhere(q: string): Prisma.ProductWhereInput {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    AND: terms.map((t) => ({
      OR: [
        { name: { contains: t } }, { description: { contains: t } }, { material: { contains: t } },
        { occasion: { contains: t } }, { style: { contains: t } }, { pattern: { contains: t } },
        { category: { name: { contains: t } } }, { variants: { some: { color: { contains: t } } } },
      ],
    })),
  };
}

export function buildWhere(base: Prisma.ProductWhereInput, f: Filters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [base, { published: true }];
  if (f.category) and.push({ category: { slug: { in: f.category } } });
  if (f.brand) and.push({ brand: { slug: { in: f.brand } } });
  for (const k of ["material", "occasion", "style", "fit", "sleeve", "neckline", "pattern"] as const) {
    if (f[k]) and.push({ [k]: { in: f[k] } });
  }
  if (f.minPrice) and.push({ price: { gte: f.minPrice } });
  if (f.maxPrice) and.push({ price: { lte: f.maxPrice } });
  if (f.onSale) and.push({ compareAtPrice: { not: null } });
  if (f.size || f.color || f.inStock) {
    and.push({
      variants: {
        some: {
          ...(f.size ? { size: { in: f.size } } : {}),
          ...(f.color ? { color: { in: f.color } } : {}),
          ...(f.inStock ? { inventory: { quantity: { gt: 0 } } } : {}),
        },
      },
    });
  }
  if (f.q) and.push(searchWhere(f.q));
  return { AND: and };
}

function orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest": return [{ createdAt: "desc" }];
    case "popular": return [{ popularity: "desc" }];
    case "price-asc": return [{ price: "asc" }];
    case "price-desc": return [{ price: "desc" }];
    case "rating": return [{ rating: "desc" }, { ratingCount: "desc" }];
    default: return [{ isTrending: "desc" }, { isNew: "desc" }, { popularity: "desc" }];
  }
}

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  variants: { include: { inventory: true } },
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductCard = {
  id: string; slug: string; name: string; price: number; compareAtPrice: number | null;
  image: string; hoverImage: string | null; colours: { name: string; hex: string; image: string }[];
  isNew: boolean; inStock: boolean; tryOnEnabled: boolean; rating: number; ratingCount: number; category: string;
  quickAdd: { variantId: string; color: string; size: string }[];
};

export function toCard(p: CardRow): ProductCard {
  const colours: ProductCard["colours"] = [];
  for (const v of p.variants) {
    if (!colours.find((c) => c.name === v.color)) {
      const im = p.images.find((i) => i.color === v.color) ?? p.images[0];
      colours.push({ name: v.color, hex: v.colorHex, image: im?.url ?? "" });
    }
  }
  const first = colours[0]?.name;
  const firstImgs = p.images.filter((i) => !i.color || i.color === first);
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "ONE", "36", "37", "38", "39", "40"];
  return {
    id: p.id, slug: p.slug, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice,
    image: firstImgs[0]?.url ?? p.images[0]?.url ?? "",
    hoverImage: firstImgs[1]?.url ?? p.images.find((i) => i.url !== firstImgs[0]?.url)?.url ?? null,
    colours, isNew: p.isNew, tryOnEnabled: p.tryOnEnabled, rating: p.rating, ratingCount: p.ratingCount,
    category: p.category.name,
    inStock: p.variants.some((v) => (v.inventory?.quantity ?? 0) > 0),
    quickAdd: p.variants
      .filter((v) => v.color === first && (v.inventory?.quantity ?? 0) > 0)
      .sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))
      .map((v) => ({ variantId: v.id, color: v.color, size: v.size })),
  };
}

export async function listProducts(base: Prisma.ProductWhereInput, f: Filters, take = 60) {
  const where = buildWhere(base, f);
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, include: cardInclude, orderBy: orderBy(f.sort), take }),
    db.product.count({ where }),
  ]);
  return { products: rows.map(toCard), total };
}

export type Facets = Record<FilterKey, { value: string; label: string; count: number; hex?: string }[]> & {
  priceMin: number; priceMax: number;
};

/** Facet values available within the base scope (so options never lead to an empty set). */
export async function getFacets(base: Prisma.ProductWhereInput): Promise<Facets> {
  const rows = await db.product.findMany({
    where: { AND: [base, { published: true }] },
    select: {
      price: true, material: true, occasion: true, style: true, fit: true, sleeve: true, neckline: true, pattern: true,
      category: { select: { slug: true, name: true } }, brand: { select: { slug: true, name: true } },
      variants: { select: { size: true, color: true, colorHex: true } },
    },
  });
  const tally = (vals: { value: string; label: string; hex?: string }[]) => {
    const m = new Map<string, { value: string; label: string; count: number; hex?: string }>();
    for (const v of vals) {
      const e = m.get(v.value) ?? { ...v, count: 0 };
      e.count++;
      m.set(v.value, e);
    }
    return [...m.values()];
  };
  const simple = (k: "material" | "occasion" | "style" | "fit" | "sleeve" | "neckline" | "pattern") =>
    tally(rows.filter((r) => r[k] !== "NA").map((r) => ({ value: r[k], label: r[k] }))).sort((a, b) => a.label.localeCompare(b.label));
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "ONE"];
  return {
    category: tally(rows.map((r) => ({ value: r.category.slug, label: r.category.name }))),
    brand: tally(rows.map((r) => ({ value: r.brand.slug, label: r.brand.name }))),
    size: tally(rows.flatMap((r) => [...new Set(r.variants.map((v) => v.size))].map((s) => ({ value: s, label: s === "ONE" ? "One size" : s }))))
      .sort((a, b) => sizeOrder.indexOf(a.value) - sizeOrder.indexOf(b.value)),
    color: tally(rows.flatMap((r) => {
      const seen = new Map(r.variants.map((v) => [v.color, v.colorHex]));
      return [...seen].map(([c, hex]) => ({ value: c, label: c, hex }));
    })).sort((a, b) => b.count - a.count),
    material: simple("material"), occasion: simple("occasion"), style: simple("style"), fit: simple("fit"),
    sleeve: simple("sleeve"), neckline: simple("neckline"), pattern: simple("pattern"),
    priceMin: Math.min(...rows.map((r) => r.price), 0),
    priceMax: Math.max(...rows.map((r) => r.price), 0),
  };
}

export async function searchSuggestions(q: string) {
  if (q.trim().length < 2) return { products: [], categories: [] };
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: buildWhere({}, { q }), include: cardInclude, take: 6, orderBy: { popularity: "desc" } }),
    db.productCategory.findMany({ where: { name: { contains: q.trim() } }, take: 4 }),
  ]);
  return {
    products: products.map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? "", category: p.category.name })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  };
}

export const productInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  variants: { include: { inventory: true } },
  category: true,
  brand: true,
  garment: true,
  reviews: { orderBy: { createdAt: "desc" }, take: 20 },
  collections: { include: { collection: { include: { products: { include: { product: { include: cardInclude } }, orderBy: { sortOrder: "asc" } } } } } },
} satisfies Prisma.ProductInclude;

export async function getProduct(slug: string) {
  const p = await db.product.findUnique({ where: { slug }, include: productInclude });
  if (!p || !p.published) return null;
  return p;
}
export type ProductFull = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export async function relatedProducts(p: { id: string; categoryId: string }, take = 8) {
  const rows = await db.product.findMany({
    where: { categoryId: p.categoryId, id: { not: p.id }, published: true },
    include: cardInclude, orderBy: { popularity: "desc" }, take,
  });
  return rows.map(toCard);
}

/** "Complete the look": pieces from other garment slots that share a collection, falling back to complementary slots. */
export async function completeTheLook(p: ProductFull, take = 4) {
  const slot = p.garment?.slot;
  const seen = new Set([p.id]);
  const out: ProductCard[] = [];
  for (const cp of p.collections) {
    for (const x of cp.collection.products) {
      if (seen.has(x.productId)) continue;
      seen.add(x.productId);
      out.push(toCard(x.product));
    }
  }
  if (out.length < take) {
    const wanted = slot === "TOP" ? ["BOTTOM", "OUTER", "ACCESSORY"] : slot === "BOTTOM" ? ["TOP", "OUTER", "ACCESSORY"] : ["OUTER", "ACCESSORY"];
    const more = await db.product.findMany({
      where: { id: { notIn: [...seen] }, published: true, garment: { slot: { in: wanted } } },
      include: cardInclude, orderBy: { popularity: "desc" }, take: take - out.length,
    });
    out.push(...more.map(toCard));
  }
  return out.slice(0, take);
}

export const sizeMeasurements = (p: { measurements: string }) =>
  parseJSON<Record<string, { bust: number; waist: number; hip: number; length: number }>>(p.measurements, {});

export async function getNavData() {
  const [categories, collections] = await Promise.all([
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return { categories, collections };
}

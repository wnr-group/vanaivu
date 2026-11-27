import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { ProductGrid } from "@/components/product/ProductGrid";

export const metadata: Metadata = { title: "A look styled on VANAIVU" };

/** Public, read-only view of a shared look (outfit ids are unguessable). Shows products only, never the owner's avatar or measurements. */
export default async function SharedLook({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.savedOutfit.findUnique({ where: { id }, include: { items: { include: { variant: { include: { product: { include: cardInclude } } } } } } });
  if (!o) notFound();
  const products = o.items.map((i) => toCard(i.variant.product));
  const total = o.items.reduce((s, i) => s + i.variant.product.price + i.variant.priceDelta, 0);
  return (
    <div className="container-x pt-14">
      <p className="eyebrow text-stone">A look styled in the VANAIVU Studio</p>
      <h1 className="display text-[56px] lg:text-[88px] mt-4">{o.name}</h1>
      <p className="text-stone mt-3">{products.length} pieces · {formatINR(total)}</p>
      <div className="flex gap-2 mt-8">
        <Link href={`/studio?products=${products.map((p) => p.slug).join(",")}`} className="btn-dark">Try this look on</Link>
      </div>
      <div className="mt-12"><ProductGrid products={products} /></div>
    </div>
  );
}

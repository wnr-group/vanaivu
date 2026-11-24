import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";
import { formatINR, imgUrl, parseJSON } from "@/lib/format";
import { ProductGrid } from "@/components/product/ProductGrid";
import { LookActions } from "@/components/account/LookActions";

export const metadata: Metadata = { title: "My Wardrobe" };

export default async function WardrobePage() {
  const s = await requireUser("/account/wardrobe");
  const wardrobe = await db.wardrobe.upsert({ where: { userId: s.userId }, create: { userId: s.userId }, update: {} });
  const [outfits, purchased, favourites] = await Promise.all([
    db.savedOutfit.findMany({
      where: { wardrobeId: wardrobe.id }, orderBy: { updatedAt: "desc" },
      include: { items: { include: { variant: { include: { inventory: true, product: { select: { slug: true, name: true, price: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } } } },
    }),
    db.orderItem.findMany({ where: { order: { userId: s.userId, status: { notIn: ["CANCELLED", "PENDING"] } } }, distinct: ["variantId"], orderBy: { id: "desc" }, take: 12, include: { variant: { include: { product: { include: cardInclude } } } } }),
    db.wishlistItem.findMany({ where: { wishlist: { userId: s.userId } }, take: 8, orderBy: { createdAt: "desc" }, include: { product: { include: cardInclude } } }),
  ]);
  const triedIds = parseJSON<string[]>(wardrobe.triedOn, []).slice(0, 8);
  const tried = triedIds.length ? await db.product.findMany({ where: { id: { in: triedIds } }, include: cardInclude }) : [];
  const triedSorted = triedIds.map((id) => tried.find((t) => t.id === id)).filter(Boolean).map((p) => toCard(p!));

  return (
    <div className="space-y-20">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="font-serif text-4xl lg:text-5xl">My Wardrobe</h1><p className="text-stone text-[14px] mt-2">Your saved looks, pieces you&apos;ve tried on and everything you own from VESTRA.</p></div>
          <Link href="/studio" className="btn-dark">Style a new look</Link>
        </div>
        <h2 className="font-serif text-2xl mt-12 mb-6">My looks <span className="text-stone text-lg">({outfits.length})</span></h2>
        {outfits.length === 0 ? <p className="text-stone text-[14px]">No saved looks yet. Build one in the <Link href="/studio" className="link-u text-ink">Virtual Studio</Link>.</p> : (
          <ul className="grid sm:grid-cols-2 gap-6">
            {outfits.map((o) => {
              const total = o.items.reduce((sum, i) => sum + i.variant.product.price + i.variant.priceDelta, 0);
              return (
                <li key={o.id} className="border border-line p-5">
                  <div className="flex justify-between items-baseline gap-3"><p className="font-serif text-2xl">{o.name}</p><p className="text-[13px]">{formatINR(total)}</p></div>
                  <p className="text-[12px] text-stone mt-1">Updated {o.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {o.items.length} pieces</p>
                  <div className="flex gap-2 mt-4">
                    {o.items.map((i) => (
                      <Link key={i.id} href={`/product/${i.variant.product.slug}`} className="relative w-16 aspect-[3/4] bg-mist" title={`${i.variant.product.name} · ${i.variant.color} · ${i.variant.size}`}>
                        <Image src={imgUrl(i.variant.product.images[0]?.url ?? "", 140)} alt={i.variant.product.name} fill sizes="64px" className="object-cover" />
                      </Link>
                    ))}
                  </div>
                  <LookActions outfitId={o.id} name={o.name} variantIds={o.items.map((i) => i.variantId)} soldOut={o.items.some((i) => (i.variant.inventory?.quantity ?? 0) <= 0)} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-6">Recently tried on</h2>
        {triedSorted.length ? <ProductGrid products={triedSorted} /> : <p className="text-stone text-[14px]">Pieces you try on in the Studio will appear here.</p>}
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-6">Purchased</h2>
        {purchased.length ? <ProductGrid products={purchased.map((p) => toCard(p.variant.product))} /> : <p className="text-stone text-[14px]">Your VESTRA purchases will live here, ready to style with new pieces.</p>}
      </section>

      <section>
        <div className="flex justify-between items-end mb-6"><h2 className="font-serif text-2xl">Favourites</h2><Link href="/account/wishlist" className="eyebrow link-u">Full wishlist</Link></div>
        {favourites.length ? <ProductGrid products={favourites.map((f) => toCard(f.product))} /> : <p className="text-stone text-[14px]">Save pieces with the heart icon.</p>}
      </section>
    </div>
  );
}

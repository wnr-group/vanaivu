import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { ProductCard } from "@/components/product/ProductCard";
import { StockAlertToggle } from "@/components/account/StockAlertToggle";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const s = await requireUser("/account/wishlist");
  const items = await db.wishlistItem.findMany({ where: { wishlist: { userId: s.userId } }, orderBy: { createdAt: "desc" }, include: { product: { include: cardInclude } } });
  const collections = await db.collection.findMany({ where: { featured: true }, take: 3 });
  return (
    <div>
      <h1 className="font-serif text-4xl lg:text-5xl">Wishlist</h1>
      <p className="text-stone text-[14px] mt-2">{items.length} saved {items.length === 1 ? "piece" : "pieces"}. We&apos;ll flag price drops and let you know when sold-out sizes return.</p>
      {items.length === 0 ? (
        <div className="py-20"><p className="font-serif text-2xl">Nothing saved yet</p><p className="text-stone mt-2 text-[14px]">Tap the heart on any piece to keep it here.</p><Link href="/shop/new-in" className="btn-dark mt-6">Discover new in</Link></div>
      ) : (
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12 mt-10">
          {items.map((it) => {
            const card = toCard(it.product);
            const drop = it.priceAtAdd - it.product.price;
            return (
              <li key={it.id}>
                <ProductCard p={card} wishlisted />
                {drop > 0 && <p className="text-[12px] text-terracotta mt-1">Price dropped {formatINR(drop)} since you saved it</p>}
                {drop < 0 && <p className="text-[12px] text-stone mt-1">Price was {formatINR(it.priceAtAdd)} when saved</p>}
                {(!card.inStock || card.quickAdd.length < 4) && <StockAlertToggle itemId={it.id} initial={it.notifyStock} />}
              </li>
            );
          })}
        </ul>
      )}
      {collections.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl mb-5">Saved collections to explore</h2>
          <div className="flex flex-wrap gap-2">{collections.map((c) => <Link key={c.slug} href={`/collections/${c.slug}`} className="px-4 h-10 leading-10 border border-ink/15 text-[13px] hover:border-ink">{c.name}</Link>)}</div>
        </section>
      )}
    </div>
  );
}

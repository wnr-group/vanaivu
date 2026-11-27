import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR, imgUrl } from "@/lib/format";

export const metadata: Metadata = { title: "My account" };

export default async function AccountHome() {
  const s = await requireUser();
  const [orders, wishCount, outfits, avatars, measure] = await Promise.all([
    db.order.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "desc" }, take: 3, include: { items: { take: 1 } } }),
    db.wishlistItem.count({ where: { wishlist: { userId: s.userId } } }),
    db.savedOutfit.count({ where: { wardrobe: { userId: s.userId } } }),
    db.avatar.count({ where: { userId: s.userId } }),
    db.customerMeasurement.findFirst({ where: { userId: s.userId } }),
  ]);
  const tiles = [
    { href: "/account/wardrobe", label: "Saved looks", value: outfits },
    { href: "/account/wishlist", label: "Wishlist", value: wishCount },
    { href: "/account/orders", label: "Orders", value: orders.length },
    { href: "/studio", label: "Avatars", value: avatars },
  ];
  return (
    <div>
      <h1 className="font-serif text-4xl lg:text-5xl">Your VANAIVU</h1>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line mt-10 border border-line">
        {tiles.map((t) => (
          <li key={t.href} className="bg-paper"><Link href={t.href} className="block p-6 hover:bg-mist/50 transition-colors"><p className="font-serif text-4xl">{t.value}</p><p className="eyebrow text-stone mt-2">{t.label}</p></Link></li>
        ))}
      </ul>
      {!measure && (
        <div className="mt-10 bg-ink text-paper p-8 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
          <div><p className="font-serif text-2xl">Add your measurements</p><p className="text-paper/60 text-[14px] mt-1">Get size suggestions on every product and a true-to-you avatar in the Studio.</p></div>
          <Link href="/account/profile#measurements" className="btn-light shrink-0">Add measurements</Link>
        </div>
      )}
      <section className="mt-14">
        <div className="flex justify-between items-end mb-6"><h2 className="font-serif text-2xl">Recent orders</h2><Link href="/account/orders" className="eyebrow link-u">All orders</Link></div>
        {orders.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="py-5 flex gap-5 items-center hover:bg-mist/30 transition-colors">
                  {o.items[0] && <div className="relative w-14 aspect-[3/4] bg-mist"><Image src={imgUrl(o.items[0].image, 120)} alt="" fill sizes="56px" className="object-cover" /></div>}
                  <div className="flex-1 text-[14px]"><p>{o.number}</p><p className="text-stone text-[13px]">{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                  <span className="text-[11px] uppercase tracking-[0.14em]">{o.status}</span>
                  <span className="text-[14px] w-24 text-right">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-stone text-[14px]">No orders yet. <Link href="/shop/new-in" className="link-u text-ink">Discover the new season</Link>.</p>}
      </section>
    </div>
  );
}

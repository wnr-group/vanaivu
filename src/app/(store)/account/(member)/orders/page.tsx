import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR, imgUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Orders & returns" };

export default async function OrdersPage() {
  const s = await requireUser();
  const orders = await db.order.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "desc" }, include: { items: true, returns: true } });
  return (
    <div>
      <h1 className="font-serif text-4xl lg:text-5xl">Orders & returns</h1>
      {orders.length === 0 ? <p className="text-stone mt-8">You haven&apos;t placed any orders yet.</p> : (
        <ul className="mt-10 space-y-6">
          {orders.map((o) => (
            <li key={o.id} className="border border-line">
              <div className="flex flex-wrap gap-x-10 gap-y-2 justify-between bg-mist/50 px-5 py-4 text-[13px]">
                <div><p className="text-stone">Order</p><p>{o.number}</p></div>
                <div><p className="text-stone">Placed</p><p>{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                <div><p className="text-stone">Total</p><p>{formatINR(o.total)}</p></div>
                <div><p className="text-stone">Status</p><p className="uppercase tracking-[0.1em] text-[12px]">{o.status}{o.returns.length ? ` · Return ${o.returns[0].status.toLowerCase()}` : ""}</p></div>
                <Link href={`/account/orders/${o.id}`} className="eyebrow link-u self-center">View details</Link>
              </div>
              <div className="flex gap-3 p-5 overflow-x-auto no-scrollbar">
                {o.items.map((it) => <div key={it.id} className="relative w-16 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(it.image, 140)} alt={it.productName} fill sizes="64px" className="object-cover" /></div>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

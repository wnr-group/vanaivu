import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude } from "@/lib/orders";
import { formatINR, imgUrl, parseJSON } from "@/lib/format";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { OrderActions } from "@/components/account/OrderActions";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser();
  const { id } = await params;
  const o = await db.order.findFirst({ where: { id, userId: s.userId }, include: orderInclude });
  if (!o) notFound();
  const addr = parseJSON<Record<string, string>>(o.shippingAddress, {});
  const refund = o.payments.flatMap((p) => p.refunds)[0];
  return (
    <div className="max-w-4xl">
      <Link href="/account/orders" className="eyebrow text-stone hover:text-ink">← All orders</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
        <h1 className="font-serif text-4xl">Order {o.number}</h1>
        <p className="text-stone text-[13px]">Placed {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <div className="mt-10"><OrderTimeline status={o.status} events={parseJSON(o.shipment?.events, [])} eta={o.shipment?.eta?.toISOString() ?? null} tracking={o.shipment?.trackingNo ?? null} /></div>
      {o.returns[0] && <p className="mt-6 bg-mist/60 px-5 py-4 text-[13px]">Return {o.returns[0].status.toLowerCase()} · Reason: {o.returns[0].reason}</p>}
      {refund && <p className="mt-3 bg-mist/60 px-5 py-4 text-[13px]">Refund of {formatINR(refund.amount)} {refund.status.toLowerCase()}.</p>}
      <ul className="mt-10 border-t border-ink divide-y divide-line">
        {o.items.map((it) => (
          <li key={it.id} className="py-5 flex gap-4 text-[14px]">
            <Link href={`/product/${it.variant.product.slug}`} className="relative w-20 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(it.image, 200)} alt="" fill sizes="80px" className="object-cover" /></Link>
            <div className="flex-1"><p>{it.productName}</p><p className="text-stone text-[13px] mt-1">{it.color} · {it.size} · Qty {it.quantity}</p></div>
            <p>{formatINR(it.unitPrice * it.quantity)}</p>
          </li>
        ))}
      </ul>
      <div className="grid sm:grid-cols-2 gap-10 mt-10 text-[14px]">
        <div><p className="eyebrow text-stone mb-3">Delivery address</p><p>{addr.fullName}</p><p className="text-stone">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.pincode}</p></div>
        <dl className="space-y-2">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-terracotta"><dt>Discount {o.couponCode}</dt><dd>−{formatINR(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shippingFee ? formatINR(o.shippingFee) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-ink pt-3"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
        </dl>
      </div>
      <OrderActions orderId={o.id} status={o.status} hasReturn={o.returns.some((r) => r.status !== "REJECTED")} invoiceHref={`/account/orders/${o.id}/invoice`} />
    </div>
  );
}

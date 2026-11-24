import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { orderInclude } from "@/lib/orders";
import { formatINR, imgUrl, parseJSON } from "@/lib/format";
import { OrderTimeline } from "@/components/account/OrderTimeline";

export const metadata: Metadata = { title: "Order confirmation" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { number } = await params;
  const { placed } = await searchParams;
  const order = await db.order.findUnique({ where: { number }, include: orderInclude });
  if (!order) notFound();
  const session = await getSession();
  const mine = ((await cookies()).get("vestra_orders")?.value ?? "").split(",");
  const allowed = (session && (order.userId === session.userId || session.role === "ADMIN")) || mine.includes(number);
  if (!allowed) notFound();
  const addr = parseJSON<Record<string, string>>(order.shippingAddress, {});
  const pay = order.payments[0];
  return (
    <div className="container-x pt-12 lg:pt-20 max-w-5xl">
      {placed && order.status !== "CANCELLED" && (
        <div className="text-center mb-16">
          <span className="inline-flex w-14 h-14 rounded-full bg-ink text-paper items-center justify-center"><Check size={24} /></span>
          <h1 className="display text-[48px] lg:text-[72px] mt-6">Thank you{addr.fullName ? `, ${addr.fullName.split(" ")[0]}` : ""}.</h1>
          <p className="text-stone mt-4">Your order <strong className="text-ink font-medium">{order.number}</strong> is confirmed. A confirmation will be sent to {order.email}.</p>
        </div>
      )}
      {!placed && <h1 className="font-serif text-4xl lg:text-5xl mb-10">Order {order.number}</h1>}
      <div className="grid lg:grid-cols-[1fr_320px] gap-12">
        <div>
          <OrderTimeline status={order.status} events={parseJSON(order.shipment?.events, [])} eta={order.shipment?.eta?.toISOString() ?? null} tracking={order.shipment?.trackingNo ?? null} />
          <ul className="mt-10 border-t border-ink divide-y divide-line">
            {order.items.map((it) => (
              <li key={it.id} className="py-5 flex gap-4">
                <Link href={`/product/${it.variant.product.slug}`} className="relative w-20 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(it.image, 200)} alt="" fill sizes="80px" className="object-cover" /></Link>
                <div className="flex-1 text-[14px]"><p>{it.productName}</p><p className="text-stone text-[13px] mt-1">{it.color} · {it.size} · Qty {it.quantity}</p></div>
                <p className="text-[14px]">{formatINR(it.unitPrice * it.quantity)}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-8 text-[14px]">
          <div>
            <p className="eyebrow text-stone mb-3">Delivering to</p>
            <p>{addr.fullName}</p><p className="text-stone">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.pincode}<br />{addr.phone}</p>
          </div>
          <div>
            <p className="eyebrow text-stone mb-3">Payment</p>
            <p>{pay?.provider === "cod" ? "Cash on delivery" : pay?.provider === "test" ? "Online (test provider)" : "Razorpay"} · <span className="text-stone">{pay?.status === "CAPTURED" ? "Paid" : pay?.status === "FAILED" ? "Failed" : pay?.provider === "cod" ? "Due on delivery" : "Pending"}</span></p>
          </div>
          <dl className="space-y-2 border-t border-line pt-5">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-terracotta"><dt>Discount</dt><dd>−{formatINR(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping ({order.shippingMethod.toLowerCase()})</dt><dd>{order.shippingFee ? formatINR(order.shippingFee) : "Free"}</dd></div>
            <div className="flex justify-between border-t border-ink pt-3 text-[16px]"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
          </dl>
          <div className="grid gap-2">
            {session ? <Link href={`/account/orders/${order.id}`} className="btn-dark">Manage order</Link> : <Link href="/account/register" className="btn-dark">Create an account</Link>}
            <Link href="/shop/new-in" className="btn-outline">Continue shopping</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

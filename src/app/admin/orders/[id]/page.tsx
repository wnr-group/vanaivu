import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orderInclude } from "@/lib/orders";
import { formatINR, parseJSON } from "@/lib/format";
import { Card } from "@/components/admin/AdminNav";
import { updateOrderAction, processRefundAction, updateReturnAction } from "@/app/actions/admin";

export const metadata = { title: "Order" };
const NEXT: Record<string, string[]> = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PACKED", "CANCELLED"], PACKED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [], RETURNED: [] };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { ...orderInclude, user: { select: { id: true, name: true } } } });
  if (!o) notFound();
  const a = parseJSON<Record<string, string>>(o.shippingAddress, {});
  const events = parseJSON<{ status: string; at: string; note: string }[]>(o.shipment?.events, []);
  return (
    <div className="max-w-5xl space-y-6">
      <div><Link href="/admin/orders" className="text-[12px] text-stone">← Orders</Link><h1 className="font-serif text-4xl mt-1">{o.number}</h1><p className="text-stone text-[13px]">{o.createdAt.toLocaleString("en-IN")} · {o.status}</p></div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card title="Items">
          <ul className="divide-y divide-line text-[13px]">{o.items.map((i) => <li key={i.id} className="py-2 flex justify-between gap-3"><span>{i.productName} · {i.color} / {i.size} × {i.quantity}</span><span>{formatINR(i.unitPrice * i.quantity)}</span></li>)}</ul>
          <dl className="mt-4 text-[13px] space-y-1"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>{o.discount > 0 && <div className="flex justify-between"><dt>Discount ({o.couponCode})</dt><dd>−{formatINR(o.discount)}</dd></div>}<div className="flex justify-between"><dt>Shipping ({o.shippingMethod})</dt><dd>{formatINR(o.shippingFee)}</dd></div><div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div></dl>
        </Card>
        <Card title="Customer">
          <p className="text-[13px]">{a.fullName}<br />{o.email}<br />{a.phone}</p>
          <p className="text-[13px] text-stone mt-3">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p>
          {o.user && <Link href={`/admin/customers/${o.user.id}`} className="text-[12px] underline mt-3 inline-block">Customer profile</Link>}
        </Card>
      </div>
      <Card title="Fulfilment">
        <form action={updateOrderAction} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="id" value={o.id} />
          <label><span className="label">Status</span><select name="status" defaultValue="" className="field-box bg-white w-48"><option value="">Keep {o.status}</option>{NEXT[o.status].map((s) => <option key={s}>{s}</option>)}</select></label>
          <label><span className="label">Tracking number</span><input name="trackingNo" defaultValue={o.shipment?.trackingNo ?? ""} className="field-box bg-white w-56" /></label>
          <button className="btn-dark h-11">Update</button>
        </form>
        <ul className="mt-5 text-[12px] text-stone space-y-1">{events.map((e, i) => <li key={i}>{new Date(e.at).toLocaleString("en-IN")} · {e.status} · {e.note}</li>)}</ul>
      </Card>
      <Card title="Payments & refunds">
        <ul className="text-[13px] space-y-2">
          {o.payments.map((p) => (
            <li key={p.id}>
              <p>{p.provider} · {p.status} · {formatINR(p.amount)} {p.providerPaymentId && <span className="text-stone">({p.providerPaymentId})</span>}</p>
              {p.refunds.map((r) => (
                <div key={r.id} className="flex items-center gap-3 ml-4 mt-1 text-[12px]">Refund {formatINR(r.amount)} · {r.status}
                  {r.status === "PENDING" && <form action={processRefundAction}><input type="hidden" name="id" value={r.id} /><button className="underline">Process refund</button></form>}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </Card>
      {o.returns.length > 0 && (
        <Card title="Returns">
          {o.returns.map((r) => (
            <form key={r.id} action={updateReturnAction} className="flex flex-wrap items-center gap-3 text-[13px]">
              <input type="hidden" name="id" value={r.id} />
              <span>{r.createdAt.toLocaleDateString("en-IN")} · “{r.reason}” · <strong className="font-medium">{r.status}</strong></span>
              <select name="status" defaultValue={r.status} className="field-box h-9 w-40 bg-white">{["REQUESTED", "APPROVED", "REJECTED", "RECEIVED"].map((s) => <option key={s}>{s}</option>)}</select>
              <button className="btn-outline h-9 px-4">Update</button>
              <span className="text-[11px] text-stone">Marking RECEIVED restocks items and creates a refund.</span>
            </form>
          ))}
        </Card>
      )}
    </div>
  );
}

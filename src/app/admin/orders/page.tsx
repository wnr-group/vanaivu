import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Orders" };
const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const orders = await db.order.findMany({
    where: { ...(status ? { status } : {}), ...(q ? { OR: [{ number: { contains: q.toUpperCase(), mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    include: { payments: true, returns: true, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div className="max-w-7xl">
      <h1 className="font-serif text-4xl">Orders</h1>
      <div className="flex flex-wrap gap-2 mt-6">
        <Link href="/admin/orders" className={`px-3 h-8 leading-8 text-[12px] border ${!status ? "bg-ink text-paper" : "border-line bg-white"}`}>All</Link>
        {STATUSES.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} className={`px-3 h-8 leading-8 text-[12px] border ${status === s ? "bg-ink text-paper" : "border-line bg-white"}`}>{s}</Link>)}
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Order no. or email" className="field-box h-8 bg-white w-56" /></form>
      </div>
      <div className="mt-4 bg-white border border-line overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-[0.12em] text-stone border-b border-line"><th className="p-3">Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="underline">{o.number}</Link></td>
                <td>{o.createdAt.toLocaleDateString("en-IN")}</td><td>{o.email}</td><td>{o._count.items}</td><td>{formatINR(o.total)}</td>
                <td className="text-[12px]">{o.payments[0]?.provider} · {o.payments[0]?.status}</td>
                <td className="text-[12px]">{o.status}{o.returns.some((r) => r.status === "REQUESTED") && <span className="text-terracotta"> · return requested</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-stone text-[13px]">No orders match.</p>}
      </div>
    </div>
  );
}

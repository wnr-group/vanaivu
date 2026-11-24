import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { Card } from "@/components/admin/AdminNav";

export const metadata = { title: "Dashboard" };

function startOfWindow(days: number) {
  const d = new Date(Date.now() - (days - 1) * 86400000);
  d.setHours(0, 0, 0, 0);
  return d;
}

const PAID = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

export default async function AdminDashboard() {
  const since = startOfWindow(30);
  const [orders, customers, recent, lowStock, top, statusCounts] = await Promise.all([
    db.order.findMany({ where: { status: { in: PAID } }, select: { total: true, createdAt: true } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.productInventory.findMany({ where: { quantity: { lte: 3 } }, include: { variant: { include: { product: { select: { name: true, id: true } } } } }, orderBy: { quantity: "asc" }, take: 12 }),
    db.orderItem.groupBy({ by: ["productName"], where: { order: { status: { in: PAID } } }, _sum: { quantity: true, unitPrice: true }, orderBy: { _sum: { quantity: "desc" } }, take: 6 }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const aov = orders.length ? Math.round(revenue / orders.length) : 0;
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(since.getTime() + i * 86400000); return { key: d.toLocaleDateString("en-CA"), label: d.getDate(), total: 0 }; });
  for (const o of orders) { const d = days.find((x) => x.key === o.createdAt.toLocaleDateString("en-CA")); if (d) d.total += o.total; }
  const max = Math.max(...days.map((d) => d.total), 1);
  const kpis = [["Revenue", formatINR(revenue)], ["Orders", String(orders.length)], ["Customers", String(customers)], ["Avg. order value", formatINR(aov)]];

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="font-serif text-4xl">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([l, v]) => <Card key={l}><p className="text-[12px] uppercase tracking-[0.14em] text-stone">{l}</p><p className="font-serif text-3xl mt-2">{v}</p></Card>)}
      </div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Card title="Sales, last 30 days">
          <div className="h-48 flex items-end gap-1" role="img" aria-label="Daily revenue bar chart">
            {days.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="w-full bg-ink/85 group-hover:bg-terracotta transition-colors min-h-px" style={{ height: `${(d.total / max) * 100}%` }} title={`${d.key}: ${formatINR(d.total)}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone mt-2"><span>{days[0].key}</span><span>Today</span></div>
        </Card>
        <Card title="Orders by status">
          <ul className="space-y-2 text-[13px]">{statusCounts.map((s) => <li key={s.status} className="flex justify-between"><Link href={`/admin/orders?status=${s.status}`} className="hover:underline">{s.status}</Link><span>{s._count}</span></li>)}</ul>
          {statusCounts.length === 0 && <p className="text-stone text-[13px]">No orders yet.</p>}
        </Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Bestselling products">
          {top.length ? <ol className="space-y-2 text-[13px]">{top.map((t, i) => <li key={t.productName} className="flex justify-between gap-3"><span>{i + 1}. {t.productName}</span><span className="text-stone">{t._sum.quantity} sold</span></li>)}</ol> : <p className="text-stone text-[13px]">No sales yet.</p>}
        </Card>
        <Card title="Inventory alerts" action={<Link href="/admin/products?stock=low" className="text-[12px] underline">All low stock</Link>}>
          <ul className="space-y-2 text-[13px]">
            {lowStock.map((i) => <li key={i.id} className="flex justify-between gap-3"><Link href={`/admin/products/${i.variant.product.id}`} className="hover:underline truncate">{i.variant.product.name} · {i.variant.color} / {i.variant.size}</Link><span className={i.quantity === 0 ? "text-terracotta" : "text-stone"}>{i.quantity === 0 ? "Out" : `${i.quantity} left`}</span></li>)}
          </ul>
        </Card>
        <Card title="Recent orders" action={<Link href="/admin/orders" className="text-[12px] underline">All orders</Link>}>
          <ul className="space-y-2 text-[13px]">{recent.map((o) => <li key={o.id} className="flex justify-between gap-3"><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.number}</Link><span className="text-stone text-[11px]">{o.status}</span><span>{formatINR(o.total)}</span></li>)}</ul>
          {recent.length === 0 && <p className="text-stone text-[13px]">No orders yet.</p>}
        </Card>
      </div>
    </div>
  );
}

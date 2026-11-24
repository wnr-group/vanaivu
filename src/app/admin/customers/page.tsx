import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: { role: "CUSTOMER", ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}) },
    include: { orders: { where: { status: { notIn: ["CANCELLED", "PENDING"] } }, select: { total: true } }, _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-end"><h1 className="font-serif text-4xl">Customers</h1><form><input name="q" defaultValue={q} placeholder="Search" className="field-box bg-white w-56" /></form></div>
      <div className="mt-6 bg-white border border-line overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-[0.12em] text-stone border-b border-line"><th className="p-3">Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Lifetime value</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id} className="border-b border-line last:border-0"><td className="p-3"><Link href={`/admin/customers/${u.id}`} className="underline">{u.name ?? "—"}</Link></td><td>{u.email}</td><td>{u.createdAt.toLocaleDateString("en-IN")}</td><td>{u._count.orders}</td><td>{formatINR(u.orders.reduce((s, o) => s + o.total, 0))}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

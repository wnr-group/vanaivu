import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR, parseJSON } from "@/lib/format";
import { Card } from "@/components/admin/AdminNav";

export const metadata = { title: "Customer" };

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id },
    include: {
      profile: true, addresses: true, measurements: { take: 1, orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, include: { returns: true } },
      wishlist: { include: { items: { include: { product: { select: { name: true, slug: true } } } } } },
      _count: { select: { avatars: true, tryOnSessions: true } },
    },
  });
  if (!u) notFound();
  return (
    <div className="max-w-5xl space-y-6">
      <div><Link href="/admin/customers" className="text-[12px] text-stone">← Customers</Link><h1 className="font-serif text-4xl mt-1">{u.name ?? u.email}</h1><p className="text-stone text-[13px]">{u.email} · joined {u.createdAt.toLocaleDateString("en-IN")}{u.googleId ? " · Google sign-in" : ""}</p></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Profile">
          <dl className="text-[13px] space-y-1"><div>Phone: {u.profile?.phone ?? "—"}</div><div>Sizes: {u.profile?.preferredTopSize ?? "–"} / {u.profile?.preferredBottomSize ?? "–"} / {u.profile?.preferredDressSize ?? "–"}</div><div>Fit: {u.profile?.fitPreference ?? "—"}</div><div>Styles: {parseJSON<string[]>(u.profile?.stylePreferences, []).join(", ") || "—"}</div><div>Newsletter: {u.profile?.newsletter ? "Yes" : "No"}</div><div>Avatars: {u._count.avatars} · Photo sessions: {u._count.tryOnSessions}</div></dl>
        </Card>
        <Card title="Addresses">{u.addresses.map((a) => <p key={a.id} className="text-[13px] mb-2">{a.fullName}, {a.city} {a.pincode}{a.isDefault ? " (default)" : ""}</p>)}{!u.addresses.length && <p className="text-stone text-[13px]">None</p>}</Card>
        <Card title="Wishlist">{u.wishlist?.items.map((i) => <p key={i.id} className="text-[13px]"><Link href={`/product/${i.product.slug}`} className="underline">{i.product.name}</Link></p>)}{!u.wishlist?.items.length && <p className="text-stone text-[13px]">Empty</p>}</Card>
      </div>
      <Card title={`Orders (${u.orders.length})`}>
        <ul className="divide-y divide-line text-[13px]">{u.orders.map((o) => <li key={o.id} className="py-2 flex justify-between"><Link href={`/admin/orders/${o.id}`} className="underline">{o.number}</Link><span>{o.status}{o.returns.length ? " · return" : ""}</span><span>{formatINR(o.total)}</span></li>)}</ul>
      </Card>
      <Card title="Support notes"><p className="text-[13px] text-stone">Contact: {u.email}{u.profile?.phone ? ` · ${u.profile.phone}` : ""}. Measurements on file: {u.measurements[0] ? "yes" : "no"}.</p></Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata: Metadata = { title: "Address book" };

export default async function AddressesPage() {
  const s = await requireUser();
  const list = await db.address.findMany({ where: { userId: s.userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl lg:text-5xl">Address book</h1>
      <AddressBook addresses={list.map((a) => ({ id: a.id, fullName: a.fullName, phone: a.phone, text: `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.pincode}`, isDefault: a.isDefault }))} />
    </div>
  );
}

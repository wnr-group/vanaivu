import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/admin/AdminNav";
import { saveCollectionAction, collectionProductAction, deleteCollectionAction } from "@/app/actions/admin";

export const metadata = { title: "Collections" };

export default async function AdminCollections() {
  const [cols, products] = await Promise.all([
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { include: { product: { select: { id: true, name: true } } }, orderBy: { sortOrder: "asc" } } } }),
    db.product.findMany({ where: { published: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const fields = (c?: (typeof cols)[number]) => (
    <div className="grid sm:grid-cols-2 gap-3">
      <label><span className="label">Name</span><input name="name" required defaultValue={c?.name} className="field-box bg-white" /></label>
      <label><span className="label">Tagline</span><input name="tagline" defaultValue={c?.tagline} className="field-box bg-white" /></label>
      <label className="sm:col-span-2"><span className="label">Description</span><input name="description" defaultValue={c?.description} className="field-box bg-white" /></label>
      <label><span className="label">Image URL</span><input name="image" required defaultValue={c?.image} className="field-box bg-white" /></label>
      <div className="flex gap-4 items-end">
        <label className="w-24"><span className="label">Order</span><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className="field-box bg-white" /></label>
        <label className="flex items-center gap-2 text-[13px] pb-3"><input type="checkbox" name="featured" defaultChecked={c?.featured} className="accent-ink" />Featured on homepage</label>
      </div>
    </div>
  );
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="font-serif text-4xl">Collections</h1>
      {cols.map((c) => (
        <Card key={c.id} title={c.name} action={<Link href={`/collections/${c.slug}`} target="_blank" className="text-[12px] underline">View</Link>}>
          <form action={saveCollectionAction} className="space-y-3"><input type="hidden" name="id" value={c.id} />{fields(c)}<button className="btn-dark h-10">Save</button></form>
          <div className="mt-5 pt-5 border-t border-line">
            <p className="label">Products ({c.products.length})</p>
            <ul className="flex flex-wrap gap-2 mt-2">
              {c.products.map((cp) => (
                <li key={cp.productId}><form action={collectionProductAction} className="flex items-center gap-2 bg-paper border border-line px-3 h-8 text-[12px]">
                  <input type="hidden" name="collectionId" value={c.id} /><input type="hidden" name="productId" value={cp.productId} /><input type="hidden" name="op" value="remove" />
                  {cp.product.name}<button aria-label={`Remove ${cp.product.name}`}>×</button></form></li>
              ))}
            </ul>
            <form action={collectionProductAction} className="flex gap-2 mt-3">
              <input type="hidden" name="collectionId" value={c.id} />
              <select name="productId" className="field-box bg-white max-w-sm"><option value="">Add a product…</option>{products.filter((p) => !c.products.some((cp) => cp.productId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button className="btn-outline h-11">Add</button>
            </form>
          </div>
          <form action={deleteCollectionAction} className="mt-4"><input type="hidden" name="id" value={c.id} /><button className="text-[12px] underline text-terracotta">Delete collection</button></form>
        </Card>
      ))}
      <Card title="New collection"><form action={saveCollectionAction} className="space-y-3">{fields()}<button className="btn-dark h-10">Create collection</button></form></Card>
    </div>
  );
}

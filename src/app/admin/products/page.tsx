import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatINR, imgUrl } from "@/lib/format";

export const metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; stock?: string; category?: string }> }) {
  const { q, stock, category } = await searchParams;
  const [products, cats] = await Promise.all([
    db.product.findMany({
      where: { ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}), ...(category ? { category: { slug: category } } : {}), ...(stock === "low" ? { variants: { some: { inventory: { quantity: { lte: 3 } } } } } : {}) },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true } }, category: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="max-w-7xl">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h1 className="font-serif text-4xl">Products <span className="text-stone text-xl">({products.length})</span></h1>
        <Link href="/admin/products/new" className="btn-dark">New product</Link>
      </div>
      <form className="flex flex-wrap gap-2 mt-6">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="field-box w-64 bg-white" />
        <select name="category" defaultValue={category ?? ""} className="field-box w-48 bg-white"><option value="">All categories</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <select name="stock" defaultValue={stock ?? ""} className="field-box w-40 bg-white"><option value="">Any stock</option><option value="low">Low stock</option></select>
        <button className="btn-outline h-11">Filter</button>
      </form>
      <div className="mt-6 bg-white border border-line overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-[0.12em] text-stone border-b border-line"><th className="p-3">Product</th><th>Category</th><th>Price</th><th>Variants</th><th>Stock</th><th>Status</th><th>Studio / AI</th></tr></thead>
          <tbody>
            {products.map((p) => {
              const stockTotal = p.variants.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
              const out = p.variants.filter((v) => (v.inventory?.quantity ?? 0) === 0).length;
              return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:underline">
                    <span className="relative w-9 h-12 bg-mist shrink-0">{p.images[0] && <Image src={imgUrl(p.images[0].url, 80)} alt="" fill sizes="36px" className="object-cover" />}</span>{p.name}</Link></td>
                  <td>{p.category.name}</td>
                  <td>{formatINR(p.price)}{p.compareAtPrice && <span className="text-stone line-through ml-1 text-[11px]">{formatINR(p.compareAtPrice)}</span>}</td>
                  <td>{p.variants.length}</td>
                  <td className={out ? "text-terracotta" : ""}>{stockTotal}{out > 0 && ` (${out} sold out)`}</td>
                  <td>{p.published ? "Live" : <span className="text-stone">Draft</span>}</td>
                  <td>{p.tryOnEnabled ? "3D" : "–"} / {p.aiTryOnEnabled ? "AI" : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

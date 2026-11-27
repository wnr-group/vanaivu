import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { imgUrl } from "@/lib/format";
import { Card } from "@/components/admin/AdminNav";
import {
  saveProductAction, deleteProductAction, addImageAction, removeImageAction, addVariantAction, updateVariantsAction,
  deleteVariantAction, upload3DAssetAction, delete3DAssetAction,
} from "@/app/actions/admin";

export const metadata = { title: "Edit product" };

const OPTS = {
  garmentType: ["TOP", "SHIRT", "DRESS", "JEANS", "TROUSERS", "SKIRT", "JACKET", "COORD", "ETHNIC", "ACTIVE", "ACCESSORY"],
  occasion: ["Casual", "Work", "Evening", "Festive", "Party", "Vacation", "Lounge", "Sport"],
  style: ["Minimal", "Classic", "Romantic", "Contemporary", "Street", "Boho", "Traditional"],
  fit: ["Slim", "Regular", "Relaxed", "Oversized"],
  sleeve: ["Sleeveless", "Short", "Three-quarter", "Long", "NA"],
  neckline: ["Crew", "V-neck", "Square", "Collared", "Halter", "Off-shoulder", "Boat", "Round", "NA"],
  pattern: ["Solid", "Floral", "Striped", "Polka", "Embroidered", "Printed", "Check"],
  slot: ["TOP", "BOTTOM", "FULL", "OUTER", "ACCESSORY"],
  silhouette: ["tee", "tank", "cami", "shell", "blouse", "shirt", "wrap", "sweater", "poncho", "a-line", "bodycon", "column", "slip", "gown", "ball-gown", "shirt-dress", "wide-leg", "straight", "jogger", "leggings", "skater", "pencil", "pleated", "jumpsuit", "romper", "two-piece", "suit", "tracksuit", "active-set", "saree", "anarkali", "trench", "coat", "jacket", "blazer", "bomber", "puffer", "bag", "jewellery", "sneaker", "heels"],
  fabric: ["cotton", "linen", "denim", "satin", "silk", "crepe", "jersey", "viscose", "georgette", "knit", "wool", "rib", "fleece", "lace", "tulle", "organza", "gabardine", "nylon", "suede", "leather", "canvas", "mesh", "metal", "pvc"],
};

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const isNew = id === "new";
  const [p, cats, brands] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true }, orderBy: [{ color: "asc" }] }, garment: true, assets: true } }),
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany(),
  ]);
  if (!isNew && !p) notFound();
  const sel = (name: keyof typeof OPTS, value?: string | null) => (
    <label className="text-[12px]"><span className="label">{name}</span><select name={name} defaultValue={value ?? OPTS[name][0]} className="field-box bg-white">{OPTS[name].map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  const colours = [...new Set(p?.variants.map((v) => v.color) ?? [])];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div><Link href="/admin/products" className="text-[12px] text-stone hover:text-ink">← Products</Link><h1 className="font-serif text-4xl mt-1">{p?.name ?? "New product"}</h1></div>
        {p && <Link href={`/product/${p.slug}`} target="_blank" className="btn-outline h-10">View in store</Link>}
      </div>
      {saved && <p className="bg-white border border-line px-4 py-3 text-[13px]">Saved.</p>}

      <form action={saveProductAction} className="space-y-6">
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <Card title="Details">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2"><span className="label">Name</span><input name="name" required defaultValue={p?.name} className="field-box bg-white" /></label>
            <label className="sm:col-span-2"><span className="label">Description</span><textarea name="description" rows={3} defaultValue={p?.description} className="field-box bg-white h-auto py-2" /></label>
            <label><span className="label">Category</span><select name="categoryId" defaultValue={p?.categoryId} className="field-box bg-white">{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span className="label">Brand</span><select name="brandId" defaultValue={p?.brandId} className="field-box bg-white">{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label><span className="label">Price (₹)</span><input name="price" type="number" min={0} required defaultValue={p?.price} className="field-box bg-white" /></label>
            <label><span className="label">Compare-at price (₹, for discounts)</span><input name="compareAtPrice" type="number" min={0} defaultValue={p?.compareAtPrice ?? ""} className="field-box bg-white" /></label>
          </div>
        </Card>
        <Card title="Attributes & fabric">
          <div className="grid sm:grid-cols-3 gap-4">
            {sel("garmentType", p?.garmentType)}{sel("occasion", p?.occasion)}{sel("style", p?.style)}{sel("fit", p?.fit)}{sel("sleeve", p?.sleeve)}{sel("neckline", p?.neckline)}{sel("pattern", p?.pattern)}
            <label><span className="label">Material</span><input name="material" defaultValue={p?.material} className="field-box bg-white" /></label>
            <label><span className="label">Composition</span><input name="composition" defaultValue={p?.composition} className="field-box bg-white" /></label>
            <label className="sm:col-span-2"><span className="label">Care</span><input name="care" defaultValue={p?.care} className="field-box bg-white" /></label>
            <label><span className="label">Model info</span><input name="modelInfo" defaultValue={p?.modelInfo ?? ""} className="field-box bg-white" /></label>
          </div>
        </Card>
        <Card title="Virtual Studio garment (3D) & AI try-on">
          <div className="grid sm:grid-cols-5 gap-4">
            {sel("slot", p?.garment?.slot)}{sel("silhouette", p?.garment?.silhouette)}{sel("fabric", p?.garment?.fabric)}
            <label><span className="label">Length (0 shoulder – 1 floor)</span><input name="lengthRatio" type="number" step="0.05" min={0} max={1} defaultValue={p?.garment?.lengthRatio ?? 0.4} className="field-box bg-white" /></label>
            <label><span className="label">Ease (fallback fit)</span><input name="ease" type="number" step="0.01" min={1} max={1.4} defaultValue={p?.garment?.ease ?? 1.05} className="field-box bg-white" /></label>
          </div>
          <div className="flex flex-wrap gap-6 mt-5 text-[13px]">
            {([["published", "Published"], ["isNew", "New arrival"], ["isTrending", "Trending"], ["tryOnEnabled", "3D Studio compatible"], ["aiTryOnEnabled", "AI photo try-on compatible"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={isNew ? k === "published" || k === "tryOnEnabled" : !!p?.[k]} className="accent-ink" />{l}</label>
            ))}
          </div>
        </Card>
        <div className="flex gap-2"><button className="btn-dark">{isNew ? "Create product" : "Save changes"}</button></div>
      </form>

      {p && (
        <>
          <Card title="Images">
            <ul className="flex flex-wrap gap-3">
              {p.images.map((im) => (
                <li key={im.id} className="w-28">
                  <div className="relative aspect-[3/4] bg-mist"><Image src={imgUrl(im.url, 200)} alt={im.alt} fill sizes="112px" className="object-cover" /></div>
                  <p className="text-[11px] mt-1 truncate">{im.kind}{im.color ? ` · ${im.color}` : ""}</p>
                  <form action={removeImageAction}><input type="hidden" name="id" value={im.id} /><button className="text-[11px] underline text-terracotta">Remove</button></form>
                </li>
              ))}
            </ul>
            <form action={addImageAction} className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 mt-5">
              <input type="hidden" name="productId" value={p.id} />
              <input name="url" placeholder="https://images.unsplash.com/photo-…" required className="field-box bg-white" />
              <input name="alt" placeholder="Alt text" className="field-box bg-white" />
              <select name="color" className="field-box bg-white"><option value="">All colours</option>{colours.map((c) => <option key={c}>{c}</option>)}</select>
              <select name="kind" className="field-box bg-white">{["FRONT", "BACK", "DETAIL", "LIFESTYLE"].map((k) => <option key={k}>{k}</option>)}</select>
              <button className="btn-outline h-11">Add image</button>
            </form>
          </Card>

          <Card title="Variants, SKUs & inventory">
            <form action={updateVariantsAction}>
              <input type="hidden" name="productId" value={p.id} />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-[0.12em] text-stone"><th className="py-2">Colour</th><th>Size</th><th>SKU</th><th>Price +₹</th><th>Stock</th><th /></tr></thead>
                  <tbody>
                    {p.variants.map((v) => (
                      <tr key={v.id} className="border-t border-line">
                        <td className="py-2"><span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ background: v.colorHex }} />{v.color}<input type="hidden" name="variantId" value={v.id} /></td>
                        <td>{v.size}</td><td className="text-stone">{v.sku}</td>
                        <td><input name={`delta_${v.id}`} type="number" defaultValue={v.priceDelta} className="field-box h-8 w-24 bg-white" /></td>
                        <td><input name={`qty_${v.id}`} type="number" min={0} defaultValue={v.inventory?.quantity ?? 0} className={`field-box h-8 w-20 bg-white ${(v.inventory?.quantity ?? 0) <= 3 ? "border-terracotta" : ""}`} /></td>
                        <td><button form={`del-${v.id}`} className="text-[11px] underline text-stone">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn-dark mt-4 h-10">Save inventory & pricing</button>
            </form>
            {p.variants.map((v) => <form key={v.id} id={`del-${v.id}`} action={deleteVariantAction} className="hidden"><input type="hidden" name="id" value={v.id} /></form>)}
            <form action={addVariantAction} className="grid grid-cols-2 sm:grid-cols-[1fr_80px_1fr_100px_100px_120px_auto] gap-2 mt-6 pt-6 border-t border-line">
              <input type="hidden" name="productId" value={p.id} />
              <input name="color" placeholder="Colour name" required className="field-box bg-white" />
              <input name="colorHex" type="color" defaultValue="#888888" className="h-11 w-full border border-ink/20" aria-label="Colour swatch" />
              <input name="size" placeholder="Size (S, M, ONE…)" required className="field-box bg-white" />
              <input name="priceDelta" type="number" placeholder="+₹" className="field-box bg-white" />
              <input name="quantity" type="number" min={0} placeholder="Stock" className="field-box bg-white" />
              <input name="sku" placeholder="SKU (auto)" className="field-box bg-white" />
              <button className="btn-outline h-11">Add variant</button>
            </form>
          </Card>

          <Card title="3D garment assets">
            <p className="text-[13px] text-stone mb-4">Products without an uploaded asset use VANAIVU&apos;s procedural, measurement-fitted garment for the silhouette above. Upload rigged GLB/GLTF garments for the rigged avatar provider; set the skeleton tag the asset is rigged to.</p>
            <ul className="space-y-2 text-[13px]">
              {p.assets.map((a) => (
                <li key={a.id} className="flex items-center gap-4">
                  <span className="w-28">{a.color ?? "All colours"}</span><span className="uppercase text-[11px] text-stone w-24">{a.format}</span>
                  {a.url ? <a href={a.url} className="underline truncate">{a.url}</a> : <span className="text-stone">Procedural garment</span>}
                  <form action={delete3DAssetAction} className="ml-auto"><input type="hidden" name="id" value={a.id} /><button className="text-[11px] underline text-stone">Remove</button></form>
                </li>
              ))}
            </ul>
            <form action={upload3DAssetAction} className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 mt-5">
              <input type="hidden" name="productId" value={p.id} />
              <input type="file" name="file" accept=".glb,.gltf,model/gltf-binary" required className="text-[13px] self-center" />
              <select name="color" className="field-box bg-white"><option value="">All colours</option>{colours.map((c) => <option key={c}>{c}</option>)}</select>
              <input name="skeleton" placeholder={p.garment?.skeleton ?? "vestra-f1"} className="field-box bg-white" aria-label="Skeleton tag" />
              <button className="btn-outline h-11">Upload GLB</button>
            </form>
          </Card>

          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={p.id} />
            <button className="text-[13px] underline text-terracotta">Delete product (unpublishes instead if it has orders)</button>
          </form>
        </>
      )}
    </div>
  );
}

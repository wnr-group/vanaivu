"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addShipmentEvent, restock, SHIPMENT_FOR_ORDER } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => { const n = Number(fd.get(k)); return Number.isFinite(n) ? n : 0; };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const done = (p: string) => { revalidatePath("/", "layout"); revalidatePath(p); };

// ── products ─────────────────────────────────────────────
export async function saveProductAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) throw new Error("Name required");
  const data = {
    name, description: str(fd, "description"), categoryId: str(fd, "categoryId"), brandId: str(fd, "brandId"), garmentType: str(fd, "garmentType"),
    price: Math.round(num(fd, "price")), compareAtPrice: num(fd, "compareAtPrice") > 0 ? Math.round(num(fd, "compareAtPrice")) : null,
    material: str(fd, "material"), composition: str(fd, "composition"), care: str(fd, "care"), occasion: str(fd, "occasion"), style: str(fd, "style"),
    fit: str(fd, "fit"), sleeve: str(fd, "sleeve"), neckline: str(fd, "neckline"), pattern: str(fd, "pattern"), modelInfo: str(fd, "modelInfo") || null,
    published: fd.get("published") === "on", isNew: fd.get("isNew") === "on", isTrending: fd.get("isTrending") === "on",
    tryOnEnabled: fd.get("tryOnEnabled") === "on", aiTryOnEnabled: fd.get("aiTryOnEnabled") === "on",
  };
  const garment = { slot: str(fd, "slot") || "TOP", silhouette: str(fd, "silhouette") || "tee", lengthRatio: num(fd, "lengthRatio") || 0.4, fabric: str(fd, "fabric") || "cotton", ease: num(fd, "ease") || 1.05 };
  let pid = id;
  if (id) {
    await db.product.update({ where: { id }, data: { ...data, garment: { upsert: { create: garment, update: garment } } } });
  } else {
    let slug = slugify(name);
    if (await db.product.findUnique({ where: { slug } })) slug += "-" + randomBytes(2).toString("hex");
    pid = (await db.product.create({ data: { ...data, slug, garment: { create: garment } } })).id;
  }
  done("/admin/products");
  redirect(`/admin/products/${pid}?saved=1`);
}

export async function deleteProductAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const used = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (used) await db.product.update({ where: { id }, data: { published: false } }); // keep order history intact
  else await db.product.delete({ where: { id } });
  done("/admin/products");
  redirect("/admin/products");
}

export async function addImageAction(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "productId");
  const url = str(fd, "url");
  if (!/^https:\/\//.test(url)) return;
  const count = await db.productImage.count({ where: { productId } });
  await db.productImage.create({ data: { productId, url, alt: str(fd, "alt") || "Product image", color: str(fd, "color") || null, kind: str(fd, "kind") || "FRONT", sortOrder: count } });
  done(`/admin/products/${productId}`);
}
export async function removeImageAction(fd: FormData) {
  await requireAdmin();
  const img = await db.productImage.delete({ where: { id: str(fd, "id") } });
  done(`/admin/products/${img.productId}`);
}

export async function addVariantAction(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "productId");
  const color = str(fd, "color"), size = str(fd, "size");
  if (!color || !size) return;
  const sku = str(fd, "sku") || `VS-${productId.slice(-5).toUpperCase()}-${slugify(color).slice(0, 4).toUpperCase()}-${size}`;
  await db.productVariant.upsert({
    where: { productId_color_size: { productId, color, size } },
    create: { productId, color, colorHex: str(fd, "colorHex") || "#888888", size, sku, priceDelta: Math.round(num(fd, "priceDelta")), inventory: { create: { quantity: Math.max(0, Math.round(num(fd, "quantity"))) } } },
    update: { colorHex: str(fd, "colorHex") || undefined },
  });
  await db.product3DAsset.upsert({ where: { id: `${productId}-${color}` }, create: { id: `${productId}-${color}`, productId, color, format: "procedural" }, update: {} }).catch(() => {});
  done(`/admin/products/${productId}`);
}

export async function updateVariantsAction(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "productId");
  const ids = fd.getAll("variantId").map(String);
  for (const id of ids) {
    await db.productVariant.update({
      where: { id },
      data: { priceDelta: Math.round(num(fd, `delta_${id}`)), inventory: { upsert: { create: { quantity: Math.max(0, Math.round(num(fd, `qty_${id}`))) }, update: { quantity: Math.max(0, Math.round(num(fd, `qty_${id}`))) } } } },
    });
  }
  done(`/admin/products/${productId}`);
}

export async function deleteVariantAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const v = await db.productVariant.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!v || v._count.orderItems) return;
  await db.cartItem.deleteMany({ where: { variantId: id } });
  await db.productVariant.delete({ where: { id } });
  done(`/admin/products/${v.productId}`);
}

/** Uploads a GLB/GLTF garment asset to /public/uploads/3d and links it to the product (optionally a colour). */
export async function upload3DAssetAction(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "productId");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const ext = file.name.toLowerCase().endsWith(".gltf") ? "gltf" : "glb";
  if (!/\.(glb|gltf)$/i.test(file.name) || file.size > 30 * 1024 * 1024) return;
  const dir = path.join(process.cwd(), "public", "uploads", "3d");
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomBytes(10).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await db.product3DAsset.create({ data: { productId, color: str(fd, "color") || null, url: `/uploads/3d/${name}`, format: ext } });
  if (fd.get("skeleton")) await db.garmentConfiguration.updateMany({ where: { productId }, data: { skeleton: str(fd, "skeleton") } });
  done(`/admin/products/${productId}`);
}
export async function delete3DAssetAction(fd: FormData) {
  await requireAdmin();
  const a = await db.product3DAsset.delete({ where: { id: str(fd, "id") } });
  if (a.url?.startsWith("/uploads/3d/")) await fs.rm(path.join(process.cwd(), "public", a.url), { force: true });
  done(`/admin/products/${a.productId}`);
}

// ── collections ─────────────────────────────────────────────
export async function saveCollectionAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = { name: str(fd, "name"), tagline: str(fd, "tagline"), description: str(fd, "description"), image: str(fd, "image"), featured: fd.get("featured") === "on", sortOrder: Math.round(num(fd, "sortOrder")) };
  if (id) await db.collection.update({ where: { id }, data });
  else await db.collection.create({ data: { ...data, slug: slugify(data.name) || randomBytes(3).toString("hex") } });
  done("/admin/collections");
}
export async function collectionProductAction(fd: FormData) {
  await requireAdmin();
  const collectionId = str(fd, "collectionId"), productId = str(fd, "productId");
  if (fd.get("op") === "remove") await db.collectionProduct.delete({ where: { collectionId_productId: { collectionId, productId } } });
  else if (productId) await db.collectionProduct.upsert({ where: { collectionId_productId: { collectionId, productId } }, create: { collectionId, productId, sortOrder: 99 }, update: {} });
  done("/admin/collections");
}
export async function deleteCollectionAction(fd: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: str(fd, "id") } });
  done("/admin/collections");
}

// ── orders ─────────────────────────────────────────────
export async function updateOrderAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  const order = await db.order.findUnique({ where: { id }, include: { payments: true } });
  if (!order) return;
  if (status === "CANCELLED" && order.status !== "CANCELLED") {
    await restock(id);
    const paid = order.payments.find((p) => p.status === "CAPTURED");
    if (paid) await db.refund.create({ data: { paymentId: paid.id, amount: paid.amount } });
  }
  if (status && status !== order.status) {
    await db.order.update({ where: { id }, data: { status } });
    if (SHIPMENT_FOR_ORDER[status]) await addShipmentEvent(id, SHIPMENT_FOR_ORDER[status], `Order ${status.toLowerCase()}`);
    if (status === "CANCELLED") await addShipmentEvent(id, "CANCELLED", "Cancelled by VESTRA");
    if (status === "DELIVERED") {
      const cod = order.payments.find((p) => p.provider === "cod");
      if (cod) await db.payment.update({ where: { id: cod.id }, data: { status: "CAPTURED" } });
    }
  }
  const tracking = str(fd, "trackingNo");
  if (tracking) await db.shipment.update({ where: { orderId: id }, data: { trackingNo: tracking } });
  done(`/admin/orders/${id}`);
}

export async function processRefundAction(fd: FormData) {
  await requireAdmin();
  const refund = await db.refund.findUnique({ where: { id: str(fd, "id") }, include: { payment: { include: { order: true } } } });
  if (!refund || refund.status !== "PENDING") return;
  try {
    let providerRefundId: string | null = null;
    if (refund.payment.provider !== "cod" && refund.payment.providerPaymentId) {
      providerRefundId = (await getPaymentProvider().refund({ providerPaymentId: refund.payment.providerPaymentId, amountInr: refund.amount })).refundId;
    }
    await db.refund.update({ where: { id: refund.id }, data: { status: "PROCESSED", providerRefundId } });
    await db.payment.update({ where: { id: refund.paymentId }, data: { status: "REFUNDED" } });
  } catch {
    await db.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
  }
  done(`/admin/orders/${refund.payment.orderId}`);
}

export async function updateReturnAction(fd: FormData) {
  await requireAdmin();
  const r = await db.returnRequest.update({ where: { id: str(fd, "id") }, data: { status: str(fd, "status") }, include: { order: { include: { payments: true } } } });
  if (r.status === "RECEIVED") {
    await restock(r.orderId);
    await db.order.update({ where: { id: r.orderId }, data: { status: "RETURNED" } });
    const paid = r.order.payments.find((p) => p.status === "CAPTURED");
    if (paid && !(await db.refund.findFirst({ where: { paymentId: paid.id } }))) await db.refund.create({ data: { paymentId: paid.id, amount: paid.amount } });
  }
  done(`/admin/orders/${r.orderId}`);
}

// ── content ─────────────────────────────────────────────
export async function saveCampaignAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = { placement: str(fd, "placement"), title: str(fd, "title"), subtitle: str(fd, "subtitle") || null, body: str(fd, "body") || null, image: str(fd, "image") || null, ctaLabel: str(fd, "ctaLabel") || null, ctaHref: str(fd, "ctaHref") || null, active: fd.get("active") === "on", sortOrder: Math.round(num(fd, "sortOrder")) };
  if (fd.get("op") === "delete" && id) await db.campaign.delete({ where: { id } });
  else if (id) await db.campaign.update({ where: { id }, data });
  else if (data.title) await db.campaign.create({ data });
  done("/admin/content");
}

export async function saveStoryAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = { title: str(fd, "title"), excerpt: str(fd, "excerpt"), body: str(fd, "body"), image: str(fd, "image"), author: str(fd, "author") || "The VESTRA Studio", readMins: Math.max(1, Math.round(num(fd, "readMins"))), published: fd.get("published") === "on" };
  if (fd.get("op") === "delete" && id) await db.editorialStory.delete({ where: { id } });
  else if (id) await db.editorialStory.update({ where: { id }, data });
  else if (data.title) await db.editorialStory.create({ data: { ...data, slug: slugify(data.title) } });
  done("/admin/content");
}

export async function saveCategoryAction(fd: FormData) {
  await requireAdmin();
  await db.productCategory.update({ where: { id: str(fd, "id") }, data: { name: str(fd, "name"), description: str(fd, "description"), image: str(fd, "image") || null, sortOrder: Math.round(num(fd, "sortOrder")) } });
  done("/admin/content");
}

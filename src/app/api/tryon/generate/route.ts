import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTryOnProvider, readPrivate, categoryFor } from "@/lib/ai/tryon";

/** POST {sessionId, productId, color?} — queues a generation job with the configured provider. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = getTryOnProvider();
  if (!provider) return NextResponse.json({ error: "Photo try-on isn't configured on this store yet." }, { status: 503 });
  const { sessionId, productId, color } = (await req.json()) as { sessionId: string; productId: string; color?: string };
  const session = await db.tryOnSession.findFirst({ where: { id: sessionId, userId: s.userId } });
  const product = await db.product.findFirst({ where: { id: productId, published: true, aiTryOnEnabled: true }, include: { images: { orderBy: { sortOrder: "asc" } } } });
  if (!session || !product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const garment = (product.images.find((i) => i.color === color) ?? product.images[0])?.url;
  const result = await db.tryOnResult.create({ data: { sessionId, productId, status: "QUEUED" } });
  try {
    const photo = await readPrivate(session.photoUrl);
    const mime = session.photoUrl.endsWith("png") ? "image/png" : session.photoUrl.endsWith("webp") ? "image/webp" : "image/jpeg";
    const { jobId } = await provider.start({ personImage: `data:${mime};base64,${photo.toString("base64")}`, garmentImageUrl: `${garment}?w=1024&q=85`, category: categoryFor(product.garmentType) });
    await db.tryOnResult.update({ where: { id: result.id }, data: { status: "PROCESSING", jobId } });
    return NextResponse.json({ resultId: result.id });
  } catch (e) {
    await db.tryOnResult.update({ where: { id: result.id }, data: { status: "FAILED", error: e instanceof Error ? e.message : "Failed to start" } });
    return NextResponse.json({ resultId: result.id });
  }
}

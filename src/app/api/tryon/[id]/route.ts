import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTryOnProvider, savePrivate, readPrivate } from "@/lib/ai/tryon";

/**
 * GET: status of a result (advances the provider job when processing).
 * GET ?image=1: the private image bytes (result) — ?photo=1 returns the session's original photo.
 * PATCH {saved}: save/unsave a generated look.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);

  if (url.searchParams.get("photo")) {
    const session = await db.tryOnSession.findFirst({ where: { id, userId: s.userId } });
    if (!session) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(await readPrivate(session.photoUrl)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
  }

  let r = await db.tryOnResult.findFirst({ where: { id, session: { userId: s.userId } } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (url.searchParams.get("image")) {
    if (!r.imageUrl) return new NextResponse("Not ready", { status: 404 });
    return new NextResponse(new Uint8Array(await readPrivate(r.imageUrl)), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  }

  if (r.status === "PROCESSING" && r.jobId) {
    const provider = getTryOnProvider();
    if (provider) {
      const p = await provider.poll(r.jobId);
      if (p.status === "succeeded" && p.imageUrl) {
        // copy the output into private storage so it stays under the customer's privacy controls
        const buf = p.imageUrl.startsWith("data:") ? Buffer.from(p.imageUrl.split(",")[1], "base64") : Buffer.from(await (await fetch(p.imageUrl)).arrayBuffer());
        const key = await savePrivate(buf, "png");
        r = await db.tryOnResult.update({ where: { id }, data: { status: "SUCCEEDED", imageUrl: key } });
      } else if (p.status === "failed") {
        r = await db.tryOnResult.update({ where: { id }, data: { status: "FAILED", error: p.error } });
      }
    }
  }
  return NextResponse.json({ id: r.id, status: r.status, error: r.error, saved: r.saved, image: r.status === "SUCCEEDED" ? `/api/tryon/${r.id}?image=1` : null });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { saved } = (await req.json()) as { saved: boolean };
  await db.tryOnResult.updateMany({ where: { id, session: { userId: s.userId } }, data: { saved: !!saved } });
  return NextResponse.json({ ok: true });
}

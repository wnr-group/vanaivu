import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePrivate, deletePrivate, getTryOnProvider } from "@/lib/ai/tryon";

const MAX = 8 * 1024 * 1024;

/** POST: upload a full-body photo (multipart "photo", "consent"=yes). Creates a TryOnSession. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Sign in to use photo try-on." }, { status: 401 });
  const fd = await req.formData();
  if (fd.get("consent") !== "yes") return NextResponse.json({ error: "Please confirm consent before uploading." }, { status: 400 });
  const file = fd.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Photos must be under 8 MB." }, { status: 413 });
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : null;
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 415 });
  const key = await savePrivate(Buffer.from(await file.arrayBuffer()), ext);
  const days = fd.get("retention") === "7" ? 7 : 30;
  const session = await db.tryOnSession.create({
    data: { userId: s.userId, photoUrl: key, consentAt: new Date(), provider: getTryOnProvider()?.id ?? "none", deleteAfter: new Date(Date.now() + days * 86400000) },
  });
  return NextResponse.json({ sessionId: session.id });
}

/** DELETE ?session=id — removes the photo and every generated image. */
export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("session") ?? "";
  const session = await db.tryOnSession.findFirst({ where: { id, userId: s.userId }, include: { results: true } });
  if (!session) return NextResponse.json({ ok: true });
  await deletePrivate(session.photoUrl);
  for (const r of session.results) if (r.imageUrl && !r.imageUrl.startsWith("http")) await deletePrivate(r.imageUrl);
  await db.tryOnSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

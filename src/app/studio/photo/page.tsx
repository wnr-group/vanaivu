import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTryOnProvider } from "@/lib/ai/tryon";
import { PhotoTryOn } from "@/components/studio/PhotoTryOn";

export const metadata: Metadata = { title: "AI Photo Try-On" };

export default async function PhotoTryOnPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const s = await getSession();
  const provider = getTryOnProvider();
  const [products, sessions] = await Promise.all([
    db.product.findMany({ where: { published: true, aiTryOnEnabled: true }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }, orderBy: { popularity: "desc" } }),
    s ? db.tryOnSession.findMany({ where: { userId: s.userId }, orderBy: { createdAt: "desc" }, include: { results: { orderBy: { createdAt: "desc" } } } }) : [],
  ]);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <p className="eyebrow text-lavender">AI Photo Try-On</p>
      <h1 className="display text-[48px] lg:text-[80px] mt-3">See it on you.</h1>
      <p className="text-stone mt-4 max-w-2xl text-[15px]">Upload a full-body photo and choose a piece. An AI model generates a preview of you wearing it. This is separate from the 3D Studio: it&apos;s a generated image, so details such as fit and drape are an approximation.</p>
      {!s ? (
        <div className="mt-12 bg-mist/60 p-8 max-w-xl"><p className="font-serif text-2xl">Sign in to continue</p><p className="text-stone text-[14px] mt-2">Your photos are private to your account, so photo try-on needs you to be signed in.</p><Link href="/account/login?next=/studio/photo" className="btn-dark mt-6">Sign in</Link></div>
      ) : (
        <PhotoTryOn
          providerLabel={provider?.label ?? null}
          initialProduct={product}
          products={products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? "", type: p.garmentType }))}
          sessions={sessions.map((x) => ({ id: x.id, createdAt: x.createdAt.toISOString(), deleteAfter: x.deleteAfter?.toISOString() ?? null, results: x.results.map((r) => ({ id: r.id, productId: r.productId, status: r.status, error: r.error, saved: r.saved })) }))}
        />
      )}
    </div>
  );
}

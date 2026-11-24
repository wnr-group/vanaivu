import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { imgUrl } from "@/lib/format";
import { Listing } from "@/components/shop/Listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await db.collection.findUnique({ where: { slug: (await params).slug } });
  return c ? { title: c.name, description: c.tagline } : {};
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const c = await db.collection.findUnique({ where: { slug }, include: { products: { select: { productId: true } } } });
  if (!c) notFound();
  return (
    <>
      <section className="relative h-[62vh] min-h-[420px] bg-ink text-paper overflow-hidden">
        <Image src={imgUrl(c.image, 1800)} alt="" fill priority sizes="100vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="relative container-x h-full flex flex-col justify-end pb-12">
          <Link href="/collections" className="eyebrow text-paper/70 hover:text-paper">← Collections</Link>
          <h1 className="display text-[56px] sm:text-[88px] lg:text-[120px] mt-4">{c.name}</h1>
          <p className="mt-4 max-w-xl text-paper/80">{c.description}</p>
        </div>
      </section>
      <div className="pt-8">
        <Listing base={{ id: { in: c.products.map((p) => p.productId) } }} searchParams={await searchParams} basePath={`/collections/${slug}`} />
      </div>
    </>
  );
}

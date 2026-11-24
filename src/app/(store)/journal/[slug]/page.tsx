import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { imgUrl } from "@/lib/format";
import { cardInclude, toCard } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await db.editorialStory.findUnique({ where: { slug: (await params).slug } });
  return s ? { title: s.title, description: s.excerpt } : {};
}

export default async function Story({ params }: Props) {
  const s = await db.editorialStory.findUnique({ where: { slug: (await params).slug } });
  if (!s || !s.published) notFound();
  const shop = await db.product.findMany({ where: { published: true, isTrending: true }, include: cardInclude, take: 4 });
  return (
    <article>
      <header className="container-x pt-14 max-w-4xl text-center">
        <Link href="/journal" className="eyebrow text-stone">The Journal</Link>
        <h1 className="display text-[48px] lg:text-[88px] mt-5">{s.title}</h1>
        <p className="text-stone mt-5">{s.author} · {s.readMins} min read</p>
      </header>
      <div className="container-x mt-12"><div className="relative aspect-[16/9] bg-mist"><Image src={imgUrl(s.image, 1800)} alt="" fill priority sizes="100vw" className="object-cover" /></div></div>
      <div className="container-x max-w-2xl mt-14 space-y-6 text-[17px] leading-[1.8]">
        <p className="font-serif text-2xl leading-snug">{s.excerpt}</p>
        {s.body.split(/\n\n+/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
      </div>
      <section className="container-x pt-24"><h2 className="font-serif text-4xl mb-10">Shop the story</h2><ProductGrid products={shop.map(toCard)} /></section>
    </article>
  );
}

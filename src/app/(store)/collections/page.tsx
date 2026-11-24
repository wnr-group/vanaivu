import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { imgUrl } from "@/lib/format";
import { PageHead } from "@/components/shop/PageHead";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const cols = await db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHead eyebrow="Collections" title="Collections" blurb="Edits from the VESTRA studio, each built around a mood, a moment or a way of dressing." />
      <ul className="container-x grid sm:grid-cols-2 gap-x-5 gap-y-14">
        {cols.map((c, i) => (
          <li key={c.slug} className={i % 3 === 0 ? "sm:col-span-2" : ""}>
            <Link href={`/collections/${c.slug}`} className="group block">
              <div className={`relative overflow-hidden bg-mist ${i % 3 === 0 ? "aspect-[4/5] sm:aspect-[21/9]" : "aspect-[4/5]"}`}>
                <Image src={imgUrl(c.image, i % 3 === 0 ? 1800 : 900)} alt="" fill sizes={i % 3 === 0 ? "100vw" : "50vw"} className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-lux)] group-hover:scale-[1.03]" />
                {i % 3 === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent flex items-end sm:items-center">
                    <div className="p-6 sm:p-14 text-paper max-w-lg">
                      <p className="eyebrow text-paper/70">{c._count.products} pieces</p>
                      <p className="display text-5xl sm:text-7xl mt-3">{c.name}</p>
                      <p className="mt-4 text-paper/80">{c.tagline}</p>
                    </div>
                  </div>
                )}
              </div>
              {i % 3 !== 0 && (
                <div className="pt-5">
                  <p className="font-serif text-3xl">{c.name}</p>
                  <p className="text-stone text-[14px] mt-1">{c.tagline} · {c._count.products} pieces</p>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

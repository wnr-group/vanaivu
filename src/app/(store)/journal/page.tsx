import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { imgUrl } from "@/lib/format";
import { PageHead } from "@/components/shop/PageHead";

export const metadata: Metadata = { title: "Journal" };

export default async function Journal() {
  const stories = await db.editorialStory.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHead eyebrow="Journal" title="The Journal" blurb="Styling notes, wardrobe thinking and stories from the VANAIVU studio." />
      <ul className="container-x grid sm:grid-cols-2 gap-x-6 gap-y-14">
        {stories.map((s) => (
          <li key={s.slug}><Link href={`/journal/${s.slug}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-mist"><Image src={imgUrl(s.image, 900)} alt="" fill sizes="50vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" /></div>
            <p className="eyebrow text-stone mt-5">{s.author} · {s.readMins} min read</p>
            <h2 className="font-serif text-3xl mt-2 group-hover:italic">{s.title}</h2>
            <p className="text-stone mt-2 text-[14px]">{s.excerpt}</p>
          </Link></li>
        ))}
      </ul>
    </>
  );
}

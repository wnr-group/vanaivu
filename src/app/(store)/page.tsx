import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";
import { imgUrl } from "@/lib/format";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { StudioPreview } from "@/components/home/StudioPreview";

export default async function Home() {
  const [hero, categories, newIn, trending, collections, stories] = await Promise.all([
    db.campaign.findFirst({ where: { placement: "HERO", active: true }, orderBy: { sortOrder: "asc" } }),
    db.productCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    db.product.findMany({ where: { isNew: true, published: true }, include: cardInclude, orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.findMany({ where: { isTrending: true, published: true }, include: cardInclude, orderBy: { popularity: "desc" }, take: 8 }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    db.editorialStory.findMany({ where: { published: true }, orderBy: { createdAt: "asc" }, take: 4 }),
  ]);
  const looks = await getLooks();

  return (
    <>
      {/* B. Hero campaign */}
      <section className="relative h-[calc(100dvh-108px)] min-h-[560px] max-h-[980px] overflow-hidden bg-ink text-paper">
        <div className="absolute inset-0 grid lg:grid-cols-[1.25fr_1fr]">
          <div className="relative">
            <Image src={imgUrl(hero?.image ?? "", 1800)} alt="A woman walking through a sunlit arcade in a tailored coat" fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover object-[center_30%] animate-[fade_1.6s_ease]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-ink/30" />
          </div>
          <div className="relative hidden lg:block">
            <Image src={imgUrl("https://images.unsplash.com/photo-1618244972963-dbee1a7edc95", 1100)} alt="" fill priority sizes="40vw" className="object-cover" />
            <div className="absolute inset-0 bg-ink/25" />
          </div>
        </div>
        <div className="relative h-full container-x flex flex-col justify-end pb-14 lg:pb-20">
          <p className="eyebrow text-paper/80 animate-fade-up">{hero?.subtitle}</p>
          <h1 className="display text-[64px] sm:text-[96px] lg:text-[150px] mt-4 animate-fade-up [animation-delay:120ms]">
            Style is<br /><em className="font-serif italic text-mauve">personal.</em>
          </h1>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end gap-8 lg:justify-between animate-fade-up [animation-delay:260ms]">
            <p className="max-w-md text-[15px] leading-relaxed text-paper/85">{hero?.body}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={hero?.ctaHref ?? "/shop/new-in"} className="btn-light">{hero?.ctaLabel ?? "Shop the collection"}</Link>
              <Link href="/studio" className="btn-ghost-light">Discover your style</Link>
            </div>
          </div>
        </div>
      </section>

      {/* C. Shop by category */}
      <section className="container-x pt-24 lg:pt-32" aria-labelledby="cat-h">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="eyebrow text-stone">The wardrobe</p>
            <h2 id="cat-h" className="font-serif text-4xl lg:text-6xl mt-3">Shop by category</h2>
          </div>
          <Link href="/shop/clothing" className="hidden sm:inline-flex eyebrow link-u">Shop all clothing</Link>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] lg:grid-rows-2 gap-3 lg:gap-4">
          {categories.map((c, i) => (
            <li key={c.slug} className={i === 0 ? "col-span-2 sm:col-span-1 lg:row-span-2" : ""}>
              <Link href={`/shop/${c.slug}`} className="group relative block h-full">
                <div className={`relative overflow-hidden bg-mist ${i === 0 ? "aspect-[4/5] lg:aspect-auto lg:h-full" : "aspect-[4/5]"}`}>
                  <Image src={imgUrl(c.image ?? "", i === 0 ? 1100 : 600)} alt="" fill sizes={i === 0 ? "(min-width:1024px) 30vw, 100vw" : "(min-width:1024px) 20vw, 50vw"} className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-lux)] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-4 lg:p-5 text-paper flex items-end justify-between">
                    <div>
                      <p className={`font-serif ${i === 0 ? "text-3xl lg:text-5xl" : "text-xl lg:text-2xl"}`}>{c.name}</p>
                      <p className="text-[11px] tracking-[0.14em] uppercase text-paper/75 mt-1">{c._count.products} pieces</p>
                    </div>
                    <ArrowRight size={18} strokeWidth={1.3} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* D. New arrivals */}
      <section className="container-x pt-24 lg:pt-32" aria-labelledby="new-h">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-6 mb-12 items-end">
          <div>
            <p className="eyebrow text-stone">Just landed</p>
            <h2 id="new-h" className="font-serif text-4xl lg:text-6xl mt-3">New arrivals</h2>
          </div>
          <div className="flex lg:justify-end items-end gap-8">
            <p className="text-stone text-[14px] max-w-sm hidden md:block">Fluid satins, sharp linen and the season&apos;s outerwear, cut in our Bengaluru atelier.</p>
            <Link href="/shop/new-in" className="eyebrow link-u whitespace-nowrap">View all new in</Link>
          </div>
        </div>
        <ProductGrid products={newIn.map(toCard)} />
      </section>

      {/* E. Virtual studio */}
      <StudioPreview />

      {/* F. Trending now */}
      <section className="container-x pt-24 lg:pt-32" aria-labelledby="trend-h">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="eyebrow text-stone">Most wanted this week</p>
            <h2 id="trend-h" className="font-serif text-4xl lg:text-6xl mt-3">Trending now</h2>
          </div>
          <Link href="/shop/trending" className="eyebrow link-u">See all</Link>
        </div>
        <ProductGrid products={trending.map(toCard)} />
      </section>

      {/* G. Curated collections */}
      <section className="pt-24 lg:pt-32" aria-labelledby="col-h">
        <div className="container-x flex items-end justify-between mb-10">
          <div>
            <p className="eyebrow text-stone">Edited by the studio</p>
            <h2 id="col-h" className="font-serif text-4xl lg:text-6xl mt-3">Curated collections</h2>
          </div>
          <Link href="/collections" className="eyebrow link-u">All collections</Link>
        </div>
        <ul className="flex gap-3 lg:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 sm:px-6 lg:px-10 pb-2">
          {collections.map((c) => (
            <li key={c.slug} className="snap-start shrink-0 w-[72vw] sm:w-[42vw] lg:w-[23vw]">
              <Link href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-mist">
                  <Image src={imgUrl(c.image, 700)} alt="" fill sizes="(min-width:1024px) 23vw, 72vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-lux)] group-hover:scale-105" />
                </div>
                <div className="pt-4 flex justify-between items-baseline gap-3">
                  <p className="font-serif text-2xl">{c.name}</p>
                  <p className="text-[11px] text-stone tracking-[0.12em] uppercase whitespace-nowrap">{c._count.products} pieces</p>
                </div>
                <p className="text-[13px] text-stone mt-1">{c.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* H. Complete the look */}
      <section className="container-x pt-24 lg:pt-32" aria-labelledby="look-h">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow text-stone">Complete the look</p>
          <h2 id="look-h" className="font-serif text-4xl lg:text-6xl mt-3">Styled head to toe</h2>
          <p className="text-stone text-[14px] mt-4">Outfits put together by our stylists. Pick your sizes and add the whole look in one step, or open it in the Studio to try it on.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-10">
          {looks.map((l) => <ShopTheLook key={l.name} look={l} />)}
        </div>
      </section>

      {/* I. Editorial stories */}
      <section className="container-x pt-24 lg:pt-32" aria-labelledby="jr-h">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="eyebrow text-stone">The Journal</p>
            <h2 id="jr-h" className="font-serif text-4xl lg:text-6xl mt-3">Notes on dressing</h2>
          </div>
          <Link href="/journal" className="eyebrow link-u">Read the journal</Link>
        </div>
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10">
          {stories[0] && (
            <Link href={`/journal/${stories[0].slug}`} className="group block">
              <div className="relative aspect-[4/5] lg:aspect-[5/6] overflow-hidden bg-mist"><Image src={imgUrl(stories[0].image, 1100)} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" /></div>
              <p className="eyebrow text-stone mt-5">{stories[0].readMins} min read</p>
              <h3 className="font-serif text-3xl lg:text-4xl mt-2 group-hover:italic">{stories[0].title}</h3>
              <p className="text-stone mt-2 text-[14px] max-w-lg">{stories[0].excerpt}</p>
            </Link>
          )}
          <ul className="grid gap-8 content-start">
            {stories.slice(1).map((s) => (
              <li key={s.slug}>
                <Link href={`/journal/${s.slug}`} className="group grid grid-cols-[140px_1fr] sm:grid-cols-[200px_1fr] gap-5 items-center">
                  <div className="relative aspect-[4/5] overflow-hidden bg-mist"><Image src={imgUrl(s.image, 400)} alt="" fill sizes="200px" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" /></div>
                  <div>
                    <p className="eyebrow text-stone">{s.readMins} min read</p>
                    <h3 className="font-serif text-2xl mt-2 group-hover:italic">{s.title}</h3>
                    <p className="text-stone mt-2 text-[13px]">{s.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

async function getLooks() {
  const LOOKS = [
    { name: "The Off-Duty Edit", image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df", slugs: ["sherpa-denim-jacket", "essential-crew-tee", "tokyo-wide-leg-jean", "cognac-crossbody"] },
    { name: "Boardroom, Softened", image: "https://images.unsplash.com/photo-1632149877166-f75d49000351", slugs: ["boyfriend-blazer", "atelier-poplin-shirt", "palermo-pleated-trouser", "siena-leather-satchel"] },
  ];
  const out = [];
  for (const l of LOOKS) {
    const rows = await db.product.findMany({ where: { slug: { in: l.slugs } }, include: cardInclude });
    const items = l.slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean).map((r) => toCard(r!));
    out.push({ name: l.name, image: l.image, items, total: items.reduce((s, i) => s + i.price, 0) });
  }
  return out;
}

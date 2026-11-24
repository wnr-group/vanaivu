import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getProduct, relatedProducts, completeTheLook } from "@/lib/catalog";
import { toPdp } from "@/lib/pdp";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWishlistIds } from "@/app/actions/wishlist";
import { ProductView } from "@/components/product/ProductView";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Details } from "@/components/product/Details";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ color?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: p.name, description: p.description, openGraph: { images: p.images[0]?.url ? [`${p.images[0].url}?w=1200`] : [] } } : {};
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const pdp = toPdp(product);
  const { color } = await searchParams;
  const session = await getSession();
  const [wl, body, related, look] = await Promise.all([
    getWishlistIds(),
    session ? db.customerMeasurement.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } }) : null,
    relatedProducts(product),
    completeTheLook(product),
  ]);
  const initialColour = pdp.colours.find((c) => c.name === color)?.name ?? pdp.colours[0]?.name ?? "";
  const fitCounts = product.reviews.reduce<Record<string, number>>((m, r) => { if (r.fitFeedback) m[r.fitFeedback] = (m[r.fitFeedback] ?? 0) + 1; return m; }, {});

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-x pt-6 text-[11px] uppercase tracking-[0.16em] text-stone flex gap-2 flex-wrap">
        <Link href="/" className="hover:text-ink">Home</Link><span>/</span>
        <Link href={`/shop/${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link><span>/</span>
        <span className="text-ink truncate">{product.name}</span>
      </nav>

      <ProductView p={pdp} initialColour={initialColour} wishlisted={wl.includes(product.id)}
        body={body ? { heightCm: body.heightCm, bustCm: body.bustCm, waistCm: body.waistCm, hipCm: body.hipCm, shoulderCm: body.shoulderCm } : null}
        details={<Details p={pdp} />} />

      {look.length > 0 && (
        <section className="container-x pt-24" aria-labelledby="ctl-h">
          <p className="eyebrow text-stone">Styled with</p>
          <h2 id="ctl-h" className="font-serif text-4xl lg:text-5xl mt-3 mb-10">Complete the look</h2>
          <ProductGrid products={look} />
          <div className="mt-8">
            <Link href={`/studio?products=${[product.slug, ...look.slice(0, 3).map((l) => l.slug)].join(",")}`} className="btn-outline">Try the full look in the Studio</Link>
          </div>
        </section>
      )}

      <section id="reviews" className="container-x pt-24 grid lg:grid-cols-[320px_1fr] gap-12" aria-labelledby="rev-h">
        <div>
          <h2 id="rev-h" className="font-serif text-4xl">Reviews</h2>
          <div className="flex items-center gap-3 mt-5">
            <span className="font-serif text-5xl">{product.rating.toFixed(1)}</span>
            <div>
              <Stars n={product.rating} />
              <p className="text-[12px] text-stone mt-1">{product.ratingCount} reviews</p>
            </div>
          </div>
          {Object.keys(fitCounts).length > 0 && (
            <div className="mt-8">
              <p className="eyebrow text-stone mb-3">How it fits</p>
              {["Runs small", "True to size", "Runs large"].map((k) => {
                const pct = Math.round(((fitCounts[k] ?? 0) / product.reviews.length) * 100);
                return (
                  <div key={k} className="grid grid-cols-[100px_1fr_36px] items-center gap-3 text-[12px] mb-2">
                    <span>{k}</span><div className="h-1 bg-mist"><div className="h-full bg-ink" style={{ width: `${pct}%` }} /></div><span className="text-stone">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {product.reviews.map((r) => (
            <li key={r.id} className="py-7 grid sm:grid-cols-[160px_1fr] gap-4">
              <div className="text-[12px] text-stone">
                <p className="text-ink text-[13px]">{r.author}</p>
                <p className="mt-1">{r.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                {r.sizeBought && <p className="mt-1">Bought: {r.sizeBought}</p>}
                {r.fitFeedback && <p>Fit: {r.fitFeedback}</p>}
              </div>
              <div>
                <Stars n={r.rating} />
                <p className="font-serif text-xl mt-2">{r.title}</p>
                <p className="text-[14px] text-stone mt-1.5 leading-relaxed">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="container-x pt-24" aria-labelledby="rel-h">
          <h2 id="rel-h" className="font-serif text-4xl lg:text-5xl mb-10">You may also like</h2>
          <ProductGrid products={related.slice(0, 4)} />
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description,
        image: product.images.map((i) => i.url), brand: product.brand.name,
        offers: { "@type": "Offer", priceCurrency: "INR", price: product.price, availability: pdp.variants.some((v) => v.available > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
        aggregateRating: product.ratingCount ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.ratingCount } : undefined,
      }).replace(/</g, "\\u003c") }} />
    </>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="flex" aria-label={`${n.toFixed(1)} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} strokeWidth={1.2} className={i <= Math.round(n) ? "fill-ink" : "fill-none stroke-ink/30"} />)}</span>;
}

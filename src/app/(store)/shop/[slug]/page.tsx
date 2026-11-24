import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveScope } from "@/lib/catalog";
import { Listing } from "@/components/shop/Listing";
import { PageHead } from "@/components/shop/PageHead";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scope = await resolveScope((await params).slug);
  return scope ? { title: scope.title, description: scope.blurb } : {};
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const scope = await resolveScope(slug);
  if (!scope) notFound();
  return (
    <>
      <PageHead eyebrow="Shop" title={scope.title} blurb={scope.blurb} crumbs={[{ href: "/shop/clothing", label: "Shop" }]} />
      <Listing base={scope.where} searchParams={await searchParams} basePath={`/shop/${slug}`} hideCategory={!!scope.categorySlug} />
    </>
  );
}

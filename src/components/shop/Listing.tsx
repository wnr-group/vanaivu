import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getFacets, listProducts, parseFilters, SORTS } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterBar } from "./FilterBar";

/** Shared listing body used by category, scope, collection and search pages. */
export async function Listing({ base, searchParams, basePath, hideCategory = false }: {
  base: Prisma.ProductWhereInput; searchParams: Record<string, string | string[] | undefined>; basePath: string; hideCategory?: boolean;
}) {
  const filters = parseFilters(searchParams);
  const [{ products, total }, facets] = await Promise.all([listProducts(base, filters), getFacets(base)]);
  const clearHref = filters.q ? `${basePath}?q=${encodeURIComponent(filters.q)}` : basePath;
  return (
    <div className="container-x">
      <FilterBar facets={facets} total={total} sorts={SORTS} hideCategory={hideCategory} basePath={clearHref} />
      {products.length ? (
        <div className="mt-8"><ProductGrid products={products} priorityCount={4} /></div>
      ) : (
        <div className="py-28 text-center">
          <p className="font-serif text-3xl">Nothing matches those filters</p>
          <p className="text-stone mt-3 text-[14px]">Try removing a filter or two, or explore everything new this season.</p>
          <div className="flex gap-2 justify-center mt-8">
            <Link href={clearHref} className="btn-dark">Clear filters</Link>
            <Link href="/shop/new-in" className="btn-outline">New in</Link>
          </div>
        </div>
      )}
    </div>
  );
}

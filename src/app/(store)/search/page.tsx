import type { Metadata } from "next";
import { Listing } from "@/components/shop/Listing";
import { PageHead } from "@/components/shop/PageHead";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return (
    <>
      <PageHead eyebrow="Search results" title={q ? `“${q}”` : "Search"} blurb={q ? "" : "Use the search above to find pieces by name, colour, fabric or occasion."} />
      <Listing base={{}} searchParams={sp} basePath="/search" />
    </>
  );
}

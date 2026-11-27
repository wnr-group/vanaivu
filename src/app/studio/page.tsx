import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = { title: "Virtual Studio", description: "Create your avatar and try on VANAIVU pieces in 3D." };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ product?: string; products?: string; color?: string; size?: string; outfit?: string }> }) {
  const sp = await searchParams;
  const slugs = (sp.products ?? sp.product ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  return <Studio key={slugs.join(",") + (sp.outfit ?? "")} initialSlugs={slugs} initialColor={sp.color} initialSize={sp.size} initialOutfitId={sp.outfit} />;
}

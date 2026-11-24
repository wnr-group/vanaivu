import { NextResponse } from "next/server";
import { studioCatalog } from "@/lib/studio";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slugs = sp.get("slugs")?.split(",").filter(Boolean).slice(0, 12);
  const products = await studioCatalog({ slot: sp.get("slot") ?? undefined, q: sp.get("q")?.slice(0, 60) || undefined, slugs });
  return NextResponse.json(products);
}

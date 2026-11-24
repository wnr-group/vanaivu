import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog";
import { toPdp } from "@/lib/pdp";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toPdp(p));
}

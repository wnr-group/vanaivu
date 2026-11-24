import { NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/catalog";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await searchSuggestions(q.slice(0, 80)));
}

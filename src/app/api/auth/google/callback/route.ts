import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const saved = JSON.parse(jar.get("g_oauth")?.value ?? "{}") as { state?: string; next?: string };
  jar.delete("g_oauth");
  const fail = NextResponse.redirect(new URL("/account/login?error=google", req.url));
  const code = url.searchParams.get("code");
  if (!code || !saved.state || saved.state !== url.searchParams.get("state")) return fail;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${url.origin}/api/auth/google/callback`, grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail;
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return fail;
  const info = (await infoRes.json()) as { sub: string; email: string; email_verified: boolean; name?: string };
  if (!info.email_verified) return fail;

  const email = info.email.toLowerCase();
  let user = await db.user.findFirst({ where: { OR: [{ googleId: info.sub }, { email }] } });
  if (!user) {
    user = await db.user.create({ data: { email, name: info.name, googleId: info.sub, profile: { create: {} }, wishlist: { create: {} }, wardrobe: { create: {} } } });
  } else if (!user.googleId) {
    user = await db.user.update({ where: { id: user.id }, data: { googleId: info.sub } });
  }
  await createSession(user);
  await mergeGuestCart(user.id);
  const next = saved.next?.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/account";
  return NextResponse.redirect(new URL(next, req.url));
}

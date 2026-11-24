import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/** Starts Google OAuth (authorization code flow with state). Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. */
export async function GET(req: Request) {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) return NextResponse.redirect(new URL("/account/login", req.url));
  const url = new URL(req.url);
  const state = randomBytes(16).toString("hex");
  const next = url.searchParams.get("next") ?? "/account";
  (await cookies()).set("g_oauth", JSON.stringify({ state, next }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", id);
  auth.searchParams.set("redirect_uri", `${url.origin}/api/auth/google/callback`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");
  return NextResponse.redirect(auth);
}

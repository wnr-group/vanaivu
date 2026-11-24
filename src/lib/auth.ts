import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "vestra_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret");

export type Session = { userId: string; role: "CUSTOMER" | "ADMIN"; email: string; name?: string | null };

export async function createSession(user: { id: string; role: string; email: string; name?: string | null }) {
  const token = await new SignJWT({ role: user.role, email: user.email, name: user.name ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: payload.sub!, role: payload.role as Session["role"], email: payload.email as string, name: payload.name as string | null };
  } catch {
    return null;
  }
}

export async function requireUser(next = "/account") {
  const s = await getSession();
  if (!s) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/account/login?next=/admin");
  if (s.role !== "ADMIN") redirect("/");
  // re-check role against the database so a demoted admin's token stops working
  const u = await db.user.findUnique({ where: { id: s.userId }, select: { role: true } });
  if (u?.role !== "ADMIN") redirect("/");
  return s;
}

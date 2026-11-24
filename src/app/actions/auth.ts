"use server";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { mergeGuestCart } from "@/lib/cart";

export type AuthState = { error?: string; message?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
};

const Register = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = Register.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists." };
  const user = await db.user.create({
    data: {
      name, email, passwordHash: await bcrypt.hash(password, 10),
      profile: { create: { newsletter: fd.get("newsletter") === "on" } }, wishlist: { create: {} }, wardrobe: { create: {} },
    },
  });
  await createSession(user);
  await mergeGuestCart(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash)))
    return { error: "That email and password don't match." };
  await createSession(user);
  await mergeGuestCart(user.id);
  redirect(user.role === "ADMIN" && !fd.get("next") ? "/admin" : safeNext(fd.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/**
 * Password reset. A real deployment sends the link by email; until an email
 * provider is configured the link is shown on screen in development only.
 */
export async function requestResetAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  const generic = "If an account exists for that email, a reset link is on its way.";
  if (!user) return { message: generic };
  const token = randomBytes(24).toString("base64url");
  await db.user.update({ where: { id: user.id }, data: { resetToken: token, resetExpires: new Date(Date.now() + 3600_000) } });
  if (process.env.NODE_ENV !== "production") return { message: `${generic} (Development: /account/reset/${token})` };
  return { message: generic };
}

export async function resetPasswordAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  const user = await db.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetExpires || user.resetExpires < new Date()) return { error: "This reset link has expired." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10), resetToken: null, resetExpires: null } });
  await createSession(user);
  redirect("/account");
}

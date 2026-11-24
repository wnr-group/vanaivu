"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { restock, addShipmentEvent } from "@/lib/orders";

type Msg = { message?: string; error?: string } | undefined;

export async function subscribeAction(_: Msg, fd: FormData): Promise<Msg> {
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email.", message: "Enter a valid email." };
  await db.newsletterSubscriber.upsert({ where: { email: email.data }, create: { email: email.data }, update: {} });
  const s = await getSession();
  if (s) await db.userProfile.updateMany({ where: { userId: s.userId }, data: { newsletter: true } });
  return { message: "Thank you. You're on the list." };
}

const Profile = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  preferredTopSize: z.string().optional(),
  preferredBottomSize: z.string().optional(),
  preferredDressSize: z.string().optional(),
  fitPreference: z.string().optional(),
});

export async function updateProfileAction(_: Msg, fd: FormData): Promise<Msg> {
  const s = await requireUser();
  const p = Profile.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Please check your details." };
  const { name, ...rest } = p.data;
  const favouriteCategories = JSON.stringify(fd.getAll("favouriteCategories").map(String));
  const stylePreferences = JSON.stringify(fd.getAll("stylePreferences").map(String));
  await db.user.update({ where: { id: s.userId }, data: { name } });
  await db.userProfile.upsert({
    where: { userId: s.userId },
    create: { userId: s.userId, ...rest, favouriteCategories, stylePreferences },
    update: { ...rest, favouriteCategories, stylePreferences },
  });
  revalidatePath("/account", "layout");
  return { message: "Profile saved." };
}

const Measure = z.object({
  heightCm: z.coerce.number().min(120).max(220),
  bustCm: z.coerce.number().min(60).max(160),
  waistCm: z.coerce.number().min(45).max(160),
  hipCm: z.coerce.number().min(65).max(180),
  shoulderCm: z.coerce.number().min(28).max(60),
});

export async function saveMeasurementsAction(_: Msg, fd: FormData): Promise<Msg> {
  const s = await requireUser();
  const m = Measure.safeParse(Object.fromEntries(fd));
  if (!m.success) return { error: "Measurements look out of range. Please check them (in cm)." };
  const existing = await db.customerMeasurement.findFirst({ where: { userId: s.userId }, orderBy: { createdAt: "desc" } });
  if (existing) await db.customerMeasurement.update({ where: { id: existing.id }, data: m.data });
  else await db.customerMeasurement.create({ data: { ...m.data, userId: s.userId } });
  revalidatePath("/account", "layout");
  return { message: "Measurements saved. The Fit Assistant and Studio will use them." };
}

const Addr = z.object({
  fullName: z.string().trim().min(2), phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"),
  line1: z.string().trim().min(3), line2: z.string().trim().optional(), city: z.string().trim().min(2),
  state: z.string().trim().min(2), pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
});

export async function addAddressAction(_: Msg, fd: FormData): Promise<Msg> {
  const s = await requireUser();
  const a = Addr.safeParse(Object.fromEntries(fd));
  if (!a.success) return { error: a.error.issues[0].message };
  const count = await db.address.count({ where: { userId: s.userId } });
  await db.address.create({ data: { ...a.data, userId: s.userId, isDefault: count === 0 } });
  revalidatePath("/account/addresses");
  return { message: "Address added." };
}

export async function deleteAddressAction(id: string) {
  const s = await requireUser();
  await db.address.deleteMany({ where: { id, userId: s.userId } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(id: string) {
  const s = await requireUser();
  await db.address.updateMany({ where: { userId: s.userId }, data: { isDefault: false } });
  await db.address.updateMany({ where: { id, userId: s.userId }, data: { isDefault: true } });
  revalidatePath("/account/addresses");
}

export async function cancelOrderAction(orderId: string) {
  const s = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: s.userId }, include: { payments: true } });
  if (!order || !["PENDING", "CONFIRMED", "PACKED"].includes(order.status)) return { ok: false, error: "This order can no longer be cancelled." };
  await restock(order.id);
  await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  await addShipmentEvent(order.id, "CANCELLED", "Cancelled by customer");
  const captured = order.payments.find((p) => p.status === "CAPTURED");
  if (captured) await db.refund.create({ data: { paymentId: captured.id, amount: captured.amount } });
  revalidatePath("/account/orders", "layout");
  return { ok: true };
}

export async function requestReturnAction(orderId: string, reason: string) {
  const s = await requireUser();
  const order = await db.order.findFirst({ where: { id: orderId, userId: s.userId }, include: { returns: true } });
  if (!order || order.status !== "DELIVERED") return { ok: false, error: "Returns open once your order is delivered." };
  if (order.returns.some((r) => r.status !== "REJECTED")) return { ok: false, error: "A return is already in progress." };
  await db.returnRequest.create({ data: { orderId, userId: s.userId, reason: reason.slice(0, 500) || "Not specified" } });
  revalidatePath("/account/orders", "layout");
  return { ok: true };
}

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseJSON } from "@/lib/format";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const unit = z.number().min(-1).max(1);
const Config = z.object({
  skinTone: hex,
  bodyType: z.enum(["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS"]),
  heightCm: z.number().min(140).max(200), bustCm: z.number().min(60).max(170), waistCm: z.number().min(45).max(160),
  hipCm: z.number().min(65).max(180), shoulderCm: z.number().min(25).max(55),
  hairStyle: z.string().max(20), hairColor: hex,
  faceShape: z.enum(["oval", "round", "heart", "long"]).catch("oval"), accessories: z.array(z.string()).max(5),
  eyebrows: z.string().max(20).optional(), eyelashes: z.string().max(20).optional(), eyeColor: z.string().max(20).optional(),
  weight: z.number().min(0).max(1).optional(), muscle: z.number().min(0).max(1).optional(),
  bust: unit.optional(), cup: unit.optional(), firmness: unit.optional(), underbust: unit.optional(), waist: unit.optional(), hips: unit.optional(),
  belly: unit.optional(), glutes: unit.optional(), shoulders: unit.optional(), arms: unit.optional(), thighs: unit.optional(), calves: unit.optional(),
  neck: unit.optional(), legLength: unit.optional(),
  african: z.number().min(0).max(1).optional(), asian: z.number().min(0).max(1).optional(), european: z.number().min(0).max(1).optional(),
  headShape: z.enum(["oval", "round", "heart", "square"]).optional(), headShapeAmount: z.number().min(0).max(1).optional(),
  faceFullness: unit.optional(), noseWidth: unit.optional(), noseLength: unit.optional(), lipsWidth: unit.optional(), lipsFullness: unit.optional(), eyeSize: unit.optional(),
});
export type AvatarInput = z.infer<typeof Config>;

const needUser = async () => {
  const s = await getSession();
  if (!s) throw new Error("SIGN_IN");
  return s;
};

export async function getStudioStateAction() {
  const s = await getSession();
  if (!s) return { signedIn: false as const };
  const [avatars, outfits, measure] = await Promise.all([
    db.avatar.findMany({ where: { userId: s.userId }, include: { configuration: true }, orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }] }),
    db.savedOutfit.findMany({
      where: { wardrobe: { userId: s.userId } }, orderBy: { updatedAt: "desc" },
      include: { items: { include: { variant: { include: { product: { select: { slug: true, name: true, price: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } } } },
    }),
    db.customerMeasurement.findFirst({ where: { userId: s.userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    signedIn: true as const,
    avatars: avatars.filter((a) => a.configuration).map((a) => ({ id: a.id, name: a.name, isPrimary: a.isPrimary, config: { ...a.configuration!, accessories: parseJSON<string[]>(a.configuration!.accessories, []), ...parseJSON<Record<string, unknown>>(a.configuration!.details, {}) } })),
    outfits: outfits.map((o) => ({
      id: o.id, name: o.name, avatarId: o.avatarId, updatedAt: o.updatedAt.toISOString(),
      items: o.items.map((i) => ({ slug: i.variant.product.slug, name: i.variant.product.name, variantId: i.variantId, color: i.variant.color, size: i.variant.size, slot: i.slot, price: i.variant.product.price + i.variant.priceDelta, image: i.variant.product.images[0]?.url ?? "" })),
    })),
    measurements: measure ? { heightCm: measure.heightCm, bustCm: measure.bustCm, waistCm: measure.waistCm, hipCm: measure.hipCm, shoulderCm: measure.shoulderCm } : null,
  };
}

export async function saveAvatarAction(input: { id?: string; name: string; config: AvatarInput; primary?: boolean }) {
  try {
    const s = await needUser();
    const config = Config.parse(input.config);
    const data = {
      skinTone: config.skinTone, bodyType: config.bodyType, heightCm: config.heightCm, bustCm: config.bustCm, waistCm: config.waistCm,
      hipCm: config.hipCm, shoulderCm: config.shoulderCm, hairStyle: config.hairStyle, hairColor: config.hairColor, faceShape: config.faceShape,
      accessories: JSON.stringify(config.accessories), details: JSON.stringify(config),
    };
    const name = input.name.trim().slice(0, 40) || "My avatar";
    let id = input.id;
    if (id && (await db.avatar.findFirst({ where: { id, userId: s.userId } }))) {
      await db.avatar.update({ where: { id }, data: { name, configuration: { upsert: { create: data, update: data } } } });
    } else {
      const count = await db.avatar.count({ where: { userId: s.userId } });
      if (count >= 8) return { ok: false as const, error: "You can save up to 8 avatars." };
      id = (await db.avatar.create({ data: { userId: s.userId, name, isPrimary: count === 0, configuration: { create: data } } })).id;
    }
    if (input.primary) {
      await db.avatar.updateMany({ where: { userId: s.userId }, data: { isPrimary: false } });
      await db.avatar.update({ where: { id }, data: { isPrimary: true } });
    }
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error && e.message === "SIGN_IN" ? "Sign in to save avatars." : "Could not save avatar." };
  }
}

export async function deleteAvatarAction(id: string) {
  const s = await getSession();
  if (!s) return { ok: false };
  await db.avatar.deleteMany({ where: { id, userId: s.userId } });
  return { ok: true };
}

const Outfit = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60), avatarId: z.string().nullable().optional(), items: z.array(z.object({ variantId: z.string(), slot: z.string() })).min(1).max(8) });

export async function saveOutfitAction(input: z.infer<typeof Outfit>) {
  const s = await getSession();
  if (!s) return { ok: false as const, error: "Sign in to save outfits to your wardrobe." };
  const o = Outfit.safeParse(input);
  if (!o.success) return { ok: false as const, error: "Add at least one piece to save a look." };
  const wardrobe = await db.wardrobe.upsert({ where: { userId: s.userId }, create: { userId: s.userId }, update: {} });
  const avatarId = o.data.avatarId && (await db.avatar.findFirst({ where: { id: o.data.avatarId, userId: s.userId } })) ? o.data.avatarId : null;
  let id = o.data.id;
  if (id && (await db.savedOutfit.findFirst({ where: { id, wardrobeId: wardrobe.id } }))) {
    await db.$transaction([
      db.savedOutfitItem.deleteMany({ where: { outfitId: id } }),
      db.savedOutfit.update({ where: { id }, data: { name: o.data.name, avatarId, items: { create: o.data.items } } }),
    ]);
  } else {
    id = (await db.savedOutfit.create({ data: { wardrobeId: wardrobe.id, name: o.data.name, avatarId, items: { create: o.data.items } } })).id;
  }
  revalidatePath("/account/wardrobe");
  return { ok: true as const, id };
}

export async function renameOutfitAction(id: string, name: string) {
  const s = await getSession();
  if (!s || !name.trim()) return { ok: false };
  await db.savedOutfit.updateMany({ where: { id, wardrobe: { userId: s.userId } }, data: { name: name.trim().slice(0, 60) } });
  revalidatePath("/account/wardrobe");
  return { ok: true };
}

export async function deleteOutfitAction(id: string) {
  const s = await getSession();
  if (!s) return { ok: false };
  await db.savedOutfit.deleteMany({ where: { id, wardrobe: { userId: s.userId } } });
  revalidatePath("/account/wardrobe");
  return { ok: true };
}

export async function recordTryOnAction(productId: string) {
  const s = await getSession();
  if (!s) return;
  const w = await db.wardrobe.upsert({ where: { userId: s.userId }, create: { userId: s.userId }, update: {} });
  const list = parseJSON<string[]>(w.triedOn, []).filter((x) => x !== productId);
  list.unshift(productId);
  await db.wardrobe.update({ where: { id: w.id }, data: { triedOn: JSON.stringify(list.slice(0, 40)) } });
}

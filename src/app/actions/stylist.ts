"use server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cardInclude, toCard, type ProductCard } from "@/lib/catalog";
import { runStylist, type Look } from "@/lib/ai/stylist";

export type StylistLook = Look & { products: ProductCard[]; total: number };
export type StylistResult = { ok: true; conversationId: string; provider: "anthropic" | "rules"; text: string; looks: StylistLook[] } | { ok: false; error: string };

export async function askStylistAction(conversationId: string | null, message: string): Promise<StylistResult> {
  const text = message.trim().slice(0, 600);
  if (!text) return { ok: false, error: "Ask me anything about what to wear." };
  const s = await getSession();
  let convo = conversationId ? await db.aIStylistConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "asc" } } } }) : null;
  if (convo && convo.userId && convo.userId !== s?.userId) convo = null;
  if (!convo) convo = await db.aIStylistConversation.create({ data: { userId: s?.userId ?? null, title: text.slice(0, 60) }, include: { messages: true } });
  const history = [...convo.messages.slice(-12).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), { role: "user" as const, content: text }];
  await db.aIStylistMessage.create({ data: { conversationId: convo.id, role: "user", content: text } });
  try {
    const reply = await runStylist(history, s?.userId ?? null);
    const ids = [...new Set(reply.looks.flatMap((l) => l.productIds))];
    const rows = await db.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
    const looks = reply.looks.map((l) => {
      const products = l.productIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map((r) => toCard(r!));
      return { ...l, products, total: products.reduce((sum, p) => sum + p.price, 0) };
    });
    await db.aIStylistMessage.create({ data: { conversationId: convo.id, role: "assistant", content: reply.text, productIds: JSON.stringify(ids) } });
    return { ok: true, conversationId: convo.id, provider: reply.provider, text: reply.text, looks };
  } catch (e) {
    console.error("stylist error", e);
    return { ok: false, error: "The stylist is unavailable right now. Please try again in a moment." };
  }
}

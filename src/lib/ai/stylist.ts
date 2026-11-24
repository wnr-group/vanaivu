import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { available } from "../cart";
import { parseJSON } from "../format";

/**
 * AI stylist provider abstraction.
 * - "anthropic": Claude with tool use over the live catalogue (needs ANTHROPIC_API_KEY).
 * - "rules": a deterministic catalogue recommender, labelled as such in the UI.
 * Either way, every recommended product id is checked against the database before it is shown.
 */
export type Look = { title: string; note: string; productIds: string[] };
export type StylistReply = { provider: "anthropic" | "rules"; text: string; looks: Look[] };
export type Turn = { role: "user" | "assistant"; content: string };

const MODEL = "claude-opus-5-5";

// ── catalogue tools ─────────────────────────────────────────────
type SearchInput = { query?: string; slot?: string; category?: string; occasion?: string; colour?: string; maxPrice?: number; size?: string; limit?: number };

async function searchCatalog(i: SearchInput) {
  const terms = (i.query ?? "").split(/\s+/).filter((t) => t.length > 2).slice(0, 4);
  const rows = await db.product.findMany({
    where: {
      published: true,
      ...(i.slot ? { garment: { slot: i.slot } } : {}),
      ...(i.category ? { category: { slug: i.category } } : {}),
      ...(i.occasion ? { occasion: i.occasion } : {}),
      ...(i.maxPrice ? { price: { lte: i.maxPrice } } : {}),
      ...(i.colour ? { variants: { some: { color: { contains: i.colour, mode: "insensitive" } } } } : {}),
      ...(terms.length ? { OR: terms.flatMap((t) => [{ name: { contains: t, mode: "insensitive" } }, { description: { contains: t, mode: "insensitive" } }, { style: { contains: t, mode: "insensitive" } }, { material: { contains: t, mode: "insensitive" } }, { occasion: { contains: t, mode: "insensitive" } }]) } : {}),
    },
    include: { variants: { include: { inventory: true } }, garment: true, category: true },
    orderBy: { popularity: "desc" },
    take: Math.min(i.limit ?? 12, 20),
  });
  return rows
    .map((p) => {
      const sizes = p.variants.filter((v) => available(v.inventory) > 0 && (!i.size || v.size === i.size || v.size === "ONE"));
      return {
        id: p.id, name: p.name, price: p.price, category: p.category.name, slot: p.garment?.slot, occasion: p.occasion, style: p.style,
        fit: p.fit, colours: [...new Set(p.variants.map((v) => v.color))], inStockSizes: [...new Set(sizes.map((v) => v.size))], studioReady: p.tryOnEnabled,
      };
    })
    .filter((p) => p.inStockSizes.length > 0);
}

async function customerContext(userId: string | null) {
  if (!userId) return { signedIn: false };
  const [u, m, bought] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    db.customerMeasurement.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.orderItem.findMany({ where: { order: { userId, status: { notIn: ["CANCELLED", "PENDING"] } } }, take: 20, include: { variant: { select: { productId: true } } } }),
  ]);
  const p = u?.profile;
  return {
    signedIn: true, name: u?.name,
    preferredSizes: { tops: p?.preferredTopSize, bottoms: p?.preferredBottomSize, dresses: p?.preferredDressSize },
    fitPreference: p?.fitPreference, stylePreferences: parseJSON(p?.stylePreferences, []), favouriteCategories: parseJSON(p?.favouriteCategories, []),
    measurementsCm: m ? { height: m.heightCm, bust: m.bustCm, waist: m.waistCm, hip: m.hipCm } : null,
    ownedPieces: bought.map((b) => ({ productId: b.variant.productId, name: b.productName, colour: b.color })),
  };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_catalog",
    description: "Search VESTRA's live catalogue. Returns only in-stock products with real ids, INR prices, colours and in-stock sizes. Call it as many times as needed (e.g. once per garment slot).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text keywords, e.g. 'linen', 'satin', 'blazer'" },
        slot: { type: "string", enum: ["TOP", "BOTTOM", "FULL", "OUTER", "ACCESSORY"], description: "Garment slot. FULL = dresses, sarees, sets, jumpsuits." },
        category: { type: "string", enum: ["dresses", "tops", "jeans-trousers", "skirts", "co-ords", "outerwear", "ethnic-fusion", "activewear", "accessories"] },
        occasion: { type: "string", enum: ["Casual", "Work", "Evening", "Festive", "Party", "Vacation", "Lounge", "Sport"] },
        colour: { type: "string" },
        maxPrice: { type: "number", description: "Maximum INR price per item" },
        size: { type: "string", description: "Only return products in stock in this size" },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_customer_context",
    description: "The signed-in customer's preferred sizes, fit and style preferences, measurements and pieces they already own. Returns signedIn:false for guests.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "present_looks",
    description: "Show outfit recommendations to the customer as shoppable cards. Use only product ids returned by search_catalog or get_customer_context. Call once with every look, then write a short reply.",
    input_schema: {
      type: "object",
      properties: {
        looks: {
          type: "array", maxItems: 4,
          items: {
            type: "object",
            properties: { title: { type: "string" }, note: { type: "string", description: "One or two sentences on why it works" }, productIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 } },
            required: ["title", "note", "productIds"], additionalProperties: false,
          },
        },
      },
      required: ["looks"], additionalProperties: false,
    },
  },
];

const SYSTEM = `You are the VESTRA personal stylist, for a premium Indian women's fashion label. Prices are in INR (₹).
Build complete, wearable outfits from the live catalogue only: always call search_catalog before recommending, never invent products, prices or sizes, and respect any budget (total of a look, unless the customer says per item). When the customer is signed in, call get_customer_context to use their sizes, preferences and owned pieces; prefer pieces in stock in their size.
A look is either one FULL piece, or a TOP plus a BOTTOM, optionally with OUTER and ACCESSORY. Offer 1–3 looks via present_looks, then reply in 2–4 warm, concise sentences (no lists of prices; the cards show them). If nothing suitable is in stock, say so plainly.`;

export async function runStylist(history: Turn[], userId: string | null): Promise<StylistReply> {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (!hasKey) return rulesStylist(history[history.length - 1]?.content ?? "", userId);

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
  let looks: Look[] = [];
  for (let step = 0; step < 8; step++) {
    const res = await client.beta.messages.create({
      model: MODEL, max_tokens: 16000, system: SYSTEM, tools: TOOLS as Anthropic.Beta.BetaTool[], messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "refusal") return { provider: "anthropic", text: "I can't help with that request, but I'd love to style an outfit for you.", looks: [] };
    if (res.stop_reason !== "tool_use") {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { provider: "anthropic", text: text || "Here are a few looks I put together for you.", looks: await validateLooks(looks) };
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const b of res.content) {
      if (b.type !== "tool_use") continue;
      try {
        let out: unknown;
        if (b.name === "search_catalog") out = await searchCatalog(b.input as SearchInput);
        else if (b.name === "get_customer_context") out = await customerContext(userId);
        else if (b.name === "present_looks") {
          const v = await validateLooks((b.input as { looks: Look[] }).looks ?? []);
          looks = v;
          out = { shown: v.length, note: v.length ? "Looks displayed." : "No valid product ids; search the catalogue first." };
        } else out = { error: "Unknown tool" };
        results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: b.id, content: `Error: ${e instanceof Error ? e.message : "failed"}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { provider: "anthropic", text: "Here's what I found for you.", looks: await validateLooks(looks) };
}

/** Drops any id that is not a real, published product. */
async function validateLooks(looks: Look[]) {
  const ids = [...new Set(looks.flatMap((l) => l.productIds))];
  const real = new Set((await db.product.findMany({ where: { id: { in: ids }, published: true }, select: { id: true } })).map((p) => p.id));
  return looks.map((l) => ({ ...l, productIds: l.productIds.filter((id) => real.has(id)) })).filter((l) => l.productIds.length);
}

// ── rule-based fallback ─────────────────────────────────────────
async function rulesStylist(q: string, userId: string | null): Promise<StylistReply> {
  const s = q.toLowerCase();
  const budget = Number((s.match(/(?:₹|rs\.?|inr|under|below)\s*([\d,]{3,})/)?.[1] ?? "").replace(/,/g, "")) || undefined;
  const occasion = /wedding|festive|diwali|sangeet|mehendi/.test(s) ? "Festive" : /office|work|meeting|interview/.test(s) ? "Work" : /dinner|date|party|night|cocktail/.test(s) ? "Evening" : /beach|summer|vacation|holiday/.test(s) ? "Vacation" : /gym|yoga|run/.test(s) ? "Sport" : "Casual";
  const ctx = await customerContext(userId);
  const size = ctx.signedIn ? (ctx as { preferredSizes?: { tops?: string | null } }).preferredSizes?.tops ?? undefined : undefined;
  const pick = async (slot: string, occ: string | undefined, max?: number) => (await searchCatalog({ slot, occasion: occ, maxPrice: max, size, limit: 6 }))[0];
  const looks: Look[] = [];
  const full = await pick("FULL", occasion, budget);
  if (full) {
    const acc = await pick("ACCESSORY", undefined, budget ? budget - full.price : undefined);
    looks.push({ title: `${occasion} statement`, note: `${full.name} does the work on its own${acc ? `; ${acc.name} finishes it` : ""}.`, productIds: [full.id, ...(acc ? [acc.id] : [])] });
  }
  const top = await pick("TOP", occasion === "Festive" ? undefined : occasion, budget ? budget * 0.45 : undefined);
  const bottom = await pick("BOTTOM", undefined, budget && top ? budget - top.price : undefined);
  if (top && bottom) looks.push({ title: "Separates to mix", note: `${top.name} with ${bottom.name}: easy to restyle with what you own.`, productIds: [top.id, bottom.id] });
  return {
    provider: "rules",
    text: looks.length ? `Here are ${looks.length === 1 ? "a look" : "two looks"} for ${occasion.toLowerCase()} dressing${budget ? ` within ₹${budget.toLocaleString("en-IN")}` : ""}, from pieces in stock now.` : "I couldn't find in-stock pieces matching that. Try a different budget or occasion.",
    looks: await validateLooks(looks),
  };
}

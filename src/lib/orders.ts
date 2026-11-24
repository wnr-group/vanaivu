import "server-only";
import { randomBytes } from "crypto";
import { db } from "./db";
import { parseJSON } from "./format";

export const ORDER_STEPS = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const;
export const SHIPMENT_FOR_ORDER: Record<string, string> = { CONFIRMED: "PENDING", PACKED: "PACKED", SHIPPED: "IN_TRANSIT", DELIVERED: "DELIVERED" };

export const newOrderNumber = () => {
  const d = new Date();
  return `VS${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${randomBytes(3).toString("hex").toUpperCase()}`;
};

export type ShipmentEvent = { status: string; at: string; note: string };

export async function addShipmentEvent(orderId: string, status: string, note: string) {
  const s = await db.shipment.findUnique({ where: { orderId } });
  if (!s) return;
  const events = parseJSON<ShipmentEvent[]>(s.events, []);
  events.push({ status, at: new Date().toISOString(), note });
  await db.shipment.update({ where: { orderId }, data: { status, events: JSON.stringify(events) } });
}

/** Return reserved stock to inventory (cancellations / failed payments). */
export async function restock(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    await db.productInventory.update({ where: { variantId: it.variantId }, data: { quantity: { increment: it.quantity } } });
  }
}

export const orderInclude = {
  items: { include: { variant: { include: { product: { select: { slug: true } } } } } },
  payments: { include: { refunds: true } },
  shipment: true,
  returns: true,
};

"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { currentCart, summarize, SHIPPING, type ShippingMethod } from "@/lib/cart";
import { getPaymentProvider, TestProvider } from "@/lib/payments";
import { newOrderNumber, restock, addShipmentEvent } from "@/lib/orders";

const Address = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's name"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  line1: z.string().trim().min(3, "Enter the address"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter the city"),
  state: z.string().trim().min(2, "Enter the state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
});

const Checkout = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  address: Address,
  saveAddress: z.boolean().optional(),
  shippingMethod: z.enum(["STANDARD", "EXPRESS"]),
  paymentMethod: z.enum(["online", "cod"]),
});
export type CheckoutInput = z.infer<typeof Checkout>;

export type PlaceOrderResult =
  | { ok: false; error: string }
  | { ok: true; orderNumber: string; payment: null }
  | { ok: true; orderNumber: string; payment: { provider: "razorpay" | "test"; key: string | null; providerOrderId: string; amount: number; name: string; email: string; phone: string } };

export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = Checkout.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, address, shippingMethod, paymentMethod, saveAddress } = parsed.data;
  const session = await getSession();
  const cart = await currentCart();
  const summary = await summarize(cart, shippingMethod as ShippingMethod);
  if (!cart || summary.lines.length === 0) return { ok: false, error: "Your bag is empty." };
  if (summary.hasIssues) return { ok: false, error: "Some items in your bag are no longer available in the quantity requested. Please review your bag." };
  if (paymentMethod === "cod" && summary.total > 10000) return { ok: false, error: "Cash on delivery is available for orders up to ₹10,000." };

  let orderId: string;
  const number = newOrderNumber();
  try {
    orderId = await db.$transaction(async (tx) => {
      // Reserve stock atomically: decrement only where enough remains.
      for (const l of summary.lines) {
        const r = await tx.productInventory.updateMany({
          where: { variantId: l.variantId, quantity: { gte: l.quantity } },
          data: { quantity: { decrement: l.quantity } },
        });
        if (r.count === 0) throw new Error(`${l.name} (${l.size}) just sold out.`);
      }
      const order = await tx.order.create({
        data: {
          number, userId: session?.userId ?? null, email, status: "PENDING",
          subtotal: summary.subtotal, discount: summary.discount, shippingFee: summary.shippingFee, total: summary.total,
          couponCode: summary.couponCode, shippingMethod, shippingAddress: JSON.stringify(address),
          items: {
            create: summary.lines.map((l) => ({
              variantId: l.variantId, productName: l.name, image: l.image, color: l.color, size: l.size, unitPrice: l.unitPrice, quantity: l.quantity,
            })),
          },
          shipment: {
            create: {
              eta: new Date(Date.now() + SHIPPING[shippingMethod].days[1] * 86400000),
              events: JSON.stringify([{ status: "PENDING", at: new Date().toISOString(), note: "Order received" }]),
            },
          },
        },
      });
      return order.id;
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not place order." };
  }

  // remember order numbers on this device so guests can view their confirmation page
  const jar = await cookies();
  const mine = (jar.get("vestra_orders")?.value ?? "").split(",").filter(Boolean).slice(-9);
  jar.set("vestra_orders", [...mine, number].join(","), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });

  if (session && saveAddress) {
    const count = await db.address.count({ where: { userId: session.userId } });
    await db.address.create({ data: { ...address, userId: session.userId, isDefault: count === 0 } });
  }

  if (paymentMethod === "cod") {
    await db.payment.create({ data: { orderId, provider: "cod", status: "CREATED", amount: summary.total } });
    await confirmOrder(orderId, cart.id);
    return { ok: true, orderNumber: number, payment: null };
  }

  const provider = getPaymentProvider();
  try {
    const { providerOrderId } = await provider.createOrder({ amountInr: summary.total, receipt: number });
    await db.payment.create({ data: { orderId, provider: provider.id, providerOrderId, amount: summary.total } });
    return {
      ok: true, orderNumber: number,
      payment: { provider: provider.id, key: provider.publicKey, providerOrderId, amount: summary.total, name: address.fullName, email, phone: address.phone },
    };
  } catch {
    await restock(orderId);
    await db.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    return { ok: false, error: "We couldn't reach the payment provider. Nothing was charged; please try again." };
  }
}

async function confirmOrder(orderId: string, cartId: string) {
  await db.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
  await addShipmentEvent(orderId, "PENDING", "Order confirmed");
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null, items: { deleteMany: {} } } });
  revalidatePath("/", "layout");
}

export async function verifyPaymentAction(input: { orderNumber: string; providerOrderId: string; providerPaymentId: string; signature: string }) {
  const order = await db.order.findUnique({ where: { number: input.orderNumber }, include: { payments: true } });
  const payment = order?.payments.find((p) => p.providerOrderId === input.providerOrderId);
  if (!order || !payment) return { ok: false, error: "Order not found." };
  if (payment.status === "CAPTURED") return { ok: true };
  const provider = getPaymentProvider();
  if (!provider.verify(input)) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { ok: false, error: "Payment verification failed." };
  }
  await db.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED", providerPaymentId: input.providerPaymentId } });
  const cart = await currentCart();
  if (cart) await confirmOrder(order.id, cart.id);
  else await db.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
  return { ok: true };
}

/** Development-only: completes a payment through the local test provider. */
export async function completeTestPaymentAction(orderNumber: string, providerOrderId: string) {
  const provider = getPaymentProvider();
  if (!(provider instanceof TestProvider)) return { ok: false, error: "Test payments are disabled." };
  const paymentId = "test_pay_" + Date.now().toString(36);
  return verifyPaymentAction({ orderNumber, providerOrderId, providerPaymentId: paymentId, signature: provider.sign(providerOrderId, paymentId) });
}

export async function abandonPaymentAction(orderNumber: string) {
  const order = await db.order.findUnique({ where: { number: orderNumber }, include: { payments: true } });
  if (!order || order.status !== "PENDING") return { ok: false };
  await restock(order.id);
  await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  await db.payment.updateMany({ where: { orderId: order.id, status: "CREATED" }, data: { status: "FAILED" } });
  return { ok: true };
}

export async function checkStockAction() {
  const s = await summarize(await currentCart());
  return s.lines.map((l) => ({ id: l.id, available: l.available }));
}

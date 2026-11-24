import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Payment provider abstraction. Razorpay is used when keys are configured;
 * otherwise a local "test" provider lets the full checkout run in development.
 * The test provider is clearly labelled in the UI and is refused in production.
 */
export interface PaymentProvider {
  id: "razorpay" | "test";
  publicKey: string | null;
  createOrder(input: { amountInr: number; receipt: string }): Promise<{ providerOrderId: string }>;
  verify(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean;
  refund(input: { providerPaymentId: string; amountInr: number }): Promise<{ refundId: string }>;
}

class RazorpayProvider implements PaymentProvider {
  id = "razorpay" as const;
  constructor(private keyId: string, private secret: string) {}
  get publicKey() { return this.keyId; }
  private auth() { return "Basic " + Buffer.from(`${this.keyId}:${this.secret}`).toString("base64"); }
  async createOrder({ amountInr, receipt }: { amountInr: number; receipt: string }) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: this.auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountInr * 100, currency: "INR", receipt }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
    const json = (await res.json()) as { id: string };
    return { providerOrderId: json.id };
  }
  verify({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string }) {
    const expected = createHmac("sha256", this.secret).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  async refund({ providerPaymentId, amountInr }: { providerPaymentId: string; amountInr: number }) {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}/refund`, {
      method: "POST",
      headers: { Authorization: this.auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountInr * 100 }),
    });
    if (!res.ok) throw new Error(`Razorpay refund failed (${res.status})`);
    return { refundId: ((await res.json()) as { id: string }).id };
  }
}

/** Development-only provider: signs payments with the app secret so the verify step is still exercised. */
class TestProvider implements PaymentProvider {
  id = "test" as const;
  publicKey = null;
  private secret = process.env.AUTH_SECRET ?? "dev";
  async createOrder() { return { providerOrderId: "test_order_" + randomBytes(8).toString("hex") }; }
  sign(orderId: string, paymentId: string) { return createHmac("sha256", this.secret).update(`${orderId}|${paymentId}`).digest("hex"); }
  verify({ providerOrderId, providerPaymentId, signature }: { providerOrderId: string; providerPaymentId: string; signature: string }) {
    return this.sign(providerOrderId, providerPaymentId) === signature;
  }
  async refund() { return { refundId: "test_rfnd_" + randomBytes(6).toString("hex") }; }
}

export function getPaymentProvider(): PaymentProvider {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = process.env;
  if (id && secret) return new RazorpayProvider(id, secret);
  if (process.env.NODE_ENV === "production") throw new Error("Razorpay keys are required in production");
  return new TestProvider();
}
export { TestProvider };

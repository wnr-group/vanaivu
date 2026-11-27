import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { currentCart, summarize } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Toaster } from "@/components/layout/Toaster";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await currentCart();
  const [standard, express] = await Promise.all([summarize(cart, "STANDARD"), summarize(cart, "EXPRESS")]);
  if (!standard.lines.length) redirect("/cart");
  const session = await getSession();
  const addresses = session ? await db.address.findMany({ where: { userId: session.userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  const provider = getPaymentProvider();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="container-x h-16 flex items-center justify-between">
          <Link href="/cart" className="eyebrow text-stone hover:text-ink">← Bag</Link>
          <Link href="/" aria-label="VANAIVU home"><Logo className="text-lg sm:text-[22px]" /></Link>
          <span className="eyebrow text-stone flex items-center gap-1.5"><Lock size={12} /> Secure</span>
        </div>
      </header>
      <main className="container-x py-10 lg:py-14">
        <CheckoutForm
          summaries={{ STANDARD: standard, EXPRESS: express }}
          user={session ? { email: session.email, name: session.name ?? "" } : null}
          addresses={addresses.map((a) => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))}
          paymentMode={provider.id}
        />
      </main>
      <Toaster />
    </div>
  );
}

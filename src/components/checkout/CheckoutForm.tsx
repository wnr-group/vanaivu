"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Banknote, FlaskConical } from "lucide-react";
import type { CartSummary } from "@/lib/cart";
import { formatINR, imgUrl } from "@/lib/format";
import { placeOrderAction, verifyPaymentAction, completeTestPaymentAction, abandonPaymentAction, type PlaceOrderResult } from "@/app/actions/checkout";
import { useUI } from "@/lib/ui-store";

type Addr = { id?: string; fullName: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; isDefault?: boolean };
const EMPTY: Addr = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } } }

export function CheckoutForm({ summaries, user, addresses, paymentMode }: {
  summaries: Record<"STANDARD" | "EXPRESS", CartSummary>; user: { email: string; name: string } | null; addresses: Addr[]; paymentMode: "razorpay" | "test";
}) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [addrId, setAddrId] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<Addr>({ ...EMPTY, fullName: user?.name ?? "" });
  const [save, setSave] = useState(true);
  const [ship, setShip] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [pay, setPay] = useState<"online" | "cod">("online");
  const [error, setError] = useState<string | null>(null);
  const [testPay, setTestPay] = useState<Extract<PlaceOrderResult, { ok: true }> | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useUI();
  const s = summaries[ship];

  const chosen = addrId === "new" ? addr : addresses.find((a) => a.id === addrId)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const { id: _id, isDefault: _d, ...address } = chosen; void _id; void _d;
      const r = await placeOrderAction({ email, address: { ...address, line2: address.line2 || undefined }, saveAddress: addrId === "new" && save && !!user, shippingMethod: ship, paymentMethod: pay });
      if (!r.ok) { setError(r.error); return; }
      if (!r.payment) { router.push(`/order/${r.orderNumber}?placed=1`); return; }
      if (r.payment.provider === "test") { setTestPay(r); return; }
      await openRazorpay(r);
    });
  };

  const openRazorpay = async (r: Extract<PlaceOrderResult, { ok: true }>) => {
    const p = r.payment!;
    if (!window.Razorpay) {
      await new Promise<void>((res, rej) => { const sc = document.createElement("script"); sc.src = "https://checkout.razorpay.com/v1/checkout.js"; sc.onload = () => res(); sc.onerror = () => rej(); document.body.appendChild(sc); })
        .catch(() => setError("Could not load the payment window. Check your connection and try again."));
    }
    if (!window.Razorpay) return;
    const rz = new window.Razorpay({
      key: p.key, amount: p.amount * 100, currency: "INR", name: "VANAIVU", image: `${window.location.origin}/brand/vanaivu-logo.png`, description: `Order ${r.orderNumber}`, order_id: p.providerOrderId,
      prefill: { name: p.name, email: p.email, contact: p.phone }, theme: { color: "#100C0C" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = await verifyPaymentAction({ orderNumber: r.orderNumber, providerOrderId: resp.razorpay_order_id, providerPaymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
        if (v.ok) router.push(`/order/${r.orderNumber}?placed=1`); else setError(v.error ?? "Payment could not be verified.");
      },
      modal: { ondismiss: async () => { await abandonPaymentAction(r.orderNumber); toast("Payment cancelled. Your bag is unchanged."); } },
    });
    rz.open();
  };

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20">
      <div className="space-y-12">
        <section>
          <Step n={1} title="Contact" />
          {user ? <p className="text-[14px]">Signed in as <strong className="font-medium">{user.email}</strong></p> : (
            <>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="email" />
              <p className="text-[12px] text-stone mt-3">Checking out as a guest. <Link href="/account/login?next=/checkout" className="link-u">Sign in</Link> for saved addresses and faster checkout.</p>
            </>
          )}
        </section>

        <section>
          <Step n={2} title="Delivery address" />
          {addresses.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mb-6" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <label key={a.id} className={`p-4 border cursor-pointer text-[13px] transition-colors ${addrId === a.id ? "border-ink bg-white/50" : "border-ink/15"}`}>
                  <input type="radio" name="addr" className="sr-only" checked={addrId === a.id} onChange={() => setAddrId(a.id!)} />
                  <p className="font-medium">{a.fullName}{a.isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-stone">Default</span>}</p>
                  <p className="text-stone mt-1">{a.line1}{a.line2 && `, ${a.line2}`}, {a.city}, {a.state} {a.pincode}</p>
                  <p className="text-stone">{a.phone}</p>
                </label>
              ))}
              <label className={`p-4 border cursor-pointer text-[13px] flex items-center justify-center ${addrId === "new" ? "border-ink" : "border-ink/15 border-dashed"}`}>
                <input type="radio" name="addr" className="sr-only" checked={addrId === "new"} onChange={() => setAddrId("new")} />+ New address
              </label>
            </div>
          )}
          {addrId === "new" && (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              <F label="Full name" v={addr.fullName} on={(v) => setAddr({ ...addr, fullName: v })} auto="name" />
              <F label="Mobile number" v={addr.phone} on={(v) => setAddr({ ...addr, phone: v.replace(/\D/g, "").slice(0, 10) })} auto="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" />
              <div className="sm:col-span-2"><F label="Address" v={addr.line1} on={(v) => setAddr({ ...addr, line1: v })} auto="address-line1" /></div>
              <div className="sm:col-span-2"><F label="Apartment, landmark (optional)" v={addr.line2} on={(v) => setAddr({ ...addr, line2: v })} auto="address-line2" required={false} /></div>
              <F label="City" v={addr.city} on={(v) => setAddr({ ...addr, city: v })} auto="address-level2" />
              <div>
                <label className="label" htmlFor="state">State</label>
                <select id="state" required value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} className="field" autoComplete="address-level1">
                  <option value="">Select</option>{STATES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <F label="PIN code" v={addr.pincode} on={(v) => setAddr({ ...addr, pincode: v.replace(/\D/g, "").slice(0, 6) })} auto="postal-code" inputMode="numeric" pattern="[0-9]{6}" />
              {user && <label className="flex items-center gap-2 text-[13px] self-end pb-3"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-ink" /> Save to my address book</label>}
            </div>
          )}
        </section>

        <section>
          <Step n={3} title="Shipping method" />
          <div className="grid sm:grid-cols-2 gap-3">
            {(["STANDARD", "EXPRESS"] as const).map((m) => (
              <label key={m} className={`p-4 border cursor-pointer flex justify-between text-[13px] ${ship === m ? "border-ink bg-white/50" : "border-ink/15"}`}>
                <input type="radio" name="ship" className="sr-only" checked={ship === m} onChange={() => setShip(m)} />
                <span><span className="block font-medium">{m === "STANDARD" ? "Standard" : "Express"}</span><span className="text-stone">{m === "STANDARD" ? "3–5 working days" : "1–2 working days"}</span></span>
                <span>{summaries[m].shippingFee === 0 ? "Free" : formatINR(summaries[m].shippingFee)}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <Step n={4} title="Payment" />
          <div className="grid gap-3">
            <label className={`p-4 border cursor-pointer flex gap-3 items-center text-[13px] ${pay === "online" ? "border-ink bg-white/50" : "border-ink/15"}`}>
              <input type="radio" name="pay" className="sr-only" checked={pay === "online"} onChange={() => setPay("online")} />
              {paymentMode === "test" ? <FlaskConical size={18} strokeWidth={1.4} /> : <CreditCard size={18} strokeWidth={1.4} />}
              <span className="flex-1"><span className="block font-medium">{paymentMode === "test" ? "Online payment (test mode)" : "UPI, cards, netbanking & wallets"}</span>
                <span className="text-stone">{paymentMode === "test" ? "Razorpay keys are not configured, so payments run through the local test provider. No money moves." : "Processed securely by Razorpay"}</span></span>
            </label>
            <label className={`p-4 border cursor-pointer flex gap-3 items-center text-[13px] ${pay === "cod" ? "border-ink bg-white/50" : "border-ink/15"} ${s.total > 10000 ? "opacity-50" : ""}`}>
              <input type="radio" name="pay" className="sr-only" checked={pay === "cod"} onChange={() => setPay("cod")} disabled={s.total > 10000} />
              <Banknote size={18} strokeWidth={1.4} />
              <span><span className="block font-medium">Cash on delivery</span><span className="text-stone">{s.total > 10000 ? "Available for orders up to ₹10,000" : "Pay when your order arrives"}</span></span>
            </label>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-8 self-start bg-mist/60 p-6 lg:p-8">
        <h2 className="font-serif text-2xl">Summary</h2>
        <ul className="mt-6 space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {s.lines.map((l) => (
            <li key={l.id} className="flex gap-3 text-[13px]">
              <div className="relative w-14 aspect-[3/4] bg-mist shrink-0"><Image src={imgUrl(l.image, 120)} alt="" fill sizes="56px" className="object-cover" /><span className="absolute -top-1.5 -right-1.5 bg-ink text-paper w-5 h-5 rounded-full text-[10px] flex items-center justify-center">{l.quantity}</span></div>
              <div className="flex-1"><p>{l.name}</p><p className="text-stone">{l.color} · {l.size}</p></div>
              <p>{formatINR(l.unitPrice * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2.5 text-[14px] border-t border-line pt-5">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(s.subtotal)}</dd></div>
          {s.discount > 0 && <div className="flex justify-between text-terracotta"><dt>Coupon {s.couponCode}</dt><dd>−{formatINR(s.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{s.shippingFee ? formatINR(s.shippingFee) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-ink pt-4 text-[17px]"><dt>Total</dt><dd>{formatINR(s.total)}</dd></div>
        </dl>
        {!s.couponCode && <p className="text-[12px] text-stone mt-3">Have a coupon? <Link href="/cart" className="link-u">Apply it in your bag</Link>.</p>}
        {error && <p className="text-[13px] text-terracotta mt-4" role="alert">{error}</p>}
        <button disabled={pending} className="btn-dark w-full mt-6">{pending ? "Placing order…" : pay === "cod" ? "Place order" : `Pay ${formatINR(s.total)}`}</button>
        <p className="text-[11px] text-stone mt-3 text-center">By placing your order you agree to our <Link href="/help/terms" className="link-u">terms</Link>.</p>
      </aside>

      {testPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Test payment">
          <div className="absolute inset-0 bg-ink/50" />
          <div className="relative bg-paper p-8 max-w-sm w-full">
            <p className="eyebrow text-lavender flex items-center gap-2"><FlaskConical size={14} /> Test payment provider</p>
            <p className="font-serif text-2xl mt-3">{formatINR(testPay.payment!.amount)}</p>
            <p className="text-[13px] text-stone mt-2">Order {testPay.orderNumber}. This simulates the payment gateway for local development. Add Razorpay test keys to <code>.env</code> to use the real Razorpay checkout.</p>
            <div className="grid gap-2 mt-6">
              <button className="btn-dark" disabled={pending} onClick={() => start(async () => {
                const v = await completeTestPaymentAction(testPay.orderNumber, testPay.payment!.providerOrderId);
                if (v.ok) router.push(`/order/${testPay.orderNumber}?placed=1`); else { setError(v.error ?? "Payment failed"); setTestPay(null); }
              })}>Simulate successful payment</button>
              <button className="btn-outline" disabled={pending} onClick={() => start(async () => { await abandonPaymentAction(testPay.orderNumber); setTestPay(null); setError("Payment was cancelled. Nothing was charged."); })}>Simulate failure / cancel</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return <h2 className="flex items-baseline gap-4 mb-6"><span className="font-serif text-mauve text-xl">0{n}</span><span className="font-serif text-3xl">{title}</span></h2>;
}
function F({ label, v, on, auto, required = true, inputMode, pattern }: { label: string; v: string; on: (v: string) => void; auto?: string; required?: boolean; inputMode?: "numeric"; pattern?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} value={v} onChange={(e) => on(e.target.value)} required={required} autoComplete={auto} inputMode={inputMode} pattern={pattern} className="field" />
    </div>
  );
}

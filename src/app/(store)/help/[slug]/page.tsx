import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const PAGES: Record<string, { title: string; sections: [string, string][] }> = {
  about: { title: "About VANAIVU", sections: [
    ["Our story", "VANAIVU designs contemporary womenswear in India for women who dress with intention. Every collection is developed in our studio and produced in small runs with partners we know by name."],
    ["Fashion technology", "Our Virtual Studio lets you build an avatar from your own measurements and try pieces on in 3D before you buy. AI photo try-on and our personal stylist help you shop with confidence and return less."],
  ] },
  contact: { title: "Contact & customer support", sections: [
    ["Customer care", "Write to care@vanaivu.example or call 1800-000-0000 (Mon–Sat, 10am–7pm IST). We reply to every message within one working day."],
    ["Order help", "For a specific order, open it under Account → Orders & returns to track it, cancel before dispatch, request a return or download your invoice."],
    ["Studio", "VANAIVU Studio, Indiranagar, Bengaluru 560038. Styling appointments by request."],
  ] },
  "shipping-returns": { title: "Shipping & returns", sections: [
    ["Shipping", "Complimentary standard shipping on orders above ₹2,499 (₹149 otherwise), delivered in 3–5 working days. Express delivery in 1–2 working days for ₹249. We ship across India."],
    ["Returns", "Free returns within 15 days of delivery. Items must be unworn with tags attached. Request a return from your order page and we'll arrange a pickup."],
    ["Refunds", "Refunds are issued to the original payment method within 5–7 working days of the return reaching us. Cash-on-delivery orders are refunded by bank transfer."],
    ["Cancellations", "Orders can be cancelled from your account until they are shipped."],
  ] },
  "size-guide": { title: "Size guide", sections: [
    ["Body measurements (cm)", "XS: bust 80, waist 62, hip 86 · S: bust 85, waist 67, hip 91 · M: bust 90, waist 72, hip 96 · L: bust 96, waist 78, hip 102 · XL: bust 102, waist 84, hip 108 · XXL: bust 110, waist 92, hip 116."],
    ["Garment measurements", "Each product page lists the measurements of the garment itself, which include ease for the fit (slim, regular, relaxed or oversized)."],
    ["Personal suggestions", "Save your measurements in your profile to see a suggested size on every product and in the Virtual Studio. Suggestions are guidance and not a guarantee of fit."],
  ] },
  faq: { title: "Frequently asked questions", sections: [
    ["How accurate is the Virtual Studio?", "The 3D avatar is built from your measurements and garments are shaped from each product's measurements, so tight and loose areas show up. It is a visual guide, not a physical cloth simulation."],
    ["What happens to my photos?", "Photos for AI try-on are private to your account, sent only to our try-on provider to generate previews, and deleted automatically after 7 or 30 days, or immediately when you delete them."],
    ["Which payment methods do you accept?", "UPI, cards, netbanking and wallets through Razorpay, and cash on delivery for orders up to ₹10,000."],
  ] },
  privacy: { title: "Privacy policy", sections: [
    ["What we collect", "Account details, addresses, orders, and, if you choose, body measurements, avatars and try-on photos."],
    ["How we use it", "To fulfil orders, personalise sizing and styling, and improve the store. We never sell your data. Measurements and photos are never used for advertising."],
    ["Your controls", "Edit or delete measurements, avatars, saved looks and try-on photos from your account at any time. Contact us to delete your account."],
  ] },
  terms: { title: "Terms of use", sections: [
    ["Orders", "An order is accepted once payment is confirmed (or, for cash on delivery, once we confirm dispatch). Prices are in INR and include GST."],
    ["Virtual try-on", "3D and AI previews are illustrative. Colours, drape and fit on screen may differ from the physical garment."],
    ["Returns", "Returns are governed by our Shipping & returns policy."],
  ] },
};

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const p = PAGES[(await params).slug]; return p ? { title: p.title } : {}; }
export function generateStaticParams() { return Object.keys(PAGES).map((slug) => ({ slug })); }

export default async function HelpPage({ params }: Props) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="container-x pt-14 grid lg:grid-cols-[220px_1fr] gap-12">
      <nav aria-label="Help" className="flex lg:flex-col gap-3 text-[14px] overflow-x-auto no-scrollbar whitespace-nowrap">
        {Object.entries(PAGES).map(([k, p]) => <Link key={k} href={`/help/${k}`} className={k === slug ? "text-ink underline underline-offset-4" : "text-stone hover:text-ink"}>{p.title}</Link>)}
      </nav>
      <div className="max-w-2xl">
        <h1 className="display text-[48px] lg:text-[72px]">{page.title}</h1>
        {page.sections.map(([h, b]) => <section key={h} className="mt-10"><h2 className="font-serif text-2xl">{h}</h2><p className="text-[15px] leading-relaxed text-stone mt-3">{b}</p></section>)}
      </div>
    </div>
  );
}

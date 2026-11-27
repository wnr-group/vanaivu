import Link from "next/link";
import { Newsletter } from "./Newsletter";
import { Logo } from "@/components/brand/Logo";

const COLS = [
  { title: "Shop", links: [["New In", "/shop/new-in"], ["Dresses", "/shop/dresses"], ["Tops & Shirts", "/shop/tops"], ["Ethnic & Fusion", "/shop/ethnic-fusion"], ["Collections", "/collections"], ["Sale", "/shop/sale"]] },
  { title: "Experience", links: [["Virtual Studio", "/studio"], ["AI Photo Try-On", "/studio/photo"], ["AI Stylist", "/stylist"], ["My Wardrobe", "/account/wardrobe"], ["Journal", "/journal"]] },
  { title: "Help", links: [["Customer support", "/help/contact"], ["Shipping & returns", "/help/shipping-returns"], ["Size guide", "/help/size-guide"], ["Track an order", "/account/orders"], ["FAQs", "/help/faq"]] },
  { title: "VANAIVU", links: [["About VANAIVU", "/help/about"], ["Contact", "/help/contact"], ["Privacy policy", "/help/privacy"], ["Terms", "/help/terms"]] },
];

export function Footer() {
  return (
    <footer className="bg-ink text-paper mt-24">
      <div className="container-x py-16 lg:py-20 grid gap-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-md">
          <p className="font-serif text-4xl lg:text-5xl leading-[1.05]">Letters from<br /><em className="text-mauve">the studio.</em></p>
          <p className="text-paper/60 text-[14px] mt-5 leading-relaxed">New collections, styling notes and early access to the season, delivered sparingly.</p>
          <Newsletter />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="eyebrow text-paper/45 mb-5">{c.title}</p>
              <ul className="space-y-3 text-[14px]">
                {c.links.map(([l, h]) => <li key={h + l}><Link href={h} className="text-paper/80 hover:text-paper transition-colors">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x py-6 flex flex-col sm:flex-row gap-4 justify-between items-center text-[12px] text-paper/50">
          <Logo className="text-paper text-lg" />
          <ul className="flex gap-6 uppercase tracking-[0.14em]">
            <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-paper">Instagram</a></li>
            <li><a href="https://pinterest.com" target="_blank" rel="noreferrer" className="hover:text-paper">Pinterest</a></li>
            <li><a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-paper">YouTube</a></li>
          </ul>
          <p>© {new Date().getFullYear()} VANAIVU. Prices in INR, inclusive of GST.</p>
        </div>
      </div>
    </footer>
  );
}

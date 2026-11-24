"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, User, Heart, ShoppingBag, Menu, X, Shirt, ChevronRight } from "lucide-react";
import { useUI } from "@/lib/ui-store";
import { imgUrl } from "@/lib/format";
import { SearchOverlay } from "./SearchOverlay";

export type NavData = {
  categories: { slug: string; name: string; image: string }[];
  collections: { slug: string; name: string; image: string; tagline: string }[];
};

type Item = { label: string; href: string; mega?: "clothing" | "collections" | "new" };
const NAV: Item[] = [
  { label: "New In", href: "/shop/new-in", mega: "new" },
  { label: "Clothing", href: "/shop/clothing", mega: "clothing" },
  { label: "Dresses", href: "/shop/dresses" },
  { label: "Tops", href: "/shop/tops" },
  { label: "Bottoms", href: "/shop/bottoms" },
  { label: "Co-ords", href: "/shop/co-ords" },
  { label: "Ethnic & Fusion", href: "/shop/ethnic-fusion" },
  { label: "Collections", href: "/collections", mega: "collections" },
  { label: "Virtual Studio", href: "/studio" },
];

export function HeaderClient({ nav, bagCount, wishCount, user }: { nav: NavData; bagCount: number; wishCount: number; user: { name: string; role: string } | null }) {
  const [mega, setMega] = useState<Item["mega"] | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { openBag, setSearch, menuOpen, setMenu } = useUI();

  useEffect(() => { setMega(null); setMenu(false); }, [pathname, setMenu]);

  const enter = (m: Item["mega"] | null) => { if (closeTimer.current) clearTimeout(closeTimer.current); setMega(m); };
  const leave = () => { closeTimer.current = setTimeout(() => setMega(null), 140); };

  return (
    <>
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85 border-b border-line/70" onMouseLeave={leave}>
      <div className="container-x grid grid-cols-[1fr_auto_1fr] items-center h-16 lg:h-[72px]">
        <div className="flex items-center gap-2">
          <button className="lg:hidden -ml-2 p-2" aria-label="Open menu" onClick={() => setMenu(true)}><Menu size={20} strokeWidth={1.4} /></button>
          <button onClick={() => setSearch(true)} className="hidden lg:flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase text-stone hover:text-ink transition-colors">
            <Search size={17} strokeWidth={1.4} /> <span>Search</span>
          </button>
          <button onClick={() => setSearch(true)} className="lg:hidden p-2" aria-label="Search"><Search size={19} strokeWidth={1.4} /></button>
        </div>
        <Link href="/" className="font-serif text-[26px] lg:text-[30px] tracking-[0.32em] pl-[0.32em] leading-none" aria-label="VESTRA home">VESTRA</Link>
        <nav aria-label="Account" className="flex items-center justify-end gap-0.5 sm:gap-1.5">
          <Link href={user ? "/account" : "/account/login"} className="hidden sm:flex p-2 hover:opacity-60 transition-opacity" aria-label={user ? "My account" : "Sign in"}><User size={19} strokeWidth={1.4} /></Link>
          <Link href="/account/wishlist" className="hidden sm:flex p-2 relative hover:opacity-60 transition-opacity" aria-label={`Wishlist, ${wishCount} items`}>
            <Heart size={19} strokeWidth={1.4} />{wishCount > 0 && <Badge n={wishCount} />}
          </Link>
          <Link href="/account/wardrobe" className="hidden md:flex p-2 hover:opacity-60 transition-opacity" aria-label="My Wardrobe"><Shirt size={19} strokeWidth={1.4} /></Link>
          <button onClick={openBag} className="p-2 relative hover:opacity-60 transition-opacity" aria-label={`Shopping bag, ${bagCount} items`}>
            <ShoppingBag size={19} strokeWidth={1.4} />{bagCount > 0 && <Badge n={bagCount} />}
          </button>
        </nav>
      </div>

      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex justify-center gap-8 xl:gap-11 h-11 items-center">
          {NAV.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href + "/"));
            return (
              <li key={it.href} onMouseEnter={() => enter(it.mega ?? null)} className="h-full flex items-center">
                <Link
                  href={it.href}
                  onFocus={() => enter(it.mega ?? null)}
                  aria-expanded={it.mega ? mega === it.mega : undefined}
                  className={`relative text-[12px] tracking-[0.14em] uppercase py-3 transition-colors ${active ? "text-ink" : "text-ink/75 hover:text-ink"} ${it.label === "Virtual Studio" ? "text-lavender! hover:text-ink!" : ""}`}
                >
                  {it.label}
                  <span className={`absolute left-0 right-0 bottom-1.5 h-px bg-ink origin-left transition-transform duration-500 ${active || mega === it.mega && it.mega ? "scale-x-100" : "scale-x-0"}`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {mega && (
        <div className="hidden lg:block absolute inset-x-0 top-full bg-paper border-b border-line animate-fade" onMouseEnter={() => enter(mega)} onMouseLeave={leave}>
          <MegaPanel kind={mega} nav={nav} />
        </div>
      )}

    </header>
    <MobileNav open={menuOpen} onClose={() => setMenu(false)} nav={nav} user={user} />
    <SearchOverlay />
    </>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="absolute top-0.5 right-0 min-w-4 h-4 px-1 rounded-full bg-terracotta text-paper text-[9px] font-semibold flex items-center justify-center">{n > 99 ? "99+" : n}</span>;
}

function MegaPanel({ kind, nav }: { kind: "clothing" | "collections" | "new"; nav: NavData }) {
  if (kind === "collections") {
    return (
      <div className="container-x py-10 grid grid-cols-[220px_1fr] gap-12">
        <ul className="space-y-3">
          {nav.collections.map((c) => (
            <li key={c.slug}><Link href={`/collections/${c.slug}`} className="font-serif text-[19px] hover:italic transition-all">{c.name}</Link></li>
          ))}
          <li className="pt-3"><Link href="/collections" className="eyebrow link-u">All collections</Link></li>
        </ul>
        <div className="grid grid-cols-4 gap-5">
          {nav.collections.slice(0, 4).map((c) => <MegaTile key={c.slug} href={`/collections/${c.slug}`} image={c.image} title={c.name} sub={c.tagline} />)}
        </div>
      </div>
    );
  }
  const featured = kind === "new"
    ? [{ href: "/shop/new-in", label: "All New Arrivals" }, { href: "/shop/new-in?category=dresses", label: "New Dresses" }, { href: "/shop/new-in?category=outerwear", label: "New Outerwear" }, { href: "/shop/trending", label: "Trending Now" }]
    : [{ href: "/shop/clothing", label: "Shop All Clothing" }, { href: "/shop/new-in", label: "New In" }, { href: "/shop/trending", label: "Trending Now" }, { href: "/shop/sale", label: "Sale" }, { href: "/studio", label: "Try On in the Studio" }];
  const tiles = kind === "new" ? nav.categories.filter((c) => ["dresses", "outerwear", "co-ords"].includes(c.slug)) : nav.categories.filter((c) => ["tops", "jeans-trousers", "ethnic-fusion"].includes(c.slug));
  return (
    <div className="container-x py-10 grid grid-cols-[200px_220px_1fr] gap-12">
      <div>
        <p className="eyebrow text-stone mb-5">Featured</p>
        <ul className="space-y-3">{featured.map((f) => <li key={f.href}><Link href={f.href} className="text-[14px] hover:text-terracotta transition-colors">{f.label}</Link></li>)}</ul>
      </div>
      <div>
        <p className="eyebrow text-stone mb-5">Categories</p>
        <ul className="space-y-3">{nav.categories.map((c) => <li key={c.slug}><Link href={kind === "new" ? `/shop/new-in?category=${c.slug}` : `/shop/${c.slug}`} className="text-[14px] hover:text-terracotta transition-colors">{c.name}</Link></li>)}</ul>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {tiles.map((c) => <MegaTile key={c.slug} href={`/shop/${c.slug}`} image={c.image} title={c.name} />)}
      </div>
    </div>
  );
}

function MegaTile({ href, image, title, sub }: { href: string; image: string; title: string; sub?: string }) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-mist">
        <Image src={imgUrl(image, 500)} alt="" fill sizes="20vw" className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-lux)] group-hover:scale-105" />
      </div>
      <p className="mt-3 font-serif text-[17px]">{title}</p>
      {sub && <p className="text-[12px] text-stone mt-0.5">{sub}</p>}
    </Link>
  );
}

function MobileNav({ open, onClose, nav, user }: { open: boolean; onClose: () => void; nav: NavData; user: { name: string; role: string } | null }) {
  const [sub, setSub] = useState<"clothing" | "collections" | null>(null);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; if (!open) setSub(null); }, [open]);
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-ink/40 animate-fade" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm bg-paper flex flex-col animate-[fade-up_0.4s_var(--ease-lux)]">
        <div className="flex items-center justify-between h-16 px-5 border-b border-line">
          <span className="font-serif tracking-[0.3em] text-xl">VESTRA</span>
          <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2"><X size={20} strokeWidth={1.4} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {sub === null ? (
            <ul className="divide-y divide-line">
              {NAV.map((it) => (
                <li key={it.href}>
                  {it.mega === "clothing" || it.mega === "collections" ? (
                    <button onClick={() => setSub(it.mega as "clothing" | "collections")} className="w-full flex justify-between items-center py-4 font-serif text-[22px]">{it.label}<ChevronRight size={18} strokeWidth={1.3} /></button>
                  ) : (
                    <Link href={it.href} className={`block py-4 font-serif text-[22px] ${it.label === "Virtual Studio" ? "text-lavender" : ""}`}>{it.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <button onClick={() => setSub(null)} className="eyebrow text-stone py-3">← Back</button>
              <ul className="grid grid-cols-2 gap-3 mt-2">
                {(sub === "clothing" ? nav.categories.map((c) => ({ href: `/shop/${c.slug}`, name: c.name, image: c.image })) : nav.collections.map((c) => ({ href: `/collections/${c.slug}`, name: c.name, image: c.image }))).map((x) => (
                  <li key={x.href}>
                    <Link href={x.href} className="block">
                      <div className="relative aspect-[3/4] bg-mist overflow-hidden"><Image src={imgUrl(x.image, 300)} alt="" fill sizes="45vw" className="object-cover" /></div>
                      <p className="mt-2 text-[13px]">{x.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="border-t border-line px-5 py-4 grid grid-cols-3 gap-2 text-[12px] text-center">
          <Link href={user ? "/account" : "/account/login"} className="py-2 flex flex-col items-center gap-1"><User size={18} strokeWidth={1.4} />{user ? "Account" : "Sign in"}</Link>
          <Link href="/account/wishlist" className="py-2 flex flex-col items-center gap-1"><Heart size={18} strokeWidth={1.4} />Wishlist</Link>
          <Link href="/account/wardrobe" className="py-2 flex flex-col items-center gap-1"><Shirt size={18} strokeWidth={1.4} />Wardrobe</Link>
        </div>
      </div>
    </div>
  );
}

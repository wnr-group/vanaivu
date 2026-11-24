"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { useUI } from "@/lib/ui-store";
import { formatINR, imgUrl } from "@/lib/format";

type Suggest = { products: { slug: string; name: string; price: number; image: string; category: string }[]; categories: { slug: string; name: string }[] };
const POPULAR = ["Linen dress", "Wide-leg jeans", "White shirt", "Saree", "Trench", "Satin"];

export function SearchOverlay() {
  const { searchOpen, setSearch } = useUI();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!searchOpen) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearch(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [searchOpen, setSearch]);

  useEffect(() => {
    if (q.trim().length < 2) { setData(null); return; }
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((d) => { setData(d); setActive(-1); })
        .catch(() => {}).finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  if (!searchOpen) return null;
  const go = (href: string) => { setSearch(false); setQ(""); router.push(href); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && data?.products[active]) return go(`/product/${data.products[active].slug}`);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink/30 animate-fade" onClick={() => setSearch(false)} />
      <div className="relative bg-paper animate-fade-up max-h-[90dvh] overflow-y-auto">
        <div className="container-x py-6 lg:py-10">
          <form onSubmit={submit} className="flex items-center gap-4 border-b border-ink pb-3" role="search">
            <Search size={22} strokeWidth={1.3} />
            <input
              ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dresses, colours, fabrics…"
              className="flex-1 min-w-0 font-serif text-2xl lg:text-4xl outline-none placeholder:text-stone/50" aria-label="Search the store"
              role="combobox" aria-expanded={!!data} aria-controls="search-results" aria-autocomplete="list"
              onKeyDown={(e) => {
                const n = data?.products.length ?? 0;
                if (e.key === "ArrowDown" && n) { e.preventDefault(); setActive((a) => (a + 1) % n); }
                if (e.key === "ArrowUp" && n) { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
              }}
            />
            <button type="button" onClick={() => setSearch(false)} aria-label="Close search" className="p-2"><X size={22} strokeWidth={1.3} /></button>
          </form>

          <div id="search-results" className="mt-8 min-h-[180px]">
            {!data && !loading && (
              <div>
                <p className="eyebrow text-stone mb-4">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p) => <button key={p} onClick={() => setQ(p)} className="px-4 py-2 border border-ink/15 text-[13px] hover:border-ink transition-colors">{p}</button>)}
                </div>
              </div>
            )}
            {loading && !data && <p className="text-stone text-sm">Searching…</p>}
            {data && (
              <div className="grid lg:grid-cols-[220px_1fr] gap-8">
                <div>
                  {data.categories.length > 0 && (
                    <>
                      <p className="eyebrow text-stone mb-3">Categories</p>
                      <ul className="space-y-2 mb-6">{data.categories.map((c) => <li key={c.slug}><button onClick={() => go(`/shop/${c.slug}`)} className="hover:text-terracotta">{c.name}</button></li>)}</ul>
                    </>
                  )}
                  <button onClick={() => go(`/search?q=${encodeURIComponent(q)}`)} className="eyebrow link-u inline-flex items-center gap-2">See all results <ArrowRight size={12} /></button>
                </div>
                {data.products.length ? (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" role="listbox">
                    {data.products.map((p, i) => (
                      <li key={p.slug} role="option" aria-selected={i === active}>
                        <Link href={`/product/${p.slug}`} onClick={() => { setSearch(false); setQ(""); }} className={`block group ${i === active ? "outline outline-1 outline-ink outline-offset-4" : ""}`}>
                          <div className="relative aspect-[3/4] bg-mist overflow-hidden"><Image src={imgUrl(p.image, 300)} alt="" fill sizes="16vw" className="object-cover group-hover:scale-105 transition-transform duration-700" /></div>
                          <p className="text-[13px] mt-2 leading-snug">{p.name}</p>
                          <p className="text-[12px] text-stone">{formatINR(p.price)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-stone">Nothing matches &ldquo;{q}&rdquo;. Try a colour, fabric or category.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

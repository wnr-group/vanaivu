"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import type { Facets, FilterKey } from "@/lib/catalog";
import { formatINR } from "@/lib/format";

const GROUPS: { key: FilterKey; label: string }[] = [
  { key: "category", label: "Category" }, { key: "size", label: "Size" }, { key: "color", label: "Colour" },
  { key: "occasion", label: "Occasion" }, { key: "style", label: "Style" }, { key: "fit", label: "Fit" },
  { key: "material", label: "Material" }, { key: "sleeve", label: "Sleeve length" }, { key: "neckline", label: "Neckline" },
  { key: "pattern", label: "Pattern" }, { key: "brand", label: "Brand" },
];
const PRICE_BANDS = [[0, 1999], [2000, 3999], [4000, 6999], [7000, 9999], [10000, 0]] as const;

export function FilterBar({ facets, total, sorts, hideCategory, basePath }: { facets: Facets; total: number; sorts: { value: string; label: string }[]; hideCategory: boolean; basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const values = (k: string) => (sp.get(k)?.split(",").filter(Boolean) ?? []);
  const push = (next: URLSearchParams) => start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  const toggle = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    const cur = values(k);
    const nv = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (nv.length) next.set(k, nv.join(",")); else next.delete(k);
    push(next);
  };
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v); else next.delete(k);
    push(next);
  };
  const setPrice = (min: number, max: number) => {
    const next = new URLSearchParams(sp.toString());
    const same = sp.get("min") === String(min || "") && sp.get("max") === String(max || "");
    next.delete("min"); next.delete("max");
    if (!same) { if (min) next.set("min", String(min)); if (max) next.set("max", String(max)); }
    push(next);
  };

  const groups = GROUPS.filter((g) => !(hideCategory && g.key === "category") && facets[g.key].length > 1);
  const chips: { k: string; v: string; label: string }[] = [];
  for (const g of GROUPS) for (const v of values(g.key)) chips.push({ k: g.key, v, label: facets[g.key].find((f) => f.value === v)?.label ?? v });
  const priceActive = sp.get("min") || sp.get("max");
  const activeCount = chips.length + (priceActive ? 1 : 0) + (sp.get("stock") ? 1 : 0) + (sp.get("sale") ? 1 : 0);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  const panel = (
    <div className="space-y-1">
      <Section title="Price" defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_BANDS.map(([a, b]) => {
            const on = sp.get("min") === (a ? String(a) : null) && sp.get("max") === (b ? String(b) : null);
            return (
              <button key={a} onClick={() => setPrice(a, b)} aria-pressed={on} className={`px-3 h-9 text-[12px] border transition-colors ${on ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"}`}>
                {b ? `${formatINR(a)} – ${formatINR(b)}` : `${formatINR(a)}+`}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Availability & offers" defaultOpen>
        <Check label="In stock only" on={sp.get("stock") === "1"} onChange={() => setParam("stock", sp.get("stock") ? null : "1")} />
        <Check label="On sale" on={sp.get("sale") === "1"} onChange={() => setParam("sale", sp.get("sale") ? null : "1")} />
      </Section>
      {groups.map((g) => (
        <Section key={g.key} title={g.label} count={values(g.key).length} defaultOpen={["size", "color", "category"].includes(g.key)}>
          {g.key === "size" ? (
            <div className="grid grid-cols-4 gap-1.5">
              {facets.size.map((f) => {
                const on = values("size").includes(f.value);
                return <button key={f.value} onClick={() => toggle("size", f.value)} aria-pressed={on} className={`h-9 text-[12px] border transition-colors ${on ? "bg-ink text-paper border-ink" : "border-ink/15 hover:border-ink"}`}>{f.label}</button>;
              })}
            </div>
          ) : g.key === "color" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {facets.color.map((f) => {
                const on = values("color").includes(f.value);
                return (
                  <button key={f.value} onClick={() => toggle("color", f.value)} aria-pressed={on} className="flex items-center gap-2 text-[13px] text-left">
                    <span className={`w-4 h-4 rounded-full shrink-0 ring-offset-2 ring-offset-paper ${on ? "ring-1 ring-ink" : "ring-1 ring-ink/10"}`} style={{ background: f.hex }} />
                    <span className={on ? "underline underline-offset-4" : ""}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            facets[g.key].map((f) => <Check key={f.value} label={f.label} count={f.count} on={values(g.key).includes(f.value)} onChange={() => toggle(g.key, f.value)} />)
          )}
        </Section>
      ))}
    </div>
  );

  return (
    <>
      <div className="sticky top-16 lg:top-[116px] z-30 bg-paper/95 backdrop-blur border-b border-line -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center justify-between h-14 gap-4">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2.5 text-[12px] uppercase tracking-[0.14em]">
            <SlidersHorizontal size={15} strokeWidth={1.4} /> Filter {activeCount > 0 && <span className="bg-ink text-paper rounded-full w-5 h-5 text-[10px] flex items-center justify-center">{activeCount}</span>}
          </button>
          <p className={`text-[12px] text-stone transition-opacity ${pending ? "opacity-40" : ""}`} aria-live="polite">{pending ? "Updating…" : `${total} ${total === 1 ? "piece" : "pieces"}`}</p>
          <label className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] relative">
            <span className="hidden sm:inline">Sort</span>
            <select value={sp.get("sort") ?? "recommended"} onChange={(e) => setParam("sort", e.target.value === "recommended" ? null : e.target.value)} className="appearance-none pr-6 bg-transparent outline-none cursor-pointer normal-case tracking-normal text-[13px]">
              {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-0 pointer-events-none" />
          </label>
        </div>
        {(chips.length > 0 || priceActive) && (
          <div className="flex flex-wrap gap-1.5 pb-3">
            {chips.map((c) => (
              <button key={c.k + c.v} onClick={() => toggle(c.k, c.v)} className="flex items-center gap-1.5 bg-mist px-3 h-8 text-[12px] hover:bg-ink hover:text-paper transition-colors">{c.label}<X size={12} /></button>
            ))}
            {priceActive && <button onClick={() => setPrice(Number(sp.get("min")), Number(sp.get("max")))} className="flex items-center gap-1.5 bg-mist px-3 h-8 text-[12px]">Price<X size={12} /></button>}
            <button onClick={() => router.replace(basePath, { scroll: false })} className="text-[12px] link-u px-2">Clear all</button>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40 animate-fade" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-full max-w-[400px] bg-paper flex flex-col animate-fade-up">
            <div className="flex items-center justify-between h-16 px-6 border-b border-line">
              <p className="font-serif text-2xl">Filter</p>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="p-2 -mr-2"><X size={20} strokeWidth={1.4} /></button>
            </div>
            <div className={`flex-1 overflow-y-auto px-6 py-2 ${pending ? "opacity-60" : ""}`}>{panel}</div>
            <div className="border-t border-line p-4 grid grid-cols-2 gap-2">
              <button onClick={() => router.replace(basePath, { scroll: false })} className="btn-outline">Clear</button>
              <button onClick={() => setOpen(false)} className="btn-dark">Show {total}</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Section({ title, children, count = 0, defaultOpen = false }: { title: string; children: React.ReactNode; count?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-[12px] uppercase tracking-[0.14em]" aria-expanded={open}>
        <span>{title}{count > 0 && <span className="text-terracotta ml-1.5">({count})</span>}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-5 space-y-2">{children}</div>}
    </div>
  );
}

function Check({ label, on, onChange, count }: { label: string; on: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="flex items-center gap-3 text-[13px] cursor-pointer">
      <input type="checkbox" checked={on} onChange={onChange} className="accent-ink w-4 h-4" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-stone text-[11px]">{count}</span>}
    </label>
  );
}

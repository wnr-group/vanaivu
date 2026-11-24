"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Maximize2, Minimize2, RotateCcw, Search, X, Check, Loader2, AlertCircle, Sparkles, Shirt, User, Layers, BookmarkCheck } from "lucide-react";
import { useStudio, toSpec, SLOT_LABEL, SLOT_ORDER, type Slot, type Worn } from "./store";
import { type AvatarConfig } from "./engine/body";
import { AvatarPanel } from "./AvatarPanel";
import type { Measurements } from "./engine/human";
import { PROVIDERS, type View, type Framing, type Lighting } from "./engine/Stage";
import type { Pose } from "./engine/HumanAvatar";
import type { FitReport } from "./engine/garments";
import type { StudioProduct } from "@/lib/studio";
import { formatINR, imgUrl } from "@/lib/format";
import { suggestSize } from "@/lib/fit";
import { addOutfitAction, addToBagAction } from "@/app/actions/cart";
import { getStudioStateAction, saveOutfitAction, deleteOutfitAction, renameOutfitAction, recordTryOnAction } from "@/app/actions/studio";
import { useUI } from "@/lib/ui-store";

const Stage = dynamic(() => import("./engine/Stage").then((m) => m.Stage), { ssr: false, loading: () => <div className="absolute inset-0 flex items-center justify-center text-paper/50 text-sm"><Loader2 className="animate-spin" size={20} /></div> });

type StudioData = Awaited<ReturnType<typeof getStudioStateAction>>;
type Tab = "avatar" | "shop" | "saved" | "look";

export function Studio({ initialSlugs, initialColor, initialSize, initialOutfitId }: { initialSlugs: string[]; initialColor?: string; initialSize?: string; initialOutfitId?: string }) {
  const s = useStudio();
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("shop");
  const [mobileSheet, setMobileSheet] = useState<Tab | null>(null);
  const [data, setData] = useState<StudioData | null>(null);
  const [fit, setFit] = useState<Record<string, FitReport | null>>({});
  const [measured, setMeasured] = useState<Measurements | null>(null);
  const [full, setFull] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const { toast } = useUI();

  useEffect(() => { void Promise.resolve(useStudio.persist.rehydrate()).then(() => setHydrated(true)); }, []);
  const refresh = useCallback(() => getStudioStateAction().then(setData), []);
  useEffect(() => { refresh(); }, [refresh]);

  // Try-on pipeline: retrieve asset → verify compatibility → fit to body.
  const tryOn = useCallback(async (product: StudioProduct, color?: string, size?: string) => {
    const set = useStudio.getState().setPipeline;
    set({ name: product.name, step: "fetch" });
    await new Promise((r) => setTimeout(r, 150));
    const asset = product.assets.find((a) => a.color === (color ?? product.colours[0]?.name)) ?? product.assets[0];
    set({ name: product.name, step: "verify" });
    const provider = PROVIDERS.realistic;
    const ok = (!asset || asset.format === "procedural" || ["glb", "gltf"].includes(asset.format)) && (product.garment.skeleton === provider.skeleton || asset?.format === "procedural");
    if (!ok) { set({ name: product.name, step: "error", message: `Not compatible with the ${provider.label}` }); return; }
    await new Promise((r) => setTimeout(r, 150));
    set({ name: product.name, step: "fit" });
    useStudio.getState().wear(product, color, size);
    recordTryOnAction(product.id);
    setTimeout(() => set({ name: product.name, step: "done" }), 350);
    setTimeout(() => { if (useStudio.getState().pipeline?.step === "done") set(null); }, 2200);
  }, []);

  // preload products from the URL (Try On buttons / Complete the look)
  const loaded = useRef(false);
  useEffect(() => {
    if (!hydrated || loaded.current) return;
    loaded.current = true;
    (async () => {
      if (initialOutfitId) {
        const st = await getStudioStateAction();
        const o = st.signedIn ? st.outfits.find((x) => x.id === initialOutfitId) : null;
        if (o) {
          const prods: StudioProduct[] = await fetch(`/api/studio/catalog?slugs=${o.items.map((i) => i.slug).join(",")}`).then((r) => r.json());
          useStudio.getState().loadOutfit(o.id, o.name, o.items.map((i) => ({ product: prods.find((p) => p.slug === i.slug)!, color: i.color, size: i.size })).filter((w) => w.product));
          setTab("look");
          return;
        }
      }
      if (!initialSlugs.length) return;
      const prods: StudioProduct[] = await fetch(`/api/studio/catalog?slugs=${initialSlugs.join(",")}`).then((r) => r.json());
      if (initialSlugs.length > 1) useStudio.getState().clearOutfit();
      for (const slug of initialSlugs) {
        const p = prods.find((x) => x.slug === slug);
        if (p) await tryOn(p, initialSlugs.length === 1 ? initialColor : undefined, initialSlugs.length === 1 ? initialSize : undefined);
      }
      if (initialSlugs.length && !prods.length) toast("That piece isn't available in the Studio yet.", { tone: "error" });
      setTab("look");
    })();
  }, [hydrated, initialSlugs, initialColor, initialSize, initialOutfitId, tryOn, toast]);

  // use saved measurements for a fresh avatar
  useEffect(() => {
    if (!hydrated || !data?.signedIn) return;
    const primary = data.avatars.find((a) => a.isPrimary);
    if (primary && !useStudio.getState().avatarId) useStudio.getState().loadAvatar(primary.id, primary.name, primary.config as unknown as AvatarConfig);
  }, [hydrated, data]);

  const specs = useMemo(() => SLOT_ORDER.map((k) => s.outfit[k]).filter((w): w is Worn => !!w && !!w.product).map(toSpec), [s.outfit]);
  const onFit = useCallback((r: Record<string, FitReport | null>) => setFit(r), []);
  const onMeasure = useCallback((m: Measurements) => {
    setMeasured(m);
    // keep the avatar's tape measurements (used by the Fit Assistant and saved avatars) in sync with the real mesh
    const a = useStudio.getState().avatar;
    if (Math.abs(a.bustCm - m.bustCm) > 0.4 || Math.abs(a.waistCm - m.waistCm) > 0.4 || Math.abs(a.hipCm - m.hipCm) > 0.4 || Math.abs(a.shoulderCm - m.shoulderCm) > 0.4)
      useStudio.getState().setAvatar({ bustCm: m.bustCm, waistCm: m.waistCm, hipCm: m.hipCm, shoulderCm: Math.min(55, Math.max(25, m.shoulderCm)) });
  }, []);

  const toggleFull = () => {
    if (!document.fullscreenElement) stageRef.current?.requestFullscreen?.().then(() => setFull(true)).catch(() => {});
    else document.exitFullscreen().then(() => setFull(false));
  };
  useEffect(() => { const h = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);

  const panels: Record<Tab, React.ReactNode> = {
    avatar: <AvatarPanel data={data} refresh={refresh} measured={measured} />,
    shop: <ShopPanel onTry={tryOn} />,
    saved: <SavedPanel data={data} refresh={refresh} />,
    look: <LookPanel fit={fit} data={data} refresh={refresh} />,
  };

  return (
    <div className="h-[calc(100dvh-56px)] grid lg:grid-cols-[360px_1fr_380px] bg-paper">
      {/* LEFT */}
      <aside className="hidden lg:flex flex-col border-r border-line min-h-0">
        <div className="flex border-b border-line">
          {(["avatar", "shop", "saved"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 h-12 text-[11px] uppercase tracking-[0.16em] ${tab === t || (tab === "look" && t === "shop") ? "border-b border-ink text-ink" : "text-stone"}`}>
              {t === "avatar" ? "Create avatar" : t === "shop" ? "Clothing" : "Wardrobe"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">{panels[tab === "look" ? "shop" : tab]}</div>
      </aside>

      {/* CENTER */}
      <section ref={stageRef} className="relative max-lg:mb-16 bg-gradient-to-b from-[#ece8e4] via-[#e6e1dc] to-[#d9d3cd] min-h-0 overflow-hidden" aria-label="3D avatar viewer">
        {hydrated && <Stage config={s.avatar} garments={specs} view={s.view} viewNonce={s.viewNonce} onFit={onFit} onMeasure={onMeasure} pose={s.pose} framing={s.framing} lighting={s.lighting} />}
        <div className="absolute top-4 left-4 flex gap-1 bg-paper/80 backdrop-blur p-1" role="group" aria-label="Camera view">
          {(["front", "side", "back"] as View[]).map((v) => (
            <button key={v} onClick={() => s.setView(v)} className="px-3 h-8 text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-paper transition-colors">{v}</button>
          ))}
        </div>
        <div className="absolute top-4 right-4 flex gap-1">
          <button onClick={() => s.setView("front")} className="w-9 h-9 bg-paper/80 backdrop-blur flex items-center justify-center hover:bg-paper" aria-label="Reset view"><RotateCcw size={15} /></button>
          <button onClick={toggleFull} className="w-9 h-9 bg-paper/80 backdrop-blur flex items-center justify-center hover:bg-paper" aria-label={full ? "Exit full screen" : "Full screen"}>{full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        </div>
        <StageControls />
        {s.pipeline && <PipelineChip p={s.pipeline} />}
        {specs.length === 0 && hydrated && (
          <div className="absolute bottom-24 lg:bottom-10 inset-x-0 flex justify-center pointer-events-none">
            <p className="bg-paper/85 backdrop-blur px-5 py-3 text-[13px] text-center">Choose a piece from <strong className="font-medium">Clothing</strong> to start styling</p>
          </div>
        )}
        <p className="hidden xl:block absolute top-14 left-4 text-[11px] text-stone max-w-[240px]">Drag to rotate · scroll to zoom. Fit is visualised from garment measurements and your avatar; it is guidance, not a physical simulation.</p>
      </section>

      {/* RIGHT */}
      <aside className="hidden lg:flex flex-col border-l border-line min-h-0">
        <div className="h-12 border-b border-line flex items-center px-6 text-[11px] uppercase tracking-[0.16em]">Your look</div>
        <div className="flex-1 overflow-y-auto">{panels.look}</div>
      </aside>

      {/* MOBILE bottom bar + sheets */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-line grid grid-cols-4 h-16" aria-label="Studio panels">
        {([["avatar", "Avatar", User], ["shop", "Clothing", Shirt], ["look", "Look", Layers], ["saved", "Saved", BookmarkCheck]] as const).map(([t, l, Icon]) => (
          <button key={t} onClick={() => setMobileSheet(mobileSheet === t ? null : t)} className={`flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.12em] ${mobileSheet === t ? "text-ink" : "text-stone"}`}>
            <Icon size={18} strokeWidth={1.4} />{l}{t === "look" && Object.keys(s.outfit).length > 0 && <span className="absolute mt-[-28px] ml-6 w-4 h-4 bg-terracotta text-paper rounded-full text-[9px] flex items-center justify-center">{Object.keys(s.outfit).length}</span>}
          </button>
        ))}
      </nav>
      {mobileSheet && (
        <div className="lg:hidden fixed inset-x-0 bottom-16 z-20 bg-paper max-h-[62dvh] flex flex-col shadow-[0_-12px_30px_rgba(0,0,0,0.12)] animate-fade-up rounded-t-xl" role="dialog" aria-label={mobileSheet}>
          <div className="flex justify-between items-center px-5 h-12 border-b border-line shrink-0">
            <span className="w-10 h-1 rounded-full bg-line absolute left-1/2 -translate-x-1/2 top-2" />
            <span className="text-[11px] uppercase tracking-[0.16em]">{{ avatar: "Create avatar", shop: "Clothing", look: "Your look", saved: "Wardrobe" }[mobileSheet]}</span>
            <button onClick={() => setMobileSheet(null)} aria-label="Close panel"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto">{panels[mobileSheet]}</div>
        </div>
      )}
    </div>
  );
}

function StageControls() {
  const { pose, setPose, framing, setFraming, lighting, setLighting } = useStudio();
  const group = <T extends string,>(label: string, opts: [T, string][], value: T, set: (v: T) => void) => (
    <div className="flex items-center gap-1 bg-paper/85 backdrop-blur p-1" role="group" aria-label={label}>
      {opts.map(([k, l]) => <button key={k} onClick={() => set(k)} aria-pressed={value === k} className={`px-2.5 h-7 text-[10px] uppercase tracking-[0.12em] transition-colors ${value === k ? "bg-ink text-paper" : "hover:bg-ink/10"}`}>{l}</button>)}
    </div>
  );
  return (
    <div className="absolute bottom-20 lg:bottom-4 inset-x-0 flex flex-wrap justify-center gap-2 px-3 pointer-events-auto">
      {group<Pose>("Pose", [["relaxed", "Relaxed"], ["hand-on-hip", "Hand on hip"], ["hands-clasped", "Poised"], ["walk", "Runway walk"], ["a-pose", "A-pose"]], pose, setPose)}
      {group<Framing>("Framing", [["full", "Full"], ["upper", "Upper"], ["face", "Face"]], framing, setFraming)}
      {group<Lighting>("Lighting", [["studio", "Studio"], ["daylight", "Day"], ["golden", "Golden"], ["evening", "Evening"]], lighting, setLighting)}
    </div>
  );
}

function PipelineChip({ p }: { p: NonNullable<ReturnType<typeof useStudio.getState>["pipeline"]> }) {
  const steps: [string, string][] = [["fetch", "Retrieving garment"], ["verify", "Checking avatar compatibility"], ["fit", "Fitting to your avatar"]];
  const idx = p.step === "done" ? 3 : steps.findIndex(([k]) => k === p.step);
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-ink text-paper px-5 py-3 text-[12px] min-w-[260px] animate-fade" role="status" aria-live="polite">
      <p className="text-paper/60 text-[10px] uppercase tracking-[0.16em] mb-2 truncate">{p.name}</p>
      {p.step === "error" ? <p className="flex items-center gap-2 text-peach"><AlertCircle size={14} />{p.message}</p> : (
        <ul className="space-y-1">
          {steps.map(([k, l], i) => (
            <li key={k} className={`flex items-center gap-2 ${i <= idx ? "text-paper" : "text-paper/35"}`}>
              {i < idx ? <Check size={13} /> : i === idx ? <Loader2 size={13} className="animate-spin" /> : <span className="w-[13px]" />}{l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Shop panel ─────────────────────────
const FILTERS: { label: string; slot?: Slot }[] = [{ label: "All" }, { label: "Dresses & sets", slot: "FULL" }, { label: "Tops", slot: "TOP" }, { label: "Bottoms", slot: "BOTTOM" }, { label: "Layers", slot: "OUTER" }, { label: "Accessories", slot: "ACCESSORY" }];

function ShopPanel({ onTry }: { onTry: (p: StudioProduct) => void }) {
  const [slot, setSlot] = useState<Slot | undefined>();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StudioProduct[] | null>(null);
  const [error, setError] = useState(false);
  const outfit = useStudio((s) => s.outfit);
  useEffect(() => {
    const ctl = new AbortController();
    setError(false);
    const t = setTimeout(() => {
      fetch(`/api/studio/catalog?${new URLSearchParams({ ...(slot ? { slot } : {}), ...(q ? { q } : {}) })}`, { signal: ctl.signal })
        .then((r) => r.json()).then(setItems).catch((e) => { if (e.name !== "AbortError") setError(true); });
    }, q ? 200 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [slot, q]);
  const wearing = new Set(Object.values(outfit).map((w) => w?.product?.id));
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 border-b border-ink/25 focus-within:border-ink mb-4">
        <Search size={15} className="text-stone" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Studio-ready pieces" className="flex-1 h-10 outline-none text-[14px]" aria-label="Search clothing" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => <button key={f.label} onClick={() => setSlot(f.slot)} className={`px-3 h-8 shrink-0 text-[12px] border ${slot === f.slot ? "bg-ink text-paper border-ink" : "border-ink/15"}`}>{f.label}</button>)}
      </div>
      {error ? <p className="text-[13px] text-terracotta mt-6">Couldn&apos;t load the catalogue. <button className="link-u" onClick={() => setQ((x) => x + "")}>Retry</button></p>
        : !items ? <div className="grid grid-cols-2 gap-3 mt-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-mist animate-pulse" />)}</div>
        : items.length === 0 ? <p className="text-[13px] text-stone mt-6">No Studio-ready pieces match.</p> : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 mt-4">
            {items.map((p) => (
              <li key={p.id}>
                <button onClick={() => onTry(p)} className="group text-left w-full" aria-label={`Try on ${p.name}`}>
                  <div className="relative aspect-[3/4] bg-mist overflow-hidden">
                    <Image src={imgUrl(p.image, 300)} alt="" fill sizes="160px" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    {wearing.has(p.id) && <span className="absolute top-2 left-2 bg-ink text-paper text-[9px] uppercase tracking-[0.14em] px-2 py-1">Wearing</span>}
                    <span className="absolute inset-x-2 bottom-2 bg-paper/90 text-[10px] uppercase tracking-[0.14em] py-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">Try on</span>
                  </div>
                  <p className="text-[12px] mt-2 leading-snug">{p.name}</p>
                  <p className="text-[12px] text-stone">{formatINR(p.price)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// ───────────────────────── Look panel (right) ─────────────────────────
function LookPanel({ fit, data, refresh }: { fit: Record<string, FitReport | null>; data: StudioData | null; refresh: () => void }) {
  const { outfit, avatar, remove, setColor, setSize, outfitId, outfitName, setOutfitMeta, clearOutfit, avatarId } = useStudio();
  const [name, setName] = useState(outfitName);
  const [pending, start] = useTransition();
  const { openBag, toast } = useUI();
  useEffect(() => setName(outfitName), [outfitName]);
  const worn = SLOT_ORDER.map((k) => [k, outfit[k]] as const).filter((x): x is readonly [Slot, Worn] => !!x[1]?.product);
  const variantOf = (w: Worn) => w.product.variants.find((v) => v.color === w.color && v.size === w.size);
  const total = worn.reduce((sum, [, w]) => sum + (variantOf(w)?.price ?? w.product.price), 0);

  if (!worn.length) return <div className="p-6 text-[13px] text-stone">Pieces you try on appear here with sizes, fit notes and prices. Mix tops, bottoms, dresses, layers and accessories, and swap any piece without losing the rest of the look.</div>;

  return (
    <div className="p-5">
      <ul className="divide-y divide-line">
        {worn.map(([slot, w]) => {
          const v = variantOf(w);
          const f = fit[w.product.id];
          const sug = suggestSize(avatar, w.product.measurements, w.product.fit);
          const sizes = w.product.variants.filter((x) => x.color === w.color);
          return (
            <li key={slot} className="py-4 grid grid-cols-[64px_1fr] gap-3">
              <Link href={`/product/${w.product.slug}?color=${encodeURIComponent(w.color)}`} className="relative aspect-[3/4] bg-mist"><Image src={imgUrl(w.product.colours.find((c) => c.name === w.color)?.image ?? w.product.image, 160)} alt="" fill sizes="64px" className="object-cover" /></Link>
              <div className="min-w-0">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] text-stone">{SLOT_LABEL[slot]}</p><p className="text-[13px] leading-snug truncate">{w.product.name}</p></div>
                  <button onClick={() => remove(slot)} aria-label={`Remove ${w.product.name}`} className="text-stone hover:text-ink h-fit"><X size={14} /></button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {w.product.colours.map((c) => <button key={c.name} onClick={() => setColor(slot, c.name)} title={c.name} aria-label={c.name} aria-pressed={c.name === w.color} className={`w-5 h-5 rounded-full ring-offset-1 ring-offset-paper ${c.name === w.color ? "ring-1 ring-ink" : "ring-1 ring-ink/10"}`} style={{ background: c.hex }} />)}
                  {sizes.length > 1 && (
                    <select value={w.size} onChange={(e) => setSize(slot, e.target.value)} className="ml-auto border border-ink/15 h-7 text-[12px] px-1" aria-label="Size">
                      {sizes.map((x) => <option key={x.size} value={x.size} disabled={x.available <= 0}>{x.size}{x.available <= 0 ? " – sold out" : ""}</option>)}
                    </select>
                  )}
                </div>
                {f && (
                  <p className={`text-[11px] mt-2 ${f.status === "tight" ? "text-terracotta" : "text-stone"}`}>
                    Fit in {w.size}: <span className="capitalize">{f.status}</span> · ease bust {fmt(f.bust)} / waist {fmt(f.waist)} / hip {fmt(f.hip)} cm
                  </p>
                )}
                {sug && sug.size !== w.size && sizes.some((x) => x.size === sug.size) && (
                  <button onClick={() => setSize(slot, sug.size)} className="text-[11px] text-lavender mt-1 flex items-center gap-1"><Sparkles size={11} /> Fit Assistant suggests {sug.size}</button>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[13px]">{formatINR(v?.price ?? w.product.price)}</span>
                  <button disabled={!v || v.available <= 0 || pending} onClick={() => start(async () => { const r = await addToBagAction(v!.id); if (r.ok) openBag(); else toast(r.error, { tone: "error" }); })} className="text-[11px] uppercase tracking-[0.14em] link-u disabled:opacity-40">{v && v.available <= 0 ? "Sold out" : "Add to bag"}</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-ink pt-4 flex justify-between"><span className="text-[12px] uppercase tracking-[0.14em]">Look total</span><span>{formatINR(total)}</span></div>
      <button disabled={pending} className="btn-dark w-full mt-4" onClick={() => start(async () => {
        const ids = worn.map(([, w]) => variantOf(w)?.id).filter(Boolean) as string[];
        const r = await addOutfitAction(ids, name || "Studio look");
        if (r.errors.length) toast(r.errors[0], { tone: "error" });
        if (r.added) openBag();
      })}>Add entire look to bag</button>
      <div className="mt-6 border-t border-line pt-5">
        <p className="label">Save this look</p>
        <div className="flex gap-2 mt-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday dinner" className="field-box flex-1" aria-label="Look name" />
          <button disabled={pending} className="btn-outline px-4" onClick={() => start(async () => {
            const items = worn.map(([slot, w]) => ({ variantId: variantOf(w)?.id ?? "", slot })).filter((i) => i.variantId);
            const r = await saveOutfitAction({ id: outfitId ?? undefined, name: name || "Untitled look", avatarId, items });
            if (r.ok) { setOutfitMeta(r.id!, name || "Untitled look"); toast("Look saved to your wardrobe", { action: { label: "View", href: "/account/wardrobe" } }); refresh(); }
            else toast(r.error!, { tone: "error", action: data?.signedIn ? undefined : { label: "Sign in", href: "/account/login?next=/studio" } });
          })}>{outfitId ? "Update" : "Save"}</button>
        </div>
        {outfitId && <button className="text-[12px] link-u mt-2" onClick={() => setOutfitMeta(null, `${name} (copy)`)}>Save as a new look</button>}
        <button className="text-[12px] text-stone link-u mt-2 ml-4" onClick={clearOutfit}>Start a new look</button>
      </div>
    </div>
  );
}
const fmt = (n: number) => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);

// ───────────────────────── Saved panel ─────────────────────────
function SavedPanel({ data, refresh }: { data: StudioData | null; refresh: () => void }) {
  const { loadOutfit, outfitId } = useStudio();
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  if (!data) return <div className="p-6 text-[13px] text-stone">Loading…</div>;
  if (!data.signedIn) return <div className="p-6 text-[13px] text-stone"><Link href="/account/login?next=/studio" className="link-u text-ink">Sign in</Link> to save looks and reopen them later.</div>;
  if (!data.outfits.length) return <div className="p-6 text-[13px] text-stone">No saved looks yet. Style something and press <strong className="text-ink font-medium">Save</strong> in Your look.</div>;
  const open = async (o: (typeof data.outfits)[number]) => {
    const prods: StudioProduct[] = await fetch(`/api/studio/catalog?slugs=${o.items.map((i) => i.slug).join(",")}`).then((r) => r.json());
    loadOutfit(o.id, o.name, o.items.map((i) => ({ product: prods.find((p) => p.slug === i.slug)!, color: i.color, size: i.size })).filter((w) => w.product));
  };
  return (
    <div className="p-5">
      {compare.length === 2 && <button className="btn-dark w-full mb-4" onClick={() => setShowCompare(true)}>Compare 2 looks</button>}
      {compare.length === 1 && <p className="text-[12px] text-stone mb-4">Select one more look to compare.</p>}
      <ul className="space-y-4">
        {data.outfits.map((o) => (
          <li key={o.id} className={`border p-3 ${o.id === outfitId ? "border-ink" : "border-line"}`}>
            <div className="flex items-center justify-between gap-2">
              {editing === o.id ? (
                <form className="flex gap-1 flex-1" onSubmit={(e) => { e.preventDefault(); start(async () => { await renameOutfitAction(o.id, draft); setEditing(null); refresh(); }); }}>
                  <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="field-box h-8 flex-1" aria-label="New name" /><button className="text-[11px] link-u">OK</button>
                </form>
              ) : <p className="text-[14px] truncate">{o.name}</p>}
              <label className="text-[11px] flex items-center gap-1 shrink-0"><input type="checkbox" className="accent-ink" checked={compare.includes(o.id)} onChange={(e) => setCompare((c) => e.target.checked ? [...c, o.id].slice(-2) : c.filter((x) => x !== o.id))} />Compare</label>
            </div>
            <div className="flex gap-1.5 mt-2">{o.items.map((i) => <div key={i.variantId} className="relative w-10 aspect-[3/4] bg-mist"><Image src={imgUrl(i.image, 100)} alt={i.name} fill sizes="40px" className="object-cover" /></div>)}</div>
            <p className="text-[12px] text-stone mt-2">{formatINR(o.items.reduce((s, i) => s + i.price, 0))} · {o.items.length} pieces</p>
            <div className="flex gap-4 mt-2 text-[11px] uppercase tracking-[0.12em]">
              <button className="link-u" onClick={() => open(o)}>Open</button>
              <button className="link-u" onClick={() => { setEditing(o.id); setDraft(o.name); }}>Rename</button>
              <button className="link-u text-stone" disabled={pending} onClick={() => start(async () => { await deleteOutfitAction(o.id); refresh(); })}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {showCompare && <CompareModal outfits={data.outfits.filter((o) => compare.includes(o.id))} onClose={() => setShowCompare(false)} />}
    </div>
  );
}

function CompareModal({ outfits, onClose }: { outfits: { id: string; name: string; items: { slug: string; color: string; size: string; price: number; name: string }[] }[]; onClose: () => void }) {
  const avatar = useStudio((s) => s.avatar);
  const [prods, setProds] = useState<StudioProduct[] | null>(null);
  useEffect(() => {
    const slugs = [...new Set(outfits.flatMap((o) => o.items.map((i) => i.slug)))];
    fetch(`/api/studio/catalog?slugs=${slugs.join(",")}`).then((r) => r.json()).then(setProds);
  }, [outfits]);
  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col" role="dialog" aria-modal="true" aria-label="Compare looks">
      <div className="h-14 border-b border-line flex items-center justify-between px-5"><p className="font-serif text-xl">Compare looks</p><button onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {outfits.map((o) => {
          const specs = prods ? o.items.map((i) => { const p = prods.find((x) => x.slug === i.slug); return p ? toSpec({ product: p, color: i.color, size: i.size }) : null; }).filter(Boolean) : [];
          return (
            <div key={o.id} className="flex flex-col border-r border-line last:border-0 min-h-0">
              <div className="relative flex-1 bg-gradient-to-b from-[#ece8e4] to-[#d9d3cd]">{prods && <Stage config={avatar} garments={specs as never} />}</div>
              <div className="p-4"><p className="font-serif text-xl">{o.name}</p><p className="text-[13px] text-stone">{o.items.map((i) => i.name).join(" · ")}</p><p className="mt-1">{formatINR(o.items.reduce((s, i) => s + i.price, 0))}</p></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

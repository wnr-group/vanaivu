"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Upload, Loader2, AlertCircle, Trash2, Bookmark, RotateCcw, ShieldCheck } from "lucide-react";
import { formatINR, imgUrl } from "@/lib/format";

type P = { id: string; slug: string; name: string; price: number; image: string; type: string };
type R = { id: string; productId: string; status: string; error: string | null; saved: boolean; image?: string | null };
type S = { id: string; createdAt: string; deleteAfter: string | null; results: R[] };

export function PhotoTryOn({ providerLabel, products, sessions, initialProduct }: { providerLabel: string | null; products: P[]; sessions: S[]; initialProduct?: string }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [consent, setConsent] = useState(false);
  const [retention, setRetention] = useState("30");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(products.find((p) => p.slug === initialProduct)?.id ?? null);
  const [results, setResults] = useState<R[]>(sessions[0]?.results ?? []);
  const [active, setActive] = useState<R | null>(null);
  const [split, setSplit] = useState(50);

  const session = sessions.find((s) => s.id === sessionId);
  useEffect(() => { setResults(session?.results ?? []); }, [session]);

  // poll processing results
  useEffect(() => {
    const pending = results.filter((r) => r.status === "QUEUED" || r.status === "PROCESSING");
    if (!pending.length) return;
    const t = setInterval(async () => {
      const updates = await Promise.all(pending.map((r) => fetch(`/api/tryon/${r.id}`).then((x) => x.json()).catch(() => null)));
      setResults((rs) => rs.map((r) => { const u = updates.find((x) => x?.id === r.id); return u ? { ...r, status: u.status, error: u.error, image: u.image } : r; }));
      setActive((a) => { const u = a && updates.find((x) => x?.id === a.id); return u ? { ...a, status: u.status, error: u.error, image: u.image } : a; });
    }, 2500);
    return () => clearInterval(t);
  }, [results]);

  const upload = (file: File) => {
    setError(null);
    if (!consent) { setError("Please confirm consent first."); return; }
    const fd = new FormData();
    fd.append("photo", file); fd.append("consent", "yes"); fd.append("retention", retention);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tryon");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      const j = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 400) { setError(j.error ?? "Upload failed."); return; }
      setSessionId(j.sessionId); setResults([]); router.refresh();
    };
    xhr.onerror = () => { setProgress(null); setError("Upload failed. Check your connection and retry."); };
    xhr.send(fd);
  };

  const generate = async (productId: string) => {
    if (!sessionId) return;
    setError(null);
    const res = await fetch("/api/tryon/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, productId }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error ?? "Could not start generation."); return; }
    const r: R = { id: j.resultId, productId, status: "PROCESSING", error: null, saved: false };
    setResults((rs) => [r, ...rs]); setActive(r);
  };

  const remove = async () => {
    if (!sessionId || !confirm("Delete this photo and every image generated from it? This cannot be undone.")) return;
    await fetch(`/api/tryon?session=${sessionId}`, { method: "DELETE" });
    setSessionId(null); setResults([]); setActive(null); router.refresh();
  };

  const prod = (id: string) => products.find((p) => p.id === id);

  return (
    <div className="mt-12 grid lg:grid-cols-[1fr_1.2fr] gap-12">
      <div>
        {!providerLabel && (
          <p className="mb-6 bg-mist/70 px-4 py-3 text-[13px] flex gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> Photo try-on is not connected to an AI provider on this store yet, so images can&apos;t be generated. Set <code>TRYON_API_KEY</code> to enable it. You can still upload and manage photos.</p>
        )}
        {!sessionId ? (
          <div>
            <p className="font-serif text-2xl">1. Upload a full-body photo</p>
            <p className="text-[13px] text-stone mt-2">Stand facing the camera, arms slightly away from your body, in fitted clothing and good light.</p>
            <label className="mt-6 flex items-start gap-3 text-[13px]"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-ink mt-0.5" />
              <span>I am the person in this photo (or have their permission) and consent to VESTRA sending it to {providerLabel ?? "our try-on provider"} to generate previews. Photos are never used for advertising.</span></label>
            <label className="mt-4 flex items-center gap-3 text-[13px]">Automatically delete after
              <select value={retention} onChange={(e) => setRetention(e.target.value)} className="field-box w-28 h-9"><option value="7">7 days</option><option value="30">30 days</option></select>
            </label>
            <label className={`mt-6 flex flex-col items-center justify-center gap-3 aspect-[4/3] border border-dashed ${consent ? "border-ink cursor-pointer hover:bg-mist/40" : "border-ink/20 opacity-50"}`}>
              <Upload size={22} strokeWidth={1.3} /><span className="text-[13px]">{progress !== null ? `Uploading… ${progress}%` : "Choose a JPG, PNG or WebP (max 8 MB)"}</span>
              {progress !== null && <span className="w-1/2 h-0.5 bg-line"><span className="block h-full bg-ink" style={{ width: `${progress}%` }} /></span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!consent || progress !== null} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-baseline">
              <p className="font-serif text-2xl">Your photo</p>
              <div className="flex gap-4 text-[12px]"><button onClick={() => setSessionId(null)} className="link-u">Use another photo</button><button onClick={remove} className="link-u text-terracotta flex items-center gap-1"><Trash2 size={12} />Delete</button></div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/tryon/${sessionId}?photo=1`} alt="Your uploaded photo" className="mt-4 w-full max-h-[440px] object-contain bg-mist" />
            {session?.deleteAfter && <p className="text-[12px] text-stone mt-2 flex items-center gap-1.5"><ShieldCheck size={13} /> Private to you · auto-deletes {new Date(session.deleteAfter).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
          </div>
        )}
        {error && <p className="mt-4 text-[13px] text-terracotta" role="alert">{error}</p>}
        {sessions.length > 1 && (
          <div className="mt-8"><p className="label">Previous photos</p>
            <div className="flex gap-2 mt-2">{sessions.map((s) => <button key={s.id} onClick={() => setSessionId(s.id)} className={`text-[12px] px-3 h-8 border ${s.id === sessionId ? "border-ink" : "border-line"}`}>{new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</button>)}</div>
          </div>
        )}
      </div>

      <div>
        {active ? (
          <div>
            <div className="flex justify-between items-baseline"><p className="font-serif text-2xl">{prod(active.productId)?.name}</p><button onClick={() => setActive(null)} className="text-[12px] link-u">Back to pieces</button></div>
            <div className="relative mt-4 aspect-[3/4] bg-mist overflow-hidden select-none">
              {active.status === "SUCCEEDED" && active.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={active.image} alt="AI-generated try-on" className="absolute inset-0 w-full h-full object-contain" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/tryon/${sessionId}?photo=1`} alt="Original photo" className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
                  <div className="absolute inset-y-0 w-px bg-paper" style={{ left: `${split}%` }} />
                  <span className="absolute top-3 left-3 bg-paper/90 text-[10px] uppercase tracking-[0.14em] px-2 py-1">Original</span>
                  <span className="absolute top-3 right-3 bg-ink text-paper text-[10px] uppercase tracking-[0.14em] px-2 py-1">AI generated</span>
                  <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Compare original and generated" className="absolute bottom-4 inset-x-6 accent-ink" />
                </>
              ) : active.status === "FAILED" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"><AlertCircle /><p className="mt-3 text-[14px]">Generation failed</p><p className="text-[12px] text-stone mt-1">{active.error}</p><button onClick={() => generate(active.productId)} className="btn-outline mt-5"><RotateCcw size={14} /> Retry</button></div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center"><Loader2 className="animate-spin" /><p className="text-[13px] mt-3">{active.status === "QUEUED" ? "Queued…" : "Generating your preview…"}</p><p className="text-[11px] text-stone mt-1">This usually takes 10–40 seconds.</p></div>
              )}
            </div>
            {active.status === "SUCCEEDED" && (
              <div className="flex gap-2 mt-4">
                <button className="btn-outline flex-1" onClick={async () => { await fetch(`/api/tryon/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saved: !active.saved }) }); setActive({ ...active, saved: !active.saved }); setResults((rs) => rs.map((r) => r.id === active.id ? { ...r, saved: !r.saved } : r)); }}><Bookmark size={14} className={active.saved ? "fill-ink" : ""} />{active.saved ? "Saved" : "Save look"}</button>
                <Link href={`/product/${prod(active.productId)?.slug}`} className="btn-dark flex-1">Shop this piece</Link>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="font-serif text-2xl">2. Choose a piece</p>
            {selected && sessionId && providerLabel && <button className="btn-dark mt-4" onClick={() => generate(selected)}>Generate try-on</button>}
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-5 max-h-[520px] overflow-y-auto pr-1">
              {products.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setSelected(p.id)} className={`w-full text-left ${selected === p.id ? "outline outline-1 outline-ink outline-offset-2" : ""}`} aria-pressed={selected === p.id}>
                    <div className="relative aspect-[3/4] bg-mist"><Image src={imgUrl(p.image, 240)} alt="" fill sizes="120px" className="object-cover" /></div>
                    <p className="text-[11px] mt-1.5 leading-tight">{p.name}</p><p className="text-[11px] text-stone">{formatINR(p.price)}</p>
                  </button>
                </li>
              ))}
            </ul>
            {results.length > 0 && (
              <div className="mt-8"><p className="label">Your generated looks</p>
                <ul className="grid grid-cols-4 gap-3 mt-2">
                  {results.map((r) => (
                    <li key={r.id}><button onClick={() => setActive({ ...r, image: r.status === "SUCCEEDED" ? `/api/tryon/${r.id}?image=1` : null })} className="w-full text-left text-[11px]">
                      <div className="relative aspect-[3/4] bg-mist flex items-center justify-center">
                        {r.status === "SUCCEEDED" ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/tryon/${r.id}?image=1`} alt="" className="absolute inset-0 w-full h-full object-cover" /></> : r.status === "FAILED" ? <AlertCircle size={16} /> : <Loader2 size={16} className="animate-spin" />}
                        {r.saved && <Bookmark size={12} className="absolute top-1 right-1 fill-ink" />}
                      </div>
                      <p className="mt-1 truncate">{prod(r.productId)?.name}</p></button></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

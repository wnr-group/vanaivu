"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { askStylistAction, type StylistLook } from "@/app/actions/stylist";
import { addOutfitAction } from "@/app/actions/cart";
import { ProductCard } from "@/components/product/ProductCard";
import { formatINR } from "@/lib/format";
import { useUI } from "@/lib/ui-store";

type Msg = { role: "user" | "assistant"; text: string; looks?: StylistLook[]; provider?: string };
const PROMPTS = ["What should I wear for a wedding?", "Suggest an outfit for a casual dinner", "Create an office look", "Build an outfit under ₹3,000", "Suggest a summer wardrobe", "Something based on my existing wardrobe"];

export function StylistChat({ aiEnabled }: { aiEnabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [convo, setConvo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pending]);

  const send = (text: string) => {
    if (!text.trim() || pending) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    start(async () => {
      const r = await askStylistAction(convo, text);
      if (!r.ok) { setMsgs((m) => [...m, { role: "assistant", text: r.error }]); return; }
      setConvo(r.conversationId);
      setMsgs((m) => [...m, { role: "assistant", text: r.text, looks: r.looks, provider: r.provider }]);
    });
  };

  return (
    <div className="mt-12">
      {!aiEnabled && <p className="text-[12px] text-stone bg-mist/70 px-4 py-3 mb-6">AI model not configured: answers come from VANAIVU&apos;s rule-based recommender over the live catalogue. Add an Anthropic API key to enable the AI stylist.</p>}
      <div className="space-y-10" aria-live="polite">
        {msgs.map((m, i) => m.role === "user" ? (
          <p key={i} className="ml-auto max-w-md bg-ink text-paper px-5 py-3 text-[14px] w-fit">{m.text}</p>
        ) : (
          <div key={i}>
            <p className="font-serif text-xl leading-relaxed max-w-2xl flex gap-3"><Sparkles size={18} className="text-lavender shrink-0 mt-1.5" />{m.text}</p>
            {m.looks?.map((l, j) => <LookRow key={j} look={l} />)}
          </div>
        ))}
        {pending && <p className="text-stone text-[14px] flex items-center gap-2"><Sparkles size={15} className="animate-pulse text-lavender" /> Styling from the catalogue…</p>}
        <div ref={end} />
      </div>
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="px-4 h-10 border border-ink/15 text-[13px] hover:border-ink transition-colors">{p}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-4 mt-10 flex items-center gap-3 bg-paper border border-ink px-5 shadow-sm">
        <label htmlFor="ask" className="sr-only">Ask the stylist</label>
        <input id="ask" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. A sangeet look in jewel tones under ₹8,000" className="flex-1 h-14 outline-none text-[15px]" maxLength={600} />
        <button disabled={pending || !input.trim()} aria-label="Send" className="w-9 h-9 bg-ink text-paper flex items-center justify-center disabled:opacity-30"><ArrowUp size={16} /></button>
      </form>
    </div>
  );
}

function LookRow({ look }: { look: StylistLook }) {
  const [pending, start] = useTransition();
  const { openBag, toast } = useUI();
  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div><h3 className="font-serif text-2xl">{look.title}</h3><p className="text-stone text-[14px] mt-1 max-w-xl">{look.note}</p></div>
        <div className="flex gap-2 items-center">
          <span className="text-[14px] mr-2">{formatINR(look.total)}</span>
          <Link href={`/studio?products=${look.products.map((p) => p.slug).join(",")}`} className="btn-outline h-10 px-4">Try on</Link>
          <button disabled={pending} className="btn-dark h-10 px-4" onClick={() => start(async () => {
            const ids = look.products.map((p) => p.quickAdd.find((v) => v.size === "M")?.variantId ?? p.quickAdd[0]?.variantId).filter(Boolean) as string[];
            const r = await addOutfitAction(ids, look.title);
            if (r.errors.length) toast(r.errors[0], { tone: "error" });
            if (r.added) { openBag(); toast("Added in size M where available. Adjust sizes in your bag."); }
          })}>Add look</button>
        </div>
      </div>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">{look.products.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul>
    </section>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addOutfitAction } from "@/app/actions/cart";
import { deleteOutfitAction, renameOutfitAction } from "@/app/actions/studio";
import { useUI } from "@/lib/ui-store";

export function LookActions({ outfitId, name, variantIds, soldOut }: { outfitId: string; name: string; variantIds: string[]; soldOut: boolean }) {
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const { openBag, toast } = useUI();
  const router = useRouter();
  const share = async () => {
    const url = `${location.origin}/look/${outfitId}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); toast("Share link copied"); }
    } catch { /* cancelled */ }
  };
  return (
    <div className="mt-5">
      {renaming ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { await renameOutfitAction(outfitId, draft); setRenaming(false); router.refresh(); }); }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className="field-box flex-1 h-9" aria-label="Look name" autoFocus /><button className="btn-dark h-9 px-4">Save</button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.14em]">
          <Link href={`/studio?outfit=${outfitId}`} className="link-u">Open in Studio</Link>
          <button className="link-u" disabled={pending} onClick={() => start(async () => {
            const r = await addOutfitAction(variantIds, name);
            if (r.errors.length) toast(r.errors[0], { tone: "error" });
            if (r.added) openBag();
          })}>Add look to bag{soldOut ? " (some sold out)" : ""}</button>
          <button className="link-u" onClick={share}>Share</button>
          <button className="link-u" onClick={() => setRenaming(true)}>Rename</button>
          <button className="link-u text-stone" disabled={pending} onClick={() => { if (confirm(`Delete "${name}"?`)) start(async () => { await deleteOutfitAction(outfitId); router.refresh(); }); }}>Delete</button>
        </div>
      )}
    </div>
  );
}

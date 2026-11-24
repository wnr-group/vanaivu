"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { useUI } from "@/lib/ui-store";

export function Toaster() {
  const { toasts, dismiss } = useUI();
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-fade-up flex items-center gap-4 px-5 py-3.5 text-[13px] shadow-lg ${t.tone === "error" ? "bg-terracotta text-paper" : "bg-ink text-paper"}`}>
          <p className="flex-1">{t.message}</p>
          {t.action && <Link href={t.action.href} className="eyebrow underline underline-offset-4" onClick={() => dismiss(t.id)}>{t.action.label}</Link>}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

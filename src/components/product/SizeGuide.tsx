"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export function SizeGuide({ open, onClose, measurements, fit, suggested }: {
  open: boolean; onClose: () => void; measurements: Record<string, { bust: number; waist: number; hip: number; length: number }>; fit: string; suggested?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  const sizes = Object.keys(measurements);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="absolute inset-0 bg-ink/40 animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-paper h-full overflow-y-auto animate-slide-in p-6 sm:p-10">
        <button onClick={onClose} className="absolute top-5 right-5 p-2" aria-label="Close"><X size={20} strokeWidth={1.4} /></button>
        <p className="eyebrow text-stone">Size guide</p>
        <h2 className="font-serif text-3xl mt-2">Garment measurements</h2>
        <p className="text-[13px] text-stone mt-3 leading-relaxed">Measured flat on the garment and doubled, in centimetres. This piece has a <strong className="text-ink font-medium">{fit.toLowerCase()}</strong> fit.</p>
        {sizes.length ? (
          <table className="w-full mt-8 text-[13px]">
            <thead><tr className="border-b border-ink text-left"><th className="py-2 font-medium">Size</th><th className="font-medium">Bust</th><th className="font-medium">Waist</th><th className="font-medium">Hip</th><th className="font-medium">Length</th></tr></thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s} className={`border-b border-line ${s === suggested ? "bg-mauve/20" : ""}`}>
                  <td className="py-3">{s}{s === suggested && <span className="ml-2 text-[10px] uppercase tracking-wider text-lavender">Your size</span>}</td>
                  <td>{measurements[s].bust}</td><td>{measurements[s].waist}</td><td>{measurements[s].hip}</td><td>{measurements[s].length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mt-8 text-sm">One size. See the product details for dimensions.</p>}
        <h3 className="font-serif text-xl mt-10">How to measure</h3>
        <dl className="mt-4 space-y-3 text-[13px] text-stone">
          <div><dt className="text-ink">Bust</dt><dd>Around the fullest part of your bust, keeping the tape level.</dd></div>
          <div><dt className="text-ink">Waist</dt><dd>Around your natural waist, the narrowest part of your torso.</dd></div>
          <div><dt className="text-ink">Hip</dt><dd>Around the fullest part of your hips, feet together.</dd></div>
        </dl>
        <p className="text-[12px] text-stone mt-8">Size suggestions are guidance based on garment measurements and your saved body measurements. They are not a guarantee of fit.</p>
      </div>
    </div>
  );
}

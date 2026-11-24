import type { PdpData } from "@/lib/pdp";

export function Details({ p }: { p: PdpData }) {
  const sizes = Object.keys(p.measurements);
  const rows: [string, React.ReactNode, boolean?][] = [
    ["Description", <p key="d" className="leading-relaxed">{p.description}</p>, true],
    ["Fabric & composition", <dl key="f" className="grid grid-cols-[140px_1fr] gap-y-2"><dt className="text-stone">Material</dt><dd>{p.material}</dd><dt className="text-stone">Composition</dt><dd>{p.composition}</dd><dt className="text-stone">Brand</dt><dd>{p.brand}</dd></dl>],
    ["Fit & model", <div key="m" className="space-y-2"><p><span className="text-stone">Fit:</span> {p.fit}. {p.fit === "Slim" ? "Close to the body. Size up for a relaxed feel." : p.fit === "Oversized" ? "Cut generously. Size down for a closer fit." : "True to size."}</p>{p.modelInfo && <p><span className="text-stone">Model:</span> {p.modelInfo}</p>}<p><span className="text-stone">Occasion:</span> {p.occasion}</p></div>],
    ...(sizes.length ? [["Measurements", (
      <table key="t" className="w-full text-[13px]"><thead><tr className="text-left text-stone"><th className="font-normal pb-2">Size</th><th className="font-normal">Bust</th><th className="font-normal">Waist</th><th className="font-normal">Hip</th><th className="font-normal">Length</th></tr></thead>
        <tbody>{sizes.map((s) => <tr key={s} className="border-t border-line"><td className="py-2">{s}</td><td>{p.measurements[s].bust}</td><td>{p.measurements[s].waist}</td><td>{p.measurements[s].hip}</td><td>{p.measurements[s].length}</td></tr>)}</tbody>
        <caption className="caption-bottom text-left text-[11px] text-stone pt-2">Garment measurements in cm.</caption></table>
    )] as [string, React.ReactNode]] : []),
    ["Care", <p key="c">{p.care}</p>],
    ["Delivery & returns", <p key="r" className="leading-relaxed">Complimentary standard delivery on orders above ₹2,499 (3–5 working days). Express delivery in 1–2 days for ₹249. Free returns within 15 days of delivery; items must be unworn with tags attached.</p>],
  ];
  return (
    <div className="border-t border-ink">
      {rows.map(([t, body, open]) => (
        <details key={t} open={open} className="group border-b border-line">
          <summary className="flex justify-between items-center py-5 cursor-pointer list-none text-[12px] uppercase tracking-[0.16em]">
            {t}<span className="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <div className="pb-6 text-[14px]">{body}</div>
        </details>
      ))}
    </div>
  );
}

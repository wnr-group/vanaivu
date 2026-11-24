const STEPS = [
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKED", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

export function OrderTimeline({ status, events, eta, tracking }: { status: string; events: { status: string; at: string; note: string }[]; eta: string | null; tracking: string | null }) {
  if (status === "CANCELLED" || status === "RETURNED" || status === "PENDING")
    return (
      <div className="bg-mist/70 p-5 text-[14px]">
        <p className="font-medium">{status === "CANCELLED" ? "This order was cancelled" : status === "RETURNED" ? "This order was returned" : "Awaiting payment"}</p>
        <p className="text-stone text-[13px] mt-1">{status === "CANCELLED" ? "Any payment captured is refunded to the original method within 5–7 working days." : status === "RETURNED" ? "Your refund has been initiated." : "Complete payment to confirm this order."}</p>
      </div>
    );
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div>
      <ol className="grid grid-cols-4" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="relative">
            <div className={`h-0.5 ${i <= idx ? "bg-ink" : "bg-line"}`} />
            <span className={`absolute -top-[5px] left-0 w-3 h-3 rounded-full ${i <= idx ? "bg-ink" : "bg-paper border border-line"}`} />
            <p className={`mt-4 text-[12px] uppercase tracking-[0.12em] ${i <= idx ? "text-ink" : "text-stone"}`} aria-current={i === idx ? "step" : undefined}>{s.label}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 text-[13px] text-stone flex flex-wrap gap-x-6 gap-y-1">
        {eta && status !== "DELIVERED" && <p>Estimated delivery: <span className="text-ink">{new Date(eta).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span></p>}
        {tracking && <p>Tracking: <span className="text-ink">{tracking}</span></p>}
      </div>
      {events.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-[12px] text-stone">
          {[...events].reverse().map((e, i) => <li key={i}>{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.note}</li>)}
        </ul>
      )}
    </div>
  );
}

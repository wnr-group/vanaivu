"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelOrderAction, requestReturnAction } from "@/app/actions/account";

const REASONS = ["Doesn't fit", "Not as pictured", "Quality not as expected", "Changed my mind", "Received wrong item"];

export function OrderActions({ orderId, status, hasReturn, invoiceHref }: { orderId: string; status: string; hasReturn: boolean; invoiceHref: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const canCancel = ["PENDING", "CONFIRMED", "PACKED"].includes(status);
  const canReturn = status === "DELIVERED" && !hasReturn;
  return (
    <div className="mt-12 border-t border-line pt-8">
      <div className="flex flex-wrap gap-3">
        <Link href={invoiceHref} className="btn-outline" target="_blank">Download invoice</Link>
        {canCancel && <button disabled={pending} className="btn-outline" onClick={() => { if (confirm("Cancel this order? Any payment will be refunded.")) start(async () => { const r = await cancelOrderAction(orderId); setMsg(r.ok ? "Order cancelled." : r.error ?? null); }); }}>Cancel order</button>}
        {canReturn && !returning && <button className="btn-outline" onClick={() => setReturning(true)}>Request a return</button>}
        <Link href="/help/contact" className="btn-outline">Get help</Link>
      </div>
      {returning && (
        <div className="mt-6 max-w-md">
          <label className="label" htmlFor="reason">Reason for return</label>
          <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="field-box">{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          <button disabled={pending} className="btn-dark mt-4" onClick={() => start(async () => { const r = await requestReturnAction(orderId, reason); setMsg(r.ok ? "Return requested. We'll email pickup details." : r.error ?? null); setReturning(false); })}>Submit return</button>
        </div>
      )}
      {msg && <p className="text-[13px] mt-4" role="status">{msg}</p>}
    </div>
  );
}

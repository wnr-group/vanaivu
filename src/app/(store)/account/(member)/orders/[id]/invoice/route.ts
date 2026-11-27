import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/format";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Printable HTML invoice (use the browser's Print → Save as PDF). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const o = await db.order.findFirst({ where: { id, ...(s.role === "ADMIN" ? {} : { userId: s.userId }) }, include: { items: true } });
  if (!o) return new NextResponse("Not found", { status: 404 });
  const a = parseJSON<Record<string, string>>(o.shippingAddress, {});
  const gst = Math.round(o.total - o.total / 1.12);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.number)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#100c0c;max-width:760px;margin:40px auto;padding:0 20px}h1{font:400 32px Georgia,serif;letter-spacing:.3em}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px 0;border-bottom:1px solid #ddd;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#62615f}.r{text-align:right}.tot td{border:0;padding:4px 0}.muted{color:#62615f}@media print{button{display:none}}</style></head>
<body><button onclick="print()" style="float:right;padding:8px 16px">Print / Save PDF</button><img src="/brand/vanaivu-logo.png" alt="" width="96" height="96"><h1>VANAIVU</h1>
<p class="muted">Tax invoice · ${esc(o.number)} · ${o.createdAt.toLocaleDateString("en-IN")}</p>
<p><strong>Billed to</strong><br>${esc(a.fullName ?? "")}<br>${esc(a.line1 ?? "")}${a.line2 ? ", " + esc(a.line2) : ""}<br>${esc(a.city ?? "")}, ${esc(a.state ?? "")} ${esc(a.pincode ?? "")}<br>${esc(o.email)}</p>
<table><thead><tr><th>Item</th><th>Variant</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead><tbody>
${o.items.map((i) => `<tr><td>${esc(i.productName)}</td><td>${esc(i.color)} / ${esc(i.size)}</td><td class="r">${i.quantity}</td><td class="r">${inr(i.unitPrice * i.quantity)}</td></tr>`).join("")}
</tbody></table><table class="tot"><tr><td>Subtotal</td><td class="r">${inr(o.subtotal)}</td></tr>${o.discount ? `<tr><td>Discount ${esc(o.couponCode ?? "")}</td><td class="r">−${inr(o.discount)}</td></tr>` : ""}
<tr><td>Shipping</td><td class="r">${inr(o.shippingFee)}</td></tr><tr><td><strong>Total (incl. GST)</strong></td><td class="r"><strong>${inr(o.total)}</strong></td></tr><tr><td class="muted">of which GST @12% (indicative)</td><td class="r muted">${inr(gst)}</td></tr></table>
<p class="muted" style="margin-top:40px;font-size:12px">This is a computer-generated invoice.</p></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/admin", "Dashboard"], ["/admin/products", "Products"], ["/admin/collections", "Collections"], ["/admin/orders", "Orders"], ["/admin/customers", "Customers"], ["/admin/content", "Content"]];

export function AdminNav() {
  const p = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 text-[13px]" aria-label="Admin">
      {LINKS.map(([h, l]) => {
        const on = h === "/admin" ? p === h : p.startsWith(h);
        return <Link key={h} href={h} aria-current={on ? "page" : undefined} className={`px-3 py-2 whitespace-nowrap ${on ? "bg-paper/10 text-paper" : "text-paper/60 hover:text-paper"}`}>{l}</Link>;
      })}
    </nav>
  );
}

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white border border-line p-5 lg:p-6">
      {(title || action) && <div className="flex justify-between items-center mb-4">{title && <h2 className="text-[12px] uppercase tracking-[0.14em] text-stone">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

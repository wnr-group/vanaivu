import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | VANAIVU Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr] bg-[#f7f6f4]">
      <aside className="bg-ink text-paper lg:min-h-dvh p-5 lg:p-6 flex lg:flex-col gap-6 lg:sticky lg:top-0 lg:h-dvh overflow-x-auto">
        <Link href="/admin" className="shrink-0"><Logo className="text-lg" /><span className="block text-[10px] tracking-[0.2em] text-paper/50 mt-2">ADMIN</span></Link>
        <AdminNav />
        <div className="hidden lg:block mt-auto text-[12px] text-paper/50">
          <p>{s.email}</p>
          <Link href="/" className="text-paper/80 hover:text-paper mt-2 inline-block">View store →</Link>
        </div>
      </aside>
      <main className="p-5 lg:p-10 min-w-0">{children}</main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

const LINKS = [
  ["/account", "Overview"], ["/account/wardrobe", "My Wardrobe"], ["/account/wishlist", "Wishlist"], ["/account/orders", "Orders & returns"],
  ["/account/profile", "Profile & measurements"], ["/account/addresses", "Address book"], ["/studio", "Virtual Studio"], ["/stylist", "AI Stylist"],
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="flex lg:flex-col gap-x-5 gap-y-3 overflow-x-auto no-scrollbar text-[14px] whitespace-nowrap border-b lg:border-0 border-line pb-4 lg:pb-0">
      {LINKS.map(([h, l]) => {
        const active = h === "/account" ? path === h : path.startsWith(h);
        return <Link key={h} href={h} className={active ? "text-ink underline underline-offset-[6px]" : "text-stone hover:text-ink"} aria-current={active ? "page" : undefined}>{l}</Link>;
      })}
      {isAdmin && <Link href="/admin" className="text-lavender">Admin dashboard</Link>}
      <form action={logoutAction}><button className="text-stone hover:text-ink lg:mt-6">Sign out</button></form>
    </nav>
  );
}

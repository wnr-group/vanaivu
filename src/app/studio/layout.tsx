import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { BagDrawer } from "@/components/layout/BagDrawer";
import { Toaster } from "@/components/layout/Toaster";
import { BagButton } from "@/components/studio/BagButton";
import { Logo } from "@/components/brand/Logo";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="h-14 border-b border-line flex items-center justify-between px-4 lg:px-6 bg-paper relative z-30">
        <div className="flex items-center gap-5">
          <Link href="/" aria-label="VANAIVU home"><Logo className="text-lg" /></Link>
          <span className="hidden sm:block h-5 w-px bg-line" />
          <nav className="hidden sm:flex gap-5 text-[11px] uppercase tracking-[0.16em]">
            <Link href="/studio" className="text-ink">3D Studio</Link>
            <Link href="/studio/photo" className="text-stone hover:text-ink">Photo try-on</Link>
            <Link href="/stylist" className="text-stone hover:text-ink">AI Stylist</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.16em]">
          <Link href="/shop/new-in" className="hidden sm:block text-stone hover:text-ink">Back to shop</Link>
          <Link href="/account/wardrobe" className="hidden sm:block text-stone hover:text-ink">Wardrobe</Link>
          <BagButton icon={<ShoppingBag size={18} strokeWidth={1.4} />} />
        </div>
      </header>
      {children}
      <BagDrawer />
      <Toaster />
    </div>
  );
}

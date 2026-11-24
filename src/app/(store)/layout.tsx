import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Announcement } from "@/components/layout/Announcement";
import { BagDrawer } from "@/components/layout/BagDrawer";
import { QuickView } from "@/components/product/QuickView";
import { Toaster } from "@/components/layout/Toaster";
import { db } from "@/lib/db";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const messages = await db.campaign.findMany({ where: { placement: "ANNOUNCEMENT", active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-ink focus:text-paper focus:px-4 focus:py-2">Skip to content</a>
      <Announcement messages={messages.map((m) => ({ text: m.title, href: m.ctaHref }))} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <BagDrawer />
      <QuickView />
      <Toaster />
    </>
  );
}

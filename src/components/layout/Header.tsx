import { getSession } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { getNavData } from "@/lib/catalog";
import { db } from "@/lib/db";
import { HeaderClient, type NavData } from "./HeaderClient";

export async function Header() {
  const [session, count, nav] = await Promise.all([getSession(), cartCount(), getNavData()]);
  const wishCount = session ? await db.wishlistItem.count({ where: { wishlist: { userId: session.userId } } }) : 0;
  const data: NavData = {
    categories: nav.categories.map((c) => ({ slug: c.slug, name: c.name, image: c.image ?? "" })),
    collections: nav.collections.map((c) => ({ slug: c.slug, name: c.name, image: c.image, tagline: c.tagline })),
  };
  return <HeaderClient nav={data} bagCount={count} wishCount={wishCount} user={session ? { name: session.name ?? "", role: session.role } : null} />;
}

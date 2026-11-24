import type { ProductCard as Card } from "@/lib/catalog";
import { getWishlistIds } from "@/app/actions/wishlist";
import { ProductCard } from "./ProductCard";

export async function ProductGrid({ products, cols = 4, priorityCount = 0 }: { products: Card[]; cols?: 3 | 4; priorityCount?: number }) {
  const wl = new Set(await getWishlistIds());
  return (
    <ul className={`grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((p, i) => (
        <li key={p.id}><ProductCard p={p} wishlisted={wl.has(p.id)} priority={i < priorityCount} /></li>
      ))}
    </ul>
  );
}

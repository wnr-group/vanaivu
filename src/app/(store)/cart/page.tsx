import type { Metadata } from "next";
import { currentCart, summarize } from "@/lib/cart";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Your bag" };

export default async function CartPage() {
  const summary = await summarize(await currentCart());
  return (
    <div className="container-x pt-10 lg:pt-16">
      <h1 className="display text-[56px] lg:text-[88px]">Your bag</h1>
      <CartView initial={summary} />
    </div>
  );
}

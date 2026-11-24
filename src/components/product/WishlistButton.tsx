"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/app/actions/wishlist";
import { useUI } from "@/lib/ui-store";

export function WishlistButton({ productId, initial, className = "", variant = "icon" }: { productId: string; initial: boolean; className?: string; variant?: "icon" | "button" }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const { toast } = useUI();
  const router = useRouter();
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      const r = await toggleWishlistAction(productId);
      if (!r.ok) {
        setSaved(prev);
        if (r.needsLogin) { toast("Sign in to save pieces to your wishlist.", { action: { label: "Sign in", href: `/account/login?next=${encodeURIComponent(location.pathname)}` } }); }
        return;
      }
      setSaved(r.saved);
      toast(r.saved ? "Saved to your wishlist" : "Removed from your wishlist", r.saved ? { action: { label: "View", href: "/account/wishlist" } } : undefined);
      router.refresh();
    });
  };
  if (variant === "button")
    return (
      <button onClick={click} disabled={pending} aria-pressed={saved} className={`btn-outline w-full ${className}`}>
        <Heart size={15} strokeWidth={1.5} className={saved ? "fill-terracotta stroke-terracotta" : ""} /> {saved ? "Saved" : "Wishlist"}
      </button>
    );
  return (
    <button onClick={click} disabled={pending} aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={`p-2 rounded-full hover:bg-paper/70 transition-colors ${className}`}>
      <Heart size={17} strokeWidth={1.4} className={`transition-all ${saved ? "fill-terracotta stroke-terracotta scale-110" : ""}`} />
    </button>
  );
}

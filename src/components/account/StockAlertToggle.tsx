"use client";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { setStockAlertAction } from "@/app/actions/wishlist";

export function StockAlertToggle({ itemId, initial }: { itemId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  return (
    <button onClick={() => { setOn(!on); start(() => setStockAlertAction(itemId, !on).then(() => {})); }} aria-pressed={on}
      className={`mt-2 flex items-center gap-1.5 text-[12px] ${on ? "text-lavender" : "text-stone hover:text-ink"}`}>
      <Bell size={13} className={on ? "fill-lavender" : ""} /> {on ? "We'll notify you when sizes are back" : "Notify me about restocks"}
    </button>
  );
}

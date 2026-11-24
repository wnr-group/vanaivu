"use client";
import { useUI } from "@/lib/ui-store";

export function BagButton({ icon }: { icon: React.ReactNode }) {
  const openBag = useUI((s) => s.openBag);
  return <button onClick={openBag} className="p-2 -mr-2" aria-label="Open shopping bag">{icon}</button>;
}

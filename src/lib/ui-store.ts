"use client";
import { create } from "zustand";

type Toast = { id: number; message: string; tone?: "default" | "error"; action?: { label: string; href: string } };

type UI = {
  bagOpen: boolean; searchOpen: boolean; menuOpen: boolean; quickView: string | null;
  bagVersion: number; toasts: Toast[];
  openBag: () => void; closeBag: () => void; bumpBag: () => void;
  setSearch: (v: boolean) => void; setMenu: (v: boolean) => void; setQuickView: (slug: string | null) => void;
  toast: (message: string, opts?: Omit<Toast, "id" | "message">) => void; dismiss: (id: number) => void;
};

export const useUI = create<UI>((set) => ({
  bagOpen: false, searchOpen: false, menuOpen: false, quickView: null, bagVersion: 0, toasts: [],
  openBag: () => set((s) => ({ bagOpen: true, bagVersion: s.bagVersion + 1 })),
  closeBag: () => set({ bagOpen: false }),
  bumpBag: () => set((s) => ({ bagVersion: s.bagVersion + 1 })),
  setSearch: (v) => set({ searchOpen: v }),
  setMenu: (v) => set({ menuOpen: v }),
  setQuickView: (slug) => set({ quickView: slug }),
  toast: (message, opts) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, ...opts }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

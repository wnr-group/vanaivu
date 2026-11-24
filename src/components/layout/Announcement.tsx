"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Announcement({ messages }: { messages: { text: string; href: string | null }[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 4500);
    return () => clearInterval(t);
  }, [messages.length]);
  if (!messages.length) return null;
  const m = messages[i];
  return (
    <div className="bg-ink text-paper h-9 flex items-center justify-center text-[11px] tracking-[0.16em] uppercase" role="region" aria-label="Announcements">
      <p key={i} className="animate-fade px-4 text-center truncate">
        {m.href ? <Link href={m.href} className="hover:text-mauve transition-colors">{m.text}</Link> : m.text}
      </p>
    </div>
  );
}

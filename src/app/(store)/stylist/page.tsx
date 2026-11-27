import type { Metadata } from "next";
import { StylistChat } from "@/components/stylist/StylistChat";

export const metadata: Metadata = { title: "AI Stylist", description: "Ask VANAIVU's AI stylist for outfits built from pieces in stock now." };

export default function StylistPage() {
  const aiEnabled = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return (
    <div className="container-x pt-10 lg:pt-16 max-w-5xl">
      <p className="eyebrow text-lavender">Personal styling</p>
      <h1 className="display text-[56px] lg:text-[96px] mt-4">Ask the stylist.</h1>
      <p className="text-stone mt-4 max-w-xl">Tell us the occasion, your budget or a piece you love. Every recommendation comes from the live catalogue, in stock in your size, and can be tried on in the Studio.</p>
      <StylistChat aiEnabled={aiEnabled} />
    </div>
  );
}

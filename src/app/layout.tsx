import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "VESTRA | Contemporary Women's Fashion", template: "%s | VESTRA" },
  description: "Contemporary women's fashion with a personal virtual fitting room. Discover, try on and style pieces that reflect you.",
};
export const viewport: Viewport = { themeColor: "#f3f1ee" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

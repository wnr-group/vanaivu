import Image from "next/image";

/** Monogram beside the wordmark, for headers and bars. Scales with the font size set in `className`. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-serif leading-none ${className}`}>
      <Image src="/brand/vanaivu-mark.png" alt="" width={60} height={60} unoptimized loading="eager" className="size-[1.8em] rounded-full" />
      <span className="tracking-[0.22em]">VANAIVU</span>
    </span>
  );
}

/** The complete logo with name and tagline, for places with room to show it. */
export function FullLogo({ className = "" }: { className?: string }) {
  return <Image src="/brand/vanaivu-logo.png" alt="VANAIVU. Designed by you, crafted by us." width={96} height={96} unoptimized className={`rounded-2xl ${className}`} />;
}

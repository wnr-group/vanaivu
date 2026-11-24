import Link from "next/link";

export function PageHead({ eyebrow, title, blurb, crumbs = [] }: { eyebrow: string; title: string; blurb?: string; crumbs?: { href: string; label: string }[] }) {
  return (
    <header className="container-x pt-10 lg:pt-16 pb-8 lg:pb-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.16em] text-stone flex gap-2 flex-wrap">
        <Link href="/" className="hover:text-ink">Home</Link>
        {crumbs.map((c) => <span key={c.href} className="flex gap-2"><span aria-hidden>/</span><Link href={c.href} className="hover:text-ink">{c.label}</Link></span>)}
        <span aria-hidden>/</span><span className="text-ink" aria-current="page">{eyebrow === "Shop" ? title : eyebrow}</span>
      </nav>
      <h1 className="display text-[52px] sm:text-[72px] lg:text-[104px] mt-6 break-words">{title}</h1>
      {blurb && <p className="text-stone mt-4 max-w-xl text-[15px]">{blurb}</p>}
    </header>
  );
}

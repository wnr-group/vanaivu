import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center px-5">
      <Link href="/" className="font-serif text-2xl tracking-[0.3em]">VESTRA</Link>
      <h1 className="display text-[72px] lg:text-[120px] mt-10">Not found.</h1>
      <p className="text-stone mt-4">This page has moved on, like last season.</p>
      <div className="flex gap-2 mt-10"><Link href="/" className="btn-dark">Home</Link><Link href="/shop/new-in" className="btn-outline">New in</Link></div>
    </div>
  );
}

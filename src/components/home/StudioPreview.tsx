import Link from "next/link";
import { StudioPreviewCanvas } from "./StudioPreviewCanvas";

const STEPS = [
  ["01", "Create your avatar", "Choose a skin tone and body type, then fine-tune height, bust, waist, hip and shoulders."],
  ["02", "Try on the catalogue", "Every Studio-ready piece loads onto your avatar in 3D. Rotate, zoom, swap sizes and colours."],
  ["03", "Mix, save, shop", "Combine tops, bottoms and layers, save your looks, then add a single piece or the whole outfit to your bag."],
];

export function StudioPreview() {
  return (
    <section className="mt-24 lg:mt-32 bg-ink text-paper overflow-hidden" aria-labelledby="studio-h">
      <div className="container-x grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 py-20 lg:py-28 items-center">
        <div>
          <p className="eyebrow text-mauve">The VANAIVU Virtual Studio</p>
          <h2 id="studio-h" className="display text-[52px] sm:text-[72px] lg:text-[96px] mt-5">
            Your style.<br />Your silhouette.<br /><em className="italic text-peach">Your rules.</em>
          </h2>
          <p className="mt-8 text-paper/70 max-w-lg leading-relaxed">
            Build a digital avatar that reflects you, then dress it in pieces from the collection. See how a dress drapes on your shape, how a jacket layers over a shirt, and which size the Fit Assistant suggests, all before you buy.
          </p>
          <ol className="mt-10 grid gap-6">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="grid grid-cols-[44px_1fr] gap-4 border-t border-paper/15 pt-5">
                <span className="font-serif text-mauve text-lg">{n}</span>
                <div><p className="text-[15px]">{t}</p><p className="text-[13px] text-paper/55 mt-1">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/studio" className="btn-light">Enter Virtual Studio</Link>
            <Link href="/studio/photo" className="btn-ghost-light">Try on with a photo</Link>
          </div>
        </div>
        <div className="relative aspect-[4/5] lg:aspect-[5/6] bg-gradient-to-b from-[#1d1718] to-[#100c0c]">
          <StudioPreviewCanvas />
          <p className="absolute bottom-4 left-4 right-4 text-center text-[11px] tracking-[0.16em] uppercase text-paper/45">Live 3D preview · drag to rotate</p>
        </div>
      </div>
    </section>
  );
}

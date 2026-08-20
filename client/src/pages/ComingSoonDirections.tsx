import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const directions = [
  {
    number: "01",
    title: "Auction Catalogue",
    summary: "An ivory editorial catalogue with archival rules, lot details, and a restrained cobalt invitation.",
    bestFor: "Classic collector authority",
    image: "/manus-storage/tradebilia-coming-soon-direction-1-auction-catalogue_bb145b86.png",
  },
  {
    number: "02",
    title: "Private Exchange Ledger",
    summary: "An ink-and-navy invitation that feels secure, private, and built for serious exchanges.",
    bestFor: "Exclusive, high-trust positioning",
    image: "/manus-storage/tradebilia-coming-soon-direction-2-private-exchange_39b2e656.png",
  },
  {
    number: "03",
    title: "Restoration Workbench",
    summary: "A warm archival worktable that brings all ten collecting categories into the story.",
    bestFor: "Strongest collector-world visual",
    image: "/manus-storage/tradebilia-coming-soon-direction-3-restoration-workbench_00463ec4.png",
  },
  {
    number: "04",
    title: "Collection Registry",
    summary: "A crisp, asymmetric gallery system with museum labels and a precise collector identity.",
    bestFor: "Cleanest modern collector brand",
    image: "/manus-storage/tradebilia-coming-soon-direction-4-collection-registry_bf150afd.png",
  },
  {
    number: "05",
    title: "Workbench · Auction Ledger",
    summary: "A disciplined auction catalogue worktable with cobalt rules and controlled archival red details.",
    bestFor: "Most classic workbench variation",
    image: "/manus-storage/tradebilia-workbench-variation-1_6ac2466c.png",
  },
  {
    number: "06",
    title: "Workbench · Curator’s Desk",
    summary: "A richer espresso-and-brass private collector desk with a formal, high-trust mood.",
    bestFor: "Most exclusive workbench variation",
    image: "/manus-storage/tradebilia-workbench-variation-2_caa37970.png",
  },
  {
    number: "07",
    title: "Workbench · Conservator Studio",
    summary: "A bright archive studio with warm daylight, restoration materials, and museum restraint.",
    bestFor: "Most welcoming workbench variation",
    image: "/manus-storage/tradebilia-workbench-variation-3_8dd95e3a.png",
  },
  {
    number: "08",
    title: "Workbench · Registry Drawers",
    summary: "An organized archive-drawer layout with crisp category structure and tactile object detail.",
    bestFor: "Most organized workbench variation",
    image: "/manus-storage/tradebilia-workbench-variation-4_ff36fb32.png",
  },
  {
    number: "09",
    title: "Workbench · Heirloom Library",
    summary: "A timeless navy-bookcloth and antique-brass collector desk with the cleanest central stage.",
    bestFor: "Most refined workbench variation",
    image: "/manus-storage/tradebilia-workbench-variation-5_0ba9fff3.png",
  },
];

export default function ComingSoonDirections() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 text-[#171717] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/coming-soon" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#171717]/60 transition hover:text-[#1847b5]">
          <ArrowLeft className="h-4 w-4" /> Current Coming Soon page
        </Link>

        <header className="mt-8 max-w-3xl sm:mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1847b5]">Tradebilia · Draft comparison</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-6xl">Choose the next Coming Soon direction.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#171717]/65 sm:text-base">These are visual directions only. The live Coming Soon page stays unchanged until you choose one.</p>
        </header>

        <section className="mt-9 grid gap-7 sm:mt-12 sm:gap-12">
          {directions.map((direction) => (
            <article key={direction.number} className="overflow-hidden border border-[#171717]/15 bg-white shadow-[0_12px_35px_rgba(23,23,23,0.06)]">
              <div className="relative">
                <img src={direction.image} alt={`${direction.title} Coming Soon visual direction`} className="aspect-video w-full border-b border-[#171717]/15 object-cover" />
                <div className="absolute left-3 top-3 w-28 rounded bg-[#f8f6f0]/95 p-1.5 shadow-sm sm:left-5 sm:top-5 sm:w-36">
                  <img src="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg" alt="Tradebilia" className="h-auto w-full" />
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-end sm:gap-7 sm:p-7">
                <span className="font-serif text-4xl text-[#1847b5]">{direction.number}</span>
                <div>
                  <h2 className="font-serif text-3xl tracking-[-0.03em] sm:text-4xl">{direction.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#171717]/65">{direction.summary}</p>
                </div>
                <div className="flex items-center gap-2 border-t border-[#171717]/10 pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717]/60 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <CheckCircle2 className="h-4 w-4 text-[#1847b5]" /> {direction.bestFor}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

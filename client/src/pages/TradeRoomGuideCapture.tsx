import { useParams } from "wouter";
import { CheckCircle2, Clock3, FileText, MessageSquare, PackageCheck, Send, ShieldCheck } from "lucide-react";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";

type CaptureStage = "review" | "confirm" | "complete";

const sampleItems = [
  {
    id: "sample-mj",
    title: "1986 Fleer Michael Jordan #57",
    category: "sports_cards",
    value: "$7,500",
  },
  {
    id: "sample-mcgwire",
    title: "1984 Topps USA Baseball Mark McGwire",
    category: "sports_cards",
    value: "$1,100",
  },
];

const stages = [
  ["Propose", "Trade created"],
  ["Negotiate", "Refine details"],
  ["Review", "Finalize terms"],
  ["Shipping", "Track packages"],
  ["Confirm", "Confirm receipt"],
  ["Complete", "Trade complete"],
] as const;

const stageIndex: Record<CaptureStage, number> = { review: 2, confirm: 4, complete: 5 };

function SampleItem({ item, owner }: { item: (typeof sampleItems)[number]; owner: string }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-700 bg-[#0a0a2a] shadow-inner">
      <div className="flex gap-3 p-3">
        <img
          src={resolveTradebiliaListingImage({ title: item.title, category: item.category })}
          alt={`${item.title} — fictional guide example`}
          className="h-20 w-16 rounded-lg border border-slate-700 bg-slate-950 object-contain"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Offered by {owner}</p>
          <h2 className="mt-1 font-semibold leading-5 text-white">{item.title}</h2>
          <p className="mt-1 text-sm font-bold text-emerald-300">{item.value}</p>
        </div>
      </div>
    </article>
  );
}

function StageProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {stages.map(([label, sub], index) => (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === activeIndex ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]" : index < activeIndex ? "bg-slate-600 text-slate-200" : "bg-slate-800 text-slate-500"}`}>
                {index + 1}
              </span>
              <span>
                <strong className={`block text-xs ${index === activeIndex ? "text-white" : index < activeIndex ? "text-slate-300" : "text-slate-500"}`}>{label}</strong>
                <small className="block text-[9px] text-slate-500">{sub}</small>
              </span>
            </div>
            {index < stages.length - 1 ? <span aria-hidden="true" className={`mx-1 h-px w-5 border-t border-dashed ${index < activeIndex ? "border-slate-500" : "border-slate-700"}`} /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function TradeRoomGuideCapture() {
  const params = useParams<{ stage?: string }>();
  const selectedStage: CaptureStage = params.stage === "confirm" || params.stage === "complete" ? params.stage : "review";
  const activeIndex = stageIndex[selectedStage];
  const copy = {
    review: { label: "Review the proposal", callout: "Both collectors can review the offered items and terms before accepting.", button: "Review proposal" },
    confirm: { label: "Confirm the exchange", callout: "Both collectors have accepted the agreed items. The Trade Room records the next shipping step.", button: "Terms confirmed" },
    complete: { label: "Confirm receipt", callout: "The exchange is complete after both collectors confirm receipt. A fair review can be left afterward.", button: "Receipt confirmed" },
  }[selectedStage];

  return (
    <main className="min-h-screen bg-[#0f0f1a] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-[#11113a] shadow-2xl">
        <header className="border-b border-slate-600 bg-[#16213e] px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div><span className="text-slate-400">Trade ID:</span> <strong className="ml-1 font-mono text-white">SAMPLE-TR-0001</strong></div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100"><ShieldCheck className="h-3.5 w-3.5" />Development-only guide example</span>
          </div>
          <StageProgress activeIndex={activeIndex} />
        </header>

        <section className="grid gap-4 p-4 lg:grid-cols-[1fr_1.08fr_0.92fr] lg:p-6">
          <aside className="rounded-xl border border-slate-700 bg-[#1a1a4a] p-4">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold">A</span><div><p className="font-semibold">Avery Cole</p><p className="text-xs text-slate-400">Fictional collector</p></div></div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-300">Avery is offering</p>
            <SampleItem item={sampleItems[0]} owner="Avery" />
          </aside>

          <section className="rounded-xl border border-slate-700 bg-[#1a1a4a] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Trade Room · {copy.label}</p>
            <h1 className="mt-2 text-xl font-bold text-white">Avery Cole ↔ Morgan Reed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">{copy.callout}</p>
            <div className="my-5 space-y-3 rounded-xl border border-slate-700 bg-[#0a0a2a] p-4">
              <div className="flex items-start gap-3"><MessageSquare className="mt-0.5 h-5 w-5 text-blue-300" /><div><p className="text-sm font-semibold">Sample Trade Room note</p><p className="mt-1 text-sm leading-6 text-slate-300">“I reviewed the item photos and agree with the proposed exchange.”</p></div></div>
              <div className="flex items-center gap-2 border-t border-slate-700 pt-3 text-xs text-slate-400"><Clock3 className="h-4 w-4" />This is a non-persisted development capture. No message or trade was sent.</div>
            </div>
            <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-bold text-white opacity-90"><CheckCircle2 className="h-4 w-4" />{copy.button}</button>
          </section>

          <aside className="rounded-xl border border-slate-700 bg-[#1a1a4a] p-4">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold">M</span><div><p className="font-semibold">Morgan Reed</p><p className="text-xs text-slate-400">Fictional collector</p></div></div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Morgan is offering</p>
            <SampleItem item={sampleItems[1]} owner="Morgan" />
          </aside>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 bg-[#0a0a2a] px-5 py-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />Illustrative capture of the current Trade Room design</span>
          <span className="inline-flex items-center gap-2"><PackageCheck className="h-4 w-4" />No tracking, address, payment, or live account data</span>
          <span className="inline-flex items-center gap-2"><Send className="h-4 w-4" />No record was created or changed</span>
        </footer>
      </div>
    </main>
  );
}

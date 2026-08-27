import { useParams } from "wouter";
import { CheckCircle2, Clock3, FileText, LockKeyhole, MessageSquare, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";

type CaptureStage = "propose" | "negotiate" | "review" | "shipping" | "confirm" | "complete";

const sampleItems = [
  { id: "sample-mj", title: "1986 Fleer Michael Jordan #57", category: "sports_cards", value: "$7,500" },
  { id: "sample-mcgwire", title: "1984 Topps USA Baseball Mark McGwire", category: "sports_cards", value: "$1,100" },
] as const;

const stages = ["Propose", "Negotiate", "Review", "Shipping", "Confirm", "Complete"] as const;
const stageIndex: Record<CaptureStage, number> = { propose: 0, negotiate: 1, review: 2, shipping: 3, confirm: 4, complete: 5 };

function SampleItem({ item, owner, locked = false }: { item: (typeof sampleItems)[number]; owner: string; locked?: boolean }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-700 bg-[#0a0a2a] shadow-inner">
      <div className="flex gap-3 p-3">
        <img src={resolveTradebiliaListingImage({ title: item.title, category: item.category })} alt={`${item.title} — fictional guide example`} className="h-20 w-16 rounded-lg border border-slate-700 bg-slate-950 object-contain" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{locked ? "Locked to" : "Offered by"} {owner}</p>
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
        {stages.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === activeIndex ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]" : index < activeIndex ? "bg-slate-600 text-slate-200" : "bg-slate-800 text-slate-500"}`}>{index + 1}</span>
              <strong className={`text-xs ${index === activeIndex ? "text-white" : index < activeIndex ? "text-slate-300" : "text-slate-500"}`}>{label}</strong>
            </div>
            {index < stages.length - 1 ? <span aria-hidden="true" className={`mx-1 h-px w-4 border-t border-dashed ${index < activeIndex ? "border-slate-500" : "border-slate-700"}`} /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProposeCapture() {
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-[0.95fr_1.15fr_0.9fr] lg:p-6">
      <aside className="rounded-xl border border-violet-400/30 bg-violet-950/25 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">Avery is offering</p><div className="mt-3"><SampleItem item={sampleItems[0]} owner="Avery" /></div></aside>
      <section className="rounded-xl border border-fuchsia-400/30 bg-[#1a1a4a] p-5 shadow-[0_0_26px_rgba(217,70,239,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-300">New trade proposal</p><h1 className="mt-2 text-2xl font-bold text-white">Build your first offer</h1><p className="mt-2 text-sm leading-6 text-slate-300">Add the collectible you are offering, review the item you want, and send the proposal when the exchange is ready.</p><div className="my-5 rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4"><p className="text-xs font-bold uppercase tracking-wide text-fuchsia-200">Requested collectible</p><p className="mt-2 text-sm font-semibold text-white">1984 Topps USA Baseball Mark McGwire</p><p className="mt-1 text-xs text-slate-400">Recipient response has not been received.</p></div><button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-3 font-bold text-white opacity-90"><MessageSquare className="h-4 w-4" />Send proposal</button></section>
      <aside className="rounded-xl border border-slate-600 bg-slate-900/45 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Morgan’s item</p><div className="mt-3"><SampleItem item={sampleItems[1]} owner="Morgan" /></div></aside>
    </section>
  );
}

function NegotiateCapture() {
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
      <section className="rounded-xl border border-amber-400/35 bg-[#1a1a4a] p-5 shadow-[0_0_26px_rgba(245,158,11,0.12)]"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Negotiation workspace</p><h1 className="mt-2 text-2xl font-bold text-white">A counteroffer is ready to review</h1></div><span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">YOUR TURN</span></div><div className="mt-5 space-y-3 rounded-xl border border-slate-700 bg-[#0a0a2a] p-4"><div className="flex gap-3"><MessageSquare className="mt-0.5 h-5 w-5 flex-none text-amber-300" /><div><p className="text-sm font-semibold">Morgan Reed</p><p className="mt-1 text-sm leading-6 text-slate-300">“Could we confirm the condition notes before we move forward?”</p></div></div><div className="border-t border-slate-700 pt-3 text-xs text-slate-400">Add or remove collectibles, discuss the terms, then send the revised proposal.</div></div><button type="button" disabled className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 font-bold text-white opacity-90"><FileText className="h-4 w-4" />Send counteroffer</button></section>
      <aside className="rounded-xl border border-slate-600 bg-[#16213e] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Current exchange</p><div className="mt-4 space-y-3"><SampleItem item={sampleItems[0]} owner="Avery" /><div className="text-center text-lg text-slate-500">↔</div><SampleItem item={sampleItems[1]} owner="Morgan" /></div></aside>
    </section>
  );
}

function ReviewCapture() {
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.2fr_0.9fr] lg:p-6">
      <aside className="rounded-xl border border-violet-400/30 bg-violet-950/25 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">Avery is offering</p><div className="mt-3"><SampleItem item={sampleItems[0]} owner="Avery" /></div></aside>
      <section className="rounded-xl border border-blue-400/30 bg-[#1a1a4a] p-5 shadow-[0_0_26px_rgba(59,130,246,0.12)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Proposal review workspace</p><h1 className="mt-2 text-2xl font-bold text-white">Review the proposed exchange</h1><p className="mt-2 text-sm leading-6 text-slate-300">Compare every item, ask questions, and make sure the proposed terms are correct before either collector confirms.</p><div className="my-5 rounded-xl border border-slate-700 bg-[#0a0a2a] p-4"><div className="flex gap-3"><MessageSquare className="mt-0.5 h-5 w-5 flex-none text-blue-300" /><div><p className="text-sm font-semibold">Sample Trade Room note</p><p className="mt-1 text-sm leading-6 text-slate-300">“I reviewed the item photos and agree with the proposed exchange.”</p></div></div></div><button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white opacity-90"><Clock3 className="h-4 w-4" />Awaiting both confirmations</button></section>
      <aside className="rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">Morgan is offering</p><div className="mt-3"><SampleItem item={sampleItems[1]} owner="Morgan" /></div></aside>
    </section>
  );
}

function ShippingCapture() {
  return (
    <section className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-orange-500/40 bg-[#16213e] p-5 shadow-[0_0_30px_rgba(249,115,22,0.1)]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-500/20"><Truck className="h-5 w-5 text-orange-300" /></span><div><h1 className="text-xl font-bold text-white">Shipping stage</h1><p className="mt-0.5 text-xs text-slate-400">Both collectors add tracking for the collectibles they are sending.</p></div></div><span className="rounded-full border border-orange-400/35 bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">ACTION REQUIRED</span></div>
      <section className="overflow-hidden rounded-xl border border-slate-600 bg-[#16213e] shadow-xl"><div className="grid md:grid-cols-2"><div className="border-b border-slate-700 p-5 md:border-b-0 md:border-r"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-blue-300">Avery Cole</p><span className="text-xs font-bold text-green-300">✓ Shipped</span></div><div className="mt-4 rounded-lg border border-green-500/25 bg-green-950/20 p-3"><p className="text-xs font-bold text-green-300">USPS · sample tracking recorded</p><p className="mt-1 text-xs text-slate-400">1986 Fleer Michael Jordan #57</p></div></div><div className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-300">Morgan Reed</p><span className="text-xs font-bold text-orange-300">Awaiting shipment</span></div><div className="mt-4 rounded-lg border border-dashed border-orange-500/35 bg-orange-950/15 p-4 text-center"><Clock3 className="mx-auto h-5 w-5 text-orange-300" /><p className="mt-2 text-sm font-semibold text-orange-100">Tracking entry pending</p><p className="mt-1 text-xs text-slate-400">Morgan adds a carrier and tracking number here.</p></div></div></div><div className="border-t border-slate-700 bg-[#0f0f1a] px-5 py-3 text-xs text-slate-400">Sample-only shipping status. No tracking number, address, or shipment was created.</div></section>
    </section>
  );
}

function ConfirmationCapture() {
  return (
    <section className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-500/40 bg-gradient-to-r from-green-900/40 to-emerald-900/30 p-5 shadow-[0_0_30px_rgba(34,197,94,0.15)]"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-400 bg-green-500/20"><CheckCircle2 className="h-6 w-6 text-green-300" /></span><div><h1 className="text-xl font-black uppercase tracking-widest text-green-300">Trade Accepted</h1><p className="mt-0.5 text-xs text-green-300/70">Both collectors agreed. The proposed items are now locked.</p></div></div><span className="rounded-full border border-green-400/30 bg-green-500/15 px-3 py-1 text-xs font-bold text-green-200">TERMS CONFIRMED</span></div>
      <section className="rounded-xl border border-slate-600 bg-[#16213e] p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-white">Items being traded</h2><span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-900/30 px-3 py-1 text-xs font-bold text-green-300"><LockKeyhole className="h-3.5 w-3.5" />LOCKED</span></div><div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center"><SampleItem item={sampleItems[0]} owner="Morgan Reed" locked /><span aria-hidden="true" className="text-center text-2xl text-slate-500">↔</span><SampleItem item={sampleItems[1]} owner="Avery Cole" locked /></div></section>
      <div className="flex gap-3 rounded-xl border border-blue-400/25 bg-blue-950/25 p-4 text-sm leading-6 text-blue-100"><ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-blue-300" /><p>Shipping details are available only to the two confirmed participants. This development capture deliberately shows no contact or address information.</p></div>
    </section>
  );
}

function CompletionCapture() {
  return (
    <section className="space-y-4 p-4 lg:p-6">
      <div className="rounded-xl border border-emerald-400/45 bg-gradient-to-r from-emerald-950/55 to-green-900/35 p-6 text-center shadow-[0_0_32px_rgba(16,185,129,0.18)]"><PackageCheck className="mx-auto h-11 w-11 text-emerald-300" /><p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Receipt confirmed</p><h1 className="mt-2 text-3xl font-black text-white">Trade Complete</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-emerald-50/78">Both collectors confirmed that the agreed collectibles were received.</p></div>
      <section className="rounded-xl border border-slate-600 bg-[#16213e] p-5 shadow-xl"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-500/30 bg-green-900/30"><Truck className="h-5 w-5 text-green-300" /></span><div><h2 className="font-bold text-white">Completed exchange summary</h2><p className="text-xs text-slate-400">Both shipments and receipt confirmations are recorded in the Trade Room.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-green-500/25 bg-green-950/20 p-4"><p className="text-xs font-bold uppercase tracking-wide text-green-300">Avery Cole</p><p className="mt-2 text-sm font-semibold text-white">Package received</p><p className="mt-1 text-xs text-slate-400">Tracking status recorded · receipt confirmed</p></div><div className="rounded-lg border border-green-500/25 bg-green-950/20 p-4"><p className="text-xs font-bold uppercase tracking-wide text-green-300">Morgan Reed</p><p className="mt-2 text-sm font-semibold text-white">Package received</p><p className="mt-1 text-xs text-slate-400">Tracking status recorded · receipt confirmed</p></div></div></section>
      <div className="grid gap-3 md:grid-cols-2"><SampleItem item={sampleItems[0]} owner="Morgan Reed" locked /><SampleItem item={sampleItems[1]} owner="Avery Cole" locked /></div>
    </section>
  );
}

export default function TradeRoomGuideCapture() {
  const params = useParams<{ stage?: string }>();
  const selectedStage: CaptureStage = params.stage === "propose" || params.stage === "negotiate" || params.stage === "review" || params.stage === "shipping" || params.stage === "confirm" || params.stage === "complete" ? params.stage : "propose";
  const labels = { propose: "Start a proposal", negotiate: "Negotiate the exchange", review: "Review the proposal", shipping: "Ship the agreed items", confirm: "Confirm the exchange", complete: "Confirm receipt" } as const;
  const capture = selectedStage === "propose" ? <ProposeCapture /> : selectedStage === "negotiate" ? <NegotiateCapture /> : selectedStage === "review" ? <ReviewCapture /> : selectedStage === "shipping" ? <ShippingCapture /> : selectedStage === "confirm" ? <ConfirmationCapture /> : <CompletionCapture />;
  return <main className="min-h-screen bg-[#0f0f1a] px-3 py-5 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-[#11113a] shadow-2xl"><header className="border-b border-slate-600 bg-[#16213e] px-5 py-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm"><div><span className="text-slate-400">Trade ID:</span> <strong className="ml-1 font-mono text-white">SAMPLE-TR-0001</strong></div><span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100"><ShieldCheck className="h-3.5 w-3.5" />Development-only guide example</span></div><p className="mb-3 text-sm font-semibold text-slate-200">Trade Room · {labels[selectedStage]}</p><StageProgress activeIndex={stageIndex[selectedStage]} /></header>{capture}<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 bg-[#0a0a2a] px-5 py-3 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />Illustrative capture of the current Trade Room design</span><span>Fictional collectors and items only · No record was created or changed</span></footer></div></main>;
}

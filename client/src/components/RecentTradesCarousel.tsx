import { useEffect, useState } from "react";
import { ArrowLeftRight, Package } from "lucide-react";
import { Link } from "wouter";
import { buildTradeShowcaseExchange, type TradeShowcaseItem, type TradeShowcaseTrade } from "@/lib/tradeShowcaseMovements";

type RecentTrade = TradeShowcaseTrade & {
  id: number;
  tradeReferenceNumber?: string | null;
  completedAt?: string | Date | null;
};

const FADE_DURATION_MS = 350;
const ROTATION_INTERVAL_MS = 5_000;

function formatEstimatedValue(value: TradeShowcaseItem["estimatedValue"]) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? `$${numberValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "Value unavailable";
}

function TradeItemList({ items, alignment }: { items: TradeShowcaseItem[]; alignment: "start" | "end" }) {
  if (!items.length) return <p className="text-sm text-slate-500">No public item details available.</p>;
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${alignment === "end" ? "lg:justify-end" : "lg:justify-start"}`}>
      {items.map((item, index) => {
        const content = <><div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">{item.imageUrl ? <img src={item.imageUrl} alt={item.title || "Traded collectible"} className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-slate-400" aria-hidden="true" /></div>}</div><div className="min-w-0 text-left"><p className="max-w-44 truncate text-sm font-semibold text-slate-900">{item.title || "Collectible"}</p><p className="mt-0.5 text-xs text-slate-500">{formatEstimatedValue(item.estimatedValue)}</p></div></>;
        return item.id ? <Link key={`${item.id}-${index}`} href={`/listings/${item.id}`} className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">{content}</Link> : <div key={`${item.title}-${index}`} className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">{content}</div>;
      })}
    </div>
  );
}

export function RecentTradesCarousel({ trades, isLoading = false }: { trades: RecentTrade[]; isLoading?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => { const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)"); const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches); updatePreference(); mediaQuery.addEventListener("change", updatePreference); return () => mediaQuery.removeEventListener("change", updatePreference); }, []);
  useEffect(() => { setActiveIndex((current) => (trades.length ? current % trades.length : 0)); }, [trades.length]);
  useEffect(() => {
    if (trades.length < 2 || prefersReducedMotion) return;
    let fadeTimeout: number | undefined; let entranceFrame: number | undefined;
    const interval = window.setInterval(() => { setIsFading(true); fadeTimeout = window.setTimeout(() => { setActiveIndex((current) => (current + 1) % trades.length); entranceFrame = window.requestAnimationFrame(() => setIsFading(false)); }, FADE_DURATION_MS); }, ROTATION_INTERVAL_MS);
    return () => { window.clearInterval(interval); if (fadeTimeout) window.clearTimeout(fadeTimeout); if (entranceFrame) window.cancelAnimationFrame(entranceFrame); };
  }, [trades.length, prefersReducedMotion]);
  const trade = trades[activeIndex];
  const exchange = trade ? buildTradeShowcaseExchange(trade) : null;
  return <section aria-labelledby="recent-trades-heading" className="mx-4 mb-6 py-3 sm:mx-0 lg:mx-8"><h2 id="recent-trades-heading" className="text-center font-serif text-[2.45rem] font-medium tracking-[-0.035em] text-[#2d241e] sm:text-[2.8rem]">Recent Trades</h2>{isLoading ? <div className="mt-4 h-44 animate-pulse rounded-2xl bg-white/80" aria-label="Loading recent trades" /> : !trade || !exchange ? <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-white/80 p-8 text-center text-sm text-slate-600">Completed exchanges will appear here as collectors confirm their trades.</div> : <article key={trade.id} className={`mt-4 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition-opacity duration-300 motion-reduce:transition-none sm:p-5 ${isFading ? "opacity-0" : "opacity-100"}`} aria-live="off"><div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><div className="rounded-2xl bg-violet-50/75 p-3 lg:flex lg:items-center lg:justify-end lg:gap-4"><p className="mb-3 text-center text-sm font-bold text-violet-950 lg:mb-0 lg:shrink-0">{exchange.left.member.displayName || "Member"} traded</p><TradeItemList items={exchange.left.items} alignment="end" /></div><div className="flex justify-center"><ArrowLeftRight className="h-9 w-9 text-violet-600" strokeWidth={2.4} aria-label="Completed exchange" /></div><div className="rounded-2xl bg-sky-50/80 p-3 lg:flex lg:items-center lg:justify-start lg:gap-4"><TradeItemList items={exchange.right.items} alignment="start" /><p className="mt-3 text-center text-sm font-bold text-sky-950 lg:mt-0 lg:shrink-0">{exchange.right.member.displayName || "Member"} traded</p></div></div></article>}</section>;
}

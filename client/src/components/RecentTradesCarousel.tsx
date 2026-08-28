import { useEffect, useState } from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, BadgeCheck, CalendarDays, Hash, Package, UserRound } from "lucide-react";
import { Link } from "wouter";
import { buildTradeShowcaseExchange, type TradeShowcaseItem, type TradeShowcaseTrade } from "@/lib/tradeShowcaseMovements";

type RecentTrade = TradeShowcaseTrade & {
  id: number;
  tradeReferenceNumber?: string | null;
  completedAt?: string | Date | null;
  totalValue?: string | number | null;
};

const FADE_DURATION_MS = 350;
const ROTATION_INTERVAL_MS = 5_000;

function formatEstimatedValue(value: TradeShowcaseItem["estimatedValue"] | RecentTrade["totalValue"]) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? `$${numberValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "Value unavailable";
}

function formatConditionOrGrade(item: TradeShowcaseItem) {
  const numericGrade = Number(item.grade);
  if (Number.isFinite(numericGrade) && numericGrade > 0) {
    const gradingCompany = item.certificationCompany?.trim();
    const formattedGrade = numericGrade.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return gradingCompany ? `${gradingCompany} ${formattedGrade}` : `Grade ${formattedGrade}`;
  }

  const condition = item.condition?.trim();
  return condition
    ? `Condition: ${condition.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`
    : "Condition unavailable";
}

function formatTradeDate(value: RecentTrade["completedAt"]) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function TradeItemList({ items, title }: { items: TradeShowcaseItem[]; title: string }) {
  if (!items.length) return <p className="text-center text-xs text-slate-500">No public item details available.</p>;

  return (
    <section aria-label={`${title} items`} className="min-w-0">
      <p className="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-[0.14em] text-violet-700">{title}</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {items.map((item, index) => {
          const content = <><div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-20 sm:w-20">{item.imageUrl ? <img src={item.imageUrl} alt={item.title || "Traded collectible"} className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6 text-slate-400" aria-hidden="true" /></div>}</div><div className="min-w-0 text-left"><p className="max-w-36 text-sm font-semibold leading-snug text-slate-900 sm:max-w-40">{item.title || "Collectible"}</p><p className="mt-0.5 text-xs font-semibold text-violet-700">{formatConditionOrGrade(item)}</p><p className="mt-0.5 text-sm font-bold text-violet-800">{formatEstimatedValue(item.estimatedValue)}</p></div></>;
          const className = "flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600";
          return item.id ? <Link key={`${item.id}-${index}`} href={`/listings/${item.id}`} className={className}>{content}</Link> : <div key={`${item.title}-${index}`} className={className}>{content}</div>;
        })}
      </div>
    </section>
  );
}

function TradeMember({ label, name, avatarUrl, side }: { label: "From" | "To"; name?: string | null; avatarUrl?: string | null; side: "left" | "right" }) {
  const displayName = name || "Member";
  return <section className={`min-w-0 ${side === "left" ? "lg:text-right" : "lg:text-left"}`}><p className="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500 lg:text-inherit">{label}</p><div className={`flex items-center justify-center gap-2 ${side === "left" ? "lg:justify-end" : "lg:justify-start"}`}><div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}</div><p className="max-w-24 truncate text-sm font-semibold text-slate-900">{displayName}</p></div></section>;
}

export function RecentTradesCarousel({ trades, isLoading = false }: { trades: RecentTrade[]; isLoading?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    setActiveIndex((current) => (trades.length ? current % trades.length : 0));
  }, [trades.length]);

  useEffect(() => {
    if (trades.length < 2 || prefersReducedMotion) return;
    let fadeTimeout: number | undefined;
    let entranceFrame: number | undefined;
    const interval = window.setInterval(() => {
      setIsFading(true);
      fadeTimeout = window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % trades.length);
        entranceFrame = window.requestAnimationFrame(() => setIsFading(false));
      }, FADE_DURATION_MS);
    }, ROTATION_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
      if (entranceFrame) window.cancelAnimationFrame(entranceFrame);
    };
  }, [trades.length, prefersReducedMotion]);

  const trade = trades[activeIndex];
  const exchange = trade ? buildTradeShowcaseExchange(trade) : null;
  const completionDate = trade ? formatTradeDate(trade.completedAt) : null;

  return (
    <section aria-labelledby="recent-trades-heading" className="mx-4 mb-6 py-3 sm:mx-0 lg:mx-8">
      <h2 id="recent-trades-heading" className="text-center font-serif text-[2.45rem] font-medium tracking-[-0.035em] text-[#2d241e] sm:text-[2.8rem]">Recent Trades</h2>

      {isLoading ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/80" aria-label="Loading recent trades" /> : !trade || !exchange ? <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-white/80 p-8 text-center text-sm text-slate-600">Completed exchanges will appear here as collectors confirm their trades.</div> : <article key={trade.id} className={`mx-auto mt-4 max-w-[74rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-opacity duration-300 motion-reduce:transition-none sm:p-3 ${isFading ? "opacity-0" : "opacity-100"}`} aria-live="off">
        <div className="grid gap-3 rounded-lg bg-slate-50/80 px-3 py-3 lg:grid-cols-[minmax(5rem,0.65fr)_minmax(10rem,1fr)_auto_auto_auto_minmax(10rem,1fr)_minmax(5rem,0.65fr)] lg:items-center lg:gap-2">
          <TradeMember label="From" name={exchange.left.member.displayName} avatarUrl={exchange.left.member.avatarUrl} side="left" />
          <TradeItemList items={exchange.left.items} title="You gave" />
          <ArrowRight className="mx-auto hidden h-6 w-6 text-violet-600 lg:block" strokeWidth={2.4} aria-label="Items moved from the left collector to the right collector" />
          <div className="flex flex-col items-center justify-center gap-0.5 text-emerald-700"><BadgeCheck className="h-12 w-12" strokeWidth={1.8} aria-hidden="true" /><span className="whitespace-nowrap text-[0.58rem] font-bold uppercase tracking-[0.11em]">Trade complete</span></div>
          <ArrowLeft className="mx-auto hidden h-6 w-6 text-sky-600 lg:block" strokeWidth={2.4} aria-label="Items moved from the right collector to the left collector" />
          <TradeItemList items={exchange.right.items} title="You received" />
          <TradeMember label="To" name={exchange.right.member.displayName} avatarUrl={exchange.right.member.avatarUrl} side="right" />
        </div>
        <footer className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-slate-100 px-2 pt-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Trade ID: <strong className="text-slate-800">{trade.tradeReferenceNumber || "Reference unavailable"}</strong></span>{completionDate ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />{completionDate}</span> : null}<span className="inline-flex items-center gap-1.5">Total Trade Value: <strong className="text-emerald-700">{formatEstimatedValue(trade.totalValue)}</strong></span><span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Verified trade</span></footer>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 lg:hidden"><ArrowLeftRight className="h-4 w-4 text-violet-600" aria-hidden="true" /> Items moved in both directions</div>
      </article>}
    </section>
  );
}

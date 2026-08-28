import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Hash, Package, ShieldCheck, Star, UserRound } from "lucide-react";
import { Link } from "wouter";
import { buildTradeShowcaseExchange, type TradeShowcaseItem, type TradeShowcaseParty, type TradeShowcaseTrade } from "@/lib/tradeShowcaseMovements";

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

function formatMemberRating(value: TradeShowcaseParty["averageRating"]) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue.toFixed(1) : null;
}

function getMemberName(member: TradeShowcaseParty) {
  return member.username?.trim() || member.displayName?.trim() || "Member";
}

function TradeItemList({ items, side }: { items: TradeShowcaseItem[]; side: "left" | "right" }) {
  if (!items.length) return <p className="text-center text-xs italic text-slate-500">No public item details available.</p>;

  return (
    <div className={`flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 ${side === "right" ? "md:justify-start" : "md:justify-end"}`}>
      {items.map((item, index) => {
        const content = (
          <>
            <div className="h-24 w-24 shrink-0 overflow-hidden bg-slate-50 sm:h-28 sm:w-28">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title || "Traded collectible"} className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Package className="h-7 w-7 text-slate-400" aria-hidden="true" /></div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <p className="max-w-44 text-sm font-semibold leading-snug text-slate-900">{item.title || "Collectible"}</p>
              <p className="mt-0.5 text-xs font-semibold text-violet-700">{formatConditionOrGrade(item)}</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-700">{formatEstimatedValue(item.estimatedValue)}</p>
            </div>
          </>
        );
        const className = "group flex min-w-0 max-w-full items-center gap-2 rounded-md p-1 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600";
        return item.id ? <Link key={`${item.id}-${index}`} href={`/listings/${item.id}`} className={className}>{content}</Link> : <div key={`${item.title}-${index}`} className={className}>{content}</div>;
      })}
    </div>
  );
}

function TradeMember({ member }: { member: TradeShowcaseParty }) {
  const memberName = getMemberName(member);
  const rating = formatMemberRating(member.averageRating);
  const initials = memberName.slice(0, 2).toUpperCase();

  return (
    <section className="min-w-0 text-center" aria-label={`Trade member ${memberName}`}>
      <div className="flex items-center justify-center gap-2">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={`${memberName} avatar`} className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-slate-100 object-contain p-0.5" loading="lazy" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500" aria-label={`${memberName} avatar unavailable`}>{initials || <UserRound className="h-4 w-4" aria-hidden="true" />}</div>
        )}
        <p className="max-w-32 truncate text-sm font-bold text-slate-900" title={memberName}>{memberName}</p>
      </div>
      <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
        <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" aria-hidden="true" />
        {rating ? `${rating} rating` : "No rating yet"}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {member.verificationLabels?.length ? member.verificationLabels.map((verification) => (
          <span key={verification} className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[0.58rem] font-semibold text-violet-700" title={verification}>
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
            {verification}
          </span>
        )) : <span className="text-[0.58rem] text-slate-400">No verifications shown</span>}
      </div>
    </section>
  );
}

function TicketDivider() {
  return <div className="h-px w-full border-t border-dashed border-slate-300 md:h-full md:w-px md:border-l md:border-t-0" aria-hidden="true" />;
}

export function RecentTradesCarousel({ trades, isLoading = false }: { trades: RecentTrade[]; isLoading?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const transitionTimer = useRef<number | undefined>(undefined);

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
    return () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const moveTrade = (step: number) => {
    if (trades.length < 2) return;
    setIsFading(true);
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      setActiveIndex((current) => (current + step + trades.length) % trades.length);
      window.requestAnimationFrame(() => setIsFading(false));
    }, FADE_DURATION_MS);
  };

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
    <section aria-labelledby="recent-trades-heading" className="mx-2 mb-6 py-3 sm:mx-0 lg:mx-3">
      <h2 id="recent-trades-heading" className="text-center font-serif text-[2.45rem] font-medium tracking-[-0.035em] text-[#2d241e] sm:text-[2.8rem]">Recent Trades</h2>

      {isLoading ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/80" aria-label="Loading recent trades" /> : !trade || !exchange ? <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-white/80 p-8 text-center text-sm text-slate-600">Completed exchanges will appear here as collectors confirm their trades.</div> : <div className="relative mt-4 px-1 sm:px-5 lg:px-8">
        <button type="button" onClick={() => moveTrade(-1)} disabled={trades.length < 2} aria-label="Previous recent trade" className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-md transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <article key={trade.id} className={`ticket-card mx-auto w-full max-w-none overflow-hidden border border-slate-200 bg-[#f1f7ef] shadow-sm transition-opacity duration-300 motion-reduce:transition-none ${isFading ? "opacity-0" : "opacity-100"}`} aria-live="off">
        <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(10rem,0.9fr)_1px_minmax(14rem,1.2fr)_1px_minmax(10rem,0.8fr)_1px_minmax(14rem,1.2fr)_1px_minmax(10rem,0.9fr)] md:items-center md:gap-4 lg:px-8 lg:py-5">
          <TradeMember member={exchange.left.member} />
          <TicketDivider />
          <TradeItemList items={exchange.left.items} side="left" />
          <TicketDivider />
          <div className="flex items-center justify-center py-2" aria-label="Trade complete">
            <img src="/manus-storage/trade-complete-stamp_e8860371.png" alt="Trade complete" className="h-28 w-32 object-contain sm:h-32 sm:w-36" />
          </div>
          <TicketDivider />
          <TradeItemList items={exchange.right.items} side="right" />
          <TicketDivider />
          <TradeMember member={exchange.right.member} />
        </div>
        <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-[#c9dfc3] bg-[#e1efdc] px-4 py-2 text-xs text-slate-700"><span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Trade ID: <strong className="text-slate-800">{trade.tradeReferenceNumber || "Reference unavailable"}</strong></span>{completionDate ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />{completionDate}</span> : null}<span className="inline-flex items-center gap-1.5">Total Trade Value: <strong className="text-emerald-700">{formatEstimatedValue(trade.totalValue)}</strong></span><span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Verified trade</span></footer>
        </article>
        <button type="button" onClick={() => moveTrade(1)} disabled={trades.length < 2} aria-label="Next recent trade" className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-md transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>}
    </section>
  );
}

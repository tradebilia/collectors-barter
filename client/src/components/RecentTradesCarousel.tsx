import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Hash, Package, ShieldCheck, Star, UserRound } from "lucide-react";
import { Link } from "wouter";
import { buildTradeShowcaseExchange, type TradeShowcaseItem, type TradeShowcaseParty, type TradeShowcaseTrade } from "@/lib/tradeShowcaseMovements";
import { getDisplayedGradingCompany } from "@/lib/gradingDisplay";
import { formatItemValue } from "@/lib/tradebilia";

type RecentTrade = TradeShowcaseTrade & {
  id: number;
  tradeReferenceNumber?: string | null;
  completedAt?: string | Date | null;
  totalValue?: string | number | null;
};

const FADE_DURATION_MS = 350;
const ROTATION_INTERVAL_MS = 5_000;
const MAX_VISIBLE_ITEM_PREVIEWS = 4;

function formatEstimatedValue(value: TradeShowcaseItem["estimatedValue"] | RecentTrade["totalValue"]) {
  return formatItemValue(value, "Value unavailable");
}

function getGradePresentation(item: TradeShowcaseItem) {
  const numericGrade = Number(item.grade);
  if (!Number.isFinite(numericGrade) || numericGrade <= 0) return null;
  const formattedGrade = numericGrade.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return { company: getDisplayedGradingCompany(item.certificationCompany, item.customGradingCompany), grade: formattedGrade };
}

function formatCondition(item: TradeShowcaseItem) {
  const condition = item.condition?.trim();
  return condition
    ? `Condition: ${condition.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`
    : "Condition unavailable";
}

function getCategoryBadgeClass(category?: string | null) {
  const normalized = category?.trim().toLowerCase() || "";
  if (normalized.includes("sport")) return "bg-red-100 text-red-800 ring-red-200";
  if (normalized.includes("comic")) return "bg-violet-100 text-violet-800 ring-violet-200";
  if (normalized.includes("toy")) return "bg-amber-100 text-amber-900 ring-amber-200";
  if (normalized.includes("game")) return "bg-indigo-100 text-indigo-800 ring-indigo-200";
  if (normalized.includes("stamp")) return "bg-teal-100 text-teal-800 ring-teal-200";
  if (normalized.includes("coin")) return "bg-yellow-100 text-yellow-900 ring-yellow-200";
  if (normalized.includes("pokemon")) return "bg-cyan-100 text-cyan-800 ring-cyan-200";
  if (normalized.includes("movie")) return "bg-rose-100 text-rose-800 ring-rose-200";
  if (normalized.includes("autograph")) return "bg-purple-100 text-purple-800 ring-purple-200";
  if (normalized.includes("disney")) return "bg-pink-100 text-pink-800 ring-pink-200";
  return "bg-blue-100 text-blue-800 ring-blue-200";
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
  return member.displayName?.trim() || member.username?.trim() || "Member";
}

function DirectionMarker({ side }: { side: "left" | "right" }) {
  const DirectionIcon = side === "left" ? ArrowRight : ArrowLeft;
  const directionLabel = side === "left" ? "Item moves toward the right member" : "Item moves toward the left member";

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#3974bb]" aria-label={directionLabel} title={directionLabel}>
      <DirectionIcon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

function TradeItemList({ items, cashPaid }: { items: TradeShowcaseItem[]; cashPaid: number }) {
  if (!items.length && cashPaid <= 0) return <p className="text-center text-xs italic text-slate-500">No public item details available.</p>;

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEM_PREVIEWS);
  const hiddenItemCount = Math.max(0, items.length - visibleItems.length);
  const isMultiItemTrade = visibleItems.length > 1;

  return (
    <div className={`mx-auto grid w-full min-w-0 items-stretch gap-2 ${isMultiItemTrade ? "grid-cols-2" : "grid-cols-1"}`}>
      {visibleItems.map((item, index) => {
        const grade = getGradePresentation(item);
        const content = (
          <>
            <div className={`${isMultiItemTrade ? "h-16 w-14 sm:h-[4.5rem] sm:w-16" : "h-32 w-20 sm:h-36 sm:w-24"} shrink-0 overflow-hidden rounded bg-transparent`}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title || "Traded collectible"} className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Package className="h-7 w-7 text-slate-400" aria-hidden="true" /></div>
              )}
            </div>
            <div className="min-w-0 max-w-full text-left">
              <p className={`${isMultiItemTrade ? "line-clamp-2 text-xs leading-tight" : "text-sm leading-snug sm:text-base"} break-words font-bold text-[#153d7a]`} title={item.title || "Collectible"}>{item.title || "Collectible"}</p>
              {grade ? (
                <div className={`${isMultiItemTrade ? "mt-1" : "mt-2"} flex flex-wrap items-center gap-1.5`} aria-label={`${grade.company} grade ${grade.grade}`}>
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 ${isMultiItemTrade ? "text-[0.65rem]" : "text-sm"} font-extrabold ring-1 ${getCategoryBadgeClass(item.category)}`}>{grade.company} {grade.grade}</span>
                </div>
              ) : <p className={`${isMultiItemTrade ? "mt-1 text-[0.65rem] line-clamp-1" : "mt-2 text-sm"} break-words font-semibold text-[#315ea7]`}>{formatCondition(item)}</p>}
              <p className={`${isMultiItemTrade ? "mt-1 text-xs" : "mt-1 text-base"} font-bold text-[#2458a6]`}>{formatEstimatedValue(item.estimatedValue)}</p>
            </div>
          </>
        );
        const className = `group grid w-full max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center ${isMultiItemTrade ? "gap-2 rounded-lg border border-[#c9d8eb] bg-white/65 p-2" : "gap-3 rounded-md p-1"} overflow-hidden text-left transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600`;
        return item.id ? <Link key={`${item.id}-${index}`} href={`/listings/${item.id}`} className={className}>{content}</Link> : <div key={`${item.title}-${index}`} className={className}>{content}</div>;
      })}
      {hiddenItemCount > 0 && <span className="flex min-h-[4.5rem] items-center justify-center rounded-lg border border-dashed border-[#8ba9ca] bg-[#edf4fb] px-2 text-center text-xs font-extrabold text-[#2458a6]">+{hiddenItemCount} more item{hiddenItemCount === 1 ? "" : "s"}</span>}
      {cashPaid > 0 && <span className={`${isMultiItemTrade ? "col-span-2 text-xs" : "text-sm"} rounded-md bg-emerald-100 px-3 py-1.5 text-center font-extrabold text-emerald-800 ring-1 ring-emerald-200`}>+ {formatEstimatedValue(cashPaid)} Cash paid</span>}
    </div>
  );
}

function TradeMember({ member }: { member: TradeShowcaseParty }) {
  const memberName = getMemberName(member);
  const rating = formatMemberRating(member.averageRating);
  const initials = memberName.slice(0, 2).toUpperCase();

  return (
    <section className="flex w-full min-w-0 flex-col items-center text-left" aria-label={`Trade member ${memberName}`}>
      <div className="flex w-fit max-w-full min-w-0 items-center justify-center gap-3 text-left">
        {member.avatarUrl ? (
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#3974bb] bg-white sm:h-14 sm:w-14" aria-label={`${memberName} avatar`}>
            <img src={member.avatarUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-md" loading="lazy" />
            <img src={member.avatarUrl} alt={`${memberName} avatar`} className="relative z-10 h-full w-full object-fill" loading="lazy" />
          </span>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#3974bb] bg-white text-base font-bold text-[#2458a6] sm:h-14 sm:w-14" aria-label={`${memberName} avatar unavailable`}>{initials || <UserRound className="h-4 w-4" aria-hidden="true" />}</div>
        )}
        <div className="min-w-0 text-left">
          <p className="break-words text-[0.95rem] font-bold leading-tight text-[#153d7a] sm:text-base" title={memberName}>{memberName}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-[#2458a6] sm:text-lg">
            <Star className="h-4 w-4 fill-[#3974bb] text-[#3974bb]" aria-hidden="true" />
            {rating || "No rating yet"}
          </p>
        </div>
      </div>
      <div className="mt-2 w-fit max-w-full space-y-1.5 text-left">
        {member.verificationLabels?.length ? member.verificationLabels.map((verification) => (
          <span key={verification} className="flex items-center gap-1 whitespace-normal break-words text-sm font-semibold text-[#31568f] sm:text-base" title={verification}>
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#3974bb]" aria-hidden="true" />
            {verification}
          </span>
        )) : <span className="text-sm text-[#6a82a4] sm:text-base">No verifications shown</span>}
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
      <h2 id="recent-trades-heading" className="text-center font-serif text-[2.45rem] font-medium tracking-[-0.035em] text-black sm:text-[2.8rem]">Recent Trades</h2>

      {isLoading ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/80" aria-label="Loading recent trades" /> : !trade || !exchange ? <div className="mt-4 h-[60rem] rounded-2xl border border-dashed border-violet-200 bg-white/80 p-8 text-center text-sm text-slate-600 md:h-[20rem] lg:h-[21rem]">Completed exchanges will appear here as collectors confirm their trades.</div> : <div className="relative mt-4 h-[60rem] overflow-hidden px-0 sm:px-2 md:h-[20rem] lg:h-[21rem] lg:px-3">
        <article key={trade.id} className={`ticket-card mx-auto flex h-full w-full max-w-none flex-col overflow-hidden border-4 border-[#3974bb] bg-[#f8fafc] shadow-sm transition-opacity duration-300 motion-reduce:transition-none ${isFading ? "opacity-0" : "opacity-100"}`} aria-live="off">
        <div className="grid min-h-0 min-w-0 flex-1 gap-1 overflow-hidden px-4 py-4 md:grid-cols-[minmax(10rem,0.95fr)_1px_minmax(12rem,1.1fr)_auto_1px_minmax(7rem,0.7fr)_1px_auto_minmax(12rem,1.1fr)_1px_minmax(10rem,0.95fr)] md:items-center md:gap-1 lg:px-4 lg:py-5">
          <TradeMember member={exchange.left.member} />
          <TicketDivider />
          <TradeItemList items={exchange.left.items} cashPaid={exchange.left.cashPaid} />
          <DirectionMarker side="left" />
          <TicketDivider />
          <div className="flex items-center justify-center py-2" aria-label="Trade complete">
            <img src="/manus-storage/trade-quality-seal-transparent_fdff2d58.png" alt="Trade Quality seal" className="h-44 w-48 object-contain sm:h-48 sm:w-52" loading="eager" />
          </div>
          <TicketDivider />
          <DirectionMarker side="right" />
          <TradeItemList items={exchange.right.items} cashPaid={exchange.right.cashPaid} />
          <TicketDivider />
          <TradeMember member={exchange.right.member} />
        </div>
        <footer className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-[#b5cbe5] bg-[#dce8f7] px-4 py-4 text-base text-slate-700"><span className="inline-flex items-center gap-1.5"><Hash className="h-4 w-4 text-[#315ea7]" aria-hidden="true" />Trade ID: <strong className="text-slate-800">{trade.tradeReferenceNumber || "Reference unavailable"}</strong></span>{completionDate ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />{completionDate}</span> : null}<span className="inline-flex items-center gap-1.5">Total Trade Value: <strong className="text-[#2458a6]">{formatEstimatedValue(trade.totalValue)}</strong></span><span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[#315ea7]" aria-hidden="true" />Verified trade</span></footer>
        </article>

      </div>}
    </section>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { tradebiliaCategories, type TradebiliaCategorySlug } from "@/lib/tradebilia";
import { Handshake, ArrowUpDown, ThumbsDown, ThumbsUp } from "lucide-react";
import { DirectionMarker, TicketDivider, TradeItemList, TradeMember } from "@/components/RecentTradesCarousel";
import { buildTradeShowcaseExchange } from "@/lib/tradeShowcaseMovements";

const CATEGORY_ICONS: Record<string, string> = {
  comics: "📚",
  sports_cards: "🏆",
  vintage_toys: "🧸",
  video_games: "🎮",
  stamps: "📮",
  coins: "🪙",
  pokemon: "⚡",
  movies: "🎬",
  music: "🎵",
  autographs: "✍️",
  disney_pins: "🏰",
};

function formatTradeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  
  // If trade is older than 14 days, show absolute date
  if (days > 14) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  // Otherwise show relative time
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
}

function TradeVoteControls({ trade }: { trade: any }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const voteMutation = trpc.favorites.voteOnCompletedTrade.useMutation({
    onSuccess: async () => {
      await utils.favorites.getCompletedTrades.invalidate();
    },
  });
  const goodVotes = Number(trade.goodVotes ?? 0);
  const badVotes = Number(trade.badVotes ?? 0);
  const totalVotes = Number(trade.totalVotes ?? goodVotes + badVotes);
  const goodPercent = totalVotes > 0 ? Math.round((goodVotes / totalVotes) * 100) : null;
  const submitVote = (vote: "good" | "bad") => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    voteMutation.mutate({ proposalId: Number(trade.id), vote });
  };
  return (
    <section className="border-t border-[#b5cbe5] bg-white px-4 py-4 sm:px-5 lg:px-8" aria-label="Community trade vote">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <span className="text-sm font-semibold text-[#31568f]">How was this trade?</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => submitVote("good")}
            disabled={voteMutation.isPending}
            aria-pressed={trade.viewerVote === "good"}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3974bb] disabled:cursor-wait disabled:opacity-60 ${trade.viewerVote === "good" ? "border-emerald-600 bg-emerald-100 text-emerald-800" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            <span>Good Trade</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{goodVotes}</span>
          </button>
          <button
            type="button"
            onClick={() => submitVote("bad")}
            disabled={voteMutation.isPending}
            aria-pressed={trade.viewerVote === "bad"}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3974bb] disabled:cursor-wait disabled:opacity-60 ${trade.viewerVote === "bad" ? "border-rose-600 bg-rose-100 text-rose-800" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            <span>Bad Trade</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{badVotes}</span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        {totalVotes > 0 ? `Community votes: ${goodPercent}% Good Trade · ${totalVotes} vote${totalVotes === 1 ? "" : "s"}` : "No community votes yet"}
        {!isAuthenticated ? " · Sign in to vote" : ""}
      </p>
    </section>
  );
}

function TradeCard({ trade }: { trade: any }) {
  const exchange = buildTradeShowcaseExchange(trade);
  const hasItems = exchange.left.items.length > 0 || exchange.right.items.length > 0;
  const hasCash = exchange.left.cashPaid > 0 || exchange.right.cashPaid > 0;

  return (
    <article className="ticket-card w-full overflow-hidden border-4 border-[#3974bb] bg-[#f8fafc] shadow-sm transition-shadow duration-300 hover:shadow-md">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b5cbe5] bg-[#dce8f7] px-4 py-3 text-[#153d7a] sm:px-5">
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-[#315ea7]" aria-hidden="true" />
          <span className="font-mono text-xs font-bold">{trade.tradeReferenceNumber || `TR-${String(trade.id).padStart(6, "0")}`}</span>
        </div>
        <span className="text-xs font-semibold text-[#31568f]">{formatTradeDate(trade.completedAt)}</span>
      </header>

      {!hasItems && !hasCash ? (
        <div className="flex min-h-32 items-center justify-center px-4 py-8 text-sm text-slate-500">No public item details available.</div>
      ) : (
        <div className="grid min-w-0 gap-2 overflow-hidden px-4 py-5 sm:px-5 lg:px-8 lg:py-6 lg:grid-cols-[minmax(9rem,0.9fr)_1px_minmax(12rem,1.25fr)_auto_1px_minmax(8rem,0.75fr)_1px_auto_minmax(12rem,1.25fr)_1px_minmax(9rem,0.9fr)] lg:items-center lg:gap-1">
          <TradeMember member={exchange.left.member} />
          <TicketDivider wide />
          <TradeItemList items={exchange.left.items} cashPaid={exchange.left.cashPaid} />
          <DirectionMarker side="left" />
          <TicketDivider wide />
          <div className="flex items-center justify-center py-2" aria-label="Trade complete">
            <img src="/manus-storage/trade-quality-seal-transparent_fdff2d58.png" alt="Trade Quality seal" className="h-36 w-40 object-contain sm:h-44 sm:w-48 lg:h-48 lg:w-52" loading="lazy" />
          </div>
          <TicketDivider wide />
          <DirectionMarker side="right" />
          <TradeItemList items={exchange.right.items} cashPaid={exchange.right.cashPaid} />
          <TicketDivider wide />
          <TradeMember member={exchange.right.member} />
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#b5cbe5] bg-[#edf4fb] px-4 py-3 text-xs font-semibold text-[#31568f] sm:text-sm">
        <span>Completed exchange</span>
        {hasItems ? <span>{exchange.left.items.length + exchange.right.items.length} item{exchange.left.items.length + exchange.right.items.length === 1 ? "" : "s"} exchanged</span> : null}
        {hasCash ? <span>Cash included</span> : null}
      </footer>
      <TradeVoteControls trade={trade} />
    </article>
  );
}

export default function TradeShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | TradebiliaCategorySlug>("all");
  const [sortBy, setSortBy] = useState<"recent" | "items">("recent");

  const tradesQuery = trpc.favorites.getCompletedTrades.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    sortBy,
    limit: 50,
    offset: 0,
  }, { staleTime: 1000 * 60 * 5 });

  const trades = tradesQuery.data?.trades || [];

  return (
    <div className="min-h-screen bg-[#f7f4ee]">
      <TopBar logoUrl="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg" searchPlaceholder="Search Tradebilia..." />

      {/* Hero — same as homepage */}
      <section
        className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white"
        style={{
          backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 lg:h-80">
          <div className="flex w-full max-w-6xl items-center justify-center">
            <img src="https://assets.tradebilia.com/TRADERSSHOWCASE_5db346d5.svg" alt="Traders Showcase" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <CategoryBar />

      {/* Page header */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-medium text-[#2d241e] flex items-center gap-3">
              <Handshake className="w-8 h-8 text-purple-600" />
              Trade Showcase
            </h1>
            <p className="text-gray-500 text-sm mt-1">Browse all completed trades on the Tradebilia platform</p>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "items")}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="recent">Most Recent</option>
              <option value="items">Most Items</option>
            </select>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-purple-400 hover:text-purple-600"
            }`}
          >
            All Trades
          </button>
          {tradebiliaCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? "all" : cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.value
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-purple-400 hover:text-purple-600"
              }`}
            >
              <span>{CATEGORY_ICONS[cat.value]}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trade cards grid */}
      <div className="w-full px-4 pb-16 sm:px-6 lg:px-8">
        {tradesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading trades...
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Handshake className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No completed trades yet</h3>
            <p className="text-gray-400">
              {selectedCategory !== "all"
                ? `No completed trades found in the ${tradebiliaCategories.find(c => c.value === selectedCategory)?.label} category.`
                : "Be the first to complete a trade on Tradebilia!"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-5">
              {trades.length} completed trade{trades.length !== 1 ? "s" : ""}
              {selectedCategory !== "all" ? ` in ${tradebiliaCategories.find(c => c.value === selectedCategory)?.label}` : ""}
            </p>
            <div className="grid grid-cols-1 gap-5">
              {trades.map((trade: any) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

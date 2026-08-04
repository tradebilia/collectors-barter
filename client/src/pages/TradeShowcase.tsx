import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { tradebiliaCategories } from "@/lib/tradebilia";
import { Handshake, TrendingUp, ArrowUpDown } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  comics: "📚",
  sports_cards: "🏆",
  vintage_toys: "🧸",
  video_games: "🎮",
  stamps: "📮",
  coins: "🪙",
  pokemon: "⚡",
  movies: "🎬",
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

function Avatar({ url, name, size = "sm" }: { url?: string | null; name?: string | null; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs";
  const initial = (name || "?")[0].toUpperCase();
  if (url) return <img src={url} alt={name || ""} className={`${sz} rounded-full object-cover border-2 border-white/20`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/20`}>
      {initial}
    </div>
  );
}

function TradeCard({ trade }: { trade: any }) {
  const allItems = [
    ...(trade.requestedListingImage || trade.requestedListingTitle ? [{
      id: trade.requestedListingId,
      title: trade.requestedListingTitle,
      category: trade.requestedListingCategory,
      estimatedValue: trade.requestedListingValue,
      imageUrl: trade.requestedListingImage,
    }] : []),
    ...(trade.offeredItems || []).map((i: any) => ({ ...i, imageUrl: i.imageUrl })),
  ];

  const totalValue = parseFloat(trade.totalValue || "0");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a0d2e] to-[#0d1a3a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-purple-400" />
          <span className="text-white text-xs font-bold font-mono">{trade.tradeReferenceNumber || `TR-${String(trade.id).padStart(6, "0")}`}</span>
        </div>
        <span className="text-gray-400 text-[10px]">{formatTradeDate(trade.completedAt)}</span>
      </div>

      {/* Items grid */}
      <div className="p-4">
        {allItems.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">No item details available</div>
        ) : (
          <div className={`grid gap-2 ${allItems.length === 1 ? "grid-cols-1" : allItems.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
            {allItems.slice(0, 6).map((item: any, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 group">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-28 object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center text-gray-300 text-3xl bg-gray-50">
                    {CATEGORY_ICONS[item.category] || "📦"}
                  </div>
                )}
                <div className="p-1.5">
                  <p className="text-gray-800 text-[10px] font-semibold leading-tight line-clamp-2">{item.title}</p>
                  {item.estimatedValue && parseFloat(item.estimatedValue) > 0 && (
                    <p className="text-purple-600 text-[10px] font-bold mt-0.5">${parseFloat(item.estimatedValue).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
            {allItems.length > 6 && (
              <div className="rounded-xl bg-gray-100 border border-gray-200 h-28 flex items-center justify-center">
                <span className="text-gray-500 text-sm font-bold">+{allItems.length - 6} more</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — traders */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar url={trade.requesterAvatarUrl} name={trade.requesterDisplayName} />
          <span className="text-gray-700 text-xs font-semibold">{trade.requesterDisplayName || "Trader"}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            <div className="h-px w-8 bg-gray-300" />
            <Handshake className="w-4 h-4 text-purple-500" />
            <div className="h-px w-8 bg-gray-300" />
          </div>
          {totalValue > 0 && (
            <span className="text-[10px] text-gray-400 font-medium">${totalValue.toLocaleString()} total</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-700 text-xs font-semibold">{trade.recipientDisplayName || "Trader"}</span>
          <Avatar url={trade.recipientAvatarUrl} name={trade.recipientDisplayName} />
        </div>
      </div>
    </div>
  );
}

export default function TradeShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "value" | "items">("recent");

  const tradesQuery = trpc.favorites.getCompletedTrades.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    sortBy,
    limit: 50,
    offset: 0,
  }, { staleTime: 1000 * 60 * 5 });

  const trades = tradesQuery.data?.trades || [];

  return (
    <div className="min-h-screen bg-[#f7f4ee]">
      <TopBar logoUrl="/manus-storage/tradebilia-logo_12c07bbf.svg" searchPlaceholder="Search Tradebilia..." />

      {/* Hero — same as homepage */}
      <section
        className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white"
        style={{
          backgroundImage: "url(/manus-storage/Background_48b923f1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 lg:h-80">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img src="/manus-storage/TRADERSSHOWCASE_826bf6f2.svg" alt="Traders Showcase" className="h-auto w-full" />
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
              onChange={(e) => setSortBy(e.target.value as "recent" | "value" | "items")}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="recent">Most Recent</option>
              <option value="value">Highest Value</option>
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
      <div className="container mx-auto px-4 pb-16">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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

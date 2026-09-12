import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { getTradebiliaCategoryLabel, getAvatarInitials, formatItemValue } from "@/lib/tradebilia";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { RankingPageHero } from "@/components/RankingPageHero";

const RANKING_PAGE_SIZE = 24;

type ListingMetric = "most_viewed" | "most_favorited" | "highest_value";

const listingRankingConfig: Record<ListingMetric, {
  heroTitle: string;
  heading: string;
  description: string;
  metricLabel: string;
}> = {
  most_viewed: {
    heroTitle: "Most Viewed",
    heading: "All Most Viewed Listings",
    description: "Every active public listing, ranked by view count.",
    metricLabel: "views",
  },
  most_favorited: {
    heroTitle: "Most Favorited",
    heading: "All Most Favorited Listings",
    description: "Every active public listing, ranked by favorites received.",
    metricLabel: "favorites",
  },
  highest_value: {
    heroTitle: "Highest Listed Values",
    heading: "All Highest Listed Values",
    description: "Every active public listing, ranked by the seller’s listed trade value.",
    metricLabel: "listed trade value",
  },
};

function resultRange(total: number, page: number, pageSize: number) {
  if (total === 0) return "0 listings";
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return `Showing ${first}–${last} of ${total} listings`;
}

function DirectoryPagination({ page, total, onPageChange, noun = "listings" }: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE));
  const rangeText = noun === "listings"
    ? resultRange(total, page, RANKING_PAGE_SIZE)
    : total === 0
      ? `0 ${noun}`
      : `Showing ${(page - 1) * RANKING_PAGE_SIZE + 1}–${Math.min(total, page * RANKING_PAGE_SIZE)} of ${total} ${noun}`;
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-700">{rangeText} <span className="font-normal text-slate-500">· Page {page} of {pageCount}</span></p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ListingRankingDirectory({ metric }: { metric: ListingMetric }) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const config = listingRankingConfig[metric];
  const queryInput = useMemo(() => ({
    metric,
    limit: RANKING_PAGE_SIZE,
    offset: (page - 1) * RANKING_PAGE_SIZE,
  }), [metric, page]);
  const rankingQuery = trpc.market.rankedListings.useQuery(queryInput);
  const items = rankingQuery.data?.items ?? [];
  const total = rankingQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE));

  const changePage = (nextPage: number) => {
    const clampedPage = Math.min(Math.max(nextPage, 1), pageCount);
    if (clampedPage !== page) setPage(clampedPage);
  };

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <RankingPageHero title={config.heroTitle} />
      <CategoryBar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Complete ranking</p>
            <h1 className="mt-1 text-4xl font-bold text-[#2d241e]">{config.heading}</h1>
            <p className="mt-2 text-gray-600">{config.description}</p>
          </div>
          {!rankingQuery.isLoading && <p className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-800">{total.toLocaleString()} active listing{total === 1 ? "" : "s"}</p>}
        </div>

        {rankingQuery.isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-gray-500">No active public listings are available for this ranking yet.</p></CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4">
              {items.map((item: any, index: number) => {
                const imageUrl = resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl });
                const rank = queryInput.offset + index + 1;
                const metricValue = metric === "highest_value"
                  ? formatItemValue(item.estimatedValue)
                  : metric === "most_favorited"
                    ? Number(item.favoriteCount ?? 0).toLocaleString()
                    : Number(item.viewCount ?? 0).toLocaleString();
                return (
                  <button
                    key={`${item.id}-${rank}`}
                    type="button"
                    onClick={() => setLocation(`/listings/${item.id}`)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">#{rank}</span>
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100"><img src={imageUrl} alt={item.title} className="h-full w-full object-cover" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0"><h2 className="truncate text-lg font-semibold text-[#2d241e]">{item.title}</h2><p className="mt-1 text-sm text-gray-600">{getTradebiliaCategoryLabel(item.category)}</p></div>
                          <div className="shrink-0 text-left sm:text-right"><p className="text-2xl font-bold text-violet-700">{metricValue}</p><p className="text-xs text-gray-500">{config.metricLabel}</p></div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <DirectoryPagination page={page} total={total} onPageChange={changePage} />
          </>
        )}
      </main>
    </div>
  );
}

function RatedTradersDirectory() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const queryInput = useMemo(() => ({ limit: RANKING_PAGE_SIZE, offset: (page - 1) * RANKING_PAGE_SIZE }), [page]);
  const rankingQuery = trpc.favorites.getRatedTradersDirectory.useQuery(queryInput);
  const traders = rankingQuery.data?.traders ?? [];
  const total = rankingQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE));

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <RankingPageHero title="Top Rated Traders" />
      <CategoryBar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Complete ranking</p><h1 className="mt-1 text-4xl font-bold text-[#2d241e]">All Top Rated Traders</h1><p className="mt-2 text-gray-600">Every public member, ranked by Tradebilia Rating, review count, and completed trades.</p></div>
          {!rankingQuery.isLoading && <p className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-800">{total.toLocaleString()} public member{total === 1 ? "" : "s"}</p>}
        </div>
        {rankingQuery.isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : traders.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-gray-500">No public members are available for this ranking yet.</p></CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4">
              {traders.map((trader: any, index: number) => {
                const rank = queryInput.offset + index + 1;
                const initials = getAvatarInitials({ firstName: trader.firstName, lastName: trader.lastName, displayName: trader.displayName });
                const rating = Number(trader.averageRating);
                return <button key={`trader-${trader.id}`} type="button" onClick={() => setLocation(`/profile/${trader.id}`)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-lg">
                  <div className="flex items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">#{rank}</span><Avatar className="h-16 w-16 shrink-0 border border-gray-300"><AvatarImage src={trader.avatarUrl || undefined} alt={trader.displayName} /><AvatarFallback className="bg-[#7f31ff] text-sm font-semibold text-white">{initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold text-[#2d241e]">{trader.displayName || "Collector"}</h2><p className="mt-1 text-sm text-gray-600">{Number(trader.completedTrades ?? 0).toLocaleString()} completed trade{Number(trader.completedTrades ?? 0) === 1 ? "" : "s"} · {Number(trader.reviewCount ?? 0).toLocaleString()} review{Number(trader.reviewCount ?? 0) === 1 ? "" : "s"}</p></div><div className="shrink-0 text-right"><p className="text-2xl font-bold text-amber-600">{rating > 0 ? rating.toFixed(1) : "—"}</p><p className="text-xs text-gray-500">Tradebilia Rating</p></div></div>
                </button>;
              })}
            </div>
            <DirectoryPagination page={page} total={total} onPageChange={(nextPage) => setPage(Math.min(Math.max(nextPage, 1), pageCount))} noun="public members" />
          </>
        )}
      </main>
    </div>
  );
}

export function AllMostViewedRankings() { return <ListingRankingDirectory metric="most_viewed" />; }
export function AllMostFavoritedRankings() { return <ListingRankingDirectory metric="most_favorited" />; }
export function AllRatedTradersRankings() { return <RatedTradersDirectory />; }
export function AllHighestTradeValuesRankings() { return <ListingRankingDirectory metric="highest_value" />; }

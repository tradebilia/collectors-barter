import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { getTradebiliaCategoryLabel, getAvatarInitials, formatItemValue } from "@/lib/tradebilia";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { RankingPageHero } from "@/components/RankingPageHero";

export function AllMostViewedRankings() {
  const [, setLocation] = useLocation();
  const topMostViewedQuery = trpc.favorites.getTopMostViewed.useQuery();

  const mostViewedItemsData = (topMostViewedQuery.data?.items ?? []).length
    ? (topMostViewedQuery.data?.items ?? [])
    : [] as any[];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <RankingPageHero title="Most Viewed" />
      
      <CategoryBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d241e] mb-2">All Most Viewed Rankings</h1>
          <p className="text-gray-600">Browse all items ranked by view count</p>
        </div>

        {topMostViewedQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (mostViewedItemsData ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {mostViewedItemsData.map((item, index) => {
              const imageUrl = resolveTradebiliaListingImage({ 
                title: item.title, 
                category: item.category, 
                primaryPhotoUrl: item.primaryPhotoUrl 
              });
              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => setLocation(`/listings/${item.id}`)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-500 mb-1">#{index + 1}</div>
                          <h3 className="text-lg font-semibold text-[#2d241e] mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{getTradebiliaCategoryLabel(item.category)}</p>

                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-300">{item.viewCount}</div>
                          <div className="text-xs text-gray-500">views</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AllMostFavoritedRankings() {
  const [, setLocation] = useLocation();
  const topMostFavoritedQuery = trpc.favorites.getTopMostFavorited.useQuery();

  const mostFavoritedItemsData = (topMostFavoritedQuery.data?.items ?? []).length
    ? (topMostFavoritedQuery.data?.items ?? [])
    : [] as any[];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <RankingPageHero title="Most Favorited" />
      
      <CategoryBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d241e] mb-2">All Most Favorited Rankings</h1>
          <p className="text-gray-600">Browse all items ranked by favorite count</p>
        </div>

        {topMostFavoritedQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (mostFavoritedItemsData ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {mostFavoritedItemsData.map((item, index) => {
              const imageUrl = resolveTradebiliaListingImage({ 
                title: item.title, 
                category: item.category, 
                primaryPhotoUrl: item.primaryPhotoUrl 
              });
              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => setLocation(`/listings/${item.id}`)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-500 mb-1">#{index + 1}</div>
                          <h3 className="text-lg font-semibold text-[#2d241e] mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600">{getTradebiliaCategoryLabel(item.category)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-300">❤️ {item.favoriteCount}</div>
                          <div className="text-xs text-gray-500">favorites</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AllRatedTradersRankings() {
  const [, setLocation] = useLocation();
  const topRatedQuery = trpc.favorites.getTopRatedTraders.useQuery({ limit: 50 });

  const uniqueTraders = topRatedQuery.data?.traders ?? [];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <RankingPageHero title="Top Rated Traders" />
      
      <CategoryBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d241e] mb-2">All Rated Traders Rankings</h1>
          <p className="text-gray-600">Browse all traders ranked by trade activity</p>
        </div>

        {topRatedQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (uniqueTraders ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No traders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {uniqueTraders.map((trader: any, index: number) => {
              const initials = getAvatarInitials({ 
                firstName: (trader as any).firstName, 
                lastName: (trader as any).lastName, 
                displayName: trader.displayName 
              });
              const getRankingBadge = () => {
                if (index === 0) return { text: 'text-yellow-400 font-bold', label: '🥇' };
                if (index === 1) return { text: 'text-gray-300 font-bold', label: '🥈' };
                if (index === 2) return { text: 'text-orange-400 font-bold', label: '🥉' };
                return { text: 'text-gray-600', label: `${index + 1}` };
              };
              const badge = getRankingBadge();
              
              return (
                <button
                  key={`trader-${trader.id}`}
                  onClick={() => setLocation(`/profile/${trader.id}`)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full font-bold text-2xl ${badge.text}`}>
                      {badge.label}
                    </div>
                    <Avatar className="h-16 w-16 flex-shrink-0 border border-gray-300">
                      <AvatarImage src={trader.avatarUrl || undefined} alt={trader.displayName} />
                      <AvatarFallback className="bg-[#7f31ff] text-white text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#2d241e]">{trader.displayName}</h3>
                      <p className="text-sm text-gray-600">{trader.completedTrades || 0} trades completed</p>
                      <p className="text-xs text-gray-400">{trader.reviewCount || 0} review{Number(trader.reviewCount) !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-500">⭐ {Number(trader.averageRating) > 0 ? Number(trader.averageRating).toFixed(1) : 'N/A'}</div>
                      <div className="text-xs text-gray-500">Tradebilia Rating</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AllHighestTradeValuesRankings() {
  const [, setLocation] = useLocation();
  const topHighestValueItemsQuery = trpc.market.topHighestValueItems.useQuery();

  const highestTradeValueItems = (topHighestValueItemsQuery.data ?? []).length > 0
    ? topHighestValueItemsQuery.data
    : [] as any[];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <RankingPageHero title="Highest Trade Values" />
      
      <CategoryBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d241e] mb-2">All Highest Trade Values Rankings</h1>
          <p className="text-gray-600">Browse all items ranked by trade value</p>
        </div>

        {topHighestValueItemsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (highestTradeValueItems ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {(highestTradeValueItems ?? []).map((item: any, index: number) => {
              const imageUrl = resolveTradebiliaListingImage({ 
                title: item.title, 
                category: item.category, 
                primaryPhotoUrl: item.primaryPhotoUrl 
              });
              return (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => setLocation(`/listings/${item.id}`)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-500 mb-1">#{index + 1}</div>
                          <h3 className="text-lg font-semibold text-[#2d241e] mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600">{getTradebiliaCategoryLabel(item.category)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{formatItemValue(item.estimatedValue)}</div>
                          <div className="text-xs text-gray-500">trade value</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

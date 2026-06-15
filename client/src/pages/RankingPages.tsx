import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { getTradebiliaCategoryLabel, getAvatarInitials } from "@/lib/tradebilia";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

export function AllMostViewedRankings() {
  const [, setLocation] = useLocation();
  const topMostViewedQuery = trpc.favorites.getTopMostViewed.useQuery();

  const mostViewedItemsData = (topMostViewedQuery.data?.items ?? []).length
    ? (topMostViewedQuery.data?.items ?? [])
    : [] as any[];

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center drop-shadow-lg">Most Viewed Rankings</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-2 drop-shadow-md">Browse all items ranked by view count</p>
          </div>
        </div>
      </section>
      
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
                <div key={`${item.id}-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
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
                          <p className="text-sm font-semibold text-primary">${item.price}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-300">{item.viewCount}</div>
                          <div className="text-xs text-gray-500">views</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
      
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center drop-shadow-lg">Most Favorited Rankings</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-2 drop-shadow-md">Browse all items ranked by favorite count</p>
          </div>
        </div>
      </section>
      
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
                <div key={`${item.id}-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
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
                          <p className="text-sm font-semibold text-primary">${item.price}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-300">❤️ {item.favoriteCount}</div>
                          <div className="text-xs text-gray-500">favorites</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
  const marketplaceQuery = trpc.market.feed.useQuery({});

  const topTraderItemsData = (marketplaceQuery.data?.listings ?? []).length
    ? (marketplaceQuery.data?.listings ?? []).map((listing: any) => listing.owner)
    : [] as any[];

  // Remove duplicates and sort by trade count
  const uniqueTraders = Array.from(
    new Map(topTraderItemsData.map((trader: any) => [trader.id, trader])).values()
  ).sort((a: any, b: any) => (b.tradeCount || 0) - (a.tradeCount || 0));

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center drop-shadow-lg">Top Rated Traders Rankings</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-2 drop-shadow-md">Browse all traders ranked by trade activity</p>
          </div>
        </div>
      </section>
      
      <CategoryBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#2d241e] mb-2">All Rated Traders Rankings</h1>
          <p className="text-gray-600">Browse all traders ranked by trade activity</p>
        </div>

        {marketplaceQuery.isLoading ? (
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
                <div key={`trader-${trader.id}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
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
                      <p className="text-sm text-gray-600">{trader.tradeCount || 0} trades completed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-300">⭐ {(trader.averageRating || 0).toFixed(1)}</div>
                      <div className="text-xs text-gray-500">rating</div>
                    </div>
                  </div>
                </div>
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
      
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center drop-shadow-lg">Highest Trade Values Rankings</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-2 drop-shadow-md">Browse all items ranked by trade value</p>
          </div>
        </div>
      </section>
      
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
                <div key={`${item.id}-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow">
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
                          <p className="text-sm font-semibold text-primary">${item.price}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">${item.price}</div>
                          <div className="text-xs text-gray-500">trade value</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

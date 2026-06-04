import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { type TradebiliaCategorySlug } from "@/lib/tradebilia";


export function SearchResults() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [condition, setCondition] = useState<string>("all");

  // Parse query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location]);

  const searchQuery_trimmed = searchQuery.trim();
  const queryInput = searchQuery_trimmed.length > 0
    ? {
        query: searchQuery_trimmed,
        category: category !== "all" ? (category as TradebiliaCategorySlug) : undefined,
        condition: condition !== "all" ? (condition as any) : undefined,
      }
    : null;
  const { data: results, isLoading, error } = trpc.market.search.useQuery(
    queryInput as any,
    {
      enabled: queryInput !== null,
    },
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search Results</h1>
          {searchQuery_trimmed && (
            <p className="text-gray-600">
              Results for: <span className="font-semibold">{searchQuery_trimmed}</span>
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="comics">Comics</option>
            <option value="sports_cards">Sports Cards</option>
            <option value="vintage_toys">Vintage Toys</option>
            <option value="video_games">Video Games</option>
            <option value="stamps">Stamps</option>
            <option value="coins">Coins</option>
            <option value="pokemon">Pokemon</option>
            <option value="movies">Movies</option>
            <option value="autographs">Autographs</option>
            <option value="disney_pins">Disney Pins</option>
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Conditions</option>
            <option value="mint">Mint</option>
            <option value="near_mint">Near Mint</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading results. Please try again.</p>
          </div>
        ) : results?.listings && results.listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition">
                <div className="aspect-square bg-gray-200 overflow-hidden">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{listing.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{listing.category}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{listing.condition}</span>
                    <span className="font-bold text-blue-600">${listing.estimatedValue}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No results found for your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

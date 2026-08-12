import { useAuth } from "@/_core/hooks/useAuth";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Bell, Heart, Loader2, Mail, Search, ShieldCheck, Sparkles, Users, Star, ShoppingBag, CheckCircle2, UserMinus } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { getAvatarInitials } from "@/lib/tradebilia";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia_final_transparent_d37f9c4f.svg";

export default function Watchlist() {
  const { isAuthenticated, loading, user } = useAuth();
  const utils = trpc.useUtils();
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"items" | "traders">("items");

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const followedUsersQuery = trpc.market.getFollowedUsers.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async data => {
      toast.success(data.saved ? "Listing saved to Watchlist." : "Listing removed from Watchlist.");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const unfollowMutation = trpc.market.toggleFollowUser.useMutation({
    onSuccess: async () => {
      toast.success("Trader removed from your saved list.");
      await utils.market.getFollowedUsers.invalidate();
      await utils.market.isFollowingUser.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredWatchlist = useMemo(() => {
    const entries = dashboardQuery.data?.watchlist ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter(listing => {
      const haystack = [listing.title, listing.categoryLabel, listing.conditionLabel].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [dashboardQuery.data?.watchlist, keyword]);

  const followedUsers = (followedUsersQuery.data ?? []) as any[];
  const savedItemCount = dashboardQuery.data?.watchlist?.length ?? 0;
  const savedTraderCount = followedUsers.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,125,255,0.14),transparent_28%),linear-gradient(180deg,#050814_0%,#0b1220_34%,#101827_100%)] text-white">
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        searchPlaceholder="Search Tradebilia..."
      />

      <section className="border-b border-white/10 bg-[#00143A]" style={{
        backgroundImage: 'url(/manus-storage/Background_48b923f1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-4xl items-center justify-center -ml-32">
            <img src="/manus-storage/Watchlist_8816bd63.svg" alt="Watchlist" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/65 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-[2.45rem] font-medium tracking-[-0.035em] sm:text-[2.8rem] text-white">Watchlist</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-white/65">
              Track the items and traders you care about most, all in one place.
            </CardDescription>
          </CardHeader>

          {/* Tab navigation */}
          <div className="px-6 pb-0">
            <div className="flex gap-1 border-b border-white/10">
              <button
                onClick={() => setActiveTab("items")}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "items"
                    ? "border-indigo-400 text-indigo-300"
                    : "border-transparent text-white/50 hover:text-white/80 hover:border-white/30"
                }`}
              >
                <Heart className="inline-block mr-2 h-4 w-4" />
                Saved Items {isAuthenticated && !dashboardQuery.isLoading && `(${savedItemCount})`}
              </button>
              <button
                onClick={() => setActiveTab("traders")}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "traders"
                    ? "border-indigo-400 text-indigo-300"
                    : "border-transparent text-white/50 hover:text-white/80 hover:border-white/30"
                }`}
              >
                <Users className="inline-block mr-2 h-4 w-4" />
                Saved Traders {isAuthenticated && !followedUsersQuery.isLoading && `(${savedTraderCount})`}
              </button>
            </div>
          </div>

          <CardContent className="pt-6">
            {!isAuthenticated && !loading ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-lg text-white/80">Sign in to view your saved listings and traders.</p>
                <Button className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => (window.location.href = getLoginUrl())}>Subscriber Sign In</Button>
              </div>
            ) : activeTab === "items" ? (
              /* ── SAVED ITEMS TAB ── */
              dashboardQuery.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/80" /></div>
              ) : filteredWatchlist.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredWatchlist.map(listing => (
                    <Card key={listing.id} className="overflow-hidden rounded-[1.5rem] border-white/10 bg-white/5 text-white shadow-none">
                      <div className="aspect-[4/5] overflow-hidden bg-[linear-gradient(135deg,#f6efe3_0%,#ece5d7_100%)] bg-white p-2">
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/45">{listing.categoryLabel}</p>
                          <Link href={`/listings/${listing.id}`} className="mt-2 block text-xl font-semibold leading-tight text-white transition hover:text-indigo-200">
                            {listing.title}
                          </Link>
                          <p className="mt-2 text-sm text-white/65">{listing.categoryLabel} · {listing.conditionLabel}</p>
                          <p className="mt-3 text-sm font-medium text-indigo-200">Saved collectible for later review</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
                            <Link href={`/listings/${listing.id}`}>View listing</Link>
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">Trade proposal</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl rounded-[2rem]">
                              <DialogHeader>
                                <DialogTitle className="text-3xl">Trade from Watchlist</DialogTitle>
                                <DialogDescription>
                                  This saved item already routes into the live listing page where the full Trade Proposal flow begins.
                                </DialogDescription>
                              </DialogHeader>
                              <Button asChild className="rounded-full">
                                <Link href={`/listings/${listing.id}`}>Open listing detail</Link>
                              </Button>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10" disabled={watchlistMutation.isPending} onClick={() => watchlistMutation.mutate({ listingId: listing.id })}>
                            <Heart className="mr-2 h-4 w-4 fill-current text-pink-300" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <Heart className="mx-auto h-10 w-10 text-white/45" />
                  <p className="mt-4 text-2xl font-semibold text-white">Your Watchlist is empty</p>
                  <p className="mt-2 max-w-xl mx-auto text-base leading-7 text-white/65">
                    Save collectible listings from category pages or item detail pages, and they will appear here.
                  </p>
                  <Button asChild className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90">
                    <Link href="/">Browse marketplace</Link>
                  </Button>
                </div>
              )
            ) : (
              /* ── SAVED TRADERS TAB ── */
              followedUsersQuery.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/80" /></div>
              ) : followedUsers.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {followedUsers.map((trader: any) => (
                    <div key={trader.followId} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
                      {/* Trader header */}
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${trader.userId}`}>
                          <Avatar className="h-12 w-12 border-2 border-white/20 cursor-pointer hover:opacity-80 transition flex-shrink-0">
                            <AvatarImage src={trader.avatarUrl ?? undefined} alt={trader.displayName} />
                            <AvatarFallback className="bg-[#7f31ff] text-white font-bold">
                              {(trader.displayName || "C").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${trader.userId}`}>
                            <span className="font-semibold text-white hover:text-indigo-300 transition block truncate cursor-pointer">
                              {trader.displayName || `Collector #${trader.userId}`}
                            </span>
                          </Link>
                          {(trader.contactTown || trader.contactState) && (
                            <p className="text-xs text-white/50 truncate">
                              {[trader.contactTown, trader.contactState].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/5 px-2 py-2">
                          <p className="text-lg font-bold text-white">{trader.completedTrades ?? 0}</p>
                          <p className="text-[10px] text-white/50 leading-tight">Trades</p>
                        </div>
                        <div className="rounded-xl bg-white/5 px-2 py-2">
                          <p className="text-lg font-bold text-white">{trader.itemsListed ?? 0}</p>
                          <p className="text-[10px] text-white/50 leading-tight">Listed</p>
                        </div>
                        <div className="rounded-xl bg-white/5 px-2 py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <p className="text-lg font-bold text-white">{trader.avgRating ? parseFloat(trader.avgRating).toFixed(1) : '—'}</p>
                            {trader.avgRating && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mt-0.5" />}
                          </div>
                          <p className="text-[10px] text-white/50 leading-tight">{trader.reviewCount ?? 0} reviews</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 rounded-full bg-white text-slate-950 hover:bg-white/90 text-sm">
                          <Link href={`/profile/${trader.userId}`}>View Profile</Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full border-white/15 bg-transparent text-white/70 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/40 text-sm"
                          disabled={unfollowMutation.isPending}
                          onClick={() => unfollowMutation.mutate({ followingId: trader.userId })}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-white/45" />
                  <p className="mt-4 text-2xl font-semibold text-white">No saved traders yet</p>
                  <p className="mt-2 max-w-xl mx-auto text-base leading-7 text-white/65">
                    When you find a collector you trust, click "Save Trader" on their profile to follow them here.
                  </p>
                  <Button asChild className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90">
                    <Link href="/">Browse marketplace</Link>
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

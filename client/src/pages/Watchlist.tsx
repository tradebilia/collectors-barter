import { useAuth } from "@/_core/hooks/useAuth";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Bell, Heart, Loader2, Mail, Search, ShieldCheck, Sparkles } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo.svg";

const categoryLinks = [
  ["Comics", "comics"],
  ["Sports Cards", "sports_cards"],
  ["Vintage Toys", "vintage_toys"],
  ["Video Games", "video_games"],
  ["Stamps", "stamps"],
  ["Coins", "coins"],
  ["Pokemon", "pokemon"],
  ["Movies", "movies"],
  ["Autographs", "autographs"],
  ["Disney Pins", "disney_pins"],
] as const;

export default function Watchlist() {
  const { isAuthenticated, loading, user } = useAuth();
  const utils = trpc.useUtils();
  const [keyword, setKeyword] = useState("");

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async data => {
      toast.success(data.saved ? "Listing saved to Watchlist." : "Listing removed from Watchlist.");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,125,255,0.14),transparent_28%),linear-gradient(180deg,#050814_0%,#0b1220_34%,#101827_100%)] text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Link href="/" className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            Home
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-['Oswald'] text-[2.15rem] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[2.45rem]">Search</span>
            <div className="relative hidden min-w-[260px] sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={keyword} onChange={event => setKeyword(event.target.value)} className="h-9 rounded-sm border-0 bg-white pl-10 pr-3 text-sm text-slate-950" placeholder="Search watchlist..." />
            </div>
          </div>
          <TopRightIcons className="ml-auto flex items-center gap-3 md:gap-4" iconColor="text-white/85" />
        </div>
        <nav className="grid grid-cols-2 border-t border-white/10 bg-white text-center text-[11px] font-semibold text-black sm:grid-cols-5 lg:grid-cols-10">
          {categoryLinks.map(([label, slug]) => (
            <Link key={slug} href={`/category/${slug}`} className="border-r border-black/10 px-2 py-3 transition hover:bg-black hover:text-white last:border-r-0">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="border-b border-white/10 bg-[#00143A]" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-8 sm:py-10">
          <img src="/manus-storage/Watchlist_d3646db6.svg" alt="Watchlist" className="block h-[150px] w-auto object-contain sm:h-[180px] lg:h-[205px]" />
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="rounded-[1.75rem] border-white/10 bg-white/5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur">
              <CardHeader className="pb-4">
                <Badge className="w-fit rounded-full bg-white/10 px-3 py-1 text-white/80 hover:bg-white/10">Saved listings</Badge>
                <CardTitle className="mt-3 text-2xl">Standalone Watchlist</CardTitle>
                <CardDescription className="text-white/65">
                  A dedicated saved-items workspace that matches the rest of Tradebilia while giving your Watchlist its own route.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-white/72">
                <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-white/55">Member</p>
                  <p className="mt-2 text-xl font-semibold text-white">{user?.name || user?.email || "Subscriber"}</p>
                  <p className="mt-1 text-sm text-white/65">Revisit listings you want to compare, research, or propose trades on later.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    ["Saved items", String(dashboardQuery.data?.watchlist.length ?? 0)],
                    ["Active trades", String(dashboardQuery.data?.tradeProposals.filter(item => item.status !== "completed").length ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-white/60">{label as string}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{value as string}</p>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full rounded-full bg-white text-slate-950 hover:bg-white/90">
                  <Link href="/members">Find collectors</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>

          <Card className="rounded-[2rem] border-white/10 bg-slate-950/65 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl sm:text-4xl">Watchlist management</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-white/65">
                This page turns the Watchlist from an embedded dashboard section into a full page that feels aligned with the rest of the collector workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isAuthenticated && !loading ? (
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-lg text-white/80">Sign in to view your saved listings, compare opportunities, and remove items from your Watchlist.</p>
                  <Button className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => (window.location.href = getLoginUrl())}>Subscriber Sign In</Button>
                </div>
              ) : dashboardQuery.isLoading ? (
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
                    Save collectible listings from category pages or item detail pages, and they will appear here in a dedicated full-page workspace.
                  </p>
                  <Button asChild className="mt-5 rounded-full bg-white text-slate-950 hover:bg-white/90">
                    <Link href="/">Browse marketplace</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

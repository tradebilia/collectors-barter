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
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo_c676d640.svg";

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
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        searchPlaceholder="Search Tradebilia..."
      />

      <section className="border-b border-white/10 bg-[#00143A]" style={{
        backgroundImage: 'url(/images/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img src="/images/Watchlist_d3646db6.svg" alt="Watchlist" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/65 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-[2.45rem] font-medium tracking-[-0.035em] sm:text-[2.8rem] text-white">Watchlist management</CardTitle>
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
      </main>
    </div>
  );
}

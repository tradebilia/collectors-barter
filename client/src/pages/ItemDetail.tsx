import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { getTradebiliaCategoryTheme, getTradebiliaCategoryLabel } from "@/lib/tradebilia";
import { Heart, Loader2, MessageCircleMore, Menu, Search, Star, UserRound } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { CategoryBar } from "@/components/CategoryBar";
import { HeroSection } from "@/components/HeroSection";
import { useMemo, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";



function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "TB"
  );
}

export default function ItemDetail() {
  const [, params] = useRoute("/listings/:listingId");
  const listingId = Number(params?.listingId ?? 0);
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const listingDetailQuery = trpc.market.listingDetail.useQuery(
    { listingId },
    { enabled: Number.isFinite(listingId) && listingId > 0 },
  );

  const createProposalMutation = trpc.market.createTradeProposal.useMutation({
    onSuccess: async () => {
      toast.success("Trade Proposal sent.");
      await Promise.all([
        utils.market.listingDetail.invalidate({ listingId }),
        utils.market.dashboard.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async () => {
      await utils.market.listingDetail.invalidate({ listingId });
      toast.success("Watchlist updated.");
    },
    onError: error => toast.error(error.message),
  });

  const listing = listingDetailQuery.data?.listing;
  const similarListings = listing?.similarListings ?? [];

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const activePhoto = useMemo(() => {
    if (!listing) return null;
    if (!listing.photos?.length) {
      return {
        imageUrl: resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl }),
        altText: listing.title,
      };
    }
    return listing.photos[Math.min(activePhotoIndex, listing.photos.length - 1)] ?? null;
  }, [activePhotoIndex, listing]);

  const startTradeProposal = () => {
    if (!listing) return;
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    createProposalMutation.mutate({
      requestedListingId: listing.id,
      note: `I am interested in your ${listing.title} and would like to review a possible trade.`,
    });
  };

  const toggleWatchlist = () => {
    if (!listing) return;
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    watchlistMutation.mutate({ listingId: listing.id });
  };

  if (listingDetailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Tradebilia</p>
          <h1 className="mt-4 text-4xl font-semibold">This collectible could not be found.</h1>
          <Link href="/" className="mt-6 inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white">
            Return to the marketplace
          </Link>
        </div>
      </div>
    );
  }

  const categoryTheme = listing ? getTradebiliaCategoryTheme(listing.category) : null;
  const pageBackgroundClass = categoryTheme?.pageClassName ?? "bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white";

  return (
    <div className={`min-h-screen ${pageBackgroundClass}`}>
      <HeroSection />
      <CategoryBar />

      <main className="pb-16">

        <section className="px-4 py-10 lg:px-8 border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <div>
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-center bg-black/30 p-4" style={{ minHeight: "500px" }}>
                  <img src={activePhoto?.imageUrl ?? resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={activePhoto?.altText ?? listing.title} className="max-h-full max-w-full object-contain" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xl font-medium text-white/90">View additional images</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  {(listing.photos.length ? listing.photos : [{ imageUrl: resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl }), altText: listing.title }]).map((photo: any, index: number) => (
                    <button
                      key={`${photo.imageUrl}-${index}`}
                      type="button"
                      onClick={() => setActivePhotoIndex(index)}
                      className={`overflow-hidden rounded-[1.25rem] border transition ${index === activePhotoIndex ? "border-cyan-300 shadow-[0_0_0_3px_rgba(103,232,249,0.15)]" : "border-white/12"}`}
                    >
                      <img src={photo.imageUrl} alt={photo.altText ?? `${listing.title} ${index + 1}`} className="h-28 w-24 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-8 shadow-[0_40px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <Badge className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-cyan-100 hover:bg-cyan-300/10">
                  {getTradebiliaCategoryLabel(listing.category)}
                </Badge>
                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-white">{listing.title}</h1>
                <div className="mt-6 grid gap-4 text-lg text-white/85 sm:grid-cols-2">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/45">Condition</p>
                    <p className="mt-2 font-medium">{listing.condition}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/45">Listing status</p>
                    <p className="mt-2 font-medium capitalize">{listing.status}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/45">Saved by you</p>
                    <p className="mt-2 font-medium">{listing.savedToWatchlist ? "On your Watchlist" : "Not yet saved"}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/45">Listed</p>
                    <p className="mt-2 font-medium">{new Date(listing.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <Separator className="my-8 bg-white/10" />

                <div className="flex flex-wrap items-center justify-between gap-5">
                  <Link href={`/profile/${listing.ownerId}`} className="flex items-center gap-4 hover:opacity-80 transition">
                    <Avatar className="h-14 w-14 border border-white/15 cursor-pointer">
                      <AvatarImage src={listing.ownerProfile.avatarUrl ?? undefined} alt={listing.ownerProfile.displayName} />
                      <AvatarFallback className="bg-white/10 text-white">{initials(listing.ownerProfile.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-3xl font-medium text-white">{listing.ownerProfile.displayName}</p>
                      <p className="mt-1 text-sm text-white/55">Collector profile</p>
                    </div>
                  </Link>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-300">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-2xl font-semibold">{listing.ownerRating.averageRating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-white/55">{listing.ownerRating.reviewCount} Ratings and Reviews</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <Button onClick={startTradeProposal} className="h-14 rounded-[1rem] bg-teal-700 text-lg font-semibold text-white hover:bg-teal-600">
                    <MessageCircleMore className="mr-2 h-5 w-5" />
                    Trade Proposal
                  </Button>
                  <Button onClick={toggleWatchlist} variant="secondary" className="h-14 rounded-[1rem] bg-white/8 text-lg font-semibold text-white hover:bg-white/14">
                    <Heart className={`mr-2 h-5 w-5 ${listing.savedToWatchlist ? "fill-current text-pink-300" : ""}`} />
                    {listing.savedToWatchlist ? "Saved to Watchlist" : "Add to Watchlist"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Tabs defaultValue="description" className="space-y-8">
              <TabsList className="grid h-auto w-full rounded-[1.5rem] border border-white/10 bg-transparent p-0 text-white md:grid-cols-3">
                <TabsTrigger value="description" className="rounded-[1.25rem] px-6 py-4 text-base data-[state=active]:bg-teal-700 data-[state=active]:text-white">Description</TabsTrigger>
                <TabsTrigger value="owner-notes" className="rounded-[1.25rem] px-6 py-4 text-base data-[state=active]:bg-teal-700 data-[state=active]:text-white">Owner's Notes</TabsTrigger>
                <TabsTrigger value="similar-items" className="rounded-[1.25rem] px-6 py-4 text-base data-[state=active]:bg-teal-700 data-[state=active]:text-white">Similar Items</TabsTrigger>
              </TabsList>

              <TabsContent value="description">
                <Card className="rounded-[2rem] border-white/10 bg-black/20 text-white shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
                  <CardContent className="space-y-6 p-8">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-white/45">Description</p>
                      <h2 className="mt-4 text-4xl font-semibold tracking-tight">{listing.title}</h2>
                    </div>
                    <p className="max-w-4xl text-lg leading-8 text-white/82">{listing.description}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Category</p>
                        <p className="mt-3 text-xl font-medium">{getTradebiliaCategoryLabel(listing.category)}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Condition</p>
                        <p className="mt-3 text-xl font-medium">{listing.condition}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Collector</p>
                        <p className="mt-3 text-xl font-medium">{listing.ownerProfile.displayName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="owner-notes">
                <Card className="rounded-[2rem] border-white/10 bg-black/20 text-white shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
                  <CardContent className="p-8">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/45">Owner's Notes</p>
                    <p className="mt-5 max-w-4xl text-lg leading-8 text-white/82">{listing.description}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="similar-items">
                <Card className="rounded-[2rem] border-white/10 bg-black/20 text-white shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-white/45">Similar Items</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight">More from {getTradebiliaCategoryLabel(listing.category)}</h2>
                      </div>
                    </div>
                    <ScrollArea className="mt-8 w-full">
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {similarListings.map(item => (
                          <Link key={item.id} href={`/listings/${item.id}`} className="block overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:bg-white/10">
                            <div className="aspect-[0.82] bg-black/20">
                              <img src={resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl })} alt={item.title} className="h-full w-full object-cover" />
                            </div>
                            <div className="space-y-3 p-5">
                              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{getTradebiliaCategoryLabel(item.category)}</p>
                              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                              <p className="text-sm text-white/65">{item.owner.displayName}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
}

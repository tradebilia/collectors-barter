import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { getTradebiliaCategoryTheme, getTradebiliaCategoryLabel } from "@/lib/tradebilia";

const getItemDetailPageClassName = (category: string): string => {
  // For item detail pages, remove the teal portion (0-14%) and start with the content color
  if (category === 'sports_cards') {
    return 'bg-[#ead6ac] text-[#1a1814]';
  }
  if (category === 'comics') {
    return 'bg-[linear-gradient(180deg,#281013_0%,#121116_100%)] text-white';
  }
  if (category === 'video_games') {
    return 'bg-[linear-gradient(180deg,#0a3a1a_0%,#051a0d_100%)] text-[#d8ffbc]';
  }
  if (category === 'vintage_toys') {
    return 'bg-[linear-gradient(180deg,#3d3d3d_0%,#2a2a2a_100%)] text-[#f8efc8]';
  }
  if (category === 'coins') {
    return 'bg-[linear-gradient(180deg,#1a1a1a_0%,#0f0f0f_100%)] text-white';
  }
  if (category === 'stamps') {
    return 'bg-[linear-gradient(180deg,#1a1a1a_0%,#0f0f0f_100%)] text-white';
  }
  if (category === 'pokemon') {
    return 'bg-[linear-gradient(180deg,#0a3a1a_0%,#051a0d_100%)] text-[#d8ffbc]';
  }
  if (category === 'movies') {
    return 'bg-[linear-gradient(180deg,#1a1a1a_0%,#0f0f0f_100%)] text-white';
  }
  if (category === 'autographs') {
    return 'bg-[linear-gradient(180deg,#1a1a1a_0%,#0f0f0f_100%)] text-white';
  }
  if (category === 'disney_pins') {
    return 'bg-[linear-gradient(180deg,#1a1a1a_0%,#0f0f0f_100%)] text-white';
  }
  return 'bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white';
};
import { Heart, Loader2, MessageCircleMore, Menu, Search, Star, UserRound } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { CategoryBar } from "@/components/CategoryBar";
import { TopBar } from "@/components/TopBar";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { EmailInquiryModal } from "@/components/EmailInquiryModal";
import { useMemo, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo.svg";


const getCategoryWallpaperUrl = (category: string): string => {
  switch(category) {
    case 'sports_cards':
      return '/manus-storage/Sportscardwallpaper_bc1c7d7a.webp';
    case 'video_games':
      return '/manus-storage/video-games-background-kyx4vVUqTYCMC3kMbtokYU_c9f7dffa.webp';
    case 'coins':
      return '/manus-storage/CoinsBackground_ef9aac41.png';
    case 'stamps':
      return '/manus-storage/StampsBackground_381d3e98.png';
    case 'vintage_toys':
      return '/manus-storage/VintageToysBackground_8ab6860f.png';
    case 'autographs':
      return '/manus-storage/AutoBackground_d025a571.png';
    case 'movies':
      return '/manus-storage/VHSBackground_99756671.png';
    case 'comics':
      return '/manus-storage/comics-background-YZiiH2cyV8YJx6GFQj4PKC_2cc313bb.webp';
    case 'pokemon':
      return '/manus-storage/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj_d1df88b6.webp';
    case 'disney_pins':
      return '/manus-storage/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8_172dee25.webp';
    default:
      return '';
  }
};



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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

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
  const pageBackgroundClass = listing ? getItemDetailPageClassName(listing.category) : "bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white";

  return (
    <div className={`min-h-screen ${pageBackgroundClass}`}>
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        searchPlaceholder="Search Tradebilia..."
      />

      <main className="pb-16">
        <section className={`relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white ${categoryTheme?.heroClassName ?? 'bg-[#00143A]'}`} style={{
          backgroundImage: `url(${getCategoryWallpaperUrl(listing.category)})`,
          backgroundSize: 'cover',
          backgroundPosition: listing.category === 'movies' ? 'center top' : 'center',
          backgroundAttachment: 'scroll',
          backgroundRepeat: ['movies', 'comics', 'pokemon', 'video_games', 'disney_pins'].includes(listing.category) ? 'no-repeat' : 'repeat',
          filter: ['video_games', 'coins', 'stamps', 'vintage_toys', 'autographs', 'movies', 'comics', 'pokemon', 'disney_pins'].includes(listing.category) ? 'contrast(1.2) saturate(1.1)' : 'none'
        }}>
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
            <div className="flex w-full max-w-5xl items-center justify-center px-4">
              <img
                src={TRADEBILIA_LOGO_URL}
                alt="Tradebilia"
                className="h-auto w-full max-h-64 sm:max-h-72 lg:max-h-80"
              />
            </div>
          </div>
        </section>

        <CategoryBar />

        <section className="px-4 py-10 lg:px-8">
          <div className="mx-auto max-w-6xl mb-8">
            <button
              onClick={() => window.location.href = `/category/${listing.category}`}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg border transition text-base font-semibold ${
                listing.category === 'sports_cards'
                  ? 'bg-white/10 border-white/30 text-black hover:bg-white/20'
                  : listing.category === 'comics'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : listing.category === 'video_games'
                  ? 'bg-[#68dc43]/20 border-[#68dc43]/40 text-[#d8ffbc] hover:bg-[#68dc43]/30'
                  : listing.category === 'vintage_toys'
                  ? 'bg-white/15 border-[#5f6762]/30 text-[#1e1d1a] hover:bg-white/25'
                  : listing.category === 'coins'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : listing.category === 'stamps'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : listing.category === 'pokemon'
                  ? 'bg-[#68dc43]/20 border-[#68dc43]/40 text-[#d8ffbc] hover:bg-[#68dc43]/30'
                  : listing.category === 'movies'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : listing.category === 'autographs'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : listing.category === 'disney_pins'
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : 'bg-white/10 border-white/30 text-black hover:bg-white/20'
              }`}
              title="Back to category"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>Back to {getTradebiliaCategoryLabel(listing.category)}</span>
            </button>
          </div>
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
              <div className="rounded-[2rem] border border-white/10 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <Badge className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-cyan-600 hover:bg-cyan-300/10">
                  {getTradebiliaCategoryLabel(listing.category)}
                </Badge>
                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-gray-900">{listing.title}</h1>
                <div className="mt-6 grid gap-4 text-lg text-gray-700 sm:grid-cols-2">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Condition</p>
                    <p className="mt-2 font-medium text-gray-900">{listing.condition}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Listing status</p>
                    <p className="mt-2 font-medium capitalize text-gray-900">{listing.status}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Saved by you</p>
                    <p className="mt-2 font-medium text-gray-900">{listing.savedToWatchlist ? "On your Watchlist" : "Not yet saved"}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Listed</p>
                    <p className="mt-2 font-medium text-gray-900">{new Date(listing.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <Separator className="my-8 bg-gray-200" />

                <div className="flex flex-wrap items-center justify-between gap-5">
                  <Link href={`/profile/${listing.ownerId}`} className="flex items-center gap-4 hover:opacity-80 transition">
                    <Avatar className="h-14 w-14 border border-gray-300 cursor-pointer">
                      <AvatarImage src={listing.ownerProfile.avatarUrl ?? undefined} alt={listing.ownerProfile.displayName} />
                      <AvatarFallback className="bg-gray-200 text-gray-900">{initials(listing.ownerProfile.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-3xl font-medium text-gray-900">{listing.ownerProfile.displayName}</p>
                      <p className="mt-1 text-sm text-gray-500">Collector profile</p>
                    </div>
                  </Link>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-600">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-2xl font-semibold">{listing.ownerRating.averageRating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{listing.ownerRating.reviewCount} Ratings and Reviews</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <span className="text-lg font-medium text-gray-700">Member Status:</span>
                  <OnlineIndicator sellerId={listing.ownerId} size="large" />
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Button onClick={startTradeProposal} className="h-12 rounded-[1rem] bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700">
                    <MessageCircleMore className="mr-0.5 h-4 w-4" />
                    Trade Proposal
                  </Button>
                  <Button onClick={() => setIsEmailModalOpen(true)} className="h-12 rounded-[1rem] bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                    <MessageCircleMore className="mr-0.5 h-4 w-4" />
                    Message Owner
                  </Button>
                  <Button onClick={toggleWatchlist} variant="secondary" className="h-12 rounded-[1rem] bg-gray-200 text-xs font-semibold text-gray-900 hover:bg-gray-300 whitespace-nowrap">
                    <Heart className={`mr-0.5 h-4 w-4 ${listing.savedToWatchlist ? "fill-current text-pink-500" : ""}`} />
                    {listing.savedToWatchlist ? "Saved" : "Add to Watchlist"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8 text-gray-900">
            {/* Description Section */}
            <div className="space-y-6 rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Description</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">{listing.title}</h2>
              </div>
              {/* Details Panel - Sections 1, 2, 3 */}
              <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Details</p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                  {/* Section 1: Category */}
                  <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">1. Category</p>
                    <p className="mt-3 text-xl font-medium text-gray-900">{getTradebiliaCategoryLabel(listing.category)}</p>
                  </div>
                  
                  {/* Section 2: Grading Company */}
                  {listing.certificationCompany && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">2. Grading Company</p>
                      <p className="mt-3 text-xl font-medium text-gray-900">{listing.certificationCompany}</p>
                    </div>
                  )}
                  
                  {/* Section 2: Grade */}
                  {listing.grade && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">2. Grade</p>
                      <p className="mt-3 text-xl font-medium text-gray-900">{listing.grade}</p>
                    </div>
                  )}
                  
                  {/* Section 3: Condition */}
                  <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">3. Condition</p>
                    <p className="mt-3 text-xl font-medium text-gray-900">{listing.condition}</p>
                  </div>
                  
                  {/* Section 4: Estimated Value */}
                  {listing.estimatedValue && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">4. Estimated Value</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-600">${listing.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  
                  {/* Category-specific fields from itemDetails */}
                  {listing.itemDetails && Object.entries(listing.itemDetails).map(([key, value]) => (
                    <div key={key} className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{key}</p>
                      <p className="mt-3 text-xl font-medium text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Additional Information */}
            {listing.itemDetails?.additional_notes && (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">4. Additional Information</p>
                <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-700">{listing.itemDetails.additional_notes}</p>
              </div>
            )}

            {/* Similar Items Section */}
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Similar Items</p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">More from {getTradebiliaCategoryLabel(listing.category)}</h2>
                </div>
              </div>
              <ScrollArea className="w-full">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {similarListings.map(item => (
                    <Link key={item.id} href={`/listings/${item.id}`} className="block overflow-hidden rounded-[1.5rem] border border-gray-200 bg-gray-50 transition hover:-translate-y-1 hover:bg-gray-100">
                      <div className="aspect-[0.82] bg-gray-100">
                        <img src={resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl })} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-3 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{getTradebiliaCategoryLabel(item.category)}</p>
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.owner.displayName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </section>
      </main>
      {listing && (
        <EmailInquiryModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          listing={{
            id: listing.id,
            title: listing.title,
            imageUrl: activePhoto?.imageUrl,
          }}
          recipientId={listing.ownerId}
        />
      )}
    </div>
  );
}

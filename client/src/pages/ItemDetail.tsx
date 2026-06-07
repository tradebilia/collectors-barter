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
  const [showEmailModal, setShowEmailModal] = useState(false);

  const activePhoto = useMemo(() => {
    if (!listing?.photos?.length) return null;
    return listing.photos[activePhotoIndex];
  }, [listing?.photos, activePhotoIndex]);

  if (listingDetailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Item not found</h1>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const wallpaperUrl = getCategoryWallpaperUrl(listing.category);

  const startTradeProposal = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (user?.id === listing.ownerId) {
      toast.error("You cannot trade with yourself");
      return;
    }
    setShowEmailModal(true);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800"
      style={{
        backgroundImage: wallpaperUrl ? `url('${wallpaperUrl}')` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95 pointer-events-none" />

      <TopBar />
      <CategoryBar />

      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link href={`/category/${listing.category}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to {getTradebiliaCategoryLabel(listing.category)}
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[80px_1fr_0.98fr]">
            {/* Thumbnails on the left */}
            <div className="flex flex-col gap-3 justify-start">
              {(listing.photos.length ? listing.photos : [{ imageUrl: resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl }), altText: listing.title }]).map((photo: any, index: number) => (
                <button
                  key={`${photo.imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActivePhotoIndex(index)}
                  className={`overflow-hidden rounded-[1rem] border transition ${index === activePhotoIndex ? "border-cyan-300 shadow-[0_0_0_3px_rgba(103,232,249,0.15)]" : "border-white/12"}`}
                >
                  <img src={photo.imageUrl} alt={photo.altText ?? `${listing.title} ${index + 1}`} className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>

            {/* Main image in the center */}
            <div>
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-center bg-black/30 p-4" style={{ minHeight: "500px" }}>
                  <img src={activePhoto?.imageUrl ?? resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={activePhoto?.altText ?? listing.title} className="max-h-full max-w-full object-contain" />
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
                  <Button className="h-12 rounded-[1rem] bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                    <MessageCircleMore className="mr-0.5 h-4 w-4" />
                    Message Owner
                  </Button>
                  <Button
                    onClick={() => watchlistMutation.mutate({ listingId })}
                    disabled={watchlistMutation.isPending}
                    className="h-12 rounded-[1rem] bg-gray-200 text-sm font-semibold text-gray-900 hover:bg-gray-300"
                  >
                    <Heart className={`mr-0.5 h-4 w-4 ${listing.savedToWatchlist ? "fill-current text-red-500" : ""}`} />
                    Add to Watchlist
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-6xl">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Description</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">{listing.title}</h2>
            </div>
            {/* Details Panel - Sections 1, 2, 3 */}
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)] mt-8">
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
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Grading Company</p>
                    <p className="mt-3 text-xl font-medium text-gray-900">{listing.certificationCompany}</p>
                  </div>
                )}
                
                {/* Section 4: Estimated Value */}
                {listing.estimatedValue && (
                  <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">4. Estimated Value</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-600">${listing.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                )}
                
                {/* Category-specific fields from itemDetails */}
                {listing.itemDetails && Object.entries(listing.itemDetails)
                  .filter(([key]) => key !== 'additional_notes') // Filter out additional_notes
                  .map(([key, value]) => (
                  <div key={key} className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{key}</p>
                    <p className="mt-3 text-xl font-medium text-gray-900">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Additional Information */}
            {listing.itemDetails?.additional_notes && (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)] mt-8">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">4. Additional Information</p>
                <p className="mt-4 text-lg text-gray-700">{listing.itemDetails.additional_notes}</p>
              </div>
            )}
          </div>

          {/* Similar Items */}
          {similarListings.length > 0 && (
            <div className="mx-auto mt-16 max-w-6xl">
              <h2 className="text-3xl font-semibold text-white mb-8">Similar Items</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {similarListings.map((item: any) => (
                  <Link key={item.id} href={`/listings/${item.id}`} className="group">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 transition hover:border-cyan-300/50">
                      <div className="relative overflow-hidden bg-black/30 pt-[100%]">
                        <img
                          src={resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl })}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{getTradebiliaCategoryLabel(item.category)}</p>
                        <h3 className="mt-2 font-semibold text-white group-hover:text-cyan-300 transition line-clamp-2">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-400">{item.ownerProfile?.displayName ?? 'Unknown'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailInquiryModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        recipientId={listing.ownerId}
        listing={listing}
      />

      <TopRightIcons />
    </div>
  );
}

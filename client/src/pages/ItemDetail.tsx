import { useAuth } from "@/_core/hooks/useAuth";

function useTrackView(listingId: number) {
  const trackViewMutation = trpc.favorites.trackView.useMutation();
  const trackedListingIdRef = useRef<number | null>(null);
  useEffect(() => {
    // Only track the view once per listingId. The mutation object returned by
    // useMutation() is not referentially stable, so it must NOT be in the
    // dependency array — doing so caused an infinite mutate -> re-render ->
    // mutate loop (~60+ requests per page view) that overwhelmed the server
    // and made item detail pages time out.
    if (listingId > 0 && trackedListingIdRef.current !== listingId) {
      trackedListingIdRef.current = listingId;
      trackViewMutation.mutate({ listingId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);
}
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { getTradebiliaCategoryTheme, getTradebiliaCategoryLabel, formatGrade } from "@/lib/tradebilia";

const getItemDetailPageClassName = (category: string): string => {
  // For item detail pages, use the content portion of the category page gradient
  if (category === 'sports_cards') {
    return 'bg-[#f6e5bf] text-[#1a1814]';
  }
  if (category === 'comics') {
    return 'bg-[linear-gradient(180deg,#281013_0%,#121116_100%)] text-white';
  }
  if (category === 'video_games') {
    return 'bg-[#0a2615] text-[#efffe2]';
  }
  if (category === 'vintage_toys') {
    return 'bg-[linear-gradient(180deg,#454342_0%,#c8c8c2_100%)] text-[#1e1d1a]';
  }
  if (category === 'coins') {
    return 'bg-[#e9decb] text-[#1d1712]';
  }
  if (category === 'stamps') {
    return 'bg-[#d9cadf] text-[#1e1725]';
  }
  if (category === 'pokemon') {
    return 'bg-[#f5d84a] text-[#1f2240]';
  }
  if (category === 'movies') {
    return 'bg-[#ead7bf] text-[#24150f]';
  }
  if (category === 'autographs') {
    return 'bg-[#f5e9dc] text-[#1a1410]';
  }
  if (category === 'disney_pins') {
    return 'bg-[#f5e9dc] text-[#1a1410]';
  }
  return 'bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white';
};
import { 
  Heart, 
  Loader2, 
  MessageCircleMore, 
  Menu, 
  Search, 
  Star, 
  UserRound,
  Facebook,
  Twitter,
  Link2,
  Check,
  Mail
} from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { CategoryBar } from "@/components/CategoryBar";
import { TopBar } from "@/components/TopBar";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { ComposeMessageModal } from "@/components/ComposeMessageModal";
import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";


const getConditionDisplayName = (condition: string): string => {
  const conditionMap: Record<string, string> = {
    'mint': 'Mint',
    'near_mint': 'Near Mint',
    'excellent': 'Excellent',
    'very_good': 'Very Good',
    'good': 'Good',
    'fair': 'Fair',
    'poor': 'Poor',
    'raw': 'Raw',
    'ungraded': 'Ungraded',
  };
  return conditionMap[condition?.toLowerCase()] || condition;
};

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const getCategoryWallpaperUrl = (category: string): string => {
  switch(category) {
    case 'sports_cards':
      return 'https://assets.tradebilia.com/SportsCardBackground_06cd6816.webp';
    case 'video_games':
      return 'https://assets.tradebilia.com/VideoGamesBackground_abb6b532.webp';
    case 'coins':
      return 'https://assets.tradebilia.com/CoinsBackground_cea1e610.png';
    case 'stamps':
      return 'https://assets.tradebilia.com/StampsBackground_580a838e.png';
    case 'vintage_toys':
      return 'https://assets.tradebilia.com/VintageToysBackground_46983e1a.png';
    case 'autographs':
      return 'https://assets.tradebilia.com/AutoBackground_a5b49e15.png';
    case 'movies':
      return 'https://assets.tradebilia.com/MoviesBackground_8ecc4916.png';
    case 'comics':
      return 'https://assets.tradebilia.com/ComicsBackground_80eb606d.webp';
    case 'pokemon':
      return 'https://assets.tradebilia.com/PokemonBackground_bce9fc91.webp';
    case 'disney_pins':
      return 'https://assets.tradebilia.com/DisneyPinsBackground_cfc008bc.webp';
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
  
  // Track view when page loads
  useTrackView(listingId);

  const listingDetailQuery = trpc.market.listingDetail.useQuery(
    { listingId },
    { enabled: Number.isFinite(listingId) && listingId > 0 },
  );

  const createProposalMutation = trpc.tradeFlow.initiateTradeProposal.useMutation({
    onSuccess: async () => {
      toast.success('Trade inquiry sent! The owner has been notified.');
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
  const [linkCopied, setLinkCopied] = useState(false);

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
      listingId: listing.id,
      message: `I am interested in your ${listing.title} and would like to review a possible trade.`,
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
        searchPlaceholder="Search Tradebilia..."
      />

      <main className="pb-16">
       <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
          backgroundImage: getCategoryWallpaperUrl(listing.category) ? `url(${getCategoryWallpaperUrl(listing.category)})` : 'url(https://assets.tradebilia.com/Background_23084d14.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
       }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
            <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
              <img
                src="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg"
                alt="Tradebilia"
                className="h-auto w-full drop-shadow-lg"
              />
            </div>
        </div>
        </section>

        <CategoryBar />

        <section className={`px-4 pt-4 pb-10 lg:px-8 relative ${getItemDetailPageClassName(listing.category)}`}>
          <div className="relative">
          {/* Back button — sits at the very left edge, outside the centered grid */}
          <div className="mb-4">
            <button
              onClick={() => window.location.href = `/category/${listing.category}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition text-sm font-semibold bg-white border-gray-300 text-black hover:bg-gray-50`}
              title="Back to category"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {getTradebiliaCategoryLabel(listing.category)}</span>
            </button>
          </div>
          <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            {/* Photo column */}
            <div className="flex flex-col gap-4">
              {/* Photo + thumbnails */}
              <div className="flex flex-col gap-4">
                {/* Main image with arrow navigation */}
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-center bg-black/30 p-4" style={{ minHeight: "500px" }}>
                    <img src={activePhoto?.imageUrl ?? resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={activePhoto?.altText ?? listing.title} className="max-h-full max-w-full object-contain" />
                  </div>
                  {listing.photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(i => (i - 1 + listing.photos.length) % listing.photos.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/75 transition backdrop-blur-sm"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(i => (i + 1) % listing.photos.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/75 transition backdrop-blur-sm"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {listing.photos.map((_: any, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActivePhotoIndex(i)}
                            className={`w-2 h-2 rounded-full transition ${i === activePhotoIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
                            aria-label={`Go to photo ${i + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails — centered below main image */}
                {listing.photos.length > 1 && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    {listing.photos.map((photo: any, index: number) => (
                      <button
                        key={`${photo.imageUrl}-${index}`}
                        type="button"
                        onClick={() => setActivePhotoIndex(index)}
                        className={`overflow-hidden rounded-[1rem] border-2 transition ${
                          index === activePhotoIndex
                            ? "border-cyan-400 shadow-[0_0_0_3px_rgba(103,232,249,0.2)]"
                            : "border-white/20 hover:border-white/50"
                        }`}
                      >
                        <img src={photo.imageUrl} alt={photo.altText ?? `${listing.title} photo ${index + 1}`} className="h-20 w-20 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <div className="rounded-[2rem] border border-white/10 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <Badge className="rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-gray-700 hover:bg-gray-200">
                    {getTradebiliaCategoryLabel(listing.category)}
                  </Badge>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Reference ID</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">#{listing.id}</p>
                  </div>
                </div>
                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-gray-900">{listing.title}</h1>
                <div className="mt-6 grid gap-4 text-lg text-gray-700 sm:grid-cols-2">
                  {listing.grade && listing.grade !== 'ungraded' && parseFloat(listing.grade) > 0 ? (
                    <div>
                      <p className="text-base font-bold uppercase tracking-[0.25em] text-gray-800">Numerical Grade</p>
                      <p className="mt-2 text-sm font-medium text-gray-500">{formatGrade(listing.grade)}</p>
                    </div>
                  ) : listing.condition ? (
                    <div>
                      <p className="text-base font-bold uppercase tracking-[0.25em] text-gray-800">Condition</p>
                      <p className="mt-2 text-sm font-medium text-gray-500">{getConditionDisplayName(listing.condition)}</p>
                    </div>
                  ) : null}
                  {listing.certificationCompany && (
                    <div>
                      <p className="text-base font-bold uppercase tracking-[0.25em] text-gray-800">Grading Company</p>
                      <p className="mt-2 text-sm font-medium text-gray-500">{listing.certificationCompany}</p>
                    </div>
                  )}
                  {listing.estimatedValue && (
                    <div>
                      <p className="text-base font-bold uppercase tracking-[0.25em] text-gray-800">Estimated Value</p>
                      <p className="mt-2 text-sm font-medium text-gray-500">${Math.round(listing.estimatedValue).toLocaleString('en-US')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-base font-bold uppercase tracking-[0.25em] text-gray-800">Listed</p>
                    <p className="mt-2 text-sm font-medium text-gray-500">{new Date(listing.createdAt).toLocaleDateString()}</p>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">Tradebilia Rating</p>
                    <p className="text-sm text-gray-500">{listing.ownerRating.reviewCount} Reviews</p>
                  </div>
                </div>

                {/* Verified Platforms */}
               {(listing.ownerProfile.merchantVerified || listing.ownerProfile.ebayVerified || listing.ownerProfile.facebookVerified || listing.ownerProfile.linkedinVerified) && (
                 <div className="flex items-center gap-2 mt-4">
                   <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Verified on:</span>
                    {listing.ownerProfile.merchantVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                        Merchant Verified
                      </span>
                    )}
                    {listing.ownerProfile.ebayVerified && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-sm" title="Connected eBay account">
                        <img src="https://assets.tradebilia.com/Ebaylogo_12a10426.png" alt="eBay" className="h-4 w-[48px] object-contain" />
                      </span>
                    )}
                    {listing.ownerProfile.facebookVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1877F2]/10 text-[#1877F2] text-xs font-bold border border-[#1877F2]/20">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                      </span>
                    )}
                    {listing.ownerProfile.linkedinVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-bold border border-[#0A66C2]/20">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        LinkedIn
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <span className="text-lg font-medium text-gray-700">Member Status:</span>
                  <OnlineIndicator sellerId={listing.ownerId} size="large" />
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Button 
                    onClick={startTradeProposal} 
                    disabled={createProposalMutation.isPending}
                    className={`h-12 rounded-[1rem] text-sm font-semibold text-white ${
                      createProposalMutation.isSuccess 
                        ? 'bg-yellow-600 hover:bg-yellow-700 cursor-default' 
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    <MessageCircleMore className="mr-0.5 h-4 w-4" />
                    {createProposalMutation.isSuccess ? 'Negotiating in Process' : createProposalMutation.isPending ? 'Sending...' : 'Trade Proposal'}
                  </Button>
                  <Button onClick={() => setIsEmailModalOpen(true)} className="h-12 rounded-[1rem] bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                    <MessageCircleMore className="mr-0.5 h-4 w-4" />
                    Message Owner
                  </Button>
                  <Button 
                    onClick={toggleWatchlist} 
                    variant="secondary" 
                    className={`h-12 rounded-[1rem] text-xs font-semibold whitespace-nowrap ${
                      listing.ownerId === user?.id 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100" 
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                    }`}
                    disabled={listing.ownerId === user?.id}
                    title={listing.ownerId === user?.id ? "You cannot favorite your own items" : ""}
                  >
                    <Heart className={`mr-0.5 h-4 w-4 ${listing.savedToWatchlist ? "fill-current text-pink-500" : ""}`} />
                    {listing.ownerId === user?.id ? "Cannot Favorite Own Item" : (listing.savedToWatchlist ? "Saved" : "Add to Watchlist")}
                  </Button>
                </div>

                {/* Social Share Row */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Share this listing</p>
                  <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                    {/* Facebook */}
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-[#1877F2] text-white text-xs font-semibold hover:bg-[#166fe5] transition whitespace-nowrap"
                      title="Share on Facebook"
                    >
                      <Facebook className="h-3.5 w-3.5" />
                      <span>FB</span>
                    </a>
                    {/* X / Twitter */}
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Check out this listing on Tradebilia: ${listing.title}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-gray-800 transition whitespace-nowrap"
                      title="Share on X"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      <span>X</span>
                    </a>
                    {/* Pinterest */}
                    <a
                      href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&description=${encodeURIComponent(`${listing.title} — listed on Tradebilia`)}&media=${encodeURIComponent(activePhoto?.imageUrl ?? '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-[#E60023] text-white text-xs font-semibold hover:bg-[#cc001f] transition whitespace-nowrap"
                      title="Pin on Pinterest"
                    >
                      {/* Pinterest uses a custom P icon — lucide doesn't have one */}
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                      <span>Pin</span>
                    </a>
                    {/* Reddit */}
                    <a
                      href={`https://www.reddit.com/submit?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(`${listing.title} — listed on Tradebilia`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-[#FF4500] text-white text-xs font-semibold hover:bg-[#e03d00] transition whitespace-nowrap"
                      title="Share on Reddit"
                    >
                      {/* Reddit alien icon */}
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                      <span>Reddit</span>

                    </a>
                    {/* Email */}
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Check out this listing: ${listing.title}`)}&body=${encodeURIComponent(`I found this listing on Tradebilia and thought you might be interested:\n\n${listing.title}\nEstimated Value: $${listing.estimatedValue ? Math.round(listing.estimatedValue).toLocaleString('en-US') : 'N/A'}\n\n${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-gray-600 text-white text-xs font-semibold hover:bg-gray-700 transition whitespace-nowrap"
                      title="Share via Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </a>
                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition whitespace-nowrap"
                      title="Copy link"
                    >
                      {linkCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span>{linkCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="px-4 lg:px-8">
          <div className="space-y-8 text-gray-900 px-4 lg:px-8">
            {/* Details Panel — Option 1: Classic 4-Column Zebra */}
            {(() => {
              // Build a flat ordered list of all fields to display
              // Keys stored in camelCase in itemDetails JSON (matching useAddInventoryForm.ts)
              const excludeFields = new Set([
                'certification_company', 'shipping_available', 'additional_notes', // legacy snake_case
                'certificationCompany', 'shippingAvailable', 'additionalNotes',   // camelCase (actual stored keys)
                'description',                                                     // shown in its own section
              ]);
                            const allFields: { label: string; value: string }[] = [];
              const isGradedListing = Boolean(listing.grade && listing.grade !== 'ungraded' && parseFloat(listing.grade) > 0);
              // Core fields first
              allFields.push({ label: 'Category', value: getTradebiliaCategoryLabel(listing.category) });
              if (!isGradedListing && listing.condition) allFields.push({ label: 'Condition', value: getConditionDisplayName(listing.condition) });
              if (listing.certificationCompany) allFields.push({ label: 'Grading Company', value: listing.certificationCompany });
              if (listing.estimatedValue) allFields.push({ label: 'Estimated Value', value: `$${listing.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` });
              if (listing.itemType) allFields.push({ label: 'Item Type', value: listing.itemType.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') });
              if (listing.signatures && listing.signatures.length > 0) allFields.push({ label: 'Signatures', value: listing.signatures.join(', ') });

              // Dynamic itemDetails fields
              if (listing.itemDetails) {
                for (const [key, value] of Object.entries(listing.itemDetails)) {
                  if (value && !excludeFields.has(key)) {
                    // Label overrides for specific fields
                    const labelOverrides: Record<string, string> = {
                      'stampGrade': 'Stamp Grade',
                      'grade': 'Numerical Grade',
                    };
                    const label = labelOverrides[key] ?? formatFieldName(key);
                    allFields.push({ label, value: String(value) });
                  }
                }
              }

              // NOTE: Description, Shipping, and Additional Notes are rendered
              // as their own separate section cards below this table — not here.

              // Group into rows of 4
              const rows: { label: string; value: string }[][] = [];
              for (let i = 0; i < allFields.length; i += 4) {
                rows.push(allFields.slice(i, i + 4));
              }

              return (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 bg-white">
                    <p className="text-lg font-bold uppercase tracking-widest text-gray-900">Details</p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((field, colIdx) => (
                            <td key={colIdx} className="px-5 py-3.5 border-r border-gray-100 last:border-r-0 w-1/4 align-top">
                              <span className="block text-base font-bold uppercase tracking-wider text-gray-800 mb-1">
                                {field.label}
                              </span>
                              <span className="block text-sm font-medium text-gray-500 break-words">{field.value}</span>
                            </td>
                          ))}
                          {/* Pad short last row to maintain column alignment */}
                          {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
                            <td key={`pad-${i}`} className={`w-1/4 border-r border-gray-100 last:border-r-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Description Section */}
            {listing.description && (
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <p className="text-lg font-bold uppercase tracking-widest text-gray-900">Description</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-base leading-7 text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>
              </div>
            )}

            {/* Shipping Section */}
            {(listing.itemDetails?.shippingAvailable || listing.itemDetails?.shipping_available) && (
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <p className="text-lg font-bold uppercase tracking-widest text-gray-900">Shipping Available</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-base font-medium text-gray-500 capitalize">
                    {String(listing.itemDetails.shippingAvailable ?? listing.itemDetails.shipping_available).replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Notes Section */}
            {listing.itemDetails?.additional_notes && (
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <p className="text-lg font-bold uppercase tracking-widest text-gray-900">Additional Notes</p>
                </div>
                <div className="px-6 py-5">
                  <p className="text-base leading-7 text-gray-700">{String(listing.itemDetails.additional_notes)}</p>
                </div>
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
      {listing && isEmailModalOpen && (
        <ComposeMessageModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipient={{
            id: listing.ownerId,
            displayName: listing.ownerProfile?.displayName || 'Seller',
            avatarUrl: listing.ownerProfile?.avatarUrl,
          }}
          defaultSubject={`Question about: ${listing.title}`}
          itemId={listing.id}
        />
      )}
    </div>
  );
}

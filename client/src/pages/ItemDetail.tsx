import { useAuth } from "@/_core/hooks/useAuth";

function useTrackView(listingId: number) {
  const trackViewMutation = trpc.favorites.trackView.useMutation();
  useEffect(() => {
    if (listingId > 0) {
      trackViewMutation.mutate({ listingId });
    }
  }, [listingId, trackViewMutation]);
}
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
import { Heart, Loader2, MessageCircleMore, Menu, Search, Star, UserRound } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { CategoryBar } from "@/components/CategoryBar";
import { TopBar } from "@/components/TopBar";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { EmailInquiryModal } from "@/components/EmailInquiryModal";
import { useMemo, useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo.svg";


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
  
  // Track view when page loads
  useTrackView(listingId);

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
          <div className={`absolute inset-0 ${listing.category === 'movies' ? 'bg-black/10' : 'bg-black/30'}`}></div>
          <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0 z-10">
            <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
              <img
                src={TRADEBILIA_LOGO_URL}
                alt="Tradebilia"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <CategoryBar />

        <section className={`px-4 py-10 lg:px-8 ${pageBackgroundClass} relative`}>
          <div className={`absolute inset-0 ${categoryTheme?.textureClassName ?? ''}`}></div>
          <div className="relative">
          <div className="mx-auto max-w-6xl mb-8">
            <button
              onClick={() => window.location.href = `/category/${listing.category}`}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg border transition text-base font-semibold bg-white border-gray-300 text-black hover:bg-gray-50`}
              title="Back to category"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>Back to {getTradebiliaCategoryLabel(listing.category)}</span>
            </button>
          </div>
          <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="flex gap-4">
              {/* Thumbnails on the left */}
              <div className="flex flex-col gap-3">
                {(listing.photos.length ? listing.photos : [{ imageUrl: resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl }), altText: listing.title }]).map((photo: any, index: number) => (
                  <button
                    key={`${photo.imageUrl}-${index}`}
                    type="button"
                    onClick={() => setActivePhotoIndex(index)}
                    className={`overflow-hidden rounded-[1.25rem] border transition ${index === activePhotoIndex ? "border-cyan-300 shadow-[0_0_0_3px_rgba(103,232,249,0.15)]" : "border-white/12"}`}
                  >
                    <img src={photo.imageUrl} alt={photo.altText ?? `${listing.title} ${index + 1}`} className="h-24 w-20 object-cover" />
                  </button>
                ))}
              </div>
              
              {/* Main image on the right */}
              <div className="flex-1">
                <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-center bg-black/30 p-4" style={{ minHeight: "500px" }}>
                    <img src={activePhoto?.imageUrl ?? resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={activePhoto?.altText ?? listing.title} className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
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
                  {listing.grade && listing.grade !== '0' && (
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Grade</p>
                      <p className="mt-2 font-medium text-gray-900">{listing.grade}</p>
                    </div>
                  )}
                  {listing.certificationCompany && (
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Grading Company</p>
                      <p className="mt-2 font-medium text-gray-900">{listing.certificationCompany}</p>
                    </div>
                  )}
                  {listing.estimatedValue && (
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-gray-500">Estimated Value</p>
                      <p className="mt-2 font-medium text-gray-900">${Math.round(listing.estimatedValue).toLocaleString('en-US')}</p>
                    </div>
                  )}
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
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="px-4 lg:px-8">
          <div className="space-y-8 text-gray-900 px-4 lg:px-8">
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
                  
                  {/* Section 3: Estimated Value */}
                  {listing.estimatedValue && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">3. Estimated Value</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-600">${listing.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  
                  {/* Category-specific fields from itemDetails */}
                  
                  {/* Item Type */}
                  {listing.itemType && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Item Type</p>
                      <p className="mt-3 text-xl font-medium text-gray-900">{listing.itemType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                    </div>
                  )}
                  
                  {/* Signatures */}
                  {listing.signatures && listing.signatures.length > 0 && (
                    <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Signatures</p>
                      <p className="mt-3 text-xl font-medium text-gray-900">{listing.signatures.join(', ')}</p>
                    </div>
                  )}
                  
                  {/* Category-specific fields from itemDetails - grouped by related fields */}
                  {listing.itemDetails && (() => {
                    const entries = Object.entries(listing.itemDetails).filter(([, v]) => v);
                    const rendered = new Set<string>();
                    
                    // Define field groupings - related fields that should appear together
                    const fieldGroups = [
                      ['first_appearance', 'character_name'],
                      ['is_graded', 'grade'],
                      ['issue_number', 'publication_year'],
                      ['key_issue', 'number_of_signatures']
                    ];
                    
                    // Fields to exclude (redundant or already shown elsewhere)
                    const excludeFields = new Set(['certification_company']);
                    
                    const result = [];
                    
                    // Render grouped fields
                    for (const group of fieldGroups) {
                      const groupFields = group.filter(f => entries.some(([k]) => k === f) && !rendered.has(f) && !excludeFields.has(f));
                      if (groupFields.length > 0) {
                        result.push(
                          <div key={`group-${group.join('-')}`} className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5 lg:col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                              {groupFields.map(fieldName => {
                                const value = entries.find(([k]) => k === fieldName)?.[1];
                                rendered.add(fieldName);
                                return (
                                  <div key={fieldName}>
                                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500 font-semibold">{formatFieldName(fieldName)}</p>
                                    <p className="mt-2 text-base font-medium text-gray-900">{String(value)}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    }
                    
                    // Render remaining ungrouped fields
                    for (const [key, value] of entries) {
                      if (!rendered.has(key) && !excludeFields.has(key)) {
                        result.push(
                          <div key={key} className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
                            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{formatFieldName(key)}</p>
                            <p className="mt-3 text-xl font-medium text-gray-900">{String(value)}</p>
                          </div>
                        );
                      }
                    }
                    
                    return result;
                  })()}
                </div>
            </div>

            {/* Description Section */}
            {listing.description && (
              <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_40px_90px_rgba(0,0,0,0.08)]">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Description</p>
                <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

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

import { useAuth } from "@/_core/hooks/useAuth";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { getTradebiliaCategoryLabel, getAvatarInitials, formatGrade } from "@/lib/tradebilia";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { 
  Heart, 
  Loader2, 
  MessageSquareText, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  ArrowRightLeft, 
  Clock3, 
  Plus, 
  Users, 
  ListTodo, 
  DollarSign, 
  Handshake, 
  TrendingUp,
  Package,
  AlertTriangle,
  UserPlus,
  Bookmark,
  MessageCircle,
  MessagesSquare
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { RecentlyAddedCarousel } from "@/components/RecentlyAddedCarousel";

type UploadedImage = {
  name: string;
  type: string;
  contentBase64: string;
  previewUrl: string;
};

type ListingCategory = (typeof categoryOptions)[number]["value"];
type ListingCondition = Exclude<(typeof conditionOptions)[number]["value"], "all">;

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

const categoryOptions = [
  { value: "comics", label: "Comics" },
  { value: "sports_cards", label: "Sports Cards" },
  { value: "vintage_toys", label: "Vintage Toys" },
  { value: "video_games", label: "Video Games" },
  { value: "stamps", label: "Stamps" },
  { value: "coins", label: "Coins" },
  { value: "pokemon", label: "Pokemon" },
  { value: "movies", label: "Movies" },
  { value: "autographs", label: "Autographs" },
  { value: "disney_pins", label: "Disney Pins" },
] as const;

const conditionOptions = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

const fallbackMostViewed = [
  "1986 Fleer Michael Jordan Rookie PSA 9",
  "1989 Upper Deck Ken Griffey Jr Rookie PSA 10",
  "Amazing Spider-Man #300 CGC 9.8",
  "1776 US Quarter CGC 7.0",
  "1975 Star Wars Luke Skywalker figure",
];

const fallbackMostRequested = [
  "Hulk #181 CGC 9.8",
  "1986 Fleer Michael Jordan Rookie PSA 9",
  "1989 Upper Deck Ken Griffey Jr Rookie PSA 10",
  "Amazing Spider-Man #300 CGC 9.8",
  "1776 US Quarter CGC 7.0",
  "1975 Star Wars Luke Skywalker figure",
];

const fallbackTopTraders = ["BillyBob123", "DarthVader99", "JoeFalco22", "MarioLemieux66", "LeoCap00", "TheDude44"];

// Fallback data for highest trade value items (no longer used, data comes from backend)
const fallbackTradeValues: any[] = [];

// Hook to update user activity status
function useUpdateActivity(isAuthenticated: boolean) {
  const updateActivityMutation = trpc.onlineStatus.updateActivity.useMutation();
  
  useEffect(() => {
    // Only update activity if user is authenticated
    if (!isAuthenticated) return;
    
    // Update activity on component mount
    updateActivityMutation.mutate();
    
    // Update activity every 2 minutes while user is on the page
    const interval = setInterval(() => {
      updateActivityMutation.mutate();
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => clearInterval(interval);
    // NOTE: updateActivityMutation is intentionally excluded from the deps.
    // The object returned by useMutation() is not referentially stable, and
    // including it caused the effect to re-run on every render (mutate ->
    // re-render -> new mutation object -> mutate again), flooding the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "CE";
}

function RankingListingItem({ item, index, imageUrl, metricsType, metrics }: { item: any; index: number; imageUrl: string; metricsType?: 'views' | 'favorites' | 'value'; metrics?: number | string | null }) {
  const [, setLocation] = useLocation();
  const [showPreview, setShowPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleImageClick = () => {
    setLocation(`/listings/${item.id}`);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isInside = 
      e.clientX >= rect.left - 10 &&
      e.clientX <= rect.right + 10 &&
      e.clientY >= rect.top - 10 &&
      e.clientY <= rect.bottom + 10;
    
    if (!isInside && showPreview) {
      setShowPreview(false);
    }
  };

  const getRankingBadge = () => {
    if (index === 0) return { bg: '', text: 'text-yellow-400 font-bold', label: '🥇' };
    if (index === 1) return { bg: '', text: 'text-gray-300 font-bold', label: '🥈' };
    if (index === 2) return { bg: '', text: 'text-orange-400 font-bold', label: '🥉' };
    return { bg: '', text: 'text-white/60 font-medium', label: `${index + 1}` };
  };

  const badge = getRankingBadge();

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 transition-all hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-b-0`} ref={containerRef} onMouseMove={handleMouseMove}>
        <div className={`min-w-[40px] h-10 flex items-center justify-center font-bold text-[18px] ${badge.text}`}>
          <span className={badge.label.match(/[🥇🥈🥉]/) ? 'text-[24px]' : 'text-[16px]'}>{badge.label}</span>
        </div>
        <div onMouseEnter={() => setShowPreview(true)} className="relative">
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <div onClick={handleImageClick} className="cursor-pointer">
            <img src={imageUrl} alt={item.title} className="h-10 w-10 object-contain rounded flex-shrink-0 hover:opacity-80 transition-opacity border border-white/10" />
          </div>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>
                {item.certificationCompany && item.grade ? `${item.certificationCompany} ${formatGrade(item.grade)}` : item.grade ? `Grade: ${formatGrade(item.grade)}` : 'Ungraded'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <img src={imageUrl} alt={item.title} className="max-h-96 w-auto object-contain" />
            </div>
            <div className="mt-4 text-center font-semibold">
              Estimated Value: ${item.estimatedValue?.toFixed(0) ?? 'N/A'}
            </div>
          </DialogContent>
        </Dialog>
      </div>
        <div className="flex-1 min-w-0 ml-1">
          <span onClick={handleImageClick} className="truncate hover:text-white/100 transition-colors text-[11px] font-semibold block text-white/90">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 text-white/90 text-[11px] font-bold flex-shrink-0">
          {metrics !== undefined && metrics !== null && (
            <div className="flex items-center gap-2 whitespace-nowrap min-w-[60px] justify-end">
              <span className={metricsType === 'views' ? 'text-blue-400' : metricsType === 'value' ? 'text-emerald-400' : 'text-pink-400'}>
                {metricsType === 'views' ? <TrendingUp className="w-3.5 h-3.5" /> : metricsType === 'value' ? '$' : <Heart className="w-3.5 h-3.5 fill-current" />}
              </span>
              <span>{metricsType === 'value' ? `${Number(metrics).toLocaleString()}` : Number(metrics).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


async function readFiles(files: FileList | null) {
  if (!files) return [] as UploadedImage[];

  const readers = Array.from(files).slice(0, 6).map(
    file =>
      new Promise<UploadedImage>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          const [, contentBase64 = ""] = result.split(",");
          resolve({
            name: file.name,
            type: file.type || "image/jpeg",
            contentBase64,
            previewUrl: result,
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }),
  );

  return Promise.all(readers);
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  // Update user activity status while on the page
  useUpdateActivity(isAuthenticated);
  
  // Unread counts are already polled by TopRightIcons (rendered on this page);
  // this duplicate 30s poll doubled the background load for no benefit.
  const unreadCountsQuery = trpc.auth.unreadCounts.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 15000,
  });

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"] | undefined>(undefined);
  const [condition, setCondition] = useState<(typeof conditionOptions)[number]["value"] | undefined>(undefined);
  const [listingDraft, setListingDraft] = useState<{
    title: string;
    category: ListingCategory;
    condition: ListingCondition;
    description: string;
  }>({
    title: "",
    category: "comics",
    condition: "mint",
    description: "",
  });
  const [listingPhotos, setListingPhotos] = useState<UploadedImage[]>([]);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", bio: "" });
  const [profileAvatar, setProfileAvatar] = useState<UploadedImage | null>(null);
  const [proposalDraft, setProposalDraft] = useState<{ requestedListingId: number | null; note: string }>({
    requestedListingId: null,
    note: "",
  });
  const [selectionDrafts, setSelectionDrafts] = useState<Record<number, { offeredListingIds: number[]; note: string }>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<number, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, { rating: number; review: string }>>({});
  const [activeProposalId, setActiveProposalId] = useState<number | null>(null);

  const marketplaceQuery = trpc.market.feed.useQuery({ category, condition, keyword }, {
    refetchOnWindowFocus: true,
  });
  const siteStatisticsQuery = trpc.market.siteStatistics.useQuery(undefined, {
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  const topHighestValueItemsQuery = trpc.market.topHighestValueItems.useQuery(undefined, {
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  const topMostFavoritedQuery = trpc.favorites.getTopMostFavorited.useQuery(undefined, {
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  const upcomingConventionsQuery = trpc.conventions.upcoming.useQuery({ limit: 3 }, { staleTime: 1000 * 60 * 60 });
  const topMostViewedQuery = trpc.favorites.getTopMostViewed.useQuery(undefined, {
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  const topRatedTradersQuery = trpc.favorites.getTopRatedTraders.useQuery(undefined, {
    refetchInterval: 300000, // Refetch every 5 minutes
  });
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createListingMutation = trpc.market.createListing.useMutation({
    onSuccess: async () => {
      setListingDraft({ title: "", category: "comics", condition: "mint", description: "" });
      setListingPhotos([]);
      toast.success("Listing published successfully.");
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const saveProfileMutation = trpc.market.saveProfile.useMutation({
    onSuccess: async data => {
      setProfileDraft({
        displayName: data.profile.displayName,
        bio: data.profile.bio,
      });
      setProfileAvatar(null);
      toast.success("Subscriber profile updated.");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const createProposalMutation = trpc.market.createTradeProposal.useMutation({
    onSuccess: async () => {
      setProposalDraft({ requestedListingId: null, note: "" });
      toast.success("Trade Proposal sent.");
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const selectProposalItemsMutation = trpc.market.selectTradeProposalItems.useMutation({
    onSuccess: async () => {
      setSelectionDrafts({});
      toast.success("Trade request sent for review.");
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const respondMutation = trpc.market.respondToTradeProposal.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
      toast.success("Trade Proposal updated.");
    },
    onError: error => toast.error(error.message),
  });

  const sendMessageMutation = trpc.market.sendTradeMessage.useMutation({
    onSuccess: async () => {
      setMessageDrafts({});
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async data => {
      toast.success(data.saved ? "Listing saved to Watchlist." : "Listing removed from Watchlist.");
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const reviewMutation = trpc.market.leaveTradeReview.useMutation({
    onSuccess: async () => {
      setReviewDrafts({});
      toast.success("Ratings and Reviews submitted.");
      await utils.market.dashboard.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const dashboard = dashboardQuery.data;

  const warningsQuery = trpc.market.getMyWarnings.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [dismissedWarnings, setDismissedWarnings] = useState<number[]>([]);
  const activeWarnings = (warningsQuery.data as any[] ?? []).filter((w: any) => !dismissedWarnings.includes(w.id));

  const ownActiveListings = useMemo(
    () => dashboard?.ownListings.filter(listing => listing.status === "active") ?? [],
    [dashboard?.ownListings],
  );

  const tradeProposals = dashboard?.tradeProposals ?? [];
  const incomingProposals = tradeProposals.filter(proposal => proposal.direction === "incoming");
  const outgoingProposals = tradeProposals.filter(proposal => proposal.direction === "outgoing");
  const reviewableProposals = tradeProposals.filter(proposal => proposal.canReview);

  const proposalStatusGroups = useMemo(
    () => ({
      pending: tradeProposals.filter(proposal => !["accepted", "completed", "declined", "refused", "cancelled"].includes(proposal.status)),
      accepted: tradeProposals.filter(proposal => proposal.status === "accepted"),
      declined: tradeProposals.filter(proposal => ["declined", "refused", "cancelled"].includes(proposal.status)),
      completed: tradeProposals.filter(proposal => proposal.status === "completed"),
    }),
    [tradeProposals],
  );

  const activeProposal = useMemo(() => {
    const fallbackId = proposalStatusGroups.pending[0]?.id ?? tradeProposals[0]?.id ?? null;
    const targetId = activeProposalId ?? fallbackId;
    return tradeProposals.find(proposal => proposal.id === targetId) ?? null;
  }, [activeProposalId, proposalStatusGroups.pending, tradeProposals]);

  const spotlightStats = [
    {
      label: "Active Listings",
      value: marketplaceQuery.data?.highlights.totalListings ?? 0,
      icon: Search,
    },
    {
      label: "Completed Trades",
      value: marketplaceQuery.data?.highlights.completedTrades ?? 0,
      icon: ArrowRightLeft,
    },
    {
      label: "Collector Profiles",
      value: marketplaceQuery.data?.highlights.activeCollectors ?? 0,
      icon: ShieldCheck,
    },
  ];

  const recentShelfItems = (marketplaceQuery.data?.listings ?? []).length
    ? (marketplaceQuery.data?.listings ?? []).slice(0, 15).map(listing => ({
        id: listing.id,
        title: listing.title,
        price: listing.estimatedValue ? `$${listing.estimatedValue.toFixed(2)}` : "$0.00",
        subtitle: `${listing.ownerRating.averageRating.toFixed(1)} ★ · ${listing.ownerRating.reviewCount} reviews`,
        imageUrl: resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl }),
        href: `/listings/${listing.id}`,
        tradeListingId: listing.id,
        savedToWatchlist: listing.savedToWatchlist,
        ownerId: listing.ownerId,
        estimatedValue: listing.estimatedValue,
      }))
    : [];

  const mostViewedItemsData = (topMostViewedQuery.data?.items ?? []).length
    ? (topMostViewedQuery.data?.items ?? []).slice(0, 10)
    : [];

  const mostRequestedItemsData = (topMostFavoritedQuery.data?.items ?? []).length
    ? (topMostFavoritedQuery.data?.items ?? []).slice(0, 10)
    : [];

  const topTraderItemsData = (topRatedTradersQuery.data?.traders ?? []).slice(0, 10);

  const mostViewedItems = mostViewedItemsData.map(listing => listing.title);
  const mostRequestedItems = mostRequestedItemsData.map(listing => listing.title);
  const topTraderItems = topTraderItemsData.map(owner => owner.displayName);

  const highestTradeValueItems = (topHighestValueItemsQuery.data ?? []).length > 0
    ? topHighestValueItemsQuery.data
    : [];

  const beginProposal = (listingId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setProposalDraft({ requestedListingId: listingId, note: "" });
  };

  const handleListingPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = await readFiles(event.target.files);
    setListingPhotos(files);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = await readFiles(event.target.files);
    setProfileAvatar(files[0] ?? null);
  };

  const submitListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createListingMutation.mutateAsync({
      ...listingDraft,
      itemType: "single_card", // TODO: Replace with actual itemType from form
      photos: listingPhotos.map(({ previewUrl, ...photo }) => photo),
    });
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveProfileMutation.mutateAsync({
      displayName: profileDraft.displayName,
      bio: profileDraft.bio,
      avatar: profileAvatar ? { name: profileAvatar.name, type: profileAvatar.type, contentBase64: profileAvatar.contentBase64 } : null,
    });
  };

  const submitProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!proposalDraft.requestedListingId) {
      toast.error("Choose an item before sending a Trade Proposal.");
      return;
    }
    await createProposalMutation.mutateAsync({
      requestedListingId: proposalDraft.requestedListingId,
      note: proposalDraft.note,
    });
  };

  const submitMessage = async (proposalId: number) => {
    const message = messageDrafts[proposalId]?.trim();
    if (!message) return;
    await sendMessageMutation.mutateAsync({ proposalId, message });
  };

  const submitReview = async (proposalId: number) => {
    const draft = reviewDrafts[proposalId];
    if (!draft) return;
    await reviewMutation.mutateAsync({ proposalId, rating: draft.rating, review: draft.review });
  };

  const toggleSelectionItem = (proposalId: number, listingId: number, checked: boolean) => {
    setSelectionDrafts(current => {
      const existing = current[proposalId] ?? { offeredListingIds: [], note: "" };
      return {
        ...current,
        [proposalId]: {
          ...existing,
          offeredListingIds: checked
            ? [...existing.offeredListingIds, listingId]
            : existing.offeredListingIds.filter(id => id !== listingId),
        },
      };
    });
  };

  const submitSelection = async (proposalId: number) => {
    const draft = selectionDrafts[proposalId] ?? { offeredListingIds: [], note: "" };
    if (draft.offeredListingIds.length === 0) {
      toast.error("Select at least one item from the interested collector before sending the trade request.");
      return;
    }
    await selectProposalItemsMutation.mutateAsync({
      proposalId,
      offeredListingIds: draft.offeredListingIds,
      note: draft.note,
    });
  };

  const sendCounter = async (proposalId: number) => {
    await respondMutation.mutateAsync({
      proposalId,
      action: "counter",
      note: messageDrafts[proposalId]?.trim() || "Could you adjust the requested items on this Trade Proposal?",
    });
    setMessageDrafts(current => ({ ...current, [proposalId]: "" }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-foreground">
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        searchPlaceholder="Search Tradebilia..."
        onSearchChange={setKeyword}
      />

      <main className="pb-24">
        <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
          backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'




        }}>
          <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
            <div className="flex w-full max-w-6xl items-center justify-center px-4">
              <img
                src="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg"
                alt="Tradebilia"
                className="h-auto w-full max-w-5xl object-contain"
              />
            </div>
          </div>
        </section>

        <CategoryBar />

        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 py-1 text-white border-y border-blue-700">
          <div className="grid gap-0 grid-cols-2 sm:grid-cols-5 items-center">
            {[
              ["users", "Total Members", siteStatisticsQuery.data?.totalMembers ? `${siteStatisticsQuery.data.totalMembers}` : "0"],
              ["list", "Active Listings", siteStatisticsQuery.data?.totalItems ? `${siteStatisticsQuery.data.totalItems.toLocaleString()}` : "0"],
              ["dollar", "Total Items Value", siteStatisticsQuery.data?.totalValue ? `$${Math.floor(siteStatisticsQuery.data.totalValue).toLocaleString('en-US')}` : "$0"],
              ["handshake", "Successful Trades", siteStatisticsQuery.data?.totalTrades ? `${siteStatisticsQuery.data.totalTrades}` : "0"],
              ["trending", "Member Growth", "Calculating"],
            ].map(([iconType, label, value]) => {
              const iconMap: Record<string, React.ReactNode> = {
                users: <Users className="w-10 h-10" />,
                list: <ListTodo className="w-10 h-10" />,
                dollar: <DollarSign className="w-10 h-10" />,
                handshake: <Handshake className="w-10 h-10" />,
                trending: <TrendingUp className="w-10 h-10" />,
              };
              return (
                <div key={label as string} className="flex items-center justify-center gap-2 px-3 py-1 border-r border-white/20 last:border-r-0 transition-all duration-500 h-full">
                  <div className="flex-shrink-0 text-white flex items-center justify-center">{iconMap[iconType as string]}</div>
                  <div className="flex flex-col text-center justify-center">
                    <p className="text-xs leading-none text-white/80">{label as string}</p>
                    <p className="text-xl font-semibold leading-none text-white">{value as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-0">
          {marketplaceQuery.isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-1 gap-0 md:grid-cols-[200px_minmax(0,1fr)] md:grid-rows-[auto_1fr]">
                <aside className="flex flex-col justify-between bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 px-4 py-6 text-white shadow-lg md:col-start-1 md:row-span-2">
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-white/20">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">Subscriber Tools</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/80">Sign in to access your inventory, watchlist, and more.</p>
                    </div>
                    <button onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Members only - Please sign in to access your inventory');
                      } else {
                        setLocation('/inventory');
                      }
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><Package className="w-4 h-4 flex-shrink-0" /> My Inventory</button>
                    <button onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Members only - Please sign in to view your trades');
                      } else {
                        setLocation('/trade-hub');
                      }
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 flex-shrink-0" /> My Trades</button>
                    <button onClick={() => {
                      setLocation('/members');
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><Users className="w-4 h-4 flex-shrink-0" /> Member Directory</button>
                    <button onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Members only - Please sign in to report a user');
                      } else {
                        setLocation('/report-user');
                      }
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Report a User</button>
                    <button onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Members only - Please sign in to submit a referral request');
                      } else {
                        setLocation('/referral-request');
                      }
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><UserPlus className="w-4 h-4 flex-shrink-0" /> Refer a Collector</button>
                    <button onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Members only - Please sign in to access your watchlist');
                      } else {
                        setLocation('/watchlist');
                      }
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><Bookmark className="w-4 h-4 flex-shrink-0" /> Watchlist</button>
                    <button onClick={() => {
                      setLocation('/contact');
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><MessageCircle className="w-4 h-4 flex-shrink-0" /> Suggestions / Contact Us</button>
                    <button onClick={() => {
                      setLocation('/forum');
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><MessagesSquare className="w-4 h-4 flex-shrink-0" /> Collector's Forum</button>
                    <button onClick={() => {
                      setLocation('/trade-showcase');
                    }} className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium text-left flex items-center gap-2"><Handshake className="w-4 h-4 flex-shrink-0" /> Trade Showcase</button>
                    <div className="pt-4 border-t border-white/20 space-y-3">
                      {isAuthenticated && (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-white/90">📅 Upcoming Conventions</p>
                            <a href="/conventions" className="text-[0.65rem] text-cyan-400 hover:text-cyan-300 transition">View All →</a>
                          </div>
                          {upcomingConventionsQuery.data && upcomingConventionsQuery.data.length > 0 ? (
                            <div className="mt-1.5 space-y-1.5">
                              {upcomingConventionsQuery.data.map((conv: any) => (
                                <a key={conv.id} href="/conventions" className="block rounded bg-white/10 hover:bg-white/20 transition px-2 py-1.5">
                                  <p className="text-xs font-medium text-white leading-tight truncate">{conv.name}</p>
                                  <p className="text-[0.65rem] text-white/60 mt-0.5">{conv.startDate} · {[conv.city, conv.state].filter(Boolean).join(", ")}</p>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-white/60 mt-1">
                              No upcoming conventions near you. <a href="/account" className="text-cyan-400 hover:underline">Add your location</a> to see nearby shows, or <a href="/conventions" className="text-cyan-400 hover:underline">browse all →</a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </aside>

                <div className="py-3 md:col-start-2 md:row-start-1">
                  <h2 className="text-center font-serif text-[2.45rem] font-medium tracking-[-0.035em] text-[#2d241e] sm:text-[2.8rem]">Recently Added</h2>
                  <RecentlyAddedCarousel
                    items={recentShelfItems}
                    onBeginProposal={beginProposal}
                    user={user}
                    isAuthenticated={isAuthenticated}
                    createProposalMutation={createProposalMutation}
                    watchlistMutation={watchlistMutation}
                    proposalDraft={proposalDraft}
                    setProposalDraft={setProposalDraft}
                    onRefresh={() => {
                      // Refetch the recently added items without stopping scroll
                      // The query will automatically update displayItems in the carousel
                      marketplaceQuery.refetch();
                    }}
                  />
                </div>

                <div className="grid gap-4 px-4 md:col-start-2 md:grid-cols-2 lg:px-8 xl:grid-cols-4">
                {/* Most Viewed */}
                <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d152b] text-white shadow-2xl hover:border-white/20 transition-all flex flex-col">
                  <CardHeader className="pb-4 pt-7 px-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="font-['Oswald'] text-[1.3rem] font-bold uppercase tracking-wider text-white">Top 10 Most Viewed</CardTitle>
                        <p className="text-[11px] text-white/40 font-medium mt-0.5">Items getting the most attention</p>
                      </div>
                      <div className="absolute top-7 right-6 text-white/20 hover:text-white/40 transition-colors cursor-help">
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">i</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-2 pb-2">
                      <div className="space-y-0">
                        {mostViewedItemsData.map((item, index) => {
                          const imageUrl = resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl });
                          return <RankingListingItem key={`${item.id}-${index}`} item={item} index={index} imageUrl={imageUrl} metricsType="views" metrics={item.viewCount} />;
                        })}
                      </div>
                  </CardContent>
                  <div className="p-5 pt-0">
                    <Link href="/rankings/most-viewed" className="flex items-center justify-center w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400/80 hover:bg-white/10 hover:text-blue-400 transition-all">
                      View All Most Viewed →
                    </Link>
                  </div>
                </Card>

                {/* Most Favorited */}
                <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a0d14] text-white shadow-2xl hover:border-white/20 transition-all flex flex-col">
                  <CardHeader className="pb-4 pt-7 px-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                        <Heart className="w-5 h-5 fill-current" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="font-['Oswald'] text-[1.3rem] font-bold uppercase tracking-wider text-white">Top 10 Most Favorited</CardTitle>
                        <p className="text-[11px] text-white/40 font-medium mt-0.5">Items collectors love most</p>
                      </div>
                      <div className="absolute top-7 right-6 text-white/20 hover:text-white/40 transition-colors cursor-help">
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">i</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-2 pb-2">
                      <div className="space-y-0">
                        {mostRequestedItemsData.map((item, index) => {
                          const imageUrl = resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl });
                          return <RankingListingItem key={`${item.id}-${index}`} item={item} index={index} imageUrl={imageUrl} metricsType="favorites" metrics={item.favoriteCount} />;
                        })}
                      </div>
                  </CardContent>
                  <div className="p-5 pt-0">
                    <Link href="/rankings/most-favorited" className="flex items-center justify-center w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.15em] text-pink-400/80 hover:bg-white/10 hover:text-pink-400 transition-all">
                      View All Most Favorited →
                    </Link>
                  </div>
                </Card>

                {/* Rated Traders */}
                <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[#130d1a] text-white shadow-2xl hover:border-white/20 transition-all flex flex-col">
                  <CardHeader className="pb-4 pt-7 px-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <Star className="w-5 h-5 fill-current" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="font-['Oswald'] text-[1.3rem] font-bold uppercase tracking-wider text-white">Top 10 Rated Traders</CardTitle>
                        <p className="text-[11px] text-white/40 font-medium mt-0.5">Highest rated by the community</p>
                      </div>
                      <div className="absolute top-7 right-6 text-white/20 hover:text-white/40 transition-colors cursor-help">
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">i</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-2 pb-2">
                      <div className="space-y-0">
                        {topTraderItemsData.map((owner, index) => {
                          const initials = getAvatarInitials({ firstName: (owner as any).firstName, lastName: (owner as any).lastName, displayName: owner.displayName });
                          const badge = index === 0 ? { text: 'text-yellow-400', label: '🥇' } : index === 1 ? { text: 'text-gray-300', label: '🥈' } : index === 2 ? { text: 'text-orange-400', label: '🥉' } : { text: 'text-white/60', label: `${index + 1}` };
                          return (
                            <Link key={`trader-${index}`} href={`/profile/${owner.id}`}>
                              <div className="flex items-center gap-3 px-3 py-2.5 transition-all hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-b-0">
                                <div className={`min-w-[40px] h-10 flex items-center justify-center font-bold text-[18px] ${badge.text}`}>
                                  <span className={badge.label.match(/[🥇🥈🥉]/) ? 'text-[24px]' : 'text-[16px]'}>{badge.label}</span>
                                </div>
                                <Avatar className="h-10 w-10 flex-shrink-0 border border-white/10">
                                  <AvatarImage src={owner.avatarUrl || undefined} alt={owner.displayName} />
                                  <AvatarFallback className="bg-[#7f31ff] text-white text-[10px] font-bold">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 ml-1">
                                  <span className="truncate text-[11px] font-semibold block text-white/90">{owner.displayName}</span>
                                  <div className="flex items-center gap-0.5 mt-0.5">
                                    {[...Array(5)].map((_, i) => {
                                      const rating = Number(owner.averageRating) || 0;
                                      return <Star key={i} className={`w-2.5 h-2.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-white/10 text-white/10'}`} />;
                                    })}
                                  </div>
                                  <span className="text-[9px] text-white/40">{owner.reviewCount || 0} review{Number(owner.reviewCount) !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="text-white/90 text-[11px] font-bold min-w-[30px] text-right">{Number(owner.averageRating) > 0 ? Number(owner.averageRating).toFixed(1) : 'N/A'}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                  </CardContent>
                  <div className="p-5 pt-0">
                    <Link href="/rankings/top-rated-traders" className="flex items-center justify-center w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-400/80 hover:bg-white/10 hover:text-indigo-400 transition-all">
                      View All Rated Traders →
                    </Link>
                  </div>
                </Card>

                {/* Highest Trade Values */}
                <Card className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a18] text-white shadow-2xl hover:border-white/20 transition-all flex flex-col">
                  <CardHeader className="pb-4 pt-7 px-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="font-['Oswald'] text-[1.3rem] font-bold uppercase tracking-wider text-white">Top 10 Highest Values</CardTitle>
                        <p className="text-[11px] text-white/40 font-medium mt-0.5">Highest value items traded</p>
                      </div>
                      <div className="absolute top-7 right-6 text-white/20 hover:text-white/40 transition-colors cursor-help">
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">i</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-2 pb-2">
                      <div className="space-y-0">
                        {(highestTradeValueItems ?? []).map((item, index) => {
                          const imageUrl = resolveTradebiliaListingImage({ title: item.title, category: item.category, primaryPhotoUrl: item.primaryPhotoUrl });
                          return <RankingListingItem key={`${item.id}-${index}`} item={item} index={index} imageUrl={imageUrl} metricsType="value" metrics={item.estimatedValue} />;
                        })}
                      </div>
                  </CardContent>
                  <div className="p-5 pt-0">
                    <Link href="/rankings/top-trade-values" className="flex items-center justify-center w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-400/80 hover:bg-white/10 hover:text-emerald-400 transition-all">
                      View All Highest Values →
                    </Link>
                  </div>
                </Card>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Warning Banner — shown to users who have received admin warnings */}
        {isAuthenticated && activeWarnings.length > 0 && (
          <div className="container pt-4">
            {activeWarnings.map((warning: any) => (
              <div key={warning.id} className="mb-3 flex items-start gap-3 rounded-xl border border-yellow-400/40 bg-yellow-50 px-5 py-4 shadow-sm">
                <div className="mt-0.5 flex-shrink-0 text-yellow-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-yellow-800">Official Warning from Tradebilia</p>
                  <p className="text-sm text-yellow-700 mt-0.5 leading-relaxed">{warning.message}</p>
                  <p className="text-xs text-yellow-500 mt-1">{warning.createdAt ? new Date(warning.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                </div>
                <button
                  onClick={() => setDismissedWarnings(prev => [...prev, warning.id])}
                  className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 transition-colors"
                  aria-label="Dismiss warning"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && dashboard ? (
          <section className="container pt-8">
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[1.75rem] bg-card/85 p-2">
                {[
                  ["dashboard", "Dashboard"],
                  ["listings", "Listings"],
                  ["trade-proposals", "Trade Proposals"],
                  ["watchlist", "Watchlist"],
                  ["trade-history", "Trade History"],
                  ["ratings", "Ratings and Reviews"],
                  ["profile", "Subscriber Profile"],
                ].map(([value, label]) => (
                  <TabsTrigger key={value} value={value} className="rounded-full px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Card className="surface-card overflow-hidden bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-3xl">Subscriber profile summary</CardTitle>
                      <CardDescription>Maintain trust with a visible display name, avatar, reputation, and complete Trade History.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border border-border/70">
                          <AvatarImage src={dashboard.profile.avatarUrl ?? undefined} alt={dashboard.profile.displayName} />
                          <AvatarFallback>{initials(dashboard.profile.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-2xl font-semibold text-foreground">{dashboard.profile.displayName}</h4>
                          <p className="text-sm text-muted-foreground">Trade History: {dashboard.profile.tradeHistoryCount}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Ratings and Reviews: {dashboard.profile.rating.averageRating.toFixed(1)} ({dashboard.profile.rating.reviewCount})</p>
                        </div>
                      </div>
                      <p className="rounded-[1.5rem] bg-muted/45 p-4 text-sm leading-7 text-muted-foreground">{dashboard.profile.bio}</p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          ["Incoming", incomingProposals.length],
                          ["Outgoing", outgoingProposals.length],
                          ["Watchlist", dashboard.watchlist.length],
                        ].map(([label, value]) => (
                          <div key={label as string} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-center">
                            <p className="text-3xl font-semibold text-foreground">{value as number}</p>
                            <p className="text-sm text-muted-foreground">{label as string}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="surface-card bg-card/90">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-3xl">Create a listing</CardTitle>
                        <CardDescription>Publish collectible item listings with category, condition, description, and photo uploads.</CardDescription>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {dashboard.ownListings.length} Listings
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <form className="grid gap-4" onSubmit={submitListing}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="listing-title">Title</Label>
                            <Input id="listing-title" value={listingDraft.title} onChange={event => setListingDraft(current => ({ ...current, title: event.target.value }))} placeholder="1939 Detective Comics issue" />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={listingDraft.category} onValueChange={value => setListingDraft(current => ({ ...current, category: value as ListingCategory }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {[...categoryOptions].map(option => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select value={listingDraft.condition} onValueChange={value => setListingDraft(current => ({ ...current, condition: value as ListingCondition }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a condition" />
                              </SelectTrigger>
                              <SelectContent>
                                {conditionOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="listing-photos">Photos</Label>
                            <Input id="listing-photos" type="file" multiple accept="image/*" onChange={handleListingPhotos} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listing-description">Description</Label>
                          <Textarea id="listing-description" rows={6} value={listingDraft.description} onChange={event => setListingDraft(current => ({ ...current, description: event.target.value }))} placeholder="Describe provenance, notable details, and what you hope to trade for." />
                        </div>
                        {listingPhotos.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-3">
                            {listingPhotos.map(photo => (
                              <div key={photo.name} className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background">
                                <img src={photo.previewUrl} alt={photo.name} className="aspect-[4/3] w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <Button type="submit" className="w-fit rounded-full px-6" disabled={createListingMutation.isPending}>
                          {createListingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          Publish listing
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="listings" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                  {dashboard.ownListings.map(listing => (
                    <Card key={listing.id} className="surface-card overflow-hidden bg-card/90">
                      <div className="aspect-[4/3] bg-muted">
                        <img src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={listing.title} className="h-full w-full object-cover" />
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-2xl font-semibold text-foreground">{listing.title}</h4>
                          <Badge variant="outline" className="rounded-full">{listing.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{getTradebiliaCategoryLabel(listing.category)} · {listing.condition}</p>
                        <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{listing.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="trade-proposals" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[280px_1.05fr_1.1fr]">
                  <Card className="overflow-hidden border-0 bg-[linear-gradient(180deg,#1b2030_0%,#171c29_100%)] text-white shadow-[0_20px_50px_rgba(8,10,26,0.28)]">
                    <CardHeader className="border-b border-white/10 pb-5">
                      <CardTitle className="text-3xl text-white">Trade Proposals</CardTitle>
                      <CardDescription className="text-white/70">Keep every request, response, and status change organized in one place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-0">
                      {[
                        ["All Notifications", tradeProposals.length],
                        ["Pending Trade Requests", proposalStatusGroups.pending.length],
                        ["Accepted Trades", proposalStatusGroups.accepted.length],
                        ["Declined Trades", proposalStatusGroups.declined.length],
                        ["Completed Trades", proposalStatusGroups.completed.length],
                      ].map(([label, total]) => (
                        <div key={label as string} className={`flex items-center justify-between border-b border-white/5 px-5 py-5 text-base ${label === "Pending Trade Requests" ? "bg-[linear-gradient(90deg,#5028f2_0%,#6d33ff_55%,#2a2368_100%)] font-semibold text-white" : "text-white/82"}`}>
                          <span>{label as string}</span>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{total as number}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="surface-card overflow-hidden bg-card/90">
                    <CardHeader className="border-b border-border/60 pb-5">
                      <CardTitle className="text-4xl">Trade Requests</CardTitle>
                      <CardDescription>Expressions of interest and structured trade requests appear here for review.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0 p-0">
                      {tradeProposals.length > 0 ? tradeProposals.map(proposal => (
                        <button
                          key={proposal.id}
                          type="button"
                          onClick={() => setActiveProposalId(proposal.id)}
                          className={`grid w-full gap-4 border-b border-border/60 px-5 py-5 text-left transition hover:bg-muted/35 ${activeProposal?.id === proposal.id ? "bg-[linear-gradient(90deg,rgba(79,39,255,0.12),rgba(79,39,255,0.03))]" : "bg-transparent"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{proposal.counterpart?.displayName ?? "Collector"} {proposal.direction === "incoming" ? "sent you a trade request" : "received your trade request"}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">Trade Proposal #{proposal.id}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{new Date(proposal.updatedAt).toLocaleDateString()}</p>
                              <p>{new Date(proposal.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                            <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3">
                              <p className="text-sm font-semibold text-foreground">{proposal.requestedListing?.title ?? "Requested item"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Requested listing</p>
                            </div>
                            <div className="flex items-center justify-center text-lg font-semibold text-muted-foreground">→</div>
                            <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-3">
                              <p className="text-sm font-semibold text-foreground">{proposal.offeredListings.length > 0 ? `${proposal.offeredListings.length} selected item${proposal.offeredListings.length > 1 ? "s" : ""}` : "Awaiting owner selection"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Trade request status</p>
                            </div>
                          </div>
                        </button>
                      )) : <div className="p-6 text-sm leading-7 text-muted-foreground">No Trade Proposals are available in this section yet.</div>}
                    </CardContent>
                  </Card>

                  <Card className="surface-card overflow-hidden bg-card/90">
                    <CardHeader className="border-b border-border/60 pb-5">
                      <CardTitle className="text-4xl">{activeProposal ? activeProposal.counterpart?.displayName ?? "Collector" : "Trade detail"}</CardTitle>
                      <CardDescription>{activeProposal ? "Review the active request, choose inventory, send responses, and keep the audit trail complete." : "Select a Trade Proposal to inspect its details."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-5">
                      {activeProposal ? (
                        <>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Requested listing</p>
                              <p className="mt-3 text-2xl font-semibold text-foreground">{activeProposal.requestedListing?.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{activeProposal.requestedListing ? getTradebiliaCategoryLabel(activeProposal.requestedListing.category) : ''} · {activeProposal.requestedListing?.condition}</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trade status</p>
                                <Badge variant="secondary" className="rounded-full px-3 py-1">{activeProposal.status}</Badge>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-muted-foreground">{activeProposal.note || "No note has been added to this proposal yet. Use comments and live messaging to keep the full audit trail visible."}</p>
                            </div>
                          </div>

                          {activeProposal.canRespond ? (
                            <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Requestor's items</p>
                                  <p className="mt-1 text-sm text-muted-foreground">Browse {activeProposal.counterpart?.displayName ?? "the collector"}'s inventory and select the items you want to include in your response.</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-600">
                                  <Clock3 className="h-4 w-4" /> Online now
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {activeProposal.requesterInventory.map((item: any) => {
                                  const checked = (selectionDrafts[activeProposal.id]?.offeredListingIds ?? []).includes(item.id);
                                  return (
                                    <label key={item.id} className={`rounded-[1.25rem] border p-4 transition ${checked ? "border-primary bg-primary/8 shadow-[0_12px_30px_-24px_rgba(80,40,220,0.8)]" : "border-border/70 bg-card"}`}>
                                      <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={checked} onChange={event => toggleSelectionItem(activeProposal.id, item.id, event.target.checked)} className="mt-1 h-4 w-4" />
                                        <div>
                                          <p className="font-semibold text-foreground">{item.title}</p>
                                          <p className="mt-1 text-sm text-muted-foreground">{getTradebiliaCategoryLabel(item.category)} · {item.condition}</p>
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                              <Textarea
                                className="mt-4"
                                value={selectionDrafts[activeProposal.id]?.note ?? ""}
                                onChange={event => setSelectionDrafts(current => ({ ...current, [activeProposal.id]: { offeredListingIds: current[activeProposal.id]?.offeredListingIds ?? [], note: event.target.value } }))}
                                placeholder="Add comments that explain your requested items and preserve the negotiation trail."
                                rows={3}
                              />
                              <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-border/70 bg-card p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Your item</p>
                                  <p className="mt-2 text-lg font-semibold text-foreground">{activeProposal.requestedListing?.title}</p>
                                </div>
                                <div className="text-center text-2xl text-muted-foreground">⇄</div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Their items</p>
                                  <p className="mt-2 text-lg font-semibold text-foreground">{(selectionDrafts[activeProposal.id]?.offeredListingIds ?? []).length} selected for this Trade Request</p>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Button className="rounded-full" onClick={() => submitSelection(activeProposal.id)}>Submit Trade Request</Button>
                                <Button variant="outline" className="rounded-full" onClick={() => respondMutation.mutate({ proposalId: activeProposal.id, action: "refuse", note: "I reviewed the inventory and did not see anything that fits my collection right now." })}>Decline</Button>
                              </div>
                            </div>
                          ) : null}

                          {activeProposal.canAcceptSelection ? (
                            <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proposal review</p>
                              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div className="rounded-[1.25rem] border border-border/70 bg-card p-4">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Your item</p>
                                  <p className="mt-2 text-lg font-semibold text-foreground">{activeProposal.requestedListing?.title}</p>
                                </div>
                                <div className="text-center text-2xl text-muted-foreground">⇄</div>
                                <div className="rounded-[1.25rem] border border-border/70 bg-card p-4">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Their items</p>
                                  <div className="mt-2 space-y-2">
                                    {activeProposal.offeredListings.map((item: any) => (
                                      <p key={item.id} className="text-sm font-semibold text-foreground">{item.title}</p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Button className="rounded-full" onClick={() => respondMutation.mutate({ proposalId: activeProposal.id, action: "accept" })}>Accept</Button>
                                <Button variant="outline" className="rounded-full" onClick={() => sendCounter(activeProposal.id)}>Counter</Button>
                                <Button variant="outline" className="rounded-full" onClick={() => respondMutation.mutate({ proposalId: activeProposal.id, action: "refuse", note: "I am going to pass on this trade request for now." })}>Decline</Button>
                              </div>
                            </div>
                          ) : null}

                          {activeProposal.contactDetails ? (
                            <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Shared contact information</p>
                              <div className="mt-3 grid gap-2 text-sm text-foreground md:grid-cols-2">
                                <p><span className="font-semibold">Full name:</span> {activeProposal.contactDetails?.fullName || "Pending"}</p>
                                <p><span className="font-semibold">Email:</span> {activeProposal.contactDetails?.email || "Pending"}</p>
                                <p><span className="font-semibold">Phone:</span> {activeProposal.contactDetails?.phone || "Pending"}</p>
                                <p><span className="font-semibold">Address:</span> {activeProposal.contactDetails?.address || "Pending"}</p>
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              <MessageSquareText className="h-4 w-4" /> Chat and audit trail
                            </div>
                            <ScrollArea className="mt-4 h-56 rounded-[1.5rem] border border-border/70 bg-card p-4">
                              <div className="space-y-3">
                                {activeProposal.messages.map((message: any) => (
                                  <div key={message.id} className="rounded-2xl bg-background/80 p-3">
                                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                      <span className="font-semibold text-foreground">{message.senderDisplayName}</span>
                                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{message.message}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="mt-4 flex gap-3">
                              <Textarea
                                value={messageDrafts[activeProposal.id] ?? ""}
                                onChange={event => setMessageDrafts(current => ({ ...current, [activeProposal.id]: event.target.value }))}
                                placeholder="Type a message to continue the Trade Proposal discussion."
                                rows={3}
                              />
                              <Button className="self-end rounded-full" onClick={() => submitMessage(activeProposal.id)}>Send</Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {activeProposal.canCancel ? <Button variant="outline" className="rounded-full" onClick={() => respondMutation.mutate({ proposalId: activeProposal.id, action: "cancel" })}>Cancel</Button> : null}
                            {activeProposal.canComplete ? <Button className="rounded-full" variant="secondary" onClick={() => respondMutation.mutate({ proposalId: activeProposal.id, action: "complete" })}>Mark completed</Button> : null}
                            <Badge variant="outline" className="rounded-full px-3 py-1">Last updated {new Date(activeProposal.updatedAt).toLocaleString()}</Badge>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm leading-7 text-muted-foreground">Select a Trade Proposal from the request list to review it in detail.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="watchlist">
                <Card className="surface-card bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-3xl">Watchlist</CardTitle>
                    <CardDescription>Keep the collectible item listings that deserve a second look.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {dashboard.watchlist.length > 0 ? dashboard.watchlist.map(listing => (
                      <div key={listing.id} className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/70">
                        <div className="aspect-[4/3] bg-muted">
                          <img src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={listing.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-3 p-5">
                          <h4 className="text-2xl font-semibold text-foreground">{listing.title}</h4>
                          <p className="text-sm text-muted-foreground">{getTradebiliaCategoryLabel(listing.category)} · {listing.condition}</p>
                          <Button variant="outline" className="rounded-full" onClick={() => watchlistMutation.mutate({ listingId: listing.id })}>Remove from Watchlist</Button>
                        </div>
                      </div>
                    )) : <p className="text-sm leading-7 text-muted-foreground">Your Watchlist is currently empty.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trade-history">
                <Card className="surface-card bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-3xl">Trade History</CardTitle>
                    <CardDescription>Track every trade conversation, response, and completed exchange.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dashboard.tradeHistory.map(proposal => (
                      <div key={proposal.id} className="flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-background/70 p-5 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Trade Proposal #{proposal.id}</p>
                          <h4 className="text-2xl font-semibold text-foreground">{proposal.requestedListing?.title}</h4>
                          <p className="text-sm text-muted-foreground">Counterpart: {proposal.counterpart?.displayName ?? "Collector"}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-muted-foreground">
                            <p>Status</p>
                            <p className="font-semibold text-foreground">{proposal.status}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Updated</p>
                            <p className="font-semibold text-foreground">{new Date(proposal.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ratings" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <Card className="surface-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-3xl">Leave Ratings and Reviews</CardTitle>
                      <CardDescription>After a trade is completed, both subscribers can leave feedback that strengthens trust.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {reviewableProposals.length > 0 ? reviewableProposals.map(proposal => {
                        const draft = reviewDrafts[proposal.id] ?? { rating: 5, review: "" };
                        return (
                          <div key={proposal.id} className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                            <p className="font-semibold text-foreground">Review {proposal.counterpart?.displayName ?? "Collector"}</p>
                            <div className="mt-3 space-y-3">
                              <Select value={String(draft.rating)} onValueChange={value => setReviewDrafts(current => ({ ...current, [proposal.id]: { ...draft, rating: Number(value) } }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Rating" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 4, 3, 2, 1].map(value => (
                                    <SelectItem key={value} value={String(value)}>{value} stars</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Textarea value={draft.review} onChange={event => setReviewDrafts(current => ({ ...current, [proposal.id]: { ...draft, review: event.target.value } }))} placeholder="Describe communication quality, trust, and overall trade experience." rows={4} />
                              <Button className="rounded-full" onClick={() => submitReview(proposal.id)}>Submit Ratings and Reviews</Button>
                            </div>
                          </div>
                        );
                      }) : <p className="text-sm leading-7 text-muted-foreground">No completed trades are currently awaiting your Ratings and Reviews.</p>}
                    </CardContent>
                  </Card>
                  <Card className="surface-card bg-card/90">
                    <CardHeader>
                      <CardTitle className="text-3xl">Received Ratings and Reviews</CardTitle>
                      <CardDescription>Your reputation is built one careful exchange at a time.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {dashboard.ratingsAndReviews.length > 0 ? dashboard.ratingsAndReviews.map(review => (
                        <div key={review.id} className="rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-11 w-11 border border-border/60">
                                <AvatarImage src={review.reviewer.avatarUrl ?? undefined} alt={review.reviewer.displayName} />
                                <AvatarFallback>{initials(review.reviewer.displayName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground">{review.reviewer.displayName}</p>
                                <p className="text-xs text-muted-foreground">Trade Proposal #{review.proposalId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-primary">
                              {Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-muted-foreground">{review.review}</p>
                        </div>
                      )) : <p className="text-sm leading-7 text-muted-foreground">You have not received Ratings and Reviews yet.</p>}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="profile">
                <Card className="surface-card bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-3xl">Subscriber Profile</CardTitle>
                    <CardDescription>Maintain your display name, avatar, and profile narrative so other collectors can trade with confidence.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="grid gap-5 md:max-w-3xl" onSubmit={submitProfile}>
                      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
                        <Avatar className="h-24 w-24 border border-border/70">
                          <AvatarImage src={profileAvatar?.previewUrl ?? dashboard.profile.avatarUrl ?? undefined} alt={dashboard.profile.displayName} />
                          <AvatarFallback>{initials(dashboard.profile.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Label htmlFor="avatar-upload">Avatar</Label>
                          <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Display name</Label>
                        <Input id="display-name" value={profileDraft.displayName || dashboard.profile.displayName} onChange={event => setProfileDraft(current => ({ ...current, displayName: event.target.value }))} placeholder="Display name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-bio">Profile bio</Label>
                        <Textarea id="profile-bio" rows={6} value={profileDraft.bio || dashboard.profile.bio} onChange={event => setProfileDraft(current => ({ ...current, bio: event.target.value }))} placeholder="Share your collecting focus and preferred trade style." />
                      </div>
                      <Button type="submit" className="w-fit rounded-full px-6" disabled={saveProfileMutation.isPending}>
                        {saveProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save subscriber profile
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-8 w-auto opacity-70" />
              <span className="text-white/40 text-sm font-medium">© 2026 Tradebilia. All rights reserved.</span>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-white/40 hover:text-white/80 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-white/40 hover:text-white/80 text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-white/40 hover:text-white/80 text-sm transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-white/20 text-[10px] uppercase tracking-widest max-w-2xl mx-auto leading-relaxed">
              Tradebilia is a marketplace for collectors. We are not liable for trades gone wrong. 
              Always trade with caution and verify your counterpart's reputation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
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
import { Heart, Loader2, MessageSquareText, Search, ShieldCheck, Sparkles, Star, ArrowRightLeft, Clock3, Plus } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type UploadedImage = {
  name: string;
  type: string;
  contentBase64: string;
  previewUrl: string;
};

type ListingCategory = Exclude<(typeof categoryOptions)[number]["value"], "all">;
type ListingCondition = Exclude<(typeof conditionOptions)[number]["value"], "all">;

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

const categoryOptions = [
  { value: "all", label: "All Categories" },
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
  { value: "all", label: "All Conditions" },
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "CE";
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
  const utils = trpc.useUtils();

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"]>("all");
  const [condition, setCondition] = useState<(typeof conditionOptions)[number]["value"]>("all");
  const [listingDraft, setListingDraft] = useState<{
    title: string;
    category: ListingCategory;
    condition: ListingCondition;
    description: string;
  }>({
    title: "",
    category: "comics",
    condition: "near_mint",
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

  const marketplaceQuery = trpc.market.feed.useQuery({ category, condition, keyword });
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createListingMutation = trpc.market.createListing.useMutation({
    onSuccess: async () => {
      setListingDraft({ title: "", category: "comics", condition: "near_mint", description: "" });
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#04030f] text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
        <div className="container flex flex-col gap-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <span className="text-2xl font-semibold tracking-tight text-white">Search</span>
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                <Input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder="Search listings, categories, and collectors"
                  className="h-10 rounded-md border-white/15 bg-white/92 pl-9 text-sm text-slate-900 placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {isAuthenticated && dashboard ? (
                <Link href="/profile" className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">
                  <Avatar className="h-9 w-9 border border-white/15">
                    <AvatarImage src={dashboard.profile.avatarUrl ?? undefined} alt={dashboard.profile.displayName} />
                    <AvatarFallback>{initials(dashboard.profile.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">My TRADEBILIA</p>
                    <p className="text-xs text-white/70">{dashboard.profile.displayName} · Trade History: {dashboard.profile.tradeHistoryCount}</p>
                  </div>
                </Link>
              ) : (
                <div className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
                  Tradebilia Subscriber Exchange
                </div>
              )}
              <Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => (isAuthenticated ? logout() : (window.location.href = getLoginUrl()))}>
                {isAuthenticated ? "Sign out" : "Subscriber Sign In"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-white/10 bg-white/95 text-slate-900 sm:grid-cols-4 lg:grid-cols-8">
            {categoryOptions.filter(option => option.value !== "all").map(option => (
              <Link
                key={option.value}
                href={`/category/${option.value}`}
                className={`min-h-12 border-b border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-slate-100 lg:text-[11px] ${category === option.value ? "bg-[#303030] text-white" : "bg-white text-slate-900"}`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="pb-24">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(56,48,136,0.32),_transparent_55%),linear-gradient(90deg,#11164b_0%,#171d63_45%,#11164b_100%)] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:150px_100%] opacity-25" />
          <div className="container relative py-10 sm:py-14 lg:py-20">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
              <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia logo" className="h-auto w-full max-w-3xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.35)]" />
              <div className="max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.36em] text-white/70">Trusted collector-to-collector trading</p>
                <h2 className="font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">A collector marketplace shaped by community trust, Trade Proposals, and meaningful exchanges.</h2>
                <p className="mx-auto max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                  Tradebilia brings subscriber profiles, collectible item listings, Watchlist tracking, messaging, Ratings and Reviews, and Trade History together in one polished trading environment.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(90deg,#8d8f93_0%,#c6d7ea_50%,#8d8f93_100%)] py-5 text-slate-950">
          <div className="container grid gap-5 text-center sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total Members", dashboard?.profile.tradeHistoryCount ? `${Math.max(dashboard.profile.tradeHistoryCount * 12, 40)}k` : "40k"],
              ["Total Items", marketplaceQuery.data?.highlights.totalListings ? `${(marketplaceQuery.data.highlights.totalListings * 1250).toLocaleString()}` : "3,500,000"],
              ["Total Value", marketplaceQuery.data?.highlights.totalListings ? `$${(marketplaceQuery.data.highlights.totalListings * 7500).toLocaleString()}` : "$20,500,000"],
              ["Total Trades", marketplaceQuery.data?.highlights.completedTrades ? `${marketplaceQuery.data.highlights.completedTrades}k` : "10k"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">{label as string}</p>
                <p className="mt-1 text-3xl font-semibold">{value as string}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container grid gap-6 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <aside className="overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.85),transparent_24%),linear-gradient(180deg,#2758ff_0%,#4e28d7_50%,#8b2cf3_100%)] p-5 text-white shadow-[0_20px_45px_rgba(40,34,112,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">Tradebilia</p>
            <div className="mt-6 space-y-4 text-sm">
              {["Upcoming Conventions", "Shipping Supplies", "Report a User", "Referral Request"].map(item => (
                <button key={item} type="button" className="block text-left font-medium text-white/92 transition hover:text-white">
                  {item}
                </button>
              ))}
              <Link href="/inventory" className="block text-left font-medium text-white transition hover:text-white/80">
                My Inventory
              </Link>
            </div>
          </aside>

          <div className="space-y-8">
            <div className="flex flex-col gap-5 rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-[0_18px_45px_-30px_rgba(43,30,86,0.32)] lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">Marketplace controls</p>
                <h3 className="mt-2 font-serif text-4xl text-foreground">Recently Added</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={value => setCategory(value as typeof category)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={value => setCondition(value as typeof condition)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2 xl:col-span-1">
                  <Label htmlFor="keyword-secondary">Keyword search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="keyword-secondary" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Search by title or description" className="pl-9" />
                  </div>
                </div>
              </div>
            </div>

            {marketplaceQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                  {(marketplaceQuery.data?.listings ?? []).slice(0, 5).map(listing => (
                    <Card key={listing.id} className="surface-card overflow-hidden border-border/70 bg-white/95">
                      <div className="aspect-[4/4.4] overflow-hidden bg-muted">
                        {listing.primaryPhotoUrl ? (
                          <img src={listing.primaryPhotoUrl} alt={listing.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/80 to-secondary text-accent-foreground">
                            <Sparkles className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <Link href={`/listings/${listing.id}`} className="line-clamp-2 text-lg font-semibold text-foreground transition hover:text-primary">
                            {listing.title}
                          </Link>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{listing.categoryLabel}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{listing.conditionLabel}</p>
                          <p>Ratings and Reviews: {listing.ownerRating.averageRating.toFixed(1)} · {listing.ownerRating.reviewCount}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/listings/${listing.id}`} className="inline-flex h-9 items-center rounded-full border border-border/70 px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary">
                            View details
                          </Link>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="rounded-full" onClick={() => beginProposal(listing.id)} disabled={user?.id === listing.ownerId}>
                                Trade Proposals
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="max-w-2xl rounded-[2rem]">
                            <DialogHeader>
                              <DialogTitle className="text-3xl">Create a Trade Proposal</DialogTitle>
                              <DialogDescription>
                                Send an expression of interest for <span className="font-semibold text-foreground">{listing.title}</span>. The item owner will then review your inventory and select any items they would like to request in return.
                              </DialogDescription>
                            </DialogHeader>
                            {isAuthenticated ? (
                              <form className="space-y-5" onSubmit={submitProposal}>
                                <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                                  Your Trade Proposal starts as an expression of interest. You do not select exchange items at this stage. Once the owner reviews your request, they can choose one or more items from your inventory or refuse if they do not see anything of interest.
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`proposal-note-${listing.id}`}>Message</Label>
                                  <Textarea
                                    id={`proposal-note-${listing.id}`}
                                    value={proposalDraft.note}
                                    onChange={event => setProposalDraft(current => ({ ...current, requestedListingId: listing.id, note: event.target.value }))}
                                    placeholder="Introduce yourself, explain what interests you about this item, and invite the owner to review your inventory."
                                    rows={5}
                                  />
                                </div>
                                <Button type="submit" className="rounded-full" disabled={createProposalMutation.isPending}>
                                  {createProposalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Send Trade Proposal
                                </Button>
                              </form>
                            ) : (

                                <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/40 p-6">
                                  <p className="text-sm leading-7 text-muted-foreground">You need a subscriber account to send Trade Proposals, message other collectors, and maintain a Watchlist.</p>
                                  <Button className="rounded-full" onClick={() => (window.location.href = getLoginUrl())}>Subscriber Sign In</Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={!isAuthenticated || watchlistMutation.isPending}
                            onClick={() => watchlistMutation.mutate({ listingId: listing.id })}
                          >
                            <Heart className={`mr-2 h-4 w-4 ${listing.savedToWatchlist ? "fill-current" : ""}`} />
                            Watchlist
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-4">
                  <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top,rgba(52,146,255,0.45),transparent_45%),linear-gradient(135deg,#071b4d_0%,#0f3469_100%)] text-white shadow-[0_20px_50px_rgba(10,25,70,0.28)] xl:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-[0.28em] text-white/75">Most Viewed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-white/85">
                      {(marketplaceQuery.data?.listings ?? []).slice(0, 5).map((listing, index) => (
                        <p key={listing.id}>{index + 1}. {listing.title}</p>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#06070d_0%,#292b35_100%)] text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] xl:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-[0.28em] text-white/75">Most Requested</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-white/85">
                      {(marketplaceQuery.data?.listings ?? []).slice(0, 5).reverse().map((listing, index) => (
                        <p key={listing.id}>{index + 1}. {listing.title}</p>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#dfc6b8_0%,#efe3df_100%)] text-slate-900 shadow-[0_20px_50px_rgba(98,78,63,0.2)] xl:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-[0.28em] text-slate-700">Top Rated Traders</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-700">
                      {(marketplaceQuery.data?.listings ?? []).slice(0, 5).map((listing, index) => (
                        <p key={listing.id}>{index + 1}. {listing.owner.displayName}</p>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top,rgba(18,222,255,0.35),transparent_35%),linear-gradient(135deg,#003870_0%,#0c75a5_100%)] text-white shadow-[0_20px_50px_rgba(3,64,98,0.32)] xl:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-sm uppercase tracking-[0.28em] text-white/75">Highest Trade Value</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-white/85">
                      {spotlightStats.map(stat => (
                        <p key={stat.label}>{stat.label}: {stat.value}</p>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </section>

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
                                {categoryOptions.filter(option => option.value !== "all").map(option => (
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
                                {conditionOptions.filter(option => option.value !== "all").map(option => (
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
                        {listing.primaryPhotoUrl ? <img src={listing.primaryPhotoUrl} alt={listing.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-2xl font-semibold text-foreground">{listing.title}</h4>
                          <Badge variant="outline" className="rounded-full">{listing.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{listing.categoryLabel} · {listing.conditionLabel}</p>
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
                              <p className="text-sm font-semibold text-foreground">{proposal.counterpart.displayName} {proposal.direction === "incoming" ? "sent you a trade request" : "received your trade request"}</p>
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
                      <CardTitle className="text-4xl">{activeProposal ? activeProposal.counterpart.displayName : "Trade detail"}</CardTitle>
                      <CardDescription>{activeProposal ? "Review the active request, choose inventory, send responses, and keep the audit trail complete." : "Select a Trade Proposal to inspect its details."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-5">
                      {activeProposal ? (
                        <>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Requested listing</p>
                              <p className="mt-3 text-2xl font-semibold text-foreground">{activeProposal.requestedListing?.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{activeProposal.requestedListing?.categoryLabel} · {activeProposal.requestedListing?.conditionLabel}</p>
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
                                  <p className="mt-1 text-sm text-muted-foreground">Browse {activeProposal.counterpart.displayName}'s inventory and select the items you want to include in your response.</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-600">
                                  <Clock3 className="h-4 w-4" /> Online now
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {activeProposal.requesterInventory.map(item => {
                                  const checked = (selectionDrafts[activeProposal.id]?.offeredListingIds ?? []).includes(item.id);
                                  return (
                                    <label key={item.id} className={`rounded-[1.25rem] border p-4 transition ${checked ? "border-primary bg-primary/8 shadow-[0_12px_30px_-24px_rgba(80,40,220,0.8)]" : "border-border/70 bg-card"}`}>
                                      <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={checked} onChange={event => toggleSelectionItem(activeProposal.id, item.id, event.target.checked)} className="mt-1 h-4 w-4" />
                                        <div>
                                          <p className="font-semibold text-foreground">{item.title}</p>
                                          <p className="mt-1 text-sm text-muted-foreground">{item.categoryLabel} · {item.conditionLabel}</p>
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
                                    {activeProposal.offeredListings.map(item => (
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
                                <p><span className="font-semibold">Full name:</span> {activeProposal.contactDetails.fullName || "Pending"}</p>
                                <p><span className="font-semibold">Email:</span> {activeProposal.contactDetails.email || "Pending"}</p>
                                <p><span className="font-semibold">Phone:</span> {activeProposal.contactDetails.phone || "Pending"}</p>
                                <p><span className="font-semibold">Address:</span> {activeProposal.contactDetails.address || "Pending"}</p>
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              <MessageSquareText className="h-4 w-4" /> Chat and audit trail
                            </div>
                            <ScrollArea className="mt-4 h-56 rounded-[1.5rem] border border-border/70 bg-card p-4">
                              <div className="space-y-3">
                                {activeProposal.messages.map(message => (
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
                          {listing.primaryPhotoUrl ? <img src={listing.primaryPhotoUrl} alt={listing.title} className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="space-y-3 p-5">
                          <h4 className="text-2xl font-semibold text-foreground">{listing.title}</h4>
                          <p className="text-sm text-muted-foreground">{listing.categoryLabel} · {listing.conditionLabel}</p>
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
                          <p className="text-sm text-muted-foreground">Counterpart: {proposal.counterpart.displayName}</p>
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
                            <p className="font-semibold text-foreground">Review {proposal.counterpart.displayName}</p>
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
        ) : (
          <section className="container pt-8">
            <Card className="surface-card overflow-hidden bg-card/90">
              <CardContent className="grid gap-8 p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
                <div className="space-y-4">
                  <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">Subscriber access</Badge>
                  <h3 className="section-heading">Sign in to unlock the trading workspace</h3>
                  <p className="text-base leading-8 text-muted-foreground">
                    Subscriber accounts activate your profile, Trade Proposals, messaging, Watchlist, Trade History, and Ratings and Reviews dashboard.
                  </p>
                  <Button className="rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
                    Continue to subscriber sign in
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    [Clock3, "Trade History", "Follow each exchange from the first message through completion."],
                    [Heart, "Watchlist", "Save rare finds and revisit them later with context."],
                    [MessageSquareText, "Messaging system", "Clarify condition, provenance, and shipping expectations."],
                    [Star, "Ratings and Reviews", "Build community trust after every completed trade."],
                  ].map(([Icon, title, body]) => {
                    const RenderIcon = Icon as typeof Clock3;
                    return (
                      <div key={title as string} className="rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
                        <RenderIcon className="h-5 w-5 text-primary" />
                        <h4 className="mt-4 text-2xl font-semibold text-foreground">{title as string}</h4>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{body as string}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

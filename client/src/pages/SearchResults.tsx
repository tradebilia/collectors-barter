import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Filter, Loader2, MapPin, MessageSquareText, Search, Sparkles, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { CategoryBar } from "@/components/CategoryBar";
import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";
import { TopBar } from "@/components/TopBar";
import { getLoginUrl } from "@/const";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  formatGrade,
  tradebiliaCategories,
  tradebiliaConditionOptions,
  tradebiliaCategoryThemes,
  type TradebiliaCategorySlug,
} from "@/lib/tradebilia";
import { getCategoryPaginationState } from "@shared/categoryPagination";
import { getGlobalSearchQuery, parseGlobalSearchValue } from "@shared/globalSearch";

type SearchSort = "newest" | "title" | "value_low_high" | "value_high_low";

type SearchFilters = {
  category: "all" | TradebiliaCategorySlug;
  condition: "all" | (typeof tradebiliaConditionOptions)[number]["value"];
  valueMin: string;
  valueMax: string;
  verifiedMerchantsOnly: boolean;
  sort: SearchSort;
};

const emptySearchFilters: SearchFilters = {
  category: "all",
  condition: "all",
  valueMin: "",
  valueMax: "",
  verifiedMerchantsOnly: false,
  sort: "newest",
};

const searchTheme = tradebiliaCategoryThemes.sports_cards;
const globalSearchHeroCollageUrl = "/manus-storage/tradebilia-warm-archival-hero-04_cdf269c5.png";

export function SearchResults() {
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const urlQuery = useMemo(() => getGlobalSearchQuery(rawSearch), [rawSearch]);
  const lastHandledUrlQuery = useRef(urlQuery);
  const [pendingQuery, setPendingQuery] = useState(urlQuery);
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const [pendingFilters, setPendingFilters] = useState<SearchFilters>(emptySearchFilters);
  const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>(emptySearchFilters);
  const [resultsPerPage, setResultsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [proposalListingId, setProposalListingId] = useState<number | null>(null);
  const [proposalNote, setProposalNote] = useState("");

  const createProposalMutation = trpc.market.createTradeProposal.useMutation({
    onSuccess: async () => {
      setProposalListingId(null);
      setProposalNote("");
      toast.success("Trade Proposal sent.");
      await utils.market.search.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (lastHandledUrlQuery.current === urlQuery) return;
    lastHandledUrlQuery.current = urlQuery;
    setPendingQuery(urlQuery);
    setSubmittedQuery(urlQuery);
    setPendingFilters(emptySearchFilters);
    setSubmittedFilters(emptySearchFilters);
    setCurrentPage(1);
  }, [urlQuery]);

  const preliminaryPagination = getCategoryPaginationState(0, currentPage, resultsPerPage);
  const searchInput = useMemo(() => {
    return {
      query: submittedQuery,
      category: submittedFilters.category === "all" ? undefined : submittedFilters.category,
      condition: submittedFilters.condition === "all" ? undefined : submittedFilters.condition,
      valueMin: parseGlobalSearchValue(submittedFilters.valueMin),
      valueMax: parseGlobalSearchValue(submittedFilters.valueMax),
      verifiedMerchantsOnly: submittedFilters.verifiedMerchantsOnly || undefined,
      sort: submittedFilters.sort,
      limit: resultsPerPage,
      offset: (preliminaryPagination.currentPage - 1) * resultsPerPage,
    };
  }, [submittedQuery, submittedFilters, resultsPerPage, preliminaryPagination.currentPage]);

  const resultsQuery = trpc.market.search.useQuery(searchInput);
  const totalResults = resultsQuery.data?.highlights.totalListings ?? 0;
  const pagination = getCategoryPaginationState(totalResults, currentPage, resultsPerPage);

  useEffect(() => {
    if (pagination.currentPage !== currentPage) setCurrentPage(pagination.currentPage);
  }, [currentPage, pagination.currentPage]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = pendingQuery.trim();
    lastHandledUrlQuery.current = query;
    setSubmittedQuery(query);
    setSubmittedFilters(pendingFilters);
    setCurrentPage(1);
    setLocation(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const clearSearch = () => {
    lastHandledUrlQuery.current = "";
    setPendingQuery("");
    setSubmittedQuery("");
    setPendingFilters(emptySearchFilters);
    setSubmittedFilters(emptySearchFilters);
    setCurrentPage(1);
    setLocation("/search");
  };

  const hasFilters = submittedFilters.category !== "all" || submittedFilters.condition !== "all" || submittedFilters.valueMin !== "" || submittedFilters.valueMax !== "" || submittedFilters.verifiedMerchantsOnly;
  const listings = resultsQuery.data?.listings ?? [];

  return (
    <div className={`min-h-screen ${searchTheme.pageClassName}`}>
      <TopBar searchPlaceholder="Search the full Tradebilia exchange..." />
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden border-b border-[#0f5563]/70 text-[#fff4e0]" style={{ backgroundImage: `url(${globalSearchHeroCollageUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,16,11,0.58)_0%,rgba(24,16,11,0.28)_48%,rgba(24,16,11,0.58)_100%)]" />
        <div className="container relative flex h-[400px] min-h-[400px] flex-col items-center justify-center py-4 text-center sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#fff4e0]/80">All categories · one exchange</p>
          <h1 className="sr-only">Search the Exchange</h1>
          <div className="mt-3 flex h-36 w-[calc(100vw-2rem)] max-w-[100rem] items-center justify-center sm:h-44 lg:h-56">
            <AnimatedLogoSmall70 fontSize={135} wheelScale={1.12} dividerScale={1.12} wheelOffsetX={-30} wheelOffsetY={-20} dividerOffsetY={-20} wheelStrokeWidth={6} dividerStrokeWidth={3.6} fixedCategoryMetrics centerLockup />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#fff4e0]/90 sm:text-base">Search the Exchange to find active collectible listings across every Tradebilia category, then narrow the marketplace with broad, truthful filters.</p>
          <Badge className={`${searchTheme.chipClassName} mt-5 rounded-full px-3 py-1 text-xs`}>{submittedQuery ? "Searching all categories" : "Browsing all active listings"}</Badge>
        </div>
      </section>
      <CategoryBar />

      <main className="container flex min-h-[32rem] flex-col gap-0 py-6 lg:flex-row lg:py-8">
        <aside className={`w-full shrink-0 border p-4 lg:w-56 ${searchTheme.panelClassName}`}>
          <div className="mb-4 flex items-center gap-2">
            <Filter className={`h-4 w-4 ${searchTheme.accentClassName}`} />
            <h2 className="font-semibold">Filters</h2>
          </div>
          <form className="space-y-4" onSubmit={submitSearch}>
            <div className="space-y-1.5">
              <Label htmlFor="global-search-query" className="text-xs uppercase tracking-[0.12em] opacity-70">Search the exchange</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
                <Input id="global-search-query" value={pendingQuery} onChange={event => setPendingQuery(event.target.value)} placeholder="Player, title, set, year…" maxLength={100} className="h-9 bg-white/85 pl-8 text-xs text-black" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em] opacity-70">Category</Label>
              <Select value={pendingFilters.category} onValueChange={value => setPendingFilters(current => ({ ...current, category: value as SearchFilters["category"] }))}>
                <SelectTrigger className="h-9 bg-white/85 text-xs text-black"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {tradebiliaCategories.map(category => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em] opacity-70">Condition</Label>
              <Select value={pendingFilters.condition} onValueChange={value => setPendingFilters(current => ({ ...current, condition: value as SearchFilters["condition"] }))}>
                <SelectTrigger className="h-9 bg-white/85 text-xs text-black"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conditions</SelectItem>
                  {tradebiliaConditionOptions.map(condition => <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.12em] opacity-70">Value range</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" inputMode="decimal" value={pendingFilters.valueMin} onChange={event => setPendingFilters(current => ({ ...current, valueMin: event.target.value }))} placeholder="Min" className="h-9 bg-white/85 text-xs text-black" />
                <Input type="number" min="0" inputMode="decimal" value={pendingFilters.valueMax} onChange={event => setPendingFilters(current => ({ ...current, valueMax: event.target.value }))} placeholder="Max" className="h-9 bg-white/85 text-xs text-black" />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-xs leading-5">
              <input type="checkbox" checked={pendingFilters.verifiedMerchantsOnly} onChange={event => setPendingFilters(current => ({ ...current, verifiedMerchantsOnly: event.target.checked }))} className="mt-1 h-3.5 w-3.5 accent-[#0f5563]" />
              <span><span className="font-semibold">Verified merchants only</span><br /><span className="opacity-70">Applied with Search or Enter.</span></span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={clearSearch} className="h-9 flex-1 text-xs"><X className="mr-1 h-3.5 w-3.5" />Clear</Button>
              <Button type="submit" className="h-9 flex-1 bg-[#0f5563] text-xs text-white hover:bg-[#0b4652]"><Search className="mr-1 h-3.5 w-3.5" />Search</Button>
            </div>
          </form>
        </aside>

        <section className="min-w-0 flex-1 px-0 py-6 lg:px-6 lg:py-0">
          <div className="border-b border-current/10 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium opacity-75">{resultsQuery.isLoading ? "Loading active listings…" : totalResults ? `Showing ${pagination.firstResultNumber}–${pagination.lastResultNumber} of ${totalResults} listings` : "0 listings"}</p>
                <p className="mt-1 text-xs opacity-65">{submittedQuery ? <>Results for <span className="font-semibold">{submittedQuery}</span></> : "All active listings across the exchange"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={submittedFilters.sort} onValueChange={value => { const sort = value as SearchSort; setPendingFilters(current => ({ ...current, sort })); setSubmittedFilters(current => ({ ...current, sort })); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 w-40 bg-white/85 text-xs text-black"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newly listed</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="value_low_high">Value: Low to high</SelectItem>
                    <SelectItem value="value_high_low">Value: High to low</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-xs opacity-75"><span>Per page:</span><Select value={String(resultsPerPage)} onValueChange={value => { setResultsPerPage(Number(value)); setCurrentPage(1); }}><SelectTrigger className="h-9 w-18 bg-white/85 text-xs text-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="12">12</SelectItem><SelectItem value="24">24</SelectItem><SelectItem value="48">48</SelectItem></SelectContent></Select></div>
              </div>
            </div>
          </div>

          {resultsQuery.isLoading ? (
            <div className="mt-6 flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-dashed border-current/25"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : resultsQuery.isError ? (
            <div className="mt-6 rounded-[2rem] border border-red-300/60 bg-red-50 p-8 text-red-950"><h2 className="font-semibold">Search results could not load</h2><p className="mt-2 text-sm">{resultsQuery.error.message}</p></div>
          ) : listings.length === 0 ? (
            <div className={`mt-6 rounded-[2rem] border p-8 text-center ${searchTheme.panelClassName}`}><Sparkles className={`mx-auto h-10 w-10 ${searchTheme.accentClassName}`} /><h2 className="mt-4 text-2xl font-semibold" style={{ fontFamily: searchTheme.headingFont }}>No listings match this search yet.</h2><p className="mt-3 text-sm opacity-75">Try a broader term, remove a filter, or explore a specific category exchange.</p></div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {listings.map(listing => (
                  <Card key={listing.id} className="overflow-hidden rounded-md border border-gray-200 bg-white text-[#153746] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <Link href={`/listings/${listing.id}`} className="block aspect-[7/9] border-b border-current/10 bg-white p-0"><img src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })} alt={listing.title} className="h-full w-full object-contain" /></Link>
                    <CardContent className="space-y-1 p-1.5">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[0.55rem] font-bold uppercase tracking-[0.1em] text-slate-600">{listing.categoryLabel}</p><Link href={`/listings/${listing.id}`} className="mt-1 block min-h-[2rem] line-clamp-2 text-xs font-semibold leading-tight hover:opacity-75">{listing.title}</Link></div>{listing.featured ? <Badge className="rounded-full bg-[#0f5563] px-1 py-0 text-[0.5rem] text-[#fff1d2]">Featured</Badge> : null}</div>
                       <div className="grid grid-cols-2 gap-1 rounded-md border border-current/10 bg-black/5 p-1 text-[0.5rem]"><div><p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-slate-600">{listing.grade && Number(listing.grade) > 0 ? "Grade" : "Condition"}</p><p className="mt-0 truncate text-[0.75rem] font-bold leading-tight">{listing.grade && Number(listing.grade) > 0 ? `${listing.certificationCompany ? `${listing.certificationCompany} ` : ""}${formatGrade(listing.grade)}` : listing.conditionLabel}</p></div><div><p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-slate-600">Value</p><p className="mt-0 truncate text-[0.75rem] font-bold leading-tight">{listing.estimatedValue === null ? "—" : `$${listing.estimatedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p></div><div><p className="text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-slate-600">Collector</p><p className="mt-0 truncate text-[0.65rem] font-semibold">{listing.owner.displayName}</p></div><div><p className="whitespace-nowrap text-[0.42rem] font-semibold uppercase tracking-[0.06em] text-slate-600">Trader Rating</p><p className="mt-0 flex items-center gap-0.5 font-semibold text-[0.65rem]"><Star className="h-2 w-2 fill-current" />{listing.ownerRating.averageRating.toFixed(1)}</p></div></div>
                       {listing.distanceBand && <p className="flex items-center gap-1 text-[0.55rem] font-semibold text-teal-700"><MapPin className="h-2.5 w-2.5" /><span>{listing.distanceBand}</span></p>}
                       <Dialog open={proposalListingId === listing.id} onOpenChange={open => {
                         setProposalListingId(open ? listing.id : null);
                         if (!open) setProposalNote("");
                       }}>
                         <DialogTrigger asChild>
                           <Button
                             size="sm"
                             variant="outline"
                             className="h-7 w-full rounded-full border-[#0f5563]/30 px-2 text-[10px] font-bold uppercase tracking-wider text-[#0f5563] hover:bg-[#0f5563]/10"
                             disabled={!isAuthenticated || listing.ownerId === user?.id}
                             title={listing.ownerId === user?.id ? "You cannot message or trade with your own item" : "Start a trade proposal"}
                           >
                             <MessageSquareText className="mr-1 h-3 w-3" /> Trade
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="sm:max-w-lg">
                           <DialogHeader>
                             <DialogTitle>Start a Trade Proposal</DialogTitle>
                             <DialogDescription>Add a personal message for the listing owner before opening a trade discussion.</DialogDescription>
                           </DialogHeader>
                           <div className="space-y-3">
                             <Label htmlFor={`search-proposal-${listing.id}`}>Your personalized message</Label>
                             <Textarea id={`search-proposal-${listing.id}`} value={proposalNote} onChange={event => setProposalNote(event.target.value)} placeholder={`Share why you would like to trade for ${listing.title}.`} maxLength={1000} className="min-h-28 resize-y" />
                             <p className="text-right text-xs text-slate-500">{proposalNote.length}/1000</p>
                             <Button className="w-full bg-[#0f5563] hover:bg-[#0b4652]" disabled={createProposalMutation.isPending || !proposalNote.trim()} onClick={() => createProposalMutation.mutate({ requestedListingId: listing.id, note: proposalNote.trim() })}>
                               {createProposalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send Trade Proposal
                             </Button>
                           </div>
                         </DialogContent>
                       </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-4 border-t border-current/10 pt-6"><Button onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={pagination.currentPage === 1} variant="outline" size="sm">← Previous</Button><span className="text-sm font-medium opacity-70">Page {pagination.currentPage} of {pagination.totalPages}</span><Button onClick={() => setCurrentPage(page => Math.min(pagination.totalPages, page + 1))} disabled={pagination.currentPage === pagination.totalPages} variant="outline" size="sm">Next →</Button></div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

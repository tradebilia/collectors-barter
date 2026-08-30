import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBar } from "@/components/CategoryBar";
import { TopBar } from "@/components/TopBar";
import { trpc } from "@/lib/trpc";
import { Award, Crown, Filter, HelpCircle, Loader2, MapPin, Search, SlidersHorizontal, Sparkles, Star, UserRound, X } from "lucide-react";
import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const categoryOptions = [
  ["sports_cards", "Sports Cards"],
  ["comics", "Comics"],
  ["coins", "Coins"],
  ["stamps", "Stamps"],
  ["pokemon", "Pokémon"],
  ["vintage_toys", "Vintage Toys"],
  ["video_games", "Video Games"],
  ["movies", "Movies"],
  ["autographs", "Autographs"],
  ["disney_pins", "Disney Pins"],
] as const;

type DirectoryFilters = {
  query: string;
  region: string;
  categories: string[];
  distanceMiles: string;
  verifiedMerchantsOnly: boolean;
  minRating: string;
  minReviewCount: string;
  minCompletedTrades: string;
  activeListingsOnly: boolean;
  listingValueRange: string;
  memberSince: string;
  sort: "best_match" | "best_rated" | "most_trades" | "most_listings" | "newest" | "nearest";
};

const defaultFilters: DirectoryFilters = {
  query: "",
  region: "all",
  categories: [],
  distanceMiles: "",
  verifiedMerchantsOnly: false,
  minRating: "all",
  minReviewCount: "all",
  minCompletedTrades: "all",
  activeListingsOnly: false,
  listingValueRange: "all",
  memberSince: "all",
  sort: "best_match",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "TB";
}

function valueRangeFilters(value: string) {
  if (value === "under_500") return { listingValueMax: 500 };
  if (value === "500_2500") return { listingValueMin: 500, listingValueMax: 2500 };
  if (value === "2500_10000") return { listingValueMin: 2500, listingValueMax: 10000 };
  if (value === "10000_plus") return { listingValueMin: 10000 };
  return {};
}

function toQueryInput(filters: DirectoryFilters, distanceMiles?: number) {
  return {
    query: filters.query.trim() || undefined,
    region: filters.region === "all" ? undefined : filters.region,
    categories: filters.categories.length ? filters.categories as (typeof categoryOptions)[number][0][] : undefined,
    verifiedMerchantsOnly: filters.verifiedMerchantsOnly || undefined,
    minRating: filters.minRating === "all" ? undefined : Number(filters.minRating),
    minReviewCount: filters.minReviewCount === "all" ? undefined : Number(filters.minReviewCount),
    minCompletedTrades: filters.minCompletedTrades === "all" ? undefined : Number(filters.minCompletedTrades),
    activeListingsOnly: filters.activeListingsOnly || undefined,
    memberSince: filters.memberSince === "all" ? undefined : filters.memberSince as "past_year" | "past_three_years" | "longstanding",
    sort: filters.sort,
    distanceMiles,
    ...valueRangeFilters(filters.listingValueRange),
  };
}

export default function MemberSearch() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<DirectoryFilters>(defaultFilters);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [openExactMatch, setOpenExactMatch] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deferredDistanceMiles = useDeferredValue(filters.distanceMiles);
  const requestedDistance = Number(deferredDistanceMiles);
  const hasDistanceFilter = isAuthenticated && Number.isFinite(requestedDistance) && requestedDistance > 0;
  const publicInput = useMemo(() => toQueryInput(filters), [filters]);
  const nearbyInput = useMemo(() => toQueryInput(filters, hasDistanceFilter ? requestedDistance : undefined), [filters, hasDistanceFilter, requestedDistance]);
  const publicMembersQuery = trpc.members.search.useQuery(publicInput, { enabled: !hasDistanceFilter });
  const nearbyMembersQuery = trpc.members.searchNearby.useQuery(nearbyInput, { enabled: hasDistanceFilter });
  const membersQuery = hasDistanceFilter ? nearbyMembersQuery : publicMembersQuery;

  const applyUsernameSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const query = usernameDraft.trim();
    setFilters(current => ({ ...current, query }));
    setOpenExactMatch(Boolean(query));
  };

  const clearAll = () => {
    setFilters(defaultFilters);
    setUsernameDraft("");
    setOpenExactMatch(false);
  };

  const updateFilters = (updater: (current: DirectoryFilters) => DirectoryFilters) => {
    setFilters(updater);
    setOpenExactMatch(false);
  };

  const toggleCategory = (category: string) => updateFilters(current => ({
    ...current,
    categories: current.categories.includes(category)
      ? current.categories.filter(item => item !== category)
      : [...current.categories, category],
  }));

  const setAllCategories = () => updateFilters(current => ({ ...current, categories: categoryOptions.map(([value]) => value) }));
  const clearCategories = () => updateFilters(current => ({ ...current, categories: [] }));

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = [];
    if (filters.query.trim()) chips.push({ id: "query", label: `Username: ${filters.query.trim()}` });
    if (filters.region !== "all") chips.push({ id: "region", label: filters.region });
    filters.categories.forEach(category => {
      const label = categoryOptions.find(([value]) => value === category)?.[1] ?? category;
      chips.push({ id: `category:${category}`, label });
    });
    if (hasDistanceFilter) chips.push({ id: "distance", label: `Within ${requestedDistance} miles` });
    if (filters.verifiedMerchantsOnly) chips.push({ id: "verified", label: "Verified Merchant" });
    if (filters.minRating !== "all") chips.push({ id: "rating", label: `${filters.minRating}+ rating` });
    if (filters.minReviewCount !== "all") chips.push({ id: "reviews", label: `${filters.minReviewCount}+ reviews` });
    if (filters.minCompletedTrades !== "all") chips.push({ id: "trades", label: `${filters.minCompletedTrades}+ trades` });
    if (filters.activeListingsOnly) chips.push({ id: "listings", label: "Has active listings" });
    if (filters.listingValueRange !== "all") chips.push({ id: "value", label: `Value: ${filters.listingValueRange.replace(/_/g, " ")}` });
    if (filters.memberSince !== "all") chips.push({ id: "memberSince", label: `Member since: ${filters.memberSince.replace(/_/g, " ")}` });
    return chips;
  }, [filters, hasDistanceFilter, requestedDistance]);

  const removeActiveFilter = (id: string) => {
    updateFilters(current => {
      if (id === "query") {
        setUsernameDraft("");
        return { ...current, query: "" };
      }
      if (id === "region") return { ...current, region: "all" };
      if (id.startsWith("category:")) return { ...current, categories: current.categories.filter(category => category !== id.slice("category:".length)) };
      if (id === "distance") return { ...current, distanceMiles: "", sort: current.sort === "nearest" ? "best_match" : current.sort };
      if (id === "verified") return { ...current, verifiedMerchantsOnly: false };
      if (id === "rating") return { ...current, minRating: "all" };
      if (id === "reviews") return { ...current, minReviewCount: "all" };
      if (id === "trades") return { ...current, minCompletedTrades: "all" };
      if (id === "listings") return { ...current, activeListingsOnly: false };
      if (id === "value") return { ...current, listingValueRange: "all" };
      if (id === "memberSince") return { ...current, memberSince: "all" };
      return current;
    });
  };

  useEffect(() => {
    const exactMemberId = membersQuery.data?.exactMatchMemberId;
    if (!openExactMatch || !exactMemberId || membersQuery.data?.searchedQuery !== filters.query.trim()) return;
    setOpenExactMatch(false);
    setLocation(`/profile/${exactMemberId}`);
  }, [filters.query, membersQuery.data?.exactMatchMemberId, membersQuery.data?.searchedQuery, openExactMatch, setLocation]);

  const members = membersQuery.data?.members ?? [];
  const topCollectors = membersQuery.data?.rankings.topRated ?? [];
  const regions = membersQuery.data?.regions ?? [];

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <TopBar searchPlaceholder="Search Tradebilia..." />
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{ backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
        <div className="container flex h-52 items-center justify-center sm:h-60 lg:h-72">
          <img src="/manus-storage/MemberDirectory_a9b883f2.webp" alt="Member Directory" className="h-auto w-full max-w-[1049px] object-contain px-4" />
        </div>
      </section>
      <CategoryBar />

      <main className="container py-8 lg:py-10">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700">Collector discovery</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Find Collectors</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Find collectors by username, then refine results by collecting focus, trust, activity, location, and distance.</p>
        </div>

        <form onSubmit={applyUsernameSearch} className="rounded-[2rem] border border-slate-300/80 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-5">
          <Label htmlFor="member-directory-search" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Find a collector by username</Label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input id="member-directory-search" value={usernameDraft} onChange={event => setUsernameDraft(event.target.value)} className="h-13 border-slate-300 bg-slate-50 pl-12 text-base" placeholder="Enter username" />
            </div>
            <Button type="submit" className="h-13 rounded-xl bg-violet-700 px-7 text-base hover:bg-violet-800">Search</Button>
            <Button type="button" variant="outline" className="h-13 rounded-xl border-slate-300 bg-white px-6" onClick={clearAll}>Clear all</Button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Enter a username, then press Search to view that collector’s public profile.</p>
        </form>

        <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-xl border-slate-300 bg-white text-slate-900 xl:hidden" onClick={() => setMobileFiltersOpen(true)}>
          <Filter className="mr-2 h-4 w-4 text-violet-700" />
          Filters{activeFilterChips.length ? ` (${activeFilterChips.length})` : ""}
        </Button>

        <div className="mt-7 grid gap-6 xl:grid-cols-[322px_minmax(0,1fr)_265px]">
          {mobileFiltersOpen ? <button type="button" aria-label="Close filters" className="fixed inset-0 z-40 bg-slate-950/35 xl:hidden" onClick={() => setMobileFiltersOpen(false)} /> : null}
          <aside className={`fixed inset-y-0 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-r-[2rem] border border-slate-300/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] transition-transform duration-200 ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"} xl:sticky xl:top-4 xl:z-auto xl:h-fit xl:w-auto xl:translate-x-0 xl:rounded-[2rem] xl:shadow-[0_18px_48px_rgba(15,23,42,0.07)]`}>
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Filter className="h-5 w-5 text-violet-700" /><h2 className="text-2xl font-semibold text-slate-950">Filters</h2></div><div className="flex items-center gap-2"><SlidersHorizontal className="hidden h-4 w-4 text-slate-400 xl:block" /><Button type="button" variant="ghost" size="icon" className="xl:hidden" onClick={() => setMobileFiltersOpen(false)}><X className="h-4 w-4" /><span className="sr-only">Close filters</span></Button></div></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Selections update results automatically.</p>
            <div className="mt-5 space-y-5">
              <div className="space-y-2"><Label>State / region</Label><Select value={filters.region} onValueChange={value => updateFilters(current => ({ ...current, region: value }))}><SelectTrigger className="h-11 border-slate-300 bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All regions</SelectItem>{regions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label>Collecting categories</Label><div className="flex items-center gap-3 text-xs font-semibold"><button type="button" className="text-violet-700 hover:underline" onClick={setAllCategories}>Select all</button><button type="button" className="text-slate-600 hover:underline" onClick={clearCategories}>Clear categories</button></div></div><span className="block text-xs text-slate-500">Choose any that apply</span><div className="flex flex-wrap gap-2">{categoryOptions.map(([value, label]) => { const selected = filters.categories.includes(value); return <button key={value} type="button" role="checkbox" aria-checked={selected} onClick={() => toggleCategory(value)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${selected ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-800"}`}>{label}</button>; })}</div></div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-violet-700" /><p className="text-sm font-semibold text-slate-900">Distance</p></div>{isAuthenticated ? <><div className="space-y-2"><Label htmlFor="distance-miles">Within miles of your saved location</Label><Input id="distance-miles" type="number" min="1" max="500" inputMode="numeric" value={filters.distanceMiles} onChange={event => updateFilters(current => ({ ...current, distanceMiles: event.target.value, sort: event.target.value ? "nearest" : current.sort === "nearest" ? "best_match" : current.sort }))} placeholder="e.g. 25" className="h-10 bg-white" /></div><p className="text-xs leading-5 text-slate-600">Calculated privately from saved account locations. Addresses are never shown.</p></> : <p className="text-xs leading-5 text-slate-600">Sign in to filter members by distance from your saved location.</p>}</div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Trust &amp; experience</p><label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-900"><span>Verified Merchant only</span><input type="checkbox" checked={filters.verifiedMerchantsOnly} onChange={event => updateFilters(current => ({ ...current, verifiedMerchantsOnly: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500" /></label><p className="flex gap-2 text-xs leading-5 text-slate-600"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />Shows members whose merchant status was reviewed and approved by Tradebilia.</p><div className="space-y-2"><Label>Minimum rating</Label><Select value={filters.minRating} onValueChange={value => updateFilters(current => ({ ...current, minRating: value }))}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any rating</SelectItem><SelectItem value="4">4.0 and above</SelectItem><SelectItem value="4.5">4.5 and above</SelectItem><SelectItem value="5">5.0 only</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Minimum reviews</Label><Select value={filters.minReviewCount} onValueChange={value => updateFilters(current => ({ ...current, minReviewCount: value }))}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any amount</SelectItem><SelectItem value="1">1 or more</SelectItem><SelectItem value="3">3 or more</SelectItem><SelectItem value="10">10 or more</SelectItem></SelectContent></Select></div></div>
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-900">Activity &amp; collection</p><div className="space-y-2"><Label>Completed trades</Label><Select value={filters.minCompletedTrades} onValueChange={value => updateFilters(current => ({ ...current, minCompletedTrades: value }))}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any amount</SelectItem><SelectItem value="1">1 or more</SelectItem><SelectItem value="3">3 or more</SelectItem><SelectItem value="10">10 or more</SelectItem></SelectContent></Select></div><label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 text-sm font-medium text-slate-800"><span>Has active listings</span><input type="checkbox" checked={filters.activeListingsOnly} onChange={event => updateFilters(current => ({ ...current, activeListingsOnly: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500" /></label><div className="space-y-2"><Label>Active listing value</Label><Select value={filters.listingValueRange} onValueChange={value => updateFilters(current => ({ ...current, listingValueRange: value }))}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any range</SelectItem><SelectItem value="under_500">Under $500</SelectItem><SelectItem value="500_2500">$500 – $2,500</SelectItem><SelectItem value="2500_10000">$2,500 – $10,000</SelectItem><SelectItem value="10000_plus">$10,000+</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Member since</Label><Select value={filters.memberSince} onValueChange={value => updateFilters(current => ({ ...current, memberSince: value }))}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any time</SelectItem><SelectItem value="past_year">Past year</SelectItem><SelectItem value="past_three_years">Past 3 years</SelectItem><SelectItem value="longstanding">More than 3 years</SelectItem></SelectContent></Select></div></div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-4 rounded-[1.7rem] border border-slate-300/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Results</p><h2 className="mt-1 text-3xl font-semibold text-slate-950">{membersQuery.isLoading ? "Finding collectors…" : `${members.length} ${members.length === 1 ? "member" : "members"} found`}</h2></div><div className="w-full sm:w-48"><Label className="sr-only">Sort collectors</Label><Select value={filters.sort} onValueChange={value => updateFilters(current => ({ ...current, sort: value as DirectoryFilters["sort"] }))}><SelectTrigger className="h-11 border-slate-300 bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="best_match">Best match</SelectItem>{hasDistanceFilter ? <SelectItem value="nearest">Nearest</SelectItem> : null}<SelectItem value="best_rated">Best rated</SelectItem><SelectItem value="most_trades">Most trades</SelectItem><SelectItem value="most_listings">Most listings</SelectItem><SelectItem value="newest">Newest members</SelectItem></SelectContent></Select></div></div>
            {activeFilterChips.length ? <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">Active filters</p><button type="button" className="text-sm font-semibold text-violet-700 hover:underline" onClick={clearAll}>Clear all</button></div><div className="mt-3 flex flex-wrap gap-2">{activeFilterChips.map(chip => <button key={chip.id} type="button" className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-900 transition hover:border-violet-400" onClick={() => removeActiveFilter(chip.id)}>{chip.label}<X className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Remove {chip.label}</span></button>)}</div></div> : null}
            {membersQuery.error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{membersQuery.error.message}</div> : null}
            <div className="mt-5 space-y-4">{membersQuery.isLoading ? <div className="flex min-h-80 items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/70"><Loader2 className="h-8 w-8 animate-spin text-violet-700" /></div> : members.length ? members.map(member => <Card key={member.userId} className="overflow-hidden rounded-[1.75rem] border border-slate-300/80 bg-white shadow-[0_15px_40px_rgba(15,23,42,0.06)]"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-4"><Avatar className="h-17 w-17 shrink-0 border border-slate-200"><AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} /><AvatarFallback>{initials(member.displayName)}</AvatarFallback></Avatar><div className="min-w-0"><h3 className="truncate text-2xl font-semibold text-slate-950">{member.displayName}</h3><p className="mt-1 text-sm font-medium text-slate-500">{member.username ? `@${member.username}` : "Tradebilia collector"}</p><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{member.regionLabel}</span>{member.distanceMiles !== null ? <span className="inline-flex items-center gap-1 font-medium text-violet-800">{member.distanceMiles} miles away</span> : null}<span className="inline-flex items-center gap-1 text-amber-700"><Star className="h-3.5 w-3.5 fill-current" />{member.averageRating ? member.averageRating.toFixed(1) : "New"} · {member.reviewCount} reviews</span></div></div></div><Button className="shrink-0 rounded-xl bg-violet-700 hover:bg-violet-800" onClick={() => setLocation(`/profile/${member.userId}`)}><UserRound className="mr-2 h-4 w-4" />View Profile</Button></div><div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Completed trades</p><p className="mt-1 text-lg font-semibold text-slate-900">{member.completedTradeCount}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Active listings</p><p className="mt-1 text-lg font-semibold text-slate-900">{member.listingCount}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Verification</p>{member.isVerifiedMerchant ? <Badge className="mt-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-700">Verified Merchant</Badge> : <p className="mt-1 text-sm text-slate-500">Not verified</p>}</div></div><div className="mt-4 flex flex-wrap gap-2">{member.topCategories.length ? member.topCategories.slice(0, 4).map(category => <Badge key={category} variant="secondary" className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">{category.replace(/_/g, " ")}</Badge>) : <span className="text-sm text-slate-500">Multi-category collector</span>}</div></CardContent></Card>) : <div className="rounded-[2rem] border border-slate-300/80 bg-white p-10 text-center shadow-[0_18px_48px_rgba(15,23,42,0.06)]"><Sparkles className="mx-auto h-10 w-10 text-violet-700" /><h3 className="mt-5 text-3xl font-semibold text-slate-950">No collectors match these filters.</h3><p className="mx-auto mt-3 max-w-lg text-base leading-7 text-slate-600">Broaden a filter or clear all selections to explore more Tradebilia members.</p><Button variant="outline" className="mt-6 rounded-xl border-slate-300" onClick={clearAll}>Clear all</Button></div>}</div>
          </section>

          <aside className="space-y-5"><Card className="rounded-[1.75rem] border border-slate-300/80 bg-slate-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]"><CardContent className="p-5"><div className="flex items-start gap-3"><div className="rounded-2xl bg-violet-500/20 p-3"><Search className="h-5 w-5 text-violet-200" /></div><div><p className="font-semibold">Know their username?</p><p className="mt-1 text-sm leading-6 text-slate-300">Enter it above and press Search to open the collector’s public profile.</p></div></div></CardContent></Card><Card className="rounded-[1.75rem] border border-slate-300/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /><h2 className="text-xl font-semibold text-slate-950">Top Collectors</h2></div><a href="/rankings/top-rated-traders" className="text-sm font-semibold text-violet-700 hover:underline">View all</a></div><div className="mt-5 space-y-3">{topCollectors.slice(0, 5).map((member, index) => <button key={member.userId} type="button" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50" onClick={() => setLocation(`/profile/${member.userId}`)}><span className="w-4 text-sm font-semibold text-slate-400">{index + 1}</span><Avatar className="h-9 w-9"><AvatarImage src={member.avatarUrl ?? undefined} alt="" /><AvatarFallback>{initials(member.displayName)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{member.displayName}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700"><Star className="h-3 w-3 fill-current" />{member.averageRating.toFixed(1)} · {member.completedTradeCount} trades</span></span><Award className="h-4 w-4 shrink-0 text-violet-600" /></button>)}</div></CardContent></Card></aside>
        </div>
      </main>
    </div>
  );
}

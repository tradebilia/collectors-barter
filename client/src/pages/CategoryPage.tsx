import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import {
  TRADEBILIA_LOGO_URL,
  getTradebiliaCategoryBenchmark,
  getTradebiliaCategoryLabel,
  getTradebiliaCategoryTheme,
  tradebiliaCategories,
  tradebiliaConditionOptions,
  type TradebiliaCategorySlug,
} from "@/lib/tradebilia";
import { ArrowRight, Heart, Loader2, MessageSquareText, Search, ShieldCheck, Sparkles, Star, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const categoryFilterPresets: Record<TradebiliaCategorySlug, Array<{ label: string; placeholder: string; type?: "select" | "input" }>> = {
  comics: [
    { label: "Title or key issue", placeholder: "Amazing Fantasy, X-Men, signed…" },
    { label: "Publisher", placeholder: "Marvel, DC, Image" },
    { label: "Era", placeholder: "Golden, Silver, Bronze", type: "select" },
    { label: "Grading service", placeholder: "CGC, CBCS", type: "select" },
  ],
  sports_cards: [
    { label: "Player", placeholder: "Mickey Mantle" },
    { label: "Manufacturer", placeholder: "Topps, Fleer, Upper Deck" },
    { label: "Sport", placeholder: "Select a sport", type: "select" as const },
    { label: "Grading service", placeholder: "Select a grading service", type: "select" as const },
    { label: "Year / era", placeholder: "1950s, 1986, junk wax, ultra-modern" },
    { label: "Team", placeholder: "Yankees, Bulls, Cowboys" },
    { label: "Set / series", placeholder: "Topps Chrome, Prizm, Fleer" },
    { label: "Grade", placeholder: "Select grade 0-10", type: "select" as const },
    { label: "Value Range", placeholder: "Min - Max", type: "input" as const },
    { label: "Rookie", placeholder: "Select option", type: "select" as const },
    { label: "Autographed", placeholder: "Select option", type: "select" as const },
  ],
  vintage_toys: [
    { label: "Name", placeholder: "Barbie, G.I. Joe, Star Wars" },
    { label: "Genre", placeholder: "Action figure, doll, vehicle", type: "select" },
    { label: "Grading service", placeholder: "AFA, CAS, VGA", type: "select" },
    { label: "Franchise", placeholder: "Star Wars, TMNT" },
  ],
  video_games: [
    { label: "Title", placeholder: "Zelda, Donkey Kong, Sonic" },
    { label: "System", placeholder: "NES, SNES, Sega", type: "select" },
    { label: "Region", placeholder: "United States, Japan", type: "select" },
    { label: "Grading company", placeholder: "WATA, VGA, UKG", type: "select" },
  ],
  stamps: [
    { label: "Year", placeholder: "1918" },
    { label: "Issuer", placeholder: "Post office or monarchy" },
    { label: "Country", placeholder: "United States, Bermuda", type: "select" },
    { label: "Grading company", placeholder: "PSE, PMG, SCI", type: "select" },
  ],
  coins: [
    { label: "Year", placeholder: "1909, 1933, 1794" },
    { label: "Denomination", placeholder: "Cent, dollar, eagle", type: "select" },
    { label: "Mint mark", placeholder: "S, D, CC" },
    { label: "Grading service", placeholder: "PCGS, NGC", type: "select" },
  ],
  pokemon: [
    { label: "Pokémon", placeholder: "Charizard, Pikachu, Mew" },
    { label: "Set", placeholder: "Base Set, Neo, Evolving Skies" },
    { label: "Rarity", placeholder: "Holo, Secret Rare", type: "select" },
    { label: "Grading service", placeholder: "PSA, CGC, BGS", type: "select" },
  ],
  movies: [
    { label: "Title", placeholder: "Star Wars, Batman, Jaws" },
    { label: "Format", placeholder: "Poster, prop, lobby card", type: "select" },
    { label: "Franchise", placeholder: "Marvel, Disney, horror" },
    { label: "Certification", placeholder: "PSA, Beckett, BAS", type: "select" },
  ],
  autographs: [
    { label: "Signer", placeholder: "Athlete, actor, creator" },
    { label: "Medium", placeholder: "Photo, comic, baseball", type: "select" },
    { label: "Authentication", placeholder: "JSA, PSA/DNA, BAS", type: "select" },
    { label: "Franchise", placeholder: "Marvel, MLB, Disney" },
  ],
  disney_pins: [
    { label: "Pin name", placeholder: "LE park release, character pin" },
    { label: "Park or event", placeholder: "D23, EPCOT, Disneyland" },
    { label: "Series", placeholder: "Character, attraction", type: "select" },
    { label: "Edition", placeholder: "LE 300, LE 1000" },
  ],
};

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
];

const sportsList = [
  "Baseball",
  "Basketball",
  "Football",
  "Hockey",
  "Soccer",
  "Tennis",
  "Golf",
  "Boxing",
  "MMA",
  "Wrestling",
  "Track & Field",
  "Swimming",
  "Cycling",
  "Motorsports",
  "Other",
];

const gradingServicesList = [
  "PSA",
  "BGS",
  "SGC",
  "CGC",
  "Beckett",
  "Sportscard Guaranty",
  "Raw",
];

const gradeOptions = Array.from({ length: 11 }, (_, i) => ({ value: i.toString(), label: i.toString() }));

const rookieOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "both", label: "Both" },
];

const autographedOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "both", label: "Both" },
];

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug as TradebiliaCategorySlug | undefined;
  const theme = getTradebiliaCategoryTheme(slug ?? "");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [keyword, setKeyword] = useState("");
  const [condition, setCondition] = useState<(typeof tradebiliaConditionOptions)[number]["value"]>("all");
  const [sportsCardsConditionText, setSportsCardsConditionText] = useState("");
  const [sortBy, setSortBy] = useState("best_match");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [resultsPerPage, setResultsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [proposalListingId, setProposalListingId] = useState<number | null>(null);
  const [proposalNote, setProposalNote] = useState("");

  const feedQuery = trpc.market.feed.useQuery(
    slug ? { category: slug, condition, keyword } : undefined,
    { enabled: Boolean(slug) },
  );

  const createProposalMutation = trpc.market.createTradeProposal.useMutation({
    onSuccess: async () => {
      setProposalListingId(null);
      setProposalNote("");
      toast.success("Trade Proposal sent.");
      await utils.market.feed.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const watchlistMutation = trpc.market.toggleWatchlist.useMutation({
    onSuccess: async data => {
      toast.success(data.saved ? "Listing saved to Watchlist." : "Listing removed from Watchlist.");
      await utils.market.feed.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const listings = useMemo(() => {
    const rows = [...(feedQuery.data?.listings ?? [])];
    if (sortBy === "title") return rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "newest") return rows.sort((a, b) => b.id - a.id);
    return rows.sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id);
  }, [feedQuery.data?.listings, sortBy]);

  if (!slug || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-xl text-center">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-md" />
          <h1 className="mt-8 text-4xl font-semibold">Category not found.</h1>
          <p className="mt-4 text-base leading-8 text-white/70">Choose one of the Tradebilia exchange categories to continue browsing certified collectibles.</p>
          <Button asChild className="mt-8 rounded-full px-6">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const categoryLabel = getTradebiliaCategoryLabel(slug);
  const activeFilters = categoryFilterPresets[slug];
  const benchmark = getTradebiliaCategoryBenchmark(slug);
  const isSportsCardsPage = slug === "sports_cards";
  const benchmarkQuickFilters = benchmark?.quickFilters ?? [];
  const benchmarkSpotlights = (benchmark?.spotlights ?? []).map(card => ({
    ...card,
    imageUrl: resolveTradebiliaListingImage({ title: card.title, category: slug }),
  }));
  const SPORTS_CARDS_LONG_LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";

  return (
    <div className={`min-h-screen ${theme.pageClassName}`}>
      <div className="border-b border-white/10 bg-black">
        <div className="flex items-center justify-between gap-4 pl-2 pr-4 py-3">
          <div className="flex-shrink-0">
            <img src={SPORTS_CARDS_LONG_LOGO_URL} alt="Tradebilia" className="h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4">
          <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Messages">
            <MessageSquareText className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Account Settings">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Notifications">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          </div>
        </div>
      </div>
      <header className={`relative overflow-hidden border-b ${theme.borderClassName} ${theme.heroClassName}`}>
        {isSportsCardsPage ? (
          <div className={`relative overflow-hidden ${theme.textureClassName}`} style={{
            backgroundImage: 'url(/manus-storage/Sportscardwallpaper_7d372f7d.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll'
          }}>
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="container relative py-12 lg:py-16 z-10">
              <div className="max-w-4xl mx-auto text-center">
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.36em] opacity-80">{theme.eyebrow}</p>
                <div className="mt-3 leading-none">
                  <h1 className="max-w-5xl mx-auto text-6xl sm:text-8xl lg:text-[7rem]" style={{ fontFamily: "'Righteous', sans-serif", letterSpacing: "0.05em", fontStyle: "italic", fontWeight: 700, color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
                    {slug === "sports_cards" ? "SPORTS CARD" : categoryLabel.toUpperCase()}
                  </h1>
                  <div className="mt-4 h-px bg-white/50 mx-auto" style={{ maxWidth: "100%", width: "100%" }}></div>
                  <p className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.1em]" style={{ fontFamily: "'Righteous', sans-serif", fontStyle: "italic", color: "#F4D03F", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
                    EXCHANGE
                  </p>
                </div>

              </div>
              {/* Horizontal Stats Section */}
              <div className="flex justify-center gap-6 flex-wrap mt-6 pt-6">
                {[
                  ["Listings", String(listings.length)],
                  ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                  ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                  ["Total Market Value", "$0"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1rem] border border-white/15 bg-black/15 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] opacity-70">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`relative overflow-hidden ${theme.textureClassName}`}>
            <div className="container relative py-8 lg:py-12">
              <div className={`grid gap-8 ${isSportsCardsPage ? "xl:grid-cols-[minmax(0,1.02fr)_420px] xl:items-stretch" : "lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end"}`}>
                <div className="max-w-4xl">
                  <img
                    src={TRADEBILIA_LOGO_URL}
                    alt="Tradebilia"
                    className={`h-auto w-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.25)] ${isSportsCardsPage ? "max-w-md" : "max-w-xl"}`}
                  />
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.36em] opacity-80">{theme.eyebrow}</p>
                  <div className="mt-3 leading-none">
                    <h1 className={`${isSportsCardsPage ? "max-w-5xl text-4xl sm:text-6xl lg:text-[5.2rem]" : "text-5xl sm:text-6xl lg:text-7xl"}`} style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "0.08em", fontStyle: "normal", fontWeight: 700 }}>
                      {categoryLabel.toUpperCase()}
                    </h1>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold uppercase tracking-[0.2em]" style={{ fontFamily: "'Playfair Display', serif", color: "#d4af37" }}>
                        EXCHANGE
                      </p>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                    </div>
                  </div>
                  <p className={`max-w-3xl opacity-90 ${isSportsCardsPage ? "mt-4 text-[1.05rem] leading-8 text-white/88" : "mt-5 text-base leading-8 sm:text-lg"}`}>{theme.description}</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      ["Listings", String(listings.length)],
                      ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                      ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                      ["Total Market Value", "$0"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.5rem] border border-white/15 bg-black/15 p-4 text-center backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.3em] opacity-70">{label}</p>
                        <p className="mt-3 text-3xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <nav className="relative z-10 border-t border-black bg-black">
        <div className="flex w-full overflow-x-auto">
          <Link
            href="/"
            className="flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] text-white whitespace-nowrap"
          >
            Home
          </Link>
          {tradebiliaCategories.map(category => (
            <Link
              key={category.value}
              href={`/category/${category.value}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] whitespace-nowrap ${category.value === slug ? "bg-white text-slate-950" : "text-white"}`}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex">
        {/* Left sidebar filters */}
        <aside className={`w-80 border-r border-current/10 bg-current/5 p-4 ${theme.panelClassName}`}>
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${theme.accentClassName}`} />
            <h2 className="text-lg font-semibold" style={{ fontFamily: theme.headingFont }}>Filters</h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-[0.16em]">Keyword</Label>
              <Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder={`Search ${categoryLabel.toLowerCase()}`} className="h-9 bg-white/80 text-sm" />
            </div>
            {activeFilters.map(filter => {
              if (isSportsCardsPage && ["Priority traits"].includes(filter.label)) {
                return null;
              }
              
              return (
                <div key={filter.label} className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.16em]">{filter.label}</Label>
                  {filter.type === "select" ? (
                    <Select defaultValue="all">
                      <SelectTrigger className="h-9 bg-white/80 text-sm">
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.label === "Sport" && sportsList.map(sport => (
                          <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                        {filter.label === "Grading service" && gradingServicesList.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Grade" && gradeOptions.map(grade => (
                          <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                        ))}
                        {filter.label === "Rookie" && rookieOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {filter.label === "Autographed" && autographedOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                        {!["Sport", "Grading service", "Grade", "Rookie", "Autographed"].includes(filter.label) && (
                          <>
                            <SelectItem value="featured">Featured</SelectItem>
                            <SelectItem value="certified">Certified</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  ) : filter.label === "Value Range" ? (
                    <div className="flex gap-2">
                      <Input placeholder="Min" className="h-9 bg-white/80 text-sm flex-1" type="number" />
                      <Input placeholder="Max" className="h-9 bg-white/80 text-sm flex-1" type="number" />
                    </div>
                  ) : (
                    <Input placeholder={filter.placeholder} className="h-9 bg-white/80 text-sm" />
                  )}
                </div>
              );
            })}
            {!isSportsCardsPage && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-[0.16em]">Condition</Label>
                <Select value={condition} onValueChange={value => setCondition(value as typeof condition)}>
                  <SelectTrigger className="h-9 bg-white/80 text-sm">
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradebiliaConditionOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </aside>

        {/* Right side content area */}
        <div className="flex-1 py-8 lg:py-10 px-6">
          <section className="space-y-6">
            {/* Filter summary bar */}
            {(keyword || condition !== "all" || sportsCardsConditionText) && (
              <div className="flex flex-wrap gap-2 items-center pb-3">
                <span className="text-xs font-medium opacity-70">Active filters:</span>
                {keyword && (
                  <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-600 px-2 py-1 rounded text-xs">
                    {keyword}
                    <button onClick={() => setKeyword("")} className="ml-1 hover:opacity-70">×</button>
                  </div>
                )}
                {condition !== "all" && (
                  <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-600 px-2 py-1 rounded text-xs">
                    {condition}
                    <button onClick={() => setCondition("all")} className="ml-1 hover:opacity-70">×</button>
                  </div>
                )}
                {sportsCardsConditionText && (
                  <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-600 px-2 py-1 rounded text-xs">
                    {sportsCardsConditionText}
                    <button onClick={() => setSportsCardsConditionText("")} className="ml-1 hover:opacity-70">×</button>
                  </div>
                )}
              </div>
            )}

            {/* Sorting bar - always visible */}
            <div className="space-y-4 pb-4 border-b border-current/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-70">Showing {listings.length} results</p>
                <div className="flex items-center gap-4">
                  {/* View toggle */}
                  <div className="flex gap-1 bg-white/10 rounded p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === "grid" ? "bg-white text-slate-950" : "text-white hover:bg-white/20"}`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === "list" ? "bg-white text-slate-950" : "text-white hover:bg-white/20"}`}
                    >
                      List
                    </button>
                  </div>
                  {/* Sort dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 h-9 bg-white/80 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_match">Best Match</SelectItem>
                      <SelectItem value="price_low_high">Value: Low to High</SelectItem>
                      <SelectItem value="price_high_low">Value: High to Low</SelectItem>
                      <SelectItem value="newest">Newly Listed</SelectItem>
                      <SelectItem value="condition">Condition: Best First</SelectItem>
                      <SelectItem value="grade">Grade: Highest First</SelectItem>
                      <SelectItem value="location">Location: Nearest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Results per page and active filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium opacity-70">Per page:</span>
                  <Select value={String(resultsPerPage)} onValueChange={(val) => { setResultsPerPage(Number(val)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20 h-8 bg-white/80 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Clear filters button */}
                {(keyword || condition !== "all" || sportsCardsConditionText) && (
                  <button
                    onClick={() => {
                      setKeyword("");
                      setCondition("all");
                      setSportsCardsConditionText("");
                      setCurrentPage(1);
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>


            {feedQuery.isLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-dashed border-current/25">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className={`rounded-[2rem] border p-8 ${theme.panelClassName}`}>
                {isSportsCardsPage ? (
                  <div className="text-center">
                    <h3 className="text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>No Cards Are Available</h3>
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="mx-auto h-10 w-10" />
                    <h3 className="mt-5 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>No listings match these filters yet.</h3>
                    <p className="mt-4 text-base leading-8 opacity-80">Try broadening the search or explore another Tradebilia category exchange.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className={`grid gap-3 ${isSportsCardsPage ? "grid-cols-6" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                  {listings.map(listing => (
                  <Card key={listing.id} className={`overflow-hidden border ${theme.cardClassName} ${isSportsCardsPage ? "rounded-md shadow-sm" : "rounded-[2rem]"}`}>
                    <div className={`overflow-hidden border-b border-current/10 ${isSportsCardsPage ? "aspect-[7/9] bg-[linear-gradient(180deg,rgba(243,228,188,0.92)_0%,rgba(232,214,168,0.92)_100%)] p-1" : "aspect-[4/5] bg-black/10"}`}>
                      <div className={isSportsCardsPage ? "h-full rounded-sm border border-[#0f4658]/10 bg-[#f7ecd2] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" : "h-full"}>
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className={isSportsCardsPage ? "h-full w-full object-contain p-0.5" : "h-full w-full object-cover"}
                        />
                      </div>
                    </div>
                    <CardContent className={`space-y-1 ${isSportsCardsPage ? "p-1.5 text-[#153746]" : "p-5"}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-[0.5rem] font-semibold uppercase tracking-[0.12em] opacity-60">{listing.categoryLabel}</p>
                          <Link href={`/listings/${listing.id}`} className="mt-0.5 block text-xs font-semibold leading-tight hover:opacity-75">
                            {listing.title}
                          </Link>
                        </div>
                        {listing.featured ? <Badge className={`rounded-full px-1 py-0 text-[0.5rem] ${theme.chipClassName}`}>Featured</Badge> : null}
                      </div>
                      <p className="line-clamp-1 text-[0.65rem] leading-3 opacity-80">{listing.description}</p>
                      <div className="grid grid-cols-2 gap-1 rounded-md border border-current/10 bg-black/5 p-1 text-[0.5rem]">
                        <div>
                          <p className="text-[0.45rem] uppercase tracking-[0.1em] opacity-60">Collector</p>
                          <p className="mt-0 font-semibold truncate text-[0.55rem]">{listing.owner.displayName}</p>
                        </div>
                        <div>
                          <p className="text-[0.45rem] uppercase tracking-[0.1em] opacity-60">Condition</p>
                          <p className="mt-0 font-semibold truncate text-[0.55rem]">{listing.conditionLabel}</p>
                        </div>
                        <div>
                          <p className="text-[0.45rem] uppercase tracking-[0.1em] opacity-60">Trust</p>
                          <div className="mt-0 flex items-center gap-0.5 font-semibold">
                            <Star className="h-2 w-2 fill-current" />
                            <span className="truncate text-[0.55rem]">{listing.ownerRating.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[0.45rem] uppercase tracking-[0.1em] opacity-60">Status</p>
                          <p className="mt-0 font-semibold capitalize truncate text-[0.55rem]">{listing.status}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        <Button asChild className="rounded-full px-2 py-0 text-[0.6rem] h-auto bg-[#D4AF37] hover:bg-[#C9A227] text-black">
                          <Link href={`/listings/${listing.id}`}>View</Link>
                        </Button>
                        <Dialog open={proposalListingId === listing.id} onOpenChange={open => setProposalListingId(open ? listing.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-full bg-transparent px-1 py-0 text-xs h-auto" disabled={!isAuthenticated}>
                              <MessageSquareText className="h-2 w-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start a Trade Proposal</DialogTitle>
                              <DialogDescription>
                                Begin with an expression of interest. The listing owner can review your inventory and decide which items they want to request back.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Requested listing</Label>
                                <Input value={listing.title} readOnly />
                              </div>
                              <div className="space-y-2">
                                <Label>Opening note</Label>
                                <Textarea value={proposalNote} onChange={event => setProposalNote(event.target.value)} placeholder="Share why this collectible fits your collection goals." />
                              </div>
                              <Button className="w-full rounded-full" disabled={createProposalMutation.isPending} onClick={() => createProposalMutation.mutate({ requestedListingId: listing.id, note: proposalNote })}>
                                {createProposalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send Trade Proposal
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          className="rounded-full bg-transparent"
                          onClick={() => {
                            if (!isAuthenticated) {
                              window.location.href = getLoginUrl();
                              return;
                            }
                            watchlistMutation.mutate({ listingId: listing.id });
                          }}
                        >
                          <Heart className={`mr-2 h-4 w-4 ${listing.savedToWatchlist ? "fill-current" : ""}`} />
                          {listing.savedToWatchlist ? "Saved" : "Watchlist"}
                        </Button>
                      </div>
                    </CardContent>
                   </Card>
                ))}
              </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

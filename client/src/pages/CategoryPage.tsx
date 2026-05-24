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
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";
import { getGradingCompanyNamesForCategory } from "@shared/gradingCompanies";

const categoryFilterPresets: Record<TradebiliaCategorySlug, Array<{ label: string; placeholder: string; type?: "select" | "input" }>> = {
  comics: [
    { label: "Keyword", placeholder: "Search by keyword" },
    { label: "Title", placeholder: "Amazing Fantasy, X-Men" },
    { label: "Issue Number", placeholder: "#1, #100, #50" },
    { label: "Grading service", placeholder: "Select grading service", type: "select" },
    { label: "Grade", placeholder: "Select grade 0-10", type: "select" },
    { label: "Value Range", placeholder: "Min - Max", type: "input" },
    { label: "Signed", placeholder: "Select option", type: "select" },
    { label: "Facsimile", placeholder: "Select option", type: "select" },
  ],
  sports_cards: [
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
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
];

// Helper function to get category-specific font
const getCategoryFont = (slug: TradebiliaCategorySlug): string => {
  const fontMap: Record<TradebiliaCategorySlug, string> = {
    sports_cards: "'Righteous', sans-serif",
    comics: "'Comic Sans MS', cursive",
    vintage_toys: "'Fredoka One', sans-serif",
    video_games: "'Orbitron', sans-serif",
    stamps: "'Playfair Display', serif",
    coins: "'Cinzel', serif",
    pokemon: "'Pokemon', sans-serif",
    movies: "'Bebas Neue', sans-serif",
    autographs: "'Brush Script MT', cursive",
    disney_pins: "'Disney', sans-serif",
  };
  return fontMap[slug] || "'Righteous', sans-serif";
};


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

// Get grading companies for each category from the shared configuration
const gradingServicesByCategory: Record<TradebiliaCategorySlug, string[]> = {
  comics: getGradingCompanyNamesForCategory("comics"),
  sports_cards: getGradingCompanyNamesForCategory("sports_cards"),
  vintage_toys: getGradingCompanyNamesForCategory("vintage_toys"),
  video_games: getGradingCompanyNamesForCategory("video_games"),
  stamps: getGradingCompanyNamesForCategory("stamps"),
  coins: getGradingCompanyNamesForCategory("coins"),
  pokemon: getGradingCompanyNamesForCategory("pokemon"),
  movies: getGradingCompanyNamesForCategory("movies"),
  autographs: getGradingCompanyNamesForCategory("autographs"),
  disney_pins: getGradingCompanyNamesForCategory("disney_pins"),
};

const gradingServicesList = ["Raw"];

const gradeOptions = Array.from({ length: 11 }, (_, i) => ({ value: i.toString(), label: i.toString() }));

const rookieOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const autographedOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug as TradebiliaCategorySlug | undefined;
  const theme = getTradebiliaCategoryTheme(slug ?? "");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [keyword, setKeyword] = useState("");
  const [condition, setCondition] = useState<(typeof tradebiliaConditionOptions)[number]["value"] | undefined>(undefined);
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
      <TopBar
        logoUrl={SPORTS_CARDS_LONG_LOGO_URL}
        searchPlaceholder={`Search ${getTradebiliaCategoryLabel(slug ?? '')}...`}
      />
      <header className={`relative overflow-hidden border-b ${theme.borderClassName} ${theme.heroClassName}`} style={{ minHeight: '400px' }}>
        <div className={`relative overflow-hidden ${theme.textureClassName}`} style={{
          backgroundImage: isSportsCardsPage ? 'url(/manus-storage/Sportscardwallpaper_7d372f7d.webp)' : slug === 'video_games' ? 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp)' : slug === 'coins' ? 'url(/manus-storage/Coins2_54d5f0d9.png)' : slug === 'stamps' ? 'url(/manus-storage/Stamps5_7feb0c7e.png)' : slug === 'vintage_toys' ? 'url(/manus-storage/Toys4_70f212d6.png)' : slug === 'autographs' ? 'url(/manus-storage/Auto2_41464c02.png)' : slug === 'movies' ? 'url(/manus-storage/VHS1_4fe4bb67.png)' : slug === 'comics' ? 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp)' : slug === 'pokemon' ? 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp)' : slug === 'disney_pins' ? 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp)' : undefined,
          backgroundSize: 'cover',
          backgroundPosition: slug === 'movies' ? 'center top' : 'center',
          backgroundAttachment: 'scroll',
          backgroundRepeat: (slug === 'movies' || slug === 'comics' || slug === 'pokemon' || slug === 'video_games' || slug === 'disney_pins') ? 'no-repeat' : 'repeat',
          height: '400px',
          filter: (slug === 'video_games' || slug === 'coins' || slug === 'stamps' || slug === 'vintage_toys' || slug === 'autographs' || slug === 'movies' || slug === 'comics' || slug === 'pokemon' || slug === 'disney_pins') ? 'contrast(1.2) saturate(1.1)' : 'none'
        }}>
          <div className={`absolute inset-0 ${slug === 'movies' ? 'bg-black/10' : 'bg-black/30'}`}></div>
          <div className="container relative py-6 lg:py-8 z-10">
            <div className="max-w-4xl mx-auto text-center">
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.36em] opacity-80" style={{ visibility: slug === "pokemon" ? "hidden" : "visible" }}>{theme.eyebrow}</p>
              <div className="mt-3 leading-none">
                <h1 className="max-w-full mx-auto text-6xl sm:text-7xl lg:text-8xl" style={{
                  fontFamily: getCategoryFont(slug),
                  fontWeight: 700,
                  color: "white",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  lineHeight: "1",
                  height: "80px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: slug === "pokemon" || slug === "disney_pins" ? "center" : slug === "stamps" ? "center" : slug === "comics" ? "center" : "flex-start",
                  justifyContent: "center",
                  paddingTop: slug === "pokemon" || slug === "disney_pins" ? "0" : slug === "comics" ? "-10px" : "20px",
                  position: "relative",
                  zIndex: 50
                }}>
                  {slug === "disney_pins" ? (
                    <img src="/manus-storage/DisneyPins_b2a9e148.png" alt="Disney Pins" style={{ maxHeight: "450px", width: "auto", objectFit: "contain", marginTop: "70px" }} />
                  ) : slug === "pokemon" ? (
                    <img src="/manus-storage/Pokemon_bf82cd71.png" alt="Pokemon" style={{ maxHeight: "400px", maxWidth: "90%", width: "auto", objectFit: "contain", marginTop: "0px", position: "relative", zIndex: 50 }} />
                  ) : slug === "sports_cards" ? "SPORTS CARD" : categoryLabel.toUpperCase()}
                </h1>
                <div className="mt-8 h-px bg-white/50 mx-auto" style={{ maxWidth: "100%", width: "100%" }}></div>
                <p className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.1em]" style={{
                  fontFamily: getCategoryFont(slug),
                  fontStyle: "italic",
                  color: "#F4D03F",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: "1"
                }}>
                  EXCHANGE
                </p>
              </div>

            </div>
            {/* Horizontal Stats Section */}
            <div className="flex justify-center gap-6 flex-wrap mt-10 pt-8">
              {[
                ["Listings", String(listings.length)],
                ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                ["Total Market Value", "$0"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1rem] border border-white/15 bg-black/15 px-3 py-2 text-center backdrop-blur-sm">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em]" style={{ color: '#ffffff', fontWeight: 600 }}>{label}</p>
                  <p className="mt-1 text-sm font-bold" style={{ color: '#ffffff' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </header>

      <CategoryBar />

      <main className="flex bg-transparent">
        {/* Left sidebar filters */}
        <aside className={`w-80 border-r border-current/10 bg-current/5 p-4 ${theme.panelClassName}`}>
          <div className="flex items-center gap-2">
            <Search className={`h-4 w-4 ${theme.accentClassName}`} />
            <h2 className="text-lg font-semibold" style={{ fontFamily: theme.headingFont }}>Filters</h2>
          </div>

          <div className="mt-4 space-y-2">
            {activeFilters.map(filter => {
              if (isSportsCardsPage && ["Priority traits"].includes(filter.label)) {
                return null;
              }
              
              return (
                <div key={filter.label} className="space-y-0.5">
                  <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]">{filter.label}</Label>
                  {filter.type === "select" ? (
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 bg-white/80 text-xs">
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.label === "Sport" && sportsList.map(sport => (
                          <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                        {filter.label === "Grading service" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Grading company" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Certification" && slug && gradingServicesByCategory[slug]?.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                        {filter.label === "Authentication" && slug && gradingServicesByCategory[slug]?.map(service => (
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

                      </SelectContent>
                    </Select>
                  ) : filter.label === "Value Range" ? (
                    <div className="flex gap-2">
                      <Input placeholder="Min" className="h-8 bg-white/80 text-xs flex-1" type="number" />
                      <Input placeholder="Max" className="h-8 bg-white/80 text-xs flex-1" type="number" />
                    </div>
                  ) : (
                    <Input placeholder={filter.placeholder} className="h-8 bg-white/80 text-xs" />
                  )}
                </div>
              );
            })}
            {!isSportsCardsPage && (
              <div className="space-y-0.5">
                <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]">Condition</Label>
                <Select value={condition} onValueChange={value => setCondition(value as typeof condition)}>
                  <SelectTrigger className="h-8 bg-white/80 text-xs">
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
            {/* Clear and Search buttons */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-300">
              <Button 
                onClick={() => {
                  setKeyword("");
                  setCondition("all");
                  setSportsCardsConditionText("");
                }}
                size="sm"
                className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
              >
                Clear
              </Button>
              <Button 
                onClick={() => feedQuery.refetch()}
                size="sm"
                className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Search
              </Button>
            </div>
          </div>
        </aside>

        {/* Right side content area */}
        <div className="flex-1 py-8 lg:py-10 px-6">
          <section className="space-y-6">
            {/* Filter summary bar */}
            {(keyword || condition || sportsCardsConditionText) && (
              <div className="flex flex-wrap gap-2 items-center pb-3">
                <span className="text-xs font-medium opacity-70">Active filters:</span>
                {keyword && (
                  <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-600 px-2 py-1 rounded text-xs">
                    {keyword}
                    <button onClick={() => setKeyword("")} className="ml-1 hover:opacity-70">×</button>
                  </div>
                )}
                {condition && (
                  <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-600 px-2 py-1 rounded text-xs">
                    {condition}
                    <button onClick={() => setCondition(undefined)} className="ml-1 hover:opacity-70">×</button>
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
                {(keyword || condition || sportsCardsConditionText) && (
                  <button
                    onClick={() => {
                      setKeyword("");
                      setCondition(undefined);
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
                <div className={viewMode === "grid" ? "grid gap-3 grid-cols-6" : "space-y-3"}>
                  {listings.map(listing => (
                  <Card key={listing.id} className={`overflow-hidden border ${theme.cardClassName} ${isSportsCardsPage ? "rounded-md shadow-sm" : "rounded-[2rem]"} ${viewMode === "list" ? "flex gap-4" : ""}`}>
                    <Link href={`/listings/${listing.id}`} className={`overflow-hidden border-b border-current/10 block cursor-pointer hover:opacity-90 transition ${viewMode === "list" ? "w-32 flex-shrink-0" : ""} ${isSportsCardsPage ? "aspect-[7/9] bg-[linear-gradient(180deg,rgba(243,228,188,0.92)_0%,rgba(232,214,168,0.92)_100%)] p-1" : "aspect-[4/5] bg-black/10"}`}>
                      <div className={isSportsCardsPage ? "h-full rounded-sm border border-[#0f4658]/10 bg-[#f7ecd2] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" : "h-full"}>
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className={isSportsCardsPage ? "h-full w-full object-contain p-0.5" : "h-full w-full object-cover"}
                        />
                      </div>
                    </Link>
                    <CardContent className={`${viewMode === "list" ? "flex-1 space-y-3 p-4" : `space-y-1 ${isSportsCardsPage ? "p-1.5 text-[#153746]" : "p-5"}`}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`font-semibold uppercase tracking-[0.12em] opacity-60 ${viewMode === "list" ? "text-xs" : "text-[0.5rem]"}`}>{listing.categoryLabel}</p>
                          <Link href={`/listings/${listing.id}`} className={`mt-1 block font-semibold leading-tight hover:opacity-75 ${viewMode === "list" ? "text-lg" : "text-xs"}`}>
                            {listing.title}
                          </Link>
                        </div>
                        {listing.featured ? <Badge className={`rounded-full px-2 py-1 ${viewMode === "list" ? "text-xs" : "text-[0.5rem] px-1 py-0"} ${theme.chipClassName}`}>Featured</Badge> : null}
                      </div>
                      <p className={`${viewMode === "list" ? "text-sm line-clamp-2" : "line-clamp-1 text-[0.65rem]"} leading-relaxed opacity-80`}>{listing.description}</p>
                      <div className={`rounded-md border border-current/10 bg-black/5 p-3 ${viewMode === "list" ? "grid grid-cols-4 gap-4" : "grid grid-cols-2 gap-1 p-1 text-[0.5rem]"}`}>
                        <div>
                          <p className={`uppercase tracking-[0.1em] opacity-60 ${viewMode === "list" ? "text-xs" : "text-[0.45rem]"}`}>Collector</p>
                          <p className={`mt-1 font-semibold truncate ${viewMode === "list" ? "text-sm" : "mt-0 text-[0.55rem]"}`}>{listing.owner.displayName}</p>
                        </div>
                        <div>
                          <p className={`uppercase tracking-[0.1em] opacity-60 ${viewMode === "list" ? "text-xs" : "text-[0.45rem]"}`}>Condition</p>
                          <p className={`mt-1 font-semibold truncate ${viewMode === "list" ? "text-sm" : "mt-0 text-[0.55rem]"}`}>{listing.conditionLabel}</p>
                        </div>
                        <div>
                          <p className={`uppercase tracking-[0.1em] opacity-60 ${viewMode === "list" ? "text-xs" : "text-[0.45rem]"}`}>Trust</p>
                          <div className={`mt-1 flex items-center gap-1 font-semibold ${viewMode === "list" ? "" : "mt-0 gap-0.5"}`}>
                            <Star className={`fill-current ${viewMode === "list" ? "h-4 w-4" : "h-2 w-2"}`} />
                            <span className={`truncate ${viewMode === "list" ? "text-sm" : "text-[0.55rem]"}`}>{listing.ownerRating.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <p className={`uppercase tracking-[0.1em] opacity-60 ${viewMode === "list" ? "text-xs" : "text-[0.45rem]"}`}>Status</p>
                          <p className={`mt-1 font-semibold capitalize truncate ${viewMode === "list" ? "text-sm" : "mt-0 text-[0.55rem]"}`}>{listing.status}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-0.5">
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
                          className="rounded-full bg-transparent px-1 py-0 text-xs h-auto"
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
              {/* Pagination controls */}
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-current/10">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  ← Previous
                </Button>
                <span className="text-sm font-medium opacity-70">
                  Page {currentPage}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={listings.length < resultsPerPage}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Next →
                </Button>
              </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

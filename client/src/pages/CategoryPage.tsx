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
    { label: "Sport", placeholder: "Baseball, Basketball" },
    { label: "Grading service", placeholder: "PSA, BGS, SGC" },
    { label: "Year / era", placeholder: "1950s, 1986, junk wax, ultra-modern" },
    { label: "Team", placeholder: "Yankees, Bulls, Cowboys" },
    { label: "Set / series", placeholder: "Topps Chrome, Prizm, Fleer" },
    { label: "Grade", placeholder: "PSA 10, BGS 9.5, raw" },
    { label: "Priority traits", placeholder: "Rookie, autograph, patch relic, Hall of Fame" },
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

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug as TradebiliaCategorySlug | undefined;
  const theme = getTradebiliaCategoryTheme(slug ?? "");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [keyword, setKeyword] = useState("");
  const [condition, setCondition] = useState<(typeof tradebiliaConditionOptions)[number]["value"]>("all");
  const [sportsCardsConditionText, setSportsCardsConditionText] = useState("");
  const [sortBy, setSortBy] = useState("featured");
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
  const SPORTS_CARDS_WALLPAPER_URL = "/manus-storage/Sportscards_03a41ec0.jpg";
  const SPORTS_CARDS_LONG_LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";

  return (
    <div className={`min-h-screen ${theme.pageClassName}`}>
      <header className={`relative overflow-hidden border-b ${theme.borderClassName} ${theme.heroClassName}`}>
        {isSportsCardsPage ? (
          <>
            <div className="pointer-events-none absolute inset-0 h-full">
              <div className="absolute inset-0 h-full" style={{ backgroundImage: `url(${SPORTS_CARDS_WALLPAPER_URL})`, backgroundRepeat: 'repeat', backgroundSize: 'auto', backgroundPosition: 'top left', opacity: 0.35 }}>
              </div>
            </div>
            <div className="relative py-4 lg:py-6 max-h-[562px] overflow-hidden flex items-center px-4 lg:px-8">
              <div className="w-full">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="max-w-[14rem] lg:max-w-[16rem]">
                      <img src={SPORTS_CARDS_LONG_LOGO_URL} alt="Tradebilia Collectors Trading Exchange" className="h-auto w-full object-contain" />
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <h1 className="leading-none text-[#fff4df]">
                      <span className="block text-6xl lg:text-7xl font-black uppercase tracking-[0.06em] lg:tracking-[0.08em]" style={{ fontFamily: "Bebas Neue, Oswald, Inter, sans-serif" }}>
                        Sports Card
                      </span>
                      <span className="mt-0.5 lg:mt-1 block text-3xl lg:text-4xl font-semibold uppercase tracking-[0.12em]" style={{ fontFamily: "Oswald, Inter, sans-serif" }}>
                        Exchange
                      </span>
                    </h1>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      {[
                        ["Listings", String(listings.length)],
                        ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                        ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/12 bg-black/25 px-2 py-1 text-[#fff3d5] backdrop-blur-sm">
                          <p className="text-[6px] uppercase tracking-[0.2em] text-white/50">{label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
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
                  <h1 className={`mt-3 leading-none ${isSportsCardsPage ? "max-w-5xl text-4xl sm:text-6xl lg:text-[5.2rem]" : "text-5xl sm:text-6xl lg:text-7xl"}`} style={{ fontFamily: theme.headingFont }}>
                    {categoryLabel.toUpperCase()} EXCHANGE
                  </h1>
                  <p className={`max-w-3xl opacity-90 ${isSportsCardsPage ? "mt-4 text-[1.05rem] leading-8 text-white/88" : "mt-5 text-base leading-8 sm:text-lg"}`}>{theme.description}</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      ["Listings", String(listings.length)],
                      ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                      ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.5rem] border border-white/15 bg-black/15 p-4 text-center backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.3em] opacity-70">{label}</p>
                        <p className="mt-3 text-3xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[1.75rem] border border-white/15 bg-black/20 p-5 text-[#fff3d5] backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      <Trophy className="h-4 w-4" />
                      {benchmark?.heroNotesEyebrow}
                    </div>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-white/82">
                      <p>{benchmark?.heroNotes[0]}</p>
                      <div className="grid gap-3 text-[0.92rem]">
                        {benchmark?.heroNotes.slice(1).map(note => (
                          <div key={note} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">{note}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <nav className="relative z-10 border-t border-black bg-black">
        <div className="container grid overflow-hidden md:grid-cols-5 xl:grid-cols-10">
          {tradebiliaCategories.map(category => (
            <Link
              key={category.value}
              href={`/category/${category.value}`}
              className={`border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] ${category.value === slug ? "bg-white text-slate-950" : "text-white"}`}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="">
        {/* Filters section - flows naturally below category bar */}
        <div className="border-b border-current/10 bg-current/5">
          <div className="ml-0 w-full px-0">
            <aside className={`rounded-none border-none p-6 shadow-none ${theme.panelClassName}`}>
              <div className="flex items-center gap-3">
                <Search className={`h-5 w-5 ${theme.accentClassName}`} />
                <h2 className="text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>Filters</h2>
              </div>
              {isSportsCardsPage ? (
                <p className="mt-4 text-sm leading-7 opacity-75">{benchmark?.railGuidance}</p>
              ) : null}
              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase tracking-[0.18em]">Keyword</Label>
                  <Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder={`Search ${categoryLabel.toLowerCase()} listings`} className="h-12 bg-white/80" />
                </div>
                {activeFilters.map(filter => (
                  <div key={filter.label} className="space-y-2">
                    <Label className="text-sm font-semibold uppercase tracking-[0.18em]">{filter.label}</Label>
                    {filter.type === "select" ? (
                      <Select defaultValue="all">
                        <SelectTrigger className="h-12 bg-white/80">
                          <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="featured">Featured</SelectItem>
                          <SelectItem value="certified">Certified</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder={filter.placeholder} className="h-12 bg-white/80" />
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase tracking-[0.18em]">Condition</Label>
                  {isSportsCardsPage ? (
                    <Input
                      value={sportsCardsConditionText}
                      onChange={event => {
                        setSportsCardsConditionText(event.target.value);
                        const normalized = event.target.value.trim().toLowerCase();
                        const matched = tradebiliaConditionOptions.find(option => option.label.toLowerCase() === normalized || option.value.toLowerCase() === normalized);
                        setCondition((matched?.value ?? "all") as typeof condition);
                      }}
                      placeholder="Gem Mint, Near Mint, raw"
                      className="h-12 bg-white/80"
                    />
                  ) : (
                    <Select value={condition} onValueChange={value => setCondition(value as typeof condition)}>
                      <SelectTrigger className="h-12 bg-white/80">
                        <SelectValue placeholder="All Conditions" />
                      </SelectTrigger>
                      <SelectContent>
                        {tradebiliaConditionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Main content area */}
        <div className="container py-8 lg:py-10">
          <section className="space-y-6">
            {benchmarkSpotlights.length > 0 ? (
              <section className="space-y-5">
                {isSportsCardsPage ? (
                  <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${theme.accentClassName}`}>Show-floor highlights</p>
                        <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>Featured cardboard arranged more like a real card table.</h3>
                      </div>
                      <p className="max-w-2xl text-sm leading-7 opacity-75">Each spotlight should read like a premium listing card rather than an editorial poster, keeping the benchmark closer to a retro PSA-card-show browse pattern.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {benchmarkSpotlights.map(card => (
                        <article
                          key={card.title}
                          className="group overflow-hidden rounded-[1.65rem] border border-[#0f4658]/16 bg-[#fff7e8] shadow-[0_20px_45px_rgba(15,76,92,0.12)] transition hover:-translate-y-1"
                        >
                          <div className="border-b border-[#0f4658]/12 bg-[linear-gradient(180deg,#f3e4bc_0%,#e8d6a8_100%)] p-4">
                            <div className="rounded-[1.25rem] border border-[#0f4658]/10 bg-[#f7ecd2] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                              <div className="aspect-[7/9] overflow-hidden rounded-[1rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5),rgba(18,57,75,0.1)_72%)]">
                                <img src={card.imageUrl} alt={card.title} className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.02]" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3 p-5 text-[#153746]">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#0f4658]/70">
                              <span className="rounded-full border border-[#0f4658]/12 bg-white/80 px-3 py-1 font-semibold">{card.eyebrow}</span>
                              <span className="rounded-full border border-[#0f4658]/10 bg-[#e6f1f3] px-3 py-1 font-semibold">Show-floor pick</span>
                            </div>
                            <h3 className="text-2xl font-semibold leading-tight">{card.title}</h3>
                            <p className="text-sm leading-7 text-[#153746]/78">{card.description}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${theme.accentClassName}`}>Collector spotlights</p>
                        <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>Featured pieces that keep the exchange feeling curated.</h3>
                      </div>
                      <p className="max-w-2xl text-sm leading-7 opacity-75">These benchmark cards should feel more like collectible inventory lanes than oversized editorial panels, so each category stays useful and legible even when live listings are light.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {benchmarkSpotlights.map(card => (
                        <article
                          key={card.title}
                          className={`group overflow-hidden rounded-[1.65rem] border shadow-[0_20px_45px_rgba(15,23,42,0.12)] transition hover:-translate-y-1 ${theme.cardClassName}`}
                        >
                          <div className="border-b border-current/10 p-4">
                            <div className="rounded-[1.25rem] border border-current/10 bg-white/55 p-4">
                              <div className="aspect-[7/9] overflow-hidden rounded-[1rem] bg-black/5">
                                <img src={card.imageUrl} alt={card.title} className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.02]" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3 p-5">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] opacity-70">
                              <span className={`rounded-full border border-current/10 px-3 py-1 font-semibold ${theme.chipClassName}`}>{card.eyebrow}</span>
                              <span className="rounded-full border border-current/10 bg-white/55 px-3 py-1 font-semibold">Benchmark lane</span>
                            </div>
                            <h3 className="text-2xl font-semibold leading-tight" style={{ fontFamily: theme.headingFont }}>{card.title}</h3>
                            <p className="text-sm leading-7 opacity-80">{card.description}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {feedQuery.isLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-dashed border-current/25">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className={`rounded-[2rem] border p-8 ${theme.panelClassName}`}>
                {isSportsCardsPage ? (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
                    <div>
                      <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] opacity-65">
                        <Sparkles className="h-5 w-5" />
                        {benchmark?.emptyStateEyebrow}
                      </div>
                      <h3 className="mt-4 text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>{benchmark?.emptyStateTitle}</h3>
                      <p className="mt-4 max-w-2xl text-base leading-8 opacity-80">{benchmark?.emptyStateDescription}</p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild className="rounded-full px-5">
                          <Link href="/inventory">Browse member inventory</Link>
                        </Button>
                        <Button variant="outline" className="rounded-full bg-transparent" asChild>
                          <Link href="/members">Find Sports Cards traders</Link>
                        </Button>
                      </div>
                    </div>
                    <div className={`rounded-[1.75rem] border p-5 ${theme.cardClassName}`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">{benchmark?.emptyStateBuildoutTitle}</p>
                      <div className="mt-4 space-y-3 text-sm leading-7 opacity-80">
                        {benchmark?.emptyStateBuildoutNotes.map(note => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>
                    </div>
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
              <div className={`grid gap-5 ${isSportsCardsPage ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {listings.map(listing => (
                  <Card key={listing.id} className={`overflow-hidden border ${theme.cardClassName} ${isSportsCardsPage ? "rounded-[1.75rem] shadow-[0_18px_44px_rgba(15,76,92,0.12)]" : "rounded-[2rem]"}`}>
                    <div className={`overflow-hidden border-b border-current/10 ${isSportsCardsPage ? "aspect-[7/9] bg-[linear-gradient(180deg,rgba(243,228,188,0.92)_0%,rgba(232,214,168,0.92)_100%)] p-4" : "aspect-[4/5] bg-black/10"}`}>
                      <div className={isSportsCardsPage ? "h-full rounded-[1.25rem] border border-[#0f4658]/10 bg-[#f7ecd2] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" : "h-full"}>
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className={isSportsCardsPage ? "h-full w-full object-contain p-3" : "h-full w-full object-cover"}
                        />
                      </div>
                    </div>
                    <CardContent className={`space-y-5 ${isSportsCardsPage ? "p-5 text-[#153746]" : "p-5"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">{listing.categoryLabel}</p>
                          <Link href={`/listings/${listing.id}`} className="mt-2 block text-3xl font-semibold leading-tight hover:opacity-75">
                            {listing.title}
                          </Link>
                        </div>
                        {listing.featured ? <Badge className={`rounded-full px-3 py-1 ${theme.chipClassName}`}>Featured</Badge> : null}
                      </div>
                      <p className="line-clamp-3 text-sm leading-7 opacity-80">{listing.description}</p>
                      <div className="grid grid-cols-2 gap-3 rounded-[1.25rem] border border-current/10 bg-black/5 p-4 text-sm">
                        <div>
                          <p className="text-[0.7rem] uppercase tracking-[0.24em] opacity-60">Collector</p>
                          <p className="mt-2 font-semibold">{listing.owner.displayName}</p>
                        </div>
                        <div>
                          <p className="text-[0.7rem] uppercase tracking-[0.24em] opacity-60">Condition</p>
                          <p className="mt-2 font-semibold">{listing.conditionLabel}</p>
                        </div>
                        <div>
                          <p className="text-[0.7rem] uppercase tracking-[0.24em] opacity-60">Trust</p>
                          <div className="mt-2 flex items-center gap-2 font-semibold">
                            <Star className="h-4 w-4 fill-current" />
                            {listing.ownerRating.averageRating.toFixed(1)} ({listing.ownerRating.reviewCount})
                          </div>
                        </div>
                        <div>
                          <p className="text-[0.7rem] uppercase tracking-[0.24em] opacity-60">Status</p>
                          <p className="mt-2 font-semibold capitalize">{listing.status}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild className="rounded-full px-5">
                          <Link href={`/listings/${listing.id}`}>View listing</Link>
                        </Button>
                        <Dialog open={proposalListingId === listing.id} onOpenChange={open => setProposalListingId(open ? listing.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="rounded-full bg-transparent" disabled={!isAuthenticated}>
                              <MessageSquareText className="mr-2 h-4 w-4" />
                              Trade Proposal
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
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

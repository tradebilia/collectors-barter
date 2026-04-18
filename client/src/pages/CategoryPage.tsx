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
    { label: "Sport", placeholder: "Baseball, Basketball", type: "select" },
    { label: "Grading service", placeholder: "PSA, BGS, SGC", type: "select" },
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
  const sportsCardsWallpaperImages = isSportsCardsPage
    ? [
        benchmarkSpotlights[0]?.imageUrl,
        resolveTradebiliaListingImage({ title: "1976 Walter Payton Rookie", category: slug }),
        resolveTradebiliaListingImage({ title: "1980 Rickey Henderson Rookie", category: slug }),
        resolveTradebiliaListingImage({ title: "1981 Joe Montana Rookie", category: slug }),
        resolveTradebiliaListingImage({ title: "Mickey Mantle", category: slug }),
      ].filter(Boolean)
    : [];

  return (
    <div className={`min-h-screen ${theme.pageClassName}`}>
      <header className={`border-b ${theme.borderClassName} ${theme.heroClassName}`}>
        <div className={`relative overflow-hidden ${theme.textureClassName}`}>
          <div className={`container relative ${isSportsCardsPage ? "py-6 lg:py-8" : "py-8 lg:py-12"}`}>
            {isSportsCardsPage ? (
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/12 bg-[linear-gradient(135deg,rgba(12,55,66,0.94)_0%,rgba(28,111,127,0.78)_44%,rgba(8,33,42,0.95)_100%)] px-6 py-8 shadow-[0_34px_80px_rgba(6,20,29,0.34)] lg:px-10 lg:py-10">
                <div className="pointer-events-none absolute inset-0 opacity-[0.28]">
                  <div className="absolute inset-0 grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4 lg:px-8 lg:py-7">
                    {sportsCardsWallpaperImages.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className={`flex items-center justify-center rounded-[1.25rem] border border-white/8 bg-[#123b49]/18 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.14)] ${index % 2 === 0 ? "rotate-[-7deg]" : "rotate-[6deg]"}`}
                      >
                        <img src={imageUrl} alt="" aria-hidden="true" className="h-full max-h-[16rem] w-full object-contain" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,39,48,0.94)_0%,rgba(8,39,48,0.68)_26%,rgba(8,39,48,0.34)_54%,rgba(8,39,48,0.76)_100%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,39,48,0.4)_0%,rgba(8,39,48,0.1)_35%,rgba(8,39,48,0.64)_100%)]" />
                </div>
                <div className="relative max-w-4xl text-[#fff4df]">
                  <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                    <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-20 w-20 rounded-full object-cover shadow-[0_10px_25px_rgba(0,0,0,0.24)] lg:h-24 lg:w-24" />
                    <div className="border-l border-white/30 pl-4 lg:pl-6">
                      <p className="text-[clamp(2.35rem,5vw,4.6rem)] font-black uppercase leading-none tracking-[0.03em] text-[#fff3d5]" style={{ fontFamily: theme.headingFont }}>Tradebilia</p>
                      <p className="mt-2 text-sm uppercase tracking-[0.28em] text-white/80 lg:text-base">Collectors Trading Exchange</p>
                    </div>
                  </div>
                  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.36em] text-white/78">{theme.eyebrow}</p>
                  <h1 className="mt-3 max-w-5xl text-4xl leading-none sm:text-6xl lg:text-[5rem]" style={{ fontFamily: theme.headingFont }}>
                    {categoryLabel.toUpperCase()} EXCHANGE
                  </h1>
                  <p className="mt-4 max-w-3xl text-[1.02rem] leading-8 text-white/86">{theme.description}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {benchmarkQuickFilters.map(filter => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setKeyword(filter.toLowerCase())}
                        className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-[#fff3d5] backdrop-blur-sm transition hover:bg-white/18"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
                    <div className="rounded-[1.5rem] border border-white/12 bg-black/18 p-5 backdrop-blur-sm">
                      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
                        <Trophy className="h-4 w-4" />
                        {benchmark?.heroNotesEyebrow}
                      </div>
                      <p className="mt-4 text-base leading-8 text-white/84">{benchmark?.heroNotes[0]}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      {[
                        ["Listings", String(listings.length)],
                        ["Collectors", String(feedQuery.data?.highlights.activeCollectors ?? 0)],
                        ["Completed Trades", String(feedQuery.data?.highlights.completedTrades ?? 0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[1.35rem] border border-white/12 bg-black/18 px-4 py-3 text-[#fff3d5] backdrop-blur-sm">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">{label}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
        <nav className="border-t border-black/20 bg-black/65 backdrop-blur-sm">
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
      </header>

      <main className="container py-8 lg:py-10">
        <div className={`grid gap-6 ${isSportsCardsPage ? "xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start" : "xl:grid-cols-[280px_minmax(0,1fr)]"}`}>
          <aside className={`rounded-[2rem] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${theme.panelClassName} ${isSportsCardsPage ? "xl:sticky xl:top-6" : ""}`}>
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
              </div>
              {isSportsCardsPage ? (
                <div className="rounded-[1.5rem] border border-current/10 bg-white/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-65">Card-show shortcuts</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {benchmarkQuickFilters.map(filter => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setKeyword(filter.toLowerCase())}
                        className="rounded-full border border-current/10 bg-white/80 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className={`rounded-[1.5rem] border p-4 ${theme.cardClassName}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">Subscriber tools</p>
                <p className="mt-3 text-sm leading-7 opacity-80">Signed-in members can message, save to Watchlist, and send Trade Proposals from every category exchange.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className={`rounded-full px-3 py-1 ${theme.chipClassName}`}>Watchlist</Badge>
                  <Badge className={`rounded-full px-3 py-1 ${theme.chipClassName}`}>Trade Proposals</Badge>
                  <Badge className={`rounded-full px-3 py-1 ${theme.chipClassName}`}>Ratings and Reviews</Badge>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className={`rounded-[2rem] border p-6 ${theme.panelClassName}`}>
              <div className={`grid gap-5 ${isSportsCardsPage ? "xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start" : "lg:flex lg:items-end lg:justify-between"}`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.32em] ${theme.accentClassName}`}>Curated exchange</p>
                  <h2 className="mt-3 text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>{theme.heading}</h2>
                  <p className="mt-3 max-w-3xl text-base leading-8 opacity-80">
                    Showing {listings.length} {categoryLabel.toLowerCase()} listings with Watchlist actions, public browsing, and subscriber-only trading controls.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-12 bg-white/80 text-slate-950">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-12 rounded-full bg-white/80 text-slate-950 hover:bg-white" asChild>
                    <Link href="/members">Member Search</Link>
                  </Button>
                </div>
              </div>
              {isSportsCardsPage ? (
                <div className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
                  {benchmark?.summaryHighlights.map((item, index) => {
                    const Icon = index === 0 ? Trophy : index === 1 ? ShieldCheck : ArrowRight;
                    return (
                      <div
                        key={item.eyebrow}
                        className={`rounded-[1.65rem] border p-5 shadow-[0_16px_35px_rgba(8,47,73,0.08)] ${index === 0 ? "border-[#0b3e51]/18 bg-[#fff5df]" : "border-current/10 bg-white/58"}`}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] opacity-65">
                          <Icon className="h-4 w-4" />
                          {item.eyebrow}
                        </div>
                        <p className={`mt-4 font-semibold leading-7 ${index === 0 ? "text-[1.45rem]" : "text-lg"}`}>{item.title}</p>
                        <p className="mt-3 text-sm leading-7 opacity-75">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {isSportsCardsPage ? (
              <section className="space-y-5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${theme.accentClassName}`}>Showcase grails</p>
                    <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>Featured cardboard that makes the benchmark page feel alive.</h3>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 opacity-75">These editorial cards should feel closer to featured inventory than placeholders, giving the Sports Cards exchange enough collector energy even before the live grid fills out.</p>
                </div>
                <div className="grid gap-5 lg:grid-cols-[1.25fr_0.92fr_0.92fr] lg:items-stretch">
                  {benchmarkSpotlights.map((card, index) => (
                    <article
                      key={card.title}
                      className={`group overflow-hidden rounded-[2rem] border shadow-[0_22px_55px_rgba(15,76,92,0.16)] transition hover:-translate-y-1 ${index === 0 ? "border-[#104255]/25 bg-[#fff7e8]" : theme.cardClassName}`}
                    >
                      <div className={`relative overflow-hidden border-b border-current/10 bg-[#12394b] ${index === 0 ? "aspect-[16/12]" : "aspect-[4/3]"}`}>
                        <img src={card.imageUrl} alt={card.title} className={`h-full w-full transition duration-500 group-hover:scale-[1.03] ${index === 0 ? "object-cover object-top" : "object-cover"}`} />
                        <div className={`absolute inset-0 ${index === 0 ? "bg-gradient-to-t from-[#041821]/82 via-[#041821]/14 to-transparent" : "bg-gradient-to-t from-[#06202c]/70 via-transparent to-transparent"}`} />
                        <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-[#06202c]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#fff3d5] backdrop-blur-sm">
                          {index === 0 ? "Centerpiece" : "Showcase"}
                        </div>
                        {index === 0 ? (
                          <div className="absolute inset-x-0 bottom-0 p-5 text-[#fff3d5]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/65">Card-show headliner</p>
                            <p className="mt-3 text-3xl font-semibold leading-tight">{card.title}</p>
                          </div>
                        ) : null}
                      </div>
                      <div className={`space-y-3 ${index === 0 ? "p-6 lg:p-7" : "p-5 lg:p-6"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">{card.eyebrow}</p>
                        {index === 0 ? null : <h3 className="text-2xl font-semibold leading-tight">{card.title}</h3>}
                        <p className="text-sm leading-7 opacity-80">{card.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {listings.map(listing => (
                  <Card key={listing.id} className={`overflow-hidden rounded-[2rem] border ${theme.cardClassName}`}>
                    <div className="aspect-[4/5] overflow-hidden border-b border-current/10 bg-black/10">
                      <img
                        src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="space-y-5 p-5">
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

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
import { trpc } from "@/lib/trpc";
import {
  TRADEBILIA_LOGO_URL,
  getTradebiliaCategoryLabel,
  getTradebiliaCategoryTheme,
  tradebiliaCategories,
  tradebiliaConditionOptions,
  type TradebiliaCategorySlug,
} from "@/lib/tradebilia";
import { Heart, Loader2, MessageSquareText, Search, Sparkles, Star } from "lucide-react";
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

  return (
    <div className={`min-h-screen ${theme.pageClassName}`}>
      <header className={`border-b ${theme.borderClassName} ${theme.heroClassName}`}>
        <div className={`relative overflow-hidden ${theme.textureClassName}`}>
          <div className="container py-8 lg:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-auto w-full max-w-xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.25)]" />
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.36em] opacity-80">{theme.eyebrow}</p>
                <h1 className="mt-4 text-5xl leading-none sm:text-6xl lg:text-7xl" style={{ fontFamily: theme.headingFont }}>
                  {categoryLabel.toUpperCase()} EXCHANGE
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 opacity-90 sm:text-lg">{theme.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:max-w-md lg:flex-1">
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
            </div>
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
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`rounded-[2rem] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${theme.panelClassName}`}>
            <div className="flex items-center gap-3">
              <Search className={`h-5 w-5 ${theme.accentClassName}`} />
              <h2 className="text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>Filters</h2>
            </div>
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.32em] ${theme.accentClassName}`}>Curated exchange</p>
                  <h2 className="mt-3 text-4xl font-semibold" style={{ fontFamily: theme.headingFont }}>{theme.heading}</h2>
                  <p className="mt-3 max-w-3xl text-base leading-8 opacity-80">
                    Showing {listings.length} {categoryLabel.toLowerCase()} listings with Watchlist actions, public browsing, and subscriber-only trading controls.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem]">
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
            </div>

            {feedQuery.isLoading ? (
              <div className="flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-dashed border-current/25">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : listings.length === 0 ? (
              <div className={`rounded-[2rem] border p-10 text-center ${theme.panelClassName}`}>
                <Sparkles className="mx-auto h-10 w-10" />
                <h3 className="mt-5 text-3xl font-semibold" style={{ fontFamily: theme.headingFont }}>No listings match these filters yet.</h3>
                <p className="mt-4 text-base leading-8 opacity-80">Try broadening the search or explore another Tradebilia category exchange.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {listings.map(listing => (
                  <Card key={listing.id} className={`overflow-hidden rounded-[2rem] border ${theme.cardClassName}`}>
                    <div className="aspect-[4/5] overflow-hidden border-b border-current/10 bg-black/10">
                      {listing.primaryPhotoUrl ? (
                        <img src={listing.primaryPhotoUrl} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-black/10 px-8 text-center text-sm opacity-70">
                          No listing photo uploaded yet.
                        </div>
                      )}
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

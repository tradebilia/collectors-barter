import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Clock3, Loader2, Menu, Search, ShieldCheck, Star, Trophy, UserRound } from "lucide-react";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

const categoryLinks = [
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

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to view your Tradebilia profile.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Subscriber accounts unlock your profile identity, Trade History, Ratings and Reviews, Watchlist, inventory, and negotiation activity.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Subscriber Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const completedTrades = dashboard.tradeHistory.filter(proposal => proposal.status === "completed");
  const activeTrades = dashboard.tradeHistory.filter(proposal => ["pending", "accepted", "countered"].includes(proposal.status));
  const profile = dashboard.profile;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
      <header className="border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="px-4 py-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-[2rem] font-semibold tracking-tight text-white">
              Search
            </Link>
            <div className="flex min-w-[18rem] flex-1 items-center rounded-[1rem] border border-white/10 bg-white/16 px-4 py-3">
              <Search className="mr-3 h-4 w-4 text-white/60" />
              <span className="text-white/60">Search collectibles, members, and categories</span>
            </div>
            <div className="ml-auto flex items-center gap-3 rounded-full border border-white/10 px-4 py-2 text-sm">
              <span className="rounded-md bg-white/10 px-3 py-1 font-semibold">My</span>
              <Avatar className="h-9 w-9 border border-white/15">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                <AvatarFallback className="bg-white/10 text-white">{initials(profile.displayName)}</AvatarFallback>
              </Avatar>
              <span className="hidden font-semibold sm:inline">{profile.displayName}</span>
              <Menu className="h-5 w-5 text-[#efe56c]" />
            </div>
          </div>
          <nav className="mt-4 grid overflow-hidden border border-slate-300 bg-white text-slate-950 md:grid-cols-5 xl:grid-cols-10">
            {categoryLinks.map(category => (
              <Link
                key={category.value}
                href={`/category/${category.value}`}
                className="border-b border-r border-slate-300 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] transition hover:bg-slate-100"
              >
                {category.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(7,7,48,0.18)_0%,rgba(7,7,48,0.55)_100%)] px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-auto w-full max-w-[42rem]" />
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden border-white/10 bg-black/20 text-white shadow-[0_40px_90px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-28 w-28 border border-white/15 shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
                      <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                      <AvatarFallback className="bg-white/10 text-3xl text-white">{initials(profile.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Badge className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-cyan-100 hover:bg-cyan-300/10">
                        Subscriber Profile
                      </Badge>
                      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">{profile.displayName}</h1>
                      <p className="mt-2 text-lg text-white/70">Tradebilia subscriber member</p>
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-300">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="text-3xl font-semibold">{profile.rating.averageRating.toFixed(1)}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">{profile.rating.reviewCount} Ratings and Reviews</p>
                  </div>
                </div>

                <p className="mt-8 max-w-3xl rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-base leading-8 text-white/80">
                  {profile.bio}
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Trade History", value: profile.tradeHistoryCount, icon: Clock3 },
                    { label: "Completed Trades", value: completedTrades.length, icon: Trophy },
                    { label: "Active Trades", value: activeTrades.length, icon: ShieldCheck },
                    { label: "Watchlist", value: dashboard.watchlist.length, icon: UserRound },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm uppercase tracking-[0.2em] text-white/55">{stat.label}</p>
                          <Icon className="h-5 w-5 text-cyan-200" />
                        </div>
                        <p className="mt-5 text-4xl font-semibold text-white">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20 text-white shadow-[0_40px_90px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-3xl">Tradebilia trust snapshot</CardTitle>
                <CardDescription className="text-white/65">
                  The profile page keeps identity, reputation, and activity visible so every trade feels accountable and community-driven.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-white/55">Collection focus</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{dashboard.ownListings[0]?.categoryLabel ?? "Curated multi-category collection"}</p>
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    Inventory can be used in Trade Proposals, counters, and accepted trade negotiations across the Tradebilia marketplace.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/55">Current inventory</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{dashboard.ownListings.length}</p>
                    <p className="mt-2 text-sm text-white/65">Collectibles available to browse, manage, and offer in trade responses.</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/55">Saved interest</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{dashboard.watchlist.length}</p>
                    <p className="mt-2 text-sm text-white/65">Listings currently saved to the member Watchlist for follow-up.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-full bg-[#0d6a6f] px-6 text-white hover:bg-[#0b585c]">
                    <Link href="/inventory">View My Inventory</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
                    <Link href="/inventory/new">Add to Your Inventory</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="border-white/10 bg-black/20 text-white shadow-[0_40px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl">Trade History and reputation</CardTitle>
              <CardDescription className="text-white/65">
                This view keeps completed exchanges, active negotiations, and received Ratings and Reviews in one polished member profile workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="trade-history" className="space-y-6">
                <TabsList className="flex h-auto flex-wrap gap-3 rounded-full bg-white/6 p-2">
                  <TabsTrigger value="trade-history" className="rounded-full px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                    Trade History
                  </TabsTrigger>
                  <TabsTrigger value="ratings" className="rounded-full px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                    Ratings and Reviews
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trade-history" className="mt-0">
                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      {dashboard.tradeHistory.length > 0 ? (
                        dashboard.tradeHistory.map(proposal => (
                          <button
                            key={proposal.id}
                            type="button"
                            className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-left transition hover:bg-white/8"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-white/50">Trade Proposal #{proposal.id}</p>
                                <h3 className="mt-2 text-2xl font-semibold text-white">{proposal.requestedListing?.title ?? "Requested collectible"}</h3>
                                <p className="mt-2 text-sm text-white/70">
                                  With {proposal.counterpart.displayName} · {proposal.direction === "incoming" ? "Incoming" : "Outgoing"}
                                </p>
                              </div>
                              <Badge className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white hover:bg-white/10">
                                {proposal.status}
                              </Badge>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Requested Item</p>
                                <p className="mt-2 font-medium text-white">{proposal.requestedListing?.title ?? "Pending selection"}</p>
                              </div>
                              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-3">
                                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Items in response</p>
                                <p className="mt-2 font-medium text-white">{proposal.offeredListings.length}</p>
                              </div>
                            </div>
                            <p className="mt-4 text-sm leading-7 text-white/65">{proposal.note || "No additional trade note was left on this exchange."}</p>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/4 p-6 text-sm leading-7 text-white/65">
                          Your Trade History will appear here as you send, receive, and complete Trade Proposals.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6">
                      <h3 className="text-3xl font-semibold text-white">Profile reputation summary</h3>
                      <Separator className="my-5 bg-white/10" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Average rating</p>
                          <p className="mt-4 text-5xl font-semibold text-white">{profile.rating.averageRating.toFixed(1)}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Review count</p>
                          <p className="mt-4 text-5xl font-semibold text-white">{profile.rating.reviewCount}</p>
                        </div>
                      </div>
                      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Trade conduct</p>
                        <p className="mt-3 text-base leading-8 text-white/75">
                          Ratings and Reviews are shown alongside Trade History so members can judge communication quality, reliability, and fairness before sending a new Trade Proposal.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ratings" className="mt-0">
                  <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                    <ScrollArea className="h-[34rem] rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4">
                      <div className="space-y-4 pr-4">
                        {dashboard.ratingsAndReviews.length > 0 ? (
                          dashboard.ratingsAndReviews.map(review => (
                            <div key={review.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12 border border-white/15">
                                    <AvatarImage src={review.reviewer.avatarUrl ?? undefined} alt={review.reviewer.displayName} />
                                    <AvatarFallback className="bg-white/10 text-white">{initials(review.reviewer.displayName)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-lg font-semibold text-white">{review.reviewer.displayName}</p>
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Trade Proposal #{review.proposalId}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-amber-300">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-white/20"}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="mt-4 text-sm leading-7 text-white/75">{review.review || "A positive Tradebilia exchange was completed without a written review."}</p>
                              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/4 p-6 text-sm leading-7 text-white/65">
                            Ratings and Reviews will appear here after completed trades are reviewed by other members.
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="space-y-4">
                      <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
                        <p className="text-sm uppercase tracking-[0.2em] text-white/50">Trust indicators</p>
                        <h3 className="mt-3 text-3xl font-semibold text-white">Why members can trade with confidence</h3>
                        <p className="mt-4 text-base leading-8 text-white/75">
                          Trade History, visible Ratings and Reviews, and proposal-thread messaging create a clear audit trail that fits Tradebilia’s community-driven exchange model.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Received reviews</p>
                          <p className="mt-3 text-4xl font-semibold text-white">{dashboard.ratingsAndReviews.length}</p>
                        </div>
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Completed trades</p>
                          <p className="mt-3 text-4xl font-semibold text-white">{completedTrades.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

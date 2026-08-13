import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { ensureDirectThread, loadFavoriteMemberIds, loadPresenceMap, saveFavoriteMemberIds, subscribeToPresence, updatePresence } from "@/lib/memberMessaging";
import { trpc } from "@/lib/trpc";
import { Crown, Loader2, Medal, MessageSquareText, Search, ShieldCheck, Sparkles, Star, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "TB";
}

export default function MemberSearch() {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [verification, setVerification] = useState("all");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<number, { displayName: string; updatedAt: number }>>({});

  const membersQuery = trpc.members.search.useQuery({
    query,
    region,
    verification: verification as "all" | "verified" | "established" | "rising",
  });

  useEffect(() => {
    if (!user?.id) return;
    setFavoriteIds(loadFavoriteMemberIds(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const presenceName = user.name ?? "Tradebilia Member";
    updatePresence(user.id, presenceName);
    const heartbeat = window.setInterval(() => updatePresence(user.id, presenceName), 5000);
    setPresenceMap(loadPresenceMap());
    const unsubscribe = subscribeToPresence(() => setPresenceMap(loadPresenceMap()));
    return () => {
      window.clearInterval(heartbeat);
      unsubscribe();
    };
  }, [user?.id, user?.name]);

  const topSpotlight = useMemo(() => membersQuery.data?.members[0] ?? null, [membersQuery.data?.members]);

  const toggleFavorite = (memberId: number, memberName: string) => {
    if (!user?.id) {
      window.location.href = getLoginUrl();
      return;
    }
    const next = favoriteIds.includes(memberId) ? favoriteIds.filter(id => id !== memberId) : [...favoriteIds, memberId];
    setFavoriteIds(next);
    saveFavoriteMemberIds(user.id, next);
    toast.success(next.includes(memberId) ? `${memberName} added to favorites.` : `${memberName} removed from favorites.`);
  };

  const openDirectConversation = (member: { userId: number; displayName: string; avatarUrl: string | null }) => {
    if (!isAuthenticated || !user?.id || !user.name) {
      window.location.href = getLoginUrl();
      return;
    }
    ensureDirectThread({
      currentUserId: user.id,
      counterpartId: member.userId,
      counterpartName: member.displayName,
      counterpartAvatarUrl: member.avatarUrl,
    });
    window.location.href = `/messages?direct=${member.userId}`;
  };

  const openTradeEntry = (member: any) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    // Get the first active listing from this member
    const firstListing = member.listings?.[0];
    if (!firstListing) {
      toast.info(`${member.displayName} does not currently have a public active listing to start from.`);
      return;
    }
    window.location.href = `/listings/${firstListing.id}`;
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <TopBar searchPlaceholder="Search Tradebilia..." />
      <section
        className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white"
        style={{
          backgroundImage: "url(/manus-storage/Background_23084d14.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container flex h-52 items-center justify-center sm:h-60 lg:h-72">
          <img
            src="/manus-storage/MemberDirectory_de7393cf.webp"
            alt="Member Directory"
            className="h-auto w-full max-w-5xl object-contain px-4"
          />
        </div>
      </section>
      <CategoryBar />

      <main className="container py-8 lg:py-10">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_290px]">
          <aside className="rounded-[2rem] border border-slate-300/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-slate-700" />
              <h2 className="text-3xl font-semibold text-slate-900">Search Filters</h2>
            </div>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label>Member ID or name</Label>
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Tradebilia members" className="h-12 bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    {membersQuery.data?.regions.filter((item): item is string => item !== null).map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verification</Label>
                <Select value={verification} onValueChange={setVerification}>
                  <SelectTrigger className="h-12 bg-white">
                    <SelectValue placeholder="Any verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="established">Established</SelectItem>
                    <SelectItem value="rising">Rising</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Actions</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">Send Message opens a direct collector conversation, Offer Trade jumps into a real listing flow, and favorites persist for signed-in subscribers.</p>
                {!isAuthenticated ? (
                  <Button className="mt-4 w-full rounded-full" onClick={() => (window.location.href = getLoginUrl())}>Sign in to message members</Button>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {topSpotlight ? (
              <Card className="overflow-hidden rounded-[2rem] border border-slate-300/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8f5ef_48%,#e7dcc7_100%)] shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
                <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Collector spotlight</p>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-18 w-18 border border-slate-200">
                        <AvatarImage src={topSpotlight.avatarUrl ?? undefined} alt={topSpotlight.displayName} />
                        <AvatarFallback>{initials(topSpotlight.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-4xl font-semibold text-slate-900">{topSpotlight.displayName}</h2>
                        <p className="mt-1 text-sm uppercase tracking-[0.16em] text-slate-500">Member #{topSpotlight.userId} · {topSpotlight.regionLabel}</p>
                      </div>
                    </div>
                    <p className="max-w-2xl text-base leading-8 text-slate-600">{topSpotlight.bio}</p>
                    <div className="flex flex-wrap gap-2">
                      {topSpotlight.topCategories.map(category => (
                        <Badge key={category} variant="secondary" className="rounded-full px-3 py-1">{category}</Badge>
                      ))}
                      <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">{topSpotlight.verificationLevel}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {[
                      ["Average Rating", topSpotlight.averageRating ? topSpotlight.averageRating.toFixed(1) : "New"],
                      ["Reviews", String(topSpotlight.reviewCount)],
                      ["Listings", String(topSpotlight.listingCount)],
                      ["Completed Trades", String(topSpotlight.completedTradeCount)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[1.4rem] border border-slate-200 bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {membersQuery.isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/60">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : membersQuery.data?.members.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {membersQuery.data.members.map(member => {
                  const favorite = favoriteIds.includes(member.userId);
                  const presence = presenceMap[member.userId];
                  const onlineNow = member.online || (presence ? Date.now() - presence.updatedAt < 15000 : false);
                  return (
                    <Card key={member.userId} className="rounded-[2rem] border border-slate-300/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                      <CardContent className="space-y-5 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border border-slate-200">
                              <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                              <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-2xl font-semibold text-slate-900">{member.displayName}</h3>
                              <p className="mt-1 text-sm uppercase tracking-[0.14em] text-slate-500">Member #{member.userId}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                <Badge variant="outline" className="rounded-full">{member.regionLabel}</Badge>
                                <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">{member.verificationLevel}</Badge>
                                {onlineNow ? <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Online now</span> : null}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                              <Star className="h-4 w-4 fill-current" />
                              {member.averageRating ? member.averageRating.toFixed(1) : "New"}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">{member.reviewCount} reviews</p>
                          </div>
                        </div>

                        <p className="text-sm leading-7 text-slate-600">{member.bio}</p>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Listings</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">{member.listingCount}</p>
                          </div>
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Completed Trades</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">{member.completedTradeCount}</p>
                          </div>
                          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Collection Focus</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{member.topCategories.join(" · ") || "Multi-category"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button className="rounded-full" onClick={() => openDirectConversation(member)}>
                            <MessageSquareText className="mr-2 h-4 w-4" />
                            Send Message
                          </Button>
                          <Button variant="outline" className="rounded-full bg-transparent" onClick={() => openTradeEntry(member)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Offer Trade
                          </Button>
                          <Button variant="outline" className="rounded-full bg-transparent" onClick={() => toggleFavorite(member.userId, member.displayName)}>
                            <UserRoundPlus className="mr-2 h-4 w-4" />
                            {favorite ? "Favorited" : "Add to Favorites"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-slate-300/70 bg-white/80 p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <Sparkles className="mx-auto h-10 w-10 text-slate-500" />
                <h3 className="mt-5 text-3xl font-semibold text-slate-900">No members match the current filters.</h3>
                <p className="mt-4 text-base leading-8 text-slate-600">Try broadening the region or verification filters to explore more Tradebilia collectors.</p>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <Card className="rounded-[2rem] border border-slate-300/70 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-amber-600" />
                  <h2 className="text-2xl font-semibold text-slate-900">Top Member Rankings</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {(membersQuery.data?.rankings.topRated ?? []).map((member: any, index: number) => (
                    <div key={member.userId} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rank #{index + 1}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{member.displayName}</p>
                      <p className="mt-1 text-sm text-slate-600">{member.averageRating.toFixed(1)} average rating across {member.reviewCount} reviews</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-slate-300/70 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Medal className="h-5 w-5 text-slate-700" />
                  <h2 className="text-2xl font-semibold text-slate-900">Most Active</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {(membersQuery.data?.rankings.mostActive ?? []).map((member: any) => (
                    <div key={member.userId} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-lg font-semibold text-slate-900">{member.displayName}</p>
                      <p className="mt-1 text-sm text-slate-600">{member.listingCount} active listings · {member.completedTradeCount} completed trades</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

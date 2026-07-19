import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getAvatarInitials } from "@/lib/tradebilia";
import { MessageSquare, Star, Loader2, CalendarDays, Activity, ShoppingBag } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useParams, Link } from "wouter";

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const userProfileQuery = trpc.market.getUserProfile.useQuery(
    { userId: userId ? parseInt(userId, 10) : 0 },
    { enabled: !!userId }
  );

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Profile not found</h1>
          <p className="mt-2 text-slate-600">The user profile you're looking for doesn't exist.</p>
          <Button asChild className="mt-4 rounded-lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (userProfileQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <Loader2 className="h-10 w-10 animate-spin text-slate-950" />
      </div>
    );
  }

  const profile = userProfileQuery.data?.profile;
  const user = userProfileQuery.data?.user as any;
  const stats = (userProfileQuery.data as any)?.stats;
  const reviews = (userProfileQuery.data as any)?.reviews || [];
  const recentListings = (userProfileQuery.data as any)?.recentListings || [];

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Profile not found</h1>
          <p className="mt-2 text-slate-600">The user profile you're looking for doesn't exist.</p>
          <Button asChild className="mt-4 rounded-lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = (profile as any).displayName || user?.displayName || "Collector";
  const avatarUrl = (profile as any).avatarUrl || user?.avatarUrl;
  const bio = (profile as any).bio;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : null;
  const lastSeen = user?.lastActivityAt ? new Date(user.lastActivityAt) : null;
  const isRecentlyActive = lastSeen && (Date.now() - lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <TopBar />

      {/* Hero Section */}
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/images/Mainpage.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 lg:h-80">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img src="/images/heros/Profile.svg" alt="Profile" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── Profile Header Card ── */}
          <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {/* Avatar */}
                <Avatar className="h-28 w-28 flex-shrink-0 border-4 border-slate-200">
                  <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                  <AvatarFallback className="bg-[#7f31ff] text-3xl font-semibold text-white">
                    {getAvatarInitials({ firstName: (profile as any).firstName, lastName: (profile as any).lastName, displayName })}
                  </AvatarFallback>
                </Avatar>

                {/* Name + badges + action */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-slate-950">{displayName}</h1>

                  <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-500 sm:justify-start">
                    {memberSince && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Member since {memberSince}
                      </span>
                    )}
                    {lastSeen && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {isRecentlyActive ? "Active this week" : `Last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    )}
                  </div>

                  {/* Trust badges */}
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge className="bg-blue-100 text-blue-800 border-0">✓ Verified Member</Badge>
                    {isRecentlyActive && (
                      <Badge className="bg-green-100 text-green-800 border-0">🟢 Active Trader</Badge>
                    )}
                    {user?.ebayUsername && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-0">
                        eBay Verified — {user.ebayUsername} ({user.ebayFeedbackScore} feedback)
                      </Badge>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="mt-5">
                    <Button className="rounded-lg bg-blue-600 hover:bg-blue-700">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                </div>

                {/* Stats summary on right */}
                <div className="flex flex-row gap-6 sm:flex-col sm:items-end sm:gap-3 text-center sm:text-right">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">{stats?.itemsListed || 0}</p>
                    <p className="text-xs text-slate-500">Items Listed</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">{stats?.completedTrades || 0}</p>
                    <p className="text-xs text-slate-500">Completed Trades</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 sm:justify-end">
                      <span className="text-3xl font-bold text-yellow-500">{stats?.avgRating || '0.0'}</span>
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    </div>
                    <p className="text-xs text-slate-500">Avg Rating</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── About + Reviews (two columns) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* About */}
            {bio && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">{bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className={`rounded-[1.5rem] border-slate-200 bg-white shadow-sm ${!bio ? 'lg:col-span-2' : ''}`}>
              <CardHeader>
                <CardTitle>Collector Feedback</CardTitle>
                <CardDescription>What other collectors say about trading with this member</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-950">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, j) => (
                                <Star
                                  key={j}
                                  className={`h-4 w-4 ${j < Math.round(review.overallRating || 0) ? "fill-yellow-500 text-yellow-500" : "text-slate-300"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="mt-1.5 text-sm text-slate-600">
                            {review.review || <span className="italic text-slate-400">No written feedback provided.</span>}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Star className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>No feedback yet. Be the first to trade with this member!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Recently Listed Items ── */}
          {recentListings.length > 0 && (
            <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-slate-600" />
                  <div>
                    <CardTitle>Currently Listed for Trade</CardTitle>
                    <CardDescription className="mt-0.5">Items this member has available right now</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recentListings.map((listing: any) => (
                    <Link key={listing.id} href={`/listing/${listing.id}`}>
                      <div className="group cursor-pointer">
                        <div className="relative w-full aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group-hover:border-blue-400 transition-colors">
                          {listing.imageUrl ? (
                            <img
                              src={listing.imageUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ShoppingBag className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-700 group-hover:text-blue-600 truncate leading-tight">{listing.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

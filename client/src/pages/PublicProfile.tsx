import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getAvatarInitials, formatGrade, tradebiliaConditionOptions } from "@/lib/tradebilia";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { MessageSquare, Star, Loader2, CalendarDays, Activity, ShoppingBag, CheckCircle2, MapPin } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useParams, Link } from "wouter";

// ── Helpers ──────────────────────────────────────────────────────────────────
function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-slate-600 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-sm font-semibold text-slate-800 text-right">{value > 0 ? value : "—"}</span>
    </div>
  );
}

function HistogramRow({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs text-slate-500 text-right">{stars} Stars</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs text-slate-500">{count}</span>
    </div>
  );
}

// ── Platform verification config ─────────────────────────────────────────────
const PLATFORMS = [
  { key: "ebay", label: "eBay", color: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { key: "facebook", label: "Facebook", color: "bg-blue-50 border-blue-300 text-blue-800" },
  { key: "paypal", label: "PayPal", color: "bg-sky-50 border-sky-300 text-sky-800" },
  { key: "instagram", label: "Instagram", color: "bg-pink-50 border-pink-300 text-pink-800" },
  { key: "twitter", label: "X / Twitter", color: "bg-slate-50 border-slate-300 text-slate-800" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<"overview" | "listings" | "reviews" | "about">("overview");

  const userProfileQuery = trpc.market.getUserProfile.useQuery(
    { userId: userId ? parseInt(userId, 10) : 0 },
    { enabled: !!userId }
  );

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Profile not found</h1>
          <Button asChild className="mt-4 rounded-lg"><Link href="/">Back to Home</Link></Button>
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

  const profile = userProfileQuery.data?.profile as any;
  const user = userProfileQuery.data?.user as any;
  const stats = (userProfileQuery.data as any)?.stats;
  const reviews = (userProfileQuery.data as any)?.reviews || [];
  const recentListings = (userProfileQuery.data as any)?.recentListings || [];

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Profile not found</h1>
          <Button asChild className="mt-4 rounded-lg"><Link href="/">Back to Home</Link></Button>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || user?.displayName || "Collector";
  const avatarUrl = profile.avatarUrl || user?.avatarUrl;
  const bio = profile.bio;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : null;
  const lastSeen = user?.lastActivityAt ? new Date(user.lastActivityAt) : null;
  const isRecentlyActive = lastSeen && (Date.now() - lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000;
  const totalReviews = reviews.length;
  const histogram = stats?.histogram || { five: 0, four: 0, three: 0, two: 0, one: 0 };
  const totalHistogram = histogram.five + histogram.four + histogram.three + histogram.two + histogram.one;

  // Connected platforms — check ebayUsername as proxy; others are placeholders for now
  const connectedPlatforms = PLATFORMS.filter(p => {
    if (p.key === "ebay") return !!user?.ebayUsername;
    return false; // other platforms not yet connected
  });

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "listings", label: `Listings (${stats?.itemsListed || 0})` },
    { id: "reviews", label: `Reviews (${totalReviews})` },
    { id: "about", label: "About" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <TopBar />

      {/* Hero Section — unchanged */}
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

      {/* ── Everything below the category bar ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">

          {/* Profile identity row */}
          <div className="flex flex-col sm:flex-row items-start gap-5 pt-6 pb-4">
            <Avatar className="h-20 w-20 flex-shrink-0 border-4 border-white shadow-md -mt-2">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-[#7f31ff] text-2xl font-bold text-white">
                {getAvatarInitials({ firstName: profile.firstName, lastName: profile.lastName, displayName })}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-950">{displayName}</h1>
                <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                {isRecentlyActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    🟢 Active Trader
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                {memberSince && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Member since {memberSince}
                  </span>
                )}
                {profile.contactTown && profile.contactState && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.contactTown}, {profile.contactState}
                  </span>
                )}
                {lastSeen && (
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    {isRecentlyActive ? "Active this week" : `Last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </span>
                )}
              </div>

              {/* Stats summary */}
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span className="font-bold text-slate-950">{stats?.itemsListed || 0}</span> <span className="text-slate-500">Items Listed</span></span>
                <span><span className="font-bold text-slate-950">{stats?.completedTrades || 0}</span> <span className="text-slate-500">Completed Trades</span></span>
                <span className="flex items-center gap-1">
                  <span className="font-bold text-slate-950">{stats?.avgRating || '0.0'}</span>
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-slate-500">({totalReviews} reviews)</span>
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 border-t border-slate-100 pt-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Left column: Rating summary + platform verifications */}
            <div className="space-y-6">

              {/* Trader Rating card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950 mb-4">Trader Rating</h2>
                <div className="flex items-end gap-3 mb-4">
                  <span className="text-5xl font-black text-slate-950">{stats?.avgRating || '0.0'}</span>
                  <div className="pb-1">
                    <StarRow value={parseFloat(stats?.avgRating || '0')} />
                    <p className="text-xs text-slate-500 mt-1">Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Histogram */}
                <div className="space-y-1.5 mb-5">
                  <HistogramRow stars={5} count={histogram.five} total={totalHistogram} />
                  <HistogramRow stars={4} count={histogram.four} total={totalHistogram} />
                  <HistogramRow stars={3} count={histogram.three} total={totalHistogram} />
                  <HistogramRow stars={2} count={histogram.two} total={totalHistogram} />
                  <HistogramRow stars={1} count={histogram.one} total={totalHistogram} />
                </div>

                {/* Category breakdown */}
                {totalReviews > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rating Highlights</p>
                    <RatingBar label="Trade Experience" value={parseFloat(stats?.avgTradeExperience || '0')} />
                    <RatingBar label="Item as Described" value={parseFloat(stats?.avgItemCondition || '0')} />
                    <RatingBar label="Communication" value={parseFloat(stats?.avgCommunication || '0')} />
                    <RatingBar label="Shipping Speed" value={parseFloat(stats?.avgShippingSpeed || '0')} />
                  </div>
                )}
              </div>

              {/* Verified Platforms card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950 mb-3">Verified Platforms</h2>
                {connectedPlatforms.length > 0 ? (
                  <div className="space-y-2">
                    {connectedPlatforms.map(p => (
                      <div key={p.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${p.color}`}>
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        {p.label}
                        {p.key === "ebay" && user?.ebayUsername && (
                          <span className="ml-auto text-xs opacity-70">{user.ebayUsername} · {user.ebayFeedbackScore} feedback</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No external platforms verified yet.</p>
                )}
              </div>

            </div>

            {/* Right column: Bio + Recent reviews */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bio card */}
              {bio && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950 mb-3">About {displayName}</h2>
                  <p className="text-slate-700 leading-relaxed text-sm">{bio}</p>
                </div>
              )}
              
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-950">Collector Reviews ({totalReviews})</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {reviews.length > 0 ? (
                    reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#7f31ff] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {(review.reviewerName || review.reviewerUsername || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-slate-950">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Verified Trader</span>
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <StarRow value={Math.round(review.overallRating || 0)} />
                            <p className="mt-1.5 text-sm text-slate-600">
                              {review.review || <span className="italic text-slate-400">No written feedback provided.</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-12 text-center text-slate-400">
                      <Star className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No reviews yet. Be the first to trade with this member!</p>
                    </div>
                  )}
                </div>
                {reviews.length > 5 && (
                  <div className="px-6 py-3 border-t border-slate-100">
                    <button onClick={() => setActiveTab("reviews")} className="text-sm text-blue-600 hover:underline">
                      View all {totalReviews} reviews →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTINGS TAB ── */}
        {activeTab === "listings" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-950">Currently Listed for Trade ({recentListings.length})</h2>
            </div>
            {recentListings.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentListings.map((listing: any) => {
                  const conditionLabel = tradebiliaConditionOptions.find((c: any) => c.value === listing.condition)?.label || listing.condition;
                  const hasGrade = listing.grade && parseFloat(String(listing.grade)) > 0;
                  return (
                    <div key={listing.id} className="flex gap-4 p-4 hover:bg-slate-50 transition-colors">
                      {/* Image */}
                      <Link href={`/listings/${listing.id}`}>
                        <div className="w-24 h-28 flex-shrink-0 bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition">
                          <img
                            src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                            alt={listing.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </Link>
                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <Link href={`/listings/${listing.id}`}>
                          <span className="font-bold text-slate-950 hover:text-blue-600 transition-colors leading-tight block truncate">{listing.title}</span>
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                          <span>
                            <span className="font-semibold">{hasGrade ? 'Grade:' : 'Condition:'}</span>{' '}
                            {hasGrade
                              ? `${listing.certificationCompany ? `${listing.certificationCompany} ` : ''}${formatGrade(listing.grade)}`
                              : conditionLabel}
                          </span>
                          {listing.estimatedValue && (
                            <span>
                              <span className="font-semibold">Value:</span>{' '}
                              ${parseFloat(listing.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        {listing.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed">{listing.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No active listings at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === "reviews" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
              <h2 className="text-base font-semibold text-slate-950 mb-4">Trader Rating</h2>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-5xl font-black text-slate-950">{stats?.avgRating || '0.0'}</span>
                <div className="pb-1">
                  <StarRow value={parseFloat(stats?.avgRating || '0')} />
                  <p className="text-xs text-slate-500 mt-1">Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-1.5 mb-5">
                <HistogramRow stars={5} count={histogram.five} total={totalHistogram} />
                <HistogramRow stars={4} count={histogram.four} total={totalHistogram} />
                <HistogramRow stars={3} count={histogram.three} total={totalHistogram} />
                <HistogramRow stars={2} count={histogram.two} total={totalHistogram} />
                <HistogramRow stars={1} count={histogram.one} total={totalHistogram} />
              </div>
              {totalReviews > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rating Highlights</p>
                  <RatingBar label="Trade Experience" value={parseFloat(stats?.avgTradeExperience || '0')} />
                  <RatingBar label="Item as Described" value={parseFloat(stats?.avgItemCondition || '0')} />
                  <RatingBar label="Communication" value={parseFloat(stats?.avgCommunication || '0')} />
                  <RatingBar label="Shipping Speed" value={parseFloat(stats?.avgShippingSpeed || '0')} />
                </div>
              )}
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 pt-5 pb-3 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-950">All Reviews ({totalReviews})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <div key={review.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#7f31ff] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(review.reviewerName || review.reviewerUsername || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-950">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                              <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Verified Trader</span>
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <StarRow value={Math.round(review.overallRating || 0)} />
                          <p className="mt-1.5 text-sm text-slate-600">
                            {review.review || <span className="italic text-slate-400">No written feedback provided.</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-slate-400">
                    <Star className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No reviews yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === "about" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 max-w-2xl">
            <h2 className="text-base font-semibold text-slate-950 mb-3">About {displayName}</h2>
            {bio ? (
              <p className="text-slate-700 leading-relaxed">{bio}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">This member hasn't added a bio yet.</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

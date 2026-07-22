import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { 
  User, 
  MapPin, 
  Calendar, 
  Star, 
  CheckCircle2, 
  ShieldCheck, 
  Store, 
  ExternalLink, 
  MessageSquare,
  Share2,
  Heart,
  BadgeCheck,
  History,
  ShoppingBag,
  UserPlus,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { tradebiliaConditionOptions, formatGrade } from "@/lib/tradebilia";
import { EbayFeedbackPreview } from "@/components/EbayFeedbackPreview";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { toast } from "sonner";

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_(2019).png' },
  { key: 'paypal', label: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
  { key: 'instagram', label: 'Instagram', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { key: 'twitter', label: 'X / Twitter', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_(white).svg' }
];

const categoryMeta: Record<string, { bg: string; text: string; border: string; label: string }> = {
  comics:       { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100",    label: "Comics" },
  sports_cards: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100",  label: "Sports Cards" },
  vintage_toys: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", label: "Vintage Toys" },
  video_games:  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", label: "Video Games" },
  stamps:       { bg: "bg-slate-50",  text: "text-slate-700",  border: "border-slate-100",  label: "Stamps" },
  coins:        { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100",  label: "Coins" },
  pokemon:      { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-100", label: "Pokemon" },
  movies:       { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100",   label: "Movies" },
  autographs:   { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-100",   label: "Autographs" },
  disney_pins:  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", label: "Disney Pins" },
};

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

function HistogramRow({ stars, count, total }: { stars: number; count: number; total: number }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-bold">
      <span className="w-3 text-slate-400">{stars}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
      </div>
      <span className="w-6 text-right text-slate-400">{count}</span>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#7f31ff] rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
        </div>
        <span className="text-[10px] font-black text-slate-900">{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

function TradesTab({ userId }: { userId: number }) {
  const { data: trades, isLoading } = trpc.market.getUserTrades.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm text-center text-slate-400">
        <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">No completed trades yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-950">Completed Trades ({trades.length})</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {trades.map((trade: any) => (
          <div key={trade.tradeId} className="p-4 flex items-center gap-4">
            {/* Left item */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-16 h-16 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <img
                  src={resolveTradebiliaListingImage({ title: trade.requesterItemTitle, category: trade.requesterItemCategory, primaryPhotoUrl: trade.requesterItemPhoto })}
                  alt={trade.requesterItemTitle}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{trade.requesterItemTitle || 'Item'}</p>
                <p className="text-[10px] text-slate-400">{trade.requesterDisplayName || trade.requesterUsername}</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <span className="text-lg text-slate-300">⇄</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{trade.completedAt ? new Date(trade.completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</span>
            </div>
            {/* Right item */}
            <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse">
              <div className="w-16 h-16 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <img
                  src={resolveTradebiliaListingImage({ title: trade.recipientItemTitle, category: trade.recipientItemCategory, primaryPhotoUrl: trade.recipientItemPhoto })}
                  alt={trade.recipientItemTitle}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-slate-900 truncate">{trade.recipientItemTitle || 'Item'}</p>
                <p className="text-[10px] text-slate-400">{trade.recipientDisplayName || trade.recipientUsername}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  const numericUserId = parseInt(userId || "0", 10);
  const { data: profileData, isLoading } = trpc.market.getUserProfile.useQuery(
    { userId: numericUserId },
    { enabled: numericUserId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <TopBar />
        <CategoryBar />
        <div className="h-40 bg-slate-200 animate-pulse" />
        <div className="mx-auto max-w-5xl px-4 -mt-12 lg:px-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex gap-6 items-start">
              <Skeleton className="h-28 w-28 rounded-3xl shrink-0" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 w-32 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <TopBar />
        <CategoryBar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">User Not Found</h1>
          <p className="text-slate-500 mb-6 text-center">The profile you are looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const { user, profile, stats, reviews, recentListings } = profileData;
  const displayName = profile?.displayName || user.displayName || user.username || "Collector";
  const bio = profile?.bio || "";
  const preferredCategories: string[] = profile?.preferredCategories ? JSON.parse(profile.preferredCategories) : [];
  const totalReviews = reviews.length;
  const histogram = stats.histogram;
  const totalHistogram = (histogram.five || 0) + (histogram.four || 0) + (histogram.three || 0) + (histogram.two || 0) + (histogram.one || 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
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

      <div className="mx-auto max-w-5xl px-4 lg:px-8 relative z-10">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Avatar — falls back to Facebook picture if no Tradebilia avatar */}
            <div className="h-28 w-28 rounded-3xl bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : user.facebookPicture ? (
                <img src={user.facebookPicture} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-slate-300" />
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-slate-950 tracking-tight truncate">{displayName}</h1>
                {user.ebayIdVerified === 1 && <BadgeCheck className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-slate-500 text-sm font-medium">
                {(profile?.location || user.facebookLocation) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile?.location || user.facebookLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
                {user.lastActivityAt && (
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    <span>Active recently</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              {currentUser?.id !== user.id ? (
                <>
                  <Button className="flex-1 md:flex-none rounded-xl bg-[#7f31ff] hover:bg-[#6a29d6] font-bold px-6">
                    <MessageSquare className="mr-2 h-4 w-4" /> Message
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 font-bold px-4">
                    <Heart className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 font-bold px-6" onClick={() => setLocation("/settings")}>
                  Edit Profile
                </Button>
              )}
              <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 font-bold px-4">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div id="profile-tabs" className="mt-6 border-b border-slate-200">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {["overview", "collection", "trades", "reviews"].map(tab => (
              <button
                key={tab}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab);
                  // Keep scroll position at the tab bar, not the top of the page
                  const el = document.getElementById('profile-tabs');
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'instant' });
                  }
                }}
                className={`pb-3 text-sm font-bold capitalize whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-[#7f31ff] text-[#7f31ff]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Left column */}
              <div className="lg:col-span-8 space-y-6">
                {/* Bio & Interests */}
                {(bio || preferredCategories.length > 0) && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    {bio && (
                      <div className={preferredCategories.length > 0 ? "border-b border-slate-50 pb-4" : ""}>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">About {displayName}</h2>
                        <p className="text-slate-600 leading-relaxed text-sm">{bio}</p>
                      </div>
                    )}
                    {preferredCategories.length > 0 && (
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Collecting Interests</h2>
                        <div className="flex flex-wrap gap-2">
                          {preferredCategories.map((cat) => {
                            const meta = categoryMeta[cat];
                            if (!meta) return null;
                            return (
                              <span key={cat} className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trader Rating */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Trader Rating</h2>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl font-black text-slate-950">{stats.avgRating}</span>
                      <div>
                        <StarRow value={parseFloat(stats.avgRating)} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{totalReviews} Collector Reviews</p>
                      </div>
                    </div>
                    <div className="space-y-1 mb-5">
                      <HistogramRow stars={5} count={histogram.five || 0} total={totalHistogram} />
                      <HistogramRow stars={4} count={histogram.four || 0} total={totalHistogram} />
                      <HistogramRow stars={3} count={histogram.three || 0} total={totalHistogram} />
                      <HistogramRow stars={2} count={histogram.two || 0} total={totalHistogram} />
                      <HistogramRow stars={1} count={histogram.one || 0} total={totalHistogram} />
                    </div>
                    {totalReviews > 0 && (
                      <div className="border-t border-slate-50 pt-4 space-y-2">
                        <RatingBar label="Experience" value={parseFloat(stats.avgTradeExperience)} />
                        <RatingBar label="Description" value={parseFloat(stats.avgItemCondition)} />
                        <RatingBar label="Comms" value={parseFloat(stats.avgCommunication)} />
                        <RatingBar label="Shipping" value={parseFloat(stats.avgShippingSpeed)} />
                      </div>
                    )}
                  </div>

                  {/* Recent Feedback */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-50">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Feedback</h2>
                    </div>
                    <div className="flex-1 divide-y divide-slate-50 overflow-hidden">
                      {reviews.length > 0 ? (
                        reviews.slice(0, 3).map((review: any) => (
                          <div key={review.id} className="px-6 py-3.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-900">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                              <span className="text-[9px] font-bold text-slate-400">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </div>
                            <StarRow value={Math.round(review.overallRating || 0)} />
                            <p className="mt-1 text-xs text-slate-600 line-clamp-2 italic">{review.review || "No written feedback."}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-6 py-12 text-center text-slate-400">
                          <p className="text-xs italic">No reviews yet.</p>
                        </div>
                      )}
                    </div>
                    {reviews.length > 3 && (
                      <button onClick={() => setActiveTab("reviews")} className="w-full py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors border-t border-slate-50">
                        View All {totalReviews} Reviews
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Trust Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* eBay Reputation Card */}
                {user?.ebayUsername && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="eBay" className="h-5" />
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black text-green-700 uppercase tracking-tight">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified User
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Username + ID Verified */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 tracking-tight">{user.ebayUsername}</span>
                          {user.ebayIdVerified === 1 && (
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" aria-label="ID Verified" />
                          )}
                        </div>
                        {user.ebayMemberSince && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Since {new Date(user.ebayMemberSince).getFullYear()}</span>
                        )}
                      </div>

                      {/* Score + Percentage */}
                      <div className="flex items-center justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        <div className="text-center flex-1">
                          <p className="text-xl font-black text-slate-950">{user.ebayFeedbackPercentage}%</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Positive</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <div className="text-center flex-1">
                          <p className="text-xl font-black text-slate-950">{user.ebayFeedbackScore}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Score</p>
                        </div>
                      </div>

                      {/* 12-month summary */}
                      <div className="grid grid-cols-3 gap-1">
                        <div className="bg-green-50/50 rounded-lg py-1.5 text-center border border-green-50">
                          <p className="text-xs font-black text-green-600">+{user.ebayPositive12mo || 0}</p>
                          <p className="text-[7px] font-bold text-green-700/50 uppercase">Pos</p>
                        </div>
                        <div className="bg-slate-50/50 rounded-lg py-1.5 text-center border border-slate-100">
                          <p className="text-xs font-black text-slate-400">{user.ebayNeutral12mo || 0}</p>
                          <p className="text-[7px] font-bold text-slate-500/50 uppercase">Neu</p>
                        </div>
                        <div className="bg-red-50/50 rounded-lg py-1.5 text-center border border-red-50">
                          <p className="text-xs font-black text-red-500">-{user.ebayNegative12mo || 0}</p>
                          <p className="text-[7px] font-bold text-red-600/50 uppercase">Neg</p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {user.ebayIsStoreOwner === 1 && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-100 uppercase">
                            <Store className="h-2.5 w-2.5" />
                            Store Owner
                          </div>
                        )}
                        {user.ebaySellerLevel && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-100 uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-600" />
                            {user.ebaySellerLevel.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        )}
                      </div>

                      {/* eBay Feedback Preview */}
                      <div className="pt-3 border-t border-slate-50">
                        <EbayFeedbackPreview userId={String(user.id)} />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-8 rounded-lg text-[10px] font-bold border-slate-200 text-slate-500 hover:bg-slate-50"
                        onClick={() => window.open(`https://www.ebay.com/usr/${user.ebayUsername}`, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Full eBay Profile
                      </Button>
                    </div>
                  </div>
                )}

                {/* Facebook Card — shown only if connected */}
                {user.facebookId && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-[#1877F2]/5 border-b border-[#1877F2]/10 px-5 py-3 flex items-center justify-between">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_(2019).png" alt="Facebook" className="h-5" />
                      <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700 uppercase tracking-tight">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified User
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Name + picture */}
                      <div className="flex items-center gap-3">
                        {user.facebookPicture && (
                          <img src={user.facebookPicture} alt={user.facebookName} className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 tracking-tight truncate">{user.facebookName}</p>
                          {user.facebookEmail && (
                            <p className="text-[10px] text-slate-400 font-medium truncate">{user.facebookEmail}</p>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {user.facebookLocation && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{user.facebookLocation}</span>
                        </div>
                      )}

                      {/* Likes */}
                      {user.facebookLikes && (() => {
                        let likes: Array<{ id: string; name: string }> = [];
                        try { likes = typeof user.facebookLikes === 'string' ? JSON.parse(user.facebookLikes) : user.facebookLikes; } catch {}
                        return likes.length > 0 ? (
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Interests</p>
                            <div className="flex flex-wrap gap-1">
                              {likes.slice(0, 8).map((l) => (
                                <span key={l.id} className="text-[9px] font-bold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 border border-blue-100">{l.name}</span>
                              ))}
                              {likes.length > 8 && (
                                <span className="text-[9px] font-bold bg-slate-50 text-slate-400 rounded-full px-2 py-0.5 border border-slate-100">+{likes.length - 8} more</span>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()}


                    </div>
                  </div>
                )}

                {/* LinkedIn Card — shown only if connected */}
                {user.linkedinId && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="bg-[#0A66C2]/5 border-b border-[#0A66C2]/10 px-5 py-3 flex items-center justify-between">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" className="h-5 object-contain" />
                      <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-700 uppercase tracking-tight">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified Professional
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Picture + Name + Headline */}
                      <div className="flex items-center gap-3">
                        {user.linkedinPicture ? (
                          <img src={user.linkedinPicture} alt={user.linkedinName} className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                            <span className="text-[#0A66C2] font-black text-lg">{user.linkedinName?.charAt(0) ?? 'L'}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-900 tracking-tight truncate">{user.linkedinName}</p>

                        </div>
                      </div>
                      {/* Email */}
                      {user.linkedinEmail && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span className="truncate">{user.linkedinEmail}</span>
                        </div>
                      )}
                      {/* Connected since */}
                      {user.linkedinConnectedAt && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span>Connected {new Date(user.linkedinConnectedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      )}

                    </div>
                  </div>
                )}
                {/* Other Verifications — only shows platforms not yet connected */}
                {(['paypal', 'instagram', 'twitter'] as const).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Other Verifications</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'paypal', label: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
                        { key: 'instagram', label: 'Instagram', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
                        { key: 'twitter', label: 'X / Twitter', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_(white).svg' },
                      ].map(p => (
                        <div key={p.key} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50/30 grayscale opacity-40">
                          <img src={p.logo} alt={p.label} className="h-6 mb-1 object-contain" />
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Pending</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "collection" && (
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
                        <Link href={`/listings/${listing.id}`}>
                          <div className="w-24 h-28 flex-shrink-0 bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition">
                            <img
                              src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                              alt={listing.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </Link>
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

          {activeTab === "trades" && (
            <TradesTab userId={numericUserId} />
          )}

          {activeTab === "reviews" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">All Reviews ({totalReviews})</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <div key={review.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                        <span className="text-xs font-bold text-slate-400">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <StarRow value={Math.round(review.overallRating || 0)} />
                      <p className="mt-2 text-sm text-slate-600 italic">{review.review || "No written feedback."}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-16 text-center text-slate-400">
                    <p className="text-sm italic">No reviews yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

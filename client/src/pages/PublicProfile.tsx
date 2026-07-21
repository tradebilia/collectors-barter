import React, { useState, useEffect } from "react";
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
  CalendarDays,
  Mail,
  MessageSquare,
  Share2,
  Heart,
  Flag,
  ArrowRight,
  BadgeCheck,
  TrendingUp,
  History,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/useAuth";
import { EbayFeedbackPreview } from "@/components/EbayFeedbackPreview";

const PLATFORMS = [
  { key: 'ebay', label: 'eBay', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg' },
  { key: 'facebook', label: 'Facebook', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_(2019).png' },
  { key: 'paypal', label: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
  { key: 'instagram', label: 'Instagram', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { key: 'twitter', label: 'X / Twitter', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_(white).svg' }
];

const categoryMeta: Record<string, any> = {
  "Trading Cards": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", label: "Trading Cards" },
  "Comic Books": { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", label: "Comic Books" },
  "Video Games": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", label: "Video Games" },
  "Sports Memorabilia": { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", label: "Sports Mem" },
  "Toys & Action Figures": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", label: "Toys" },
  "Coins & Currency": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", label: "Coins" },
  "Stamps": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-100", label: "Stamps" },
  "Antiques": { bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-100", label: "Antiques" },
};

const StarRow = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star 
        key={s} 
        className={`h-3 w-3 ${s <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} 
      />
    ))}
  </div>
);

const HistogramRow = ({ stars, count, total }: { stars: number, count: number, total: number }) => (
  <div className="flex items-center gap-3 text-[10px] font-bold">
    <span className="w-3 text-slate-400">{stars}</span>
    <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
      <div 
        className="h-full bg-amber-400 rounded-full" 
        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
      />
    </div>
    <span className="w-6 text-right text-slate-400">{count}</span>
  </div>
);

const RatingBar = ({ label, value }: { label: string, value: number }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-20 h-1 bg-slate-50 rounded-full overflow-hidden">
        <div className="h-full bg-[#7f31ff] rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-[10px] font-black text-slate-900">{value.toFixed(1)}</span>
    </div>
  </div>
);

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = trpc.getUserProfile.useQuery({ userId: userId || "" });
  const { data: stats } = trpc.getUserStats.useQuery({ userId: userId || "" });
  const { data: reviewsData } = trpc.getUserReviews.useQuery({ userId: userId || "" });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-12">
        <div className="h-48 bg-slate-200 animate-pulse" />
        <div className="mx-auto max-w-5xl px-4 -mt-16 lg:px-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Skeleton className="h-32 w-32 rounded-3xl shrink-0" />
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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">User Not Found</h1>
        <p className="text-slate-500 mb-6 text-center">The profile you are looking for doesn't exist or has been removed.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  const reviews = reviewsData || [];
  const totalReviews = reviews.length;
  const bio = user.bio || "";
  const preferredCategories = user.preferredCategories || [];
  const displayName = user.name || user.username || "Collector";
  
  const histogram = {
    five: reviews.filter(r => Math.round(r.overallRating) === 5).length,
    four: reviews.filter(r => Math.round(r.overallRating) === 4).length,
    three: reviews.filter(r => Math.round(r.overallRating) === 3).length,
    two: reviews.filter(r => Math.round(r.overallRating) === 2).length,
    one: reviews.filter(r => Math.round(r.overallRating) === 1).length,
  };
  const totalHistogram = Object.values(histogram).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header / Banner Area */}
      <div className="h-40 bg-gradient-to-r from-[#7f31ff] to-[#9d5cff] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      </div>

      {/* Profile Header Card */}
      <div className="mx-auto max-w-5xl px-4 -mt-12 lg:px-8 relative z-10">
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Avatar */}
            <div className="h-28 w-28 rounded-3xl bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {user.image ? (
                <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-slate-300" />
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-slate-950 tracking-tight truncate">{displayName}</h1>
                {user.emailVerified && <BadgeCheck className="h-5 w-5 text-blue-500" fill="currentColor" />}
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{user.location || "United States"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>Last active 2h ago</span>
                </div>
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
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-8 border-b border-slate-200 w-full justify-start rounded-none overflow-x-auto no-scrollbar">
              <TabsTrigger value="overview" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7f31ff] data-[state=active]:text-[#7f31ff] rounded-none px-0 py-3 text-sm font-bold text-slate-400 transition-all">
                Overview
              </TabsTrigger>
              <TabsTrigger value="collection" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7f31ff] data-[state=active]:text-[#7f31ff] rounded-none px-0 py-3 text-sm font-bold text-slate-400 transition-all">
                Collection
              </TabsTrigger>
              <TabsTrigger value="trades" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7f31ff] data-[state=active]:text-[#7f31ff] rounded-none px-0 py-3 text-sm font-bold text-slate-400 transition-all">
                Trades
              </TabsTrigger>
              <TabsTrigger value="reviews" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7f31ff] data-[state=active]:text-[#7f31ff] rounded-none px-0 py-3 text-sm font-bold text-slate-400 transition-all">
                Reviews
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">

              {/* Left column: Main Content (Bio, Reviews, Stats) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Bio & Interests Combined Card */}
                {(bio || preferredCategories.length > 0) && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    {bio && (
                      <div className="border-b border-slate-50 pb-4">
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
                  {/* Trader Rating card - More compact */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Trader Rating</h2>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl font-black text-slate-950">{stats?.avgRating || '0.0'}</span>
                      <div>
                        <StarRow value={parseFloat(stats?.avgRating || '0')} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{totalReviews} Collector Reviews</p>
                      </div>
                    </div>

                    {/* Histogram - Compact */}
                    <div className="space-y-1 mb-5">
                      <HistogramRow stars={5} count={histogram.five} total={totalHistogram} />
                      <HistogramRow stars={4} count={histogram.four} total={totalHistogram} />
                      <HistogramRow stars={3} count={histogram.three} total={totalHistogram} />
                      <HistogramRow stars={2} count={histogram.two} total={totalHistogram} />
                      <HistogramRow stars={1} count={histogram.one} total={totalHistogram} />
                    </div>

                    {/* Category breakdown - More compact */}
                    {totalReviews > 0 && (
                      <div className="border-t border-slate-50 pt-4 space-y-2">
                        <RatingBar label="Experience" value={parseFloat(stats?.avgTradeExperience || '0')} />
                        <RatingBar label="Description" value={parseFloat(stats?.avgItemCondition || '0')} />
                        <RatingBar label="Comms" value={parseFloat(stats?.avgCommunication || '0')} />
                        <RatingBar label="Shipping" value={parseFloat(stats?.avgShippingSpeed || '0')} />
                      </div>
                    )}
                  </div>

                  {/* Collector Reviews - Show 3 for overview */}
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
                            <p className="mt-1 text-xs text-slate-600 line-clamp-2 italic">
                              {review.review || "No written feedback."}
                            </p>
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

              {/* Right column: eBay Reputation + Verifications (Trust Sidebar) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Verified eBay Reputation Card - Ultra Compact */}
                {user?.ebayUsername && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg" alt="eBay" className="h-5" />
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black text-green-700 uppercase tracking-tight">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified User
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 tracking-tight">{user.ebayUsername}</span>
                          {user.ebayIdVerified === 1 && (
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" title="ID Verified" />
                          )}
                        </div>
                        {user.ebayMemberSince && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Since {new Date(user.ebayMemberSince).getFullYear()}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-50">
                        <div className="text-center flex-1">
                          <p className="text-xl font-black text-slate-950">{user.ebayFeedbackPercentage}%</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Positive</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-xl font-black text-slate-950">{user.ebayFeedbackScore}</p>
                            {user.ebayStar && (
                              <Star className="h-3.5 w-3.5" style={{ color: user.ebayStar.toLowerCase().replace('shooting', '') }} fill="currentColor" />
                            )}
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Score</p>
                        </div>
                      </div>

                      {/* Feedback Summary (12mo) - Compact Grid */}
                      <div className="grid grid-cols-3 gap-1">
                        <div className="bg-green-50/30 rounded-lg py-1.5 text-center border border-green-50">
                          <p className="text-xs font-black text-green-600">+{user.ebayPositive12mo || 0}</p>
                          <p className="text-[7px] font-bold text-green-700/50 uppercase">Pos</p>
                        </div>
                        <div className="bg-slate-50/30 rounded-lg py-1.5 text-center border border-slate-50">
                          <p className="text-xs font-black text-slate-400">{user.ebayNeutral12mo || 0}</p>
                          <p className="text-[7px] font-bold text-slate-500/50 uppercase">Neu</p>
                        </div>
                        <div className="bg-red-50/30 rounded-lg py-1.5 text-center border border-red-50">
                          <p className="text-xs font-black text-red-500">-{user.ebayNegative12mo || 0}</p>
                          <p className="text-[7px] font-bold text-red-600/50 uppercase">Neg</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {user.ebayIsStoreOwner && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-100 uppercase">
                            <Store className="h-2.5 w-2.5" />
                            Store
                          </div>
                        )}
                        {user.ebaySellerLevel && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-100 uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-600" />
                            {user.ebaySellerLevel.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        )}
                      </div>

                      {/* Mini Feedback Preview - More compact */}
                      <div className="pt-3 border-t border-slate-50">
                        <EbayFeedbackPreview userId={user.id} />
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

                {/* Other Verifications Card - Compact */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Other Verifications</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {PLATFORMS.filter(p => p.key !== 'ebay').map(p => (
                      <div key={p.key} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-50 bg-slate-50/30 grayscale opacity-40">
                        <img src={p.logo} alt={p.label} className="h-6 mb-1 object-contain" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Pending</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

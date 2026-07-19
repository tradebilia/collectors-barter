import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getAvatarInitials } from "@/lib/tradebilia";
import { Heart, MessageSquare, Share2, Star, Loader2 } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia-logo_c676d640.svg";



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
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img
              src="/images/heros/Profile.svg"
              alt="Profile"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Profile Header */}
          <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <Avatar className="h-24 w-24 border-4 border-slate-200">
                  <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                  <AvatarFallback className="bg-[#7f31ff] text-2xl font-semibold text-white">
                    {getAvatarInitials({ firstName: (profile as any).firstName, lastName: (profile as any).lastName, displayName: profile.displayName })}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-semibold text-slate-950">{profile.displayName}</h1>
                  {userProfileQuery.data?.user?.createdAt && (
                    <p className="mt-1 text-sm text-slate-500">
                      Member since {new Date(userProfileQuery.data.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge className="bg-green-100 text-green-800">Active Member</Badge>
                    <Badge className="bg-blue-100 text-blue-800">Verified</Badge>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
                    <Button className="rounded-lg bg-blue-600 hover:bg-blue-700">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="rounded-lg">
                      <Heart className="mr-2 h-4 w-4" />
                      Add to Favorites
                    </Button>
                    <Button variant="outline" className="rounded-lg">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          {profile.bio && (
            <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats Section */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{(userProfileQuery.data as any)?.stats?.itemsListed || 0}</p>
                  <p className="mt-2 text-sm text-slate-600">Items Listed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{(userProfileQuery.data as any)?.stats?.completedTrades || 0}</p>
                  <p className="mt-2 text-sm text-slate-600">Completed Trades</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-3xl font-bold text-yellow-500">{(userProfileQuery.data as any)?.stats?.avgRating || '0.0'}</span>
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Average Rating</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ratings and Reviews */}
          <Card className="rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>What other collectors say about trading with this member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {((userProfileQuery.data as any)?.reviews || []).length > 0 ? (
                ((userProfileQuery.data as any)?.reviews || []).map((review: any) => (
                  <div key={review.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-950">{review.reviewerName || review.reviewerUsername || 'Collector'}</span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <Star
                                key={j}
                                className={`h-4 w-4 ${
                                  j < Math.round(review.overallRating || 0) ? "fill-yellow-500 text-yellow-500" : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {review.review || "No written feedback provided."}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No feedback available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

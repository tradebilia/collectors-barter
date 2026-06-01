import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Coins, Gift, Mail, Search, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo.svg";

const categoryLinks = [
  ["Comics", "comics"],
  ["Sports Cards", "sports-cards"],
  ["Vintage Toys", "vintage-toys"],
  ["Video Games", "video-games"],
  ["Stamps", "stamps"],
  ["Coins", "coins"],
  ["Pokemon", "pokemon"],
  ["Movies", "movies"],
  ["Autographs", "autographs"],
  ["Disney Pins", "disney-pins"],
] as const;

function firstName(name?: string | null) {
  return name?.split(" ").filter(Boolean)[0] || "Collector";
}

export default function ReferralRequest() {
  const { user, isAuthenticated, loading } = useAuth();
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [collectorFocus, setCollectorFocus] = useState("");
  const [message, setMessage] = useState("I think you would fit right in on Tradebilia. Join me to trade rare collectibles with a collector-first community.");

  const referrer = useMemo(() => user?.name || user?.email || "Tradebilia member", [user?.email, user?.name]);

  const referralMutation = trpc.market.referralRequest.useMutation({
    onSuccess: result => {
      if (result.success) {
        toast.success(result.message);
        setFriendName("");
        setFriendEmail("");
        setCollectorFocus("");
      } else {
        toast.error(result.message);
      }
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const submitReferral = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.info("Please sign in before sending a referral request.");
      return;
    }

    referralMutation.mutate({
      friendName,
      friendEmail,
      collectorFocus,
      message,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,132,255,0.16),transparent_28%),linear-gradient(180deg,#050814_0%,#0b1220_35%,#101827_100%)] text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Link href="/" className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            Home
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-['Oswald'] text-[2.15rem] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[2.45rem]">Search</span>
            <div className="relative hidden min-w-[260px] sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input className="h-9 rounded-sm border-0 bg-white pl-10 pr-3 text-sm text-slate-950" placeholder="Search..." />
            </div>
          </div>
          <TopRightIcons className="ml-auto flex items-center gap-3 md:gap-4" iconColor="text-white/85" />
        </div>
        <nav className="grid grid-cols-2 border-t border-white/10 bg-white text-center text-[11px] font-semibold text-black sm:grid-cols-5 lg:grid-cols-10">
          {categoryLinks.map(([label, slug]) => (
            <Link key={slug} href={`/category/${slug}`} className="border-r border-black/10 px-2 py-3 transition hover:bg-black hover:text-white last:border-r-0">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="border-b border-white/10 bg-[linear-gradient(90deg,#0d0d57_0%,#12124f_50%,#0d0d57_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-8 sm:py-10">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="block h-[150px] w-auto object-contain sm:h-[180px] lg:h-[205px]" />
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="rounded-[1.75rem] border-white/10 bg-white/5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur">
              <CardHeader className="pb-4">
                <Badge className="w-fit rounded-full bg-white/10 px-3 py-1 text-white/80 hover:bg-white/10">Community growth</Badge>
                <CardTitle className="mt-3 text-2xl">Referral Request</CardTitle>
                <CardDescription className="text-white/65">
                  Invite trusted collectors into the same high-trust trade ecosystem with a referral flow that feels native to Tradebilia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-white/72">
                <p>
                  The strongest communities grow through personal introductions. Use this page to nominate collectors who already share your standards for communication, authenticity, and fair trading.
                </p>
                <Separator className="bg-white/10" />
                <div className="space-y-3">
                  {[
                    [Users, "Trusted collectors", "Invite people you would comfortably trade with yourself."],
                    [Gift, "Shared interests", "Note what they collect so onboarding feels relevant from day one."],
                    [Coins, "Quality over volume", "A smaller network of reliable members strengthens the exchange."],
                  ].map(([Icon, title, body]) => {
                    const FeatureIcon = Icon as typeof Users;
                    return (
                      <div key={title as string} className="rounded-[1.1rem] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-3">
                          <FeatureIcon className="h-5 w-5 text-indigo-200" />
                          <p className="font-semibold text-white">{title as string}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/68">{body as string}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-indigo-300/20 bg-indigo-400/10 text-white shadow-none">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-3 text-indigo-100">
                  <Sparkles className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.24em]">Invite summary</p>
                </div>
                <p className="text-sm leading-7 text-white/75">
                  Referrals work best when they already know what categories they collect and why they would add value to your trade network.
                </p>
                {!isAuthenticated && !loading ? (
                  <Button className="w-full rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => (window.location.href = getLoginUrl())}>
                    Sign In to Send Referral
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>

          <Card className="rounded-[2rem] border-white/10 bg-slate-950/65 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl sm:text-4xl">Refer a collector with context</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-white/65">
                Submit a real referral request for owner review while keeping the same polished Tradebilia visual language used across the rest of the member experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={submitReferral}>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.26em] text-white/55">Referring member</p>
                  <p className="mt-2 text-xl font-semibold text-white">{referrer}</p>
                  <p className="mt-1 text-sm text-white/65">Invite someone who fits Tradebilia’s collector-first culture and trading standards.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="friend-name" className="text-white/80">Collector name</Label>
                    <Input id="friend-name" value={friendName} onChange={event => setFriendName(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="Friend or collector alias" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="friend-email" className="text-white/80">Collector email</Label>
                    <Input id="friend-email" type="email" value={friendEmail} onChange={event => setFriendEmail(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="collector@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collector-focus" className="text-white/80">What do they collect?</Label>
                  <Input id="collector-focus" value={collectorFocus} onChange={event => setCollectorFocus(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="Example: vintage toys, autographs, graded cards" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-message" className="text-white/80">Personal invite message</Label>
                  <Textarea id="invite-message" value={message} onChange={event => setMessage(event.target.value)} className="min-h-[180px] rounded-[1.25rem] border-white/10 bg-white/5 text-white" placeholder="Explain why they are a strong fit for the community." />
                </div>

                <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-5 sm:grid-cols-3">
                  {[
                    ["Community fit", "Collectors who understand condition, provenance, and communication etiquette."],
                    ["Trust signal", "A direct referral carries more context than a cold signup."],
                    ["Review-ready", "Referral requests now reach a real owner-review workflow instead of stopping at a front-end-only shell."],
                  ].map(([title, body]) => (
                    <div key={title as string}>
                      <p className="text-sm font-semibold text-white">{title as string}</p>
                      <p className="mt-2 text-sm leading-6 text-white/65">{body as string}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="rounded-full bg-white text-slate-950 hover:bg-white/90" disabled={referralMutation.isPending}>
                    <Send className="mr-2 h-4 w-4" />
                    {referralMutation.isPending ? "Sending referral..." : "Send referral request"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => toast.info(`${firstName(referrer)} can customize incentive rules later.`)}>
                    Preview referral program
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

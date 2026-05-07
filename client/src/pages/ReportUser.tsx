import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Bell, Flag, Mail, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

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

const concernTypes = [
  "Counterfeit or inaccurate item description",
  "Harassment or abusive conduct",
  "Spam, solicitation, or scam activity",
  "Unsafe trade behavior",
  "Unauthorized contact information sharing",
  "Other community concern",
] as const;

function initials(name?: string | null) {
  return name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "TB";
}

export default function ReportUser() {
  const { user, isAuthenticated, loading } = useAuth();
  const [reportedMember, setReportedMember] = useState("");
  const [listingReference, setListingReference] = useState("");
  const [concernType, setConcernType] = useState<(typeof concernTypes)[number] | "">("");
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [supportingNotes, setSupportingNotes] = useState("");

  const memberName = useMemo(() => user?.name || user?.email || "Subscriber", [user?.email, user?.name]);

  const reportMutation = trpc.market.reportUser.useMutation({
    onSuccess: result => {
      if (result.success) {
        toast.success(result.message);
        setReportedMember("");
        setListingReference("");
        setConcernType("");
        setDetails("");
        setSupportingNotes("");
      } else {
        toast.error(result.message);
      }
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.info("Please sign in before filing a community report.");
      return;
    }

    if (!concernType) {
      toast.error("Please choose a concern type before submitting your report.");
      return;
    }

    reportMutation.mutate({
      reportedMember,
      listingReference,
      concernType,
      contactEmail,
      details,
      supportingNotes,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,125,255,0.14),transparent_30%),linear-gradient(180deg,#050814_0%,#0b1220_32%,#111827_100%)] text-white">
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
          <div className="ml-auto flex items-center gap-4 text-[11px] uppercase tracking-[0.32em] text-white/85">
            <Link href="/profile" className="transition hover:text-white">My Tradebilia</Link>
            <Bell className="h-4 w-4" />
            <ShieldCheck className="h-4 w-4" />
            <Mail className="h-4 w-4" />
          </div>
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
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="rounded-[1.75rem] border-white/10 bg-white/5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Flag className="h-6 w-6 text-amber-300" />
                  Report a User
                </CardTitle>
                <CardDescription className="text-white/65">
                  File a clear, documented concern when a member interaction falls outside Tradebilia community standards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
                  <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={undefined} alt={memberName} />
                    <AvatarFallback className="bg-white/10 text-white">{initials(memberName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{memberName}</p>
                    <p className="text-xs text-white/60">Signed-in reporter</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm leading-6 text-white/70">
                  <p>Use this form for counterfeit items, harassment, repeated no-shows, safety issues, or suspicious off-platform conduct.</p>
                  <p>The more precise your listing IDs, usernames, and evidence notes are, the easier it is to review the case quickly.</p>
                </div>
                <Separator className="bg-white/10" />
                <div className="space-y-3">
                  {[
                    "Member identity or Tradebilia ID",
                    "Listing ID or trade reference if applicable",
                    "What happened and when",
                    "Any steps already taken with the other member",
                  ].map(item => (
                    <div key={item} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">{item}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-amber-400/20 bg-amber-500/10 text-white shadow-none">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-3 text-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.24em]">Trust & Safety</p>
                </div>
                <p className="text-sm leading-7 text-white/75">
                  Immediate threats, payment fraud, or requests for unsafe off-platform contact should be documented here and paused until reviewed.
                </p>
                {!isAuthenticated && !loading ? (
                  <Button className="w-full rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => (window.location.href = getLoginUrl())}>
                    Sign In to File Report
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>

          <Card className="rounded-[2rem] border-white/10 bg-slate-950/65 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
            <CardHeader className="pb-4">
              <Badge className="w-fit rounded-full bg-white/10 px-3 py-1 text-white/80 hover:bg-white/10">Community moderation form</Badge>
              <CardTitle className="mt-3 text-3xl sm:text-4xl">Document the concern clearly</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-white/65">
                Submit a real moderation request for suspicious or harmful behavior while staying inside the same Tradebilia visual language used across the rest of the site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={submitReport}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reported-member" className="text-white/80">Reported member</Label>
                    <Input id="reported-member" value={reportedMember} onChange={event => setReportedMember(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="Member name, email, or Tradebilia ID" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listing-reference" className="text-white/80">Listing or trade reference</Label>
                    <Input id="listing-reference" value={listingReference} onChange={event => setListingReference(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="Optional listing ID, proposal ID, or URL" />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-2">
                    <Label className="text-white/80">Concern type</Label>
                    <Select value={concernType} onValueChange={value => setConcernType(value as (typeof concernTypes)[number])}>
                      <SelectTrigger className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white">
                        <SelectValue placeholder="Choose the issue category" />
                      </SelectTrigger>
                      <SelectContent>
                        {concernTypes.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-white/80">Contact email</Label>
                    <Input id="contact-email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details" className="text-white/80">What happened?</Label>
                  <Textarea id="details" value={details} onChange={event => setDetails(event.target.value)} className="min-h-[180px] rounded-[1.25rem] border-white/10 bg-white/5 text-white" placeholder="Describe the interaction, timeline, and why it violates expectations on Tradebilia." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supporting-notes" className="text-white/80">Evidence notes</Label>
                  <Textarea id="supporting-notes" value={supportingNotes} onChange={event => setSupportingNotes(event.target.value)} className="min-h-[120px] rounded-[1.25rem] border-white/10 bg-white/5 text-white" placeholder="Reference screenshots, message excerpts, tracking details, or condition discrepancies." />
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/70">
                  Submitted reports now route into a real owner-review notification so moderation concerns can be acted on instead of remaining a visual-only placeholder.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="rounded-full bg-white text-slate-950 hover:bg-white/90" disabled={reportMutation.isPending}>
                    {reportMutation.isPending ? "Submitting report..." : "Submit report"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => toast.info("Draft saving can be added next.")}>Save as draft</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

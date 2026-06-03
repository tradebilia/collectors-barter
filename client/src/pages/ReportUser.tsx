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
import { AlertTriangle, Bell, Flag, Mail, Search, ShieldCheck, Upload, X } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const TRADEBILIA_LOGO_URL = "/images/ReportaUser_001357ab.svg";

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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const memberName = useMemo(() => user?.name || user?.email || "Subscriber", [user?.email, user?.name]);

  const reportMutation = trpc.market.submitReport.useMutation({
    onSuccess: result => {
      toast.success(`Report submitted successfully! Report ID: ${result.reportId}`);
      setReportedMember("");
      setListingReference("");
      setConcernType("");
      setDetails("");
      setSupportingNotes("");
      setUploadedFiles([]);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.info("Please sign in before filing a community report.");
      return;
    }

    if (!reportedMember) {
      toast.error("Please enter the username of the member you're reporting.");
      return;
    }

    if (!concernType) {
      toast.error("Please choose a concern type before submitting your report.");
      return;
    }

    if (!details || details.length < 10) {
      toast.error("Please provide at least 10 characters describing what happened.");
      return;
    }

    // TODO: Look up user ID from reportedMember username
    // For now, we'll use a placeholder - this should be replaced with actual user lookup
    reportMutation.mutate({
      reportedUserId: 1,
      reason: concernType,
      description: details,
      evidence: supportingNotes || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,125,255,0.14),transparent_30%),linear-gradient(180deg,#050814_0%,#0b1220_32%,#111827_100%)] text-white">
      <TopBar />

      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white border-b border-white/10">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url(/manus-storage/Sportscardwallpaper_a86b605b.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img
              src={TRADEBILIA_LOGO_URL}
              alt="Tradebilia"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="container py-8">
        <div className="mx-auto max-w-3xl">
          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-white">
                <Flag className="h-5 w-5 text-red-400" />
                Report a Member
              </CardTitle>
              <CardDescription className="text-white/60">
                Help us maintain a safe community by reporting concerning behavior or violations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form onSubmit={submitReport} className="space-y-6">
                <div className="rounded-[1.5rem] border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div>
                      <p className="font-medium">Your report is confidential</p>
                      <p className="text-xs text-blue-200/70">Reports are reviewed by our moderation team and handled with care.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reported-member" className="text-white/80">Member username</Label>
                    <Input id="reported-member" value={reportedMember} onChange={event => setReportedMember(event.target.value)} className="h-12 rounded-[1rem] border-white/10 bg-white/5 text-white" placeholder="Username of member to report" />
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

                <div className="space-y-3">
                  <Label className="text-white/80">Upload evidence files or images</Label>
                  <div className="rounded-[1.25rem] border-2 border-dashed border-white/20 bg-white/5 p-6 text-center hover:border-white/40 hover:bg-white/10 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-white/60" />
                        <div className="text-sm">
                          <span className="font-medium text-white">Click to upload</span>
                          <span className="text-white/60"> or drag and drop</span>
                        </div>
                        <p className="text-xs text-white/50">PNG, JPG, PDF, DOC up to 10MB</p>
                      </div>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-white/80">Uploaded files ({uploadedFiles.length}):</p>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between rounded-lg bg-white/10 p-3">
                            <span className="text-sm text-white truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/70">
                  Submitted reports are reviewed by the Tradebilia moderation team and will be assigned a Report ID for tracking purposes.
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

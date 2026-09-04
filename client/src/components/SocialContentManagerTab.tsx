import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  Megaphone,
  Plus,
  Youtube,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  approveSocialDraft,
  createPromotionSocialDraft,
  createSocialDraft,
  filterSocialDrafts,
  requestSocialReview,
  SOCIAL_DRAFT_STATUSES,
  SOCIAL_PLATFORMS,
  toggleSocialPlatform,
  type DraftStatus,
  type SocialDraft,
  type SocialDraftSource,
  type SocialPlatform,
} from "@/lib/socialContentManager";

const STORAGE_KEY = "tradebilia-admin-social-drafts-v1";
const PREFERENCES_KEY = "tradebilia-admin-social-preferences-v1";
const platforms = SOCIAL_PLATFORMS;
const statuses = SOCIAL_DRAFT_STATUSES;

const platformStyles: Record<SocialPlatform, string> = {
  Facebook: "border-blue-200 bg-blue-50 text-blue-700",
  Instagram: "border-pink-200 bg-pink-50 text-pink-700",
  X: "border-slate-300 bg-slate-50 text-slate-800",
  LinkedIn: "border-sky-200 bg-sky-50 text-sky-700",
  YouTube: "border-red-200 bg-red-50 text-red-700",
};

const statusStyles: Record<DraftStatus, string> = {
  Draft: "border-slate-200 bg-slate-100 text-slate-700",
  "Needs Review": "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Scheduled: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Published: "border-violet-200 bg-violet-50 text-violet-700",
};

const sourceStyles: Record<SocialDraftSource, string> = {
  Original: "border-slate-200 bg-slate-100 text-slate-700",
  "High-Value Listing": "border-amber-200 bg-amber-50 text-amber-800",
  "Completed Trade": "border-violet-200 bg-violet-50 text-violet-800",
};

const starterDraft: SocialDraft = {
  ...createSocialDraft("draft-1"),
  title: "Welcome to Tradebilia",
  copy: "A new way for collectors to trade remarkable items across categories. Follow along as we build the collector-to-collector exchange.",
  platforms: ["Facebook", "Instagram", "X"],
};

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function makeDraft(title = "Untitled social post"): SocialDraft {
  return { ...createSocialDraft(`draft-${Date.now()}`), title };
}

function normalizeDraft(draft: Partial<SocialDraft> & { id: string }): SocialDraft {
  const fallback = createSocialDraft(draft.id, draft.updatedAt);
  return {
    ...fallback,
    ...draft,
    source: draft.source ?? "Original",
    sourceSummary: draft.sourceSummary ?? "Original Tradebilia-created content",
  };
}

function formatWholeDollar(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function formatOpportunityDate(value: string | number | Date | null | undefined) {
  if (!value) return "Recent";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Recent" : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const SOCIAL_MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"] as const;

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = result.indexOf(",");
      if (commaIndex < 0) return reject(new Error("The selected file has an unsupported format."));
      resolve(result.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });
}

function platformIcon(platform: SocialPlatform) {
  if (platform === "Instagram") return <Instagram className="h-3.5 w-3.5" />;
  if (platform === "LinkedIn") return <Linkedin className="h-3.5 w-3.5" />;
  if (platform === "YouTube") return <Youtube className="h-3.5 w-3.5" />;
  if (platform === "X") return <X className="h-3.5 w-3.5" />;
  return <span className="text-[11px] font-bold">f</span>;
}

export function SocialContentManagerTab() {
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | DraftStatus>("All");
  const [autoListEnabled, setAutoListEnabled] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const promotionQuery = trpc.admin.getPromotionOpportunities.useQuery({ listingValueMinimum: 1000, recentDays: 30, limit: 8 }, { enabled: autoListEnabled === true });
  const uploadSocialMedia = trpc.admin.uploadSocialContentMedia.useMutation();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      const initial = (Array.isArray(parsed) ? parsed : [starterDraft]).map(normalizeDraft);
      const savedPreferences = window.localStorage.getItem(PREFERENCES_KEY);
      const parsedPreferences = savedPreferences ? JSON.parse(savedPreferences) : null;
      setDrafts(initial);
      setSelectedId(initial[0]?.id ?? null);
      setAutoListEnabled(typeof parsedPreferences?.autoListEnabled === "boolean" ? parsedPreferences.autoListEnabled : true);
    } catch {
      setDrafts([starterDraft]);
      setSelectedId(starterDraft.id);
      setAutoListEnabled(true);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts, hydrated]);

  useEffect(() => {
    if (hydrated && autoListEnabled !== null) window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ autoListEnabled }));
  }, [autoListEnabled, hydrated]);

  const selectedDraft = drafts.find((draft) => draft.id === selectedId) ?? null;
  const filteredDrafts = useMemo(() => filterSocialDrafts(drafts, statusFilter), [drafts, statusFilter]);
  const counts = useMemo(() => ({
    total: drafts.length,
    needsReview: drafts.filter((draft) => draft.status === "Needs Review").length,
    approved: drafts.filter((draft) => draft.status === "Approved").length,
    scheduled: drafts.filter((draft) => draft.status === "Scheduled").length,
  }), [drafts]);
  const highValueListings = autoListEnabled ? promotionQuery.data?.highValueListings ?? [] : [];
  const completedTrades = autoListEnabled ? promotionQuery.data?.completedTrades ?? [] : [];

  function updateDraft(patch: Partial<SocialDraft>) {
    if (!selectedDraft) return;
    setDrafts((current) => current.map((draft) => draft.id === selectedDraft.id
      ? { ...draft, ...patch, updatedAt: new Date().toISOString() }
      : draft));
  }

  function addDraft() {
    const draft = makeDraft();
    setDrafts((current) => [draft, ...current]);
    setSelectedId(draft.id);
    toast.success("New social post draft created");
  }

  function createListingPromotionDraft(listing: any) {
    const grading = listing.customGradingCompany || listing.certificationCompany;
    const detail = grading && listing.grade ? ` · ${grading} ${listing.grade}` : listing.condition ? ` · ${listing.condition}` : "";
    const draft = createPromotionSocialDraft(`draft-${Date.now()}`, {
      source: "High-Value Listing",
      sourceSummary: `New public listing · ${formatOpportunityDate(listing.createdAt)}`,
      title: `New high-value listing: ${listing.title}`,
      copy: `New to Tradebilia: ${listing.title}${detail}. Now listed at ${formatWholeDollar(listing.estimatedValue)}. Explore collector-to-collector trading at Tradebilia.`,
      mediaUrl: listing.imageUrl,
    });
    setDrafts((current) => [draft, ...current]);
    setSelectedId(draft.id);
    toast.success("High-value listing draft added to the Content Library");
  }

  function createCompletedTradeDraft(trade: any) {
    const itemCount = Math.max(1, Number(trade.itemCount ?? 1));
    const itemWord = itemCount === 1 ? "item" : "items";
    const draft = createPromotionSocialDraft(`draft-${Date.now()}`, {
      source: "Completed Trade",
      sourceSummary: `Completed public exchange · ${formatOpportunityDate(trade.completedAt)}`,
      title: `Recent completed trade: ${trade.title}`,
      copy: `A recent Tradebilia collector exchange has been completed. ${itemCount} ${itemWord} were exchanged, including ${trade.title}. Discover more collector-to-collector trades on Tradebilia.`,
      mediaUrl: trade.imageUrl,
    });
    setDrafts((current) => [draft, ...current]);
    setSelectedId(draft.id);
    toast.success("Completed trade draft added to the Content Library");
  }

  function duplicateDraft() {
    if (!selectedDraft) return;
    const copy = { ...selectedDraft, id: `draft-${Date.now()}`, title: `${selectedDraft.title} — copy`, status: "Draft" as DraftStatus, updatedAt: new Date().toISOString() };
    setDrafts((current) => [copy, ...current]);
    setSelectedId(copy.id);
    toast.success("Draft duplicated");
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Draft removed from this browser");
  }

  function requestReview() {
    if (!selectedDraft) return;
    if (!selectedDraft.copy.trim()) {
      toast.error("Add post copy before requesting review");
      return;
    }
    const reviewed = requestSocialReview(selectedDraft);
    if (!reviewed) return;
    updateDraft({ status: reviewed.status });
    toast.success("Draft moved to Needs Review");
  }

  function approveDraft() {
    if (!selectedDraft) return;
    const approved = approveSocialDraft(selectedDraft);
    updateDraft({ status: approved.status });
    toast.success("Draft approved for manual publishing");
  }

  function togglePlatform(platform: SocialPlatform) {
    if (!selectedDraft) return;
    const next = toggleSocialPlatform(selectedDraft, platform);
    updateDraft({ platforms: next.platforms });
  }

  async function uploadOriginalMedia(file: File) {
    if (!selectedDraft) return;
    if (!SOCIAL_MEDIA_CONTENT_TYPES.includes(file.type as typeof SOCIAL_MEDIA_CONTENT_TYPES[number])) {
      toast.error("Choose a JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Original media must be 6 MB or smaller.");
      return;
    }
    const draftId = selectedDraft.id;
    try {
      const base64Data = await readFileAsBase64(file);
      const upload = await uploadSocialMedia.mutateAsync({ fileName: file.name, contentType: file.type as typeof SOCIAL_MEDIA_CONTENT_TYPES[number], base64Data });
      setDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, mediaUrl: upload.url, updatedAt: new Date().toISOString() } : draft));
      toast.success("Original media attached to this draft");
    } catch {
      toast.error("The original media could not be uploaded. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-200"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Planning workspace</span></div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Social Content Manager</h2>
              <p className="text-sm leading-6 text-slate-300">Prepare, review, and organize Tradebilia social posts in one place. This first version never connects to social accounts or publishes automatically.</p>
            </div>
            <Button onClick={addDraft} className="w-full shrink-0 bg-white text-indigo-950 hover:bg-indigo-50 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Create Original Post</Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Social content entry paths">
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Megaphone className="h-5 w-5" /></span>
              <Badge className="border border-slate-200 bg-white text-slate-600">Original</Badge>
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Create Original Content</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Start with Tradebilia’s own announcements, collector tips, category spotlights, campaign media, or videos. You control every word, image, and target platform.</p>
            <Button onClick={addDraft} className="mt-5 w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Create Original Post</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><Sparkles className="h-5 w-5" /></span>
              <Badge className="border border-amber-200 bg-amber-100 text-amber-900">Admin reviewed</Badge>
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Promotion Opportunities</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Review public listings added in the past 30 days at $1,000 or more, plus recent completed exchanges. Each selection creates an editable draft—nothing posts automatically.</p>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white/80 p-3">
              <div><p className="text-sm font-bold text-slate-900">Auto-list promotion opportunities</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Surfaces qualifying activity in this admin workspace only.</p></div>
              <Switch checked={autoListEnabled === true} onCheckedChange={setAutoListEnabled} aria-label="Auto-list promotion opportunities" disabled={autoListEnabled === null} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-amber-200">{autoListEnabled ? `${highValueListings.length} high-value listings` : "Auto-list is off"}</span>
              <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-violet-200">{autoListEnabled ? `${completedTrades.length} completed trades` : "Manual posts remain available"}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-amber-200">
        <CardHeader className="border-b border-amber-100 bg-amber-50/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-600" />Promotion Opportunities</CardTitle><CardDescription>Public-safe marketplace activity only. Names, contact details, trade IDs, cash, payment, shipping, and messages are excluded.</CardDescription></div>
            {autoListEnabled === false ? <span className="text-xs font-semibold text-slate-500">Auto-list is off</span> : promotionQuery.isLoading ? <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading opportunities</span> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
          <OpportunityList
            icon={<DollarSign className="h-4 w-4" />}
            title="New high-value listings"
            description="Active public listings valued at $1,000 or more."
            emptyCopy={autoListEnabled ? "No qualifying listings were added during this window." : "Auto-list is off. Turn it on above to surface qualifying new listings."}
            opportunities={highValueListings}
            renderMeta={(listing: any) => `${formatWholeDollar(listing.estimatedValue)} · Added ${formatOpportunityDate(listing.createdAt)}`}
            onCreateDraft={createListingPromotionDraft}
          />
          <OpportunityList
            icon={<Trophy className="h-4 w-4" />}
            title="Recent completed trades"
            description="Public completed exchanges, presented without cash or participant information."
            emptyCopy={autoListEnabled ? "No public completed trades were found during this window." : "Auto-list is off. Turn it on above to surface recent completed trades."}
            opportunities={completedTrades}
            renderMeta={(trade: any) => `${Math.max(1, Number(trade.itemCount ?? 1))} item${Math.max(1, Number(trade.itemCount ?? 1)) === 1 ? "" : "s"} · Completed ${formatOpportunityDate(trade.completedAt)}`}
            onCreateDraft={createCompletedTradeDraft}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<FileText className="h-4 w-4" />} label="Total drafts" value={counts.total} />
        <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Needs review" value={counts.needsReview} tone="amber" />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={counts.approved} tone="emerald" />
        <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Planned" value={counts.scheduled} tone="indigo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <Card className="min-w-0">
          <CardHeader className="gap-4 border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><CardTitle>Content Library</CardTitle><CardDescription>Drafts are saved only in this admin browser for now.</CardDescription></div>
              <Button variant="outline" size="sm" onClick={addDraft}><Plus className="mr-1.5 h-4 w-4" />New</Button>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter social drafts">
              {["All", ...statuses].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status as "All" | DraftStatus)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{status}</button>)}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-4">
            {filteredDrafts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm font-semibold text-slate-700">No posts in this view</p><p className="mt-1 text-xs text-slate-500">Create a draft to start planning your next update.</p></div> : filteredDrafts.map((draft) => (
              <button key={draft.id} type="button" onClick={() => setSelectedId(draft.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === draft.id ? "border-indigo-400 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={`border text-[10px] ${sourceStyles[draft.source]}`}>{draft.source}</Badge>
                      <p className="truncate text-sm font-bold text-slate-900">{draft.title || "Untitled social post"}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{draft.copy || "No copy added yet."}</p>
                  </div>
                  <Badge className={`shrink-0 border text-[10px] ${statusStyles[draft.status]}`}>{draft.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">{draft.platforms.map((platform) => <span key={platform} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${platformStyles[platform]}`}>{platformIcon(platform)}{platform}</span>)}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          {!selectedDraft ? <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><Archive className="mb-4 h-10 w-10 text-slate-300" /><h3 className="text-lg font-bold text-slate-800">Select a draft</h3><p className="mt-2 max-w-sm text-sm text-slate-500">Choose a post from the Content Library or create a new one to begin.</p></CardContent> : <>
            <CardHeader className="gap-4 border-b border-slate-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="truncate">Create &amp; Review</CardTitle><Badge className={`border text-[10px] ${sourceStyles[selectedDraft.source]}`}>{selectedDraft.source}</Badge></div><CardDescription className="mt-1">{selectedDraft.sourceSummary}</CardDescription></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={duplicateDraft} aria-label="Duplicate draft"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => removeDraft(selectedDraft.id)} aria-label="Delete draft"><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></div></CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Internal post title<Input value={selectedDraft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Example: Welcome to Tradebilia" className="mt-1.5" /></label><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Post copy<Textarea value={selectedDraft.copy} onChange={(event) => updateDraft({ copy: event.target.value })} placeholder="Write the message your audience should see..." className="mt-1.5 min-h-32 resize-y" /><span className="block text-right text-xs font-normal text-slate-400">{selectedDraft.copy.length} characters</span></label></div>
              <div className="space-y-2"><p className="text-sm font-semibold text-slate-700">Target platforms</p><div className="grid gap-2 sm:grid-cols-2">{platforms.map((platform) => <button key={platform} type="button" onClick={() => togglePlatform(platform)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${selectedDraft.platforms.includes(platform) ? platformStyles[platform] : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}><span className="flex items-center gap-2">{platformIcon(platform)}{platform}</span>{selectedDraft.platforms.includes(platform) ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border border-current" />}</button>)}</div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 text-sm font-semibold text-slate-700"><p>Original media</p><div className="mt-1.5 flex flex-wrap items-center gap-2"><label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100 ${uploadSocialMedia.isPending ? "cursor-wait opacity-70" : ""}`}><Upload className="h-4 w-4" />{uploadSocialMedia.isPending ? "Uploading…" : "Upload image or video"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="sr-only" disabled={uploadSocialMedia.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadOriginalMedia(file); event.currentTarget.value = ""; }} /></label>{selectedDraft.mediaUrl ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Media attached</span> : null}</div><div className="relative mt-2"><ImageIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={selectedDraft.mediaUrl} onChange={(event) => updateDraft({ mediaUrl: event.target.value })} placeholder="Optional existing image or video URL" className="pl-9" /></div><span className="block text-xs font-normal text-slate-500">JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV up to 6 MB. Uploads attach to this browser-local draft.</span></div><label className="space-y-2 text-sm font-semibold text-slate-700">Planned date<input type="date" value={selectedDraft.plannedDate} onChange={(event) => updateDraft({ plannedDate: event.target.value, status: event.target.value ? "Scheduled" : selectedDraft.status })} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><span className="block text-xs font-normal text-slate-500">Planning only; no automated post will be sent.</span></label></div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4"><div className="flex items-start gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><div><p className="text-sm font-bold text-indigo-950">Manual publishing safeguard</p><p className="mt-1 text-xs leading-5 text-indigo-900/80">Approved means the copy is ready for a person to publish on the selected sites. It does not connect an account, send a post, or grant an external platform permission.</p></div></div></div>
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-slate-500">Last edited {formatUpdatedAt(selectedDraft.updatedAt)}</span><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => updateDraft({ status: "Draft" })}><Save className="mr-2 h-4 w-4" />Save Draft</Button>{selectedDraft.status === "Needs Review" ? <Button onClick={approveDraft} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button> : <Button onClick={requestReview} className="bg-indigo-600 text-white hover:bg-indigo-700"><Send className="mr-2 h-4 w-4" />Request Review</Button>}</div></div>
            </CardContent>
          </>}
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/70"><CardContent className="flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-950">Phase 1 is planning only</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Direct publishing, external account connections, analytics, and automatic scheduling are intentionally not enabled. Those features require separate platform approvals, permissions, and secure account connections.</p></div></CardContent></Card>
    </div>
  );
}

function MetricCard({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: number; tone?: "slate" | "amber" | "emerald" | "indigo" }) {
  const tones = { slate: "bg-slate-100 text-slate-700", amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700", indigo: "bg-indigo-100 text-indigo-700" };
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div></CardContent></Card>;
}

function OpportunityList({
  icon,
  title,
  description,
  emptyCopy,
  opportunities,
  renderMeta,
  onCreateDraft,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  emptyCopy: string;
  opportunities: readonly any[];
  renderMeta: (opportunity: any) => string;
  onCreateDraft: (opportunity: any) => void;
}) {
  return <section className="min-w-0" aria-label={title}>
    <div className="mb-3 flex items-start gap-2"><span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-700">{icon}</span><div><h3 className="text-sm font-bold text-slate-950">{title}</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div></div>
    <div className="space-y-2">
      {opportunities.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-xs leading-5 text-slate-500">{emptyCopy}</div> : opportunities.map((opportunity, index) => <article key={`${opportunity.title}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {opportunity.imageUrl ? <img src={opportunity.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-slate-100 object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon className="h-5 w-5" /></span>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{opportunity.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{renderMeta(opportunity)}</p></div>
        <Button type="button" variant="outline" size="sm" onClick={() => onCreateDraft(opportunity)} className="shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50"><span className="hidden sm:inline">Create draft</span><ArrowRight className="h-4 w-4 sm:ml-1.5" /></Button>
      </article>)}
    </div>
  </section>;
}

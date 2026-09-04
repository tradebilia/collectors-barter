import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Image as ImageIcon,
  Instagram,
  Link2,
  Linkedin,
  Plus,
  Youtube,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  approveSocialDraft,
  createSocialDraft,
  filterSocialDrafts,
  requestSocialReview,
  SOCIAL_DRAFT_STATUSES,
  SOCIAL_PLATFORMS,
  toggleSocialPlatform,
  type DraftStatus,
  type SocialDraft,
  type SocialPlatform,
} from "@/lib/socialContentManager";

const STORAGE_KEY = "tradebilia-admin-social-drafts-v1";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      const initial = Array.isArray(parsed) ? parsed : [starterDraft];
      setDrafts(initial);
      setSelectedId(initial[0]?.id ?? null);
    } catch {
      setDrafts([starterDraft]);
      setSelectedId(starterDraft.id);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts, hydrated]);

  const selectedDraft = drafts.find((draft) => draft.id === selectedId) ?? null;
  const filteredDrafts = useMemo(() => filterSocialDrafts(drafts, statusFilter), [drafts, statusFilter]);
  const counts = useMemo(() => ({
    total: drafts.length,
    needsReview: drafts.filter((draft) => draft.status === "Needs Review").length,
    approved: drafts.filter((draft) => draft.status === "Approved").length,
    scheduled: drafts.filter((draft) => draft.status === "Scheduled").length,
  }), [drafts]);

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
            <Button onClick={addDraft} className="w-full shrink-0 bg-white text-indigo-950 hover:bg-indigo-50 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Create Post</Button>
          </div>
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
            {filteredDrafts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm font-semibold text-slate-700">No posts in this view</p><p className="mt-1 text-xs text-slate-500">Create a draft to start planning your next update.</p></div> : filteredDrafts.map((draft) => <button key={draft.id} type="button" onClick={() => setSelectedId(draft.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === draft.id ? "border-indigo-400 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{draft.title || "Untitled social post"}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{draft.copy || "No copy added yet."}</p></div><Badge className={`shrink-0 border text-[10px] ${statusStyles[draft.status]}`}>{draft.status}</Badge></div><div className="mt-3 flex flex-wrap gap-1.5">{draft.platforms.map((platform) => <span key={platform} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${platformStyles[platform]}`}>{platformIcon(platform)}{platform}</span>)}</div></button>)}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          {!selectedDraft ? <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><Archive className="mb-4 h-10 w-10 text-slate-300" /><h3 className="text-lg font-bold text-slate-800">Select a draft</h3><p className="mt-2 max-w-sm text-sm text-slate-500">Choose a post from the Content Library or create a new one to begin.</p></CardContent> : <>
            <CardHeader className="gap-4 border-b border-slate-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><CardTitle className="truncate">Create &amp; Review</CardTitle><CardDescription>Write once, then tailor the message for each selected platform later.</CardDescription></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={duplicateDraft} aria-label="Duplicate draft"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => removeDraft(selectedDraft.id)} aria-label="Delete draft"><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></div></CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Internal post title<Input value={selectedDraft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Example: Welcome to Tradebilia" className="mt-1.5" /></label><label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2">Post copy<Textarea value={selectedDraft.copy} onChange={(event) => updateDraft({ copy: event.target.value })} placeholder="Write the message your audience should see..." className="mt-1.5 min-h-32 resize-y" /><span className="block text-right text-xs font-normal text-slate-400">{selectedDraft.copy.length} characters</span></label></div>
              <div className="space-y-2"><p className="text-sm font-semibold text-slate-700">Target platforms</p><div className="grid gap-2 sm:grid-cols-2">{platforms.map((platform) => <button key={platform} type="button" onClick={() => togglePlatform(platform)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${selectedDraft.platforms.includes(platform) ? platformStyles[platform] : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}><span className="flex items-center gap-2">{platformIcon(platform)}{platform}</span>{selectedDraft.platforms.includes(platform) ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border border-current" />}</button>)}</div></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700">Media reference<div className="relative mt-1.5"><ImageIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={selectedDraft.mediaUrl} onChange={(event) => updateDraft({ mediaUrl: event.target.value })} placeholder="Optional image URL or storage reference" className="pl-9" /></div><span className="block text-xs font-normal text-slate-500">Uploads and platform media validation will be added later.</span></label><label className="space-y-2 text-sm font-semibold text-slate-700">Planned date<input type="date" value={selectedDraft.plannedDate} onChange={(event) => updateDraft({ plannedDate: event.target.value, status: event.target.value ? "Scheduled" : selectedDraft.status })} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><span className="block text-xs font-normal text-slate-500">Planning only; no automated post will be sent.</span></label></div>
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

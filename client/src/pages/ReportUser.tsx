import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, FileText, Flag, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const concernTypes = ["Counterfeit or inaccurate item description", "Harassment or abusive conduct", "Spam, solicitation, or scam activity", "Unsafe trade behavior", "Trade issue: item, shipment, or delivery", "Unauthorized contact information sharing", "Other community concern"] as const;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);
type UploadedEvidence = { key: string; url: string; name: string; type: string; size: number };

function readAsBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error(`Could not read ${file.name}`)); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.readAsDataURL(file); }); }

export default function ReportUser() {
  const { user, isAuthenticated } = useAuth();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [reportedMember, setReportedMember] = useState(() => params.get("member") || "");
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(() => Number(params.get("reportedUserId")) || null);
  const [listingReference, setListingReference] = useState(() => params.get("reference") || "");
  const [concernType, setConcernType] = useState<(typeof concernTypes)[number] | "">(() => params.get("tradeIssue") === "1" ? "Trade issue: item, shipment, or delivery" : "");
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [supportingNotes, setSupportingNotes] = useState("");
  const [attachments, setAttachments] = useState<UploadedEvidence[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const uploadEvidence = trpc.market.uploadReportEvidence.useMutation();

  const reportMutation = trpc.market.submitReport.useMutation({ onSuccess: result => { setSubmittedReportId(result.reportId); toast.success(`Report ${result.reportId} submitted.`); }, onError: error => toast.error(error.message) });
  const handleUsernameBlur = async () => { if (!reportedMember.trim()) return setResolvedUserId(null); setIsLookingUp(true); setUsernameError(null); try { const found = await utils.market.lookupUserByUsername.fetch({ username: reportedMember.trim() }); setResolvedUserId(found.userId); } catch { setResolvedUserId(null); setUsernameError("Username not found. Please check the spelling."); } finally { setIsLookingUp(false); } };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []); event.target.value = "";
    if (attachments.length + files.length > 5) return toast.error("You can attach up to five evidence files.");
    const invalid = files.find(file => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) return toast.error("Evidence must be a PNG, JPG, WEBP, PDF, or TXT file up to 10MB.");
    setIsUploading(true); try { const uploaded = await Promise.all(files.map(async file => uploadEvidence.mutateAsync({ name: file.name, type: file.type, contentBase64: await readAsBase64(file) }))); setAttachments(previous => [...previous, ...uploaded]); toast.success(`${uploaded.length} evidence file${uploaded.length === 1 ? "" : "s"} attached.`); } catch (error: any) { toast.error(error.message || "Evidence upload failed."); } finally { setIsUploading(false); }
  };
  const submitReport = (event: FormEvent) => { event.preventDefault(); if (!isAuthenticated) return toast.info("Please sign in before filing a report."); if (!resolvedUserId) return toast.error("Enter a valid member username and wait for verification."); if (!concernType) return toast.error("Choose a concern type."); if (details.trim().length < 20) return toast.error("Please provide at least 20 characters describing what happened."); reportMutation.mutate({ reportedUserId: resolvedUserId, reason: concernType, description: details.trim(), evidence: supportingNotes.trim() || undefined, listingReference: listingReference.trim() || undefined, contactEmail: contactEmail.trim() || undefined, attachments }); };

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(73,125,255,0.14),transparent_30%),linear-gradient(180deg,#050814_0%,#0b1220_32%,#111827_100%)] text-white"><TopBar /><CategoryBar /><main className="container py-8"><div className="mx-auto max-w-3xl"><Card className="border-white/10 bg-white/5 backdrop-blur"><CardHeader className="border-b border-white/10"><CardTitle className="flex items-center gap-2 text-white"><Flag className="h-5 w-5 text-red-400" />Report a Member</CardTitle><CardDescription className="text-white/60">Report a community safety concern. For a trade-specific item or shipment issue, use the Trade Room link so the case includes the correct trade context.</CardDescription></CardHeader><CardContent className="pt-6">
    {submittedReportId ? <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-400" /><h2 className="text-xl font-semibold">Report submitted</h2><p className="text-white/70">Your private reference is <span className="font-mono text-blue-200">{submittedReportId}</span>. You can view its status in My Reports.</p><div className="flex justify-center gap-3"><Link href="/my-reports"><Button>View My Reports</Button></Link><Button variant="outline" className="border-white/15 bg-transparent text-white" onClick={() => setSubmittedReportId(null)}>Submit another</Button></div></div> : <form onSubmit={submitReport} className="space-y-6">
      <div className="rounded-[1.25rem] border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-blue-300" /><div><p className="font-medium">Your report is confidential</p><p className="mt-1 text-xs text-blue-100/70">Only moderators can review the report, context, and evidence. The reported member cannot see your submission.</p></div></div></div>
      {params.get("tradeIssue") === "1" && <div className="rounded-[1.25rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" />Trade issue for <span className="font-mono">{listingReference || "this trade"}</span>. The other participant and trade reference have been prefilled.</div>}
      <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label>Member username</Label><div className="relative"><Input value={reportedMember} onChange={event => { setReportedMember(event.target.value); setResolvedUserId(null); }} onBlur={handleUsernameBlur} className="h-12 border-white/10 bg-white/5 pr-20 text-white" placeholder="Username of member to report" />{isLookingUp && <span className="absolute right-3 top-3.5 text-xs text-white/60">Checking</span>}{resolvedUserId && !isLookingUp && <span className="absolute right-3 top-3.5 text-xs text-green-300">Verified</span>}</div>{usernameError && <p className="text-xs text-red-300">{usernameError}</p>}</div><div className="space-y-2"><Label>Listing or trade reference</Label><Input value={listingReference} onChange={event => setListingReference(event.target.value)} className="h-12 border-white/10 bg-white/5 text-white" placeholder="Optional listing ID, proposal ID, or URL" /></div></div>
      <div className="grid gap-5 md:grid-cols-[1fr_240px]"><div className="space-y-2"><Label>Concern type</Label><Select value={concernType} onValueChange={value => setConcernType(value as typeof concernType)}><SelectTrigger className="h-12 border-white/10 bg-white/5 text-white"><SelectValue placeholder="Choose the issue category" /></SelectTrigger><SelectContent>{concernTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Contact email</Label><Input value={contactEmail} onChange={event => setContactEmail(event.target.value)} className="h-12 border-white/10 bg-white/5 text-white" placeholder="you@example.com" /></div></div>
      <div className="space-y-2"><Label>What happened?</Label><Textarea value={details} onChange={event => setDetails(event.target.value)} className="min-h-40 border-white/10 bg-white/5 text-white" placeholder="Describe the timeline, what was affected, and why you are concerned." /></div>
      <div className="space-y-2"><Label>Evidence notes</Label><Textarea value={supportingNotes} onChange={event => setSupportingNotes(event.target.value)} className="min-h-28 border-white/10 bg-white/5 text-white" placeholder="Explain what each attachment shows, or add relevant tracking, listing, or message details." /></div>
      <div className="space-y-3"><Label>Evidence attachments</Label><div className="rounded-[1.25rem] border-2 border-dashed border-white/20 bg-white/5 p-6 text-center"><input type="file" multiple onChange={handleFileUpload} className="hidden" id="report-evidence" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" /><label htmlFor="report-evidence" className="cursor-pointer"><Upload className="mx-auto h-6 w-6 text-white/60" /><p className="mt-2 text-sm"><span className="font-medium text-white">Upload evidence</span><span className="text-white/60"> — PNG, JPG, WEBP, PDF, or TXT, up to 10MB each</span></p></label></div>{isUploading && <p className="flex items-center gap-2 text-xs text-blue-200"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading evidence securely…</p>}{attachments.map((file, index) => <div key={file.key} className="flex items-center justify-between rounded-lg bg-white/10 p-3 text-sm"><span className="flex min-w-0 items-center gap-2 truncate"><FileText className="h-4 w-4 shrink-0 text-blue-200" />{file.name}</span><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-white/70" onClick={() => setAttachments(current => current.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button></div>)}</div>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" className="rounded-full bg-white text-slate-950 hover:bg-white/90" disabled={reportMutation.isPending || isUploading}>{reportMutation.isPending ? "Submitting report…" : "Submit report"}</Button><Link href="/my-reports" className="text-sm text-blue-200 hover:underline">View My Reports</Link></div>
    </form>}
  </CardContent></Card></div></main></div>;
}

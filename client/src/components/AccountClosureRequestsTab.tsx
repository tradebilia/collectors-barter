import { AlertCircle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type ClosureStatus = "all" | "pending_review" | "closed" | "declined" | "withdrawn";

const statusLabels: Record<Exclude<ClosureStatus, "all">, string> = {
  pending_review: "Needs review",
  closed: "Closed",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusVariant(status: Exclude<ClosureStatus, "all">) {
  if (status === "closed") return "default" as const;
  if (status === "pending_review") return "secondary" as const;
  return "outline" as const;
}

export function AccountClosureRequestsTab() {
  const [filter, setFilter] = useState<ClosureStatus>("pending_review");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const listQuery = trpc.accountClosure.adminList.useQuery(filter === "all" ? undefined : { status: filter }, {
    refetchOnWindowFocus: true,
  });
  const selected = useMemo(
    () => (listQuery.data ?? []).find((request: any) => request.id === selectedRequestId) ?? null,
    [listQuery.data, selectedRequestId],
  );
  const auditQuery = trpc.accountClosure.adminAudit.useQuery(
    { userId: selected?.userId ?? 0 },
    { enabled: Boolean(selected?.userId), refetchOnWindowFocus: true },
  );
  const reviewMutation = trpc.accountClosure.adminReview.useMutation({
    onSuccess: async (result) => {
      toast.success(result.status === "closed" ? "Account closure approved and completed." : "Account closure request declined.");
      setAdminNote("");
      await Promise.all([listQuery.refetch(), auditQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message),
  });

  const review = (decision: "approve_close" | "decline") => {
    if (!selected) return;
    const note = adminNote.trim();
    if (!note) {
      toast.error("Add an administrator decision note before continuing.");
      return;
    }
    reviewMutation.mutate({ requestId: selected.id, decision, adminNote: note });
  };

  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-950"><ShieldCheck className="h-5 w-5" />Account Closure Requests</CardTitle>
              <CardDescription className="mt-1 text-amber-900">A clean account closes immediately. Requests with active trades, unresolved complaints, reports, tickets, or account holds require review.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching} className="bg-white">
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-amber-950">
          Closing an account disables future sign-in, hides the member profile, and hides active listings. It does not erase trade, report, or other required safety records.
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Select a request to inspect the current count-only safety audit and record a decision.</p>
        <Select value={filter} onValueChange={(value) => { setFilter(value as ClosureStatus); setSelectedRequestId(null); setAdminNote(""); }}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Filter requests" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requests</SelectItem>
            <SelectItem value="pending_review">Needs review</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading closure requests…</p> : null}
            {!listQuery.isLoading && !listQuery.data?.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No account closure requests match this filter.</p> : null}
            {listQuery.data?.map((request: any) => (
              <button key={request.id} type="button" onClick={() => { setSelectedRequestId(request.id); setAdminNote(request.adminNote ?? ""); }} className={`w-full rounded-lg border p-4 text-left transition-colors ${selectedRequestId === request.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.displayName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Member #{request.userId} · Requested {formatDate(request.requestedAt)}</p>
                  </div>
                  <Badge variant={statusVariant(request.status)}>{statusLabels[request.status as Exclude<ClosureStatus, "all">]}</Badge>
                </div>
                {request.memberNote ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">Member note: {request.memberNote}</p> : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><UserX className="h-5 w-5" />Closure review</CardTitle>
            <CardDescription>{selected ? `${selected.displayName} · Member #${selected.userId}` : "Choose a request from the list."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selected ? <p className="text-sm text-muted-foreground">The audit remains unavailable until an administrator chooses a request.</p> : null}
            {selected && auditQuery.isLoading ? <p className="text-sm text-muted-foreground">Refreshing current safety checks…</p> : null}
            {selected && auditQuery.data ? <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Active / unresolved trades", auditQuery.data.activeTrades],
                  ["Completed trades (retained)", auditQuery.data.completedTrades],
                  ["Open trade complaints", auditQuery.data.unresolvedTradeComplaints],
                  ["Unresolved member reports", auditQuery.data.unresolvedReports],
                  ["Open support tickets", auditQuery.data.openSupportTickets],
                  ["Pending account reviews", auditQuery.data.pendingApprovalReviews],
                  ["Active listings to hide", auditQuery.data.activeListings],
                  ["Past closure requests", auditQuery.data.priorRequests],
                ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="text-xs text-muted-foreground">Membership record</p><p className="mt-1 font-medium">{auditQuery.data.membershipStatus.replace(/_/g, " ")} · {auditQuery.data.billingTerm.replace(/_/g, " ")}</p></div>
              {auditQuery.data.blockers.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" />Closure is currently blocked</p><ul className="mt-2 list-disc space-y-1 pl-5">{auditQuery.data.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" />No current blockers found</p><p className="mt-1">Approving this request will close the account without erasing retained trade or safety records.</p></div>}
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">This view intentionally shows counts and workflow status only. Review protected report or trade records through their existing administrator tools when a count needs investigation.</p>
              {selected.status === "pending_review" ? <>
                <div className="space-y-2"><label className="text-sm font-medium" htmlFor="closure-admin-note">Administrator decision note</label><Textarea id="closure-admin-note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={2000} placeholder="Record the decision or the next required resolution step." /></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="destructive" onClick={() => review("approve_close")} disabled={reviewMutation.isPending || auditQuery.data.blockers.length > 0}><CheckCircle2 className="mr-2 h-4 w-4" />Approve & close</Button>
                  <Button variant="outline" onClick={() => review("decline")} disabled={reviewMutation.isPending}><Clock3 className="mr-2 h-4 w-4" />Decline request</Button>
                </div>
              </> : <div className="rounded-lg border p-3 text-sm"><p className="font-medium">Decision recorded: {statusLabels[selected.status as Exclude<ClosureStatus, "all">]}</p><p className="mt-1 text-muted-foreground">Reviewed {formatDate(selected.reviewedAt)}. {selected.adminNote || "No decision note recorded."}</p></div>}
            </> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

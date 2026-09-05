import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export function ForumModerationQueue() {
  const utils = trpc.useUtils();
  const { data: reports, isLoading } = trpc.market.getForumModerationQueue.useQuery();
  const reviewMutation = trpc.market.reviewForumReport.useMutation();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const review = async (reportId: number, action: "dismiss" | "remove" | "restore") => {
    setError("");
    try {
      await reviewMutation.mutateAsync({ reportId, action, note: note.trim() || undefined });
      setNote("");
      await Promise.all([utils.market.getForumModerationQueue.invalidate(), utils.market.getForumPosts.invalidate()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this forum report.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forum Moderation Queue</CardTitle>
        <CardDescription>Review community reports, retain an audit record, and remove or restore a reported topic when needed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <label className="block text-sm font-medium" htmlFor="forum-moderation-note">Optional admin note</label>
        <textarea id="forum-moderation-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Reason recorded with this review action" className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        {isLoading ? <p className="text-sm text-muted-foreground">Loading forum reports…</p> : reports?.length ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Topic</th><th className="p-3">Reported by</th><th className="p-3">Reason</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>{reports.map((report) => <tr key={report.id} className="border-t align-top"><td className="p-3"><p className="font-semibold">{report.postTitle || `Topic #${report.postId}`}</p><p className="mt-1 text-xs text-muted-foreground">{report.details || "No additional details."}</p></td><td className="p-3">{report.reporterName}</td><td className="p-3 capitalize">{report.reason.replace(/_/g, " ")}</td><td className="p-3 capitalize">{report.status.replace(/_/g, " ")}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => review(report.id, "dismiss")}>Dismiss</Button><Button size="sm" disabled={reviewMutation.isPending} onClick={() => review(report.id, "remove")}>Remove post</Button>{report.postStatus === "removed" && <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => review(report.id, "restore")}>Restore</Button>}</div></td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No forum reports need review.</p>}
      </CardContent>
    </Card>
  );
}

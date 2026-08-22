import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Eye, Mail, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_SUBJECT = "An update from Tradebilia";

export function PreLaunchEmailTab() {
  const recipientsQuery = trpc.admin.getPreLaunchRecipients.useQuery();
  const broadcastsQuery = trpc.admin.getPreLaunchBroadcastStatuses.useQuery();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const sendMutation = trpc.admin.sendPreLaunchUpdate.useMutation({
    onSuccess: result => {
      toast.success(result.recipientCount > 0
        ? `Resend accepted the broadcast for ${result.recipientCount} opted-in recipient${result.recipientCount === 1 ? "" : "s"}.`
        : "There are no opted-in Pre-Launch Email recipients yet.");
      setConfirmOpen(false);
      broadcastsQuery.refetch();
      recipientsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const recipients = recipientsQuery.data ?? [];
  useEffect(() => {
    if (!selectionInitialized && recipients.length > 0) {
      setSelectedRecipientIds(recipients.map(recipient => recipient.id));
      setSelectionInitialized(true);
    }
  }, [recipients, selectionInitialized]);
  const selectedRecipients = recipients.filter(recipient => selectedRecipientIds.includes(recipient.id));
  const canPrepareSend = selectedRecipients.length > 0 && subject.trim().length > 0 && message.trim().length > 0;
  const formattedMessage = useMemo(() => message.trim() || "Your update will appear here.", [message]);

  const confirmSend = () => {
    if (!canPrepareSend || sendMutation.isPending) return;
    sendMutation.mutate({ subject, message, recipientIds: selectedRecipientIds });
  };

  return (
    <div className="space-y-5">
      <Card className="border-[#29A8FF]/25 bg-gradient-to-br from-[#07142d] to-[#111126] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><Mail className="h-5 w-5 text-[#29A8FF]" />Pre-Launch Email</CardTitle>
          <CardDescription className="text-white/70">Draft a launch status update for collectors who explicitly opted in on the Coming Soon page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pre-launch-subject">Email subject</label>
            <Input id="pre-launch-subject" value={subject} onChange={event => setSubject(event.target.value)} maxLength={160} className="border-white/15 bg-black/20 text-white" />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-[#18B57A]" />Opted-in recipients</div>
            <p className="mt-2 text-3xl font-semibold">{recipientsQuery.isLoading ? "—" : recipients.length}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">Unsubscribed contacts are excluded automatically.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="pre-launch-message">Status update</label>
            <Textarea id="pre-launch-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={5000} rows={10} placeholder="Write the update collectors should receive…" className="resize-y border-white/15 bg-black/20 text-white placeholder:text-white/35" />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/55"><span>Every update includes the Tradebilia logo and a provider-managed unsubscribe link.</span><span>{message.length}/5000</span></div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)} disabled={!subject.trim() || !message.trim()} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Eye className="mr-2 h-4 w-4" />Preview</Button>
            <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canPrepareSend} className="bg-[#7f31ff] text-white hover:bg-[#8d46ff]"><Send className="mr-2 h-4 w-4" />Review &amp; Send to {selectedRecipients.length || 0}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent delivery handoff</CardTitle>
          <CardDescription>“Sent” means Resend accepted the broadcast. Inbox placement, spam filtering, bounces, and opens are tracked in Resend’s Broadcasts dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {broadcastsQuery.isLoading ? <p className="text-sm text-muted-foreground">Checking recent broadcast status…</p> : broadcastsQuery.isError ? <p className="text-sm text-rose-700">Recent broadcast status could not be loaded.</p> : (broadcastsQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No Pre-Launch broadcasts have been recorded yet.</p> : (
            <div className="space-y-2">
              {broadcastsQuery.data?.map((broadcast: { id: string; status: string | null; sentAt: string | null; createdAt: string | null }) => <div key={broadcast.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="font-medium">{broadcast.status ?? "unknown"}</span><span className="text-xs text-muted-foreground">{broadcast.sentAt ? `Sent ${new Date(broadcast.sentAt).toLocaleString()}` : broadcast.createdAt ? `Created ${new Date(broadcast.createdAt).toLocaleString()}` : "Timestamp unavailable"}</span></div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Opted-in recipients</CardTitle><CardDescription>Select the collectors for this send. Unchecked recipients remain opted in and can be included in a later resend.</CardDescription></CardHeader>
        <CardContent>
          {recipientsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading opted-in recipients…</p> : recipients.length === 0 ? <p className="text-sm text-muted-foreground">No one has opted in for pre-launch updates yet.</p> : (
            <div className="max-h-80 overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="w-12 px-4 py-3"><input aria-label="Select all recipients" type="checkbox" checked={recipients.length > 0 && selectedRecipientIds.length === recipients.length} onChange={event => setSelectedRecipientIds(event.target.checked ? recipients.map(recipient => recipient.id) : [])} /></th><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Signed up</th><th className="px-4 py-3 font-medium">Last sent</th></tr></thead><tbody>{recipients.map(recipient => <tr key={recipient.id} className="border-t border-border"><td className="px-4 py-3"><input aria-label={`Select ${recipient.email}`} type="checkbox" checked={selectedRecipientIds.includes(recipient.id)} onChange={event => setSelectedRecipientIds(current => event.target.checked ? [...current, recipient.id] : current.filter(id => id !== recipient.id))} /></td><td className="px-4 py-3">{recipient.email}</td><td className="px-4 py-3 text-muted-foreground">{recipient.createdAt ? new Date(recipient.createdAt).toLocaleString() : "—"}</td><td className="px-4 py-3 text-muted-foreground">{recipient.lastSentAt ? new Date(recipient.lastSentAt).toLocaleString() : "Never"}</td></tr>)}</tbody></table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Email preview</DialogTitle><DialogDescription>Preview only. This does not create or send an email.</DialogDescription></DialogHeader><div className="overflow-hidden rounded-2xl border bg-white shadow-lg"><div className="bg-[#08162a] bg-cover bg-center text-center" style={{ backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)" }}><div className="bg-[#041023d1] px-8 py-11"><img src="https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg" alt="Tradebilia — Collectors Trading Exchange" className="mx-auto h-auto w-full max-w-md" /></div></div><div className="space-y-5 p-10 text-slate-800"><h2 className="text-xl font-semibold">{subject || DEFAULT_SUBJECT}</h2><p className="whitespace-pre-wrap text-base leading-7">{formattedMessage}</p><a href="https://tradebilia.manus.space" className="inline-flex rounded-lg bg-[#0f9b86] px-6 py-3 text-sm font-bold text-white no-underline shadow-sm">Explore Tradebilia</a><p className="border-t pt-5 text-xs text-slate-500">Recipients can unsubscribe from future pre-launch updates using the link in their email.</p></div></div></DialogContent></Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Send this Pre-Launch Email?</DialogTitle><DialogDescription>This will deliver the current status update to {selectedRecipients.length} selected opted-in recipient{selectedRecipients.length === 1 ? "" : "s"}. This cannot be recalled after delivery starts.</DialogDescription></DialogHeader><div className="rounded-xl border bg-muted/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p><p className="mt-1 font-medium">{subject}</p></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendMutation.isPending}>Cancel</Button><Button type="button" onClick={confirmSend} disabled={!canPrepareSend || sendMutation.isPending} className="bg-[#7f31ff] hover:bg-[#8d46ff]">{sendMutation.isPending ? "Sending…" : `Send to ${selectedRecipients.length}`}</Button></div></DialogContent></Dialog>
    </div>
  );
}

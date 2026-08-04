import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Eye, Trash2, Save, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ReferralsTab() {
  const referralsQuery = trpc.admin.getAllReferrals.useQuery();
  const templateQuery = trpc.admin.getReferralEmailTemplate.useQuery();

  const [selectedReferralIds, setSelectedReferralIds] = useState<Set<number>>(new Set());
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Email template state
  const [emailSubject, setEmailSubject] = useState("You're invited to join Tradebilia!");
  const [emailBody, setEmailBody] = useState("");
  const [templateDirty, setTemplateDirty] = useState(false);

  // Sync template from server
  useEffect(() => {
    if (templateQuery.data) {
      setEmailSubject(templateQuery.data.subject);
      setEmailBody(templateQuery.data.body);
      setTemplateDirty(false);
    }
  }, [templateQuery.data]);

  const sendBulkEmailMutation = trpc.admin.sendBulkEmailToReferrals.useMutation();
  const deleteReferralMutation = trpc.admin.deleteReferral.useMutation();
  const bulkDeleteReferralsMutation = trpc.admin.bulkDeleteReferrals.useMutation();
  const updateTemplateMutation = trpc.admin.updateReferralEmailTemplate.useMutation();

  const handleSaveTemplate = async () => {
    if (!emailSubject.trim()) { toast.error("Subject cannot be empty"); return; }
    if (!emailBody.trim()) { toast.error("Message body cannot be empty"); return; }
    try {
      await updateTemplateMutation.mutateAsync({ subject: emailSubject, body: emailBody });
      setTemplateDirty(false);
      toast.success("Email template saved successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save template");
    }
  };

  const handleSendEmails = async () => {
    if (selectedReferralIds.size === 0) {
      toast.error("Please select at least one referral to email");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please fill in both subject and message body");
      return;
    }
    // Filter out already-emailed
    const referrals = referralsQuery.data as any[] ?? [];
    const alreadyEmailed = Array.from(selectedReferralIds).filter(id => {
      const r = referrals.find((r: any) => r.id === id);
      return r?.emailSent;
    });
    if (alreadyEmailed.length === selectedReferralIds.size) {
      toast.error("All selected referrals have already been emailed");
      return;
    }
    try {
      const result = await sendBulkEmailMutation.mutateAsync({
        referralIds: Array.from(selectedReferralIds),
        subject: emailSubject,
        message: emailBody,
      });
      const { emailsSent, skipped } = result as any;
      toast.success(`Sent ${emailsSent} email(s)${skipped > 0 ? `, skipped ${skipped} already emailed` : ''}`);
      setSelectedReferralIds(new Set());
      referralsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send emails");
    }
  };

  const handleDeleteReferral = async (referralId: number) => {
    if (confirm('Are you sure you want to delete this referral request?')) {
      await deleteReferralMutation.mutateAsync({ referralId });
      referralsQuery.refetch();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReferralIds.size === 0) return;
    await bulkDeleteReferralsMutation.mutateAsync({ referralIds: Array.from(selectedReferralIds) });
    setSelectedReferralIds(new Set());
    setBulkDeleteDialogOpen(false);
    referralsQuery.refetch();
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked && referralsQuery.data) {
      setSelectedReferralIds(new Set((referralsQuery.data as any[]).map(r => r.id)));
    } else {
      setSelectedReferralIds(new Set());
    }
  };

  const toggleSelectReferral = (referralId: number) => {
    const newIds = new Set(selectedReferralIds);
    if (newIds.has(referralId)) newIds.delete(referralId);
    else newIds.add(referralId);
    setSelectedReferralIds(newIds);
  };

  return (
    <div className="space-y-4">
      {/* Email Template Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-blue-500" />
            Referral Invitation Email
          </CardTitle>
          <CardDescription>
            Edit the email that will be sent to selected referrals. Save changes before sending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => { setEmailSubject(e.target.value); setTemplateDirty(true); }}
              className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Message Body</label>
            <textarea
              value={emailBody}
              onChange={(e) => { setEmailBody(e.target.value); setTemplateDirty(true); }}
              rows={8}
              className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background resize-y font-mono"
              placeholder="Write your invitation message here..."
            />
          </div>
          <div className="flex items-center gap-2 justify-between">
            <p className="text-xs text-muted-foreground">
              {templateDirty ? "Unsaved changes" : templateQuery.data ? `Last saved` : ""}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
              className="flex items-center gap-1"
            >
              <Save className="h-3 w-3" />
              {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Requests Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Referral Requests
          </CardTitle>
          <CardDescription>
            Select referrals to email them the invitation above
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedReferralIds.size > 0 && (
            <div className="flex gap-2 items-center bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-800">
              <span className="text-sm font-medium">{selectedReferralIds.size} selected</span>
              <Button
                size="sm"
                onClick={handleSendEmails}
                disabled={sendBulkEmailMutation.isPending}
                className="flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                {sendBulkEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete Selected
              </Button>
            </div>
          )}

          {referralsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading referrals...</div>
          ) : referralsQuery.data && (referralsQuery.data as any[]).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-2 px-2 font-semibold text-xs w-8">
                      <input
                        type="checkbox"
                        checked={selectedReferralIds.size === (referralsQuery.data as any[]).length && (referralsQuery.data as any[]).length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="py-2 px-2 font-semibold text-xs">Referrer</th>
                    <th className="py-2 px-2 font-semibold text-xs">Collector</th>
                    <th className="py-2 px-2 font-semibold text-xs">Email</th>
                    <th className="py-2 px-2 font-semibold text-xs">Focus</th>
                    <th className="py-2 px-2 font-semibold text-xs">Type</th>
                    <th className="py-2 px-2 font-semibold text-xs">Status</th>
                    <th className="py-2 px-2 font-semibold text-xs">Emailed</th>
                    <th className="py-2 px-2 font-semibold text-xs">Joined</th>
                    <th className="py-2 px-2 font-semibold text-xs">Date</th>
                    <th className="py-2 px-2 font-semibold text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(referralsQuery.data as any[]).map((referral: any) => (
                    <tr key={referral.id} className={`border-b border-border hover:bg-accent/50 ${referral.emailSent ? 'opacity-60' : ''}`}>
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedReferralIds.has(referral.id)}
                          onChange={() => toggleSelectReferral(referral.id)}
                          disabled={!!referral.emailSent}
                        />
                      </td>
                      <td className="py-2 px-2 font-semibold">{referral.referrerName}</td>
                      <td className="py-2 px-2">{referral.collectorName}</td>
                      <td className="py-2 px-2 text-xs">{referral.collectorEmail}</td>
                      <td className="py-2 px-2 text-xs">{referral.collectorFocus}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          referral.isMerchant ? 'bg-purple-500/20 text-purple-700' : 'bg-blue-500/20 text-blue-700'
                        }`}>
                          {referral.isMerchant ? 'Merchant' : 'Collector'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          referral.status === 'pending' ? 'bg-yellow-500/20 text-yellow-700' :
                          referral.status === 'reviewed' ? 'bg-blue-500/20 text-blue-700' :
                          referral.status === 'approved' ? 'bg-green-500/20 text-green-700' :
                          'bg-red-500/20 text-red-700'
                        }`}>
                          {referral.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {referral.emailSent ? (
                          <div>
                            <span className="text-green-600 font-medium">Yes</span>
                            {referral.emailSentAt && (
                              <div className="text-muted-foreground text-[10px]">
                                {new Date(referral.emailSentAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs">{referral.hasJoined ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-xs">{new Date(referral.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-2 space-x-1 flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedReferral(referral); setDetailsDialogOpen(true); }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReferral(referral.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No referrals found</div>
          )}
        </CardContent>
      </Card>

      {/* Referral Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>Information about this referral submission</DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Referrer</label>
                <p className="text-sm text-muted-foreground">{selectedReferral.referrerFirstName} {selectedReferral.referrerLastName}</p>
                <p className="text-sm text-muted-foreground">{selectedReferral.referrerEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Collector Name</label>
                <p className="text-sm text-muted-foreground">{selectedReferral.collectorName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Collector Email</label>
                <p className="text-sm text-muted-foreground">{selectedReferral.collectorEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium">What They Collect</label>
                <p className="text-sm text-muted-foreground">{selectedReferral.collectorFocus}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Collector Type</label>
                <p className="text-sm text-muted-foreground">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    selectedReferral.isMerchant ? 'bg-purple-500/20 text-purple-700' : 'bg-blue-500/20 text-blue-700'
                  }`}>
                    {selectedReferral.isMerchant ? 'Merchant' : 'Collector'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReferral.message}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <p className="text-sm text-muted-foreground">{selectedReferral.status}</p>
              </div>
              {selectedReferral.emailSent && (
                <div>
                  <label className="text-sm font-medium">Emailed</label>
                  <p className="text-sm text-green-600">Yes — {selectedReferral.emailSentAt ? new Date(selectedReferral.emailSentAt).toLocaleString() : 'date unknown'}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Submitted</label>
                <p className="text-sm text-muted-foreground">{new Date(selectedReferral.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Referral Requests</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedReferralIds.size} referral request(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteReferralsMutation.isPending}
            >
              {bulkDeleteReferralsMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

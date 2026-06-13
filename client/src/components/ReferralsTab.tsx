import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ReferralsTab() {
  const referralsQuery = trpc.admin.getAllReferrals.useQuery();
  const [selectedReferralIds, setSelectedReferralIds] = useState<Set<number>>(new Set());
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailMessage, setBulkEmailMessage] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const sendBulkEmailMutation = trpc.admin.sendBulkEmailToReferrals.useMutation();
  const deleteReferralMutation = trpc.admin.deleteReferral.useMutation();

  const handleSendBulkEmail = async () => {
    await sendBulkEmailMutation.mutateAsync({
      referralIds: Array.from(selectedReferralIds),
      subject: bulkEmailSubject,
      message: bulkEmailMessage,
    });
    setBulkEmailDialogOpen(false);
    setBulkEmailSubject("");
    setBulkEmailMessage("");
    setSelectedReferralIds(new Set());
    referralsQuery.refetch();
  };

  const handleDeleteReferral = async (referralId: number) => {
    await deleteReferralMutation.mutateAsync({ referralId });
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
    if (newIds.has(referralId)) {
      newIds.delete(referralId);
    } else {
      newIds.add(referralId);
    }
    setSelectedReferralIds(newIds);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Referral Requests
          </CardTitle>
          <CardDescription>
            Review and manage collector referrals submitted by members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedReferralIds.size > 0 && (
            <div className="flex gap-2 items-center bg-blue-50 p-3 rounded">
              <span className="text-sm font-medium">{selectedReferralIds.size} selected</span>
              <Button
                size="sm"
                onClick={() => setBulkEmailDialogOpen(true)}
                className="ml-auto"
              >
                Send Bulk Email
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
                    <tr key={referral.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedReferralIds.has(referral.id)}
                          onChange={() => toggleSelectReferral(referral.id)}
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
                      <td className="py-2 px-2 text-xs">{referral.emailSent ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-xs">{referral.hasJoined ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-xs">{new Date(referral.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-2 space-x-1 flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setDetailsDialogOpen(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {referral.hasJoined && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReferral(referral.id)}
                          >
                            Remove
                          </Button>
                        )}
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
            <DialogDescription>
              Information about this referral submission
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Referrer</label>
                <p className="text-sm text-muted-foreground">
                  {selectedReferral.referrerFirstName} {selectedReferral.referrerLastName}
                </p>
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
              <div>
                <label className="text-sm font-medium">Submitted</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedReferral.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send invitation emails to {selectedReferralIds.size} selected referrals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={bulkEmailMessage}
                onChange={(e) => setBulkEmailMessage(e.target.value)}
                placeholder="Email message"
                className="w-full mt-1 px-3 py-2 border border-border rounded-md text-sm h-32"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setBulkEmailDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendBulkEmail}
                disabled={sendBulkEmailMutation.isPending}
              >
                {sendBulkEmailMutation.isPending ? "Sending..." : "Send Emails"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

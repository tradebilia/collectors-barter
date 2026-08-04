import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export type ComposeMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: number;
    displayName: string;
    avatarUrl?: string | null;
  };
  /** Optional pre-filled subject (e.g. "Re: [Item Name]") */
  defaultSubject?: string;
  /** Optional item ID for item-specific messages */
  itemId?: number;
};

export function ComposeMessageModal({ isOpen, onClose, recipient, defaultSubject, itemId }: ComposeMessageModalProps) {
  const [, setLocation] = useLocation();
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");

  // Use sendInquiry if itemId is present, otherwise use sendDirectMessage
  const sendInquiryMutation = trpc.market.sendInquiry.useMutation({
    onSuccess: (data) => {
      toast.success(`Message sent to ${recipient.displayName}!`);
      setSubject("");
      setBody("");
      onClose();
      // Navigate to the inquiry thread in the inbox
      setLocation(`/messages?inquiry=${recipient.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  const sendDirectMessageMutation = trpc.market.sendDirectMessage.useMutation({
    onSuccess: (data) => {
      toast.success(`Message sent to ${recipient.displayName}!`);
      setSubject("");
      setBody("");
      onClose();
      // Navigate to the thread in the inbox
      setLocation(`/messages?direct=${recipient.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  // Choose the correct mutation based on whether itemId is present
  const sendMutation = itemId ? sendInquiryMutation : sendDirectMessageMutation;

  const handleSend = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    if (itemId) {
      // Send as inquiry
      sendInquiryMutation.mutate({
        listingId: itemId,
        recipientId: recipient.id,
        subject: subject.trim(),
        message: body.trim(),
      });
    } else {
      // Send as direct message
      sendDirectMessageMutation.mutate({
        recipientId: recipient.id,
        subject: subject.trim(),
        body: body.trim(),
      });
    }
  };

  const initials = recipient.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7f31ff]/10">
              <Mail className="h-5 w-5 text-[#7f31ff]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">New Message</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">Send a direct message to this collector</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* To field */}
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-8">To</span>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={recipient.avatarUrl ?? undefined} alt={recipient.displayName} />
              <AvatarFallback className="text-xs bg-[#7f31ff]/10 text-[#7f31ff] font-bold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold text-slate-800">{recipient.displayName}</span>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="dm-subject" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</Label>
            <Input
              id="dm-subject"
              placeholder="What is this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl border-slate-200 focus-visible:ring-[#7f31ff]/30"
              maxLength={255}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="dm-body" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</Label>
            <Textarea
              id="dm-body"
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-xl border-slate-200 focus-visible:ring-[#7f31ff]/30 min-h-[140px] resize-none"
              maxLength={5000}
            />
            <p className="text-right text-xs text-slate-400">{body.length}/5000</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200"
            onClick={onClose}
            disabled={sendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-[#7f31ff] hover:bg-[#6a29d6] font-bold px-6"
            onClick={handleSend}
            disabled={sendMutation.isPending || !subject.trim() || !body.trim()}
          >
            {sendMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Message</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

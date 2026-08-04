import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface EmailInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: number;
    title: string;
    imageUrl?: string;
  };
  recipientId: number;
}

export function EmailInquiryModal({
  isOpen,
  onClose,
  listing,
  recipientId,
}: EmailInquiryModalProps) {
  const [subject, setSubject] = useState(`Question about ${listing.title}`);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendInquiry = trpc.market.sendInquiry.useMutation({
    onSuccess: () => {
      setMessage("");
      setSubject(`Question about ${listing.title}`);
      onClose();
    },
    onError: (error) => {
      console.error("Error sending inquiry:", error);
    },
  });

  const handleSubmit = async () => {
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await sendInquiry.mutateAsync({
        listingId: listing.id,
        recipientId,
        subject,
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message Owner</DialogTitle>
        </DialogHeader>

        {/* Item Context Header */}
        <div className="flex gap-3 mb-4 pb-4 border-b">
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{listing.title}</p>
            <p className="text-xs text-muted-foreground">Item #{listing.id}</p>
          </div>
        </div>

        {/* Subject Line */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="text-sm"
          />
        </div>

        {/* Message Body */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-24 text-sm resize-none"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/5000
          </p>
        </div>

        {/* Error Message */}
        {sendInquiry.isError && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
            {sendInquiry.error?.message || "Failed to send inquiry"}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting || sendInquiry.isPending}
          >
            {isSubmitting || sendInquiry.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

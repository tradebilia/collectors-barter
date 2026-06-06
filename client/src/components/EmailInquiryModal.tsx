import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';

interface EmailInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: number;
  listingId: number;
  listingTitle: string;
  listingImage?: string;
}

export function EmailInquiryModal({
  isOpen,
  onClose,
  recipientId,
  listingId,
  listingTitle,
  listingImage,
}: EmailInquiryModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sendInquiry = trpc.inquiry.send.useMutation();

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await sendInquiry.mutateAsync({
        recipientId,
        listingId,
        subject: `Question about ${listingTitle}`,
        message: message.trim(),
      });

      setMessage('');
      onClose();
    } catch (error) {
      console.error('Failed to send inquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Header with item context */}
        <div className="flex items-center gap-4 pb-4 border-b">
          {listingImage && (
            <img
              src={listingImage}
              alt={listingTitle}
              className="h-16 w-16 object-contain rounded"
            />
          )}
          <div className="flex-1">
            <DialogHeader>
              <DialogTitle>Send Inquiry</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 mt-1">About: {listingTitle}</p>
          </div>
        </div>

        {/* Email form */}
        <div className="space-y-4 py-4">
          {/* Subject line (read-only) */}
          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <Input
              type="text"
              value={`Question about ${listingTitle}`}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          {/* Message body */}
          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <Textarea
              placeholder="Ask your question here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-32"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length} / 5000 characters
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSubmitting || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

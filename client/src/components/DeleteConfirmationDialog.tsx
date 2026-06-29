import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  itemCount: number;
  itemTitles?: string[];
  onConfirm: (deletionReason?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  itemCount,
  itemTitles = [],
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setError('');
      await onConfirm(deletionReason || undefined);
      // Reset state after successful deletion
      setDeletionReason('');
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancel = () => {
    setDeletionReason('');
    setConfirmed(false);
    setError('');
    onCancel();
  };

  const isSingleItem = itemCount === 1;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            {isSingleItem ? 'Delete Listing?' : `Delete ${itemCount} Listings?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSingleItem ? (
              <div className="space-y-2">
                <p>Are you sure you want to delete this listing?</p>
                {itemTitles[0] && (
                  <p className="font-medium text-gray-900">"{itemTitles[0]}"</p>
                )}
                <p className="text-sm text-red-600">This action cannot be undone.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>Are you sure you want to delete {itemCount} listings?</p>
                {itemTitles.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                    {itemTitles.map((title, idx) => (
                      <p key={idx} className="text-gray-700 truncate">
                        • {title}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-red-600">This action cannot be undone.</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Deletion Reason (Optional)
            </label>
            <Textarea
              placeholder="Enter reason for deletion (e.g., duplicate, inappropriate content, etc.)"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="min-h-20 resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm text-gray-700 cursor-pointer leading-tight"
            >
              I understand this will permanently delete {isSingleItem ? 'this listing' : 'these listings'} and cannot be undone
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!confirmed || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

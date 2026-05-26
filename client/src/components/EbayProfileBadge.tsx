import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EbayProfileBadgeProps {
  userId: number;
  ebayUsername?: string | null;
  ebayFeedbackScore?: number | null;
  ebayFeedbackPercentage?: number | null;
  ebayMemberSince?: Date | null;
  ebayConnectedAt?: Date | null;
}

export function EbayProfileBadge({
  userId,
  ebayUsername,
  ebayFeedbackScore,
  ebayFeedbackPercentage,
  ebayMemberSince,
  ebayConnectedAt,
}: EbayProfileBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const feedbackQuery = trpc.ebay.getFeedback.useQuery(undefined, {
    enabled: showDetails && !!ebayUsername,
  });

  if (!ebayUsername) {
    return null;
  }

  const isLowFeedback = ebayFeedbackPercentage && ebayFeedbackPercentage < 95;
  const isExcellent = ebayFeedbackPercentage && ebayFeedbackPercentage >= 98;

  return (
    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Badge
            variant={isLowFeedback ? "destructive" : "default"}
            className={isExcellent ? "bg-green-600" : ""}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            eBay Verified
          </Badge>
          <span className="text-sm font-medium text-gray-700">{ebayUsername}</span>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>eBay Feedback</DialogTitle>
          <DialogDescription>
            Verified feedback from {ebayUsername} on eBay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLowFeedback && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This user has below 95% positive feedback on eBay.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Feedback Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {ebayFeedbackScore || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Positive Feedback</p>
              <p className="text-2xl font-bold text-gray-900">
                {ebayFeedbackPercentage?.toFixed(1)}%
              </p>
            </div>
          </div>

          {ebayMemberSince && (
            <div className="text-sm text-gray-600">
              <p>Member since {new Date(ebayMemberSince).toLocaleDateString()}</p>
            </div>
          )}

          {ebayConnectedAt && (
            <div className="text-xs text-gray-500">
              Last verified: {new Date(ebayConnectedAt).toLocaleDateString()}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recent Feedback</h4>
            {feedbackQuery.isLoading ? (
              <p className="text-sm text-gray-600">Loading feedback...</p>
            ) : feedbackQuery.data && feedbackQuery.data.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {feedbackQuery.data.slice(0, 10).map((feedback) => (
                  <div
                    key={feedback.id}
                    className="rounded border border-gray-200 p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {feedback.from}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          feedback.rating === "positive"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : feedback.rating === "negative"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-gray-200 bg-gray-50"
                        }
                      >
                        {feedback.rating}
                      </Badge>
                    </div>
                    {feedback.comment && (
                      <p className="mt-1 text-gray-600">{feedback.comment}</p>
                    )}
                    {feedback.itemTitle && (
                      <p className="mt-1 text-xs text-gray-500">
                        Item: {feedback.itemTitle}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(feedback.feedbackDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No feedback available</p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              window.open(`https://www.ebay.com/usr/${ebayUsername}`, "_blank")
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on eBay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

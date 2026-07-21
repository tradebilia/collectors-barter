import React from "react";
import { trpc } from "@/lib/trpc";
import { Star } from "lucide-react";

interface EbayFeedbackPreviewProps {
  userId: string;
}

export const EbayFeedbackPreview: React.FC<EbayFeedbackPreviewProps> = ({ userId }) => {
  const { data: feedback, isLoading } = trpc.ebay.getPublicFeedback.useQuery({ userId: parseInt(userId) });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
        <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!feedback || feedback.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent eBay Feedback</h3>
      <div className="space-y-2">
        {feedback.slice(0, 3).map((item, idx) => (
          <div key={idx} className="bg-slate-50/50 p-2 rounded-lg border border-slate-50">
            <div className="flex items-center gap-1 mb-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-2 w-2 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                {new Date(item.feedbackDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 line-clamp-2 italic leading-tight">
              "{item.comment}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

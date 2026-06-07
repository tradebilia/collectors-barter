import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { OnlineIndicator } from "./OnlineIndicator";

interface CarouselItem {
  id: number;
  title: string;
  price: string;
  subtitle: string;
  imageUrl: string;
  href?: string;
  tradeListingId: number | null;
  savedToWatchlist: boolean;
  ownerId: number | null;
  estimatedValue?: number | null;
}

interface RecentlyAddedCarouselProps {
  items: CarouselItem[];
  onBeginProposal: (listingId: number) => void;
  user: any;
  isAuthenticated?: boolean;
  createProposalMutation?: any;
  watchlistMutation?: any;
  proposalDraft?: any;
  setProposalDraft?: any;
  onRefresh?: () => void;
}

export function RecentlyAddedCarousel({
  items,
  onBeginProposal,
  user,
  isAuthenticated = false,
  createProposalMutation,
  watchlistMutation,
  proposalDraft,
  setProposalDraft,
}: RecentlyAddedCarouselProps) {
  if (items.length === 0) return null;

  // Duplicate items to ensure enough content for the marquee
  const displayItems = [...items, ...items, ...items, ...items];

  return (
    <div className="mt-4 relative overflow-hidden group">
      {/* Marquee Container */}
      <div className="flex gap-4 animate-scroll whitespace-nowrap py-4">
        {displayItems.map((item, index) => (
          <div 
            key={`${item.id}-${index}`} 
            className="inline-block w-[220px] flex-shrink-0"
          >
            <Card 
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer h-full"
              onClick={() => item.href && (window.location.href = item.href)}
            >
              {item.ownerId && (
                <div className="px-3 py-0 -mb-2">
                  <OnlineIndicator sellerId={item.ownerId} />
                </div>
              )}
              <div className="aspect-[0.75] overflow-hidden bg-slate-100 relative group/img">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors" />
              </div>
              
              <CardContent className="p-3 space-y-2">
                <div className="min-h-[40px]">
                  <p className="line-clamp-2 text-xs font-bold leading-tight text-slate-900 whitespace-normal">
                    {item.title}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#7a46ff]">{item.price}</p>
                  <p className="text-[10px] font-medium text-slate-400">{item.subtitle}</p>
                </div>

                <div className="flex gap-2 pt-1">
                  {isAuthenticated && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="h-7 flex-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7a46ff] hover:bg-[#6232eb]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBeginProposal(item.tradeListingId ?? 0);
                          }}
                          disabled={item.ownerId ? user?.id === item.ownerId : false}
                        >
                          Trade
                        </Button>
                      </DialogTrigger>
                      {createProposalMutation && (
                        <DialogContent className="max-w-2xl rounded-[2rem]">
                          <DialogHeader>
                            <DialogTitle className="text-3xl">Create a Trade Proposal</DialogTitle>
                            <DialogTitle className="text-sm font-normal text-slate-500">
                              For <span className="font-bold text-slate-900">{item.title}</span>
                            </DialogTitle>
                          </DialogHeader>
                          <form
                            className="space-y-4 mt-4"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (proposalDraft && setProposalDraft && createProposalMutation) {
                                await createProposalMutation.mutateAsync(proposalDraft);
                              }
                            }}
                          >
                            <div className="space-y-2">
                              <Label>Message</Label>
                              <Textarea
                                value={proposalDraft?.note ?? ""}
                                onChange={(e) => setProposalDraft?.((current: any) => ({ ...current, note: e.target.value }))}
                                placeholder="Introduce yourself and explain your interest..."
                                className="min-h-[120px] rounded-xl"
                              />
                            </div>
                            <Button type="submit" className="w-full rounded-full py-6 text-lg font-bold" disabled={createProposalMutation?.isPending}>
                              {createProposalMutation?.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Send Proposal
                            </Button>
                          </form>
                        </DialogContent>
                      )}
                    </Dialog>
                  )}
                  
                  {isAuthenticated && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 rounded-full p-0 border-slate-200 hover:bg-slate-50"
                      disabled={watchlistMutation?.isPending || !item.tradeListingId}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.tradeListingId
                          ? watchlistMutation?.mutate({ listingId: item.tradeListingId })
                          : toast.info("Add live listings to use the Watchlist.");
                      }}
                    >
                      <Heart className={`h-3.5 w-3.5 ${item.savedToWatchlist ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Gradient Overlays for Fade Effect */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
    </div>
  );
}

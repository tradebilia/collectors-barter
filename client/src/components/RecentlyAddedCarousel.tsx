import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

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
  onRefresh,
}: RecentlyAddedCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [displayItems, setDisplayItems] = useState<CarouselItem[]>([]);

  // Initialize display items with multiple copies for seamless infinite scroll
  useEffect(() => {
    if (items.length === 0) return;
    
    // Create 3 copies of items for smooth infinite scrolling
    // This ensures there's always content to scroll to
    setDisplayItems([...items, ...items, ...items]);
  }, [items]);

  // Auto-scroll carousel right-to-left continuously
  useEffect(() => {
    if (!scrollContainerRef.current || displayItems.length === 0) return;

    const container = scrollContainerRef.current;
    const scrollSpeed = 2; // pixels per frame (increased for more visible scrolling)
    const frameRate = 60; // frames per second

    const scroll = () => {
      if (!container) return;

      // Scroll right (which moves content left - right-to-left effect)
      container.scrollLeft += scrollSpeed;

      // Calculate when to reset: when we've scrolled through one full set of items
      const itemWidth = container.scrollWidth / 3; // Since we have 3 copies
      
      // If we've scrolled past the first set, reset to the beginning
      if (container.scrollLeft >= itemWidth) {
        container.scrollLeft = 0;
      }
    };

    autoScrollIntervalRef.current = setInterval(scroll, 1000 / frameRate);

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [displayItems]);

  // Refresh data every 10 minutes to get newly added items
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Call the refresh callback to fetch new items
      if (onRefresh) {
        onRefresh();
      }
    }, 600000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, [onRefresh]);

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
      >
        {/* Display items 3 times for seamless infinite scroll */}
        {displayItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex-shrink-0 w-[calc(15%-0.3rem)]">
            <Card className="overflow-hidden rounded-none border border-slate-300 bg-white shadow-none h-full cursor-pointer transition hover:shadow-md" onClick={() => item.href && (window.location.href = item.href)}>
              <div className="aspect-[0.68] overflow-hidden bg-[#f0ebe5] group">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                />
              </div>
              <CardContent className="space-y-0.5 px-1.5 py-1.5">
                <p className="line-clamp-2 text-[10px] font-medium leading-3.5 text-slate-900">{item.title}</p>
                <p className="text-[10px] text-[#7a46ff]">{item.price}</p>
                <p className="text-[8px] text-slate-500">{item.subtitle}</p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {isAuthenticated && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="h-5 rounded-full px-1.5 text-[9px]"
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
                          <DialogDescription>
                            Send an expression of interest for <span className="font-semibold text-foreground">{item.title}</span>
                          </DialogDescription>
                        </DialogHeader>
                        {isAuthenticated ? (
                          <form
                            className="space-y-5"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (proposalDraft && setProposalDraft && createProposalMutation) {
                                await createProposalMutation.mutateAsync(proposalDraft);
                              }
                            }}
                          >
                            <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                              Your Trade Proposal starts as an expression of interest.
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`proposal-note-${item.id}`}>Message</Label>
                              <Textarea
                                id={`proposal-note-${item.id}`}
                                value={proposalDraft?.note ?? ""}
                                onChange={(e) => setProposalDraft?.((current: any) => ({ ...current, note: e.target.value }))}
                                placeholder="Introduce yourself..."
                                rows={5}
                              />
                            </div>
                            <Button type="submit" className="rounded-full" disabled={createProposalMutation?.isPending}>
                              {createProposalMutation?.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Send Trade Proposal
                            </Button>
                          </form>
                        ) : (
                          <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-muted/40 p-6">
                            <p className="text-sm leading-7 text-muted-foreground">
                              You need a subscriber account to send Trade Proposals.
                            </p>
                            <Button className="rounded-full" onClick={() => (window.location.href = getLoginUrl())}>
                              Subscriber Sign In
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    )}
                  </Dialog>
                  )}
                  {isAuthenticated && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 rounded-full px-1.5 text-[9px]"
                    disabled={watchlistMutation?.isPending || !item.tradeListingId}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.tradeListingId
                        ? watchlistMutation?.mutate({ listingId: item.tradeListingId })
                        : toast.info("Add live listings to use the Watchlist.");
                    }}
                  >
                    <Heart className={`mr-1 h-3 w-3 ${item.savedToWatchlist ? "fill-current" : ""}`} />
                    Save
                  </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { OnlineIndicator } from "./OnlineIndicator";
import { formatGrade } from "@/lib/tradebilia";

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
  category?: string | null;
  certificationCompany?: string | null;
  customGradingCompany?: string | null;
  grade?: string | null;
  conditionLabel?: string | null;
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
  if (items.length === 0) {
    return (
      <div className="mt-4 text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No Items Listed</p>
        <p className="text-sm mt-1">Check back soon for new collectibles</p>
      </div>
    );
  }

  const formatWholeDollar = (value?: number | null, fallback = "$0") => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `$${Math.round(numericValue).toLocaleString("en-US")}` : fallback;
  };

  const getCategoryBadgeClass = (category?: string | null) => {
    const normalized = category?.trim().toLowerCase() || "";
    if (normalized.includes("sport")) return "bg-red-100 text-red-800 ring-red-200";
    if (normalized.includes("comic")) return "bg-violet-100 text-violet-800 ring-violet-200";
    if (normalized.includes("pokemon")) return "bg-yellow-100 text-yellow-900 ring-yellow-200";
    if (normalized.includes("coin")) return "bg-amber-100 text-amber-900 ring-amber-200";
    if (normalized.includes("stamp")) return "bg-sky-100 text-sky-800 ring-sky-200";
    if (normalized.includes("movie")) return "bg-rose-100 text-rose-800 ring-rose-200";
    if (normalized.includes("autograph")) return "bg-purple-100 text-purple-800 ring-purple-200";
    return "bg-blue-100 text-blue-800 ring-blue-200";
  };

  const getGradeOrConditionPresentation = (item: CarouselItem) => {
    const hasGrade = Boolean(item.grade && Number(item.grade) > 0);
    if (!hasGrade) {
      const condition = item.conditionLabel?.trim() || "Ungraded";
      return {
        text: condition,
        title: condition,
      };
    }
    const declaredCompany = item.certificationCompany?.trim() || "";
    const company = declaredCompany.toLowerCase() === "other"
      ? item.customGradingCompany?.trim() || declaredCompany
      : declaredCompany || "Graded";
    const grade = formatGrade(item.grade!);
    return { text: `${company} ${grade}`, title: `${company} ${grade}` };
  };

  // Duplicate items once for seamless loop
  const displayItems = [...items, ...items];

  return (
    <div className="mt-1 relative overflow-hidden group">
      {/* Marquee Container */}
      <div className="flex gap-4 animate-scroll whitespace-nowrap py-2">
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
              <div className="aspect-[0.75] overflow-hidden bg-transparent relative group/img">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors" />
              </div>

              <CardContent className="p-3 space-y-2">
                <div className="min-h-[40px] space-y-0.5">
                  <p className="line-clamp-2 text-xs font-bold leading-tight text-slate-900 whitespace-normal">
                    {item.title}
                  </p>
                  <span className={`inline-flex max-w-full items-center rounded-md px-1.5 py-0 text-[9px] font-extrabold leading-4 ring-1 ${getCategoryBadgeClass(item.category)}`} title={getGradeOrConditionPresentation(item).title}>
                    {getGradeOrConditionPresentation(item).text}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#2458a6]">{formatWholeDollar(item.estimatedValue, item.price)}</p>
                  <p className="text-[10px] font-medium text-slate-400">{item.subtitle}</p>
                </div>

                <div className="flex gap-1.5 pt-0.5">
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

      {/* Removed gradient overlays for true edge-to-edge look */}
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getLoginUrl } from "@/const";

import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { getTradebiliaCategoryLabel, formatGrade, formatWholeDollar, formatItemValue } from "@/lib/tradebilia";
import { getDisplayedGradingCompany } from "@/lib/gradingDisplay";
import { Download, Loader2, Menu, MessageSquareText, Pencil, Plus, Search, Share2, Trash2, Eye, EyeOff } from "lucide-react";
import { TopRightIcons } from "@/components/TopRightIcons";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

const categoryLinks = [
  { value: "comics", label: "Comics" },
  { value: "sports_cards", label: "Sports Cards" },
  { value: "vintage_toys", label: "Vintage Toys" },
  { value: "video_games", label: "Video Games" },
  { value: "stamps", label: "Stamps" },
  { value: "coins", label: "Coins" },
  { value: "pokemon", label: "Pokemon" },
  { value: "movies", label: "Movies" },
  { value: "autographs", label: "Autographs" },
  { value: "disney_pins", label: "Disney Pins" },
] as const;

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "TB"
  );
}

export default function Inventory() {
  const { user, isAuthenticated } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date_added");
  const [graderCompany, setGraderCompany] = useState("all");
  const [gradeRange, setGradeRange] = useState("all");
  const [condition, setCondition] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [showDrafts, setShowDrafts] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const [undoData, setUndoData] = useState<{ deletedListings: any[]; deletedPhotos: any[]; expiresAt: number } | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const toggleListingStatusMutation = trpc.market.toggleListingStatus.useMutation();
  const bulkUpdateStatusMutation = trpc.market.bulkUpdateListingStatus.useMutation();
  const bulkDeleteMutation = trpc.market.bulkDeleteListings.useMutation();
  const deleteDraftMutation = trpc.market.deleteDraft.useMutation();
  const restoreMutation = trpc.market.restoreDeletedListings.useMutation();
  const utils = trpc.useUtils();

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map((l: any) => l.id)));
    }
  };

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const getDraftsQuery = trpc.market.getDrafts.useQuery(undefined, {
    enabled: isAuthenticated && showDrafts,
  });

  const handleToggleListingStatus = useCallback(
    async (listingId: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTogglingId(listingId);
      try {
        const listing = listings.find((l: any) => l.id === listingId);
        const newStatus = !listing?.isActive;
        await toggleListingStatusMutation.mutateAsync({ listingId, isActive: newStatus });
        await dashboardQuery.refetch();
        toast.success("Listing status updated");
      } catch (error) {
        toast.error("Failed to update listing status");
      } finally {
        setTogglingId(null);
      }
    },
    [toggleListingStatusMutation, dashboardQuery],
  );

  const handleBulkActivate = useCallback(
    async () => {
      console.log('[handleBulkActivate] Button clicked! selectedIds:', selectedIds);
      if (selectedIds.size === 0) {
        console.log('[handleBulkActivate] No items selected, returning');
        return;
      }
      setBulkUpdatingStatus(true);
      const count = selectedIds.size;
      try {
        const firstSelectedId = Array.from(selectedIds)[0];
        const firstItem = listings.find((l: any) => l.id === firstSelectedId);
        const currentStatus = firstItem?.isActive ?? false;
        const newStatus = !currentStatus;
        console.log('[handleBulkActivate] selectedIds:', selectedIds, 'firstItem:', firstItem, 'currentStatus:', currentStatus, 'newStatus:', newStatus);
        
        await bulkUpdateStatusMutation.mutateAsync({
          listingIds: Array.from(selectedIds),
          newStatus: newStatus,
        });
        setSelectedIds(new Set());
        await dashboardQuery.refetch();
        await utils.market.feed.invalidate();
        await utils.market.feed.refetch({ category: undefined, condition: undefined, keyword: "" }).catch(() => {});
        const action = newStatus ? 'activated' : 'hidden';
        toast.success(`${count} item(s) ${action}`);
      } catch (error) {
        toast.error("Failed to activate items");
      } finally {
        setBulkUpdatingStatus(false);
      }
    },
    [selectedIds, bulkUpdateStatusMutation, dashboardQuery, utils],
  );

  const handleBulkNotListed = useCallback(
    async () => {
      if (selectedIds.size === 0) return;
      setBulkUpdatingStatus(true);
      try {
        await bulkUpdateStatusMutation.mutateAsync({
          listingIds: Array.from(selectedIds),
          newStatus: false,
        });
        setSelectedIds(new Set());
        await dashboardQuery.refetch();
        toast.success(`${selectedIds.size} item(s) marked as not listed`);
      } catch (error) {
        toast.error("Failed to update items");
      } finally {
        setBulkUpdatingStatus(false);
      }
    },
    [selectedIds, bulkUpdateStatusMutation, dashboardQuery],
  );

  const handleBulkDelete = useCallback(
    async () => {
      if (selectedIds.size === 0) return;
      if (!confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;
      setBulkUpdatingStatus(true);
      try {
        const idsArray = Array.from(selectedIds);
        const draftIds = idsArray
          .filter((id: any) => String(id).startsWith('draft-'))
          .map((id: any) => parseInt(String(id).replace('draft-', '')));
        const listingIds = idsArray
          .filter((id: any) => !String(id).startsWith('draft-'))
          .map((id: any) => id as number);

        if (draftIds.length > 0) {
          for (const draftId of draftIds) {
            await deleteDraftMutation.mutateAsync({ draftId });
          }
        }

        if (listingIds.length > 0) {
          await bulkDeleteMutation.mutateAsync({
            listingIds,
          });
        }
        
        const expiresAt = Date.now() + 30000;
        setUndoData({
          deletedListings: [],
          deletedPhotos: [],
          expiresAt,
        });
        
        if (undoTimer) clearTimeout(undoTimer);
        const timer = setTimeout(() => {
          setUndoData(null);
        }, 30000);
        setUndoTimer(timer);
        
        setSelectedIds(new Set());
        await dashboardQuery.refetch();
        if (showDrafts) {
          await getDraftsQuery.refetch();
        }
        // Invalidate market.feed cache so carousel updates
        // Invalidate all market.feed queries regardless of parameters
        await utils.market.feed.invalidate();
        // Also try to refetch with common default parameters
        await utils.market.feed.refetch({ category: undefined, condition: undefined, keyword: "" }).catch(() => {});
        toast.success(`${selectedIds.size} item(s) deleted`);
      } catch (error) {
        console.error("Bulk delete error:", error);
        toast.error("Failed to delete items");
      } finally {
        setBulkUpdatingStatus(false);
      }
    },
    [selectedIds, bulkDeleteMutation, deleteDraftMutation, dashboardQuery, getDraftsQuery, showDrafts, utils],
  );

  const handleUndo = useCallback(
    async () => {
      if (!undoData) return;
      try {
        await restoreMutation.mutateAsync({
          deletedListings: undoData.deletedListings,
          deletedPhotos: undoData.deletedPhotos,
        });
        setUndoData(null);
        if (undoTimer) clearTimeout(undoTimer);
        setUndoTimer(null);
        await dashboardQuery.refetch();
        // Invalidate market.feed cache so carousel updates
        await utils.market.feed.invalidate();
        // Also try to refetch with common default parameters
        await utils.market.feed.refetch({ category: undefined, condition: undefined, keyword: "" }).catch(() => {});
        toast.success("Items restored successfully");
      } catch (error) {
        toast.error("Failed to restore items");
      }
    },
    [undoData, restoreMutation, dashboardQuery, undoTimer],
  );

  const listings = dashboardQuery.data?.ownListings ?? [];
  const profile = dashboardQuery.data?.profile;

  const filteredListings = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    
    // If showing drafts, return drafts from database
    if (showDrafts) {
      const dbDrafts = getDraftsQuery.data || [];
      console.log('getDraftsQuery.data:', getDraftsQuery.data);
      console.log('getDraftsQuery.isLoading:', getDraftsQuery.isLoading);
      console.log('getDraftsQuery.error:', getDraftsQuery.error);
      const drafts: any[] = dbDrafts.map((draft: any) => ({
        id: `draft-${draft.id}`,
        title: draft.title,
        category: draft.category,
        grade: draft.grade,
        graderCompany: draft.graderCompany,
        certificationNumber: draft.certificationNumber,
        estimatedValue: draft.estimatedValue,
        categoryFields: draft.categoryFields,
        additionalNotes: draft.additionalNotes,
        photos: draft.photos || [],
        status: 'draft',
        isActive: false,
        categoryLabel: getTradebiliaCategoryLabel(draft.category),
        conditionLabel: 'Draft',
        condition: 'draft',
        primaryPhotoUrl: draft.photos?.[0]?.previewUrl || null,
        certificationCompany: draft.graderCompany || null,
        description: draft.title,
      }));
      
      const filteredDrafts = drafts.filter((draft: any) => {
        const matchesKeyword = normalizedKeyword.length === 0 || draft.title?.toLowerCase().includes(normalizedKeyword);
        const matchesCategory = category === 'all' || draft.category === category;
        return matchesKeyword && matchesCategory;
      });
      return filteredDrafts;
    }

    const filtered = listings.filter(listing => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        listing.title.toLowerCase().includes(normalizedKeyword) ||
        listing.description.toLowerCase().includes(normalizedKeyword);
      const matchesCategory = category === "all" || listing.category === category;
      const matchesGrader = graderCompany === "all" || listing.description.toLowerCase().includes(graderCompany.toLowerCase());
      const matchesGradeRange = gradeRange === "all" || listing.description.toLowerCase().includes(gradeRange.toLowerCase());
      const matchesCondition = condition === "all" || listing.condition === condition;
      const matchesStatus = status === "all" || (status === "listed" ? listing.isActive : !listing.isActive);
      const listingValue = Number(listing.estimatedValue) || 0;
      const matchesMinValue = minValue === "" || listingValue >= Number(minValue);
      const matchesMaxValue = maxValue === "" || listingValue <= Number(maxValue);
      // Implement date range filtering
      let matchesDateRange = true;
      if (dateRange !== "all" && listing.createdAt) {
        const listingDate = new Date(listing.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateRange === "today") {
          const listingDateOnly = new Date(listingDate);
          listingDateOnly.setHours(0, 0, 0, 0);
          matchesDateRange = listingDateOnly.getTime() === today.getTime();
        } else if (dateRange === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDateRange = listingDate >= weekAgo && listingDate <= today;
        } else if (dateRange === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDateRange = listingDate >= monthAgo && listingDate <= today;
        } else if (dateRange === "year") {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          matchesDateRange = listingDate >= yearAgo && listingDate <= today;
        }
      }

      return matchesKeyword && matchesCategory && matchesGrader && matchesGradeRange && matchesCondition && matchesStatus && matchesMinValue && matchesMaxValue && matchesDateRange;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      if (sortBy === "value") {
        const aVal = Number(a.estimatedValue) || 0;
        const bVal = Number(b.estimatedValue) || 0;
        return bVal - aVal;
      }
      if (sortBy === "condition") return a.condition.localeCompare(b.condition);
      return b.id - a.id;
    });
  }, [category, condition, dateRange, gradeRange, graderCompany, keyword, listings, maxValue, minValue, sortBy, status, showDrafts, getDraftsQuery.data]);

  const exportInventory = () => {
    const payload = filteredListings.map((listing: any) => ({
      title: listing.title,
      category: listing.categoryLabel,
      condition: listing.conditionLabel,
      status: listing.status,
      description: listing.description,
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tradebilia-inventory.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory export downloaded.");
  };

  const shareListing = async (listingId: number) => {
    const url = `${window.location.origin}/listings/${listingId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Listing link copied.");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to manage your inventory.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Browsing Tradebilia is public, but inventory management, Trade Proposals, and member messaging are reserved for signed-in subscribers.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Subscriber Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-950">
      <TopBar
        logoUrl={TRADEBILIA_LOGO_URL}
        searchPlaceholder="Search Inventory..."
        onSearchChange={setKeyword}
      />

      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://assets.tradebilia.com/Background_23084d14.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-[400px] items-center justify-center py-0">
          <div className="flex w-full max-w-6xl -translate-x-[5.56%] items-center justify-center px-4">
            <img
              src="https://assets.tradebilia.com/Myinventory_a9168443.svg"
              alt="My Inventory"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="flex flex-col relative">
        <div className="flex flex-1 flex-col relative lg:flex-row">
          <aside className="w-full border-b border-slate-200 bg-slate-50 p-4 lg:w-64 lg:flex-shrink-0 lg:overflow-y-auto lg:border-r lg:p-6">
            <Card className="border-0 bg-transparent shadow-none">
              <CardContent className="space-y-2 p-3 pt-0">
                <div className="pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Search by Keyword</Label>
                  <Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Search inventory" className="border-slate-300 bg-white text-xs h-8" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoryLinks.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Grading Authority</Label>
                  <Select value={graderCompany} onValueChange={setGraderCompany}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="Select grading company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="cgc">CGC</SelectItem>
                      <SelectItem value="psa">PSA</SelectItem>
                      <SelectItem value="bgs">BGS</SelectItem>
                      <SelectItem value="sgc">SGC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Grade Range</Label>
                  <Select value={gradeRange} onValueChange={setGradeRange}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="1-10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="9">9.0-10.0</SelectItem>
                      <SelectItem value="7">7.0-8.9</SelectItem>
                      <SelectItem value="5">5.0-6.9</SelectItem>
                      <SelectItem value="1">1.0-4.9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="Date Added" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_added">Date Added</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="value">Value (High to Low)</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="mint">Mint</SelectItem>
                      <SelectItem value="near_mint">Near Mint</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="very_good">Very Good</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Value Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minValue}
                      onChange={e => setMinValue(e.target.value)}
                      className="border-slate-300 bg-white text-xs h-8"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxValue}
                      onChange={e => setMaxValue(e.target.value)}
                      className="border-slate-300 bg-white text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="listed">Listed</SelectItem>
                      <SelectItem value="not-listed">Not Listed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Date Added</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs">
                      <SelectValue placeholder="Any Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left">
                    <p className="text-xs font-medium leading-5 text-slate-800">Show draft and unsaved items</p>
                    <Switch checked={showDrafts} onCheckedChange={setShowDrafts} />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setKeyword('');
                    setCategory('all');
                    setGraderCompany('all');
                    setGradeRange('all');
                    setSortBy('date_added');
                    setCondition('all');
                    setMinValue('');
                    setMaxValue('');
                    setStatus('all');
                    setDateRange('all');
                  }}
                  className="w-full bg-slate-300 text-slate-900 hover:bg-slate-400 text-xs h-8 font-medium"
                >
Clear Filters
                  </Button>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1 py-4 px-4">
            {showDrafts && getDraftsQuery.data && getDraftsQuery.data.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-1">Draft Expiration Notice</h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      Drafts are automatically deleted after 30 days. Review your drafts below:
                    </p>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {getDraftsQuery.data.map((draft: any) => {
                        const daysOld = Math.floor((Date.now() - new Date(draft.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                        const daysRemaining = 30 - daysOld;
                        const isExpiringSoon = daysRemaining <= 10;
                        return (
                          <li key={draft.id} className={isExpiringSoon ? "font-semibold text-yellow-900" : ""}>
                            <span className="font-medium">{draft.title || "Untitled Draft"}</span>
                            {isExpiringSoon && (
                              <span className="ml-2 text-red-600 font-bold">
                                WARNING: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                              </span>
                            )}
                            {!isExpiringSoon && (
                              <span className="ml-2 text-yellow-700">
                                ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <div className="px-4 py-2 lg:px-8 border-b border-slate-200 -mx-4 mb-2">
              <div className="relative flex flex-wrap items-center gap-4 lg:min-h-[72px]">
                <div className="flex gap-4">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 min-w-48">
                    <p className="text-xs font-semibold text-blue-600 uppercase">Total Items</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{filteredListings.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200 min-w-48">
                    <p className="text-xs font-semibold text-green-600 uppercase">Total Value</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{formatWholeDollar(filteredListings.reduce((sum: number, l: any) => sum + (Number(l.estimatedValue) || 0), 0))}</p>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center justify-center gap-3 lg:absolute lg:inset-0 lg:z-0 lg:pointer-events-none">
                  <Button className="min-h-14 w-full rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/30 ring-1 ring-blue-300/40 transition hover:from-blue-800 hover:to-indigo-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto lg:pointer-events-auto" onClick={() => (window.location.href = "/inventory/new")}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add Item to Inventory
                  </Button>
                </div>

                  <div className="flex w-full flex-wrap items-center justify-center gap-3 lg:relative lg:z-10 lg:ml-auto lg:w-auto lg:flex-nowrap">
                    <Button className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleBulkDelete} disabled={selectedIds.size === 0 || bulkUpdatingStatus}>
                    {bulkUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete Selected ({selectedIds.size})
                    </Button>
                  <Button className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleBulkActivate} disabled={selectedIds.size === 0 || bulkUpdatingStatus}>
                    {bulkUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                    Activate ({selectedIds.size})
                  </Button>
                  <Button className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleBulkNotListed} disabled={selectedIds.size === 0 || bulkUpdatingStatus}>
                    {bulkUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
                    Not Listed ({selectedIds.size})
                  </Button>
                    {undoData && (
                      <Button className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm" onClick={handleUndo} disabled={restoreMutation.isPending}>
                        Undo ({Math.ceil((undoData.expiresAt - Date.now()) / 1000)}s)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectedIds.size === filteredListings.length && filteredListings.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">Select All</label>
                </div>

              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {filteredListings.map((listing: any) => (
                <Card key={listing.id} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow rounded-lg">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <input
                        type="checkbox"
                        id={`item-${listing.id}`}
                        checked={selectedIds.has(listing.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds);
                          if (e.target.checked) {
                            newSelected.add(listing.id);
                          } else {
                            newSelected.delete(listing.id);
                          }
                          setSelectedIds(newSelected);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      {showDrafts ? (
                        <div className="rounded-full text-xs font-semibold px-3 py-1 bg-yellow-100 text-yellow-700">
                          <span>Draft</span>
                        </div>
                      ) : listing.status === 'traded' ? (
                        <div className="rounded-full text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-700 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          Traded
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => handleToggleListingStatus(listing.id, e)}
                                disabled={togglingId === listing.id}
                                className={`rounded-full text-xs font-semibold px-3 py-1 transition-all ${
                                  listing.isActive
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                } ${togglingId === listing.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                {togglingId === listing.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                                ) : listing.isActive ? (
                                  <Eye className="h-3 w-3 inline mr-1" />
                                ) : (
                                  <EyeOff className="h-3 w-3 inline mr-1" />
                                )}
                                {listing.isActive ? "Active" : "Not Listed"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{listing.isActive ? "Click to hide this listing from search" : "Click to show this listing in search"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Link href={`/listings/${listing.id}`} className="block relative">
                      <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className="h-full w-full object-contain"
                        />
                        {showDrafts && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-80 transform -rotate-45 flex items-center justify-center">
                              <span className="text-white font-bold text-lg transform rotate-45">DRAFT</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 mb-1">Ref ID: <span className="font-semibold text-slate-700">#{listing.id}</span></div>
                          <Link href={`/listings/${listing.id}`} className="block">
                            <h3 className="text-lg font-bold leading-snug text-slate-900 line-clamp-2 hover:text-blue-600 transition">{listing.title}</h3>
                          </Link>
                        </div>
                        <button type="button" onClick={() => shareListing(listing.id)} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0" title="Share listing">
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-slate-600"><strong>Category:</strong> {listing.categoryLabel}</span></div>
                        <div><span className="text-slate-600"><strong>Grade:</strong> {listing.grade && listing.grade !== 'ungraded' ? formatGrade(listing.grade) : 'Not graded'}</span></div>
                        {listing.certificationCompany ? (
                          <div><span className="text-slate-600"><strong>Certification:</strong> {getDisplayedGradingCompany(listing.certificationCompany, listing.customGradingCompany)}</span></div>
                        ) : (
                          <div><span className="text-slate-600"><strong>Condition:</strong> {listing.condition.replace(/_/g, ' ').charAt(0).toUpperCase() + listing.condition.replace(/_/g, ' ').slice(1)}</span></div>
                        )}
                        <div><span className="text-slate-600"><strong>Value:</strong> {listing.estimatedValue !== null && listing.estimatedValue !== undefined ? formatItemValue(listing.estimatedValue) : 'Not specified'}</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/inventory/edit/${listing.id}`} className="flex-1">
                          <Button variant="outline" className="w-full text-slate-700 border-slate-300 hover:bg-slate-50">
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="px-3 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setListingToDelete(listing.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredListings.length === 0 ? (
                <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-xl font-semibold text-slate-900">No inventory items match these filters.</p>
                  <p className="mt-3 text-slate-600">Adjust the filter rail or add a new collectible to expand your Trade Proposal options.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this item from your inventory? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (listingToDelete) {
                    try {
                      const isDraft = String(listingToDelete).startsWith('draft-');
                      if (isDraft) {
                        const draftId = parseInt(String(listingToDelete).replace('draft-', ''));
                        await deleteDraftMutation.mutateAsync({ draftId });
                      } else {
                        await bulkDeleteMutation.mutateAsync({
                          listingIds: [listingToDelete as number],
                        });
                      }
                      setDeleteDialogOpen(false);
                      setListingToDelete(null);
                      toast.success("Item deleted successfully");
                      await dashboardQuery.refetch();
                      if (showDrafts) {
                        await getDraftsQuery.refetch();
                      }
                    } catch (error) {
                      toast.error("Failed to delete item");
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </main>
    </div>
  );
}

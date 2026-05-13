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
import { useAuth } from "@/_core/hooks/useAuth";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { Download, Loader2, Menu, MessageSquareText, Pencil, Plus, Search, Share2, Trash2, Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PageHeader from "@/components/PageHeader";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia_final_spin_fixed(1)_4a57dd7d.svg";

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
  const { user, isAuthenticated, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date_added");
  const [tradeOnly, setTradeOnly] = useState(false);
  const [graderCompany, setGraderCompany] = useState("all");
  const [gradeRange, setGradeRange] = useState("all");
  const [condition, setCondition] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "not_listed">("all");
  const [dateRange, setDateRange] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleListingStatusMutation = trpc.market.toggleListingStatus.useMutation();

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const listings = dashboardQuery.data?.ownListings ?? [];
  const profile = dashboardQuery.data?.profile;

  // Define filteredListings BEFORE any callbacks that reference it
  const filteredListings = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const filtered = listings.filter(listing => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        listing.title.toLowerCase().includes(normalizedKeyword) ||
        listing.description.toLowerCase().includes(normalizedKeyword);
      const matchesCategory = category === "all" || listing.category === category;
      const matchesTradeOnly = !tradeOnly || listing.status === "active";
      const matchesGrader = graderCompany === "all" || listing.description.toLowerCase().includes(graderCompany.toLowerCase());
      const matchesGradeRange = gradeRange === "all" || listing.description.toLowerCase().includes(gradeRange.toLowerCase());
      const matchesCondition = condition === "all" || listing.condition === condition;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? listing.isActive : !listing.isActive);
      const listingValue = Number(listing.estimatedValue) || 0;
      const matchesMinValue = minValue === "" || listingValue >= Number(minValue);
      const matchesMaxValue = maxValue === "" || listingValue <= Number(maxValue);
      const matchesDateRange = dateRange === "all" || true;

      return matchesKeyword && matchesCategory && matchesTradeOnly && matchesGrader && matchesGradeRange && matchesCondition && matchesStatus && matchesMinValue && matchesMaxValue && matchesDateRange;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.categoryLabel.localeCompare(b.categoryLabel);
      if (sortBy === "value") {
        const aVal = Number(a.estimatedValue) || 0;
        const bVal = Number(b.estimatedValue) || 0;
        return bVal - aVal;
      }
      if (sortBy === "condition") return a.condition.localeCompare(b.condition);
      return b.id - a.id;
    });
  }, [category, condition, dateRange, gradeRange, graderCompany, keyword, listings, maxValue, minValue, sortBy, statusFilter, tradeOnly]);

  // NOW define callbacks that reference filteredListings
  const handleToggleListingStatus = useCallback(
    async (listingId: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTogglingId(listingId);
      try {
        await toggleListingStatusMutation.mutateAsync({ listingId });
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

  const handleBulkToggleStatus = useCallback(
    async () => {
      if (selectedIds.size === 0) return;
      const selectedListings = filteredListings.filter(l => selectedIds.has(l.id));
      const allActive = selectedListings.every(l => l.isActive);
      const action = allActive ? "deactivate" : "activate";
      
      if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedIds.size} selected item(s)?`)) return;
      
      try {
        setTogglingId(-1);
        for (const listingId of selectedIds) {
          await toggleListingStatusMutation.mutateAsync({ listingId });
        }
        await dashboardQuery.refetch();
        setSelectedIds(new Set());
        toast.success(`${selectedIds.size} item(s) ${action}d successfully`);
      } catch (error) {
        toast.error(`Failed to ${action} items`);
      } finally {
        setTogglingId(null);
      }
    },
    [selectedIds, filteredListings, toggleListingStatusMutation, dashboardQuery],
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map(l => l.id)));
    }
  }, [selectedIds.size, filteredListings]);

  const exportInventory = () => {
    const payload = filteredListings.map(listing => ({
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
    link.download = `inventory-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    try {
      await trpc.market.deleteListing.mutate({ listingId: listingToDelete });
      await dashboardQuery.refetch();
      toast.success("Listing deleted successfully");
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    } catch (error) {
      toast.error("Failed to delete listing");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Please log in to view your inventory</p>
            <Button asChild>
              <a href={getLoginUrl("/inventory")}>Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader showSearch={false} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Inventory</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Link>
            </Button>
            <Button onClick={exportInventory} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by title or description..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryLinks.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as "all" | "active" | "not_listed")}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="not_listed">Not Listed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sort">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_added">Recently Added</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="value">Value (High to Low)</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Switch id="tradeOnly" checked={tradeOnly} onCheckedChange={setTradeOnly} />
                <Label htmlFor="tradeOnly">Trade Only</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{selectedIds.size} item(s) selected</span>
                <div className="flex gap-2">
                  <Button onClick={toggleSelectAll} variant="outline" size="sm">
                    Deselect All
                  </Button>
                  <Button onClick={handleBulkToggleStatus} variant="default" size="sm">
                    Toggle Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Grid */}
        {filteredListings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground mb-4">No items found</p>
              <Button asChild>
                <Link href="/inventory/new">Add Your First Item</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img
                    src={resolveTradebiliaListingImage(listing)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleToggleListingStatus(listing.id, e)}
                        disabled={togglingId === listing.id}
                        className="absolute top-2 right-2 z-10"
                      >
                        {togglingId === listing.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        ) : (
                          <Badge className={listing.isActive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
                            {listing.isActive ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 mr-1" />
                                Not Listed
                              </>
                            )}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Click to toggle between Active and Not Listed. Active items are visible in search, Not Listed items are hidden.
                    </TooltipContent>
                  </Tooltip>

                  {/* Select Checkbox */}
                  <button
                    onClick={() => {
                      const newIds = new Set(selectedIds);
                      if (newIds.has(listing.id)) {
                        newIds.delete(listing.id);
                      } else {
                        newIds.add(listing.id);
                      }
                      setSelectedIds(newIds);
                    }}
                    className="absolute top-2 left-2 z-10"
                  >
                    {selectedIds.has(listing.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>

                <CardContent className="pt-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">{listing.title}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground mb-4">
                    <p>Category: {listing.categoryLabel}</p>
                    <p>Condition: {listing.conditionLabel}</p>
                    <p>Value: ${listing.estimatedValue}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/listings/${listing.id}`}>
                        <MessageSquareText className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/inventory/${listing.id}/edit`}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setListingToDelete(listing.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteListing} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

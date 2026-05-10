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
import { Download, Loader2, Menu, MessageSquareText, Pencil, Plus, Search, Share2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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
  const { user, isAuthenticated } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date_added");
  const [tradeOnly, setTradeOnly] = useState(false);
  const [graderCompany, setGraderCompany] = useState("all");
  const [gradeRange, setGradeRange] = useState("all");
  const [condition, setCondition] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedListings.map(l => l.id)));
    }
  };

  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const listings = dashboardQuery.data?.ownListings ?? [];
  const profile = dashboardQuery.data?.profile;

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
      const matchesStatus = status === "all" || listing.status === status;
      const listingValue = Number(listing.estimatedValue) || 0;
      const matchesMinValue = minValue === "" || listingValue >= Number(minValue);
      const matchesMaxValue = maxValue === "" || listingValue <= Number(maxValue);
      const matchesDateRange = dateRange === "all" || true;

      return matchesKeyword && matchesCategory && matchesTradeOnly && matchesGrader && matchesGradeRange && matchesCondition && matchesStatus && matchesMinValue && matchesMaxValue && matchesDateRange;
    });

    let sorted = [...filtered].sort((a, b) => {
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

    if (sortDirection === 'asc') {
      sorted = sorted.reverse();
    }

    return sorted;
  }, [category, condition, dateRange, gradeRange, graderCompany, keyword, listings, maxValue, minValue, sortBy, sortDirection, status, tradeOnly]);

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

  // Pagination logic
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, endIndex);

  // Calculate stats
  const totalValue = filteredListings.reduce((sum, listing) => sum + (Number(listing.estimatedValue) || 0), 0);
  const averageValue = filteredListings.length > 0 ? totalValue / filteredListings.length : 0;
  const conditionCounts = filteredListings.reduce((acc, listing) => {
    acc[listing.condition] = (acc[listing.condition] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostCommonCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between bg-black px-4 py-3">
          <div className="flex items-center gap-4">
            <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-8 w-auto" />
            <div className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  className="rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-white hover:text-slate-200" title="Messages">
              <MessageSquareText className="h-5 w-5" />
            </button>
            <button className="text-white hover:text-slate-200" title="Account Settings">
              <Menu className="h-5 w-5" />
            </button>
            <button className="text-white hover:text-slate-200" title="Notifications">
              <div className="relative">
                <div className="h-5 w-5 rounded-full bg-red-500" />
              </div>
            </button>
          </div>
        </div>

        <nav className="flex gap-6 border-b border-slate-200 bg-black px-4 py-3 text-sm font-semibold uppercase text-white">
          <Link href="/" className="border-b-2 border-white pb-2 text-white hover:text-slate-200">
            HOME
          </Link>
          {categoryLinks.map(link => (
            <Link key={link.value} href={`/category/${link.value}`} className="border-b-2 border-transparent pb-2 text-white hover:border-white hover:text-slate-200">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="relative">
        <div className="h-48 bg-gradient-to-b from-slate-900 to-slate-800 md:h-64">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-8">
              <img src={TRADEBILIA_LOGO_URL} alt="My Inventory" className="h-32 w-auto md:h-40" style={{ marginLeft: '375px' }} />
              <div className="text-white">
                <h1 className="text-4xl font-bold md:text-5xl">MY INVENTORY</h1>
                <p className="mt-2 text-slate-300">Manage and Organize your Collection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 bg-slate-50 px-4 py-6">
        <aside className="fixed left-0 top-64 w-64 bg-white">
          <Card className="border-0 shadow-none">
            <CardContent className="space-y-3 p-4 pt-0">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-800">Search by Item Title or Certification #</Label>
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
                    <SelectItem value="psa">PSA</SelectItem>
                    <SelectItem value="bvg">BGV</SelectItem>
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
                    <SelectItem value="9-10">9-10</SelectItem>
                    <SelectItem value="7-8">7-8</SelectItem>
                    <SelectItem value="5-6">5-6</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-800">Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-slate-300 bg-white h-8 text-xs flex-1">
                      <SelectValue placeholder="Date Added" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_added">Date Added</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="value">Value</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                    className="h-8 w-8 p-0 bg-slate-300 text-slate-900 hover:bg-slate-400"
                    title={`Sort ${sortDirection === 'desc' ? 'ascending' : 'descending'}`}
                  >
                    {sortDirection === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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

              <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-900">Show Only Items</p>
                  <p className="text-xs text-slate-600">Listed for Trade</p>
                </div>
                <Switch checked={tradeOnly} onCheckedChange={setTradeOnly} />
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
                  setTradeOnly(false);
                }}
                className="w-full bg-slate-300 text-slate-900 hover:bg-slate-400 text-xs h-8 font-medium"
              >
                Reset
              </Button>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1 py-8 px-4 ml-64">
          {/* Quick Stats Card */}
          {filteredListings.length > 0 && (
            <div className="mb-6 grid grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-600 font-medium">Total Value</p>
                  <p className="text-2xl font-bold text-blue-900">${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <p className="text-xs text-green-600 font-medium">Average Value</p>
                  <p className="text-2xl font-bold text-green-900">${averageValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <p className="text-xs text-purple-600 font-medium">Total Items</p>
                  <p className="text-2xl font-bold text-purple-900">{filteredListings.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <p className="text-xs text-orange-600 font-medium">Most Common</p>
                  <p className="text-2xl font-bold text-orange-900 capitalize">{mostCommonCondition}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="px-4 py-8 lg:px-8 border-b border-slate-200 -mx-4 -mt-8 -mb-8 px-4 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Your Collection</h2>
                <p className="mt-1 text-slate-600">Total items: {filteredListings.length}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => (window.location.href = "/add-inventory")} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
                <Button onClick={exportInventory} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No items found</h3>
                <p className="text-slate-600 mb-6">Try adjusting your filters or add your first item to get started.</p>
                <Button onClick={() => (window.location.href = "/add-inventory")} className="bg-blue-600 text-white hover:bg-blue-700">
                  Add Your First Item
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <input type="checkbox" id="select-all" checked={selectedIds.size === paginatedListings.length && paginatedListings.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" />
                <label htmlFor="select-all" className="text-sm font-medium text-slate-700">Select All</label>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {paginatedListings.map(listing => (
                  <div key={listing.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative">
                      <img src={resolveTradebiliaListingImage(listing)} alt={listing.title} className="w-full h-40 object-cover" />
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white capitalize">{listing.status}</Badge>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(listing.id)}
                        onChange={e => {
                          const newIds = new Set(selectedIds);
                          if (e.target.checked) {
                            newIds.add(listing.id);
                          } else {
                            newIds.delete(listing.id);
                          }
                          setSelectedIds(newIds);
                        }}
                        className="absolute bottom-2 left-2 rounded border-slate-300"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-2">{listing.title}</h3>
                      <div className="space-y-1 text-xs text-slate-600 mb-3">
                        <p><strong>Category:</strong> {listing.categoryLabel}</p>
                        <p><strong>Grade:</strong> {listing.description.includes('Grade') ? listing.description.split('Grade')[1]?.split('\n')[0]?.trim() : 'Not graded'}</p>
                        <p><strong>Condition:</strong> {listing.conditionLabel}</p>
                        <p><strong>Value:</strong> ${listing.estimatedValue || 'Not specified'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 rounded" title="Share listing" onClick={() => shareListing(listing.id)}>
                          <Share2 className="h-3 w-3 mx-auto" />
                        </button>
                        <Link href={`/inventory/${listing.id}/edit`} className="flex-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 py-1 rounded text-center">
                          Edit
                        </Link>
                        <button className="flex-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded" onClick={() => { setListingToDelete(listing.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredListings.length)} of {filteredListings.length} items
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="text-xs h-8"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="text-xs h-8"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.success("Listing deleted.");
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

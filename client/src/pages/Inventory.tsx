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
import { Download, Loader2, Menu, MessageSquareText, Pencil, Plus, Search, Share2, Trash2 } from "lucide-react";
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredListings.map(l => l.id)));
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
  }, [category, condition, dateRange, gradeRange, graderCompany, keyword, listings, maxValue, minValue, sortBy, status, tradeOnly]);

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
      <div className="border-b border-white/10 bg-black">
        <div className="flex items-center justify-between gap-4 pl-2 pr-4 py-3">
          <div className="flex-shrink-0">
            <img src="/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png" alt="Tradebilia" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 max-w-2xl w-full">
              <Search className="h-4 w-4 text-white/70 flex-shrink-0" />
              <input type="text" placeholder="Search inventory..." className="bg-transparent text-white text-sm placeholder-white/50 outline-none w-full" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Messages">
              <MessageSquareText className="h-5 w-5" />
            </button>
            <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Account Settings">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white" title="Notifications">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
          </div>
        </div>
      </div>

      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url(/manus-storage/hero-background-fullwidth_e851e7cd.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="relative flex w-full h-48 items-center justify-start py-0 sm:h-56 lg:h-64 overflow-hidden pl-8 lg:pl-16" style={{ maxHeight: '300px' }}>
          <img
            src="/manus-storage/Myinventory_467a8c30.svg"
            alt="My Inventory"
            style={{ height: '800px', width: '800px', objectFit: 'contain', maxWidth: '100%', marginLeft: '400px' }}
          />
        </div>
      </section>

      <nav className="relative z-10 border-t border-black bg-black">
        <div className="flex w-full overflow-x-auto">
          <Link
            href="/"
            className="flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] text-white whitespace-nowrap"
          >
            Home
          </Link>
          {categoryLinks.map(categoryLink => (
            <Link
              key={categoryLink.value}
              href={`/category/${categoryLink.value}`}
              className="flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] text-white whitespace-nowrap"
            >
              {categoryLink.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex flex-col relative">
        <div className="flex flex-1 relative">
          <aside className="absolute left-0 top-0 w-64 h-full border-r border-slate-200 bg-slate-50 p-6 overflow-y-auto z-10">
            <Card className="border-0 bg-transparent shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Search by Item Title or Certification #</Label>
                  <Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Search inventory" className="border-slate-300 bg-white" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-slate-300 bg-white">
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
                    <SelectTrigger className="border-slate-300 bg-white">
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
                    <SelectTrigger className="border-slate-300 bg-white">
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
                    <SelectTrigger className="border-slate-300 bg-white">
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
                    <SelectTrigger className="border-slate-300 bg-white">
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
                      className="border-slate-300 bg-white"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxValue}
                      onChange={e => setMaxValue(e.target.value)}
                      className="border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-800">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="border-slate-300 bg-white">
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
                    <SelectTrigger className="border-slate-300 bg-white">
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
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1 py-8 px-4 ml-64">
            <div className="px-4 py-8 lg:px-8 border-b border-slate-200 -mx-4 -mt-8 -mb-8 px-4 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Your Collection</h2>
                  <p className="mt-1 text-slate-600">Total items: {filteredListings.length}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm" onClick={() => (window.location.href = "/inventory/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                  <Button variant="outline" className="rounded-lg border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={exportInventory}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedIds.size === filteredListings.length && filteredListings.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">Select All</label>
              </div>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {filteredListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow rounded-lg">
                  <CardContent className="p-0">
                    <Link href={`/listings/${listing.id}`} className="block">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <Badge variant="secondary" className="rounded-full text-xs font-semibold capitalize bg-blue-100 text-blue-700 border-0">{listing.status}</Badge>
                        </div>
                      </div>
                    </Link>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/listings/${listing.id}`} className="flex-1">
                          <h3 className="font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition">{listing.title}</h3>
                        </Link>
                        <button type="button" onClick={() => shareListing(listing.id)} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0" title="Share listing">
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-slate-600"><strong>Category:</strong> {listing.categoryLabel}</span></div>
                        <div><span className="text-slate-600"><strong>Grade:</strong> {listing.grade !== 'ungraded' ? listing.grade : 'Not graded'}</span></div>
                        {listing.certificationCompany ? (
                          <div><span className="text-slate-600"><strong>Certification:</strong> {listing.certificationCompany}</span></div>
                        ) : (
                          <div><span className="text-slate-600"><strong>Condition:</strong> {listing.condition.replace(/_/g, ' ').charAt(0).toUpperCase() + listing.condition.replace(/_/g, ' ').slice(1)}</span></div>
                        )}
                        <div><span className="text-slate-600"><strong>Value:</strong> {listing.estimatedValue ? `$${Number(listing.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not specified'}</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/inventory/${listing.id}/edit`} className="flex-1">
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
                onClick={() => {
                  if (listingToDelete) {
                    toast.info("Delete functionality will be implemented with backend integration.");
                    setDeleteDialogOpen(false);
                    setListingToDelete(null);
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
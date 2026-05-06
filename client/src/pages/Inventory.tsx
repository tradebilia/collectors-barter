import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getLoginUrl } from "@/const";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";
import { trpc } from "@/lib/trpc";
import { Download, Loader2, Menu, Pencil, Plus, Search, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia_final_transparent_e2d9ff8a.svg";

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

      return matchesKeyword && matchesCategory && matchesTradeOnly && matchesGrader && matchesGradeRange;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.categoryLabel.localeCompare(b.categoryLabel);
      return b.id - a.id;
    });
  }, [category, gradeRange, graderCompany, keyword, listings, sortBy, tradeOnly]);

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
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-[2rem] font-bold tracking-tight text-slate-900">Search</Link>
            <Link href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm">
              Home
            </Link>
            <div className="flex min-w-[18rem] flex-1 items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
              <Search className="mr-3 h-4 w-4 text-slate-400" />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="Search your inventory..."
                className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="ml-auto flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
              <span className="rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700">My</span>
              <Avatar className="h-8 w-8 border border-slate-200">
                <AvatarImage src={profile?.avatarUrl ?? undefined} alt={profile?.displayName ?? user?.name ?? "Tradebilia member"} />
                <AvatarFallback className="bg-slate-200 text-slate-700">{initials(profile?.displayName ?? user?.name ?? "Tradebilia")}</AvatarFallback>
              </Avatar>
              <Menu className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <nav className="mt-4 grid overflow-x-auto border border-slate-200 bg-white text-slate-950 md:grid-cols-5 xl:grid-cols-10 rounded-lg shadow-sm">
            {categoryLinks.map(categoryLink => (
              <Link
                key={categoryLink.value}
                href={`/category/${categoryLink.value}`}
                className={`border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider transition hover:bg-slate-50 ${category === categoryLink.value ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}
              >
                {categoryLink.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-12 text-white lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight">My Inventory</h1>
              <p className="mt-2 text-slate-300">Manage and organize your collection</p>
            </div>
            <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-56 w-56 opacity-80" />
          </div>
        </div>
      </section>

      <main className="px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
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

          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="border-slate-200 bg-white shadow-sm rounded-lg">
              <CardContent className="space-y-5 p-6">
                <div className="pb-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Search by Item Title or Certification #</Label>
                  <Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Search inventory" className="border-slate-300 bg-white" />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Category</Label>
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

                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Grading Authority</Label>
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

                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Grade Range</Label>
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

                <div className="space-y-2">
                  <Label className="text-base font-medium text-slate-800">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="border-slate-300 bg-white">
                      <SelectValue placeholder="Date Added" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_added">Date Added</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <div>
                    <p className="text-base font-medium text-slate-900">Show Only Items</p>
                    <p className="text-sm text-slate-600">Listed for Trade</p>
                  </div>
                  <Switch checked={tradeOnly} onCheckedChange={setTradeOnly} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow rounded-lg">
                  <CardContent className="p-0">
                    <Link href={`/listings/${listing.id}`} className="block">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                        <img
                          src={resolveTradebiliaListingImage({ title: listing.title, category: listing.category, primaryPhotoUrl: listing.primaryPhotoUrl })}
                          alt={listing.title}
                          className="h-full w-full object-cover"
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
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{listing.categoryLabel}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{listing.description}</p>
                      </div>
                      <button type="button" onClick={() => toast.info("Inline editing can be added to the next refinement pass.")} className="w-full mt-3 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition flex items-center justify-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
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
      </main>
    </div>
  );
}

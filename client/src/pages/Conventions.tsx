import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { CategoryBar } from "@/components/CategoryBar";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe, DollarSign, Building2, Plus, ExternalLink } from "lucide-react";
import { getTradebiliaCategoryLabel, tradebiliaCategories } from "@/lib/tradebilia";
import { COUNTRIES_LIST } from "@/lib/countries";
import { toast } from "sonner";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Washington D.C.",
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  ...tradebiliaCategories.map(cat => ({ value: cat.value, label: cat.label })),
];

function formatDateRange(startDate: string, endDate?: string | null) {
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };
  if (!endDate || endDate === startDate) return fmt(startDate);
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${new Date(s.getFullYear(), s.getMonth(), s.getDate()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export default function Conventions() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("United States"); // "all" means no country filter
  const [selectedState, setSelectedState] = useState("all");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", categories: [] as string[], startDate: "", endDate: "",
    city: "", state: "", country: "United States",
    venue: "", website: "", admission: "", description: "",
  });

  const conventionsQuery = trpc.conventions.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    country: selectedCountry === "all" ? undefined : selectedCountry || undefined,
    state: selectedState === "all" ? undefined : selectedState,
  });

  const submitMutation = trpc.conventions.submit.useMutation({
    onSuccess: () => {
      toast.success("Convention submitted! It will appear after admin approval.");
      setShowSubmitModal(false);
      setForm({ name: "", categories: [], startDate: "", endDate: "", city: "", state: "", country: "United States", venue: "", website: "", admission: "", description: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const conventions = conventionsQuery.data ?? [];

  // Group by month for display
  const grouped = useMemo(() => {
    const map = new Map<string, typeof conventions>();
    for (const c of conventions) {
      const [y, m] = c.startDate.split("-");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { key, label, items };
    });
  }, [conventions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.country) {
      toast.error("Name, start date, and country are required.");
      return;
    }
    if (form.categories.length === 0) {
      toast.error("Please select at least one category.");
      return;
    }
    submitMutation.mutate({
      name: form.name,
      category: form.categories[0], // primary category
      categories: form.categories,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country,
      venue: form.venue || undefined,
      website: form.website || undefined,
      admission: form.admission || undefined,
      description: form.description || undefined,
    });
  };

  const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.label ?? "All Categories";

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-white text-white">
        <div className="absolute inset-0" style={{
          backgroundImage: "url(https://assets.tradebilia.com/Background_23084d14.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 1,
        }} />
        <div className="container relative flex h-64 items-center justify-center sm:h-72 lg:h-80">
          <div className="flex w-full max-w-[1300px] items-center justify-center">
            <h1 className="px-6 text-center text-4xl font-semibold tracking-tight text-white sm:hidden">Conventions</h1>
            <img
              src="https://assets.tradebilia.com/Conventions_806639e4.webp"
              alt="Tradebilia Conventions"
              className="hidden h-auto w-full object-contain sm:block"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

      {/* Filters + Submit */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-end gap-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Country</Label>
            <Select value={selectedCountry} onValueChange={v => { setSelectedCountry(v); setSelectedState("all"); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COUNTRIES_LIST.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCountry === "United States" && (
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
            <DialogTrigger asChild>
              <Button className="h-9 gap-2 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white">
                <Plus className="w-4 h-4" />
                Submit a Convention
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit a Convention</DialogTitle>
                <p className="text-sm text-gray-500">Your submission will be reviewed by an admin before appearing on the site.</p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Convention Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., New York Comic Con" required />
                  </div>
                  <div className="col-span-2">
                    <Label>Categories * <span className="text-xs font-normal text-gray-400">(select all that apply)</span></Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {CATEGORY_OPTIONS.filter(o => o.value !== "all").map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.categories.includes(opt.value)}
                            onChange={e => setForm(f => ({
                              ...f,
                              categories: e.target.checked
                                ? [...f.categories, opt.value]
                                : f.categories.filter(c => c !== opt.value)
                            }))}
                            className="w-4 h-4 rounded border-gray-300 text-cyan-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Country *</Label>
                    <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v, state: "" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES_LIST.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="New York" />
                  </div>
                  {form.country === "United States" ? (
                    <div>
                      <Label>State</Label>
                      <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label>State / Province</Label>
                      <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Province or region" />
                    </div>
                  )}
                  <div>
                    <Label>Venue</Label>
                    <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="Javits Center" />
                  </div>
                  <div>
                    <Label>Admission</Label>
                    <Input value={form.admission} onChange={e => setForm(f => ({ ...f, admission: e.target.value }))} placeholder="$25 / Free" />
                  </div>
                  <div className="col-span-2">
                    <Label>Website</Label>
                    <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" type="url" />
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the convention..." rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitMutation.isPending} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                    {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-16">
        {conventionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading conventions...</div>
        ) : conventions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No upcoming conventions found</h3>
            <p className="text-gray-400 mb-6">
              {selectedCategory !== "all"
                ? `No upcoming ${categoryLabel} conventions in the selected area. Try a different filter or submit one!`
                : "No upcoming conventions found. Be the first to submit one!"}
            </p>
            <Button onClick={() => setShowSubmitModal(true)} className="gap-2 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4" />
              Submit a Convention
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ key, label, items }) => (
              <div key={key}>
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  {label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(convention => (
                    <div key={convention.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{convention.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {((convention as any).categories || [convention.category]).map((cat: string) => (
                              <Badge key={cat} variant="outline" className="text-[0.65rem] px-2 py-0 rounded-full border-cyan-300 text-cyan-700 bg-cyan-50">
                                {cat === "all" ? "All Categories" : getTradebiliaCategoryLabel(cat as any)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {convention.website && (
                          <a href={convention.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-500 transition flex-shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{formatDateRange(convention.startDate, convention.endDate)}</span>
                        </div>
                        {(convention.city || convention.state || convention.country) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>
                              {[convention.city, convention.state, convention.country !== "United States" ? convention.country : null]
                                .filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                        {convention.venue && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{convention.venue}</span>
                          </div>
                        )}
                        {convention.admission && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{convention.admission}</span>
                          </div>
                        )}
                      </div>

                      {convention.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 border-t border-gray-100 pt-2">{convention.description}</p>
                      )}

                      {convention.website && (
                        <a
                          href={convention.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Visit website
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

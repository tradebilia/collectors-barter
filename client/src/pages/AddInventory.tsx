import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Menu, Search, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";
const DRAFT_STORAGE_KEY = "tradebilia-add-inventory-draft";

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

type UploadedImage = {
  name: string;
  type: string;
  contentBase64: string;
  previewUrl: string;
};

type ListingCategory = (typeof categoryLinks)[number]["value"];

type InventoryDraft = {
  category: ListingCategory;
  graderCompany: string;
  certificationNumber: string;
  title: string;
  issueNumber: string;
  publisher: string;
  coverDate: string;
  grade: string;
  pageQuality: string;
  graderNotes: string;
  gradedDate: string;
  artComments: string;
  additionalNotes: string;
};

const emptyDraft: InventoryDraft = {
  category: "comics",
  graderCompany: "CGC",
  certificationNumber: "",
  title: "",
  issueNumber: "",
  publisher: "",
  coverDate: "",
  grade: "9.0",
  pageQuality: "White",
  graderNotes: "",
  gradedDate: "",
  artComments: "",
  additionalNotes: "",
};

async function readFiles(files: FileList | null) {
  if (!files) return [] as UploadedImage[];

  const readers = Array.from(files).slice(0, 6).map(
    file =>
      new Promise<UploadedImage>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          const [, contentBase64 = ""] = result.split(",");
          resolve({
            name: file.name,
            type: file.type || "image/jpeg",
            contentBase64,
            previewUrl: result,
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }),
  );

  return Promise.all(readers);
}

function mapGradeToCondition(grade: string) {
  const numericGrade = Number.parseFloat(grade);
  if (!Number.isFinite(numericGrade)) return "near_mint" as const;
  if (numericGrade >= 9.5) return "mint" as const;
  if (numericGrade >= 8) return "near_mint" as const;
  if (numericGrade >= 6) return "very_good" as const;
  if (numericGrade >= 4) return "good" as const;
  if (numericGrade >= 2) return "fair" as const;
  return "poor" as const;
}

export default function AddInventory() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<InventoryDraft>(emptyDraft);
  const [photos, setPhotos] = useState<UploadedImage[]>([]);

  const createListingMutation = trpc.market.createListing.useMutation({
    onSuccess: async () => {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraft(emptyDraft);
      setPhotos([]);
      toast.success("Collectible added to your inventory.");
      await Promise.all([utils.market.dashboard.invalidate(), utils.market.feed.invalidate()]);
      window.location.href = "/inventory";
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft) as { draft?: InventoryDraft; photos?: UploadedImage[] };
      if (parsed.draft) setDraft(parsed.draft);
      if (parsed.photos) setPhotos(parsed.photos);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  const primaryPhoto = useMemo(() => photos[0] ?? null, [photos]);

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextPhotos = await readFiles(event.target.files);
    setPhotos(nextPhotos);
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, photos }));
    toast.success("Inventory draft saved.");
  };

  const fetchDetails = () => {
    if (!draft.certificationNumber.trim()) {
      toast.error("Enter a certification number first.");
      return;
    }
    toast.info("Certification lookup can be connected to a grading registry in the next refinement pass. For now, you can continue entering the item details manually.");
  };

  const submitListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const descriptionSections = [
      `Grader Company: ${draft.graderCompany}`,
      `Certification Number: ${draft.certificationNumber}`,
      draft.issueNumber ? `Issue #: ${draft.issueNumber}` : null,
      draft.publisher ? `Publisher: ${draft.publisher}` : null,
      draft.coverDate ? `Cover Date: ${draft.coverDate}` : null,
      draft.grade ? `Grade: ${draft.grade}` : null,
      draft.pageQuality ? `Page Quality: ${draft.pageQuality}` : null,
      draft.graderNotes ? `Grader Notes: ${draft.graderNotes}` : null,
      draft.gradedDate ? `Graded Date: ${draft.gradedDate}` : null,
      draft.artComments ? `Art Comments: ${draft.artComments}` : null,
      draft.additionalNotes ? `Additional Notes: ${draft.additionalNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await createListingMutation.mutateAsync({
      title: draft.title,
      category: draft.category,
      condition: mapGradeToCondition(draft.grade),
      description: descriptionSections,
      photos: photos.map(({ previewUrl, ...photo }) => photo),
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] px-6 text-white">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/25 p-8 text-center backdrop-blur-md">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="mx-auto w-full max-w-xl" />
          <h1 className="mt-8 text-4xl font-semibold">Sign in to add inventory.</h1>
          <p className="mt-4 text-base leading-8 text-white/72">
            Tradebilia keeps browsing public, while inventory creation, Trade Proposals, and member messaging remain available only to signed-in subscribers.
          </p>
          <Button className="mt-8 rounded-full px-6" onClick={() => (window.location.href = getLoginUrl())}>
            Subscriber Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="px-4 py-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-[2rem] font-semibold tracking-tight text-white">Search...</Link>
            <div className="flex min-w-[18rem] flex-1 items-center rounded-[1rem] border border-white/10 bg-white/12 px-4 py-3">
              <Search className="mr-3 h-4 w-4 text-white/60" />
              <span className="text-white/55">Search...</span>
            </div>
            <div className="ml-auto flex items-center gap-5 text-sm text-white">
              <span className="text-[1.1rem] font-medium">My TRADEBILIA</span>
              <Menu className="h-9 w-9 text-[#efe56c]" />
            </div>
          </div>
          <nav className="mt-4 grid overflow-hidden border border-slate-300 bg-white text-slate-950 md:grid-cols-5 xl:grid-cols-10">
            {categoryLinks.map(categoryLink => (
              <Link
                key={categoryLink.value}
                href={`/category/${categoryLink.value}`}
                className={`border-b border-r border-slate-300 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] transition hover:bg-slate-100 ${draft.category === categoryLink.value ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}
              >
                {categoryLink.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(7,7,48,0.18)_0%,rgba(7,7,48,0.55)_100%)] px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="w-full max-w-[42rem]" />
        </div>
      </section>

      <main className="px-4 py-10 lg:px-8">
        <form className="mx-auto max-w-6xl" onSubmit={submitListing}>
          <h1 className="text-5xl font-semibold tracking-tight text-white">ADD TO YOUR INVENTORY</h1>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-medium text-white">ITEM INFORMATION</h2>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Grader Company</Label>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Input value={draft.graderCompany} onChange={event => setDraft(current => ({ ...current, graderCompany: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                      <Button type="button" variant="outline" className="h-14 border-white/12 bg-white/6 px-6 text-white hover:bg-white/12 hover:text-white" onClick={fetchDetails}>
                        FETCH DETAILS
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Certification Number</Label>
                    <Input value={draft.certificationNumber} onChange={event => setDraft(current => ({ ...current, certificationNumber: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Title</Label>
                    <Input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Issue #</Label>
                    <Input value={draft.issueNumber} onChange={event => setDraft(current => ({ ...current, issueNumber: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Publisher</Label>
                    <Input value={draft.publisher} onChange={event => setDraft(current => ({ ...current, publisher: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Cover Date</Label>
                    <Input value={draft.coverDate} onChange={event => setDraft(current => ({ ...current, coverDate: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Grade</Label>
                    <Input value={draft.grade} onChange={event => setDraft(current => ({ ...current, grade: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Page Quality</Label>
                    <Input value={draft.pageQuality} onChange={event => setDraft(current => ({ ...current, pageQuality: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Grader Notes</Label>
                    <Input value={draft.graderNotes} onChange={event => setDraft(current => ({ ...current, graderNotes: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Graded Date</Label>
                    <Input value={draft.gradedDate} onChange={event => setDraft(current => ({ ...current, gradedDate: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Art Comments</Label>
                    <Input value={draft.artComments} onChange={event => setDraft(current => ({ ...current, artComments: event.target.value }))} className="h-14 border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Category</Label>
                    <Select value={draft.category} onValueChange={value => setDraft(current => ({ ...current, category: value as ListingCategory }))}>
                      <SelectTrigger className="h-14 border-white/8 bg-white/6 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryLinks.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-xl uppercase tracking-[0.08em] text-white/90">Additional Notes</Label>
                    <Textarea value={draft.additionalNotes} onChange={event => setDraft(current => ({ ...current, additionalNotes: event.target.value }))} rows={5} className="border-white/8 bg-white/6 text-white placeholder:text-white/35" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button type="button" variant="outline" className="min-w-[14rem] rounded-xl border-white/10 bg-white/5 px-8 py-6 text-xl text-white hover:bg-white/10 hover:text-white" onClick={saveDraft}>
                  SAVE DRAFT
                </Button>
                <Button type="submit" className="min-w-[18rem] rounded-xl bg-[#0e5d73] px-8 py-6 text-xl text-white hover:bg-[#0a4d60]" disabled={createListingMutation.isPending}>
                  {createListingMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  SUBMIT COLLECTIBLE
                </Button>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-medium text-white">UPLOAD IMAGE</h2>
              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/18 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
                <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/20">
                  {primaryPhoto ? (
                    <img src={primaryPhoto.previewUrl} alt={primaryPhoto.name} className="aspect-[0.7] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[0.7] items-center justify-center text-center text-white/55">
                      <div>
                        <Upload className="mx-auto h-10 w-10" />
                        <p className="mt-3 text-lg">Upload front + back images</p>
                      </div>
                    </div>
                  )}
                </div>
                <Label htmlFor="inventory-photos" className="mt-5 block cursor-pointer text-center text-2xl uppercase tracking-[0.08em] text-white/90">
                  Upload Front + Back...
                </Label>
                <Input id="inventory-photos" type="file" multiple accept="image/*" onChange={handlePhotos} className="mt-4 border-white/8 bg-white/6 text-white" />
                {photos.length > 1 ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {photos.slice(1).map(photo => (
                      <div key={photo.name} className="overflow-hidden rounded-[1rem] border border-white/10">
                        <img src={photo.previewUrl} alt={photo.name} className="aspect-[0.78] w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

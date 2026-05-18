import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TradebiliaCategorySlug } from "@/lib/tradebilia";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia-longform-no-navy-clean_d2f04453.png";
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

// Category-specific fields based on filter presets
const categoryFieldPresets: Record<ListingCategory, Array<{ name: string; label: string; type: "text" | "select"; placeholder: string; selectOptions?: string[] }>> = {
  comics: [
    { name: "keyword", label: "Keyword", type: "text", placeholder: "Search by keyword" },
    { name: "title", label: "Title", type: "text", placeholder: "Amazing Fantasy, X-Men" },
    { name: "issueNumber", label: "Issue Number", type: "text", placeholder: "#1, #100, #50" },
    { name: "grade", label: "Grade", type: "select", placeholder: "Select grade 0-10", selectOptions: Array.from({ length: 11 }, (_, i) => i.toString()) },
    { name: "signed", label: "Signed", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
    { name: "facsimile", label: "Facsimile", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
  ],
  sports_cards: [
    { name: "manufacturer", label: "Manufacturer", type: "text", placeholder: "Topps, Fleer, Upper Deck" },
    { name: "sport", label: "Sport", type: "select", placeholder: "Select a sport", selectOptions: ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Tennis", "Golf", "Boxing", "MMA", "Wrestling", "Track & Field", "Swimming", "Cycling", "Motorsports", "Other"] },
    { name: "year", label: "Year / Era", type: "text", placeholder: "1950s, 1986, junk wax, ultra-modern" },
    { name: "team", label: "Team", type: "text", placeholder: "Yankees, Bulls, Cowboys" },
    { name: "set", label: "Set / Series", type: "text", placeholder: "Topps Chrome, Prizm, Fleer" },
    { name: "grade", label: "Grade", type: "select", placeholder: "Select grade 0-10", selectOptions: Array.from({ length: 11 }, (_, i) => i.toString()) },
    { name: "rookie", label: "Rookie", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
    { name: "autographed", label: "Autographed", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
  ],
  vintage_toys: [
    { name: "name", label: "Name", type: "text", placeholder: "Barbie, G.I. Joe, Star Wars" },
    { name: "genre", label: "Genre", type: "select", placeholder: "Action figure, doll, vehicle", selectOptions: ["Action figure", "Doll", "Vehicle", "Playset", "Other"] },
    { name: "franchise", label: "Franchise", type: "text", placeholder: "Star Wars, TMNT" },
  ],
  video_games: [
    { name: "title", label: "Title", type: "text", placeholder: "Zelda, Donkey Kong, Sonic" },
    { name: "system", label: "System", type: "select", placeholder: "NES, SNES, Sega", selectOptions: ["NES", "SNES", "Sega", "PlayStation", "Xbox", "Nintendo 64", "GameCube", "Wii", "Switch", "Other"] },
    { name: "region", label: "Region", type: "select", placeholder: "United States, Japan", selectOptions: ["United States", "Japan", "Europe", "PAL", "NTSC", "Other"] },
  ],
  stamps: [
    { name: "year", label: "Year", type: "text", placeholder: "1918" },
    { name: "issuer", label: "Issuer", type: "text", placeholder: "Post office or monarchy" },
    { name: "country", label: "Country", type: "select", placeholder: "United States, Bermuda", selectOptions: ["United States", "United Kingdom", "Canada", "France", "Germany", "Japan", "Other"] },
  ],
  coins: [
    { name: "year", label: "Year", type: "text", placeholder: "1909, 1933, 1794" },
    { name: "denomination", label: "Denomination", type: "select", placeholder: "Cent, dollar, eagle", selectOptions: ["Penny", "Nickel", "Dime", "Quarter", "Half Dollar", "Dollar", "Eagle", "Other"] },
    { name: "mintMark", label: "Mint Mark", type: "text", placeholder: "S, D, CC" },
  ],
  pokemon: [
    { name: "pokemon", label: "Pokémon", type: "text", placeholder: "Charizard, Pikachu, Mew" },
    { name: "set", label: "Set", type: "text", placeholder: "Base Set, Neo, Evolving Skies" },
    { name: "rarity", label: "Rarity", type: "select", placeholder: "Holo, Secret Rare", selectOptions: ["Common", "Uncommon", "Rare", "Holo Rare", "Secret Rare", "Ultra Rare", "Other"] },
  ],
  movies: [
    { name: "title", label: "Title", type: "text", placeholder: "Star Wars, Batman, Jaws" },
    { name: "format", label: "Format", type: "select", placeholder: "Poster, prop, lobby card", selectOptions: ["Poster", "Prop", "Lobby Card", "Still", "Promotional Material", "Other"] },
    { name: "franchise", label: "Franchise", type: "text", placeholder: "Marvel, Disney, horror" },
  ],
  autographs: [
    { name: "signer", label: "Signer", type: "text", placeholder: "Athlete, actor, creator" },
    { name: "medium", label: "Medium", type: "select", placeholder: "Photo, comic, baseball", selectOptions: ["Photo", "Comic", "Baseball", "Jersey", "Helmet", "Bat", "Memorabilia", "Other"] },
    { name: "franchise", label: "Franchise", type: "text", placeholder: "Marvel, MLB, Disney" },
  ],
  disney_pins: [
    { name: "pinName", label: "Pin Name", type: "text", placeholder: "LE park release, character pin" },
    { name: "parkOrEvent", label: "Park or Event", type: "text", placeholder: "D23, EPCOT, Disneyland" },
    { name: "series", label: "Series", type: "select", placeholder: "Character, attraction", selectOptions: ["Character", "Attraction", "Movie", "Park", "Event", "Limited Edition", "Other"] },
    { name: "edition", label: "Edition", type: "text", placeholder: "LE 300, LE 1000" },
  ],
};

// Grading services by category
const gradingServicesByCategory: Record<ListingCategory, string[]> = {
  comics: ["CGC Cards", "PSA", "Beckett", "Raw"],
  sports_cards: ["PSA", "BGS", "CGC Cards", "SGC", "Raw"],
  pokemon: ["PSA", "BGS", "CGC Cards", "TAG", "Raw"],
  vintage_toys: ["AFA", "CAS", "CGC", "Raw"],
  video_games: ["VGA", "Wata", "CGC", "Raw"],
  stamps: ["PSE", "PSAG", "Raw"],
  coins: ["PCGS", "NGC", "Raw"],
  autographs: ["PSA", "JSA", "BAS", "Raw"],
  movies: ["CGC Home Video", "Beckett", "Raw"],
  disney_pins: ["Raw"],
};

type InventoryDraft = {
  category: ListingCategory;
  title: string;
  graderCompany: string;
  grade: string;
  categoryFields: Record<string, string>;
  additionalNotes: string;
};

const emptyDraft: InventoryDraft = {
  category: "comics",
  title: "",
  graderCompany: "Raw",
  grade: "9.0",
  categoryFields: {},
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
  const currentCategoryFields = categoryFieldPresets[draft.category] || [];
  const currentGradingServices = gradingServicesByCategory[draft.category] || ["Raw"];

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextPhotos = await readFiles(event.target.files);
    setPhotos(nextPhotos);
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, photos }));
    toast.success("Inventory draft saved.");
  };

  const submitListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      toast.error("Please enter an item title.");
      return;
    }

    const descriptionSections = [
      `Grading Company: ${draft.graderCompany}`,
      `Grade: ${draft.grade}`,
      ...Object.entries(draft.categoryFields)
        .filter(([, value]) => value?.trim())
        .map(([key, value]) => `${key}: ${value}`),
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
      <TopBar logoUrl={TRADEBILIA_LOGO_URL} searchPlaceholder="Search..." />

      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url(/manus-storage/hero-background-fullwidth_e851e7cd.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0 px-4 lg:px-8">
          <div className="flex w-full max-w-6xl items-center justify-center">
            <img src={TRADEBILIA_LOGO_URL} alt="Tradebilia" className="h-auto w-full max-w-[42rem]" />
          </div>
        </div>
      </section>

      <CategoryBar />

      <main className="px-4 py-10 lg:px-8">
        <form className="mx-auto max-w-6xl" onSubmit={submitListing}>
          <h1 className="text-5xl font-semibold tracking-tight text-white">ADD TO YOUR INVENTORY</h1>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-10">
              {/* Category Selection */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-8 shadow-lg">
                <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.1em] text-white/95">Select Category</h3>
                <div className="space-y-3">
                  <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Category *</Label>
                  <Select value={draft.category} onValueChange={value => {
                    setDraft(current => ({
                      ...current,
                      category: value as ListingCategory,
                      categoryFields: {},
                      graderCompany: gradingServicesByCategory[value as ListingCategory]?.[0] || "Raw",
                    }));
                  }}>
                    <SelectTrigger className="h-12 border-white/10 bg-white/8 text-white hover:bg-white/12">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryLinks.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grading Information */}
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-8 shadow-lg">
                <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.1em] text-white/95">Grading Information</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Grading Company</Label>
                    <Select value={draft.graderCompany} onValueChange={value => setDraft(current => ({ ...current, graderCompany: value }))}>
                      <SelectTrigger className="h-12 border-white/10 bg-white/8 text-white hover:bg-white/12">
                        <SelectValue placeholder="Select grading company" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGradingServices.map(service => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Grade</Label>
                    <Input
                      value={draft.grade}
                      onChange={event => setDraft(current => ({ ...current, grade: event.target.value }))}
                      placeholder="e.g., 9.0"
                      className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>

              {/* Item Title */}
              <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-8 shadow-lg">
                <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.1em] text-white/95">Item Title</h3>
                <div className="space-y-3">
                  <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Title *</Label>
                  <Input
                    value={draft.title}
                    onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                    placeholder="Enter item title"
                    className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                  />
                </div>
              </div>

              {/* Category-Specific Fields */}
              {currentCategoryFields.length > 0 && (
                <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-8 shadow-lg">
                  <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.1em] text-white/95">Item Details</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {currentCategoryFields.map(field => (
                      <div key={field.name} className={field.type === "select" ? "space-y-3" : "space-y-3"}>
                        <Label className="text-sm uppercase tracking-[0.08em] text-white/70">{field.label}</Label>
                        {field.type === "select" ? (
                          <Select
                            value={draft.categoryFields[field.name] || ""}
                            onValueChange={value =>
                              setDraft(current => ({
                                ...current,
                                categoryFields: { ...current.categoryFields, [field.name]: value },
                              }))
                            }
                          >
                            <SelectTrigger className="h-12 border-white/10 bg-white/8 text-white hover:bg-white/12">
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.selectOptions?.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={draft.categoryFields[field.name] || ""}
                            onChange={event =>
                              setDraft(current => ({
                                ...current,
                                categoryFields: { ...current.categoryFields, [field.name]: event.target.value },
                              }))
                            }
                            placeholder={field.placeholder}
                            className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-8 shadow-lg">
                <h3 className="mb-6 text-xl font-semibold uppercase tracking-[0.1em] text-white/95">Additional Information</h3>
                <div className="space-y-3">
                  <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Additional Notes</Label>
                  <Textarea
                    value={draft.additionalNotes}
                    onChange={event => setDraft(current => ({ ...current, additionalNotes: event.target.value }))}
                    rows={5}
                    placeholder="Any additional details about this item..."
                    className="border-white/10 bg-white/8 text-white placeholder:text-white/35"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button type="button" variant="outline" className="min-w-[14rem] rounded-xl border-white/10 bg-white/5 px-8 py-6 text-lg text-white hover:bg-white/10 hover:text-white" onClick={saveDraft}>
                  SAVE DRAFT
                </Button>
                <Button type="submit" className="min-w-[18rem] rounded-xl bg-[#0e5d73] px-8 py-6 text-lg text-white hover:bg-[#0a4d60]" disabled={createListingMutation.isPending}>
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

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
    { name: "title", label: "Title", type: "text", placeholder: "Amazing Fantasy, X-Men" },
    { name: "issueNumber", label: "Issue Number", type: "text", placeholder: "#1, #100, #50" },
    { name: "signed", label: "Signed", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
    { name: "facsimile", label: "Facsimile", type: "select", placeholder: "Select option", selectOptions: ["Yes", "No"] },
  ],
  sports_cards: [
    { name: "manufacturer", label: "Manufacturer", type: "text", placeholder: "Topps, Fleer, Upper Deck" },
    { name: "sport", label: "Sport", type: "select", placeholder: "Select a sport", selectOptions: ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Tennis", "Golf", "Boxing", "MMA", "Wrestling", "Track & Field", "Swimming", "Cycling", "Motorsports", "Other"] },
    { name: "year", label: "Year / Era", type: "text", placeholder: "1950s, 1986, junk wax, ultra-modern" },
    { name: "team", label: "Team", type: "text", placeholder: "Yankees, Bulls, Cowboys" },
    { name: "set", label: "Set / Series", type: "text", placeholder: "Topps Chrome, Prizm, Fleer" },
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
  vintage_toys: ["AFA", "NRFB", "Raw"],
  video_games: ["WATA", "VGA", "Raw"],
  stamps: ["PSE", "Raw"],
  coins: ["PCGS", "NGC", "ANACS", "Raw"],
  pokemon: ["PSA", "BGS", "CGC Cards", "Raw"],
  movies: ["Raw"],
  autographs: ["JSA", "PSA", "Beckett", "Raw"],
  disney_pins: ["Raw"],
};

// Map grade to condition
const mapGradeToCondition = (grade: string): "mint" | "near_mint" | "very_good" | "good" | "fair" | "poor" => {
  const gradeNum = parseFloat(grade);
  if (gradeNum >= 9) return "mint";
  if (gradeNum >= 8) return "near_mint";
  if (gradeNum >= 7) return "very_good";
  if (gradeNum >= 5) return "good";
  if (gradeNum >= 3) return "fair";
  return "poor";
};

// Read files as base64
const readFiles = async (fileList: FileList | null): Promise<UploadedImage[]> => {
  if (!fileList) return [];
  const files = Array.from(fileList);
  return Promise.all(
    files.map(
      file =>
        new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve({
              name: file.name,
              type: file.type,
              contentBase64: base64.split(",")[1],
              previewUrl: base64,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
};

export default function AddInventory() {
  const { isAuthenticated } = useAuth();
  const [draft, setDraft] = useState<{
    category: ListingCategory;
    title: string;
    value: string;
    graderCompany: string;
    certificationNumber: string;
    grade: string;
    categoryFields: Record<string, string>;
    additionalNotes: string;
  }>({
    category: "comics",
    title: "",
    value: "",
    graderCompany: "CGC Cards",
    certificationNumber: "",
    grade: "9.0",
    categoryFields: {},
    additionalNotes: "",
  });

  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const createListingMutation = trpc.market.createListing.useMutation();

  // Note: Draft auto-loading removed to prevent form data persistence on page refresh.
  // This prevents accidental duplicate submissions or mistakes from previous entries.
  // Users can manually save drafts using the "Save Draft" button if they want to continue later.
  // useEffect(() => {
  //   const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
  //   if (saved) {
  //     try {
  //       const { draft: savedDraft, photos: savedPhotos } = JSON.parse(saved);
  //       setDraft(savedDraft);
  //       setPhotos(savedPhotos);
  //     } catch (e) {
  //       console.error("Failed to load draft:", e);
  //     }
  //   }
  // }, []);

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
      draft.certificationNumber ? `Certification Number: ${draft.certificationNumber}` : null,
      `Grade: ${draft.grade}`,
      ...Object.entries(draft.categoryFields)
        .filter(([, value]) => value?.trim())
        .map(([key, value]) => `${key}: ${value}`),
      draft.additionalNotes ? `Additional Notes: ${draft.additionalNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Reorder photos so the selected primary image is first
    const reorderedPhotos = photos.map(({ previewUrl, ...photo }) => photo);
    if (reorderedPhotos.length > 0 && primaryPhotoIndex > 0) {
      const [primaryPhoto] = reorderedPhotos.splice(primaryPhotoIndex, 1);
      reorderedPhotos.unshift(primaryPhoto);
    }

    await createListingMutation.mutateAsync({
      title: draft.title,
      category: draft.category,
      condition: mapGradeToCondition(draft.grade),
      description: descriptionSections,
      estimatedValue: draft.value ? parseFloat(draft.value) : 0,
      photos: reorderedPhotos,
    });
    
    // Clear the draft after successful submission
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    
    // Reset form to initial state
    setDraft({
      category: "comics",
      title: "",
      value: "",
      graderCompany: "CGC Cards",
      certificationNumber: "",
      grade: "9.0",
      categoryFields: {},
      additionalNotes: "",
    });
    setPhotos([]);
    setPrimaryPhotoIndex(0);
    
    toast.success("Item added to your inventory!");
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
        <form className="mx-auto max-w-7xl" onSubmit={submitListing}>
          <h1 className="text-5xl font-semibold tracking-tight text-white">ADD TO YOUR INVENTORY</h1>
          
          {/* Required Fields Note */}
          <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            <p><span className="font-semibold text-blue-300">*</span> Required Field</p>
          </div>

          {/* Main content grid with image on right */}
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.35fr]">
            {/* Left side - Form fields */}
            <div className="space-y-6">
              {/* 1. Category Selection */}
              <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">1. Select Category</h3>
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

              {/* 2. Grading Company & Certification Number */}
              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">2. Grading & Certification</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
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
                    <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Certification Number</Label>
                    <Input
                      value={draft.certificationNumber}
                      onChange={event => setDraft(current => ({ ...current, certificationNumber: event.target.value }))}
                      placeholder="e.g., 123456789"
                      className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Grade</Label>
                  <Input
                    value={draft.grade}
                    onChange={event => setDraft(current => ({ ...current, grade: event.target.value }))}
                    placeholder="e.g., 9.0"
                    className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                  />
                </div>
              </div>

              {/* 3. Item Title and Value */}
              <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">3. Item Title & Value</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Title *</Label>
                    <Input
                      value={draft.title}
                      onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
                      placeholder="Enter item title"
                      className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Estimated Value</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={draft.value}
                      onChange={event => setDraft(current => ({ ...current, value: event.target.value }))}
                      placeholder="Enter estimated value (e.g., 150.00)"
                      className="h-12 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Item Details - Category Specific Fields in Grid */}
              {currentCategoryFields.length > 0 && (
                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 shadow-lg">
                  <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">4. Item Details</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {currentCategoryFields.map(field => (
                      <div key={field.name} className="space-y-3">
                        <Label className="text-sm uppercase tracking-[0.08em] text-white/70">{field.label}</Label>
                        {field.type === "text" ? (
                          <Input
                            value={draft.categoryFields[field.name] || ""}
                            onChange={event => setDraft(current => ({
                              ...current,
                              categoryFields: { ...current.categoryFields, [field.name]: event.target.value }
                            }))}
                            placeholder={field.placeholder}
                            className="h-10 border-white/10 bg-white/8 text-white placeholder:text-white/35 text-sm"
                          />
                        ) : (
                          <Select value={draft.categoryFields[field.name] || ""} onValueChange={value => setDraft(current => ({
                            ...current,
                            categoryFields: { ...current.categoryFields, [field.name]: value }
                          }))}>
                            <SelectTrigger className="h-10 border-white/10 bg-white/8 text-white hover:bg-white/12 text-sm">
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.selectOptions?.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Additional Information */}
              <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">5. Additional Information</h3>
                <div className="space-y-3">
                  <Label className="text-sm uppercase tracking-[0.08em] text-white/70">Additional Notes</Label>
                  <Textarea
                    value={draft.additionalNotes}
                    onChange={event => setDraft(current => ({ ...current, additionalNotes: event.target.value }))}
                    placeholder="Any additional details about this item..."
                    className="min-h-24 border-white/10 bg-white/8 text-white placeholder:text-white/35"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={saveDraft}
                  variant="outline"
                  className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
                  disabled={createListingMutation.isPending}
                >
                  SAVE DRAFT
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                  disabled={createListingMutation.isPending}
                >
                  {createListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  SUBMIT COLLECTIBLE
                </Button>
              </div>
            </div>

            {/* Right side - Image Upload */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 p-6 shadow-lg h-full flex flex-col">
                <h3 className="mb-6 text-lg font-semibold uppercase tracking-[0.1em] text-white/95">Upload Images</h3>
                
                {/* Main upload area */}
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 cursor-pointer transition-all hover:border-white/40 hover:bg-white/10 flex-1 min-h-48"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-white/60', 'bg-white/20');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-white/60', 'bg-white/20');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-white/60', 'bg-white/20');
                    if (e.dataTransfer.files) {
                      handlePhotos({ target: { files: e.dataTransfer.files } } as any);
                    }
                  }}
                >
                  {primaryPhoto ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <img src={primaryPhoto.previewUrl} alt="Preview" className="max-w-full max-h-40 rounded-lg object-contain" />
                      <p className="text-xs text-white/50 mt-2">Main Image</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-white/50 mb-3" />
                      <p className="text-sm text-white/70">Drag & drop or click to upload</p>
                      <p className="text-xs text-white/50 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </div>
                
                <label className="mt-4 inline-block w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => document.getElementById('inventory-photos')?.click()}
                  >
                    Browse Files
                  </Button>
                  <input
                    id="inventory-photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotos}
                    className="hidden"
                  />
                </label>
                
                {/* Image thumbnails and primary selection */}
                {photos.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold text-white/90">Images ({photos.length})</p>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {photos.map((photo, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setPrimaryPhotoIndex(index)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            index === primaryPhotoIndex
                              ? 'border-blue-500 ring-2 ring-blue-400'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          <img src={photo.previewUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-20 object-cover" />
                          {index === primaryPhotoIndex && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-white bg-blue-600 px-2 py-1 rounded">MAIN</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-white/50">Click an image to set it as the main image</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

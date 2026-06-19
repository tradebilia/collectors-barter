import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useLocation } from "wouter";
import { useAddInventoryForm } from "@/hooks/useAddInventoryForm";
import { CategoryItemTypeSelector } from "@/components/CategoryItemTypeSelector";
import { FormProgressIndicator } from "@/components/FormProgressIndicator";
import { CollapsibleFormSection } from "@/components/CollapsibleFormSection";
import { DynamicFieldRenderer } from "@/components/DynamicFieldRenderer";
import type { CollectibleCategory, FieldDefinition } from "@/lib/formFieldDefinitions";

const TRADEBILIA_LOGO_URL = "/manus-storage/tradebilia-logo_c676d640.svg";

type UploadedImage = {
  name: string;
  type: string;
  contentBase64: string;
  previewUrl: string;
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
  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const params = useParams<{ listingId?: string }>();
  const [, navigate] = useLocation();
  const isEditMode = !!params.listingId;

  const {
    formData,
    setCategory,
    setItemType,
    updateField,
    updateOtherField,
    validateForm,
    getRequiredFieldsCount,
    getCompletedRequiredFieldsCount,
    shouldShowField,
    currentFields,
  } = useAddInventoryForm();

  const createListingMutation = trpc.market.createListing.useMutation();
  const saveDraftMutation = trpc.market.saveDraft.useMutation();
  const getListingDetailQuery = trpc.market.listingDetail.useQuery(
    { listingId: params.listingId ? parseInt(params.listingId) : 0 },
    { enabled: isEditMode }
  );
  const updateListingMutation = trpc.market.updateListing.useMutation();

  // Load existing listing data when in edit mode
  useEffect(() => {
    if (isEditMode && getListingDetailQuery.data?.listing) {
      const listing = getListingDetailQuery.data.listing;
      if (listing.category) {
        setCategory(listing.category as CollectibleCategory);
      }
      const itemType = (listing as any).itemType;
      if (itemType) {
        setItemType(itemType);
      }
      updateField("title", listing.title);
      updateField("estimatedValue", String(listing.estimatedValue || ""));
      updateField("description", listing.description);

      // Load item details
      if (listing.itemDetails && typeof listing.itemDetails === "object") {
        Object.entries(listing.itemDetails).forEach(([key, value]) => {
          updateField(key, String(value || ""));
        });
      }

      // Load existing photos
      if (listing.photos && listing.photos.length > 0) {
        const existingPhotos: UploadedImage[] = listing.photos.map(photo => ({
          name: photo.altText || "photo",
          type: "image/jpeg",
          contentBase64: "",
          previewUrl: photo.imageUrl,
        }));
        setPhotos(existingPhotos);
      }
    }
  }, [isEditMode, getListingDetailQuery.data]);

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextPhotos = await readFiles(event.target.files);
    if (isEditMode) {
      setPhotos([...photos, ...nextPhotos]);
    } else {
      setPhotos(nextPhotos);
    }
  };

  const handleSaveDraft = async () => {
    try {
      if (!formData.category) {
        toast.error("Please select a category before saving.");
        return;
      }
      await saveDraftMutation.mutateAsync({
        title: formData.title,
        category: formData.category,
        grade: formData.grade as any,
        graderCompany: formData.gradingCompany || "Raw",
        certificationNumber: formData.certificationNumber || "",
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : 0,
        categoryFields: formData.itemDetails,
        additionalNotes: formData.description,
        photos: photos,
      });
      toast.success("Inventory draft saved.");
    } catch (error) {
      toast.error("Failed to save draft. Please try again.");
      console.error("Error saving draft:", error);
    }
  };

  const submitListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate required fields
    const isValid = validateForm();
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Validate photos
    if (photos.length === 0) {
      toast.error("Please upload at least one photo.");
      return;
    }

    // Reorder photos so the selected primary image is first
    const reorderedPhotos = photos.map(({ previewUrl, ...photo }) => photo);
    if (reorderedPhotos.length > 0 && primaryPhotoIndex > 0) {
      const [primaryPhoto] = reorderedPhotos.splice(primaryPhotoIndex, 1);
      reorderedPhotos.unshift(primaryPhoto);
    }

    if (isEditMode && params.listingId) {
      const newPhotos = reorderedPhotos.filter(p => p.contentBase64);
      if (formData.category) {
        await updateListingMutation.mutateAsync({
          listingId: parseInt(params.listingId),
          title: formData.title,
          category: formData.category,
          condition: "mint", // TODO: Map from grade
          description: formData.description,
          estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : 0,
          photos: newPhotos,
          itemDetails: formData.itemDetails,
        });
      } else {
        toast.error("Please select a category before updating.");
        return;
      }
      toast.success("Listing updated successfully!");
      navigate("/inventory");
    } else if (formData.category) {
      await createListingMutation.mutateAsync({
        title: formData.title,
        category: formData.category,
        itemType: formData.itemType,
        condition: "mint", // TODO: Map from grade
        description: formData.description,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : 0,
        photos: reorderedPhotos,
        itemDetails: formData.itemDetails,
        certificationCompany: formData.gradingCompany !== "Raw" ? formData.gradingCompany : undefined,
        grade: formData.grade !== "ungraded" ? formData.grade : undefined,
      });
    } else {
      toast.error("Please select a category before submitting.");
      return;
      toast.success("Listing created successfully!");
      navigate("/inventory");
    }
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

  const requiredFieldsCount = getRequiredFieldsCount();
  const filledRequiredFieldsCount = getCompletedRequiredFieldsCount();
  const allFields = currentFields;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1c2468_0%,#0b0a22_65%)] text-white">
      <TopBar logoUrl={TRADEBILIA_LOGO_URL} searchPlaceholder="Search..." />

      <section className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url(/manus-storage/Sportscardwallpaper_a86b605b.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img src="/manus-storage/Add_To_Your_Inventory_e01ed84b.svg" alt="Add To Your Inventory" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        <form id="add-inventory-form" onSubmit={submitListing} className="grid grid-cols-4 gap-6">
          {/* Left Column (75%) - Form Content */}
          <div className="col-span-3 space-y-6">
            {/* Progress Indicator */}
            <FormProgressIndicator completedRequiredFields={filledRequiredFieldsCount} totalRequiredFields={requiredFieldsCount} />

            {/* Category & Item Type Selection */}
            <CategoryItemTypeSelector
              selectedCategory={formData.category}
              selectedItemType={formData.itemType}
              onCategoryChange={setCategory}
              onItemTypeChange={setItemType}
            />

            {/* Required Fields Section */}
            <CollapsibleFormSection title="📋 Required Fields" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "required").length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFields
                  .filter((f: FieldDefinition) => f.requirement === "required" && shouldShowField(f))
                  .map((field: FieldDefinition) => (
                    <DynamicFieldRenderer
                      key={field.name}
                      field={field}
                      value={formData[field.name as keyof typeof formData] || ""}
                      onChange={(value) => updateField(field.name, value)}
                      onOtherChange={(value) => updateOtherField(field.name, value)}
                    />
                  ))}
              </div>
            </CollapsibleFormSection>

            {/* Recommended Fields Section */}
            <CollapsibleFormSection title="⭐ Recommended Fields" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "recommended").length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFields
                  .filter((f: FieldDefinition) => f.requirement === "recommended" && shouldShowField(f))
                  .map((field: FieldDefinition) => (
                    <DynamicFieldRenderer
                      key={field.name}
                      field={field}
                      value={formData[field.name as keyof typeof formData] || ""}
                      onChange={(value) => updateField(field.name, value)}
                      onOtherChange={(value) => updateOtherField(field.name, value)}
                    />
                  ))}
              </div>
            </CollapsibleFormSection>

            {/* Optional Fields Section */}
            <CollapsibleFormSection title="✨ Optional Fields" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "optional").length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFields
                  .filter((f: FieldDefinition) => f.requirement === "optional" && shouldShowField(f))
                  .map((field: FieldDefinition) => (
                    <DynamicFieldRenderer
                      key={field.name}
                      field={field}
                      value={formData[field.name as keyof typeof formData] || ""}
                      onChange={(value) => updateField(field.name, value)}
                      onOtherChange={(value) => updateOtherField(field.name, value)}
                    />
                  ))}
              </div>
            </CollapsibleFormSection>

            {/* Shipping & Quantity Section */}
            <CollapsibleFormSection title="📦 Shipping & Quantity" defaultExpanded={true} fieldCount={2}>
              <div className="space-y-4">
                <DynamicFieldRenderer
                  field={{
                    name: "quantity",
                    label: "Quantity",
                    inputType: "text",
                    requirement: "required",
                  }}
                  value={formData.quantity || "1"}
                  onChange={(value) => updateField("quantity", value)}
                  onOtherChange={() => {}}
                />
                <DynamicFieldRenderer
                  field={{
                    name: "shippingAvailable",
                    label: "Shipping Available",
                    inputType: "dropdown",
                    requirement: "required",
                    dropdownOptions: ["Yes", "No"],
                  }}
                  value={formData.shippingAvailable || "Yes"}
                  onChange={(value) => updateField("shippingAvailable", value)}
                  onOtherChange={() => {}}
                />
              </div>
            </CollapsibleFormSection>

            {/* Description Section */}
            <CollapsibleFormSection title="📝 Description" defaultExpanded={true} fieldCount={1}>
              <DynamicFieldRenderer
                field={{
                  name: "description",
                  label: "Description",
                  inputType: "textarea",
                  requirement: "required",
                }}
                value={formData.description || ""}
                onChange={(value) => updateField("description", value)}
                onOtherChange={() => {}}
              />
            </CollapsibleFormSection>
          </div>

          {/* Right Column (25%) - Photo Upload Panel */}
          <div className="col-span-1 sticky top-20 h-fit">
            <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur">
              <h3 className="mb-4 text-lg font-semibold">📷 Photos</h3>

              {/* Photo Preview Grid */}
              <div className="mb-4 space-y-2">
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                          index === primaryPhotoIndex ? "border-blue-500 ring-2 ring-blue-500/50" : "border-white/20 hover:border-white/40"
                        }`}
                        onClick={() => setPrimaryPhotoIndex(index)}
                      >
                        <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="h-24 w-full object-cover" />
                        {index === primaryPhotoIndex && <div className="absolute inset-0 bg-blue-500/10" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-white/20">
                    <span className="text-sm text-white/50">No photos yet</span>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <label className="flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photos
                <input type="file" multiple accept="image/*" onChange={handlePhotos} className="hidden" />
              </label>

              <p className="mt-2 text-xs text-white/50">At least 1 photo required</p>
            </div>
          </div>
        </form>

        {/* Action Buttons - Visible when scrolling to bottom */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur">
          <div className="container mx-auto max-w-7xl px-4 py-4 flex justify-end gap-4">
            <Button variant="outline" onClick={(e) => { e.preventDefault(); handleSaveDraft(); }} disabled={saveDraftMutation.isPending}>
              {saveDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save as Draft
            </Button>
            <Button type="submit" form="add-inventory-form" disabled={createListingMutation.isPending || updateListingMutation.isPending}>
              {(createListingMutation.isPending || updateListingMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Listing" : "Submit Collectible"}
            </Button>
          </div>
        </div>

        {/* Spacer for fixed button bar */}
        <div className="h-20" />
      </div>
    </div>
  );
}

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
import { FieldWithCustomInput } from "@/components/FieldWithCustomInput";
import type { CollectibleCategory, FieldDefinition } from "@/lib/formFieldDefinitions";
import { getLayoutConfig, getGridColumnsClass, getColSpanClass } from "@/lib/layoutConfigs/layoutTypes";
import { ITEM_TYPE_LAYOUTS } from "@/lib/layoutConfigs/itemTypeLayouts";

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
    getItemDetails,
    errors,
  } = useAddInventoryForm(photos);

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
    setPhotos([...photos, ...nextPhotos]);
  };

  const handleDeletePhoto = (indexToDelete: number) => {
    const updatedPhotos = photos.filter((_, index) => index !== indexToDelete);
    setPhotos(updatedPhotos);
    // If the deleted photo was the primary, reset to first photo or 0
    if (primaryPhotoIndex === indexToDelete) {
      setPrimaryPhotoIndex(0);
    } else if (primaryPhotoIndex > indexToDelete) {
      setPrimaryPhotoIndex(primaryPhotoIndex - 1);
    }
  };

  const handleCategoryChange = (category: CollectibleCategory) => {
    // Reset all form data when category changes
    setPhotos([]);
    setPrimaryPhotoIndex(0);
    setCategory(category);
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
      
      // Scroll to the first field with an error
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
        title: formData.listingTitle,
          category: formData.category,
          condition: formData.condition || "near_mint",
          description: formData.description,
          estimatedValue: formData.tradeValue ? parseFloat(formData.tradeValue) : 0,
          photos: newPhotos,
          itemDetails: getItemDetails(),
        });
      } else {
        toast.error("Please select a category before updating.");
        return;
      }
      toast.success("Listing updated successfully!");
      navigate("/inventory");
    } else if (formData.category) {
      // Map condition display labels to enum values
      const conditionMap: Record<string, 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor'> = {
        'Mint': 'mint',
        'Near Mint': 'near_mint',
        'Excellent': 'very_good',  // Map "Excellent" to "very_good"
        'Very Good': 'very_good',
        'Good': 'good',
        'Fair': 'fair',
        'Poor': 'poor',
      };
      
      await createListingMutation.mutateAsync({
        title: formData.listingTitle,
        category: formData.category,
        itemType: formData.itemType,
        condition: (conditionMap[formData.condition] as 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor') || "near_mint",
        description: formData.description,
        estimatedValue: formData.tradeValue ? parseFloat(formData.tradeValue) : 0,
        photos: reorderedPhotos,
        itemDetails: getItemDetails(),
        certificationCompany: formData.gradingCompany && formData.gradingCompany !== "Raw" ? formData.gradingCompany : undefined,
        grade: formData.grade || "ungraded",
      });
      toast.success("Listing created successfully!");
      navigate("/inventory");
    } else {
      toast.error("Please select a category before submitting.");
      return;
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

      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white" style={{
        backgroundImage: 'url(/manus-storage/Mainpage_9b45311d.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
            <img src="/manus-storage/Add_To_Your_Inventory_1ff7f916.svg" alt="Add To Your Inventory" className="h-auto w-full" />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-20 lg:pl-32">
          {/* Left column: Form */}
          <form id="add-inventory-form" onSubmit={submitListing} className="lg:max-w-3xl space-y-6">
            {/* Progress Indicator */}
            <FormProgressIndicator completedRequiredFields={filledRequiredFieldsCount} totalRequiredFields={requiredFieldsCount} />

            {/* Category & Item Type Selection */}
            <CategoryItemTypeSelector
              selectedCategory={formData.category}
              selectedItemType={formData.itemType}
              onCategoryChange={handleCategoryChange}
              onItemTypeChange={setItemType}
            />

            {/* Required Fields Section */}
            <CollapsibleFormSection title="2. Required Fields *" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "required").length}>
              <div className="space-y-6 w-full">
                {(() => {
                  const layoutKey = `${formData.category}_${formData.itemType}`;
                  const layoutConfig = getLayoutConfig(layoutKey);
                  const requiredColumns = layoutConfig?.sections?.required?.columns || 2;
                  const fieldLayout = layoutConfig?.sections?.required?.fieldLayout || {};
                  const gap = layoutConfig?.spacing?.gap || 'gap-6';
                  
                  return (
                    <div className={`grid ${getGridColumnsClass(requiredColumns)} ${gap} w-full`}>
                      {allFields
                        .filter((f: FieldDefinition) => (f.requirement === "required" || f.requirement === "conditional") && shouldShowField(f))
                        .sort((a, b) => {
                          const posA = fieldLayout[a.name]?.position || 999;
                          const posB = fieldLayout[b.name]?.position || 999;
                          return posA - posB;
                        })
                        .map((field: FieldDefinition) => {
                          const fieldConfig = fieldLayout[field.name];
                          const colSpan = fieldConfig?.colSpan || 'half';
                          const colSpanClass = getColSpanClass(colSpan, requiredColumns);
                          
                          return (
                            <div key={field.name} className={`${colSpanClass} w-full`} data-error={!!errors[field.name]}>
                              <FieldWithCustomInput
                                field={field}
                                value={formData[field.name as keyof typeof formData] || ""}
                                onChange={(value) => updateField(field.name, value)}
                                onOtherChange={(value) => updateOtherField(field.name, value)}
                                formData={formData}
                                error={errors[field.name]}
                              />
                            </div>
                          );
                        })
                      }
                    </div>
                  );
                })()}
              </div>
            </CollapsibleFormSection>



            {/* Recommended Fields Section */}
            <CollapsibleFormSection title="3. Recommended Fields" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "recommended").length}>
              <div className="space-y-6 w-full">
                {(() => {
                  const layoutKey = `${formData.category}_${formData.itemType}`;
                  const layoutConfig = getLayoutConfig(layoutKey);
                  const recommendedColumns = layoutConfig?.sections?.recommended?.columns || 2;
                  const fieldLayout = layoutConfig?.sections?.recommended?.fieldLayout || {};
                  const gap = layoutConfig?.spacing?.gap || 'gap-6';
                  
                  return (
                    <div className={`grid ${getGridColumnsClass(recommendedColumns)} ${gap} w-full`}>
                      {allFields
                        .filter((f: FieldDefinition) => f.requirement === "recommended" && shouldShowField(f) && f.name !== 'signatures')
                        .sort((a, b) => {
                          const posA = fieldLayout[a.name]?.position || 999;
                          const posB = fieldLayout[b.name]?.position || 999;
                          return posA - posB;
                        })
                        .map((field: FieldDefinition) => {
                          const fieldConfig = fieldLayout[field.name];
                          const colSpan = fieldConfig?.colSpan || 'half';
                          const colSpanClass = getColSpanClass(colSpan, recommendedColumns);
                          
                          return (
                            <div key={field.name} className={`${colSpanClass} w-full`}>
                              <FieldWithCustomInput
                                field={field}
                                value={formData[field.name as keyof typeof formData] || ""}
                                onChange={(value) => updateField(field.name, value)}
                                onOtherChange={(value) => updateOtherField(field.name, value)}
                                formData={formData}
                                error={errors[field.name]}
                              />
                            </div>
                          );
                        })
                      }
                    </div>
                  );
                })()}
                
                {/* Inline Conditional Signature Fields */}
                {formData.signed === 'Yes' && formData.numberOfSignatures && parseInt(formData.numberOfSignatures) > 0 && (
                  <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-blue-900">Signatures</h4>
                    <div className="space-y-2">
                      {Array.from({ length: parseInt(formData.numberOfSignatures) }).map((_, index) => (
                        <div key={`signature-${index}`}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Signature {index + 1}
                          </label>
                          <input
                            type="text"
                            value={(formData.signatures && Array.isArray(formData.signatures) && formData.signatures[index]) || ""}
                            onChange={(e) => {
                              const signatures = Array.isArray(formData.signatures) ? [...formData.signatures] : [];
                              signatures[index] = e.target.value;
                              updateField('signatures', signatures);
                            }}
                            placeholder={`Enter name for signature ${index + 1}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleFormSection>

            {/* Optional Fields Section */}
            {allFields.filter((f: FieldDefinition) => f.requirement === "optional" && f.name !== "description" && shouldShowField(f)).length > 0 && (
            <CollapsibleFormSection title="4. Optional Fields" defaultExpanded={true} fieldCount={allFields.filter((f: FieldDefinition) => f.requirement === "optional" && f.name !== "description").length}>
                <div className="space-y-4 w-full">
                  {(() => {
                    const layoutKey = `${formData.category}_${formData.itemType}`;
                    const layoutConfig = getLayoutConfig(layoutKey);
                    console.log('Optional Fields Debug:', { layoutKey, layoutConfig, optionalColumns: layoutConfig?.sections?.optional?.columns });
                    const optionalColumns = layoutConfig?.sections?.optional?.columns || 1;
                    const fieldLayout = layoutConfig?.sections?.optional?.fieldLayout || {};
                    const gap = layoutConfig?.spacing?.gap || 'gap-6';
                    
                    return (
                      <div className={`grid ${getGridColumnsClass(optionalColumns)} ${gap} w-full`}>
                        {allFields
                          .filter((f: FieldDefinition) => f.requirement === "optional" && shouldShowField(f))
                          .sort((a, b) => {
                            const posA = fieldLayout[a.name]?.position || 999;
                            const posB = fieldLayout[b.name]?.position || 999;
                            return posA - posB;
                          })
                          .map((field: FieldDefinition) => {
                            const fieldConfig = fieldLayout[field.name];
                            const colSpan = fieldConfig?.colSpan || 'full';
                            const colSpanClass = getColSpanClass(colSpan, optionalColumns);
                            
                            return (
                              <div key={field.name} className={`${colSpanClass} w-full`} data-error={!!errors[field.name]}>
                                <DynamicFieldRenderer
                                  field={field}
                                  value={formData[field.name as keyof typeof formData] || ""}
                                  onChange={(value) => updateField(field.name, value)}
                                  onOtherChange={(value) => updateOtherField(field.name, value)}
                                  showOtherInput={field.supportsOther && formData[field.name as keyof typeof formData] === 'Other'}
                                  otherValue={formData[`custom${field.name.charAt(0).toUpperCase() + field.name.slice(1)}` as keyof typeof formData] as string || ""}
                                  error={errors[field.name]}
                                />
                              </div>
                            );
                          })
                        }
                      </div>
                    );
                  })()}
                </div>
            </CollapsibleFormSection>
            )}

            {/* Shipping Section */}
            <CollapsibleFormSection title={allFields.filter((f: FieldDefinition) => f.requirement === "optional" && shouldShowField(f)).length > 0 ? "5. Shipping *" : "4. Shipping *"} defaultExpanded={true} fieldCount={1}>
              <div className="space-y-4">
                <DynamicFieldRenderer
                  field={{
                    name: "shippingAvailable",
                    label: "",
                    inputType: "dropdown",
                    requirement: "required",
                    dropdownOptions: ["Yes", "Local Only", "In Person Only"],
                  }}
                  value={formData.shippingAvailable || ""}
                  onChange={(value) => updateField("shippingAvailable", value)}
                  onOtherChange={() => {}}
                  error={errors.shippingAvailable}
                />
              </div>
            </CollapsibleFormSection>

            {/* Description Section */}
            <CollapsibleFormSection title={allFields.filter((f: FieldDefinition) => f.requirement === "optional" && shouldShowField(f)).length > 0 ? "6. Description *" : "5. Description *"} defaultExpanded={true} fieldCount={1}>
              <div className="w-full">
                <DynamicFieldRenderer
                  field={{
                    name: "description",
                    label: "",
                    inputType: "textarea",
                    requirement: "optional",
                  }}
                  value={formData.description || ""}
                  onChange={(value) => updateField("description", value)}
                  onOtherChange={() => {}}
                  error={errors.description}
                />
              </div>
            </CollapsibleFormSection>
          </form>
        </div>

        {/* Photo Upload Panel - positioned absolutely on the right */}
        <div className="absolute top-12 -right-4 w-80 z-10">
            <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur">
              <h3 className="mb-4 text-lg font-semibold text-white">{allFields.filter((f: FieldDefinition) => f.requirement === "optional" && shouldShowField(f)).length > 0 ? "7. Photos *" : "6. Photos *"}</h3>

              {/* Drag and Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-blue-500/20', 'border-blue-500');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');
                  const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
                  if (files.length > 0) {
                    handlePhotos({ target: { files } } as any);
                  }
                }}
                className="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 p-6 transition-colors hover:border-white/40"
              >
                <Upload className="mb-2 h-8 w-8 text-white/50" />
                <p className="text-sm text-white/70">Drag and drop photos here</p>
                <p className="text-xs text-white/50">or use the button below</p>
              </div>

              {/* Photo Error Display */}
              {errors.photos && (
                <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <span>⚠️</span>
                  <span>{errors.photos}</span>
                </div>
              )}

              {/* Photo Preview Grid */}
              <div className="mb-4 space-y-2">
                {photos.length > 0 && (
                  <p className="text-xs text-yellow-400 mb-2">💡 Click on a photo to set it as your cover photo (highlighted with yellow border)</p>
                )}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                          index === primaryPhotoIndex ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/20 hover:border-white/40"
                        }`}
                        onClick={() => setPrimaryPhotoIndex(index)}
                      >
                        <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="h-24 w-full object-cover" />
                        {index === primaryPhotoIndex && <div className="absolute inset-0 bg-yellow-400/10" />}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(index);
                          }}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                          title="Delete photo"
                        >
                          ✕
                        </button>
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

      {/* Action Buttons - Visible when scrolling to bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur z-50">
          <div className="container mx-auto max-w-7xl px-4 py-4 flex justify-center gap-4">
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

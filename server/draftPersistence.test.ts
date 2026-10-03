import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("inventory draft persistence", () => {
  it("saves category fields and notes instead of only photos", () => {
    const db = read("server/db.ts");
    const router = read("server/routers.ts");

    expect(db).toContain("categoryFields: input.categoryFields ? JSON.stringify(input.categoryFields) : null");
    expect(db).toContain("additionalNotes: input.additionalNotes || null");
    expect(router).toContain("categoryFields: input.categoryFields");
    expect(router).toContain("additionalNotes: input.additionalNotes");
    expect(router).toContain("publishDraft: protectedProcedure");
    expect(db).toContain("export async function publishDraft(");
    expect(db).toContain("await tx.delete(draftListings).where(eq(draftListings.id, input.draftId));");
  });

  it("persists item type and restores draft form state in one update", () => {
    const page = read("client/src/pages/AddInventory.tsx");

    expect(page).toContain("itemType: String(formData.itemType || \"\")");
    expect(page).toContain("condition: String(formData.condition || \"\")");
    expect(page).toContain("const savedItemType = String(savedCategoryFields.itemType || \"\")");
    expect(page).toContain("condition: String(savedCategoryFields.condition || \"\")");
    expect(page).toContain("itemType: savedItemType");
    expect(page).toContain("setFormData((previous) => ({");
    expect(page).toContain('if (action === "update")');
    expect(page).toContain('toast.success("Collectible submitted successfully!")');
  });

  it("keeps existing draft photos compatible with later updates", () => {
    const page = read("client/src/pages/AddInventory.tsx");
    const router = read("server/routers.ts");
    expect(router).toContain("photos: z.array(uploadedImageSchema)");
    expect(router).toContain("grade: z.union([z.string().max(50), z.number()]).optional()");
    expect(page).toContain("const draftPhotos = reorderedPhotos");
    expect(page).toContain("Boolean(photo.contentBase64 || photo.imageUrl)");
  });
});

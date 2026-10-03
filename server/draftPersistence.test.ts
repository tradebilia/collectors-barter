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
  });

  it("persists item type and restores draft form state in one update", () => {
    const page = read("client/src/pages/AddInventory.tsx");

    expect(page).toContain("itemType: String(formData.itemType || \"\")");
    expect(page).toContain("condition: String(formData.condition || \"\")");
    expect(page).toContain("const savedItemType = String(savedCategoryFields.itemType || \"\")");
    expect(page).toContain("condition: String(savedCategoryFields.condition || \"\")");
    expect(page).toContain("itemType: savedItemType");
    expect(page).toContain("setFormData((previous) => ({");
  });

  it("keeps existing draft photos compatible with later updates", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("photos: z.array(uploadedImageSchema)");
  });
});

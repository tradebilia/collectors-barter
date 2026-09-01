import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const addInventorySource = readFileSync(resolve(process.cwd(), "client/src/pages/AddInventory.tsx"), "utf8");

describe("mobile listing photo capture", () => {
  it("offers explicit rear-camera and photo-library choices on mobile", () => {
    expect(addInventorySource).toContain('Camera className="mr-1.5 h-4 w-4"');
    expect(addInventorySource).toContain("Take Photo");
    expect(addInventorySource).toContain('capture="environment"');
    expect(addInventorySource).toContain("Choose from Library");
    expect(addInventorySource).toContain('grid grid-cols-2 gap-2 md:hidden');
  });

  it("keeps image-only selection, desktop upload, and the established photo handler", () => {
    expect(addInventorySource).toContain('accept="image/*"');
    expect(addInventorySource).toContain('multiple accept="image/*"');
    expect(addInventorySource).toContain("onChange={handlePhotos}");
    expect(addInventorySource).toContain("Upload Photos");
    expect(addInventorySource).toContain("hidden cursor-pointer items-center justify-center rounded-lg");
    expect(addInventorySource).toContain("handleDeletePhoto(index)");
    expect(addInventorySource).toContain("setPrimaryPhotoIndex(index)");
  });
});

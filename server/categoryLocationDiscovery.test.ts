import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("Category Page location discovery", () => {
  it("sends nearest sorting and distance filtering only through the typed marketplace feed contract", () => {
    const categoryPage = read("client/src/pages/CategoryPage.tsx");
    const router = read("server/routers.ts");

    expect(categoryPage).toContain('input.locationSort = true');
    expect(categoryPage).toContain('add("distanceMiles", submittedFilters.distanceMiles)');
    expect(categoryPage).toContain('distanceMiles: distanceMiles ?? undefined');
    expect(categoryPage).toContain("Uses your saved town after Search or Enter.");
    expect(router).toContain("locationSort: z.boolean().optional()");
    expect(router).toContain("distanceMiles: z.number().positive().max(500).optional()");
  });

  it("keeps coordinates and addresses server-only while returning only non-sensitive approximate listing bands", () => {
    const database = read("server/db.ts");
    const categoryPage = read("client/src/pages/CategoryPage.tsx");

    expect(database).toContain("contactAddress: null,");
    expect(database).toContain("orderListingsByOwnerDistance(listingRows, milesByOwnerId)");
    expect(database).toContain("filterListingsByOwnerDistance(listingRows, milesByOwnerId, filters.distanceMiles!)");
    expect(database).toContain("getApproximateDistanceBand(");
    expect(database).toContain("distanceBand: distanceBandByListingId.get(listing.id) ?? null");
    expect(database).toContain("locationSort,");
    expect(database).toContain("distanceFilter,");
    expect(database).not.toContain("distanceMiles: coordinates");
    expect(categoryPage).toContain("listing.distanceBand");
    expect(categoryPage).toContain("Nearby:");
    expect(categoryPage).not.toContain("listing.distanceMiles");
  });
});

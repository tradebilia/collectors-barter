import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("listing-card content boundaries", () => {
  it("does not render uncontrolled listing descriptions on category or Global Search cards", () => {
    const categoryPage = read("client/src/pages/CategoryPage.tsx");
    const globalSearch = read("client/src/pages/SearchResults.tsx");

    expect(categoryPage).not.toContain("{listing.description}");
    expect(globalSearch).not.toContain("{listing.description}");
  });

  it("renders only the existing privacy-safe approximate distance band on category and Global Search cards", () => {
    const categoryPage = read("client/src/pages/CategoryPage.tsx");
    const globalSearch = read("client/src/pages/SearchResults.tsx");
    const database = read("server/db.ts");

    expect(database).toContain("distanceBand: distanceBandByListingId.get(listing.id) ?? null");
    expect(categoryPage).toContain("listing.distanceBand");
    expect(globalSearch).toContain("listing.distanceBand");
    expect(globalSearch).toContain("<MapPin");
    expect(globalSearch).not.toContain("listing.distanceMiles");
  });
});

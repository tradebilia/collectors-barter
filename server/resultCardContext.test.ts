import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("result card context", () => {
  const categoryPage = readFileSync("client/src/pages/CategoryPage.tsx", "utf8");
  const globalResults = readFileSync("client/src/pages/SearchResults.tsx", "utf8");

  it("does not repeat the category label in the category-page grid card", () => {
    const categoryCard = categoryPage.slice(categoryPage.indexOf("<CardContent className={`${viewMode"), categoryPage.indexOf("{listing.distanceBand &&", categoryPage.indexOf("<CardContent className={`${viewMode")));
    expect(categoryCard).not.toContain("{listing.categoryLabel}");
  });

  it("keeps the category label for mixed-category global results", () => {
    expect(globalResults).toContain("{listing.categoryLabel}");
    expect(globalResults).toContain("min-h-[3rem]");
  });

  it("reserves a two-line title area in both grid card contexts", () => {
    expect(categoryPage).toContain("min-h-[2rem] line-clamp-2");
    expect(globalResults).toContain("min-h-[2rem] line-clamp-2");
  });

  it("uses the compact Sports Cards content spacing for every category grid variant", () => {
    expect(categoryPage).toContain('"space-y-1 p-1.5 text-[#153746]"');
    expect(categoryPage).not.toContain('isSportsCardsPage ? "p-1.5 text-[#153746]" : "p-5"');
  });

  it("does not place a divider beneath category-card images", () => {
    expect(categoryPage).not.toContain("overflow-hidden border-b border-current/10");
  });

  it("does not place a divider beneath Global result-card images", () => {
    expect(globalResults).not.toContain("aspect-[7/9] border-b border-current/10");
  });

  it("keeps batched member online status above Global result-card images", () => {
    expect(globalResults).toContain("getMultipleSellerOnlineStatus");
    expect(globalResults).toContain("Member {sellerStatusQuery.data[listing.owner.id].isOnline ? \"Online\" : \"Offline\"}");
  });
});

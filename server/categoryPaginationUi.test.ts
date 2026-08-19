import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const categoryPageSource = readFileSync(
  new URL("../client/src/pages/CategoryPage.tsx", import.meta.url),
  "utf8",
);

describe("Category Page pagination presentation", () => {
  it("renders only the calculated page slice and an honest result range", () => {
    expect(categoryPageSource).toContain("getCategoryPaginationState(listings.length, currentPage, resultsPerPage)");
    expect(categoryPageSource).toContain("listings.slice(pagination.startIndex, pagination.endIndex)");
    expect(categoryPageSource).toContain("Showing ${pagination.firstResultNumber}–${pagination.lastResultNumber} of ${listings.length} listings");
    expect(categoryPageSource).toContain("Page {pagination.currentPage} of {pagination.totalPages}");
  });

  it("prevents invalid navigation and returns to page one for submitted discovery changes", () => {
    expect(categoryPageSource).toContain("disabled={pagination.currentPage === 1}");
    expect(categoryPageSource).toContain("disabled={pagination.currentPage === pagination.totalPages}");
    expect(categoryPageSource).toContain("Math.min(pagination.totalPages, prev + 1)");
    expect(categoryPageSource).toContain("setSubmittedFilters(newFilters);\n    setCurrentPage(1);");
    expect(categoryPageSource).toContain("setCurrentPage(pagination.currentPage);");
  });
});

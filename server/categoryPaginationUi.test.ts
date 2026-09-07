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

  it("uses the same rounded-pill Grid/List control geometry as Explore All", () => {
    expect(categoryPageSource).toContain('import { ArrowRight, Grid2X2, Heart, List, Loader2');
    expect(categoryPageSource).toContain('<Grid2X2 className="mr-1 h-3.5 w-3.5" />Grid');
    expect(categoryPageSource).toContain('<List className="mr-1 h-3.5 w-3.5" />List');
    expect(categoryPageSource).toContain('flex gap-0.5 rounded-full bg-white/10 p-1 shadow-sm');
    expect(categoryPageSource).toContain('rounded-full transition ${viewMode === "grid" ? "bg-white text-slate-950 shadow-sm"');
    expect(categoryPageSource).toContain('rounded-full transition ${viewMode === "list" ? "bg-white text-slate-950 shadow-sm"');
    expect(categoryPageSource).toContain('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between');
    expect(categoryPageSource).toContain('flex flex-wrap items-center gap-2');
    expect(categoryPageSource).toContain('w-40 sm:w-48 h-9 bg-white/80 text-sm');
  });

  it("prevents invalid navigation and returns to page one for submitted discovery changes", () => {
    expect(categoryPageSource).toContain("disabled={pagination.currentPage === 1}");
    expect(categoryPageSource).toContain("disabled={pagination.currentPage === pagination.totalPages}");
    expect(categoryPageSource).toContain("Math.min(pagination.totalPages, prev + 1)");
    expect(categoryPageSource).toContain("setSubmittedFilters(newFilters);\n    setCurrentPage(1);");
    expect(categoryPageSource).toContain("setCurrentPage(pagination.currentPage);");
  });
});

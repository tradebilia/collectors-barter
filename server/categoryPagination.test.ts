import { describe, expect, it } from "vitest";
import { getCategoryPaginationState } from "../shared/categoryPagination";

describe("Category Page pagination", () => {
  it("returns the first requested page range", () => {
    expect(getCategoryPaginationState(25, 1, 12)).toEqual({
      currentPage: 1,
      totalPages: 3,
      startIndex: 0,
      endIndex: 12,
      firstResultNumber: 1,
      lastResultNumber: 12,
    });
  });

  it("returns the final partial page range", () => {
    expect(getCategoryPaginationState(25, 3, 12)).toEqual({
      currentPage: 3,
      totalPages: 3,
      startIndex: 24,
      endIndex: 25,
      firstResultNumber: 25,
      lastResultNumber: 25,
    });
  });

  it("clamps stale pages after filters reduce the result count", () => {
    expect(getCategoryPaginationState(13, 5, 12)).toMatchObject({
      currentPage: 2,
      totalPages: 2,
      startIndex: 12,
      firstResultNumber: 13,
      lastResultNumber: 13,
    });
  });

  it("reports an honest empty result range", () => {
    expect(getCategoryPaginationState(0, 2, 24)).toMatchObject({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
      firstResultNumber: 0,
      lastResultNumber: 0,
    });
  });
});

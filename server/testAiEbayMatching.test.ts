import { describe, expect, it } from "vitest";
import {
  extractGradeFromQuery,
  extractGradeFromTitle,
  filterListingsByGrade,
} from "./testAIRouter";

describe("Test AI eBay graded-item matching", () => {
  it("extracts a numeric grade from eBay's AFA Graded title format", () => {
    expect(extractGradeFromQuery("LEGO Spider-Man 2 Street Chase AFA 8")).toBe(8);
    expect(extractGradeFromTitle("LEGO Spider-Man 2 Spider-Man's Street Chase 4853 (2004) AFA Graded 8.0 New")).toBe(8);
  });

  it("keeps the two matching LEGO listings while excluding a different grade", () => {
    const listings = [
      { title: "LEGO Spider-Man 2 Spider-Man's Street Chase 4853 (2004) AFA Graded 8.0 New" },
      { title: "LEGO Spider-Man 2 Spider-Man's Street Chase 4853 (2004) AFA Graded 8.0 New Brand New" },
      { title: "LEGO Spider-Man 2 Spider-Man's Street Chase 4853 (2004) AFA Graded 7.5 Used" },
    ];

    expect(filterListingsByGrade(listings, 8).map((item) => item.title)).toHaveLength(2);
  });
});

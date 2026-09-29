import { describe, expect, it } from "vitest";
import {
  extractGradeFromQuery,
  extractGradeFromTitle,
  filterListingsByGrade,
  computeMetrics,
  computeVisualMatchMetrics,
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

  it("excludes an explicitly stated unqualified comic 9.4 when the target is 9.8", () => {
    const listings = [
      { title: "Edge of Spider-Verse #2 9.4" },
      { title: "Edge of Spider-Verse #2 9.8" },
      { title: "Edge of Spider-Verse #2" },
    ];
    expect(filterListingsByGrade(listings, 9.8, "comics").map((item) => item.title)).toEqual([
      "Edge of Spider-Verse #2 9.8",
      "Edge of Spider-Verse #2",
    ]);
  });

  it("preserves PCGS coin grade prefixes instead of reducing MS65 to 65", () => {
    expect(extractGradeFromQuery("1921 Peace Dollar PCGS MS65")).toBe("MS65");
    expect(extractGradeFromTitle("1921 Peace Dollar PCGS MS65 CAC")).toBe("MS65");

    const listings = [
      { title: "1921 Peace Dollar PCGS MS65 CAC" },
      { title: "1921 Peace Dollar PCGS MS64" },
      { title: "1921 Peace Dollar PCGS PR65" },
    ];

    expect(filterListingsByGrade(listings, "MS65").map((item) => item.title)).toEqual([
      "1921 Peace Dollar PCGS MS65 CAC",
    ]);
  });

  it("calculates visual-match-only metrics from accepted image reviews", () => {
    const metrics = computeVisualMatchMetrics([
      { price: { value: '100' }, visualReviewStatus: 'match' },
      { price: { value: '120' }, visualReviewStatus: 'rough_match' },
      { price: { value: '780' }, visualReviewStatus: 'mismatch' },
      { price: { value: '350' }, visualReviewStatus: 'unreadable' },
    ]);
    expect(metrics).toMatchObject({ count: 2, avg: 110, median: 110, min: 100, max: 120 });
  });

  it("explains the deterministic confidence threshold behind each metric tier", () => {
    const prices = (values: number[]) => values.map((value) => ({ price: { value: String(value) } }));
    expect(computeMetrics(prices([100, 105, 110]))?.confidenceReason).toContain('At least 4 are required for medium confidence');
    expect(computeMetrics(prices([100, 102, 104, 106]))?.confidenceReason).toContain('At least 7 are required for high confidence');
    expect(computeMetrics(prices([100, 101, 102, 103, 104, 105, 106]))?.confidenceReason).toContain('below the 80% high-confidence threshold');
  });
});

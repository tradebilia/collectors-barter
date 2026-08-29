import { describe, expect, it } from "vitest";
import { normalizeListingEstimatedValue } from "./db";

describe("listing estimated value minimum", () => {
  it("normalizes sub-dollar values to the $1 minimum", () => {
    expect(normalizeListingEstimatedValue(0.25)).toBe(1);
    expect(normalizeListingEstimatedValue(0.99)).toBe(1);
    expect(normalizeListingEstimatedValue(0)).toBe(1);
  });

  it("preserves valid values and missing values", () => {
    expect(normalizeListingEstimatedValue(1250.49)).toBe(1250.49);
    expect(normalizeListingEstimatedValue(undefined)).toBeNull();
    expect(normalizeListingEstimatedValue(null)).toBeNull();
    expect(normalizeListingEstimatedValue(Number.NaN)).toBeNull();
  });
});

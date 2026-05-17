import { describe, expect, it } from "vitest";
import { resolveTradebiliaListingImage } from "@/lib/listingImages";

describe("resolveTradebiliaListingImage", () => {
  it("preserves direct photo URLs while normalizing manus-storage paths", () => {
    expect(resolveTradebiliaListingImage({
      title: "Any Listing",
      primaryPhotoUrl: "/manus-storage/1986-87 Michael Jordan_a9dcf0a5.jpg",
    })).toBe("/manus-storage/1986-87%20Michael%20Jordan_a9dcf0a5.jpg");
  });

  it("uses keyword-based matches for known sports-card titles", () => {
    expect(resolveTradebiliaListingImage({
      title: "1986-87 Michael Jordan Rookie",
      category: "sports_cards",
    })).toBe("/manus-storage/michael-jordan-rookie_4440f620.jpg");
  });

  it("falls back to the category image when no keyword match exists", () => {
    expect(resolveTradebiliaListingImage({
      title: "Unlisted Sports Card",
      category: "sports_cards",
    })).toBe("/manus-storage/sportscards2_50e2e734.png");
  });
});

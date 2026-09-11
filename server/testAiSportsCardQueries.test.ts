import { describe, expect, it } from "vitest";
import { buildSportsCardTestAiQueries } from "../shared/testAiCriteria";
import { buildEbayBrowseQuery, filterListingsByNumber } from "./testAIRouter";

describe("Test AI sports-card eBay query candidates", () => {
  it("preserves the target certification grade in precise sports-card Browse searches", () => {
    const query = "1989 Upper Deck Ken Griffey Jr 1 PSA 10";

    expect(buildEbayBrowseQuery(query, { preserveGrade: true })).toBe(query);
    expect(buildEbayBrowseQuery(query)).toBe("1989 Upper Deck Ken Griffey Jr 1 PSA");
  });

  it("keeps sports-card titles that omit the explicit card number", () => {
    const listings = [
      { title: "1989 Upper Deck Ken Griffey Jr Rookie PSA 10" },
      { title: "1989 Upper Deck Ken Griffey Jr #2 PSA 10" },
    ];

    expect(filterListingsByNumber(listings, "1", { allowMissingNumber: true })).toEqual([listings[0]]);
  });

  it("includes a broader Ken Griffey identity query when card-number formatting is too strict", () => {
    const queries = buildSportsCardTestAiQueries(
      { year: "1989", manufacturer: "Upper Deck", player: "Ken Griffey Jr", cardNumber: "1" },
      "Ken Griffey Jr Upper Deck Rookie PSA 10",
      "PSA",
      "10",
    );

    expect(queries).toContain("1989 Upper Deck Ken Griffey Jr 1 PSA 10");
    expect(queries).toContain("1989 Upper Deck Ken Griffey Jr PSA 10");
    expect(queries).toContain("Upper Deck Ken Griffey Jr PSA 10");
  });
});

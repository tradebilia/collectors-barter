import { describe, expect, it } from "vitest";
import { buildSportsCardTestAiQueries } from "../shared/testAiCriteria";

describe("Test AI sports-card eBay query candidates", () => {
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

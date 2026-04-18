import { describe, expect, it } from "vitest";
import { getTradebiliaCategoryBenchmark, getTradebiliaCategoryTheme } from "@/lib/tradebilia";

describe("sports cards category benchmark", () => {
  it("defines the expected quick filters, summary panels, and spotlight cards", () => {
    const benchmark = getTradebiliaCategoryBenchmark("sports_cards");

    expect(benchmark).not.toBeNull();
    expect(benchmark?.quickFilters).toEqual([
      "Rookie cards",
      "Hall of Fame",
      "Signed slabs",
      "Low-pop grails",
    ]);
    expect(benchmark?.summaryHighlights).toHaveLength(3);
    expect(benchmark?.spotlights.map(card => card.title)).toEqual([
      "1986-87 Michael Jordan Rookie",
      "1976 Walter Payton Rookie",
      "1980 Rickey Henderson Rookie",
    ]);
  });

  it("keeps the sports cards benchmark paired with a distinct visual theme", () => {
    const theme = getTradebiliaCategoryTheme("sports_cards");
    const benchmark = getTradebiliaCategoryBenchmark("sports_cards");

    expect(theme?.headingFont).toContain("Oswald");
    expect(theme?.pageClassName).toContain("#ead6ac");
    expect(benchmark?.emptyStateTitle).toBe("No live sports-card listings match these filters yet.");
    expect(benchmark?.emptyStateBuildoutNotes).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import { getTradebiliaCategoryBenchmark, getTradebiliaCategoryTheme } from "@/lib/tradebilia";

describe("tradebilia category benchmarks", () => {
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

  it("provides benchmark content for comics so the sports-cards structure can roll out without losing category identity", () => {
    const theme = getTradebiliaCategoryTheme("comics");
    const benchmark = getTradebiliaCategoryBenchmark("comics");

    expect(theme?.heading).toContain("Comic grails");
    expect(benchmark?.quickFilters).toEqual([
      "Key issues",
      "Signed copies",
      "Golden age",
      "First appearances",
    ]);
    expect(benchmark?.heroNotesEyebrow).toBe("Collector notes");
    expect(benchmark?.spotlights).toHaveLength(3);
    expect(benchmark?.emptyStateTitle).toBe("No live comics listings match these filters yet.");
  });
});

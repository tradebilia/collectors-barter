import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectSimilarListings, titleSimilarityScore } from "../shared/similarListings";

const source = {
  id: 1,
  category: "sports_cards",
  itemType: "single_card",
  title: "1986 Fleer Michael Jordan Rookie",
};

describe("strict item-detail similar listing selection", () => {
  it("admits only an exact or strong name match, or the same item type", () => {
    const candidates = [
      { id: 2, category: "sports_cards", itemType: "unopened_product", title: "1986 Fleer Michael Jordan Rookie" },
      { id: 3, category: "sports_cards", itemType: "single_card", title: "1989 Barry Sanders Rookie" },
      { id: 4, category: "sports_cards", itemType: "unopened_product", title: "Unrelated Baseball Wax Box" },
      { id: 5, category: "pokemon", itemType: "single_card", title: "1986 Fleer Michael Jordan Rookie" },
      { id: 6, category: "sports_cards", itemType: "autographed_card", title: "Michael Jordan Fleer Signed Card" },
    ];

    expect(selectSimilarListings(source, candidates).map(item => item.id)).toEqual([2, 6, 3]);
  });

  it("returns no recommendations when category, item type, and name do not match", () => {
    expect(selectSimilarListings(source, [
      { id: 7, category: "sports_cards", itemType: "unopened_product", title: "Vintage Baseball Hobby Box" },
      { id: 8, category: "comics", itemType: "single_card", title: "Amazing Fantasy #15" },
    ])).toEqual([]);
  });

  it("requires a meaningful title overlap rather than a generic word", () => {
    expect(titleSimilarityScore("Amazing Spider Man #1", "Amazing X Men #1")).toBe(0);
    expect(titleSimilarityScore("Amazing Spider Man #1", "Amazing Spider Man #2")).toBeGreaterThan(0);
  });

  it("uses strict matching in the database helper and hides empty recommendation sections", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const itemDetailSource = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");

    expect(dbSource).toContain("selectSimilarListings(detailCard[0], similarCandidateRows, 4)");
    expect(itemDetailSource).toContain("{similarListings.length > 0 && <div");
    expect(itemDetailSource).toContain("More like this");
    expect(itemDetailSource).toContain("grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-6");
    expect(itemDetailSource).toContain("aspect-[7/9] bg-white sm:aspect-[4/5]");
    expect(itemDetailSource).toContain("object-contain");
    expect(itemDetailSource).toContain("Trader Rating");
    expect(itemDetailSource).toContain("item.conditionLabel");
    expect(itemDetailSource).toContain("item.estimatedValue ? formatItemValue(item.estimatedValue) : \"—\"");
  });
});

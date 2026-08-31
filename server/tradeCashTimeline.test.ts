import { describe, expect, it } from "vitest";
import { describeTradeCashChange } from "./tradeCashTimeline";

describe("Trade Room cash timeline entries", () => {
  it("names the member when cash is added", () => {
    expect(describeTradeCashChange("Rtavani", 0, 250)).toEqual({
      eventType: "cash_added",
      details: "Added $250 cash to Rtavani's side.",
    });
  });

  it("says adjusted when an existing amount changes", () => {
    expect(describeTradeCashChange("Administrator", 250, 400)).toEqual({
      eventType: "cash_added",
      details: "Adjusted Administrator's cash from $250 to $400.",
    });
  });

  it("names the member when cash is removed and ignores unchanged values", () => {
    expect(describeTradeCashChange("Rtavani", 250, 0)).toEqual({
      eventType: "cash_removed",
      details: "Removed $250 cash from Rtavani's side.",
    });
    expect(describeTradeCashChange("Rtavani", 250, 250)).toBeNull();
  });
});

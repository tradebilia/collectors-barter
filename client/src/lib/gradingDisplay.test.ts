import { describe, expect, it } from "vitest";
import { getDisplayedGradingCompany } from "./gradingDisplay";

describe("grading-company display", () => {
  it("uses the custom company when the stored company is Other", () => {
    expect(getDisplayedGradingCompany("Other", "WATA")).toBe("WATA");
    expect(getDisplayedGradingCompany(" other ", "  Independent Video Game Grading ")).toBe("Independent Video Game Grading");
  });

  it("never exposes Other when a legacy row has no custom company", () => {
    expect(getDisplayedGradingCompany("Other", null)).toBe("Grading company not specified");
    expect(getDisplayedGradingCompany("Other", "")).toBe("Grading company not specified");
  });

  it("preserves named companies and uses the requested fallback when empty", () => {
    expect(getDisplayedGradingCompany("PSA", null)).toBe("PSA");
    expect(getDisplayedGradingCompany(null, null, "Ungraded")).toBe("Ungraded");
  });
});

import { describe, expect, it } from "vitest";
import { classifyUspsBrowserResponse } from "./uspsBrowserFeasibility";

describe("USPS browser feasibility classifier", () => {
  it("classifies an access-denied page as a challenge or block", () => {
    const result = classifyUspsBrowserResponse({
      title: "Access Denied",
      htmlText: "Access Denied You don't have permission to access this resource.",
    });

    expect(result.category).toBe("challenge_or_block");
    expect(result.confidence).toBe("high");
  });

  it("classifies explicit USPS tracking text as a normal result without claiming validity", () => {
    const result = classifyUspsBrowserResponse({
      title: "USPS Tracking Results",
      htmlText: "Tracking Results Tracking Not Available. The label was created, not yet in system.",
    });

    expect(result.category).toBe("normal_result");
    expect(result.confidence).toBe("medium");
  });

  it("classifies an empty or unrelated response as unavailable", () => {
    const result = classifyUspsBrowserResponse({ title: "", htmlText: "" });

    expect(result.category).toBe("unavailable");
    expect(result.evidence).toBe("");
  });
});

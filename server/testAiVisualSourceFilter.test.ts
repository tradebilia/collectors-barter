import { describe, expect, it } from "vitest";
import {
  applyVisualSourceReviews,
  normalizeVisualSourceReviews,
} from "./testAiVisualSourceFilter";

describe("visual source filter", () => {
  it("removes only high-confidence mismatches and retains uncertainty", () => {
    const rows = normalizeVisualSourceReviews(
      {
        reviews: [
          {
            candidateIndex: 0,
            verdict: "match",
            confidence: "high",
            rationale: "same object",
          },
          {
            candidateIndex: 1,
            verdict: "mismatch",
            confidence: "high",
            rationale: "different object type",
          },
          {
            candidateIndex: 2,
            verdict: "mismatch",
            confidence: "medium",
            rationale: "unclear crop",
          },
        ],
      },
      3
    );
    const result = applyVisualSourceReviews(
      [{ title: "a" }, { title: "b" }, { title: "c" }],
      rows,
      3
    );
    expect(result.listings.map(item => item.title)).toEqual(["a", "c"]);
    expect(result.removedCount).toBe(1);
  });
});

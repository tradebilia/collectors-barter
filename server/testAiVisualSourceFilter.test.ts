import { describe, expect, it } from "vitest";
import {
  applyVisualSourceReviews,
  normalizeVisualSourceReviews,
} from "./testAiVisualSourceFilter";

describe("visual source filter", () => {
  it("retains high-confidence visual mismatches as review evidence", () => {
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
    expect(result.listings.map(item => item.title)).toEqual(["a", "b", "c"]);
    expect(result.listings[1]).toMatchObject({
      visualReviewStatus: "mismatch",
      evidenceDisposition: "warning_review",
    });
    expect(result.removedCount).toBe(0);
  });
});

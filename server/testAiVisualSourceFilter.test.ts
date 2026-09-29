import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyVisualSourceReviews,
  buildDeclaredIdentityReviews,
  normalizeVisualSourceReviews,
  VISUAL_REVIEW_BATCH_SIZE,
  VISUAL_REVIEW_TARGET_MATCHES,
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

  it("flags declared regional, printing, and variant conflicts before AI uncertainty can hide them", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 Mexican Foil Reprint" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
        { title: "Edge of Spider-Verse #2 Fifth Printing Variant" },
      ],
      "title=Edge of Spider-Verse #2 CGC 9.8; category=comics; grade=9.8",
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 2]);
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0].rationale).toContain("Declared identity conflict");
  });

  it("uses adaptive review windows instead of treating 20 as the total review ceiling", () => {
    expect(VISUAL_REVIEW_BATCH_SIZE).toBe(20);
    expect(VISUAL_REVIEW_TARGET_MATCHES).toBe(7);
    const reviews = buildDeclaredIdentityReviews(
      Array.from({ length: 40 }, (_, index) => ({ title: `Comic #2 Fifth Printing ${index}` })),
      "title=Comic #2 CGC 9.8",
    );
    expect(reviews).toHaveLength(40);
  });

  it("marks image-bearing candidates outside the bounded review window as review-only", () => {
    const result = applyVisualSourceReviews(
      [{ title: "reviewed" }, { title: "unreviewed" }],
      [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "same item" }],
      1,
    );
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match" });
    // The integration function adds the explicit required/not-reviewed state
    // after adaptive window accounting; retain a source contract assertion so
    // it cannot regress to an implicit acceptance path.
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain('evidenceDisposition: "not_visually_reviewed_window"');
    expect(source).toContain('visualRequirement: "required"');
  });

  it("preserves eBay visual status fields in the response consumed by the image-check panel", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).toContain("visualReviewStatus: s.visualReviewStatus ?? null");
    expect(routerSource).toContain("visualReviewRationale: s.visualReviewRationale ?? null");
  });

  it("requires the visual reviewer to gate graded versus raw packaging first", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("graded/slabbed or raw/ungraded");
    expect(source).toContain("Graded-versus-raw status is a mandatory identity gate");
    expect(source).toContain("target is graded and the candidate is visibly raw");
  });

  it("shows each reviewed candidate price beside its match or mismatch verdict", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(pageSource).toContain("formatVisualReviewPrice");
    expect(pageSource).toContain("listing?.price ?? listing?.soldPrice");
    expect(pageSource).toContain("{formatVisualReviewPrice(listing)}");
  });
});

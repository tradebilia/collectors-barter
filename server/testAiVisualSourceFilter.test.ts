import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyVisualSourceReviews,
  applyDeclaredIdentityFilter,
  buildDeclaredIdentityReviews,
  conservativeComicVisualReviews,
  conservativeGradedVisualReviews,
  hasExplicitlyUngradedTarget,
  normalizeExplicitUngradedVisualReviews,
  normalizeVisualSourceReviews,
  prioritizeVisualSourceCandidates,
  shouldReviewAdditionalVisualImages,
  sportsCardSetInstruction,
  VISUAL_REVIEW_MAX_CANDIDATES,
  VISUAL_REVIEW_BATCH_SIZE,
  VISUAL_REVIEW_TARGET_MATCHES,
  VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS,
  VISUAL_REVIEW_OVERALL_DEADLINE_MS,
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

  it("downgrades broad comic visual matches when exact issue or cover evidence is absent", () => {
    const result = conservativeComicVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "Same Star Wars characters and CGC holder." },
    ], [{ title: "Star Wars #1 CGC 9.8" }], "title=Star Wars #1; category=comics");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("exact-issue or cover-art confirmation");
  });

  it("downgrades an unclear graded-comic mismatch to manual review when metadata declares a grade", () => {
    const result = conservativeComicVisualReviews([
      { candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "The low-resolution image appears raw and the holder is not visible." },
    ], [{ title: "X-Men #137 CGC 9.8 Newsstand" }], "title=X-Men #137; category=comics");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("rather than a definitive mismatch");
  });

  it("downgrades a graded visual match when the candidate grade is not readable", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "Both figures are in AFA holders and the character/package layout matches, but the candidate grade is not visible." },
    ], [{ title: "MOTU 1982 Vintage 8 Card Man-at-Arms AFA Graded RARE!" }], "title=MOTU 1982 Vintage 8 Card Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("numeric or descriptive grade is not clearly verified");
  });

  it("keeps a graded visual match only when the candidate grade is explicitly verified", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 8.0 grade is clearly readable on the candidate label and matches the target; the figure and packaging also match." },
    ], [{ title: "MOTU 1982 Man-at-Arms AFA 8.0" }], "title=MOTU 1982 Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("treats structured Is graded = No as authoritative and skips graded-target enforcement", () => {
    const metadata = 'title=Monster High; category=vintage_toys; grade=unknown; certificationCompany=unknown; fullItemDetails={"isGraded":"No"}';
    expect(hasExplicitlyUngradedTarget(metadata)).toBe(true);
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The raw item artwork matches." },
    ], [{ title: "Monster High Draculaura raw" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("promotes a contradictory unreadable review when both raw items and identity match are explicitly confirmed", () => {
    const metadata = 'title=Monster High Draculaura; category=vintage_toys; fullItemDetails={"isGraded":"No"}';
    const result = normalizeExplicitUngradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "Both target and candidate are raw/ungraded. The front artwork, packaging, and layout match, but the target is graded wording is not applicable." },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
    expect(result[0].rationale).toContain("Is graded = No");
  });

  it("does not promote an ungraded review when a material identity conflict remains", () => {
    const metadata = 'title=Monster High Draculaura; category=vintage_toys; isGraded=No';
    const result = normalizeExplicitUngradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "Both target and candidate are raw/ungraded, but this is a different edition and the artwork conflicts." },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
  });

  it("treats equivalent AFA plus-grade formats as the same numeric grade", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 75+ grade is clearly readable on the gallery label and matches the target." },
    ], [{ title: "MOTU Man-at-Arms AFA 75+ Masters of the Universe" }], "title=MOTU Man-at-Arms; category=vintage_toys; grade=75.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("blocks a graded loose vintage toy when the target is graded and carded", () => {
    const metadata = `title=G.I. Joe Snake Eyes; category=vintage_toys; grade=90; certificationCompany=AFA; fullItemDetails=${JSON.stringify({ packagingType: "carded" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "G.I. Joe Snake Eyes AFA 90 Loose Action Figure" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("packaging form differs");
  });

  it("blocks a graded carded vintage toy when the target is graded and loose", () => {
    const metadata = `title=G.I. Joe Snake Eyes; category=vintage_toys; grade=90; certificationCompany=AFA; fullItemDetails=${JSON.stringify({ packagingType: "loose" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "G.I. Joe Snake Eyes AFA 90 Carded" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("packaging form differs");
  });

  it("exposes the vintage-toy packaging-form gate in the vision prompt", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("packaging form is a mandatory identity gate");
    expect(source).toContain("carded/on-card/blister-card");
  });

  it("promotes an unreadable review only when title and gallery rationale explicitly confirm the grade", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The AFA 75+ grade is clearly readable in the additional gallery image and matches the target; the holder and item also match." },
    ], [{ title: "MOTU Man-at-Arms AFA 75+" }], "title=MOTU Man-at-Arms; category=vintage_toys; grade=75; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
  });

  it("requests additional gallery images when the primary review cannot verify a graded target", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "MOTU Man-at-Arms AFA Graded RARE",
      targetMetadata: "title=MOTU Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA",
      review: { verdict: "match", confidence: "high", rationale: "The holder matches, but the candidate grade is not visible." },
    })).toBe(true);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "MOTU Man-at-Arms AFA 8.0",
      targetMetadata: "title=MOTU Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA",
      review: { verdict: "match", confidence: "high", rationale: "The AFA 8.0 grade is readable and matches." },
    })).toBe(false);
  });

  it("preserves long visual explanations instead of cutting them off at 240 characters", () => {
    const ending = "The candidate front art, packaging, and visible certification details require manual comparison before any valuation decision.";
    const longRationale = `${"The target and candidate were compared across packaging, orientation, visible holder details, and front artwork. ".repeat(8)}${ending}`;
    const rows = normalizeVisualSourceReviews({
      reviews: [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: longRationale }],
    }, 1);

    expect(rows[0].rationale.length).toBeGreaterThan(240);
    expect(rows[0].rationale).toContain(ending);
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

  it("flags explicit Newsstand candidates when the target is Direct before visual review", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 CGC 9.8 Newsstand Edition" },
        { title: "Edge of Spider-Verse #2 CGC 9.8 Direct Market" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; category=comics; itemDetails=${JSON.stringify({ distributionType: "Direct" })}`,
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0]);
    expect(reviews[0].rationale).toContain("Distribution Type is Direct");
  });

  it("flags explicit facsimile or reprint candidates when the target Facsimile field is No", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 CGC 9.8 Facsimile" },
        { title: "Edge of Spider-Verse #2 CGC 9.8 Reprint" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; category=comics; fullItemDetails=${JSON.stringify({ facsimile: "No" })}`,
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 1]);
    expect(reviews[0].rationale).toContain("Facsimile is No");
  });

  it("keeps the new identity conflicts out of the initial vision queue", () => {
    const candidates = [
      { candidateIndex: 0, item: { title: "Edge of Spider-Verse #2 Newsstand Edition" }, imageUrl: "https://example.com/newsstand.jpg" },
      { candidateIndex: 1, item: { title: "Edge of Spider-Verse #2 Direct Market" }, imageUrl: "https://example.com/direct.jpg" },
    ];
    const metadata = `title=Edge of Spider-Verse #2; category=comics; fullItemDetails=${JSON.stringify({ distributionType: "Direct" })}`;
    const declared = buildDeclaredIdentityReviews(candidates.map((candidate) => candidate.item), metadata);
    const queue = prioritizeVisualSourceCandidates(candidates, metadata, declared);
    expect(queue.map((candidate) => candidate.candidateIndex)).toEqual([1]);
  });

  it("does not guess a distribution type when a marketplace title is silent", () => {
    const reviews = buildDeclaredIdentityReviews(
      [{ title: "Edge of Spider-Verse #2 CGC 9.8" }],
      `title=Edge of Spider-Verse #2 CGC 9.8; itemDetails=${JSON.stringify({ distributionType: "Direct" })}`,
    );
    expect(reviews).toEqual([]);
  });

  it("keeps the identity gate source-neutral for every shared marketplace caller", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).toContain("sourceLabel: 'eBay active listings'");
    expect(routerSource).toContain("sourceLabel: '130point sold listings'");
    expect(routerSource).toContain("sourceLabel: 'PWCC / Fanatics Collect sold listings'");
    expect(routerSource).toContain("itemDetails=${input.itemDetails ?? 'unknown'}");
  });

  it("removes explicit Facsimile titles before the initial listing display and retains context", () => {
    const result = applyDeclaredIdentityFilter(
      [
        { title: "Edge of Spider-Verse: Facsimile Edition #2 CGC 9.8" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; fullItemDetails=${JSON.stringify({ facsimile: "No" })}`,
    );
    expect(result.listings.map((listing) => listing.title)).toEqual(["Edge of Spider-Verse #2 CGC 9.8"]);
    expect(result.contextListings.map((listing) => listing.title)).toEqual(["Edge of Spider-Verse: Facsimile Edition #2 CGC 9.8"]);
    expect(result.removedCount).toBe(1);
  });

  it("uses adaptive 20-item batches until three matches or the 50-image ceiling", () => {
    expect(VISUAL_REVIEW_BATCH_SIZE).toBe(20);
    expect(VISUAL_REVIEW_TARGET_MATCHES).toBe(3);
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(50);
    const reviews = buildDeclaredIdentityReviews(
      Array.from({ length: 40 }, (_, index) => ({ title: `Comic #2 Fifth Printing ${index}` })),
      "title=Comic #2 CGC 9.8",
    );
    expect(reviews).toHaveLength(40);
  });

  it("prioritizes a bounded initial queue while preserving explicit conflicts outside vision", () => {
    const candidates = Array.from({ length: 60 }, (_, candidateIndex) => ({
      candidateIndex,
      item: { title: candidateIndex === 59 ? "Edge of Spider-Verse #2 Fifth Printing" : `Edge of Spider-Verse #2 CGC 9.8 copy ${candidateIndex}` },
      imageUrl: `https://example.com/${candidateIndex}.jpg`,
    }));
    const metadata = "title=Edge of Spider-Verse #2 CGC 9.8; category=comics; grade=9.8";
    const declared = buildDeclaredIdentityReviews(candidates.map(candidate => candidate.item), metadata);
    const queue = prioritizeVisualSourceCandidates(candidates, metadata, declared);
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(50);
    expect(queue).toHaveLength(50);
    expect(queue.some(candidate => candidate.candidateIndex === 59)).toBe(false);
    expect(candidates).toHaveLength(60);
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
    expect(routerSource).toContain("collectEbayImageUrls");
    expect(routerSource).toContain("imageUrls: collectEbayImageUrls(s)");
  });

  it("requires the visual reviewer to gate graded versus raw packaging first", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("graded/slabbed or raw/ungraded");
    expect(source).toContain("Graded-versus-raw status is a mandatory identity gate");
    expect(source).toContain("target is graded and the candidate is visibly raw");
    expect(source).toContain("candidate numeric or descriptive grade is also mandatory");
    expect(source).toContain("candidate grade is not clearly readable");
    expect(source).toContain("structured metadata explicitly says Is graded = No");
    expect(source).toContain("Treat the target as raw/ungraded for this review");
  });

  it("requires the visual reviewer to gate sports-card set versus single-card form", () => {
    const instruction = sportsCardSetInstruction("title=1985 Topps Complete Set; category=sports_cards; itemType=card_set");
    expect(instruction).toContain("item form is a mandatory identity gate");
    expect(instruction).toContain("one individual card");
    expect(instruction).toContain("mark mismatch with high confidence");
    expect(sportsCardSetInstruction("title=1985 Topps #401; category=sports_cards; itemType=single_card")).toBe("");
  });

  it("ignores unique certificate IDs when visually comparing graded coins", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain('category === "coins" && isGraded');
    expect(source).toContain("certificate IDs/numbers are unique to each individual coin");
    expect(source).toContain("never mark a coin mismatch because the visible certificate ID differs");
    expect(source).toContain("never require the IDs to match");
  });

  it("shows each reviewed candidate price beside its match or mismatch verdict", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(pageSource).toContain("formatVisualReviewPrice");
    expect(pageSource).toContain("listing?.price ?? listing?.soldPrice");
    expect(pageSource).toContain("{formatVisualReviewPrice(listing)}");
  });

  it("keeps visual review bounded and fails closed when the provider times out", () => {
    expect(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS).toBe(20_000);
    expect(VISUAL_REVIEW_OVERALL_DEADLINE_MS).toBe(120_000);
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("completed_with_timeout");
    expect(source).toContain("Remaining candidates are retained for manual review and cannot enter valuation implicitly.");
    expect(source).toContain("controller.abort()");
  });

  it("explains timeout and partial-review states in the eBay Active UI", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(pageSource).toContain("maximum 2 minutes");
    expect(pageSource).toContain("Only candidates with a completed visual result can support current-value evidence");
    expect(pageSource).toContain("cannot enter the analyzer implicitly");
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import {
  applyDeclaredIdentityFilter,
  buildDeclaredIdentityReviews,
  buildMetadataFieldComparisons,
  buildVisualTargetMetadata,
  musicVisualScore,
  prepareUniversalVisualCandidates,
  withMetadataFieldComparisons,
  type VisualSourceCandidate,
} from "./testAiVisualSourceFilter";

const identity = { artist: "Nirvana", releaseTitle: "Nevermind", format: "cassette_tape" };
const target = (condition: string | undefined = "good", details: Record<string, unknown> = {}) => buildVisualTargetMetadata({
  title: "Nevermind",
  category: "music",
  itemType: "cassette_tape",
  condition,
  fullItemDetails: { ...identity, ...details },
});
const candidate = (title = "Nirvana Nevermind Cassette Tape", details: Record<string, unknown> = {}): VisualSourceCandidate => ({
  title,
  itemDetails: JSON.stringify({ ...identity, ...details }),
});
const conditionRow = (metadata: string, listing: VisualSourceCandidate) => buildMetadataFieldComparisons(metadata, listing)
  .find(row => row.fieldKey === "condition");

// Pure deterministic helpers only: no filterVisualSourceCandidates, image
// fetching, model calls, database or application startup in this suite.
describe("Music material-state precedence repair", () => {
  it.each([
    ["vinyl_record", "Vinyl LP"],
    ["cassette_tape", "Cassette Tape"],
    ["compact_disc", "CD"],
    ["eight_track_tape", "8-track Tape"],
    ["other_music_format", "Music Box Set"],
  ])("holds Factory Sealed over structured Good for %s", (itemType, formatLabel) => {
    const metadata = buildVisualTargetMetadata({
      title: "Nevermind", category: "music", itemType, condition: "good",
      fullItemDetails: { artist: "Nirvana", releaseTitle: "Nevermind", format: itemType },
    });
    const listing = {
      title: `Nirvana Nevermind ${formatLabel} Factory Sealed`,
      condition: "Good",
      itemDetails: JSON.stringify({ artist: "Nirvana", releaseTitle: "Nevermind", format: itemType }),
    };
    expect(buildDeclaredIdentityReviews([listing], metadata)[0]).toMatchObject({
      verdict: "mismatch", confidence: "high",
      rationale: expect.stringContaining("candidate explicitly declares sealed"),
    });
    const filtered = applyDeclaredIdentityFilter([listing], metadata);
    expect(filtered.listings).toEqual([]);
    expect(filtered.contextListings).toEqual([listing]);
    expect(filtered.removedCount).toBe(1);
  });

  it.each([
    ["top-level condition", { condition: "Good" }],
    ["top-level mediaCondition", { mediaCondition: "Good" }],
    ["JSON itemDetails", { itemDetails: JSON.stringify({ ...identity, condition: "Good" }) }],
    ["fullItemDetails mediaCondition", { fullItemDetails: { ...identity, mediaCondition: "Good" } }],
    ["normalized structured metadata", { normalizedStructuredMetadata: { ...identity, condition: "Good" } }],
    ["placeholder direct condition", { condition: "Unknown", itemDetails: JSON.stringify({ ...identity, condition: "Good" }) }],
  ])("reads title material states alongside %s", (_label, fields) => {
    const listing = { ...candidate("Nirvana Nevermind Cassette Factory Sealed"), ...fields };
    expect(buildDeclaredIdentityReviews([listing], target())[0]?.rationale).toContain("candidate explicitly declares sealed");
  });

  it.each(["excellent", "good", "fair"])("lets title hard states precede structured %s", condition => {
    for (const [declaration, state] of [["Factory Sealed", "sealed"], ["For Parts", "for parts"], ["Parts Only", "for parts"]]) {
      const listing = candidate(`Nirvana Nevermind Cassette ${declaration}`, { condition });
      expect(buildDeclaredIdentityReviews([listing], target(condition))[0]?.rationale).toContain(`candidate explicitly declares ${state}`);
    }
  });

  it.each(["Sealed", "Factory Sealed", "New / Sealed", "New|Sealed", "Factory-Sealed"])("normalizes supported title declaration %s", declaration => {
    const listing = candidate(`Nirvana Nevermind Cassette ${declaration}`, { condition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], target("New / Sealed"))).toEqual([]);
    expect(conditionRow(target("New / Sealed"), listing)).toMatchObject({
      candidateValue: "Good", status: "different",
      titleDerivedValue: "sealed (inferred from title)", titleDerivedStatus: "match",
    });
  });

  it.each([
    ["sealed", "For Parts", "good", "sealed"],
    ["for_parts", "Factory Sealed", "good", "for parts"],
    ["sealed", "For Parts", "sealed", null],
    ["for_parts", "Factory Sealed", "for_parts", null],
  ])("preserves structured %s even when the title says %s", (condition, declaration, targetCondition, expectedState) => {
    const listing = candidate(`Nirvana Nevermind Cassette ${declaration}`, { condition });
    const reviews = buildDeclaredIdentityReviews([listing], target(targetCondition));
    if (expectedState) expect(reviews[0]?.rationale).toContain(`candidate explicitly declares ${expectedState}`);
    else expect(reviews).toEqual([]);
    // Both observations remain visible; title evidence does not replace the
    // provider's hard-state declaration in the structured comparison column.
    expect(conditionRow(target(targetCondition), listing)?.candidateValue).toBe(condition);
  });

  it.each([
    "Not Sealed", "Unsealed", "No Longer Sealed", "Not Factory Sealed",
    "No Longer Factory Sealed", "Not New / Sealed", "Isn't Sealed",
    "Un-Sealed", "Non-Sealed",
    "Not For Parts", "Not Parts Only", "Not Sold For Parts", "Not Just For Parts",
    "No Longer For Parts", "Not For-Parts", "Without Parts Only", "Not For Parts Only",
  ])("does not promote negative title declaration %s to a hard state", declaration => {
    const listing = candidate(`Nirvana Nevermind Cassette ${declaration}`, { condition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], target())).toEqual([]);
    expect(conditionRow(target(), listing)).toMatchObject({
      candidateValue: "Good", status: "match", titleDerivedValue: "Unknown", titleDerivedStatus: "unknown",
    });
  });

  it("does not let one negative declaration swallow a separate positive hard state", () => {
    const listing = candidate("Nirvana Nevermind Cassette Not Sealed, For Parts", { condition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], target())[0]?.rationale).toContain("candidate explicitly declares for parts");
  });

  it("preserves a structured sealed contradiction despite a negative title declaration", () => {
    const listing = candidate("Nirvana Nevermind Cassette Not Sealed", { condition: "sealed" });
    expect(buildDeclaredIdentityReviews([listing], target())[0]?.rationale).toContain("candidate explicitly declares sealed");
    expect(conditionRow(target(), listing)).toMatchObject({ candidateValue: "sealed", status: "different", titleDerivedValue: "Unknown" });
  });

  it.each([undefined, "Unknown", "N/A", "Used"])("keeps unsupported or absent candidate condition %s unknown", condition => {
    const listing = candidate("Nirvana Nevermind Cassette Unsealed", { condition });
    expect(buildDeclaredIdentityReviews([listing], target("sealed"))).toEqual([]);
    expect(conditionRow(target("sealed"), listing)).toMatchObject({ status: "unknown", titleDerivedStatus: "unknown" });
  });

  it("does not fabricate a target condition from a candidate hard state", () => {
    expect(buildDeclaredIdentityReviews([candidate("Nirvana Nevermind Cassette Factory Sealed", { condition: "Good" })], target(""))).toEqual([]);
  });

  it.each([["excellent", "Good condition"], ["good", "Excellent condition"], ["fair", "Good condition"]])("leaves subjective %s vs %s for review", (condition, declaration) => {
    expect(buildDeclaredIdentityReviews([candidate(`Nirvana Nevermind Cassette ${declaration}`)], target(condition))).toEqual([]);
  });

  it("uses the canonical provider title for gating and comparison diagnostics", () => {
    const listing = { ...candidate("Nirvana Nevermind Cassette", { condition: "Good" }), normalizedListingTitle: "Factory Sealed Nirvana Nevermind Cassette" };
    expect(buildDeclaredIdentityReviews([listing], target())[0]?.rationale).toContain("candidate explicitly declares sealed");
    expect(conditionRow(target(), listing)).toMatchObject({ titleDerivedValue: "sealed (inferred from title)", titleDerivedStatus: "different" });
  });
});

describe("Music identity and diagnostic boundaries", () => {
  it("applies the same title condition semantics to the mediaCondition alias row", () => {
    const metadata = target("", { mediaCondition: "good" });
    const listing = candidate("Nirvana Nevermind Cassette For Parts", { mediaCondition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], metadata)[0]?.rationale).toContain("candidate explicitly declares for parts");
    expect(buildMetadataFieldComparisons(metadata, listing).find(row => row.fieldKey === "mediaCondition")).toMatchObject({
      candidateValue: "Good", status: "match", titleDerivedValue: "for parts (inferred from title)", titleDerivedStatus: "different",
    });
  });

  it.each([
    { artist: "Brian Hyland", releaseTitle: "Sealed With a Kiss" },
    { artist: "Sealed", releaseTitle: "Nevermind" },
    { artist: "Nirvana", releaseTitle: "Sealed" },
    { artist: "Nirvana", releaseTitle: "For Parts" },
  ])("does not interpret known artist/album identity $artist / $releaseTitle as a state", names => {
    const metadata = target("good", names);
    const listing = candidate(`${names.artist} ${names.releaseTitle} Cassette`, { ...names, condition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], metadata)).toEqual([]);
    expect(conditionRow(metadata, listing)?.titleDerivedValue).toBe("Unknown");
    const sealedListing = { ...listing, title: `${listing.title} Factory Sealed` };
    expect(buildDeclaredIdentityReviews([sealedListing], metadata)[0]?.rationale).toContain("candidate explicitly declares sealed");
    expect(conditionRow(metadata, sealedListing)?.titleDerivedStatus).toBe("different");
  });

  it("uses target identity to protect a title-only Sealed album name", () => {
    const metadata = target("good", { artist: "Brian Hyland", releaseTitle: "Sealed With a Kiss" });
    const listing = { title: "Brian Hyland Sealed With a Kiss Cassette", condition: "Good" };
    expect(buildDeclaredIdentityReviews([listing], metadata)).toEqual([]);
    expect(conditionRow(metadata, listing)?.titleDerivedValue).toBe("Unknown");
  });

  it("refreshes stale condition rows while preserving independent structured and title evidence", () => {
    const metadata = target();
    const listing = candidate("Nirvana Nevermind Cassette Factory Sealed", { condition: "Good" });
    const previous = buildMetadataFieldComparisons(metadata, candidate("Nirvana Nevermind Cassette", { condition: "Good" }));
    const projected = withMetadataFieldComparisons(metadata, { ...listing, metadataFieldComparisons: previous });
    const row = projected.metadataFieldComparisons.find(value => value.fieldKey === "condition");
    expect(row).toMatchObject({
      candidateValue: "Good", status: "match",
      titleDerivedValue: "sealed (inferred from title)", titleDerivedStatus: "different",
      rankingContribution: { matched: false, awardedPoints: 0, awards: [] },
    });
  });

  it("keeps Music scores and awards unchanged while the hard gate retains a conflicting listing as context", () => {
    const metadata = target();
    const ordinary = candidate("Nirvana Nevermind Cassette", { condition: "Good" });
    const sealed = { ...ordinary, title: `${ordinary.title} Factory Sealed` };
    const score = musicVisualScore(sealed, metadata);
    expect(score).toEqual(musicVisualScore(ordinary, metadata));
    expect(score.matched).toEqual(expect.arrayContaining(["artist", "releaseTitle", "format"]));
    expect(score.awards.some(award => /condition/i.test(award.field))).toBe(false);
    expect(applyDeclaredIdentityFilter([sealed], metadata).contextListings).toEqual([sealed]);
  });

  it("uses cassette item type and candidate title evidence in both scoring and the comparison table", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Nevermind", category: "music", itemType: "cassette_tape",
      fullItemDetails: { artist: "Nirvana", releaseTitle: "Nevermind" },
    });
    const listing = candidate("Nirvana Nevermind Cassette Tape");
    const score = musicVisualScore(listing, metadata);
    const formatRow = buildMetadataFieldComparisons(metadata, listing).find(row => row.fieldKey === "format");
    expect(score.matched).toContain("format");
    expect(score.awards.find(award => award.field === "format")?.awardedPoints).toBe(15);
    expect(formatRow).toMatchObject({ targetValue: "Cassette Tape", titleDerivedValue: "Cassette Tape (detected in title)", titleDerivedStatus: "match" });
  });

  it("does not bypass the independent artist identity gate when sealed states match", () => {
    const listing = candidate("Nirvana Nevermind Cassette Factory Sealed", { artist: "Pearl Jam", condition: "Good" });
    expect(buildDeclaredIdentityReviews([listing], target("sealed"))[0]?.rationale).toContain("Music artist differs");
  });

  it("does not bypass the independent graded-versus-raw gate when sealed states match", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Nevermind", category: "music", itemType: "cassette_tape", condition: "sealed", isGraded: "no",
      fullItemDetails: identity,
    });
    const listing = { ...candidate("Nirvana Nevermind Cassette Factory Sealed", { condition: "Good" }), isGraded: "yes", grade: "9.8", certificationCompany: "CGC" };
    expect(buildDeclaredIdentityReviews([listing], metadata)[0]?.rationale).toMatch(/grad/i);
  });

  it("does not bypass the independent numeric-grade gate when sealed states match", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Nevermind", category: "music", itemType: "cassette_tape", condition: "sealed", isGraded: "yes", grade: "9.8", certificationCompany: "CGC",
      fullItemDetails: identity,
    });
    const listing = { ...candidate("Nirvana Nevermind Cassette Factory Sealed", { condition: "sealed" }), isGraded: "yes", grade: "9.6", certificationCompany: "CGC" };
    expect(prepareUniversalVisualCandidates([listing], metadata).contextReasons.get(0)).toContain("Grade differs");
  });

  it("does not broaden Music-only condition diagnostics into other categories", () => {
    const metadata = buildVisualTargetMetadata({ title: "Nevermind", category: "movies", itemType: "dvd", condition: "good" });
    const listing = { title: "Nevermind DVD Factory Sealed", condition: "Good" };
    expect(conditionRow(metadata, listing)).toMatchObject({ candidateValue: "Good", status: "match", titleDerivedValue: "Unknown" });
    expect(buildDeclaredIdentityReviews([listing], metadata).some(review => review.rationale.includes("Music media condition"))).toBe(false);
  });
});

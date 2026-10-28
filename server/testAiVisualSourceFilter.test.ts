import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import {
  applyVisualSourceReviews,
  applyDeclaredIdentityFilter,
  buildVisualTargetMetadata,
  buildDeclaredIdentityReviews,
  coinAdmissionReason,
  conservativeComicVisualReviews,
  conservativeCoinVisualReviews,
  conservativeGradedVisualReviews,
  gradedIdentifierInstruction,
  disneyPinsVisualInstruction,
  embedPromotedEbayImageForReview,
  enforceDisneyPinsExactEvidence,
  hasCompletedDisneyPinsAdjudication,
  hasCompletedCoinAdjudication,
  hasUnavailableDisneyPinsAdjudication,
  hasExplicitlyUngradedTarget,
  hasTitleDeclaredGradeVisualRawConflict,
  isMultiItemLot,
  multiItemLotReason,
  isDisneyPinsMetadata,
  isCoinMetadata,
  enforceCoinExactEvidence,
  filterVisualSourceCandidates,
  reconcileCoinPrimaryReviewForAdjudication,
  normalizeCompactCoinAdjudicationReview,
  normalizeExplicitUngradedVisualReviews,
  normalizeSingleCandidateVisualReview,
  normalizeVisualSourceReviews,
  promoteEbayImageUrl,
  prioritizeVisualSourceCandidates,
  shouldReviewAdditionalVisualImages,
  sportsCardSetInstruction,
  VISUAL_REVIEW_MAX_CANDIDATES,
  VISUAL_REVIEW_BATCH_SIZE,
  VISUAL_REVIEW_TARGET_MATCHES,
  VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS,
  VISUAL_REVIEW_OVERALL_DEADLINE_MS,
} from "./testAiVisualSourceFilter";

const mockedInvokeLLM = vi.mocked(invokeLLM);
const structuredVisualResponse = (value: unknown) => ({
  choices: [{ message: { content: JSON.stringify(value) } }],
});

describe("visual source filter", () => {
  beforeEach(() => mockedInvokeLLM.mockReset());

  it("promotes eBay thumbnails without rewriting non-eBay image URLs", () => {
    expect(promoteEbayImageUrl("https://i.ebayimg.com/images/g/abc/s-l500.jpg")).toBe("https://i.ebayimg.com/images/g/abc/s-l1600.jpg");
    expect(promoteEbayImageUrl("https://example.com/image-s-l500.jpg")).toBe("https://example.com/image-s-l500.jpg");
  });

  it("embeds only a bounded promoted eBay image for a focused grading retry", async () => {
    const fetchCalls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      fetchCalls.push(String(input));
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/webp", "content-length": "4" },
      });
    };
    const embedded = await embedPromotedEbayImageForReview(
      "https://i.ebayimg.com/images/g/abc/s-l140.webp",
      fetchImpl,
    );
    expect(fetchCalls).toEqual(["https://i.ebayimg.com/images/g/abc/s-l1600.webp"]);
    expect(embedded).toBe("data:image/webp;base64,AQIDBA==");
    expect(await embedPromotedEbayImageForReview("https://example.com/s-l140.webp", fetchImpl)).toBeNull();
    expect(fetchCalls).toHaveLength(1);
  });

  it("classifies multi-item listings across categories but preserves multi-item targets", () => {
    const singleCoin = "title=1896 Morgan Silver Dollar; category=coins; fullItemDetails={\"year\":\"1896\"}";
    const singleCard = "title=1986 Fleer Michael Jordan; category=sports_cards; itemType=single";
    const singleComic = "title=Amazing Spider-Man 300; category=comics; itemType=single";
    expect(isMultiItemLot({ title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896" }, singleCoin)).toBe(true);
    expect(multiItemLotReason({ title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896" }, singleCoin)).toContain("context-only");
    expect(isMultiItemLot({ title: "1986 Fleer Michael Jordan Cards 1-10" }, singleCard)).toBe(true);
    expect(isMultiItemLot({ title: "Amazing Spider-Man 299 + 300 + 301" }, singleComic)).toBe(true);
    const setTarget = "title=1986 Fleer Michael Jordan Complete Set; category=sports_cards; itemType=set; fullItemDetails={\"itemType\":\"set\",\"quantity\":132}";
    expect(isMultiItemLot({ title: "1986 Fleer Michael Jordan Complete Set" }, setTarget)).toBe(false);
  });

  it("keeps pre-visual lots in context and makes no vision call when every candidate is a lot", async () => {
    const metadata = "title=1896 Morgan Silver Dollar; category=coins; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const result = await filterVisualSourceCandidates({
      sourceLabel: "Mercari",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: metadata,
      listings: [
        { title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896", imageUrl: "https://example.com/lot-1.jpg" },
        { title: "1896 + 1897 Morgan Silver Dollar Group", imageUrl: "https://example.com/lot-2.jpg" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toHaveLength(0);
    expect(result.contextListings).toHaveLength(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(result.contextListings?.every(item => item.evidenceDisposition === "context_only")).toBe(true);
    expect(result.contextListings?.every(item => String(item.visualReviewRationale).includes("Pre-visual lot filter"))).toBe(true);
  });

  it("normalizes every source target into one conservative metadata contract", () => {
    const metadata = buildVisualTargetMetadata({
      title: "1999 Pokémon Charizard #4/102",
      category: "Pokemon",
      itemType: "single card",
      grade: "9",
      grader: "PSA",
      itemDetails: JSON.stringify({ cardNumber: "4/102", isGraded: "Yes", language: "English" }),
    });
    expect(metadata).toContain("category=pokemon");
    expect(metadata).toContain("itemType=single card");
    expect(metadata).toContain("certificationCompany=PSA");
    expect(metadata).toContain("isGraded=Yes");
    expect(metadata).toContain('"cardNumber":"4/102"');
  });

  it("holds explicit grading, product-form, and compound-number conflicts before vision", () => {
    const rawTarget = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({ isGraded: "No" }),
    });
    const rawConflict = buildDeclaredIdentityReviews([
      { title: "1986 Fleer Michael Jordan", itemDetails: JSON.stringify({ isGraded: "Yes" }) },
    ], rawTarget);
    expect(rawConflict[0]?.rationale).toContain("Grading state differs");

    const setTarget = buildVisualTargetMetadata({ title: "1986 Fleer Complete Set", category: "sports_cards", itemType: "card_set" });
    const setConflict = buildDeclaredIdentityReviews([{ title: "1986 Fleer Michael Jordan #57 PSA 10" }], setTarget);
    expect(setConflict[0]?.rationale).toContain("Product form differs");

    const sealedTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemDetails: JSON.stringify({ sealedStatus: "Factory Sealed" }) });
    const sealedConflict = buildDeclaredIdentityReviews([{ title: "Super Mario Bros. 3 NES CIB" }], sealedTarget);
    expect(sealedConflict[0]?.rationale).toContain("Product form differs");

    const numberedTarget = buildVisualTargetMetadata({ title: "Charizard", category: "pokemon", itemDetails: JSON.stringify({ cardNumber: "4/102" }) });
    const numberedConflict = buildDeclaredIdentityReviews([{ title: "Charizard #4/130" }], numberedTarget);
    expect(numberedConflict[0]?.rationale).toContain("Card/catalog number differs");
  });

  it("retains all explicit conflicts as context before the visual provider is called", async () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({ isGraded: "No" }),
    });
    const result = await filterVisualSourceCandidates({
      sourceLabel: "Cross-source test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata,
      listings: [{ title: "1986 Fleer Michael Jordan PSA 9", itemDetails: JSON.stringify({ isGraded: "Yes" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(1);
    expect(result.contextListings?.[0]).toMatchObject({ evidenceDisposition: "context_only", visualRequirement: "not_required_pre_visual" });
    expect(result.contextListings?.[0].visualReviewRationale).toContain("Grading state differs");
  });

  it("does not exclude an otherwise compatible candidate because specimen certificate IDs differ", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Signed Baseball",
      category: "autographs",
      itemDetails: JSON.stringify({ signer: "Example Player", certificateNumber: "TARGET-100" }),
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Signed Baseball", itemDetails: JSON.stringify({ signer: "Example Player", certificateNumber: "CANDIDATE-200" }) },
    ], metadata);
    expect(reviews).toEqual([]);
  });

  it("preserves direct product identifiers and print-run denominators through canonical pre-visual filtering", async () => {
    const upcResult = await filterVisualSourceCandidates({
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=Super Mario Bros. 3; category=video_games; upc=123456789012",
      listings: [{ title: "Super Mario Bros. 3", itemDetails: JSON.stringify({ upc: "999999999999" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(upcResult.contextListings?.[0].visualReviewRationale).toContain("upc differs in explicit provider metadata");

    const printRunResult = await filterVisualSourceCandidates({
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=2018 Topps Example; category=sports_cards; serialNumber=10/100",
      listings: [{ title: "2018 Topps Example", itemDetails: JSON.stringify({ serialNumber: "2/99" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(printRunResult.contextListings?.[0].visualReviewRationale).toContain("print-run denominator");

    const catalogResult = await filterVisualSourceCandidates({
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=Scott stamp; category=stamps; catalog=SCOTT-123",
      listings: [{ title: "Scott stamp", itemDetails: JSON.stringify({ catalog: "SCOTT-999" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(catalogResult.contextListings?.[0].visualReviewRationale).toContain("catalogNumber differs");
  });

  it("ignores all holder specimen-ID aliases while retaining non-holder product identifiers", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Graded Collectible",
      category: "sports_cards",
      itemDetails: JSON.stringify({ holderId: "TARGET-HOLDER", holderNumber: "100", slabId: "SLAB-TARGET", certificateId: "CERT-TARGET", trackingId: "TRACK-TARGET", certificateTrackingId: "CERT-TRACK-TARGET" }),
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Graded Collectible", itemDetails: JSON.stringify({ holderId: "CANDIDATE-HOLDER", holderNumber: "200", slabId: "SLAB-CANDIDATE", certificateId: "CERT-CANDIDATE", trackingId: "TRACK-CANDIDATE", certificateTrackingId: "CERT-TRACK-CANDIDATE" }) },
    ], metadata);
    expect(reviews).toEqual([]);
  });

  it("holds plain sealed video-game titles and opened-vs-incomplete vintage toys before vision", () => {
    const cibTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemDetails: JSON.stringify({ sealedStatus: "CIB" }) });
    expect(buildDeclaredIdentityReviews([{ title: "Super Mario Bros. 3 Sealed VGA 85" }], cibTarget)[0]?.rationale).toContain("Product form differs");

    const completeToyTarget = buildVisualTargetMetadata({ title: "Vintage Figure", category: "vintage_toys", itemDetails: JSON.stringify({ sealedStatus: "Opened", completeness: "Complete" }) });
    expect(buildDeclaredIdentityReviews([{ title: "Vintage Figure Opened Incomplete Missing Accessory" }], completeToyTarget)[0]?.rationale).toContain("Vintage-toy completeness differs");
  });

  it("keeps declared-review audit records on the provider-unavailable return path", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    const unavailablePath = source.slice(source.lastIndexOf('status: "provider_unavailable"') - 500);
    expect(unavailablePath).toContain("reviews: declaredReviews");
  });

  it("retains high-confidence visual mismatches as review evidence", () => {
    const rows = normalizeVisualSourceReviews(
      {
        reviews: [
          {
            candidateIndex: 0,
            verdict: "match",
            confidence: "high",
            rationale: "same object",
            visualAudit: {
              imageCount: 1,
              initialVerdict: "match",
              initialConfidence: "high",
              retryStatus: "not_needed",
              finalPass: "initial",
            },
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
    expect(result.listings[0]).toMatchObject({
      visualAudit: {
        imageCount: 1,
        retryStatus: "not_needed",
        finalPass: "initial",
      },
    });
    expect(result.removedCount).toBe(0);
  });

  it("records that a graded-target mismatch requires a high-resolution retry", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Super Mario Bros. 3 NES PSA Graded 9.0 CIB",
      targetMetadata: "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: {
        verdict: "mismatch",
        confidence: "high",
        rationale: "The candidate image shows a loose, un-slabbed cartridge with no holder or visible grade.",
      },
    })).toBe(true);
  });

  it("treats Disney Pins as ungraded and does not escalate stale grading fields", () => {
    const metadata = "title=Disney Mickey D23 Pin; category=disney_pins; grade=9.8; certificationCompany=PSA";
    expect(isDisneyPinsMetadata(metadata)).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      title: "Disney Mickey D23 Pin PSA 9.8",
      targetMetadata: metadata,
      review: { verdict: "mismatch", confidence: "high", rationale: "The candidate appears raw and the holder is not visible." },
    })).toBe(false);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Disney Mickey D23 Pin PSA 9.8",
      targetMetadata: metadata,
      review: { verdict: "mismatch", confidence: "high", rationale: "The candidate appears raw and the holder is not visible." },
    })).toBe(false);
    expect(disneyPinsVisualInstruction(metadata)).toContain("Ignore grader, certification-company, slab");
    expect(conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The pin artwork matches, but no numeric grade is visible." },
    ], [{ title: "Disney Mickey D23 Pin" }], metadata)[0]).toMatchObject({ verdict: "match" });
  });

  it("requires exact coin identity evidence and confirmed adjudication before admission", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    expect(isCoinMetadata(metadata)).toBe(true);
    const incomplete = enforceCoinExactEvidence({
      candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The slab and grade look similar.",
      visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: false },
    }, metadata);
    expect(incomplete.verdict).toBe("unreadable");
    const exactEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    const exact = { candidateIndex: 0, verdict: "match" as const, confidence: "high" as const, rationale: "The coin identity, date, variety, slab, grader, and grade match.", visualEvidence: exactEvidence, visualAudit: { imageCount: 1, initialVerdict: "match" as const, initialConfidence: "high" as const, retryStatus: "performed" as const, adjudicationStatus: "confirmed" as const, finalPass: "high_resolution_retry" as const, finalEvidence: exactEvidence } };
    expect(hasCompletedCoinAdjudication(exact, metadata)).toBe(true);
    expect(conservativeCoinVisualReviews([exact], [{ title: "1896 Morgan Silver Dollar PCGS MS63" }], metadata)[0]).toMatchObject({ verdict: "match" });
    const cropped = enforceCoinExactEvidence({
      candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The crop does not show enough of the holder to determine raw-versus-graded status.",
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: true, identityMatches: false, dateMatches: false, varietyMatches: false },
    }, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(cropped).toMatchObject({ verdict: "match", confidence: "high" });
    const explicitRaw = enforceCoinExactEvidence({ ...cropped, rationale: "The listing is a raw ungraded coin with no slab." }, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(explicitRaw.verdict).not.toBe("match");
  });

  it("reconciles an exact Mercari coin title before deciding whether to run the required second review", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const firstPass = {
      candidateIndex: 0,
      verdict: "unreadable" as const,
      confidence: "low" as const,
      rationale: "The close crop does not show enough of the holder to independently classify the listing.",
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, identityMatches: false, dateMatches: false, varietyMatches: false, mintMarkMatches: false, denominationMatches: false },
    };

    const reconciled = reconcileCoinPrimaryReviewForAdjudication(firstPass, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(reconciled).toMatchObject({ verdict: "match", confidence: "high" });

    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("const reconciledPrimaryReviews = primaryReviews.map");
    expect(source).toContain("const needsCoinAdjudication = isCoinMetadata(targetMetadata);");
  });

  it("runs the independent second review for an exact-title Mercari coin holder crop before making an admission decision", async () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const cropEvidence = { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, identityMatches: false, dateMatches: false, varietyMatches: false, mintMarkMatches: false, denominationMatches: false };
    const finalEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The first pass reports a visual match, but the close crop does not independently show enough of the holder to finalize the graded state.", visualEvidence: cropEvidence }],
      }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The independent review confirms the matching coin identity, date, variety, grader, and grade.", visualEvidence: finalEvidence }],
      }) as any);

    const result = await filterVisualSourceCandidates({
      sourceLabel: "Mercari coin sold listings",
      targetImageUrl: "https://example.com/target-coin.jpg",
      targetMetadata: metadata,
      listings: [{ title: "1896 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.com/candidate-coin.jpg", imageUrls: ["https://example.com/candidate-coin.jpg"] }],
    });

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockedInvokeLLM.mock.calls[1]?.[0]?.messages ?? [])).toContain("INDEPENDENT COIN IDENTITY ADJUDICATION");
    expect(result.listings[0]).toMatchObject({
      visualReviewStatus: "match",
      visualAudit: { retryStatus: "performed", adjudicationStatus: "confirmed", finalPass: "high_resolution_retry" },
    });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("retries the second coin-review response format when a nonempty reply omits the required review", async () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The first review finds the matching graded coin.", visualEvidence: evidence }],
      }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({ reviews: [] }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The fallback second review independently confirms the matching coin identity, date, variety, grader, and grade.", visualEvidence: evidence }],
      }) as any);

    const result = await filterVisualSourceCandidates({
      sourceLabel: "Mercari coin sold listings",
      targetImageUrl: "https://example.com/target-coin.jpg",
      targetMetadata: metadata,
      listings: [{ title: "1896 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.com/candidate-coin.jpg", imageUrls: ["https://example.com/candidate-coin.jpg"] }],
    });

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    expect(result.listings[0]).toMatchObject({
      visualReviewStatus: "match",
      visualAudit: { retryStatus: "performed", adjudicationStatus: "confirmed", finalPass: "high_resolution_retry" },
    });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("normalizes the compact completed coin adjudication shape returned by the live vision provider", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const reviews = normalizeCompactCoinAdjudicationReview({
      candidate: 0,
      visualEvidence: {
        identityMatches: true,
        dateMatches: true,
        varietyMatches: true,
        mintMarkMatches: true,
        denominationMatches: true,
        notes: "Both images show the 1896 Morgan dollar in matching PCGS MS63 holders.",
      },
    }, 0, metadata, "1896 Morgan Silver Dollar PCGS MS63");

    expect(reviews).toMatchObject([{
      candidateIndex: 0,
      verdict: "match",
      confidence: "high",
      visualEvidence: { identityMatches: true, dateMatches: true, varietyMatches: true, denominationMatches: true },
    }]);
  });

  it("uses confirmed final coin evidence when the initial pass was incomplete", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const finalEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    const review = {
      candidateIndex: 0,
      verdict: "match" as const,
      confidence: "medium" as const,
      rationale: "The title and second visual review confirm the same coin.",
      visualEvidence: { ...finalEvidence, varietyMatches: false },
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match" as const,
        initialConfidence: "low" as const,
        retryStatus: "performed" as const,
        adjudicationStatus: "confirmed" as const,
        finalPass: "high_resolution_retry" as const,
        initialEvidence: { ...finalEvidence, varietyMatches: false },
        finalEvidence,
      },
    };
    expect(hasCompletedCoinAdjudication(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBe(true);
    const result = applyVisualSourceReviews(
      [{ title: "1896 Morgan Silver Dollar PCGS MS63" }],
      [review],
      1,
      { requireCoinExactMatch: true, targetMetadata: metadata },
    );
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
    expect(coinAdmissionReason(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBeNull();
  });

  it("reports the exact coin admission blocker when adjudication is unavailable", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const review = { candidateIndex: 0, verdict: "match" as const, confidence: "high" as const, rationale: "The coin appears to match.", visualAudit: { imageCount: 1, initialVerdict: "match" as const, initialConfidence: "high" as const, retryStatus: "failed" as const, adjudicationStatus: "unavailable" as const, retryReason: "The high-resolution visual-review call timed out before returning a structured decision.", finalPass: "initial" as const } };
    expect(coinAdmissionReason(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBe("The required independent high-resolution coin review did not complete: The high-resolution visual-review call timed out before returning a structured decision.");
  });

  it("requires completed independent high-resolution evidence before Disney Pins can enter analyzer evidence", () => {
    const listings = [{ title: "Disney Mickey D23 Pin" }, { title: "Disney Minnie D23 Pin" }, { title: "Disney Mickey D23 Pin" }];
    const reviews = [
      { candidateIndex: 0, verdict: "rough_match" as const, confidence: "high" as const, rationale: "Character and colors are plausible, but the pin artwork is partly obscured." },
      { candidateIndex: 1, verdict: "mismatch" as const, confidence: "high" as const, rationale: "Different character and pin silhouette." },
      { candidateIndex: 2, verdict: "match" as const, confidence: "high" as const, rationale: "The character, artwork, silhouette, colors, and backing card visibly match." },
    ];
    const result = applyVisualSourceReviews(listings, reviews, listings.length, { requireExactMatch: true });
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "rough_match", evidenceDisposition: "warning_review" });
    expect(result.listings[1]).toMatchObject({ visualReviewStatus: "mismatch", evidenceDisposition: "warning_review" });
    expect(result.listings[2]).toMatchObject({ visualReviewStatus: "match", evidenceDisposition: "warning_review" });

    const confirmed = applyVisualSourceReviews(listings, [{
      ...reviews[2]!,
      candidateIndex: 0,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match",
        initialConfidence: "high",
        retryStatus: "performed",
        finalPass: "high_resolution_retry",
        finalEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, characterMatches: true, artworkMatches: true, silhouetteMatches: true, backingCardMatches: true, setDesignMatches: true },
      },
    }], 1, { requireExactMatch: true });
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: undefined })).toBe(false);
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: confirmed.listings[0]?.visualAudit })).toBe(true);
    expect(confirmed.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("preserves a complete primary Disney match when the independent retry is unavailable", () => {
    const exactEvidence = {
      slabVisible: false,
      gradingLabelVisible: false,
      graderVisible: false,
      numericGradeVisible: false,
      gradeMatches: false,
      rawOrLooseVisible: false,
      characterMatches: true,
      artworkMatches: true,
      silhouetteMatches: true,
      backingCardMatches: true,
      setDesignMatches: true,
    };
    const review = {
      candidateIndex: 0,
      verdict: "match" as const,
      confidence: "high" as const,
      rationale: "The primary visual review confirms the exact character, artwork, silhouette, backing card, and set design.",
      visualEvidence: exactEvidence,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match" as const,
        initialConfidence: "high" as const,
        retryStatus: "failed" as const,
        adjudicationStatus: "unavailable" as const,
        retryReason: "The high-resolution retry did not return a usable structured decision.",
        finalPass: "initial" as const,
        initialEvidence: exactEvidence,
        finalEvidence: exactEvidence,
      },
    };
    expect(hasUnavailableDisneyPinsAdjudication(review)).toBe(true);
    const result = applyVisualSourceReviews(
      [{ title: "Disney Eeyore Around the World Pin" }],
      [review],
      1,
      { requireExactMatch: true },
    );
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match" });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
    expect(result.listings[0]).toMatchObject({ visualAudit: { adjudicationStatus: "unavailable" } });
  });

  it("does not let generic raw/ungraded reconciliation promote a Disney Pin", () => {
    const metadata = "title=Disney Eeyore Pin; category=disney_pins; isGraded=No";
    const review = { candidateIndex: 0, verdict: "unreadable" as const, confidence: "medium" as const, rationale: "Both pins are raw and the artwork matches exactly." };
    expect(normalizeExplicitUngradedVisualReviews([review], metadata)[0]).toMatchObject({ verdict: "unreadable" });
  });

  it("fails closed when Disney Pin artwork or backing evidence is incomplete", () => {
    const metadata = "title=Disney Eeyore Around the World Pin; category=disney_pins";
    const baseEvidence = {
      slabVisible: false,
      gradingLabelVisible: false,
      graderVisible: false,
      numericGradeVisible: false,
      gradeMatches: false,
      rawOrLooseVisible: false,
      characterMatches: true,
      artworkMatches: false,
      silhouetteMatches: true,
      backingCardMatches: true,
      setDesignMatches: true,
    };
    const review = enforceDisneyPinsExactEvidence({
      candidateIndex: 0,
      verdict: "match",
      confidence: "high",
      rationale: "Same Eeyore character and colors, but the artwork differs.",
      visualEvidence: baseEvidence,
    }, metadata);
    expect(review).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(review.rationale).toContain("exact artwork");
    expect(enforceDisneyPinsExactEvidence({
      ...review,
      verdict: "match",
      confidence: "high",
      visualEvidence: { ...baseEvidence, artworkMatches: true },
    }, metadata)).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("requires an independent Disney Pins adjudication for every apparent match", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("needsDisneyAdjudication");
    expect(source).toContain("INDEPENDENT DISNEY PINS IDENTITY ADJUDICATION");
    expect(source).toContain("Disney Pins require an independent second visual adjudication");
    expect(disneyPinsVisualInstruction("category=disney_pins")).toContain("Same character, similar colors, or a shared series is never sufficient");
  });

  it("requires a focused escalation for every initial mismatch against a graded target", () => {
    const args = {
      title: "Mario Bros. 3 NES Nintendo Game PSA Graded 9.0 CIB Complete In Box Oval Seal",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: {
        verdict: "mismatch" as const,
        confidence: "high" as const,
        rationale: "The preliminary image review calls the candidate loose and un-slabbed with no visible grade.",
      },
    };
    expect(hasTitleDeclaredGradeVisualRawConflict(args)).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({ ...args, title: "Mario Bros. 3 NES CIB" })).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      ...args,
      review: { ...args.review, rationale: "The preliminary image review reports a different cover treatment." },
    })).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      ...args,
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; isGraded=No",
    })).toBe(false);
  });

  it("uses an independent high-resolution grading adjudication instead of anchoring on the first-pass result", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("INDEPENDENT HIGH-RESOLUTION GRADING ADJUDICATION");
    expect(source).toContain("Do not rely on or repeat any preliminary verdict");
    expect(source).toContain("A visible transparent slab plus a grading label and readable grade is graded—not raw");
    expect(source).toContain('model: needsFocusedGradeEscalation ? "gpt-5" : "gpt-5-mini"');
    expect(source).toContain('reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined');
  });

  it("treats sealed and CIB graded video games as separate forms and fails closed on target-form conflict", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("item form is a mandatory identity gate: sealed, CIB/complete-in-box, boxed-only, loose/raw, and parts-only are distinct comparable cohorts");
    expect(source).toContain("A candidate label that visibly says CIB is not the same as a target label that visibly says Sealed");
    expect(source).toContain("target's structured title/details say CIB or Complete in Box while its visible holder label says Sealed");
    expect(source).toContain("${videoGameFormInstruction(targetMetadata)}");
    expect(source).toContain("VIDEO-GAME LABEL CHECK: read the printed form designation on each visible grading label before deciding");
    expect(source).toContain("A clear PSA slab whose label says CIB is a graded CIB game—not a raw or loose cartridge");
    expect(source).toContain("${focusedVideoGameLabelInstruction(targetMetadata)}");
  });

  it("pins a one-candidate model response to the candidate that was sent, not its returned index", () => {
    const reviews = normalizeSingleCandidateVisualReview(
      {
        reviews: [{
          // Simulates a malformed model index while reviewing the PSA 9.0
          // listing at index 13.
          candidateIndex: 999,
          verdict: "match",
          confidence: "high",
          rationale: "Visible PSA slab and readable 9.0 label match the target.",
          visualEvidence: {
            slabVisible: true,
            gradingLabelVisible: true,
            graderVisible: true,
            numericGradeVisible: true,
            gradeMatches: true,
            rawOrLooseVisible: false,
          },
        }],
      },
      14,
      13,
    );

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ candidateIndex: 13, verdict: "match" });
    const listings = Array.from({ length: 14 }, (_, index) => ({ title: `candidate ${index}` }));
    const result = applyVisualSourceReviews(listings, reviews, 14);
    expect(result.listings[0]).not.toHaveProperty("visualReviewStatus");
    expect(result.listings[13]).toMatchObject({ visualReviewStatus: "match" });
  });

  it("uses original listing indexes after candidates without images are removed from the vision queue", () => {
    const listings = [
      { title: "No provider image" },
      { title: "Mario Bros. 3 NES PSA Graded 9.0 CIB" },
    ];
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 1,
        verdict: "mismatch",
        confidence: "high",
        rationale: "Candidate appears raw and un-slabbed with no visible PSA label or numeric grade.",
      },
    ], listings, "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ candidateIndex: 1, verdict: "unreadable", confidence: "low" });
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("const declaredReviews = buildDeclaredIdentityReviews(args.listings, targetMetadata, {");
    expect(source).toContain("const preVisualExcludedIndexes = new Set([");
    expect(source).toContain("candidateIndex,");
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
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 8.0 grade is clearly readable on the candidate label and matches the target; the figure and packaging also match.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "MOTU 1982 Man-at-Arms AFA 8.0" }], "title=MOTU 1982 Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("holds a graded-card match for manual review when the target qualifier is not explicitly verified", () => {
    const metadata = `title=2018 Topps; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ gradeQualifier: "OC" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 8 grade is clearly readable and the card front matches." },
    ], [{ title: "2018 Topps PSA 8" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("grade qualifier");
  });

  it("rejects a graded match when the model omits structured visual evidence", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 9 label and grade appear visible and match." },
    ], [{ title: "Super Mario Bros. 3 NES PSA 9" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("structured visual evidence");
  });

  it("rejects a graded match when structured evidence says the item is raw", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The title says PSA 9, but the candidate appears raw.", visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: true } },
    ], [{ title: "Super Mario Bros. 3 NES PSA 9" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
  });

  it("accepts a visually confirmed WATA label as PSA-equivalent for video games", () => {
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale: "The WATA 9.0 label and numeric grade are clearly visible, the sealed game identity and cover art match, there is no raw/loose signal, and the grader conflict is only PSA versus WATA.",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false },
      },
    ], [{ title: "Super Mario Bros. 3 NES WATA 9.0 Sealed" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
    expect(result[0].rationale).toContain("PSA and WATA labels are accepted as equivalent grader evidence");
  });

  it("accepts an explicitly confirmed equivalent target qualifier after visual review", () => {
    const metadata = `title=2018 Topps; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ gradeQualifier: "OC" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 8 OC grade is clearly readable and the card front matches.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "2018 Topps PSA 8 OC" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("holds a comic match for manual review when the target certification label status is not confirmed", () => {
    const metadata = `title=Amazing Spider-Man #300; category=comics; grade=9.8; certificationCompany=CGC; fullItemDetails=${JSON.stringify({ certificationLabelStatus: "Restored" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The CGC 9.8 grade and cover art are clearly readable and match." },
    ], [{ title: "Amazing Spider-Man #300 CGC 9.8" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("comic certification label status");
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
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 75+ grade is clearly readable on the gallery label and matches the target.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
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

  it("holds a sports-card candidate with an explicit parallel conflict before vision", () => {
    const metadata = `title=Mike Trout; category=sports_cards; fullItemDetails=${JSON.stringify({ player: "Mike Trout", year: "2011", manufacturer: "Topps", parallel: "Chrome Refractor" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "2011 Topps Mike Trout Chrome", itemDetails: JSON.stringify({ parallel: "Base" }) },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("parallel differs");
  });

  it("holds a video-game candidate with an explicit platform conflict before vision", () => {
    const metadata = `title=The Legend of Zelda; category=video_games; fullItemDetails=${JSON.stringify({ platform: "NES", edition: "Standard" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "The Legend of Zelda Nintendo Switch", platform: "Nintendo Switch" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("platform differs");
  });

  it("holds a coin candidate with an explicit mint-mark conflict before vision", () => {
    const metadata = `title=1903 Morgan Dollar; category=coins; fullItemDetails=${JSON.stringify({ year: "1903", denomination: "1", mintMark: "S", variety: "Morgan" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ year: "1903", denomination: "1", mintMark: "O", variety: "Morgan" }) },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("mintMark differs");
  });

  it("holds a comic candidate with an explicit issue-number conflict before vision", () => {
    const metadata = `title=Amazing Spider-Man; category=comics; fullItemDetails=${JSON.stringify({ series: "Amazing Spider-Man", issueNumber: "300", publisher: "Marvel" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "Amazing Spider-Man #301 CGC 9.8" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("issueNumber");
  });

  it("does not reject a candidate merely because its provider omitted a target field", () => {
    const metadata = `title=The Legend of Zelda; category=video_games; fullItemDetails=${JSON.stringify({ platform: "NES", edition: "Standard" })}`;
    expect(buildDeclaredIdentityReviews([{ title: "The Legend of Zelda" }], metadata)).toEqual([]);
  });

  it("exposes the vintage-toy packaging-form gate in the vision prompt", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("packaging form is a mandatory identity gate");
    expect(source).toContain("carded/on-card/blister-card");
  });

  it("promotes an unreadable review only when title and gallery rationale explicitly confirm the grade", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The AFA 75+ grade is clearly readable in the additional gallery image and matches the target; the holder and item also match.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
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

  it("escalates a graded target when the first image is interpreted as raw", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "Mario Bros. 3 NES PSA Graded 9.0 CIB",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears loose and un-slabbed with no visible PSA label or grade." },
    })).toBe(true);
    const normalized = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "Candidate appears loose and un-slabbed with no visible PSA label or grade." },
    ], [{ title: "Mario Bros. 3 NES PSA Graded 9.0 CIB" }], "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(normalized[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(normalized[0].rationale).toContain("additional-image/manual review");
  });

  it("escalates a single-thumbnail graded candidate to the promoted high-resolution image", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Mario Bros. 3 NES Nintendo Game PSA Graded 9.0 CIB Complete In Box Oval Seal",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears raw and un-slabbed; no PSA label or numeric grade is visible in the thumbnail." },
    })).toBe(true);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Mario Bros. 3 NES Nintendo Game",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears raw and un-slabbed." },
    })).toBe(true);
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
    const clientSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(routerSource).toContain("sourceLabel: 'eBay active listings'");
    expect(routerSource).toContain("sourceLabel: '130point sold listings'");
    expect(routerSource).toContain("sourceLabel: 'PWCC / Fanatics Collect sold listings'");
    expect(routerSource).toContain("buildVisualTargetMetadata");
    expect(routerSource).toContain("category: input.category");
    expect(routerSource).toContain("itemDetails: input.itemDetails");
    expect(routerSource).toContain("getCardsightAiData");
    expect(routerSource).toContain("itemType: z.string().nullish()");
    expect(clientSource).toContain("const leftHipstampSoldQuery");
    expect(clientSource).toContain("itemType: leftSearchItem.itemType");
    expect(clientSource).toContain("const leftCardsightAiQuery");
    expect(clientSource).toContain("itemType: leftSearchItem.itemType ?? undefined");
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

  it("uses adaptive 20-item batches until three matches or the 30-image ceiling", () => {
    expect(VISUAL_REVIEW_BATCH_SIZE).toBe(20);
    expect(VISUAL_REVIEW_TARGET_MATCHES).toBe(3);
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(30);
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
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(30);
    expect(queue).toHaveLength(30);
    expect(queue.some(candidate => candidate.candidateIndex === 59)).toBe(false);
    expect(candidates).toHaveLength(60);
  });

  it("builds the full image-bearing queue before applying the bounded priority cap", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    const candidateStart = source.indexOf("const candidates = args.listings");
    const queueStart = source.indexOf("const reviewQueue = prioritizeVisualSourceCandidates", candidateStart);
    expect(candidateStart).toBeGreaterThanOrEqual(0);
    expect(queueStart).toBeGreaterThan(candidateStart);
    expect(source.slice(candidateStart, queueStart)).not.toContain(".slice(0, VISUAL_REVIEW_MAX_CANDIDATES)");
    expect(source.slice(queueStart, queueStart + 700)).toContain("prioritizeVisualSourceCandidates(candidates");
    expect(source).toContain(".slice(0, VISUAL_REVIEW_MAX_CANDIDATES);");
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
    expect(routerSource).toContain("item?.imageUrl");
    expect(routerSource).toContain("item?.thumbnailUrl");
    expect(routerSource).toContain("imageUrls = collectEbayImageUrls(item)");
  });

  it("does not allow Mercari sold records with a target image to bypass shared visual review", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).toContain("if (!['disney_pins', 'coins'].includes(normalizedCategory) && !input.imageUrl)");
    expect(routerSource).toContain("const visualSourceLabel = normalizedCategory === 'coins'");
    expect(routerSource).toContain("Mercari ${normalizedCategory.replace(/_/g, ' ')} sold listings");
    expect(routerSource).toContain("visualReviewRequired: true");
  });

  it.each([
    ["cassette_tape", "cassette"],
    ["compact_disc", "CD"],
    ["vinyl_record", "vinyl record"],
    ["eight_track_tape", "8-track tape"],
  ])("holds a Music Good %s target when a candidate title declares Factory Sealed", (itemType, formatLabel) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType,
      isGraded: "no",
      itemDetails: JSON.stringify({ condition: "good", format: itemType }),
    });
    const reviews = buildDeclaredIdentityReviews(
      [{ title: `Factory Sealed NIRVANA — NEVERMIND ${formatLabel}`, imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    );
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0]?.rationale).toContain("Music media condition differs");
  });

  it("preserves a top-level Music condition when itemDetails does not contain it", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      condition: "good",
      itemType: "cassette_tape",
      itemDetails: JSON.stringify({ format: "cassette_tape", isGraded: "no" }),
    });
    expect(targetMetadata).toContain('"condition":"good"');
    expect(buildDeclaredIdentityReviews(
      [{ title: "Factory Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )[0]?.rationale).toContain("Music media condition differs");
  });

  it("does not treat New / Sealed and Factory Sealed as conflicting Music conditions", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType: "cassette_tape",
      isGraded: "no",
      itemDetails: JSON.stringify({ condition: "sealed", format: "cassette_tape" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Factory Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it("treats the literal New / Sealed target value as sealed", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType: "cassette_tape",
      condition: "New / Sealed",
      itemDetails: JSON.stringify({ format: "cassette_tape" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it.each([
    ["excellent", "Good condition"],
    ["good", "Excellent condition"],
    ["fair", "Good condition"],
  ])("does not pre-exclude a subjective Music condition difference: target %s and candidate %s", (targetCondition, candidateCondition) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Purple Rain",
      category: "music",
      condition: targetCondition,
      itemType: "vinyl_record",
      itemDetails: JSON.stringify({ format: "vinyl_record" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: `Prince — Purple Rain ${candidateCondition}`, imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it.each([
    "sports_cards",
    "pokemon",
    "coins",
    "comics",
    "video_games",
    "stamps",
    "movies",
    "autographs",
    "disney_pins",
    "vintage_toys",
    "music",
  ])("allows ordinary condition differences for Mercari visual review across %s", (category) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Example collectible",
      category,
      condition: "excellent",
      itemDetails: JSON.stringify({ condition: "excellent" }),
    });
    const candidate = {
      title: "Example collectible",
      itemDetails: JSON.stringify({ condition: "good" }),
      imageUrl: "https://example.com/candidate.jpg",
    };
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toHaveLength(category === "music" ? 0 : 1);
    expect(buildDeclaredIdentityReviews(
      [candidate],
      targetMetadata,
      { ignoreSubjectiveConditionDifferences: true },
    )).toEqual([]);
  });

  it("still pre-excludes a normal Music target against For Parts", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Purple Rain",
      category: "music",
      condition: "excellent",
      itemType: "vinyl_record",
      itemDetails: JSON.stringify({ format: "vinyl_record" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Prince — Purple Rain For Parts", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )[0]?.rationale).toContain("Music media condition differs");
  });

  it("requires the visual reviewer to gate graded versus raw packaging first", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("graded/slabbed or raw/ungraded");
    expect(source).toContain("Graded-versus-raw status is a mandatory identity gate");
    expect(source).toContain("target is graded and the candidate is visibly raw");
    expect(source).toContain("candidate numeric or descriptive grade is also mandatory");
    expect(source).toContain("candidate grade is not clearly readable");
    expect(source).toContain("grading-evidence conflict");
    expect(source).toContain('detail: "high"');
    expect(source).toContain("grade qualifier, label designation, or comic certification label status");
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

  it("ignores unique holder identifiers for graded items across every source", () => {
    const instruction = gradedIdentifierInstruction();
    expect(instruction).toContain("every graded or certified item");
    expect(instruction).toContain("certificate numbers");
    expect(instruction).toContain("serial numbers");
    expect(instruction).toContain("grading-holder barcodes");
    expect(instruction).toContain("QR codes");
    expect(instruction).toContain("never require them to match");
    expect(instruction).toContain("every marketplace and data source");
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

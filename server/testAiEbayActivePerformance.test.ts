import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EBAY_ACTIVE_QUERY_TIER_LIMIT,
  EBAY_ACTIVE_RESULTS_PER_TIER,
  EBAY_ACTIVE_EXACT_PAGE_LIMIT,
  EBAY_ACTIVE_DISPLAY_TARGET,
  computeMetrics,
} from "./testAIRouter";
import { buildDeclaredIdentityReviews, prioritizeVisualSourceCandidates } from "./testAiVisualSourceFilter";
import { assessSoldCompsPreVisionCandidates } from "./testAIRouter";

const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
const adapterSource = readFileSync(resolve(import.meta.dirname, "./ebayMarketplaceCandidate.ts"), "utf8");
const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
const clientMainSource = readFileSync(resolve(import.meta.dirname, "../client/src/main.tsx"), "utf8");
const visualSource = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
const rankingDisplaySource = readFileSync(resolve(import.meta.dirname, "../shared/testAiRankingDisplay.ts"), "utf8");
const candidateLedgerSource = readFileSync(resolve(import.meta.dirname, "../shared/testAiCandidateLedger.ts"), "utf8");
const candidateStatusSource = readFileSync(resolve(import.meta.dirname, "../shared/testAiCandidateStatus.ts"), "utf8");
const masterListSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/TestAiCandidateMasterList.tsx"), "utf8");
const statusComponentSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/TestAiCandidateStatus.tsx"), "utf8");
const sourceDisplaySource = readFileSync(resolve(import.meta.dirname, "../shared/testAiSourceDisplay.ts"), "utf8");

function procedureSource(name: string, nextMarker: string): string {
  const start = routerSource.indexOf(name);
  const end = routerSource.indexOf(nextMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return routerSource.slice(start, end);
}

describe("Test AI eBay active-listing responsiveness", () => {
  it("reports auction bid fields without treating them as completed-sale evidence", () => {
    const metrics = computeMetrics([
      { id: 'fixed-1', price: { value: '100' }, buyingOptions: ['FIXED_PRICE'] },
      { id: 'auction-1', price: { value: '150' }, buyingOptions: ['AUCTION'], bidCount: 4, uniqueBidderCount: 2 },
    ]);
    expect(metrics).toMatchObject({ auctionCount: 1, bidCountKnown: 1, totalBidCount: 4, uniqueBidderCountKnown: 1, totalUniqueBidderCount: 2 });
    expect(metrics?.count).toBe(2);
  });

  it("paginates the exact query before using complementary fallback tiers", () => {
    expect(EBAY_ACTIVE_QUERY_TIER_LIMIT).toBe(6);
    expect(EBAY_ACTIVE_RESULTS_PER_TIER).toBe(40);
    expect(EBAY_ACTIVE_EXACT_PAGE_LIMIT).toBe(3);
    expect(EBAY_ACTIVE_DISPLAY_TARGET).toBe(20);

    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("searchQueries.slice(0, EBAY_ACTIVE_QUERY_TIER_LIMIT)");
    expect(section).toMatch(/buildSoldCompsQueryCandidates\(query,\s*\{\s*preserveGrade: true,\s*fallbackQueries: standardSearchDefinition\.fallbackQueries/);
    expect(section).toContain("fetchEbayExactTierPages(exactCandidateQuery, token, retrievalFailures, retrievalCoverage)");
    expect(section).toContain("eligibility.filteredSummaries.length < EBAY_ACTIVE_DISPLAY_TARGET");
    expect(section).toContain("exactTierPageCount");
    expect(section).toContain("exactTierUsedFallbacks");
    expect(section).toContain("exactTierResultCount");
    expect(section).toContain("exactTierFilteredCount");
    expect(section).toContain("__tradebiliaQueryTier");
    expect(section).toContain("EBAY_ACTIVE_RESULTS_PER_TIER");
    expect(routerSource).toContain("buyingOptions%3A%7BFIXED_PRICE%7CAUCTION%7D");
    expect(routerSource).toContain("offset=${offset}");
    expect(routerSource).toContain("fieldgroups=COMPACT");
    expect(routerSource).toContain("uniqueBidderCount");
    expect(section).not.toContain("fetchEbayListings(candidateQuery || candidate, token, 100)");
  });

  it("normalizes all supported eBay image aliases before visual admission", () => {
    expect(routerSource).toContain("item?.image,");
    expect(routerSource).toContain("value.image_url");
    expect(routerSource).toContain("value.thumbnail_url");
    expect(routerSource).toContain("value.href");
    expect(routerSource).toContain(".map((value) => promoteEbayImageUrl(imageValue(value) ?? value))");
    expect(routerSource).toContain("const imageUrls = collectEbayImageUrls(item);");
  });

  it("keeps normalized eBay image URLs when constructing the visual-review payload", () => {
    expect(routerSource).toContain("const normalizedImageUrls = Array.isArray(s.imageUrls) && s.imageUrls.length > 0");
    expect(routerSource).toContain("imageUrl: normalizedImageUrls[0] ?? s.image?.imageUrl ?? null");
    expect(routerSource).toContain("imageUrls: normalizedImageUrls.slice(0, 3)");
    expect(routerSource).toContain("imageUrls: normalizedImageUrls,");
  });

  it("creates one shared marketplace candidate record before eBay visual admission", () => {
    expect(routerSource).toContain("import { normalizeEbayMarketplaceCandidate } from './ebayMarketplaceCandidate';");
    expect(routerSource).toContain("const marketplaceCandidate = normalizeEbayMarketplaceCandidate({");
    expect(routerSource).toContain("sourceId: 'ebay_active'");
    expect(routerSource).toContain("retrievalQuery: query");
    expect(adapterSource).toContain("structuredMetadata");
    expect(adapterSource).toContain("itemSpecifics");
    expect(routerSource).toContain("marketplaceCandidate,");
    expect(routerSource).toContain("normalizedListingTitle: marketplaceCandidate.title");
    expect(routerSource).toContain("normalizedListingTitleSource: marketplaceCandidate.titleSource");
    expect(routerSource).toContain("normalizedListingTitleCandidates: marketplaceCandidate.titleCandidates");
    expect(routerSource).toContain("titleEvidence: marketplaceCandidate.titleEvidence");
    expect(routerSource).toContain("titleEvidenceSources: marketplaceCandidate.titleEvidenceSources");
    expect(routerSource).toContain("normalizedStructuredMetadata: marketplaceCandidate.structuredMetadata");
    expect(routerSource).toContain("imageUrl: marketplaceCandidate.imageUrl");
    expect(routerSource).toContain("imageUrls: marketplaceCandidate.imageUrls");
  });

  it("preserves ranking metadata in both eBay listing transport arrays", () => {
    expect(routerSource).toContain("metadataMatchScore: s.metadataMatchScore");
    expect(routerSource).toContain("metadataMatchRank: s.metadataMatchRank");
    expect(routerSource).toContain("metadataMatchReasons: s.metadataMatchReasons");
    expect(routerSource).toContain("metadataFieldComparisons: s.metadataFieldComparisons ?? buildMetadataFieldComparisons(targetMetadata, s)");
    expect(routerSource).toContain("buildMetadataFieldComparisons,");
  });

  it("does not hold ordinary active-listing metrics behind AI image review", () => {
    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("includeVisualReview: z.boolean().optional()");
    expect(section).toContain("const visualActiveFilter = input.includeVisualReview");
    expect(section).toContain("const visualInputListings = preVisionAssessment.eligible.map");
    expect(section).toContain("filterVisualSourceCandidates({");
    expect(section).toContain("const metrics = computeMetrics(displaySummaries)");
    expect(section).toContain("[...visualActiveFilter.listings, ...(visualActiveFilter.contextListings ?? [])]");
    expect(section).toContain("Context records retain their disposition");
    expect(section).toContain("visualReviewTargetMetadata: targetMetadata");
    expect(section).toContain("visualReviewListings: displaySummaries.slice(0, VISUAL_REVIEW_MAX_CANDIDATES).map");
    expect(section).toContain("assessSoldCompsPreVisionCandidates({");
    expect(section).toContain("statedTradeValue: input.statedTradeValue");
    expect(section).toContain("preVisionExcludedListings");
    expect(section).toContain("evidenceDisposition: 'pre_vision_excluded'");
    expect(routerSource).toContain("reviewEbayVisualData: protectedProcedure");
    expect(routerSource).toContain("VISUAL_REVIEW_MAX_CANDIDATES");
    expect(pageSource).toContain("statedTradeValue: Number(leftSearchItem.estimatedValue) || undefined");
    expect(pageSource).toContain("statedTradeValue: Number(rightSearchItem.estimatedValue) || undefined");
  });

  it("times out eBay OAuth and Browse calls and reports an actionable redacted state", () => {
    expect(routerSource).toContain("const EBAY_OAUTH_TIMEOUT_MS = 15_000");
    expect(routerSource).toContain("const EBAY_BROWSE_TIMEOUT_MS = 15_000");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_OAUTH_TIMEOUT_MS)");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_BROWSE_TIMEOUT_MS)");
    expect(routerSource).toContain("eBay authorization timed out. Please try the lookup again.");
    expect(routerSource).toContain("eBay rejected the configured sandbox authorization. Recheck the secure eBay credentials.");
  });

  it("removes the retired custom source-search path", () => {
    expect(routerSource).not.toContain("runCustomSourceSearch");
    expect(routerSource).not.toContain("CUSTOM_SOURCE_LOOKUP_TIMEOUT_MS");
    expect(routerSource).not.toContain("withCustomSourceTimeout");
    expect(pageSource).not.toContain("CustomSourceSearchPanel");
    expect(pageSource).not.toContain("CustomSourceCandidateRow");
    expect(pageSource).not.toContain("customSourceResultImageUrl");
  });

  it("keeps excluded eBay candidates visibly auditable with image and rank data", () => {
    const ebayProcedure = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(ebayProcedure).toContain("imageUrl: s.imageUrl ?? collectEbayImageUrls(s)[0] ?? null");
    expect(ebayProcedure).toContain("metadataMatchScore: s.metadataMatchScore");
    expect(ebayProcedure).toContain("metadataMatchRank: s.metadataMatchRank");
    expect(ebayProcedure).toContain("metadataFieldComparisons: s.metadataFieldComparisons ?? buildMetadataFieldComparisons(targetMetadata, s)");
    expect(pageSource).toMatch(/import \{[^}]*\bcollectEbayCandidateDisplayOccurrences\b[^}]*\} from '@shared\/testAiCandidateLedger';/);
    expect(pageSource).toContain(`  const activeMasterListings = mergeMasterCandidates(
    collectEbayCandidateDisplayOccurrences(displayData),
    displayData?.metadataParentDisplayListings ?? [],
  );`);
    expect(candidateLedgerSource).toContain(`export function collectEbayCandidateDisplayOccurrences(data: CandidateDisplayRow | null | undefined): CandidateDisplayRow[] {
  if (!data) return [];
  const stamp = (group: any) => Array.isArray(group) ? group.map(retainCandidateDisplayOccurrence) : group;
  return collectEbayDisplayCandidates({ ...data, listings: stamp(data.listings), visualReviewListings: stamp(data.visualReviewListings),
    visualFilter: data.visualFilter ? { ...data.visualFilter, listings: stamp(data.visualFilter.listings), contextListings: stamp(data.visualFilter.contextListings) } : undefined,
    preVisionFilter: data.preVisionFilter ? { ...data.preVisionFilter, excludedListings: stamp(data.preVisionFilter.excludedListings) } : undefined });
}`);
    expect(rankingDisplaySource).toContain(`  const groups = [data?.listings, data?.visualReviewListings, data?.visualFilter?.listings,
    data?.visualFilter?.contextListings, data?.preVisionFilter?.excludedListings];`);
    expect(pageSource).toContain('<CandidateMasterList listings={activeMasterListings} sourceLabel="eBay Active Listings" targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain("import { TestAiCandidateMasterList as CandidateMasterList } from '@/components/TestAiCandidateMasterList';");
    expect(masterListSource).toContain("listing.metadataMatchScore !== undefined && listing.metadataMatchScore !== null");
    expect(masterListSource).toContain("listing.metadataMatchRank");
    expect(ebayProcedure).toContain("...entry.item,");
    expect(visualSource).toContain("scorePreVisualComparableCandidate");
    expect(masterListSource).toContain("Known retained source occurrences, once per bound occurrence in source rank order.");
    expect(masterListSource).toContain("not every retrieved row reaches final intake");
    expect(masterListSource).toContain("<TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} />");
    expect(statusComponentSource).toContain("{label} unavailable");
    expect(masterListSource).toContain("<MetadataComparisonTable listing={listing} />");
  });

  it("renders visible marketplace candidates in ranking order", () => {
    expect(pageSource).toContain("from '@shared/testAiRankingDisplay'");
    expect(pageSource).toContain(`function sortRankedCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return sortMetadataRankedCandidates(listings);
}`);
    expect(masterListSource).toContain("const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);");
    expect(candidateLedgerSource).toContain("return sortMetadataRankedCandidates([...merged.values()]);");
    expect(masterListSource).toContain("candidates.map((listing, index)");
    expect(pageSource).toContain("const rankedDisplayListings = sortRankedCandidates(");
    expect(pageSource).toContain("rankedDisplayListings.map(renderListing)");
    expect(rankingDisplaySource).toContain(`      const rankA = validDisplayRank(a.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      const rankB = validDisplayRank(b.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      const scoreA = validScore(a.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      const scoreB = validScore(b.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      return scoreB - scoreA || a.index - b.index;`);
    expect(pageSource).not.toContain("displayData.listings.map(renderListing)");
  });

  it("keeps selected ranks visible as context when visual analysis has no target image", () => {
    expect(visualSource).toContain("rankedSelectedContextListings");
    expect(visualSource).toContain("not_required_no_target_image");
    expect(routerSource).toContain("[...visualActiveFilter.listings, ...(visualActiveFilter.contextListings ?? [])]");
    expect(pageSource).toContain("not visually analyzed because the target item image was unavailable");
  });

  it("does not present deterministic pre-filter conflicts as AI image-review results", () => {
    expect(pageSource).toContain("const rows = selectTestAiVisualDisplayRows(");
    expect(statusComponentSource).toContain("return mergeCandidateDisplayGroups(groups, scope).filter(hasActualVisualDispatch);");
    expect(candidateStatusSource).toContain("return Boolean(candidateExecutionReceipt(row)?.attempts.some((attempt) => attempt.stage === 'initial'));");
    expect(candidateStatusSource).toContain("return hasActualVisualDispatch(row) && Boolean(candidateExecutionReceipt(row)?.attempts.some((attempt) => attempt.outcome === 'usable_review'));");
    expect(masterListSource).toContain("All candidates — ranked master list");
    expect(statusComponentSource).toContain("['Execution', candidateExecutionFact(row, scope)], ['Identity result', candidateIdentityFact(row)], ['Pricing use', candidatePricingFact(row)]");
    expect(statusComponentSource).toContain("isHardCandidateDisplayException(row)");
    expect(candidateStatusSource).toContain("return candidateExecutionReceipt(row)?.hardExclusion === true || row.evidenceDisposition === 'rejected_objective_conflict';");
    expect(candidateStatusSource).toContain("label: 'Deterministic metadata conflict'");
    expect(candidateStatusSource).toContain("label: 'Image mismatch'");
    expect(pageSource).toContain("Legacy verdicts are not proof of image execution.");
    expect(pageSource).not.toContain("held out before AI image analysis");
  });

  it("keeps eBay Sold-Comps context candidates visible with their reasons", () => {
    const soldSection = procedureSource("getSoldCompsData: protectedProcedure", "// SoldComps Mercari coverage");
    expect(soldSection).toContain("const visualContextAuditLedger = (sharedVisualFilter.contextListings ?? []).map");
    expect(soldSection).toContain("ledger: [...canonicalListings, ...visualContextAuditLedger");
    expect(soldSection).toContain("visualContextAuditLedger.length");
    expect(pageSource).toContain('<CandidateMasterList listings={auditLedger} sourceLabel="eBay Sold History" targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain("const auditLedger = mergeCandidateDisplayGroups([data?.audit?.ledger ?? [], data?.listings ?? [], data?.visualFilter?.contextListings ?? []]);");
    expect(masterListSource).toContain("Known retained source occurrences, once per bound occurrence in source rank order.");
    expect(masterListSource).toContain("<MetadataComparisonTable listing={listing} />");
    expect(masterListSource).toContain("<TestAiCandidateStatus listing={listing} scope={scope} reconciled />");
    expect(pageSource).toContain("No candidates reached the main valuation/review list");
  });

  it("applies the shared pre-vision gate to active asking prices", () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: "video_games",
      targetMetadata: 'title=Resident Evil 2; category=video_games; grade=unknown; fullItemDetails={"platform":"PS1"}',
      targetPlatform: "PS1",
      targetIsGraded: true,
      statedTradeValue: 20_000,
      listings: [
        { title: "Resident Evil 2 PS4 Tested", price: { value: "1000", currency: "USD" } },
        { title: "Resident Evil 2 PS1 Lot of 2", price: { value: "5000", currency: "USD" } },
        { title: "Resident Evil 2 PS1 PSA 8", price: { value: "6000", currency: "USD" } },
      ],
    });

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].title).toContain("PSA 8");
    expect(result.excluded).toHaveLength(2);
    expect(result.excluded.flatMap((entry) => entry.reasons).join(" ")).toMatch(/platform|lot|condition-only|25%|250%/i);
  });

  it("does not treat eBay's generic marketplace condition as a card identity conflict before vision", () => {
    const targetMetadata = 'title=1989 Upper Deck Ken Griffey Jr #1 PSA 10; category=sports_cards; condition=Mint; itemType=single_card; grade=10; certificationCompany=PSA; fullItemDetails={"player":"Ken Griffey Jr","year":"1989","manufacturer":"Upper Deck","cardNumber":"1"}';
    const candidate = { title: '1989 Upper Deck Ken Griffey Jr #1 PSA 10', condition: 'Pre-Owned' };

    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toEqual([]);
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata, { ignoreSubjectiveConditionDifferences: true })).toEqual([]);

    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("ignoreSubjectiveConditionDifferences: true,");
  });

  it("blocks explicit replica wording before raw eBay Autographs listings reach pre-vision", () => {
    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(routerSource).toContain("function rawAutographReplicaReason");
    expect(section).toContain("const rawAutographReplicaListings = input.category === 'autographs'");
    expect(section).toContain("const preVisionEligibleSummaries = filteredSummaries.filter");
    expect(section).toContain("listings: preVisionEligibleSummaries");
    expect(routerSource).toContain("Autograph candidate explicitly declares");
  });

  it("keeps the UI on the fast result while mandatory image checks run", () => {
    expect(pageSource).toContain("function EbayActiveSection({ item, side, data, isLoading, onVisualReviewData }");
    expect(pageSource).toContain("trpc.testAI.reviewEbayVisualData.useMutation");
    expect(pageSource).toContain("visualReviewMutation.mutateAsync");
    expect(pageSource).toContain("data?.visualReviewListings");
    expect(pageSource).toContain(`  const visualReviewInput = useMemo(() => ({
    targetImageUrl: item.primaryPhotoUrl || 'https://invalid.local/target-image-placeholder',
    targetMetadata: data?.visualReviewTargetMetadata || requestQueryPreview,
    // A visual-review mutation uses POST, but retain a small explicit candidate
    // DTO so external eBay payload fields cannot expand the review contract.
    listings: buildEbayVisualReviewListings(data),
  }), [data?.visualReviewListings, data?.listings, data?.visualReviewTargetMetadata, item.primaryPhotoUrl, requestQueryPreview]);`);
    expect(rankingDisplaySource).toContain("const reviewListings = Array.isArray(data?.visualReviewListings) ? data.visualReviewListings : []");
    expect(rankingDisplaySource).toContain("listing.imageUrls.filter((url: unknown) => typeof url === 'string').slice(0, 3)");
    expect(pageSource).toContain("useState(Boolean(item.primaryPhotoUrl))");
    expect(pageSource).toContain("const effectiveVisualReviewData = (visualReviewData?.candidateDisplayParentData === data ? visualReviewData : undefined) ?? (data?.visualFilter ? data : undefined);");
    expect(pageSource).toContain("setVisualReviewData({ ...operationalBatch, candidateDisplayBatch: displayBatch, candidateDisplayParentData: data });");
    expect(pageSource).toContain("onVisualReviewData?.(effectiveVisualReviewData && !effectiveVisualReviewData.error ? effectiveVisualReviewData : null);");
    expect(pageSource).toContain("<MarketplaceVisualReview data={effectiveVisualReviewData}");
    expect(pageSource).toContain("AI image checks are required before visually supported eBay Active listings can enter current-value evidence");
    expect(pageSource).toContain("const displayData = mergeEbayVisualReviewDisplayData(data, effectiveVisualReviewData)");
    expect(pageSource).toContain("AI image checks could not start");
    expect(pageSource).toContain("AI image checks stopped after returning partial results");
    expect(pageSource).toContain('<CandidateMasterList listings={activeMasterListings} sourceLabel="eBay Active Listings" targetImageUrl={item.primaryPhotoUrl} />');
    expect(pageSource).toContain("data={ebayData} isLoading={ebayLoading}");
  });

  it("splits the visual-review transport into bounded sequential batches", () => {
    expect(pageSource).toContain("VISUAL_REVIEW_CLIENT_BATCH_SIZE = 10");
    expect(pageSource).toContain("VISUAL_REVIEW_CLIENT_MAX_BATCHES = 5");
    expect(pageSource).toContain("for (const batch of reviewBatchInputs)");
    expect(pageSource).toContain("const deadlineAt = Date.now() + 120_000");
    expect(pageSource).toContain("reviewDeadlineAt: deadlineAt");
    expect(pageSource).toContain("VISUAL_REVIEW_CLIENT_TARGET_MATCHES = 3");
    expect(pageSource).toContain("const operationalBatch = mergeVisualReviewBatches(completed);");
    expect(pageSource).toContain("const displayBatch = mergeVisualReviewDisplayBatches(completed);");
    expect(pageSource).toContain("if (countAcceptedVisualMatches(mergeVisualReviewBatches(completed)) >= VISUAL_REVIEW_CLIENT_TARGET_MATCHES) break;");
    expect(pageSource).toContain("const listings = completed.flatMap((batch) => batch.listings ?? []);");
    expect(pageSource).toContain("reviewedCount: listings.filter((listing: any) => listing.visualReviewStatus).length");
    expect(pageSource).toContain(`  const reviewBatchInputs = useMemo(() => Array.from({ length: VISUAL_REVIEW_CLIENT_MAX_BATCHES }, (_, batchIndex) => ({
    ...visualReviewInput,
    listings: visualReviewInput.listings.slice(batchIndex * VISUAL_REVIEW_CLIENT_BATCH_SIZE, (batchIndex + 1) * VISUAL_REVIEW_CLIENT_BATCH_SIZE),
  })), [visualReviewInput]);`);
    expect(rankingDisplaySource).toContain(`    return {
      id: String(listing.id ?? listing.itemId ?? listing.itemUrl ?? ''),
      title: String(listing.title ?? ''), price: Number(listing.price?.value ?? listing.price) || null,
      currency: String(listing.currency ?? listing.price?.currency ?? 'USD'),`);
    expect(rankingDisplaySource).toContain("return sourceListings.slice(0, 30).map((listing: Record<string, any>) => {");
    expect(rankingDisplaySource).toContain(`      auctionEndDate: listing.auctionEndDate ? String(listing.auctionEndDate) : null,
      metadataRanking: listing.metadataRanking,
    };`);
    expect(rankingDisplaySource).not.toContain('...listing,');
    expect(pageSource).toContain("// DTO so external eBay payload fields cannot expand the review contract.");
    expect(procedureSource("reviewEbayVisualData: protectedProcedure", "// Fetch HIPStamp active listings")).toContain("reviewDeadlineAt: z.number().int().optional()");
    expect(visualSource).toContain("args.reviewDeadlineAt");
  });

  it("does not restart the visual-review effect when tRPC changes mutateAsync identity", () => {
    expect(pageSource).toContain("const visualReviewMutateAsyncRef = useRef(visualReviewMutation.mutateAsync);");
    expect(pageSource).toContain("visualReviewMutateAsyncRef.current({ ...batch, reviewDeadlineAt: deadlineAt })");
    expect(pageSource).toContain("}, [reviewBaseEnabled, reviewBatchInputs]);");
    expect(pageSource).not.toContain("}, [reviewBaseEnabled, reviewBatchInputs, visualReviewMutation.mutateAsync]);");
  });

  it("uses a POST-capable mutation because the configured query transport has a 2,000-character URL ceiling", () => {
    const reviewProcedure = procedureSource("reviewEbayVisualData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(reviewProcedure).toContain(".mutation(async ({ ctx, input }) => {");
    expect(reviewProcedure).not.toContain(".query(async ({ ctx, input }) => {");
    expect(clientMainSource).toContain("maxURLLength: 2000");
  });

  it("builds the loading preview from structured criteria without duplicating title grade or condition", () => {
    expect(pageSource).toContain("const requestQueryPreview = useMemo(() => {");
    expect(pageSource).toContain("const gradingCompany = resolveTestAiGradingCompany(item.itemDetails, item.certificationCompany ?? item.gradingCompany ?? '')");
    expect(pageSource).toContain("return buildStructuredItemQuery(");
    expect(pageSource).not.toContain("const parts = [item.title, item.certificationCompany, item.grade, item.condition].filter(Boolean)");
    expect(pageSource).not.toContain("const movieTitle = details.title || item.title");
    expect(pageSource).toContain("Search criteria / request <span className=\"font-normal text-cyan-200/60\">({query ? 'server-confirmed' : isLoading ? 'pending response' : 'structured preview'})</span>");
  });

  it("keeps the server-confirmed eBay query when visual-review data replaces the display payload", () => {
    expect(pageSource).toContain("const visibleSearchQuery = displayData?.query || data?.query || requestQueryPreview || item.title || 'No title supplied'");
    expect(pageSource).toContain("const queryStatus = displayData?.query || data?.query ? 'server-confirmed' : isLoading ? 'pending response' : 'preview'");
    expect(pageSource).toContain("Preserve the server-confirmed eBay query from the");
  });

  it("separates Autographs current-value evidence from context-only listings", () => {
    expect(pageSource).toContain("const autographValuationListings = autographMarketContextOnly");
    expect(pageSource).toContain("evidenceDisposition === 'valuation_eligible'");
    expect(pageSource).toContain('text-emerald-300">Source-stage Asking Context</p>');
    expect(pageSource).toContain("Context Only — Not Used in Valuation");
    expect(pageSource).toContain("Source-stage asking context — final pricing use assessed separately");
    expect(pageSource).toContain("These listings passed the Autographs source identity and score rules. Legacy source metrics are separate from final pricing use; currency-unproven aggregates are withheld.");
    expect(pageSource).toContain("Identity-matched active asking listings; useful market context, not completed sales.");
    expect(pageSource).toContain("not included in valuation");
    expect(pageSource).not.toContain("Current-Value Market Evidence");
    expect(pageSource).not.toContain("Asking-price context — included in valuation");
  });

  it("preserves populated eBay listings when visual-review returns an empty or partial payload", () => {
    expect(pageSource).toContain("function mergeEbayVisualReviewDisplayData(base: any, review: any): any");
    expect(pageSource).toContain("return mergeEbayCandidateDisplayData(base, review?.candidateDisplayBatch ?? review);");
    expect(candidateLedgerSource).toContain("if (!review) return base;");
    expect(candidateLedgerSource).toContain("const reviewed = [...(review.listings ?? []), ...(review.visualFilter?.contextListings ?? [])];");
    expect(candidateLedgerSource).toContain("const listings = mergeCandidateDisplayGroups([base?.listings ?? [], reviewed], scope);");
    expect(candidateLedgerSource).toContain("listings, visualReviewListings: mergeCandidateDisplayGroups([parents, reviewed], scope)");
    expect(candidateLedgerSource).toContain("error: review.error ?? base?.error");
    expect(candidateLedgerSource).toContain("displayCoverage: batches.some((batch) => batch.error || batch.visualFilter?.status === 'provider_unavailable' || batch.visualFilter?.status === 'completed_with_timeout') ? 'partial' : 'complete'");
    expect(pageSource).toContain("const displayData = mergeEbayVisualReviewDisplayData(data, effectiveVisualReviewData)");
  });

  it("sends eBay candidates to visual review from either bounded list and promotes gallery images", () => {
    expect(pageSource).toContain("listings: buildEbayVisualReviewListings(data),");
    expect(rankingDisplaySource).toContain(`  const reviewListings = Array.isArray(data?.visualReviewListings) ? data.visualReviewListings : [];
  const listingRows = Array.isArray(data?.listings) ? data.listings : [];
  const hasImage = (row: Record<string, any>) => typeof row?.imageUrl === 'string'
    || (Array.isArray(row?.imageUrls) && row.imageUrls.some((url: unknown) => typeof url === 'string' && url.length > 0));
  const sourceListings = reviewListings.some(hasImage) ? reviewListings : listingRows;`);
    expect(rankingDisplaySource).toContain(`      imageUrl: typeof listing.imageUrl === 'string' ? listing.imageUrl : imageUrls[0] ?? null,
      imageUrls,`);
  });

  it("keeps the query visible across searchable marketplace panels", () => {
    expect(pageSource).toContain("function MarketplaceQueryBanner");
    expect(pageSource).toContain("<MarketplaceQueryBanner item={item} query={data?.query} isLoading={isLoading} />");
    expect(pageSource).toContain("query={data?.query || data?.winningQuery}");
  });

  it("stabilizes the PriceCharting candidate fallback used by its selection effect", () => {
    expect(pageSource).toContain("const compatibleGameCandidates = useMemo(");
    expect(pageSource).toContain("[candidateSearchData?.data?.compatibleCandidates],");
    expect(pageSource).not.toContain("const compatibleGameCandidates = candidateSearchData?.data?.compatibleCandidates ?? [];");
  });

  it("shows every executed eBay query tier in the active-listing panel", () => {
    expect(pageSource).toContain("displayData?.debug?.executedQueries?.length > 1");
    expect(pageSource).toContain("Executed query tiers");
  });

  it("does not block a CGC-certified movie from starting active marketplace searches", () => {
    expect(pageSource).toContain("item.certId && company === 'CGC' && item.category === 'comics'");
    expect(pageSource).toContain("Only a CGC comic needs the comics certificate response");
    expect(pageSource).toContain("item already has a usable title/format/grade and must not be blocked");
    expect(pageSource).toContain("buildStructuredItemQuery(");
  });

  it("updates the primary asking-price cards from accepted visual matches automatically", () => {
    expect(pageSource).toContain("const showingVisualMatchMetrics = !!effectiveVisualReviewData?.visualMatchMetrics");
    expect(pageSource).toContain("const visibleMetrics = showingVisualMatchMetrics ? effectiveVisualReviewData.visualMatchMetrics : data?.metrics");
    expect(pageSource).toMatch(/import \{[^}]*\bTestAiSourceMetricSummary\b[^}]*\} from '@\/components\/TestAiCandidateStatus';/);
    expect(pageSource).toContain('<TestAiSourceMetricSummary metrics={visibleMetrics} sourceLabel="eBay Active" role={showingVisualMatchMetrics ? \'Legacy visual-match asking context\' : \'Full-market asking context\'} />');
    expect(pageSource).toContain('{showingVisualMatchMetrics && <TestAiSourceMetricSummary metrics={data?.metrics} sourceLabel="eBay Active before image filtering" role="Full-market asking context" />}');
    expect(statusComponentSource).toContain("export function TestAiSourceMetricSummary({ metrics, members, sourceLabel, role }: {");
    expect(statusComponentSource).toContain("import { sourceCurrentWindowLabel, sourceMetricDisplay, sourceRetrievalCoverage } from '../../../shared/testAiSourceDisplay';");
    expect(statusComponentSource).toContain("const display = sourceMetricDisplay(metrics, members);");
    expect(statusComponentSource).toContain("['Average', display.avg], ['Median', display.median], ['Range', display.range]");
    expect(sourceDisplaySource).toContain(`  const verified = Boolean(members && observationCount && priced.length === observationCount && currency && /^[A-Z]{3}$/.test(currency)
    && currencies.every((value) => value === currency) && basis && !['unknown', 'unspecified', 'unverified'].includes(basis)
    && bases.every((value) => value === basis));`);
    expect(sourceDisplaySource).toContain("Currency/basis unresolved — aggregate not shown · unverified legacy source metrics; not final pricing use");
    expect(sourceDisplaySource).toContain("avg: verified ? format(metrics?.avg) : 'Withheld', median: verified ? format(metrics?.median) : 'Withheld'");
    expect(sourceDisplaySource).toContain("range: verified ? `${format(metrics?.min)}–${format(metrics?.max)}` : 'Withheld'");
    expect(pageSource).toContain("AI image checks are required before visually supported eBay Active listings can enter current-value evidence");
    expect(pageSource).toContain("No accepted visual matches have usable prices");
    expect(pageSource).toContain("Auction activity:");
    expect(pageSource).toContain("unique bidders");
  });
  it("keeps adaptive visual review bounded and preserves the remaining candidates", () => {
    expect(visualSource).toContain("VISUAL_REVIEW_MAX_CANDIDATES");
    expect(visualSource).toContain("prioritizeVisualSourceCandidates");
    expect(visualSource).toContain("outside the bounded adaptive review window");
  });

  it("uses exact-tier priority when pre-vision identity signals are equal", () => {
    const candidates = [1, 0, 1].map((tier, index) => ({
      candidateIndex: index,
      imageUrl: `https://images.example/tier-${index}.jpg`,
      imageUrls: [`https://images.example/tier-${index}.jpg`],
      item: { title: "Transformers Megatron G1 AFA 60", __tradebiliaQueryTier: tier },
    }));
    const prioritized = prioritizeVisualSourceCandidates(
      candidates,
      "title=Transformers Megatron G1; grade=60.00; certificationCompany=AFA; category=vintage_toys",
      [],
    );
    expect(prioritized.map((candidate) => candidate.candidateIndex)).toEqual([1, 0, 2]);
  });

  it("prioritizes all exact-tier candidates before relaxed listings", () => {
    // Keep the AFA Q60 regression visible: category is already present, but the
    // current title-grade parser cannot recognize Q60 and loses grade priority.
    // Do not change the expected first position to the observed position 20.
    const candidates = Array.from({ length: 21 }, (_, index) => ({
      candidateIndex: index,
      imageUrl: `https://images.example/${index}.jpg`,
      imageUrls: [`https://images.example/${index}.jpg`],
      item: {
        title: index === 20
          ? "Rare 1984 Hasbro Transformer G1 Megatron AFA Graded Q60 MIB"
          : `Transformers Megatron G1 AFA listing ${index}`,
        __tradebiliaQueryTier: index === 20 ? 0 : 1,
      },
    }));
    const prioritized = prioritizeVisualSourceCandidates(
      candidates,
      "title=Transformers Megatron G1; grade=60.00; category=vintage_toys",
      [],
    );
    expect(prioritized).toHaveLength(21);
    expect(prioritized.some((candidate) => candidate.candidateIndex === 20)).toBe(true);
    expect(prioritized.findIndex((candidate) => candidate.candidateIndex === 20)).toBe(0);
  });

  it("puts an explicit matching grader and grade ahead of weaker exact-tier rows", () => {
    const candidates = [
      {
        candidateIndex: 0,
        imageUrl: "https://images.example/weak.jpg",
        imageUrls: ["https://images.example/weak.jpg"],
        item: { title: "Pokemon Silver Version Nintendo Game Boy Color", __tradebiliaQueryTier: 0 },
      },
      {
        candidateIndex: 1,
        imageUrl: "https://images.example/graded.jpg",
        imageUrls: ["https://images.example/graded.jpg"],
        item: { title: "Pokemon Silver Version Graded PSA 8.0 CIB Complete In Box Nintendo Game Boy Color", __tradebiliaQueryTier: 1 },
      },
    ];
    const prioritized = prioritizeVisualSourceCandidates(
      candidates,
      "title=Pokemon Silver Version; grade=8.0; certificationCompany=PSA; category=video_games",
      [],
    );
    expect(prioritized.map((candidate) => candidate.candidateIndex)).toEqual([1, 0]);
  });
});

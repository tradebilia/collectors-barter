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
const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
const clientMainSource = readFileSync(resolve(import.meta.dirname, "../client/src/main.tsx"), "utf8");
const visualSource = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");

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
    expect(section).toContain("buildSoldCompsQueryCandidates(query, { preserveGrade: true })");
    expect(section).toContain("fetchEbayExactTierPages(exactCandidateQuery, token)");
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
    expect(routerSource).toContain("item?.image?.thumbnailUrl");
    expect(routerSource).toContain("item?.image?.url");
    expect(routerSource).toContain(".map((url) => promoteEbayImageUrl(url))");
    expect(routerSource).toContain("imageUrls: collectEbayImageUrls(item)");
  });

  it("keeps normalized eBay image URLs when constructing the visual-review payload", () => {
    expect(routerSource).toContain("const normalizedImageUrls = Array.isArray(s.imageUrls) && s.imageUrls.length > 0");
    expect(routerSource).toContain("imageUrl: normalizedImageUrls[0] ?? s.image?.imageUrl ?? null");
    expect(routerSource).toContain("imageUrls: normalizedImageUrls.slice(0, 3)");
    expect(routerSource).toContain("imageUrls: normalizedImageUrls,");
  });

  it("preserves ranking metadata in both eBay listing transport arrays", () => {
    expect(routerSource).toContain("metadataMatchScore: s.metadataMatchScore");
    expect(routerSource).toContain("metadataMatchRank: s.metadataMatchRank");
    expect(routerSource).toContain("metadataMatchReasons: s.metadataMatchReasons");
  });

  it("does not hold ordinary active-listing metrics behind AI image review", () => {
    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("includeVisualReview: z.boolean().optional()");
    expect(section).toContain("const visualActiveFilter = input.includeVisualReview");
    expect(section).toContain("const visualInputListings = preVisionAssessment.eligible.map");
    expect(section).toContain("filterVisualSourceCandidates({");
    expect(section).toContain("const metrics = computeMetrics(displaySummaries)");
    expect(section).toContain("const displaySummaries = visualActiveFilter?.listings ?? visualInputListings");
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
    expect(routerSource).toContain("const EBAY_OAUTH_TIMEOUT_MS = 8_000");
    expect(routerSource).toContain("const EBAY_BROWSE_TIMEOUT_MS = 8_000");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_OAUTH_TIMEOUT_MS)");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_BROWSE_TIMEOUT_MS)");
    expect(routerSource).toContain("eBay authorization timed out. Please try the lookup again.");
    expect(routerSource).toContain("eBay rejected the configured sandbox authorization. Recheck the secure eBay credentials.");
  });

  it("keeps custom source searches bounded and prevents eBay custom searches from paging three times", () => {
    const customProcedure = procedureSource("runCustomSourceSearch: protectedProcedure", "    }),\n});");
    expect(routerSource).toContain("const CUSTOM_SOURCE_LOOKUP_TIMEOUT_MS = 10_000");
    expect(routerSource).toContain("withCustomSourceTimeout");
    expect(customProcedure).toContain("fetchEbayListings(query, tokenResult.token, EBAY_ACTIVE_DISPLAY_TARGET, 0)");
    expect(customProcedure).not.toContain("fetchEbayExactTierPages(query, tokenResult.token)");
    for (const sourceLabel of ["Mercari", "TCGplayer", "TCGdex", "Wikidata", "Smithsonian", "IGDB", "RAWG"]) {
      expect(customProcedure).toContain(`'${sourceLabel}'`);
    }
    expect(customProcedure).toContain("The selected source could not complete the custom search. Please try again.");
  });

  it("preserves candidate images across custom providers and renders them without cropping", () => {
    const customProcedure = procedureSource("runCustomSourceSearch: protectedProcedure", "    }),\n});");
    expect(routerSource).toContain("function normalizeCustomSourceImageUrl");
    expect(routerSource).toContain("function customSourceImageUrl");
    expect(customProcedure).toContain("withCustomSourceImages(result.listings.slice(0, 20))");
    expect(customProcedure).toContain("withCustomSourceImages([result.data])");
    expect(pageSource).toContain("function customSourceResultImageUrl");
    expect(pageSource).toContain('className="h-full w-full object-contain"');
    expect(pageSource).toContain('loading="lazy"');
    expect(pageSource).toContain('title="Candidate image"');
    expect(pageSource).toContain("function CustomSourceCandidateRow");
    expect(pageSource).toContain("Search result #");
    expect(pageSource).toContain("Ranking score: not used for this custom lookup");
    expect(pageSource).not.toContain("object-cover");
  });

  it("keeps excluded eBay candidates visibly auditable with image and rank data", () => {
    const ebayProcedure = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(ebayProcedure).toContain("imageUrl: s.imageUrl ?? collectEbayImageUrls(s)[0] ?? null");
    expect(ebayProcedure).toContain("metadataMatchScore: s.metadataMatchScore");
    expect(ebayProcedure).toContain("metadataMatchRank: s.metadataMatchRank");
    expect(pageSource).toContain("displayData.preVisionFilter.excludedListings.map");
    expect(pageSource).toContain("listing.metadataMatchScore !== undefined");
    expect(pageSource).toContain("listing.metadataMatchRank");
    expect(pageSource).toContain("object-contain p-0.5");
  });

  it("keeps selected ranks visible as context when visual analysis has no target image", () => {
    expect(visualSource).toContain("rankedSelectedContextListings");
    expect(visualSource).toContain("not_required_no_target_image");
    expect(routerSource).toContain("visualActiveFilter.listings.length > 0 ? visualActiveFilter.listings : (visualActiveFilter.contextListings ?? [])");
    expect(pageSource).toContain("not visually analyzed because the target item image was unavailable");
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

  it("keeps the UI on the fast result while mandatory image checks run", () => {
    expect(pageSource).toContain("function EbayActiveSection({ item, side, data, isLoading, onVisualReviewData }");
    expect(pageSource).toContain("trpc.testAI.reviewEbayVisualData.useMutation");
    expect(pageSource).toContain("visualReviewMutation.mutateAsync");
    expect(pageSource).toContain("data?.visualReviewListings");
    expect(pageSource).toContain("const reviewListings = Array.isArray(data?.visualReviewListings) ? data.visualReviewListings : []");
    expect(pageSource).toContain("listing.imageUrls.filter((url: unknown) => typeof url === 'string').slice(0, 3)");
    expect(pageSource).toContain("useState(Boolean(item.primaryPhotoUrl))");
    expect(pageSource).toContain("const effectiveVisualReviewData = visualReviewData ?? (data?.visualFilter ? data : undefined);");
    expect(pageSource).toContain("onVisualReviewData?.(effectiveVisualReviewData && !effectiveVisualReviewData.error ? effectiveVisualReviewData : null);");
    expect(pageSource).toContain("<MarketplaceVisualReview data={effectiveVisualReviewData}");
    expect(pageSource).toContain("AI image checks are required before visually supported eBay Active listings can enter current-value evidence");
    expect(pageSource).toContain("const displayData = mergeEbayVisualReviewDisplayData(data, effectiveVisualReviewData)");
    expect(pageSource).toContain("AI image checks could not start");
    expect(pageSource).toContain("AI image checks stopped after returning partial results");
    expect(pageSource).toContain("active candidate{displayData.preVisionFilter.excludedCount === 1 ? '' : 's'} excluded before image comparison");
    expect(pageSource).toContain("data={ebayData} isLoading={ebayLoading}");
  });

  it("splits the visual-review transport into bounded sequential batches", () => {
    expect(pageSource).toContain("VISUAL_REVIEW_CLIENT_BATCH_SIZE = 10");
    expect(pageSource).toContain("VISUAL_REVIEW_CLIENT_MAX_BATCHES = 5");
    expect(pageSource).toContain("for (const batch of reviewBatchInputs)");
    expect(pageSource).toContain("const deadlineAt = Date.now() + 120_000");
    expect(pageSource).toContain("reviewDeadlineAt: deadlineAt");
    expect(pageSource).toContain("id: String(listing.id ?? listing.itemId ?? listing.itemUrl ?? '')");
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
    expect(pageSource).toContain("Current-Value Market Evidence");
    expect(pageSource).toContain("Context Only — Not Used in Valuation");
    expect(pageSource).toContain("Current-value market evidence — included in valuation");
    expect(pageSource).toContain("not included in valuation");
  });

  it("preserves populated eBay listings when visual-review returns an empty or partial payload", () => {
    expect(pageSource).toContain("function mergeEbayVisualReviewDisplayData(base: any, review: any): any");
    expect(pageSource).toContain("listings: mergedListings.length > 0 ? [...mergedListings, ...reviewOnlyListings] : reviewedListings");
    expect(pageSource).toContain("const displayData = mergeEbayVisualReviewDisplayData(data, effectiveVisualReviewData)");
  });

  it("sends eBay candidates to visual review from either bounded list and promotes gallery images", () => {
    expect(pageSource).toContain("const sourceListings = reviewListings.some(hasImage) ? reviewListings : listingRows");
    expect(pageSource).toContain("const listingRows = Array.isArray(data?.listings) ? data.listings : []");
    expect(pageSource).toContain("imageUrl: typeof listing.imageUrl === 'string' ? listing.imageUrl : imageUrls[0] ?? null");
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
    expect(pageSource).toContain("Full-market asking context before image filtering");
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

  it("prioritizes all exact-tier candidates before relaxed listings", () => {
    const candidates = Array.from({ length: 21 }, (_, index) => ({
      candidateIndex: index,
      imageUrl: `https://images.example/${index}.jpg`,
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
        item: { title: "Pokemon Silver Version Nintendo Game Boy Color", __tradebiliaQueryTier: 0 },
      },
      {
        candidateIndex: 1,
        imageUrl: "https://images.example/graded.jpg",
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

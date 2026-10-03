import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EBAY_ACTIVE_QUERY_TIER_LIMIT,
  EBAY_ACTIVE_RESULTS_PER_TIER,
  computeMetrics,
} from "./testAIRouter";
import { prioritizeVisualSourceCandidates } from "./testAiVisualSourceFilter";

const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
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

  it("keeps complementary retrieval bounded and concurrent", () => {
    expect(EBAY_ACTIVE_QUERY_TIER_LIMIT).toBe(6);
    expect(EBAY_ACTIVE_RESULTS_PER_TIER).toBe(40);

    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("searchQueries.slice(0, EBAY_ACTIVE_QUERY_TIER_LIMIT)");
    expect(section).toContain("buildSoldCompsQueryCandidates(query, { preserveGrade: true })");
    expect(section).toContain("exactTierResultCount");
    expect(section).toContain("exactTierFilteredCount");
    expect(section).toContain("__tradebiliaQueryTier");
    expect(section).toContain("await Promise.all(");
    expect(section).toContain("EBAY_ACTIVE_RESULTS_PER_TIER");
    expect(routerSource).toContain("buyingOptions%3A%7BFIXED_PRICE%7CAUCTION%7D");
    expect(routerSource).toContain("fieldgroups=COMPACT");
    expect(routerSource).toContain("uniqueBidderCount");
    expect(section).not.toContain("fetchEbayListings(candidateQuery || candidate, token, 100)");
  });

  it("does not hold ordinary active-listing metrics behind AI image review", () => {
    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("includeVisualReview: z.boolean().optional()");
    expect(section).toContain("const visualActiveFilter = input.includeVisualReview");
    expect(section).toContain("const declaredIdentityFilter = applyDeclaredIdentityFilter(");
    expect(section).toContain("const metrics = computeMetrics(displaySummaries)");
    expect(section).toContain("const displaySummaries = visualActiveFilter?.listings ?? declaredIdentityFilter.listings");
  });

  it("times out eBay OAuth and Browse calls and reports an actionable redacted state", () => {
    expect(routerSource).toContain("const EBAY_OAUTH_TIMEOUT_MS = 8_000");
    expect(routerSource).toContain("const EBAY_BROWSE_TIMEOUT_MS = 8_000");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_OAUTH_TIMEOUT_MS)");
    expect(routerSource).toContain("signal: AbortSignal.timeout(EBAY_BROWSE_TIMEOUT_MS)");
    expect(routerSource).toContain("eBay authorization timed out. Please try the lookup again.");
    expect(routerSource).toContain("eBay rejected the configured sandbox authorization. Recheck the secure eBay credentials.");
  });

  it("keeps the UI on the fast result while a user explicitly requests image checks", () => {
    expect(pageSource).toContain("function EbayActiveSection({ item, side, data, isLoading }");
    expect(pageSource).toContain("includeVisualReview: true");
    expect(pageSource).toContain("Run image checks");
    expect(pageSource).toContain("Current listings load first.");
    expect(pageSource).toContain("AI image checks are running separately.");
    expect(pageSource).toContain("const displayData = visualReviewData && !visualReviewData.error ? visualReviewData : data");
    expect(pageSource).toContain("data={ebayData} isLoading={ebayLoading}");
  });

  it("shows the movie search request while eBay is still loading", () => {
    expect(pageSource).toContain("const requestQueryPreview = useMemo(() => {");
    expect(pageSource).toContain("if (item.category === 'movies')");
    expect(pageSource).toContain("Search criteria / request <span className=\"font-normal text-cyan-200/60\">({query ? 'server-confirmed' : isLoading ? 'pending response' : 'structured preview'})</span>");
  });

  it("keeps the query visible across searchable marketplace panels", () => {
    expect(pageSource).toContain("function MarketplaceQueryBanner");
    expect(pageSource).toContain("<MarketplaceQueryBanner item={item} query={data?.query} isLoading={isLoading} />");
    expect(pageSource).toContain("query={data?.query || data?.winningQuery}");
  });

  it("shows every executed eBay query tier in the active-listing panel", () => {
    expect(pageSource).toContain("displayData?.debug?.executedQueries?.length > 1");
    expect(pageSource).toContain("Executed query tiers");
  });

  it("does not block a CGC-certified movie from starting active marketplace searches", () => {
    expect(pageSource).toContain("item.certId && item.gradingCompany === 'CGC' && item.category === 'comics'");
    expect(pageSource).toContain("A CGC-certified movie, toy, game, or other inventory");
    expect(pageSource).toContain("[movieTitle, format, item.certificationCompany, item.grade, item.condition]");
  });

  it("updates the primary asking-price cards from accepted visual matches automatically", () => {
    expect(pageSource).toContain("const showingVisualMatchMetrics = !!visualReviewData?.visualMatchMetrics");
    expect(pageSource).toContain("const visibleMetrics = showingVisualMatchMetrics ? visualReviewData.visualMatchMetrics : data?.metrics");
    expect(pageSource).toContain("Full-market asking context before image filtering");
    expect(pageSource).toContain("accepted visual matches update this asking-price context");
    expect(pageSource).toContain("No accepted visual matches have usable prices");
    expect(pageSource).toContain("Auction activity:");
    expect(pageSource).toContain("unique bidders");
  });
  it("keeps the first visual pass bounded and preserves the remaining candidates", () => {
    expect(visualSource).toContain("VISUAL_REVIEW_INITIAL_CANDIDATE_LIMIT");
    expect(visualSource).toContain("prioritizeVisualSourceCandidates");
    expect(visualSource).toContain("outside the initial prioritized vision-review queue");
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
    expect(prioritized).toHaveLength(20);
    expect(prioritized.some((candidate) => candidate.candidateIndex === 20)).toBe(true);
    expect(prioritized.findIndex((candidate) => candidate.candidateIndex === 20)).toBe(0);
  });
});

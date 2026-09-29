import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EBAY_ACTIVE_QUERY_TIER_LIMIT,
  EBAY_ACTIVE_RESULTS_PER_TIER,
} from "./testAIRouter";

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
  it("keeps complementary retrieval bounded and concurrent", () => {
    expect(EBAY_ACTIVE_QUERY_TIER_LIMIT).toBe(6);
    expect(EBAY_ACTIVE_RESULTS_PER_TIER).toBe(40);

    const section = procedureSource("getEbayData: protectedProcedure", "// Fetch HIPStamp active listings");
    expect(section).toContain("searchQueries.slice(0, EBAY_ACTIVE_QUERY_TIER_LIMIT)");
    expect(section).toContain("await Promise.all(");
    expect(section).toContain("EBAY_ACTIVE_RESULTS_PER_TIER");
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
  it("keeps the first visual pass bounded and preserves the remaining candidates", () => {
    expect(visualSource).toContain("VISUAL_REVIEW_INITIAL_CANDIDATE_LIMIT");
    expect(visualSource).toContain("prioritizeVisualSourceCandidates");
    expect(visualSource).toContain("outside the initial prioritized vision-review queue");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./tradeFlowRouter.ts", import.meta.url), "utf8");

describe("Trade Room analyzer market-evidence tiers", () => {
  it("does not restrict the Browse request to fixed-price listings", () => {
    expect(source).toContain("&limit=25");
    expect(source).not.toContain("buyingOptions%3A%7BFIXED_PRICE%7D");
  });

  it("requires a bid-supported auction ending within one hour", () => {
    expect(source).toContain("bidCount > 0");
    expect(source).toContain("endTime - now <= 60 * 60 * 1000");
    expect(source).toContain("nearClosingAuctionCount");
  });

  it("keeps asking prices as context and excludes them from the authoritative gap", () => {
    expect(source).toContain("asking_price_context");
    expect(source).toContain("valuationMedian");
    expect(source).toContain("m?.valuationMedian !== null");
    expect(source).toContain("active asking prices are context only");
    expect(source).toContain("UNAVAILABLE — one or more items lack completed-sale");
  });

  it("states the evidence rule in the LLM prompt", () => {
    expect(source).toContain("Active eBay asking prices are NOT realized market value");
    expect(source).toContain("bid-supported auction ending in less than one hour");
    expect(source).toContain("Verified eBay Median Value Gap");
  });
});

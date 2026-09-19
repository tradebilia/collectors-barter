import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const promotionSection = routerSource.slice(
  routerSource.indexOf("getPromotionOpportunities:"),
  routerSource.indexOf("// Platform statistics"),
);
const returnedOpportunityMappings = promotionSection.slice(
  promotionSection.indexOf("const highValueListings"),
  promotionSection.indexOf("return { highValueListings"),
);

describe("admin promotion opportunities contract", () => {
  it("requires an administrator and limits high-value opportunities by configurable threshold", () => {
    expect(promotionSection).toContain('ctx.user.role !== "admin"');
    expect(promotionSection).toContain("listingValueMinimum");
    expect(promotionSection).toContain("l.estimatedValue >=");
    expect(promotionSection).toContain("l.status IN ('active', 'traded')");
    expect(promotionSection).toContain("isPublicMemberEligible");
  });

  it("returns recently verified merchants with public profile-safe activity facts", () => {
    expect(promotionSection).toContain("u.merchantVerified = 1");
    expect(promotionSection).toContain("u.createdAt >=");
    expect(returnedOpportunityMappings).toContain('source: "Verified Merchant" as const');
    expect(returnedOpportunityMappings).toContain("profilePath: `/profile/${Number(merchant.merchantId)}`");
    expect(returnedOpportunityMappings).toContain("activeListings");
    expect(returnedOpportunityMappings).toContain("completedTrades");
  });

  it("returns concise public item facts and a canonical existing listing path", () => {
    expect(routerSource).toContain('import { getSocialPromotionFacts } from "@shared/socialPromotionFacts"');
    expect(returnedOpportunityMappings).toContain("itemPath: `/listings/${Number(listing.listingId)}`");
    expect(returnedOpportunityMappings).toContain("itemFacts: getSocialPromotionFacts({");
    expect(returnedOpportunityMappings).toContain("itemType: listing.itemType");
    expect(returnedOpportunityMappings).toContain("customGradingCompany");
  });

  it("adds clearly labeled admin-only category test items only for missing qualifying categories", () => {
    expect(promotionSection).toContain("const qualifyingCategories = new Set");
    expect(promotionSection).toContain("const categoryTestListings = collectibleCategories");
    expect(promotionSection).toContain("isCategoryTest: true as const");
    expect(promotionSection).toContain("categoryTestFacts");
    expect(promotionSection).toContain("categoryTestListings");
    expect(promotionSection).toContain("!qualifyingCategories.has(category)");
  });

  it("passes category, item type, and grade context into the shared item-type field rules", () => {
    expect(returnedOpportunityMappings).toContain("category: listing.category");
    expect(returnedOpportunityMappings).toContain("itemType: listing.itemType");
    expect(returnedOpportunityMappings).toContain("certificationCompany: listing.certificationCompany");
    expect(returnedOpportunityMappings).toContain("customGradingCompany,");
    expect(returnedOpportunityMappings).toContain("itemType: trade.requestedListingItemType");
  });

  it("keeps historical qualifying listings and completed trades available for testing", () => {
    expect(returnedOpportunityMappings).toContain("const highValueListings = ((listingRows[0] as unknown as any[]) || [])");
    expect(returnedOpportunityMappings).toContain("const completedTrades = ((tradeRows[0] as unknown as any[]) || [])");
    expect(promotionSection).toContain("const historicalOpportunityLimit = 500");
    expect(promotionSection).toContain("LIMIT ${historicalOpportunityLimit}");
    expect(returnedOpportunityMappings).not.toContain("filter((listing) => new Date(listing.createdAt) >= recentBoundary)");
    expect(returnedOpportunityMappings).not.toContain("filter((trade) => new Date(trade.completedAt) >= recentBoundary)");
  });

  it("resolves older saved high-value drafts back to the canonical item profile URL", () => {
    expect(promotionSection).toContain("getSocialPromotionItemLink");
    expect(promotionSection).toContain("SELECT id FROM listings WHERE title = ${input.title}");
    expect(promotionSection).toContain("https://tradebilia.manus.space/listings/${listingId}");
  });

  it("excludes participant, cash, shipping, message, and trade identifiers", () => {
    expect(returnedOpportunityMappings).not.toContain("requesterDisplayName");
    expect(returnedOpportunityMappings).not.toContain("recipientDisplayName");
    expect(returnedOpportunityMappings).not.toContain("cashFromRequester");
    expect(returnedOpportunityMappings).not.toContain("cashFromRecipient");
    expect(returnedOpportunityMappings).not.toContain("trackingNumber");
    expect(returnedOpportunityMappings).not.toContain("tradeMessages");
    expect(returnedOpportunityMappings).not.toContain("tp.id");
    expect(returnedOpportunityMappings).not.toContain("ownerId");
    expect(returnedOpportunityMappings).not.toContain("merchantVerifiedBy");
    expect(returnedOpportunityMappings).not.toContain("businessLicense");
    expect(returnedOpportunityMappings).not.toContain("taxId");
  });
});

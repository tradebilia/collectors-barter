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
    expect(promotionSection).toContain("l.status = 'active'");
    expect(promotionSection).toContain("isPublicMemberEligible");
  });

  it("returns promotion-safe fields without participant, cash, shipping, message, or raw record identifiers", () => {
    expect(returnedOpportunityMappings).not.toContain("requesterDisplayName");
    expect(returnedOpportunityMappings).not.toContain("recipientDisplayName");
    expect(returnedOpportunityMappings).not.toContain("cashFromRequester");
    expect(returnedOpportunityMappings).not.toContain("cashFromRecipient");
    expect(returnedOpportunityMappings).not.toContain("trackingNumber");
    expect(returnedOpportunityMappings).not.toContain("tradeMessages");
    expect(returnedOpportunityMappings).not.toContain("tp.id");
    expect(returnedOpportunityMappings).not.toContain("l.id");
  });
});

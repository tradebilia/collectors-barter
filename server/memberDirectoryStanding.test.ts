import { describe, expect, it } from "vitest";
import { resolveMemberStanding } from "./memberDirectoryStanding";

describe("Member Directory standing", () => {
  it("reserves verified standing for an actually verified merchant", () => {
    expect(resolveMemberStanding({ merchantVerified: 1, completedTradeCount: 0, reviewCount: 0 })).toEqual({
      key: "verified",
      label: "Verified Merchant",
    });
  });

  it("classifies established and rising members without making false verification claims", () => {
    expect(resolveMemberStanding({ merchantVerified: 0, completedTradeCount: 3, reviewCount: 0 }).key).toBe("established");
    expect(resolveMemberStanding({ merchantVerified: 0, completedTradeCount: 0, reviewCount: 0 }).key).toBe("rising");
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildBillingSummary,
  FUTURE_SUBSCRIPTION_PAYMENT_TERMS,
  hasMembershipAccess,
  isMembershipFeatureGranted,
} from "./membership";

describe("Tradebilia Membership Free Launch safeguards", () => {
  it("keeps all current features available while Free Launch remains active", () => {
    const billing = buildBillingSummary({
      billingMode: "free_launch",
      stripeBillingEnabled: 1,
      paymentEnforcementEnabled: 1,
      feeLaunchStartsAt: null,
      feeLaunchGraceEndsAt: null,
    });
    expect(billing.freeLaunchOverride).toBe(true);
    expect(isMembershipFeatureGranted(billing, "cancelled", false)).toBe(true);
  });

  it("hard-disables Stripe collection and payment enforcement in the foundation", () => {
    const billing = buildBillingSummary({
      billingMode: "membership_required",
      stripeBillingEnabled: 1,
      paymentEnforcementEnabled: 0,
      feeLaunchStartsAt: null,
      feeLaunchGraceEndsAt: null,
    });
    expect(billing.checkoutAvailable).toBe(false);
    expect(billing.cardCollectionAvailable).toBe(false);
    expect(billing.paymentRequired).toBe(false);
    expect(billing.stripeBillingEnabled).toBe(false);
    expect(billing.paymentEnforcementEnabled).toBe(false);
  });

  it("records the agreed future $1 monthly and $10 annual terms with identical access", () => {
    expect(FUTURE_SUBSCRIPTION_PAYMENT_TERMS).toEqual([
      { code: "monthly", label: "Monthly", priceCents: 100, displayPrice: "$1 per month" },
      { code: "annual", label: "Annual", priceCents: 1000, displayPrice: "$10 per year" },
    ]);
  });

  it("recognizes active and complimentary access, plus an unexpired payment grace period", () => {
    expect(hasMembershipAccess("active")).toBe(true);
    expect(hasMembershipAccess("complimentary")).toBe(true);
    expect(hasMembershipAccess("past_due", "2099-01-01 00:00:00")).toBe(true);
    expect(hasMembershipAccess("past_due", "2020-01-01 00:00:00")).toBe(false);
    expect(hasMembershipAccess("unpaid")).toBe(false);
  });

  it("keeps listing details publicly available during the current Free Launch", () => {
    const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, "routers.ts"), "utf8");
    expect(routerSource).toContain("listingDetail: publicProcedure");
    expect(routerSource).toContain("getListingDetail(input.listingId, ctx.user?.id ?? null)");
    expect(routerSource).not.toContain("assertSubscriptionAccess(ctx.user?.id ?? null)");
  });
});

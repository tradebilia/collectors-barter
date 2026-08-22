import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBillingSummary,
  FUTURE_SUBSCRIPTION_PAYMENT_TERMS,
  hasSubscriptionMembershipAccess,
  isMembershipFeatureGranted,
} from "./membership";

const projectRoot = path.resolve(import.meta.dirname, "..");
const membershipSource = fs.readFileSync(path.join(projectRoot, "server/membership.ts"), "utf8");
const accountSettingsSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AccountSettings.tsx"), "utf8");
const adminDashboardSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");
const accessGateSource = fs.readFileSync(path.join(projectRoot, "client/src/components/SubscriptionAccessGate.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");

describe("free-launch membership foundation", () => {
  it("keeps every current feature available while the free-launch override is active", () => {
    expect(isMembershipFeatureGranted("free_launch", "cancelled", {
      planEnabled: false,
    })).toBe(true);
  });

  it("grants one future subscription plan to active or complimentary members only", () => {
    expect(hasSubscriptionMembershipAccess("active")).toBe(true);
    expect(hasSubscriptionMembershipAccess("trialing")).toBe(true);
    expect(hasSubscriptionMembershipAccess("complimentary")).toBe(true);
    expect(hasSubscriptionMembershipAccess("free_launch")).toBe(false);
    expect(hasSubscriptionMembershipAccess("past_due")).toBe(false);
    expect(isMembershipFeatureGranted("subscription", "complimentary", {
      planEnabled: true,
    })).toBe(true);
    expect(isMembershipFeatureGranted("subscription", "active", {
      planEnabled: true,
    })).toBe(true);
    expect(isMembershipFeatureGranted("subscription", "past_due", {
      planEnabled: true,
    })).toBe(false);
    expect(isMembershipFeatureGranted("subscription", "complimentary", {
      planEnabled: false,
    })).toBe(false);
  });

  it("hard-disables checkout, card collection, payment requirements, and Stripe billing in the current foundation", () => {
    const freeLaunch = buildBillingSummary({
      billingMode: "free_launch",
      stripeBillingEnabled: 1,
    });

    expect(freeLaunch.stripeBillingEnabled).toBe(false);
    expect(freeLaunch.checkoutAvailable).toBe(false);
    expect(freeLaunch.cardCollectionAvailable).toBe(false);
    expect(freeLaunch.paymentRequired).toBe(false);
    expect(freeLaunch.statusLabel).toBe("Free Launch Access");
    expect(FUTURE_SUBSCRIPTION_PAYMENT_TERMS).toEqual([
      { code: "monthly", label: "Monthly", priceCents: 100, displayPrice: "$1 per month" },
      { code: "annual", label: "Annual", priceCents: 1000, displayPrice: "$10 per year" },
    ]);
  });

  it("keeps plan-feature changes behind an administrator check, restricts complimentary grants to the owner, and exposes no billing activation mutation", () => {
    expect(membershipSource).toContain("requireAdministrator(ctx.user.role)");
    expect(membershipSource).toContain("updatePlanFeature: protectedProcedure");
    expect(membershipSource).toContain("grantComplimentaryAccess: protectedProcedure");
    expect(membershipSource).toContain("revokeComplimentaryAccess: protectedProcedure");
    expect(membershipSource).toContain("requireTradebiliaOwner(ctx.user)");
    expect(membershipSource).toContain("ENV.ownerOpenId");
    expect(membershipSource).not.toContain("activateBilling:");
    expect(membershipSource).not.toContain("updateBillingMode:");
    expect(membershipSource).not.toContain("createCheckoutSession");
  });

  it("renders clear free-launch information without payment fields in the Profile page", () => {
    expect(accountSettingsSource).toContain('value="membership"');
    expect(accountSettingsSource).toContain("Membership &amp; Billing");
    expect(accountSettingsSource).toContain("Free Launch Access");
    expect(accountSettingsSource).toContain("No credit card required");
    expect(accountSettingsSource).toContain("No payment method is being collected");
    expect(accountSettingsSource).toContain("membership.isComplimentary");
    expect(accountSettingsSource).toContain("administrator-granted access status");
  });

  it("renders the Admin Billing preview with a single subscription plan and complimentary-member controls", () => {
    expect(adminDashboardSource).toContain('value="billing"');
    expect(adminDashboardSource).toContain("Billing is not active");
    expect(adminDashboardSource).toContain("Free and Subscription feature matrix");
    expect(adminDashboardSource).toContain("Free Launch override enabled");
    expect(adminDashboardSource).toContain("Future member payment terms");
    expect(adminDashboardSource).toContain("Both terms provide identical access");
    expect(adminDashboardSource).toContain("Grant complimentary access");
    expect(adminDashboardSource).toContain("Grant complimentary membership?");
    expect(adminDashboardSource).toContain("Remove complimentary access?");
  });

  it("prepares only category pages, Global Search, and Contact Us for free browsing once subscription mode is enabled", () => {
    expect(appSource).toContain("SubscriptionAccessGate");
    expect(accessGateSource).toContain('location === "/search"');
    expect(accessGateSource).toContain('location.startsWith("/category/")');
    expect(accessGateSource).toContain('location === "/contact"');
    expect(accessGateSource).toContain("Subscription access required");
    expect(membershipSource).toContain("Subscription access is required for this page");
    expect(membershipSource).toContain("assertSubscriptionAccess");
    expect(membershipSource).toContain("getAccessPolicy: publicProcedure");
  });
});

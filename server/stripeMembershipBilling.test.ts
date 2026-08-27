import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(join(projectRoot, relativePath), "utf8");

describe("Stripe Membership test Checkout safeguards", () => {
  it("uses test subscriptions, the configured price IDs, server-side metadata, and administrator-gated contracts", () => {
    const billingSource = read("server/stripeMembershipBilling.ts");
    const routerSource = read("server/membership.ts");
    const accountSettingsSource = read("client/src/pages/AccountSettings.tsx");

    expect(billingSource).toContain('mode: "subscription"');
    expect(billingSource).toContain("allow_promotion_codes: true");
    expect(billingSource).toContain("client_reference_id: String(input.userId)");
    expect(billingSource).toContain("metadata: {");
    expect(billingSource).toContain("environment: \"test\"");
    expect(billingSource).toContain("stripe.billingPortal.sessions.create");
    expect(billingSource).toContain("if (event.livemode) return { status: \"ignored\" as const }");
    expect(billingSource).toContain("const existingEvent");
    expect(billingSource).toContain("const concurrentEvent");
    expect(billingSource).toContain("Stripe Membership subscription does not use a configured test price.");
    expect(billingSource).toContain("const existingMembership");
    expect(billingSource).toContain("Stripe Membership event could not update the member record.");
    expect(billingSource).toContain("subscriptionItem?.current_period_start ?? subscriptionData.current_period_start");
    expect(billingSource).toContain("subscriptionItem?.current_period_end ?? subscriptionData.current_period_end");
    expect(billingSource).not.toContain("card_number");
    expect(routerSource).toContain("startTestCheckout");
    expect(routerSource).toContain("openTestPortal");
    expect(routerSource).toMatch(/startTestCheckout[\s\S]{0,350}requireAdministrator/);
    expect(routerSource).toMatch(/openTestPortal[\s\S]{0,250}requireAdministrator/);
    expect(accountSettingsSource).toContain("Sandbox administrator tools");
    expect(accountSettingsSource).toContain('user?.role === "admin"');
    expect(accountSettingsSource).toContain("Open the Stripe sandbox");
    expect(accountSettingsSource).toContain('window.open(url, "_blank", "noopener,noreferrer")');
  });
});

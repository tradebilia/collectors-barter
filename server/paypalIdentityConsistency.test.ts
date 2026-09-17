import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPayPalComparisonInspection, buildPayPalIdentityConsistency, normalizePayPalUserInfo } from "./paypalIdentity";

describe("PayPal private consistency outcomes", () => {
  const profile = {
    nameCandidates: ["Rich Tavani"],
    emailCandidates: ["rich@example.com"],
    address: {
      street: "123 Main Street",
      town: "Tampa",
      state: "FL",
      zipCode: "33602",
      country: "US",
    },
  };

  it("records match outcomes without retaining raw email or address", () => {
    const payload = {
      user_id: "paypal-user-1",
      name: "Tavani, Rich",
      email: "rich@example.com",
      email_verified: true,
      address: {
        street_address: "123 Main St.",
        locality: "Tampa",
        region: "FL",
        postal_code: "33602",
        country: "US",
      },
    };
    const consistency = buildPayPalIdentityConsistency(payload, profile, "2026-09-17T00:00:00.000Z");
    expect(consistency).toMatchObject({ name: "match", email: "match", address: "match" });
    const stored = normalizePayPalUserInfo(payload, "2026-09-17T00:00:00.000Z", profile);
    expect(stored.consistency).toEqual(consistency);
    expect(JSON.stringify(stored)).not.toContain("rich@example.com");
    expect(JSON.stringify(stored)).not.toContain("123 Main");
  });

  it("does not overstate unavailable claims as a mismatch", () => {
    const consistency = buildPayPalIdentityConsistency(
      { user_id: "paypal-user-2", name: "Other Name", email_verified: false },
      profile,
    );
    expect(consistency).toMatchObject({ name: "mismatch", email: "unavailable", address: "unavailable" });
  });

  it("allows raw claims only in the explicit one-time inspection model", () => {
    const payload = {
      user_id: "paypal-user-3",
      name: "Rich Tavani",
      email: "rich@example.com",
      email_verified: true,
      address: {
        street_address: "123 Main Street",
        locality: "Tampa",
        region: "FL",
        postal_code: "33602",
        country: "US",
      },
    };
    const preview = buildPayPalComparisonInspection(payload, profile, "2026-09-17T00:00:00.000Z");
    expect(preview.paypal.email).toBe("rich@example.com");
    expect(preview.paypal.address.street).toBe("123 Main Street");
    expect(preview.tradebilia.emailCandidates).toEqual(["rich@example.com"]);
    expect(preview.outcomes).toMatchObject({ name: "match", email: "match", address: "match" });

    const persisted = normalizePayPalUserInfo(payload, "2026-09-17T00:00:00.000Z", profile);
    expect(JSON.stringify(persisted)).not.toContain("rich@example.com");
    expect(JSON.stringify(persisted)).not.toContain("123 Main Street");
  });

  it("keeps the Test AI inspector as an explicit authorization link with visible failure feedback", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/TestAI.tsx"), "utf8");
    expect(source).toContain('href="/api/paypal/inspection/start"');
    expect(source).toContain("PayPal comparison inspection did not complete.");
    expect(source).toContain("The one-time preview could not be loaded.");
    expect(source).toContain("Tradebilia Profile");
    expect(source).toContain("Authorized PayPal value");
  });
});

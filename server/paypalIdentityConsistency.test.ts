import { describe, expect, it } from "vitest";
import { buildPayPalIdentityConsistency, normalizePayPalUserInfo } from "./paypalIdentity";

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
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPayPalAddressFieldConsistency,
  buildPayPalComparisonInspection,
  buildPayPalComparisonProfile,
  buildPayPalIdentityConsistency,
  normalizePayPalUserInfo,
} from "./paypalIdentity";

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

  it("uses only Account Settings first name, last name, and email", () => {
    const comparisonProfile = buildPayPalComparisonProfile({
      firstName: "Rich",
      lastName: "Tavani",
      accountSettingsEmail: "account-settings@tradebilia.test",
      address: profile.address,
    });

    expect(comparisonProfile.nameCandidates).toEqual(["Rich Tavani"]);
    expect(comparisonProfile.emailCandidates).toEqual(["account-settings@tradebilia.test"]);
    expect(buildPayPalIdentityConsistency({
      name: "Tavani, Rich",
      email: "account-settings@tradebilia.test",
      email_verified: true,
    }, comparisonProfile)).toMatchObject({ name: "match", email: "match" });
  });

  it("does not substitute a missing Account Settings email with another account email", () => {
    const comparisonProfile = buildPayPalComparisonProfile({
      firstName: "Rich",
      lastName: "Tavani",
      accountSettingsEmail: null,
      address: profile.address,
    });

    expect(comparisonProfile.emailCandidates).toEqual([]);
    expect(buildPayPalIdentityConsistency({
      email: "manus-auth@example.test",
      email_verified: true,
    }, comparisonProfile)).toMatchObject({ email: "unavailable" });
  });

  it("treats PayPal US state and country codes as their full profile names", () => {
    const fullNameAddressProfile = {
      ...profile,
      address: {
        street: "123 Main Street",
        town: "Tampa",
        state: "New York",
        zipCode: "33602",
        country: "United States",
      },
    };
    const payload = {
      address: {
        street_address: "123 Main St.",
        locality: "Tampa",
        region: "NY",
        postal_code: "33602",
        country: "US",
      },
    };

    expect(buildPayPalAddressFieldConsistency(payload, fullNameAddressProfile.address)).toEqual({
      street: "match",
      town: "match",
      state: "match",
      zipCode: "match",
      country: "match",
    });
    expect(buildPayPalIdentityConsistency(payload, fullNameAddressProfile)).toMatchObject({ address: "match" });
  });

  it("keeps the Test AI inspector as an explicit authorization link with visible failure feedback", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/TestAI.tsx"), "utf8");
    const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const comparisonProfileQuery = dbSource.slice(
      dbSource.indexOf("export async function getUserPayPalComparisonProfile"),
      dbSource.indexOf("export async function saveUserPayPalIdentity"),
    );
    expect(source).toContain("useSearch");
    expect(source).toContain("new URLSearchParams(search)");
    expect(source).toContain('trpc.testAI.startPayPalComparisonInspection.useMutation');
    expect(source).toContain('window.location.assign(authorizationUrl)');
    expect(source).toContain('Opening PayPal…');
    expect(source).toContain("PayPal comparison inspection did not complete.");
    expect(source).toContain("PayPal inspection could not start.");
    expect(source).toContain("The one-time preview could not be loaded.");
    expect(source).toContain("Tradebilia Profile");
    expect(source).toContain("Authorized PayPal value");
    expect(source).toContain("Account Settings email");
    expect(source).toContain("US state abbreviations and full names are compared as equivalent");
    expect(source).toContain("ISO country codes and full names are compared as equivalent");
    expect(comparisonProfileQuery).toContain("accountSettingsEmail: userProfiles.contactEmail");
    expect(comparisonProfileQuery).not.toContain("accountEmail: users.email");
    expect(comparisonProfileQuery).not.toContain("accountSettingsEmail: users.email");
  });
});

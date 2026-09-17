import { afterEach, describe, expect, it } from "vitest";
import {
  consumePayPalComparisonInspection,
  paypalComparisonInspectionConfig,
  setPayPalComparisonInspectionCookie,
} from "./paypalInspection";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

const originalEncryptionKey = process.env.ENCRYPTION_KEY;

afterEach(() => {
  if (originalEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalEncryptionKey;
});

describe("PayPal comparison inspection cookie", () => {
  it("encrypts a five-minute preview and consumes it once for the matching administrator", () => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    const cookieCalls: CookieCall[] = [];
    const response = {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookieCalls.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        cookieCalls.push({ name, options });
      },
    };
    const preview = {
      inspectedAt: "2026-09-17T00:00:00.000Z",
      tradebilia: {
        nameCandidates: ["Owner Name"],
        emailCandidates: ["owner@tradebilia.test"],
        address: { street: "1 Main Street", town: "Tampa", state: "FL", zipCode: "33602", country: "US" },
      },
      paypal: {
        name: "Owner Name",
        email: "owner@paypal.test",
        emailVerified: true,
        address: { street: "1 Main Street", town: "Tampa", state: "FL", zipCode: "33602", country: "US" },
      },
      outcomes: { name: "match", email: "match", address: "match" },
    } as const;

    setPayPalComparisonInspectionCookie(response, 44, preview);

    const issued = cookieCalls[0];
    expect(issued).toMatchObject({
      name: paypalComparisonInspectionConfig.cookieName,
      options: { httpOnly: true, secure: true, sameSite: "lax", path: "/api", maxAge: paypalComparisonInspectionConfig.ttlMs },
    });
    expect(issued?.value).toBeTruthy();
    expect(issued?.value).not.toContain("owner@paypal.test");

    const request = { headers: { cookie: `${issued?.name}=${encodeURIComponent(issued?.value ?? "")}` } };
    expect(consumePayPalComparisonInspection(request, response, 44)).toEqual(preview);
    expect(consumePayPalComparisonInspection({ headers: {} }, response, 44)).toBeNull();
    expect(cookieCalls.filter((call) => call.name === paypalComparisonInspectionConfig.cookieName && !call.value)).toHaveLength(2);
  });

  it("rejects a preview when the authenticated administrator does not match the cookie envelope", () => {
    process.env.ENCRYPTION_KEY = "b".repeat(64);
    const cookieCalls: CookieCall[] = [];
    const response = {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookieCalls.push({ name, value, options }),
      clearCookie: (name: string, options: Record<string, unknown>) => cookieCalls.push({ name, options }),
    };
    setPayPalComparisonInspectionCookie(response, 44, {
      inspectedAt: "2026-09-17T00:00:00.000Z",
      tradebilia: { nameCandidates: [], emailCandidates: [], address: {} },
      paypal: { name: null, email: null, emailVerified: false, address: {} },
      outcomes: { name: "unavailable", email: "unavailable", address: "unavailable" },
    });

    const issued = cookieCalls[0];
    expect(consumePayPalComparisonInspection(
      { headers: { cookie: `${issued?.name}=${encodeURIComponent(issued?.value ?? "")}` } },
      response,
      45,
    )).toBeNull();
  });
});

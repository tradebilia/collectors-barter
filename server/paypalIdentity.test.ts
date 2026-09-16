import { describe, expect, it } from "vitest";
import { buildPayPalAuthorizationUrl, normalizePayPalUserInfo } from "./paypalIdentity";

describe("PayPal identity adapter", () => {
  it("builds a sandbox authorization URL with consented identity scopes", () => {
    const url = new URL(buildPayPalAuthorizationUrl("state-123", "https://tradebilia.example/api/paypal/callback"));
    expect(url.origin).toBe("https://www.sandbox.paypal.com");
    expect(url.pathname).toBe("/signin/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe("https://tradebilia.example/api/paypal/callback");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("scope")).toContain("email");
  });

  it("normalizes the approved identity claims and does not retain raw email", () => {
    const normalized = normalizePayPalUserInfo({
      user_id: "paypal-user-1",
      name: "Rich Tavani",
      email: "rich@example.com",
      email_verified: true,
      verified_account: true,
      account_type: "BUSINESS",
      picture: "https://www.paypalobjects.com/profile.png",
      locale: "en_US",
    }, "2026-09-16T00:00:00.000Z");

    expect(normalized).toEqual({
      paypalUserId: "paypal-user-1",
      name: "Rich Tavani",
      emailVerified: true,
      verifiedAccount: true,
      accountType: "BUSINESS",
      profileImageUrl: "https://www.paypalobjects.com/profile.png",
      locale: "en_US",
      connectedAt: "2026-09-16T00:00:00.000Z",
    });
    expect(normalized).not.toHaveProperty("email");
  });

  it("accepts the OpenID subject when PayPal omits user_id", () => {
    expect(normalizePayPalUserInfo({ sub: "openid-subject" }).paypalUserId).toBe("openid-subject");
  });
});

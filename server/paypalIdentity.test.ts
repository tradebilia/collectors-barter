import { describe, expect, it } from "vitest";
import { buildPayPalAuthorizationUrl, getPayPalIdentityRedirectUri, normalizePayPalUserInfo } from "./paypalIdentity";

describe("PayPal identity adapter", () => {
  it("uses the configured public callback URI exactly", () => {
    expect(getPayPalIdentityRedirectUri()).toBe("https://tradebilia.manus.space/api/paypal/callback");
  });

  it("uses a forwarded public origin instead of an internal legacy callback", () => {
    const previousIdentityRedirect = process.env.PAYPAL_IDENTITY_REDIRECT_URI;
    const previousLegacyRedirect = process.env.PAYPAL_REDIRECT_URI;
    process.env.PAYPAL_IDENTITY_REDIRECT_URI = "";
    process.env.PAYPAL_REDIRECT_URI = "https://internal-service.a.run.app/api/paypal/callback";

    expect(getPayPalIdentityRedirectUri("https://tradebilia.manus.space")).toBe(
      "https://tradebilia.manus.space/api/paypal/callback",
    );

    process.env.PAYPAL_IDENTITY_REDIRECT_URI = previousIdentityRedirect;
    process.env.PAYPAL_REDIRECT_URI = previousLegacyRedirect;
  });

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

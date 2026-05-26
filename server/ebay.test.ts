import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEbayAuthUrl } from "./_core/ebay";

describe("eBay Integration", () => {
  beforeEach(() => {
    // Reset environment variables for testing
    process.env.EBAY_CLIENT_ID = "test-client-id";
    process.env.EBAY_CLIENT_SECRET = "test-client-secret";
    process.env.EBAY_REDIRECT_URI = "https://test.example.com/api/ebay/callback";
  });

  it("should generate valid eBay OAuth URL", () => {
    const state = "test-state-123";
    const authUrl = getEbayAuthUrl(state);

    expect(authUrl).toContain("https://auth.ebay.com/oauth2/authorize");
    expect(authUrl).toContain("response_type=code");
    expect(authUrl).toContain("redirect_uri=");
    expect(authUrl).toContain("scope=");
    expect(authUrl).toContain(`state=${state}`);
  });

  it("should include correct OAuth scopes", () => {
    const state = "test-state";
    const authUrl = getEbayAuthUrl(state);

    // Scopes are URL encoded in the query string
    expect(authUrl).toContain("scope=");
    expect(authUrl).toContain("api.ebay.com");
    expect(authUrl).toContain("sell.account.readonly");
  });

  it("should properly encode redirect URI", () => {
    const state = "test-state";
    const authUrl = getEbayAuthUrl(state);
    
    // Check that the URL is properly formatted
    expect(() => new URL(authUrl)).not.toThrow();
  });
});

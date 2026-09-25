import { describe, expect, it, vi } from "vitest";
import {
  API_PROVIDER_IDS,
  getApiProviderHealthOverview,
  runApiProviderHealthCheck,
} from "./apiProviderHealth";

describe("Admin API provider health registry", () => {
  it("lists every registered provider exactly once, including market data, catalog data, shipping, storage, and member connections", () => {
    const overview = getApiProviderHealthOverview({});
    expect(overview.map((provider) => provider.id)).toEqual([...API_PROVIDER_IDS]);
    expect(new Set(overview.map((provider) => provider.id)).size).toBe(API_PROVIDER_IDS.length);
    expect(overview.map((provider) => provider.id)).toEqual(expect.arrayContaining([
      "manus_forge", "manus_oauth", "openai_direct_reserved", "psa_direct_reserved", "gocollect_reserved",
      "ebay", "sold_comps", "parse_bot", "pcgs", "hipstamp", "pokemon_price_tracker",
      "market_news_rss", "rawg", "igdb", "discogs", "smithsonian", "tcgdex", "wikidata",
      "usps", "ups", "fedex", "dhl", "cloudflare_r2_media", "cloudflare_r2_static",
      "facebook_oauth", "linkedin_oauth", "etsy_oauth",
    ]));
  });

  it("marks unavailable credentials as setup required without exposing a credential value", () => {
    const provider = getApiProviderHealthOverview({}).find((entry) => entry.id === "hipstamp");
    expect(provider).toMatchObject({ configured: false, canTest: false, status: "not_configured" });
    expect(provider?.message).not.toMatch(/api[_ -]?key|secret|token\s*=/i);
  });

  it("recognizes the legacy Sold-Comps secret alias used by the current adapter", () => {
    const provider = getApiProviderHealthOverview({ SOLID_COMPS_API_KEY: "configured-without-disclosure" }).find((entry) => entry.id === "sold_comps");
    expect(provider).toMatchObject({ configured: true, canTest: true, status: "ready_to_test" });
  });

  it("reports OAuth providers as requiring member-specific authorization rather than testing a member profile", async () => {
    const env = {
      FACEBOOK_APP_ID: "app-id",
      FACEBOOK_APP_SECRET: "app-secret",
      FACEBOOK_REDIRECT_URI: "https://test.example/api/facebook/callback",
    };
    const result = await runApiProviderHealthCheck("facebook_oauth", { env });
    expect(result).toMatchObject({ status: "requires_account_connection", configured: true, canTest: true });
    expect(result.message).toContain("member-specific account connection");
  });

  it("runs an eBay credential and bounded market-data probe without persisting a token or request payload", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "short-lived-test-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ itemSummaries: [{ itemId: "sample" }] }), { status: 200 }));
    const result = await runApiProviderHealthCheck("ebay", {
      env: { EBAY_PROD_CLIENT_ID: "client", EBAY_PROD_CLIENT_SECRET: "secret" },
      fetchImpl: fetchImpl as any,
    });
    expect(result).toMatchObject({ status: "working", httpStatus: 200, recordsVerified: 1 });
    expect(result.message).not.toContain("short-lived-test-token");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

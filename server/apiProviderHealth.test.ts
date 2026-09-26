import { describe, expect, it, vi } from "vitest";
import {
  API_PROVIDER_IDS,
  getBatchEligibleApiProviderIds,
  getApiProviderHealthOverview,
  runAllEligibleApiProviderHealthChecks,
  runApiProviderHealthCheck,
} from "./apiProviderHealth";
import { PERMISSION_PENDING_MARKET_SOURCES } from "../shared/permissionPendingMarketSources";

describe("Admin API provider health registry", () => {
  it("lists every registered provider exactly once, including market data, catalog data, shipping, storage, and member connections", () => {
    const overview = getApiProviderHealthOverview({});
    expect(overview.map((provider) => provider.id)).toEqual([...API_PROVIDER_IDS]);
    expect(new Set(overview.map((provider) => provider.id)).size).toBe(API_PROVIDER_IDS.length);
    expect(overview.map((provider) => provider.id)).toEqual(expect.arrayContaining([
      "manus_forge", "manus_oauth", "openai_direct_reserved", "psa_direct_reserved", "gocollect_reserved",
      "ebay", "sold_comps", "parse_bot", "pcgs", "hipstamp", "pokemon_price_tracker", "the_card_api", "cardsight_ai",
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

  it("lists every researched specialist source with its validation state while keeping remote probes disabled", async () => {
    const overview = getApiProviderHealthOverview({});
    const specialistRows = overview.filter((provider) => provider.group === "Specialist market data — activation pending");
    expect(specialistRows).toHaveLength(PERMISSION_PENDING_MARKET_SOURCES.length);

    for (const source of PERMISSION_PENDING_MARKET_SOURCES) {
      const provider = specialistRows.find((entry) => entry.name === source.label);
      const apiHealthStatus = source.status === "pending_permission" ? "permission_pending" : "deferred";
      expect(provider, source.label).toMatchObject({
        configured: false,
        canTest: false,
        canTestInBatch: false,
        status: apiHealthStatus,
        testMode: apiHealthStatus,
        categories: [...source.categories],
        sourceActivationStatus: source.status,
        validationStatus: source.liveTestStatus,
        validationSummary: source.liveTestSummary,
      });
    }

    const fetchImpl = vi.fn();
    const result = await runApiProviderHealthCheck("specialist_cng", { env: {}, fetchImpl: fetchImpl as any });
    expect(result).toMatchObject({ status: "permission_pending", canTest: false, canTestInBatch: false, validationStatus: "verified" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getBatchEligibleApiProviderIds({})).not.toContain("specialist_cng");
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

  it("batch-tests only configured active providers and skips account-linked OAuth connections", async () => {
    const env = {
      EBAY_PROD_CLIENT_ID: "client",
      EBAY_PROD_CLIENT_SECRET: "secret",
      FACEBOOK_APP_ID: "app-id",
      FACEBOOK_APP_SECRET: "app-secret",
      FACEBOOK_REDIRECT_URI: "https://test.example/api/facebook/callback",
    };
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("identity/v1/oauth2/token")) return new Response(JSON.stringify({ access_token: "short-lived-test-token" }), { status: 200 });
      if (url.includes("buy/browse/v1/item_summary/search")) return new Response(JSON.stringify({ itemSummaries: [{ itemId: "sample" }] }), { status: 200 });
      if (url.includes("wikidata.org")) return new Response(JSON.stringify({ search: [] }), { status: 200 });
      return new Response(JSON.stringify([]), { status: 200 });
    });

    expect(getBatchEligibleApiProviderIds(env)).toEqual(expect.arrayContaining(["ebay", "market_news_rss", "tcgdex", "wikidata"]));
    expect(getBatchEligibleApiProviderIds(env)).not.toContain("facebook_oauth");

    const result = await runAllEligibleApiProviderHealthChecks({ env, fetchImpl: fetchImpl as any, concurrency: 2 });

    expect(result.testedProviderIds).toContain("ebay");
    expect(result.skippedAccountConnectionProviderIds).toEqual(["facebook_oauth"]);
    expect(result.testedProviderIds).not.toContain("facebook_oauth");
    expect(result.results.find((provider) => provider.id === "ebay")).toMatchObject({ status: "working", httpStatus: 200, recordsVerified: 1 });
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

  it("runs a bounded The Card API completed-sales probe without exposing its credential", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "sample-sale" }] }), { status: 200 }));
    const result = await runApiProviderHealthCheck("the_card_api", {
      env: { THE_CARD_API_KEY: "configured-without-disclosure" },
      fetchImpl: fetchImpl as any,
    });
    expect(result).toMatchObject({ status: "working", httpStatus: 200, recordsVerified: 1 });
    expect(result.message).not.toContain("configured-without-disclosure");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/api/v1/market/sales?");
  });

  it("runs a bounded Cardsight.ai catalog probe without exposing its credential", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ cards: [{ id: "sample-card" }] }), { status: 200 }));
    const result = await runApiProviderHealthCheck("cardsight_ai", {
      env: { CARDSIGHT_API_KEY: "configured-without-disclosure" },
      fetchImpl: fetchImpl as any,
    });
    expect(result).toMatchObject({ status: "working", httpStatus: 200, recordsVerified: 1 });
    expect(result.message).not.toContain("configured-without-disclosure");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("api.cardsight.ai/v1/catalog/cards");
  });

  it("runs the dedicated PCGS Auction Prices Realized probe without exposing its credential", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Auctions: [] }), { status: 200 }));
    const result = await runApiProviderHealthCheck("pcgs", {
      env: { PCGS_API_TOKEN: "configured-without-disclosure" },
      fetchImpl: fetchImpl as any,
    });
    expect(result).toMatchObject({ status: "working", httpStatus: 200, recordsVerified: 0 });
    expect(result.message).toContain("Auction Prices Realized");
    expect(result.message).not.toContain("configured-without-disclosure");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/coindetail/GetAPRByCertNo/00000000");
  });

  it("returns an actionable but credential-safe failure message for rejected and unreachable provider tests", async () => {
    const rejected = await runApiProviderHealthCheck("resend", {
      env: { RESEND_API_KEY: "configured-without-disclosure" },
      fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "invalid key" }), { status: 401 })) as any,
    });
    const unreachable = await runApiProviderHealthCheck("sold_comps", {
      env: { SOLID_COMPS_API_KEY: "configured-without-disclosure" },
      fetchImpl: vi.fn().mockRejectedValue(new Error("socket reset by peer")) as any,
    });

    expect(rejected).toMatchObject({ status: "failed", httpStatus: 401, failureClass: "authentication" });
    expect(rejected.message).toContain("secured credential configuration");
    expect(unreachable).toMatchObject({ status: "failed", httpStatus: null });
    expect(unreachable.message).toContain("could not reach or complete a response");
    expect(unreachable.message).not.toContain("socket reset by peer");
  });
});

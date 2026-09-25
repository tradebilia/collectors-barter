import { describe, expect, it } from "vitest";

const CARDSIGHT_CATALOG_STATS_URL = "https://api.cardsight.ai/v1/catalog/statistics";

describe("Cardsight.ai API credential", () => {
  it("authorizes a bounded read-only catalog statistics request without exposing the key", async () => {
    const apiKey = process.env.CARDSIGHT_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(CARDSIGHT_CATALOG_STATS_URL, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey!,
      },
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.text();
    expect(response.status, `Cardsight.ai returned HTTP ${response.status}`).toBe(200);
    expect(() => JSON.parse(body)).not.toThrow();
  }, 20_000);
});

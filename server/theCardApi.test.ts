import { describe, expect, it } from "vitest";

const THE_CARD_API_SALES_URL = "https://thecardapi.com/api/v1/market/sales?q=baseball&limit=1";

describe("The Card API credential", () => {
  it("authorizes one bounded read-only sales lookup without exposing the key", async () => {
    const apiKey = process.env.THE_CARD_API_KEY;
    expect(apiKey, "THE_CARD_API_KEY must be configured as a project secret").toBeTruthy();

    const response = await fetch(THE_CARD_API_SALES_URL, {
      headers: {
        Accept: "application/json",
        "x-market-api-key": apiKey!,
      },
    });

    const body = (await response.json().catch(() => null)) as {
      data?: unknown[];
      pagination?: unknown;
      error?: unknown;
    } | null;

    expect(
      response.status,
      `The Card API returned ${response.status}; verify the configured key and plan permissions.`,
    ).toBe(200);
    expect(Array.isArray(body?.data)).toBe(true);
    expect(body?.pagination).toBeTruthy();
  }, 20_000);
});

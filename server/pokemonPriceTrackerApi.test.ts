import { describe, expect, it } from "vitest";

const POKEMON_PRICE_TRACKER_API_BASE = "https://www.pokemonpricetracker.com/api/v2";

describe("Pokémon Price Tracker API credential", () => {
  it(
    "authenticates against a one-card read-only catalog lookup",
    async () => {
      const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
      expect(apiKey, "POKEMON_PRICE_TRACKER_API_KEY must be configured for this smoke test").toBeTruthy();

      const response = await fetch(
        `${POKEMON_PRICE_TRACKER_API_BASE}/cards?search=charizard&limit=1`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const responseBody = await response.text();
      expect(response.status, responseBody).toBe(200);
      const payload = JSON.parse(responseBody) as { data?: unknown; cards?: unknown; metadata?: unknown };
      expect(payload.data ?? payload.cards ?? payload.metadata).toBeDefined();
    },
    15_000,
  );
});

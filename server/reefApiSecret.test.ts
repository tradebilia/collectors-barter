import { describe, expect, it } from "vitest";

describe("ReefAPI project secret", () => {
  it("authenticates with a lightweight read-only Catawiki categories request", async () => {
    const apiKey = process.env.REEF_API_KEY;
    expect(apiKey, "REEF_API_KEY must be configured as a server-side project secret").toBeTruthy();

    const response = await fetch("https://api.reefapi.com/catawiki/v1/categories", {
      method: "POST",
      headers: {
        "x-api-key": apiKey!,
        "content-type": "application/json",
      },
      body: JSON.stringify({ level: 1, language: "en" }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: { code?: string; message?: string } | null;
    };

    expect(response.ok, payload.error?.message ?? `ReefAPI returned HTTP ${response.status}`).toBe(true);
    expect(payload.ok, payload.error?.message ?? "ReefAPI did not return an ok envelope").toBe(true);
  }, 30_000);
});

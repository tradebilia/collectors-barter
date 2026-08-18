import { describe, expect, it } from "vitest";

describe("RAWG API credential", () => {
  it("authenticates a bounded server-side Video Game catalog request", async () => {
    const key = process.env.RAWG_API_KEY?.trim();
    expect(key).toBeTruthy();

    const response = await fetch(
      `https://api.rawg.io/api/games?key=${encodeURIComponent(key!)}&search=Super%20Mario%20Bros.&page_size=1`,
      { signal: AbortSignal.timeout(15_000) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as { results?: unknown[] };
    expect(Array.isArray(payload.results)).toBe(true);
  }, 20_000);
});

import { describe, expect, it } from "vitest";

describe("Apify credentials", () => {
  it("authenticates against Apify when a token is configured", async () => {
    const token = process.env.APIFY_API_TOKEN;
    expect(token, "APIFY_API_TOKEN must be configured for this integration").toBeTruthy();

    const response = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok, `Apify credential check failed with HTTP ${response.status}`).toBe(true);
    const body = await response.json() as { data?: { username?: string } };
    expect(body.data?.username).toBeTruthy();
  }, 15_000);
});

import { describe, expect, it } from "vitest";

describe("USPS OAuth credentials", () => {
  it("obtains a short-lived access token for read-only tracking requests", async () => {
    const consumerKey = process.env.USPS_CONSUMER_KEY;
    const consumerSecret = process.env.USPS_CONSUMER_SECRET;

    expect(consumerKey, "USPS_CONSUMER_KEY is configured").toBeTruthy();
    expect(consumerSecret, "USPS_CONSUMER_SECRET is configured").toBeTruthy();

    const response = await fetch("https://apis.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: consumerKey!,
        client_secret: consumerSecret!,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok, "USPS OAuth token request succeeds").toBe(true);
    const payload = await response.json() as { access_token?: string };
    expect(payload.access_token, "USPS OAuth response includes an access token").toBeTruthy();
  }, 15_000);
});

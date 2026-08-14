import { describe, expect, it } from "vitest";

const fedexTokenUrls = [
  "https://apis.fedex.com/oauth/token",
  "https://apis-sandbox.fedex.com/oauth/token",
] as const;

describe("FedEx credentials", () => {
  it("obtains a short-lived OAuth token from an available FedEx environment without logging credentials", async () => {
    const clientId = process.env.FEDEX_CLIENT_ID;
    const clientSecret = process.env.FEDEX_CLIENT_SECRET;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    let tokenReceived = false;

    for (const tokenUrl of fedexTokenUrls) {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as { access_token?: unknown };
      tokenReceived = typeof payload.access_token === "string" && payload.access_token.length > 0;
      if (tokenReceived) break;
    }

    expect(tokenReceived).toBe(true);
  }, 20_000);
});

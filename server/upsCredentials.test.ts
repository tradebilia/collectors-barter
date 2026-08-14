import { describe, expect, it } from "vitest";

describe("UPS OAuth credentials", () => {
  it.skipIf(!process.env.UPS_CLIENT_ID || !process.env.UPS_CLIENT_SECRET)("authenticates through the UPS token endpoint without exposing credentials", async () => {
    const basicAuth = Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString("base64");
    const response = await fetch("https://onlinetools.ups.com/security/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { access_token?: string } | null;

    expect(response.ok).toBe(true);
    expect(typeof payload?.access_token).toBe("string");
  });
});

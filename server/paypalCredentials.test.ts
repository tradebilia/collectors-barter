import { describe, expect, it } from "vitest";

describe("PayPal Live credentials", () => {
  it("authenticate against PayPal Live OAuth without performing a write", async () => {
    expect(process.env.PAYPAL_ENV, "PAYPAL_ENV must select PayPal Live").toBe("live");
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    expect(clientId, "PAYPAL_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "PAYPAL_CLIENT_SECRET must be configured").toBeTruthy();

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    const body = await response.json().catch(() => ({}));
    expect(response.ok, `PayPal OAuth credential check failed with status ${response.status}`).toBe(true);
    expect(typeof body.access_token).toBe("string");
    expect(body.access_token).toBeTruthy();
  }, 30_000);
});

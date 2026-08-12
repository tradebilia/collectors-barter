import { describe, expect, it } from "vitest";

const configuredSecretKeys = [
  "GO_COLLECT_API_KEY",
  "PSA_API_TOKEN",
  "PCGS_API_TOKEN",
  "TRADEBILIA_OPENAI_API_KEY",
  "RESEND_API_KEY",
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "EBAY_PROD_CLIENT_ID",
  "EBAY_PROD_CLIENT_SECRET",
  "DAILY_API_KEY",
  "PARSE_BOT_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "SOLID_COMPS_API_KEY",
] as const;

describe("external integration credentials", () => {
  it("has every supplied credential configured independently of the selected integration mode", () => {
    expect(["0", "1"]).toContain(process.env.TRADEBILIA_STAGING_MODE);

    for (const key of configuredSecretKeys) {
      expect(process.env[key], `${key} should be configured`).toMatch(/\S+/);
    }
  });

  it("uses a normalized Resend API key format without exposing the value", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toMatch(/^re_[A-Za-z0-9_-]+$/);
    expect(apiKey).toBe(apiKey?.trim());
    expect(apiKey?.length).toBeGreaterThan(20);
  });

  it("authenticates with Resend through a read-only endpoint without sending email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toMatch(/\S+/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: unknown } | null;
      const message = typeof body?.message === "string" ? body.message : "No response message";
      if (response.status === 401 && message === "This API key is restricted to only send emails") {
        return;
      }
      throw new Error(`Resend read-only authentication failed with HTTP ${response.status}: ${message}`);
    }

    expect(response.status).toBe(200);
  }, 15_000);
});

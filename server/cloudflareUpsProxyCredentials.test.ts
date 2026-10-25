import { describe, expect, it } from "vitest";

const clientId = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_ID;
const clientSecret = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_SECRET;
const proxyUrl = process.env.CLOUDFLARE_UPS_PROXY_URL ?? "https://tradebilia-secret-connection-test.rtavani.workers.dev";
const runLiveProbe = process.env.RUN_EXTERNAL_CREDENTIAL_TESTS === "true" && Boolean(clientId) && Boolean(clientSecret);

describe("Cloudflare UPS proxy service token", () => {
  it.skipIf(!runLiveProbe)("authenticates to the protected Worker without exposing token or secret contents", async () => {
    const response = await fetch(proxyUrl, {
      headers: {
        "CF-Access-Client-Id": clientId as string,
        "CF-Access-Client-Secret": clientSecret as string,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { cloudflareConnection?: string; upsTrackingProxy?: string } | null;
    const invalidResponse = await fetch(`${proxyUrl}/ups/track/BAD`, {
      headers: {
        "CF-Access-Client-Id": clientId as string,
        "CF-Access-Client-Secret": clientSecret as string,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const invalidPayload = await invalidResponse.json().catch(() => null) as { error?: string } | null;

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({
      cloudflareConnection: "successful",
      upsTrackingProxy: "ready",
    });
    expect(invalidResponse.status).toBe(400);
    expect(invalidPayload?.error).toBe("Invalid tracking number");
  });
});

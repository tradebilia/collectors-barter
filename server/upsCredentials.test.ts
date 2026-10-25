import { describe, expect, it } from "vitest";

describe("UPS OAuth credentials", () => {
  const proxyUrl = process.env.CLOUDFLARE_UPS_PROXY_URL ?? "https://tradebilia-secret-connection-test.rtavani.workers.dev";
  const proxyClientId = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_ID;
  const proxyClientSecret = process.env.CLOUDFLARE_UPS_PROXY_CLIENT_SECRET;
  const runLiveCredentialProbe = process.env.RUN_EXTERNAL_CREDENTIAL_TESTS === "true" && Boolean(proxyClientId) && Boolean(proxyClientSecret);

  it.skipIf(!runLiveCredentialProbe)("reaches UPS through the protected Cloudflare proxy without exposing credentials when live provider checks are enabled", async () => {
    const response = await fetch(proxyUrl, {
      headers: {
        "CF-Access-Client-Id": proxyClientId as string,
        "CF-Access-Client-Secret": proxyClientSecret as string,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as { cloudflareConnection?: string; upsTrackingProxy?: string } | null;

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({ cloudflareConnection: "successful", upsTrackingProxy: "ready" });
  });
});
